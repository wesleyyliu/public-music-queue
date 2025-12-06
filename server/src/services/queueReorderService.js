const { pool } = require('../config/database');
const voteService = require('./voteService');
const queueService = require('./queueService');

class QueueReorderService {
  constructor() {
    this.reorderIntervals = new Map(); // Map of room -> interval
    this.REORDER_INTERVAL = 30000; // 30 seconds
    this.REMOVAL_THRESHOLD = 0.2; // 20% of users
  }

  /**
   * Start the reordering service for a room
   * @param {string} room - Room name
   * @param {Function} getIO - Function to get socket.io instance
   */
  startReorderingForRoom(room, getIO) {
    // Clear existing interval if any
    this.stopReorderingForRoom(room);

    console.log(`[${room}] Starting queue reordering service (every ${this.REORDER_INTERVAL}ms)`);

    const interval = setInterval(async () => {
      try {
        await this.reorderQueue(room, getIO);
      } catch (error) {
        console.error(`[${room}] Error reordering queue:`, error);
      }
    }, this.REORDER_INTERVAL);

    this.reorderIntervals.set(room, interval);
  }

  /**
   * Stop the reordering service for a room
   * @param {string} room - Room name
   */
  stopReorderingForRoom(room) {
    const interval = this.reorderIntervals.get(room);
    if (interval) {
      clearInterval(interval);
      this.reorderIntervals.delete(room);
      console.log(`[${room}] Stopped queue reordering service`);
    }
  }

  /**
   * Stop all reordering services
   */
  stopAll() {
    for (const [room, interval] of this.reorderIntervals.entries()) {
      clearInterval(interval);
      console.log(`[${room}] Stopped queue reordering service`);
    }
    this.reorderIntervals.clear();
  }

  /**
   * Reorder the queue based on votes
   * @param {string} room - Room name
   * @param {Function} getIO - Function to get socket.io instance
   */
  async reorderQueue(room, getIO) {
    const client = await pool.connect();
    try {
      // Get current queue with vote data
      const queueResult = await client.query(`
        SELECT
          qi.id,
          qi.song_id,
          qi.added_by as "addedBy",
          qi.added_at as "addedAt",
          qi.room,
          qi.position,
          qi.previous_position as "previousPosition",
          s.title,
          s.artist,
          s.duration,
          s.spotify_id as "spotifyId",
          s.album,
          s.album_art as "albumArt",
          s.spotify_uri as "spotifyUri",
          s.preview_url as "previewUrl",
          COUNT(*) FILTER (WHERE qv.vote_type = 'upvote') as upvotes,
          COUNT(*) FILTER (WHERE qv.vote_type = 'downvote') as downvotes
        FROM queue_items qi
        JOIN songs s ON qi.song_id = s.id
        LEFT JOIN queue_votes qv ON qi.id = qv.queue_item_id AND qv.room = qi.room
        WHERE qi.room = $1
        GROUP BY qi.id, s.id
        ORDER BY qi.position ASC, qi.added_at ASC
      `, [room]);

      if (queueResult.rows.length === 0) {
        return; // Empty queue, nothing to reorder
      }

      // Get user count
      const io = getIO();
      const roomSockets = await io.in(room).fetchSockets();
      const userCount = roomSockets.length;

      // Calculate scores and check for removal
      const queueItems = queueResult.rows.map((row, index) => {
        const upvotes = parseInt(row.upvotes) || 0;
        const downvotes = parseInt(row.downvotes) || 0;
        const score = upvotes - downvotes;
        const currentPosition = row.position || index + 1;

        // Remove if: downvotes > 20% of users AND more downvotes than upvotes
        const meetsUserThreshold = userCount > 0 && downvotes > userCount * this.REMOVAL_THRESHOLD;
        const hasMoreDownvotesThanUpvotes = downvotes > upvotes;

        return {
          ...row,
          upvotes,
          downvotes,
          score,
          currentPosition,
          shouldRemove: meetsUserThreshold && hasMoreDownvotesThanUpvotes
        };
      });

      // Remove songs that exceed downvote threshold
      const itemsToRemove = queueItems.filter(item => item.shouldRemove);
      for (const item of itemsToRemove) {
        console.log(`[${room}] Removing song "${item.title}" due to excessive downvotes (${item.downvotes}/${userCount})`);
        await client.query('DELETE FROM queue_items WHERE id = $1', [item.id]);
        await voteService.clearQueueVotes(item.id);
      }

      // Filter out removed items
      const remainingItems = queueItems.filter(item => !item.shouldRemove);

      if (remainingItems.length === 0) {
        // All songs removed
        io.to(room).emit('queue:updated', []);
        return;
      }

      // Sort by score (descending), then by added_at (ascending) for ties
      remainingItems.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        return new Date(a.addedAt) - new Date(b.addedAt); // Earlier songs first for ties
      });

      // Update positions and track changes
      const updates = [];
      const positionChanges = [];

      for (let i = 0; i < remainingItems.length; i++) {
        const item = remainingItems[i];
        const newPosition = i + 1;
        const oldPosition = item.currentPosition;

        if (newPosition !== oldPosition) {
          updates.push(client.query(
            `UPDATE queue_items
             SET position = $1, previous_position = $2
             WHERE id = $3`,
            [newPosition, oldPosition, item.id]
          ));

          positionChanges.push({
            id: item.id,
            title: item.title,
            oldPosition,
            newPosition,
            change: oldPosition - newPosition // Positive means moved up
          });
        }
      }

      // Execute all position updates
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`[${room}] Reordered ${updates.length} songs in queue`);

        // Log significant changes
        for (const change of positionChanges) {
          const direction = change.change > 0 ? 'UP' : 'DOWN';
          console.log(`  - "${change.title}": ${change.oldPosition} → ${change.newPosition} (${direction} ${Math.abs(change.change)})`);
        }
      }

      // Get the updated queue and broadcast
      const updatedQueue = await queueService.getQueue(room);
      io.to(room).emit('queue:updated', updatedQueue);

      // If there were any changes or removals, broadcast the vote update
      if (updates.length > 0 || itemsToRemove.length > 0) {
        io.to(room).emit('queue:reordered', {
          changes: positionChanges,
          removed: itemsToRemove.map(item => ({ id: item.id, title: item.title }))
        });
      }

    } finally {
      client.release();
    }
  }

  /**
   * Get current reordering status
   */
  getStatus() {
    return {
      activeRooms: Array.from(this.reorderIntervals.keys()),
      interval: this.REORDER_INTERVAL,
      removalThreshold: this.REMOVAL_THRESHOLD
    };
  }
}

module.exports = new QueueReorderService();
