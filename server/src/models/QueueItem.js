const { pool } = require('../config/database');

class QueueItem {
  static async create(songId, addedBy, room = 'general') {
    const result = await pool.query(
      'INSERT INTO queue_items (song_id, added_by, room) VALUES ($1, $2, $3) RETURNING *',
      [songId, addedBy, room]
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
        s.title,
        s.artist,
        s.duration,
        s.spotify_id as "spotifyId",
        s.album,
        s.album_art as "albumArt",
        s.spotify_uri as "spotifyUri",
        s.preview_url as "previewUrl"
      FROM queue_items qi
      JOIN songs s ON qi.song_id = s.id
      ORDER BY qi.added_at ASC
    `);
    return result.rows;
  }

  static async getByRoom(room) {
    const result = await pool.query(`
      SELECT
        qi.id,
        qi.added_by as "addedBy",
        qi.added_at as "addedAt",
        qi.room,
        s.title,
        s.artist,
        s.duration,
        s.spotify_id as "spotifyId",
        s.album,
        s.album_art as "albumArt",
        s.spotify_uri as "spotifyUri",
        s.preview_url as "previewUrl"
      FROM queue_items qi
      JOIN songs s ON qi.song_id = s.id
      WHERE qi.room = $1
      ORDER BY qi.added_at ASC
    `, [room]);
    return result.rows;
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

