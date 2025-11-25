const { pool } = require("../config/database");

class Vote {
  static async create(userSpotifyId, songId) {
    const result = await pool.query(
      `INSERT INTO vote_skip (user_spotify_id, song_id)
       VALUES ($1, $2)
       ON CONFLICT (user_spotify_id, song_id)
       DO NOTHING
       RETURNING *`,
      [userSpotifyId, songId]
    );
    return result.rows[0];
  }  

  static async voteToSkip(userSpotifyId, songId) {
    return await Vote.create(userSpotifyId, songId);
  }  

  static async getSkipVoteCount(songId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
             FROM vote_skip
             WHERE song_id = $1`,
      [songId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  static async hasUserVoted(userSpotifyId, songId) {
    const result = await pool.query(
      `SELECT id FROM vote_skip
       WHERE user_spotify_id = $1 AND song_id = $2`,
      [userSpotifyId, songId]
    );
    return result.rows.length > 0;
  }  

  static async removeVote(userSpotifyId, songId) {
    const result = await pool.query(
      `DELETE FROM vote_skip
       WHERE user_spotify_id = $1 AND song_id = $2
       RETURNING *`,
      [userSpotifyId, songId]
    );
    return result.rows[0];
  }  

  static async clearSkipVotes(songId) {
    await pool.query(`DELETE FROM vote_skip WHERE song_id = $1`, [songId]);
  }
}

module.exports = Vote;
