const Song = require('../models/Song');
const QueueItem = require('../models/QueueItem');

// Mock songs for testing
const mockSongs = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', duration: 354 },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin', duration: 482 },
  { title: 'Hotel California', artist: 'Eagles', duration: 391 },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', duration: 301 },
  { title: 'Billie Jean', artist: 'Michael Jackson', duration: 294 },
  { title: 'Sweet Child O Mine', artist: 'Guns N Roses', duration: 356 },
];

async function getQueue() {
  try {
    return await QueueItem.getAll();
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
}

async function addSong(userId) {
  try {
    // Pick a random mock song
    const mockSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];
    
    // Create song in database
    const song = await Song.create(mockSong.title, mockSong.artist, mockSong.duration);
    
    // Add to queue
    const queueItem = await QueueItem.create(song.id, userId);
    
    // Return formatted queue item
    return {
      id: queueItem.id,
      title: mockSong.title,
      artist: mockSong.artist,
      duration: mockSong.duration,
      addedBy: userId,
      addedAt: queueItem.added_at,
    };
  } catch (error) {
    console.error('Error adding song:', error);
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
  addSong,
  removeSong,
  clearQueue,
};

