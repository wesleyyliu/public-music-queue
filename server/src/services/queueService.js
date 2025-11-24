const Song = require('../models/Song');
const QueueItem = require('../models/QueueItem');

async function getQueue(room = null) {
  try {
    if (room) {
      return await QueueItem.getByRoom(room);
    }
    return await QueueItem.getAll();
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
}

/**
 * Add a song from Spotify to the queue
 * @param {Object} spotifyTrack - Spotify track data from search
 * @param {string} userId - User ID adding the song
 * @param {string} room - Room/genre to add the song to (default: 'general')
 */
async function addSpotifySong(spotifyTrack, userId, room = 'general') {
  try {
    // Check if song already exists in database
    let song = await Song.findBySpotifyId(spotifyTrack.id);

    if (!song) {
      // Create new song with Spotify data
      song = await Song.create(
        spotifyTrack.name,
        spotifyTrack.artist,
        Math.floor(spotifyTrack.duration_ms / 1000), // Convert ms to seconds
        spotifyTrack.id,
        spotifyTrack.album,
        spotifyTrack.albumArt,
        spotifyTrack.uri,
        spotifyTrack.preview_url
      );
    }

    // Add to queue with room
    const queueItem = await QueueItem.create(song.id, userId, room);

    // Return formatted queue item
    return {
      id: queueItem.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      addedBy: userId,
      addedAt: queueItem.added_at,
      room: queueItem.room,
      spotifyId: song.spotify_id,
      album: song.album,
      albumArt: song.album_art
    };
  } catch (error) {
    console.error('Error adding Spotify song:', error);
    throw error;
  }
}

async function removeSong(songId) {
  try {
    return await QueueItem.remove(songId);
  } catch (error) {
    console.error('Error removing song:', error);
    return null;
  }
}

async function clearQueue(room = null) {
  try {
    await QueueItem.clear(room);
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

/**
 * Get the first song in the queue without removing it
 * @param {string} room - Room to get first song from (optional)
 * @returns {Promise<Object|null>} The first song in queue or null if empty
 */
async function getFirstSong(room = null) {
  try {
    const queue = room ? await QueueItem.getByRoom(room) : await QueueItem.getAll();
    if (queue.length === 0) {
      return null;
    }
    return queue[0];
  } catch (error) {
    console.error('Error getting first song:', error);
    return null;
  }
}

module.exports = {
  getQueue,
  addSpotifySong,
  removeSong,
  clearQueue,
  getFirstSong,
};

