const { Server } = require("socket.io");
const queueService = require("../services/queueService");
const playbackStateManager = require("../services/playbackStateManager");
const voteService = require("../services/votingService");

let io = null;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://127.0.0.1:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Initialize services with injected io instance
  playbackStateManager.initialize(io);
  voteService.initialize(io);

  io.on("connection", async (socket) => {
    console.log("Client connected:", socket.id);

    //
    // 1. Send initial queue + playback state
    //
    socket.emit("queue:updated", await queueService.getQueue());
    socket.emit("playback:state", playbackStateManager.getPlaybackState());

    //
    // 2. Broadcast accurate AUTHENTICATED user count
    //
    await broadcastAuthenticatedUserCount();


    //
    // 3. Handle authentication
    //
    socket.on("user:register", async (userId) => {
      console.log(`User registered on socket ${socket.id}:`, userId);
      socket.data.userId = userId;        // <— CONSISTENT KEY

      // Re-broadcast authenticated count
      await broadcastAuthenticatedUserCount();

      // Auto-start playback logic if this is the first authenticated user
      const sockets = await io.fetchSockets();
      const authenticated = sockets.filter((s) => s.data.userId);

      if (authenticated.length === 1) {
        const currentState = playbackStateManager.getPlaybackState();

        if (!currentState.isPlaying) {
          const queue = await queueService.getQueue();

          if (queue.length > 0) {
            console.log(
              "First authenticated user joined with songs in queue — auto-starting playback..."
            );
            await playbackStateManager.playNext();
          }
        }
      }
    });


    //
    // 4. Handle song removals
    //
    socket.on("queue:remove", async (songId) => {
      try {
        const removed = await queueService.removeSong(songId);

        if (removed) {
          io.emit("queue:updated", await queueService.getQueue());
        }
      } catch (err) {
        console.error("Error removing song:", err);
        socket.emit("error", { message: "Failed to remove song" });
      }
    });


    //
    // 5. Ping/Pong diagnostic
    //
    socket.on("ping", (data) => {
      socket.emit("pong", {
        message: "pong from server",
        timestamp: Date.now(),
      });
    });


    //
    // 6. Disconnection handler
    //
    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);
      await broadcastAuthenticatedUserCount();
    });
  });

  return io;
}



/**
 * Broadcast the count of authenticated connected users
 */
async function broadcastAuthenticatedUserCount() {
  if (!io) return;

  const sockets = await io.fetchSockets();
  const authenticatedUsers = sockets.filter((s) => s.data.userId);

  const userCount = authenticatedUsers.length;
  console.log("Authenticated user count:", userCount);

  io.emit("users:count", userCount);
}



/**
 * Fallback getter for io if needed by other modules
 */
function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initSocketServer, getIO };
