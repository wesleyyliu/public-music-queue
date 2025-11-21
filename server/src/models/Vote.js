const { pool } = require('../config/database');

class Vote {
    static async create() {
        const result = await pool.query(
            `INSERT INTO vote_skip (user_id, song_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, song_id, action_type)
             DO NOTHING
             RETURNING *`,
            [userId, songId]
          );
          return result.rows[0];
    }

    static async voteToSkip(userId, songId) {
        return await Vote.create(userId, songId);
    }
}

module.exports = Vote;