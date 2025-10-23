const { pool } = require('../config/database');

class Song {
  static async create(title, artist, duration) {
    const result = await pool.query(
      'INSERT INTO songs (title, artist, duration) VALUES ($1, $2, $3) RETURNING *',
      [title, artist, duration]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query('SELECT * FROM songs ORDER BY created_at DESC');
    return result.rows;
  }
}

module.exports = Song;

