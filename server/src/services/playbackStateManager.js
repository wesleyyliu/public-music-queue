const spotifyService = require('./spotifyService');
const queueService = require('./queueService');

// In-memory playback state
let playbackState = {
  currentSong: null,        // { id, title, artist, spotifyUri, duration, ... }
  startedAt: null,          // timestamp when song started playing
  isPlaying: false,         // whether music is currently playing
};

// Reference to socket.io instance
let io = null;

// Polling interval reference
let pollingInterval = null;

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
 * Start a song - updates state and broadcasts to all clients
 */
function startSong(song) {
  playbackState.currentSong = song;
  playbackState.startedAt = Date.now();
  playbackState.isPlaying = true;
  
  console.log(`Started playing: ${song.title} by ${song.artist}`);
  
  // Broadcast to all clients
  if (io) {
    io.emit('playback:state', {
      currentSong: song,
      startedAt: playbackState.startedAt,
      isPlaying: true
    });
  }
}

/**
 * Get current playback state
 */
function getPlaybackState() {
  if (!playbackState.currentSong || !playbackState.isPlaying) {
    return {
      currentSong: null,
      startedAt: null,
      isPlaying: false,
      position: 0
    };
  }
  
  const position = Date.now() - playbackState.startedAt;
  
  return {
    currentSong: playbackState.currentSong,
    startedAt: playbackState.startedAt,
    isPlaying: playbackState.isPlaying,
    position: position,
    duration: playbackState.currentSong.duration * 1000 // convert to ms
  };
}

/**
 * Get all connected users' Spotify IDs
 */
async function getConnectedUserIds() {
  // This will need to be enhanced - for now we'll track users via socket metadata
  // For simplicity, we'll need to modify the WebSocket connection to store userId
  if (!io) return [];
  
  const connectedUsers = [];
  const sockets = await io.fetchSockets();
  console.log('Sockets:', sockets);
  
  for (const socket of sockets) {
    if (socket.data.userId) {
      connectedUsers.push(socket.data.userId);
    }
  }
  
  return connectedUsers;
}

/**
 * Poll playback state and auto-pop next song when needed
 */
function startPolling() {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  // Check every 500ms
  pollingInterval = setInterval(async () => {
    if (!playbackState.currentSong) {
      return;
    }
    
    // If not playing, don't check (but still allow manual triggers)
    if (!playbackState.isPlaying) {
      return;
    }
    
    const elapsed = Date.now() - playbackState.startedAt;
    const duration = playbackState.currentSong.duration * 1000; // convert to ms
    const timeRemaining = duration - elapsed;
    
    // When less than 2 seconds remain OR song has finished, pop next song
    if (timeRemaining <= 2000) {
      console.log(`Song ending or finished (${Math.floor(timeRemaining / 1000)}s remaining), auto-popping next song...`);
      
      // Prevent multiple triggers - mark as not playing
      playbackState.isPlaying = false;
      
      try {
        await popNextSongForAllUsers();
      } catch (error) {
        console.error('Error auto-popping next song:', error);
        // Reset playing state on error so it can retry
        playbackState.isPlaying = true;
      }
    }
  }, 500);
  
  console.log('Started playback polling');
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
 * Pop next song from queue and add to all users' Spotify queues
 */
async function popNextSongForAllUsers() {
  try {
    // Get the first song in the queue
    const nextSong = await queueService.getFirstSong();
    
    if (!nextSong) {
      console.log('Queue is empty, no next song to play');
      playbackState.currentSong = null;
      playbackState.isPlaying = false;
      
      if (io) {
        io.emit('playback:state', {
          currentSong: null,
          startedAt: null,
          isPlaying: false
        });
      }
      return;
    }
    
    // Validate that the song has required properties
    if (!nextSong.spotifyUri) {
      console.error('Next song missing spotifyUri:', nextSong);
      throw new Error('Song missing required spotifyUri property');
    }
    
    console.log(`Auto-advancing to next song: ${nextSong.title} by ${nextSong.artist}`);
    
    // Get all connected users with Spotify authentication
    const userIds = await getConnectedUserIds();
    
    if (userIds.length === 0) {
      console.log('No authenticated users connected, cannot add to Spotify queue');
      // Still update playback state even if no users connected
      playbackState.currentSong = null;
      playbackState.isPlaying = false;
      return;
    }
    
    console.log(`Adding song to Spotify queue for ${userIds.length} user(s)`);
    
    // Add to each user's Spotify queue
    const addPromises = userIds.map(userId => 
      spotifyService.addToSpotifyQueue(userId, nextSong.spotifyUri)
        .catch(error => {
          console.error(`Failed to add song for user ${userId}:`, error.message);
          // Don't fail the whole operation if one user fails
        })
    );
    
    await Promise.all(addPromises);
    
    // Remove the song from our queue (using queue item ID)
    await queueService.removeSong(nextSong.id);
    
    // Update playback state
    startSong(nextSong);
    
    // Broadcast updated queue to all clients
    if (io) {
      const updatedQueue = await queueService.getQueue();
      io.emit('queue:updated', updatedQueue);
    }
    
    console.log(`Successfully queued and started: ${nextSong.title}`);
  } catch (error) {
    console.error('Error in popNextSongForAllUsers:', error);
    // Reset playback state on error
    playbackState.isPlaying = false;
    throw error;
  }
}

/**
 * Trigger the next song (called automatically by server or on-demand)
 */
async function playNext() {
  // Stop current playback
  playbackState.isPlaying = false;
  
  // Pop next song
  await popNextSongForAllUsers();
}

module.exports = {
  initialize,
  startSong,
  getPlaybackState,
  popNextSongForAllUsers,
  playNext,
  stopPolling
};

