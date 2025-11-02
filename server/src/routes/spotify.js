const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotifyService');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Search for tracks
router.get('/search', requireAuth, async (req, res) => {
  const { q, limit } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const tracks = await spotifyService.searchTracks(
      req.session.userId,
      q,
      limit ? parseInt(limit) : 20
    );
    
    res.json({ tracks });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search tracks', message: error.message });
  }
});

module.exports = router;

