const { pool } = require('../config/database');

class QueueItem {
  static async create(songId, addedBy) {
    const result = await pool.query(
      'INSERT INTO queue_items (song_id, added_by) VALUES ($1, $2) RETURNING *',
      [songId, addedBy]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(`
      SELECT 
        qi.id,
        qi.added_by as "addedBy",
        qi.added_at as "addedAt",
        s.title,
        s.artist,
        s.duration
      FROM queue_items qi
      JOIN songs s ON qi.song_id = s.id
      ORDER BY qi.added_at ASC
    `);
    return result.rows;
  }

  static async remove(id) {
    const result = await pool.query(
      'DELETE FROM queue_items WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async clear() {
    await pool.query('DELETE FROM queue_items');
  }
}

module.exports = QueueItem;

