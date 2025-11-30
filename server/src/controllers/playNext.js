const playbackStateManager = require("../services/playbackStateManager");
const queueService = require("../services/queueService");

async function playNext(room = "general") {
  // 1. Get next song from DB
  const next = await queueService.getNextSong(room);
  if (!next) {
    console.log(`[${room}] No more songs in queue.`);
    return null;
  }

  // 2. Update playback state
  await playbackStateManager.setCurrentSong(next);

  // 3. Broadcast update
  playbackStateManager.broadcastPlaybackState(room);

  return next;
}

module.exports = { playNext };
