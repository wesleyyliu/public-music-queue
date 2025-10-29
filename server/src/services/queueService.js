const Song = require('../models/Song');
const QueueItem = require('../models/QueueItem');

async function getQueue() {
  try {
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
 */
async function addSpotifySong(spotifyTrack, userId) {
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
    
    // Add to queue
    const queueItem = await QueueItem.create(song.id, userId);
    
    // Return formatted queue item
    return {
      id: queueItem.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      addedBy: userId,
      addedAt: queueItem.added_at,
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

async function clearQueue() {
  try {
    await QueueItem.clear();
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

module.exports = {
  getQueue,
  addSpotifySong,
  removeSong,
  clearQueue,
};

