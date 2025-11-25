const Vote = require("../models/Vote");
const playbackStateManager = require("./playbackStateManager");
const { getIO } = require("../websocket");

const SKIP_THRESHOLD = parseFloat(process.env.SKIP_THRESHOLD || 0.5);

/**
 * Get the number of authenticated users currently connected via WebSocket
 * @returns {Promise<number>} Number of authenticated users
 */

async function getConnectedUserCount() {
  try {
    // get the socket.io instance from websocket module
    const { getIO } = require("../websocket");
    const io = getIO();
    if (!io) {
      return 0;
    }
    // Fetch all connected sockets
    const sockets = await io.fetchSockets();

    // Filter to only authenticated users (those with userId in socket.data)
    const authenticatedUsers = sockets.filter((socket) => socket.data.userId);

    // Return the count
    return authenticatedUsers.length;
  } catch (error) {
    console.error("Error getting connected user count:", error);
    return 0;
  }
}

/**
 * Check if the skip threshold has been reached for a song
 * @param {number} songId - The ID of the song being voted on
 * @param {number} connectedUserCount - Number of connected users (optional, will fetch if not provided)
 * @returns {Promise<Object>} Object with { thresholdReached: boolean, voteCount: number, requiredVotes: number, connectedUsers: number }
 */

async function checkSkipThreshold(songId, connectedUserCount = null) {
  try {
    // get skip vote count for this song from the db
    const voteCount = await Vote.getSkipVoteCount(songId);
    if (connectedUserCount === null) {
      connectedUserCount = await getConnectedUserCount();
    }
    // calculate how many votes are req'd
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
    console.error("Error checking skip threshold: ", error);
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
 * Vote to skip the currently playing song
 * @param {number} userSpotifyId - The ID of the user voting
 * @param {number} songId - The ID of the song to skip
 * @returns {Promise<Object>} Object with vote info and threshold status
 */
async function voteToSkip(userSpotifyId, songId) {
  try {
    // check if the user has already voted
    const alreadyVoted = await Vote.hasUserVoted(userSpotifyId, songId);
    if (alreadyVoted) {
      // return existing vote info without creating duplicate
      const voteCount = await Vote.getSkipVoteCount(songId);
      const thresholdStatus = await checkSkipThreshold(songId);
      await broadcastVoteStatus(songId);

      return {
        success: false,
        message: "User has already voted to skip",
        voteCount,
        ...thresholdStatus,
      };
    }
    // create the vote in the db
    const vote = await Vote.voteToSkip(userSpotifyId, songId);

    // get updated vote count and threshold status
    const voteCount = await Vote.getSkipVoteCount(songId);
    const thresholdStatus = await checkSkipThreshold(songId);
    await broadcastVoteStatus(songId);

    // if threshold reached, trigger skip
    if (thresholdStatus.thresholdReached) {
      console.log(
        "Skip threshold reached for song ${songId} (${voteCount}/${thresholdStatsu.requiredVotes} votes)"
      );

      // clear all skip votes for this song
      await Vote.clearSkipVotes(songId);

      await playbackStateManager.playNext();
    }
    return {
      success: true,
      vote,
      voteCount,
      ...thresholdStatus,
    };
  } catch (error) {
    console.error("Errror voting to skip: ", error);
    throw error;
  }
}

/**
 * Remove a user's skip vote (could be optional, depending on implementation)
 * @param {number} userSpotifyId - The ID of the user
 * @param {number} songId - The ID of the song
 * @returns {Promise<Object>} Updated vote info
 */
async function removeVote(userSpotifyId, songId) {
  try {
    // remove vote from db
    await Vote.removeVote(userSpotifyId, songId);

    // get updated voite count and threshold status
    const voteCount = await Vote.getSkipVoteCount(songId);
    const thresholdStatus = await checkSkipThreshold(songId);
    await broadcastVoteStatus(songId);

    return {
      success: true,
      voteCount,
      ...thresholdStatus,
    };
  } catch (error) {
    console.error("Error removing vote:", error);
    throw error;
  }
}

/**
 * Get current vote status for a song
 * @param {number} songId - The ID of the song
 * @param {number} userSpotifyId - Optional user ID to check if they've voted
 * @returns {Promise<Object>} Vote status information
 */
async function getVoteStatus(songId, userSpotifyId = null) {
  try {
    // get vote count from db
    const voteCount = await Vote.getSkipVoteCount(songId);
    // check threshold status
    const thresholdStatus = await checkSkipThreshold(songId);
    await broadcastVoteStatus(songId);
    // check if a specific user has voted (if userSpotifyId provided)
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
 * Clear all skip votes for a song (called when song changes)
 * @param {number} songId - The ID of the song
 */
async function clearSkipVotes(songId) {
  try {
    await Vote.clearSkipVotes(songId);
  } catch (error) {
    console.error("Error clearing skip votes:", error);
  }
}

async function broadcastVoteStatus(songId) {
  try {
    const io = getIO();
    if (!io) return; // Server might not be initialized (tests, etc.)

    const status = await checkSkipThreshold(songId);

    io.emit("vote:update", {
      songId,
      ...status,
    });
  } catch (error) {
    console.error("Error broadcasting vote status:", error);
  }
}

module.exports = {
  voteToSkip,
  removeVote,
  getVoteStatus,
  checkSkipThreshold,
  clearSkipVotes,
  getConnectedUserCount,
  SKIP_THRESHOLD,
};
