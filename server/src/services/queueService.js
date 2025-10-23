// In-memory queue (will be replaced with database later)
let queue = [];
let nextId = 1;

// Mock songs for testing
const mockSongs = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', duration: 354 },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin', duration: 482 },
  { title: 'Hotel California', artist: 'Eagles', duration: 391 },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', duration: 301 },
  { title: 'Billie Jean', artist: 'Michael Jackson', duration: 294 },
  { title: 'Sweet Child O Mine', artist: 'Guns N Roses', duration: 356 },
];

function getQueue() {
  return queue;
}

function addSong(userId) {
  // Pick a random mock song
  const mockSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];
  
  const queueItem = {
    id: nextId++,
    ...mockSong,
    addedBy: userId,
    addedAt: new Date().toISOString(),
  };
  
  queue.push(queueItem);
  return queueItem;
}

function removeSong(songId) {
  const index = queue.findIndex(item => item.id === songId);
  if (index !== -1) {
    const removed = queue.splice(index, 1)[0];
    return removed;
  }
  return null;
}

function clearQueue() {
  queue = [];
  nextId = 1;
}

module.exports = {
  getQueue,
  addSong,
  removeSong,
  clearQueue,
};

