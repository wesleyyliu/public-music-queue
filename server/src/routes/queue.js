const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const spotifyService = require('../services/spotifyService');
const playbackStateManager = require('../services/playbackStateManager');
const { getIO } = require('../websocket');

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
    const queue = await queueService.getQueue();
    res.json({ queue });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Add a song to the queue
router.post('/add', requireAuth, async (req, res) => {
  const { track } = req.body;

  if (!track || !track.id) {
    return res.status(400).json({ error: 'Track data is required' });
  }

  try {
    const queueItem = await queueService.addSpotifySong(track, req.session.userId);
    
    // Broadcast updated queue to all connected clients via WebSocket
    const io = getIO();
    const updatedQueue = await queueService.getQueue();
    io.emit('queue:updated', updatedQueue);
    
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
    // Use playback state manager to handle popping for all users
    await playbackStateManager.playNext();

    res.json({ success: true, message: 'Next song queued for all users' });
  } catch (error) {
    console.error('Pop to Spotify error:', error);
    res.status(500).json({ error: 'Failed to add song to Spotify', message: error.message });
  }
});

module.exports = router;

