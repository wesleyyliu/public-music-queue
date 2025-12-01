const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const spotifyService = require('../services/spotifyService');
const playbackStateManager = require('../services/playbackStateManager');
const { getIO } = require('../websocket');
const { pool } = require('../config/database');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get current queue
router.get('/', async (req, res) => {
  try {
    const room = req.query.room || 'general';
    const queue = await queueService.getQueue(room);
    res.json({ queue });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Get cooldown status for current user
router.get('/cooldown', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const room = req.query.room || 'general';
    const COOLDOWN_SECONDS = 15;

    const cooldownResult = await pool.query(
      'SELECT last_add_time FROM user_cooldowns WHERE user_id = $1 AND room = $2',
      [userId, room]
    );

    if (cooldownResult.rows.length === 0) {
      return res.json({ remainingSeconds: 0, canAdd: true });
    }

    const lastAddTime = new Date(cooldownResult.rows[0].last_add_time);
    const now = new Date();
    const secondsSinceLastAdd = (now - lastAddTime) / 1000;

    if (secondsSinceLastAdd >= COOLDOWN_SECONDS) {
      return res.json({ remainingSeconds: 0, canAdd: true });
    }

    const remainingSeconds = Math.ceil(COOLDOWN_SECONDS - secondsSinceLastAdd);
    res.json({ remainingSeconds, canAdd: false });
  } catch (error) {
    console.error('Get cooldown error:', error);
    res.status(500).json({ error: 'Failed to fetch cooldown status' });
  }
});

// Add a song to the queue
router.post('/add', requireAuth, async (req, res) => {
  const { track, room = 'general' } = req.body;

  if (!track || !track.id) {
    return res.status(400).json({ error: 'Track data is required' });
  }

  try {
    const userId = req.session.userId;
    const COOLDOWN_SECONDS = 15;

    // Check cooldown
    const cooldownResult = await pool.query(
      'SELECT last_add_time FROM user_cooldowns WHERE user_id = $1 AND room = $2',
      [userId, room]
    );

    if (cooldownResult.rows.length > 0) {
      const lastAddTime = new Date(cooldownResult.rows[0].last_add_time);
      const now = new Date();
      const secondsSinceLastAdd = (now - lastAddTime) / 1000;

      if (secondsSinceLastAdd < COOLDOWN_SECONDS) {
        const remainingSeconds = Math.ceil(COOLDOWN_SECONDS - secondsSinceLastAdd);
        return res.status(429).json({
          error: 'Cooldown active',
          remainingSeconds,
          message: `Please wait ${remainingSeconds} seconds before adding another song`
        });
      }
    }

    const queueItem = await queueService.addSpotifySong(track, userId, room);

    // Update cooldown timestamp
    await pool.query(
      `INSERT INTO user_cooldowns (user_id, room, last_add_time)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, room)
       DO UPDATE SET last_add_time = NOW()`,
      [userId, room]
    );

    // Check if there's no current song playing and auto-start if needed
    const currentPlaybackState = playbackStateManager.getPlaybackState(room);
    if (!currentPlaybackState.isPlaying) {
      console.log(`[${room}] No song currently playing, auto-starting playback...`);
      await playbackStateManager.playNext(room);
    }

    // Broadcast updated queue to all connected clients in the room via WebSocket
    const io = getIO();
    const updatedQueue = await queueService.getQueue(room);
    io.to(room).emit('queue:updated', updatedQueue);

    res.json({ success: true, queueItem });
  } catch (error) {
    console.error('Add to queue error:', error);
    res.status(500).json({ error: 'Failed to add song to queue', message: error.message });
  }
});

// Pop first song from queue and add to Spotify player (for all users)
// Note: This is now primarily triggered automatically by the server
router.post('/pop-to-spotify', requireAuth, async (req, res) => {
  try {
    const { room = 'general' } = req.body;

    // Use playback state manager to handle popping for all users in the room
    await playbackStateManager.playNext(room);

    res.json({ success: true, message: 'Next song queued for all users' });
  } catch (error) {
    console.error('Pop to Spotify error:', error);
    res.status(500).json({ error: 'Failed to add song to Spotify', message: error.message });
  }
});

module.exports = router;

