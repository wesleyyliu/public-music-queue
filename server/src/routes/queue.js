const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const spotifyService = require('../services/spotifyService');
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

// Pop first song from queue and add to Spotify player
router.post('/pop-to-spotify', requireAuth, async (req, res) => {
  try {
    // Get the first song in the queue
    const firstSong = await queueService.getFirstSong();
    
    if (!firstSong) {
      return res.status(404).json({ error: 'Queue is empty' });
    }

    // Add the song to Spotify player queue
    await spotifyService.addToSpotifyQueue(req.session.userId, firstSong.spotifyUri);

    // Remove the song from our queue
    await queueService.removeSong(firstSong.id);

    // Broadcast updated queue to all connected clients via WebSocket
    const io = getIO();
    const updatedQueue = await queueService.getQueue();
    io.emit('queue:updated', updatedQueue);

    res.json({ success: true, song: firstSong });
  } catch (error) {
    console.error('Pop to Spotify error:', error);
    res.status(500).json({ error: 'Failed to add song to Spotify', message: error.message });
  }
});

module.exports = router;

