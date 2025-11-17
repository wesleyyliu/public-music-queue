const spotifyService = require('./spotifyService');
const queueService = require('./queueService');

// In-memory playback state per room
// Map structure: { roomName: { currentSong, startedAt, isPlaying } }
let playbackStates = new Map();

// Reference to socket.io instance
let io = null;

// Polling interval reference
let pollingInterval = null;

/**
 * Get or initialize playback state for a room
 */
function getRoomState(room = 'general') {
  if (!playbackStates.has(room)) {
    playbackStates.set(room, {
      currentSong: null,
      startedAt: null,
      isPlaying: false,
    });
  }
  return playbackStates.get(room);
}

/**
 * Initialize the playback state manager with socket.io instance
 */
function initialize(socketIO) {
  io = socketIO;
  console.log('Playback state manager initialized');
  
  // Start polling for auto-pop
  startPolling();
}

/**
 * Start a song - updates state and broadcasts to all clients in the room
 * @param {Object} song - Song object
 * @param {string} room - Room name (default: 'general')
 */
function startSong(song, room = 'general') {
  const roomState = getRoomState(room);
  roomState.currentSong = song;
  roomState.startedAt = Date.now();
  roomState.isPlaying = true;

  console.log(`[${room}] Started playing: ${song.title} by ${song.artist}`);

  // Broadcast to all clients in the room
  if (io) {
    io.to(room).emit('playback:state', {
      currentSong: song,
      startedAt: roomState.startedAt,
      isPlaying: true,
      room: room
    });
  }
}

/**
 * Get current playback state for a room
 * @param {string} room - Room name (default: 'general')
 */
function getPlaybackState(room = 'general') {
  const roomState = getRoomState(room);

  if (!roomState.currentSong || !roomState.isPlaying) {
    return {
      currentSong: null,
      startedAt: null,
      isPlaying: false,
      position: 0,
      room: room
    };
  }

  const position = Date.now() - roomState.startedAt;

  return {
    currentSong: roomState.currentSong,
    startedAt: roomState.startedAt,
    isPlaying: roomState.isPlaying,
    position: position,
    duration: roomState.currentSong.duration * 1000, // convert to ms
    room: room
  };
}

/**
 * Get all connected users' Spotify IDs in a specific room
 * @param {string} room - Room name (default: 'general')
 */
async function getConnectedUserIds(room = 'general') {
  if (!io) return [];

  const connectedUsers = [];
  const sockets = await io.in(room).fetchSockets();
  console.log(`[${room}] Fetched ${sockets.length} socket(s)`);

  for (const socket of sockets) {
    if (socket.data.userId) {
      connectedUsers.push(socket.data.userId);
    }
  }

  return connectedUsers;
}

/**
 * Poll playback state and auto-pop next song when needed
 * Checks all active rooms
 */
function startPolling() {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Check every 500ms
  pollingInterval = setInterval(async () => {
    // Check each room's playback state
    for (const [room, roomState] of playbackStates.entries()) {
      if (!roomState.isPlaying || !roomState.currentSong) {
        continue;
      }

      const elapsed = Date.now() - roomState.startedAt;
      const duration = roomState.currentSong.duration * 1000; // convert to ms
      const timeRemaining = duration - elapsed;

      // When less than 2 seconds remain, pop next song
      if (timeRemaining <= 2000 && timeRemaining > 0) {
        console.log(`[${room}] Song ending soon (${Math.floor(timeRemaining / 1000)}s remaining), auto-popping next song...`);

        // Prevent multiple triggers - mark as not playing
        roomState.isPlaying = false;

        try {
          await popNextSongForAllUsers(room);
        } catch (error) {
          console.error(`[${room}] Error auto-popping next song:`, error);
        }
      }
    }
  }, 500);

  console.log('Started playback polling for all rooms');
}

/**
 * Stop polling
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Stopped playback polling');
  }
}

/**
 * Pop next song from queue and add to all users' Spotify queues in a room
 * @param {string} room - Room name (default: 'general')
 */
async function popNextSongForAllUsers(room = 'general') {
  try {
    // Get the first song in the queue for this room
    const nextSong = await queueService.getFirstSong(room);

    if (!nextSong) {
      console.log(`[${room}] Queue is empty, no next song to play`);
      const roomState = getRoomState(room);
      roomState.currentSong = null;
      roomState.isPlaying = false;

      if (io) {
        io.to(room).emit('playback:state', {
          currentSong: null,
          startedAt: null,
          isPlaying: false,
          room: room
        });
      }
      return;
    }

    // Get all connected users with Spotify authentication in this room
    const userIds = await getConnectedUserIds(room);

    if (userIds.length === 0) {
      console.log(`[${room}] No authenticated users connected, cannot add to Spotify queue`);
      return;
    }

    console.log(`[${room}] Starting playback for ${userIds.length} user(s)`);

    // Start playing on each user's Spotify device
    const playPromises = userIds.map(userId =>
      spotifyService.playTrackNow(userId, nextSong.spotifyUri)
        .catch(error => {
          console.error(`[${room}] Failed to start playback for user ${userId}:`, error.message);
          // Don't fail the whole operation if one user fails
        })
    );

    await Promise.all(playPromises);

    // Remove the song from our queue
    await queueService.removeSong(nextSong.id);

    // Update playback state for this room
    startSong(nextSong, room);

    // Broadcast updated queue to all clients in the room
    if (io) {
      const updatedQueue = await queueService.getQueue(room);
      io.to(room).emit('queue:updated', updatedQueue);
    }

    console.log(`[${room}] Successfully queued: ${nextSong.title}`);
  } catch (error) {
    console.error(`[${room}] Error in popNextSongForAllUsers:`, error);
    throw error;
  }
}

/**
 * Trigger the next song (called automatically by server or on-demand)
 * @param {string} room - Room name (default: 'general')
 */
async function playNext(room = 'general') {
  // Stop current playback for this room
  const roomState = getRoomState(room);
  roomState.isPlaying = false;

  // Pop next song
  await popNextSongForAllUsers(room);
}

module.exports = {
  initialize,
  startSong,
  getPlaybackState,
  popNextSongForAllUsers,
  playNext,
  stopPolling
};

