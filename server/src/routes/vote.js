const express = require('express');
const router = express.Router();
const voteService = require('../services/voteService');
const playbackStateManager = require('../services/playbackStateManager');
const { getIO, getRoomUserCount } = require('../websocket');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Vote to skip current song
router.post('/skip', requireAuth, async (req, res) => {
  try {
    const { room = 'general' } = req.body;
    const userId = req.session.userId;

    // Get current song
    const playbackState = playbackStateManager.getPlaybackState(room);
    if (!playbackState.currentSong) {
      return res.status(400).json({ error: 'No song currently playing' });
    }

    const songSpotifyId = playbackState.currentSong.spotifyId;

    // Add vote
    const baseStats = await voteService.addSkipVote(userId, room, songSpotifyId);

    // Get user count from websocket
    const userCount = await getRoomUserCount(room);

    // Calculate vote stats with user count
    const voteStats = {
      voteCount: baseStats.voteCount,
      userCount,
      percentage: userCount > 0 ? Math.round((baseStats.voteCount / userCount) * 100) : 0
    };

    console.log(`[${room}] Vote stats:`, voteStats);

    // Check if threshold reached (50% of users)
    const SKIP_THRESHOLD = 0.5;
    const hasReachedThreshold = voteService.checkThreshold(
      voteStats.voteCount,
      userCount,
      SKIP_THRESHOLD
    );

    console.log(`[${room}] Threshold check: voteCount=${voteStats.voteCount}, userCount=${userCount}, hasReachedThreshold=${hasReachedThreshold}`);

    voteStats.hasReachedThreshold = hasReachedThreshold;

    // Broadcast vote update to all users in the room
    const io = getIO();
    io.to(room).emit('vote:updated', {
      songSpotifyId,
      ...voteStats
    });

    // If threshold reached, skip the song
    if (hasReachedThreshold) {
      console.log(`[${room}] Skip vote threshold reached (${voteStats.voteCount}/${userCount}). Skipping song...`);

      // Clear votes for this song
      await voteService.clearSkipVotes(room, songSpotifyId);

      // Skip to next song
      await playbackStateManager.playNext(room);

      // Notify that song was skipped
      io.to(room).emit('song:skipped', {
        reason: 'vote',
        voteCount: voteStats.voteCount,
        userCount
      });
    }

    res.json({
      success: true,
      voted: true,
      ...voteStats
    });
  } catch (error) {
    console.error('Skip vote error:', error);
    res.status(500).json({ error: 'Failed to register skip vote', message: error.message });
  }
});

// Remove skip vote
router.delete('/skip', requireAuth, async (req, res) => {
  try {
    const { room = 'general' } = req.body;
    const userId = req.session.userId;

    // Get current song
    const playbackState = playbackStateManager.getPlaybackState(room);
    if (!playbackState.currentSong) {
      return res.status(400).json({ error: 'No song currently playing' });
    }

    const songSpotifyId = playbackState.currentSong.spotifyId;

    // Remove vote
    const baseStats = await voteService.removeSkipVote(userId, room, songSpotifyId);

    // Get user count from websocket
    const userCount = await getRoomUserCount(room);

    const voteStats = {
      voteCount: baseStats.voteCount,
      userCount,
      percentage: userCount > 0 ? Math.round((baseStats.voteCount / userCount) * 100) : 0,
      hasReachedThreshold: false
    };

    // Broadcast vote update
    const io = getIO();
    io.to(room).emit('vote:updated', {
      songSpotifyId,
      ...voteStats
    });

    res.json({
      success: true,
      voted: false,
      ...voteStats
    });
  } catch (error) {
    console.error('Remove skip vote error:', error);
    res.status(500).json({ error: 'Failed to remove skip vote', message: error.message });
  }
});

// Get current skip vote status
router.get('/skip/status', async (req, res) => {
  try {
    const { room = 'general' } = req.query;
    const userId = req.session.userId; // May be null if not authenticated

    // Get current song
    const playbackState = playbackStateManager.getPlaybackState(room);
    if (!playbackState.currentSong) {
      return res.json({
        hasCurrentSong: false,
        voteCount: 0,
        userCount: 0,
        percentage: 0,
        hasVoted: false
      });
    }

    const songSpotifyId = playbackState.currentSong.spotifyId;

    // Get vote stats
    const baseStats = await voteService.getVoteStats(room, songSpotifyId);
    const userCount = await getRoomUserCount(room);

    // Check if current user has voted
    let hasVoted = false;
    if (userId) {
      hasVoted = await voteService.hasUserVoted(userId, room, songSpotifyId);
    }

    res.json({
      hasCurrentSong: true,
      songSpotifyId,
      voteCount: baseStats.voteCount,
      userCount,
      percentage: userCount > 0 ? Math.round((baseStats.voteCount / userCount) * 100) : 0,
      hasVoted
    });
  } catch (error) {
    console.error('Get skip vote status error:', error);
    res.status(500).json({ error: 'Failed to fetch skip vote status', message: error.message });
  }
});

module.exports = router;
