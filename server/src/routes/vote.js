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

// ============ QUEUE ITEM VOTING ============

// Vote on a queue item (upvote or downvote)
router.post('/queue/:queueItemId', requireAuth, async (req, res) => {
  try {
    const queueItemId = parseInt(req.params.queueItemId);
    const { room = 'general', voteType } = req.body;
    const userId = req.session.userId;

    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "upvote" or "downvote"' });
    }

    // Add or update vote
    const voteStats = await voteService.addQueueVote(userId, room, queueItemId, voteType);

    // Broadcast vote update to all users in the room
    const io = getIO();
    io.to(room).emit('queue:vote:updated', {
      queueItemId,
      ...voteStats
    });

    res.json({
      success: true,
      queueItemId,
      voteType,
      ...voteStats
    });
  } catch (error) {
    console.error('Queue vote error:', error);
    res.status(500).json({ error: 'Failed to register vote', message: error.message });
  }
});

// Remove vote from a queue item
router.delete('/queue/:queueItemId', requireAuth, async (req, res) => {
  try {
    const queueItemId = parseInt(req.params.queueItemId);
    const { room = 'general' } = req.body;
    const userId = req.session.userId;

    // Remove vote
    const voteStats = await voteService.removeQueueVote(userId, room, queueItemId);

    // Broadcast vote update
    const io = getIO();
    io.to(room).emit('queue:vote:updated', {
      queueItemId,
      ...voteStats
    });

    res.json({
      success: true,
      queueItemId,
      voteType: null,
      ...voteStats
    });
  } catch (error) {
    console.error('Remove queue vote error:', error);
    res.status(500).json({ error: 'Failed to remove vote', message: error.message });
  }
});

// Get all queue votes for a room
router.get('/queue/all', async (req, res) => {
  try {
    const { room = 'general' } = req.query;
    const userId = req.session.userId;

    // Get all vote stats
    const allVotes = await voteService.getAllQueueVotesInRoom(room);

    // If user is authenticated, get their votes too
    let userVotes = {};
    if (userId) {
      for (const vote of allVotes) {
        const userVote = await voteService.getUserQueueVote(userId, room, vote.queueItemId);
        if (userVote) {
          userVotes[vote.queueItemId] = userVote;
        }
      }
    }

    res.json({
      votes: allVotes,
      userVotes
    });
  } catch (error) {
    console.error('Get queue votes error:', error);
    res.status(500).json({ error: 'Failed to fetch votes', message: error.message });
  }
});

// Get user's vote for a specific queue item
router.get('/queue/:queueItemId', async (req, res) => {
  try {
    const queueItemId = parseInt(req.params.queueItemId);
    const { room = 'general' } = req.query;
    const userId = req.session.userId;

    // Get vote stats
    const voteStats = await voteService.getQueueVoteStats(room, queueItemId);

    // Get user's vote if authenticated
    let userVote = null;
    if (userId) {
      userVote = await voteService.getUserQueueVote(userId, room, queueItemId);
    }

    res.json({
      queueItemId,
      ...voteStats,
      userVote
    });
  } catch (error) {
    console.error('Get queue item vote error:', error);
    res.status(500).json({ error: 'Failed to fetch vote', message: error.message });
  }
});

module.exports = router;
