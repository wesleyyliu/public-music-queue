const { pool } = require('../config/database');

class QueueItem {
  static async create(songId, addedBy, room = 'general') {
    // Get the max position in the room and add to the end
    const maxPosResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) as max_pos FROM queue_items WHERE room = $1',
      [room]
    );
    const nextPosition = maxPosResult.rows[0].max_pos + 1;

    const result = await pool.query(
      'INSERT INTO queue_items (song_id, added_by, room, position, previous_position) VALUES ($1, $2, $3, $4, $4) RETURNING *',
      [songId, addedBy, room, nextPosition]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(`
      SELECT
        qi.id,
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
      GROUP BY qi.id, s.id
      ORDER BY qi.position ASC, qi.added_at ASC
    `);

    return result.rows.map(row => ({
      ...row,
      upvotes: parseInt(row.upvotes) || 0,
      downvotes: parseInt(row.downvotes) || 0,
      score: (parseInt(row.upvotes) || 0) - (parseInt(row.downvotes) || 0),
      positionChange: row.previousPosition && row.position
        ? row.previousPosition - row.position
        : 0
    }));
  }

  static async getByRoom(room) {
    const result = await pool.query(`
      SELECT
        qi.id,
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
      ORDER BY
        CASE WHEN qi.position = 0 THEN 999999 ELSE qi.position END ASC,
        qi.added_at ASC
    `, [room]);

    return result.rows.map(row => ({
      ...row,
      upvotes: parseInt(row.upvotes) || 0,
      downvotes: parseInt(row.downvotes) || 0,
      score: (parseInt(row.upvotes) || 0) - (parseInt(row.downvotes) || 0),
      positionChange: row.previousPosition && row.position
        ? row.previousPosition - row.position
        : 0
    }));
  }

  static async remove(id) {
    const result = await pool.query(
      'DELETE FROM queue_items WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async clear(room = null) {
    if (room) {
      await pool.query('DELETE FROM queue_items WHERE room = $1', [room]);
    } else {
      await pool.query('DELETE FROM queue_items');
    }
  }
}

module.exports = QueueItem;

