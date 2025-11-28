const Vote = require("../models/Vote");
const playbackStateManager = require("./playbackStateManager");
const SKIP_THRESHOLD = parseFloat(process.env.SKIP_THRESHOLD || 0.5);

// Local reference to socket.io instance (injected via initialize)
let io = null;

/**
 * Initialize vote service with socket.io instance
 */
function initialize(socketIO) {
  io = socketIO;
  console.log("Vote service initialized!");
}

/**
 * Get all connected users' Spotify IDs (matches playbackStateManager logic exactly)
 */
async function getConnectedUserIds() {
  try {
    if (!io) return [];

    const connectedUsers = [];
    const sockets = await io.fetchSockets();

    for (const socket of sockets) {
      if (socket.data.userId) {
        connectedUsers.push(socket.data.userId);
      }
    }

    return connectedUsers;
  } catch (error) {
    console.error("Error in getConnectedUserIds:", error);
    return [];
  }
}

/**
 * Get count of authenticated connected users
 */
async function getConnectedUserCount() {
  const ids = await getConnectedUserIds();
  return ids.length;
}

/**
 * Determine if skip threshold reached
 */
async function checkSkipThreshold(songId, connectedUserCount = null) {
  try {
    const voteCount = await Vote.getSkipVoteCount(songId);

    if (connectedUserCount === null) {
      connectedUserCount = await getConnectedUserCount();
    }

    const requiredVotes = Math.ceil(connectedUserCount * SKIP_THRESHOLD);
    const thresholdReached =
      voteCount >= requiredVotes && connectedUserCount > 0;

    return {
      thresholdReached,
      voteCount,
      requiredVotes,
      connectedUsers: connectedUserCount,
      threshold: SKIP_THRESHOLD,
    };
  } catch (error) {
    console.error("Error checking skip threshold:", error);
    return {
      thresholdReached: false,
      voteCount: 0,
      requiredVotes: 0,
      connectedUsers: 0,
      threshold: SKIP_THRESHOLD,
    };
  }
}

/**
 * Cast a skip vote
 */
async function voteToSkip(userSpotifyId, songId) {
  try {
    // prevent duplicates
    const alreadyVoted = await Vote.hasUserVoted(userSpotifyId, songId);

    if (alreadyVoted) {
      const thresholdStatus = await checkSkipThreshold(songId);
      await broadcastVoteStatus(songId);
      return {
        success: false,
        message: "User has already voted to skip",
        ...thresholdStatus,
      };
    }

    // create vote
    await Vote.voteToSkip(userSpotifyId, songId);

    // calculate updated state
    const thresholdStatus = await checkSkipThreshold(songId);
    await broadcastVoteStatus(songId);

    // trigger skip if reached
    if (thresholdStatus.thresholdReached) {
      console.log(
        `Skip threshold reached: ${thresholdStatus.voteCount}/${thresholdStatus.requiredVotes} - skipping song`
      );

      await Vote.clearSkipVotes(songId);
      // playNext() will start the next song and broadcast its vote status
      await playbackStateManager.playNext();
    }

    return {
      success: true,
      ...thresholdStatus,
    };
  } catch (error) {
    console.error("Error voting to skip:", error);
    throw error;
  }
}

/**
 * Remove a vote
 */
async function removeVote(userSpotifyId, songId) {
  try {
    await Vote.removeVote(userSpotifyId, songId);

    const thresholdStatus = await checkSkipThreshold(songId);
    await broadcastVoteStatus(songId);

    return {
      success: true,
      ...thresholdStatus,
    };
  } catch (error) {
    console.error("Error removing vote:", error);
    throw error;
  }
}

/**
 * Get current vote status for a song
 */
async function getVoteStatus(songId, userSpotifyId = null) {
  try {
    const voteCount = await Vote.getSkipVoteCount(songId);
    const thresholdStatus = await checkSkipThreshold(songId);

    let userHasVoted = null;
    if (userSpotifyId) {
      userHasVoted = await Vote.hasUserVoted(userSpotifyId, songId);
    }

    return {
      songId,
      voteCount,
      userHasVoted,
      ...thresholdStatus,
    };
  } catch (error) {
    console.error("Error getting vote status:", error);
    throw error;
  }
}

/**
 * Clear all votes for a song
 */
async function clearSkipVotes(songId) {
  try {
    await Vote.clearSkipVotes(songId);
  } catch (error) {
    console.error("Error clearing skip votes:", error);
  }
}

/**
 * Broadcast vote status update to all clients
 */
async function broadcastVoteStatus(songId) {
  if (!io) return;

  try {
    const status = await checkSkipThreshold(songId);
    io.emit("vote:update", {
      songId,
      ...status,
    });
  } catch (error) {
    console.error("Error broadcasting vote status:", error);
  }
}

// Exports
module.exports = {
  initialize,
  voteToSkip,
  removeVote,
  getVoteStatus,
  checkSkipThreshold,
  clearSkipVotes,
  getConnectedUserIds,
  getConnectedUserCount,
  SKIP_THRESHOLD,
};