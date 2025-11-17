const { pool } = require('../config/database');

class Song {
  static async create(title, artist, duration, spotifyId = null, album = null, albumArt = null, spotifyUri = null, previewUrl = null) {
    const result = await pool.query(
      `INSERT INTO songs (title, artist, duration, spotify_id, album, album_art, spotify_uri, preview_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, artist, duration, spotifyId, album, albumArt, spotifyUri, previewUrl]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findBySpotifyId(spotifyId) {
    const result = await pool.query('SELECT * FROM songs WHERE spotify_id = $1', [spotifyId]);
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query('SELECT * FROM songs ORDER BY created_at DESC');
    return result.rows;
  }
}

module.exports = Song;

