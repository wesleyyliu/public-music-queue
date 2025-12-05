const { pool } = require('../config/database');

class VoteService {
  /**
   * Add a skip vote for the current song
   * @param {string} userId - Spotify user ID
   * @param {string} room - Room name
   * @param {string} songSpotifyId - Spotify ID of the song being voted to skip
   * @returns {Promise<{voteCount: number, userCount: number, percentage: number}>}
   */
  async addSkipVote(userId, room, songSpotifyId) {
    const client = await pool.connect();
    try {
      // Insert vote (will ignore if user already voted due to UNIQUE constraint)
      await client.query(
        `INSERT INTO skip_votes (user_id, room, song_spotify_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, room, song_spotify_id) DO NOTHING`,
        [userId, room, songSpotifyId]
      );

      // Get current vote count and user count
      return await this.getVoteStats(room, songSpotifyId);
    } finally {
      client.release();
    }
  }

  /**
   * Remove a skip vote
   * @param {string} userId - Spotify user ID
   * @param {string} room - Room name
   * @param {string} songSpotifyId - Spotify ID of the song
   */
  async removeSkipVote(userId, room, songSpotifyId) {
    await pool.query(
      `DELETE FROM skip_votes
       WHERE user_id = $1 AND room = $2 AND song_spotify_id = $3`,
      [userId, room, songSpotifyId]
    );

    return await this.getVoteStats(room, songSpotifyId);
  }

  /**
   * Get vote statistics for a song
   * @param {string} room - Room name
   * @param {string} songSpotifyId - Spotify ID of the song
   * @returns {Promise<{voteCount: number, userCount: number, percentage: number, hasReachedThreshold: boolean}>}
   */
  async getVoteStats(room, songSpotifyId) {
    const result = await pool.query(
      `SELECT COUNT(*) as vote_count
       FROM skip_votes
       WHERE room = $1 AND song_spotify_id = $2`,
      [room, songSpotifyId]
    );

    const voteCount = parseInt(result.rows[0].vote_count);

    // Get active user count from the websocket service (will be passed in)
    // For now, we'll just return the vote count
    return {
      voteCount,
      userCount: 0, // Will be updated by caller with actual user count
      percentage: 0,
      hasReachedThreshold: false
    };
  }

  /**
   * Check if user has already voted to skip
   * @param {string} userId - Spotify user ID
   * @param {string} room - Room name
   * @param {string} songSpotifyId - Spotify ID of the song
   * @returns {Promise<boolean>}
   */
  async hasUserVoted(userId, room, songSpotifyId) {
    const result = await pool.query(
      `SELECT 1 FROM skip_votes
       WHERE user_id = $1 AND room = $2 AND song_spotify_id = $3
       LIMIT 1`,
      [userId, room, songSpotifyId]
    );

    return result.rows.length > 0;
  }

  /**
   * Clear all skip votes for a song (called when song is skipped or ends)
   * @param {string} room - Room name
   * @param {string} songSpotifyId - Spotify ID of the song
   */
  async clearSkipVotes(room, songSpotifyId) {
    await pool.query(
      `DELETE FROM skip_votes
       WHERE room = $1 AND song_spotify_id = $2`,
      [room, songSpotifyId]
    );
  }

  /**
   * Clear all skip votes for a room (useful for cleanup)
   * @param {string} room - Room name
   */
  async clearAllSkipVotesInRoom(room) {
    await pool.query(
      `DELETE FROM skip_votes WHERE room = $1`,
      [room]
    );
  }

  /**
   * Calculate if vote threshold has been reached
   * @param {number} voteCount - Number of votes
   * @param {number} userCount - Number of users in room
   * @param {number} threshold - Threshold percentage (default 0.5 = 50%)
   * @returns {boolean}
   */
  checkThreshold(voteCount, userCount, threshold = 0.5) {
    if (userCount === 0) {
      console.log('Threshold check: userCount is 0, returning false');
      return false;
    }
    if (voteCount === 0) {
      console.log('Threshold check: voteCount is 0, returning false');
      return false;
    }

    // Calculate percentage
    const percentage = voteCount / userCount;
    const result = percentage >= threshold;

    console.log(`Threshold calculation: ${voteCount}/${userCount} = ${percentage}, threshold=${threshold}, result=${result}`);

    // Check if percentage meets threshold
    return result;
  }
}

module.exports = new VoteService();
