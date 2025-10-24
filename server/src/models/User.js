const { pool } = require('../config/database');

class User {
  static async create(spotifyId, displayName, email, accessToken, refreshToken, expiresIn, latitude = null, longitude = null) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    const result = await pool.query(
      `INSERT INTO users (spotify_id, display_name, email, access_token, refresh_token, token_expires_at, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (spotify_id) 
       DO UPDATE SET 
         display_name = $2,
         email = $3,
         access_token = $4,
         refresh_token = $5,
         token_expires_at = $6,
         latitude = $7,
         longitude = $8,
         updated_at = NOW()
       RETURNING *`,
      [spotifyId, displayName, email, accessToken, refreshToken, expiresAt, latitude, longitude]
    );
    
    return result.rows[0];
  }

  static async findBySpotifyId(spotifyId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE spotify_id = $1',
      [spotifyId]
    );
    return result.rows[0];
  }

  static async updateTokens(spotifyId, accessToken, refreshToken, expiresIn) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    const result = await pool.query(
      `UPDATE users 
       SET access_token = $1, refresh_token = $2, token_expires_at = $3
       WHERE spotify_id = $4
       RETURNING *`,
      [accessToken, refreshToken, expiresAt, spotifyId]
    );
    
    return result.rows[0];
  }

  static async updateLocation(spotifyId, latitude, longitude) {
    const result = await pool.query(
      `UPDATE users 
       SET latitude = $1, longitude = $2, updated_at = NOW()
       WHERE spotify_id = $3
       RETURNING *`,
      [latitude, longitude, spotifyId]
    );
    
    return result.rows[0];
  }
}

module.exports = User;

