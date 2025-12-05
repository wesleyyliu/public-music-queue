const { Server } = require('socket.io');
const queueService = require('../services/queueService');
const playbackStateManager = require('../services/playbackStateManager');

let io;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://127.0.0.1:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Initialize playback state manager
  playbackStateManager.initialize(io);

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    // Handle room joining
    socket.on('room:join', async (room = 'general') => {
      // Leave all previous rooms except the default socket room
      const rooms = Array.from(socket.rooms);
      rooms.forEach(r => {
        if (r !== socket.id) {
          socket.leave(r);
        }
      });

      // Join the new room
      socket.join(room);
      socket.data.room = room;
      console.log(`Socket ${socket.id} joined room: ${room}`);

      // Send current queue for this room
      const currentQueue = await queueService.getQueue(room);
      socket.emit('queue:updated', currentQueue);

      // Send current playback state for this room
      const playbackState = playbackStateManager.getPlaybackState(room);
      socket.emit('playback:state', playbackState);

      // Broadcast user count to all clients in the room
      const roomSockets = await io.in(room).fetchSockets();
      const userCount = roomSockets.length;
      console.log(`[${room}] Current user count:`, userCount);
      io.to(room).emit('users:count', userCount);
    });

    // Handle user authentication registration
    socket.on('user:register', async (userId) => {
      console.log('User registered with socket:', userId);
      socket.data.userId = userId;

      const room = socket.data.room || 'general';

      // Auto-start playback if this is the first user and there are songs in queue
      const roomSockets = await io.in(room).fetchSockets();
      const authenticatedUsers = roomSockets.filter(s => s.data.userId);

      if (authenticatedUsers.length === 1) {
        // This is the first authenticated user in this room
        const currentState = playbackStateManager.getPlaybackState(room);

        if (!currentState.isPlaying) {
          // No song is currently playing, check if there are songs in queue
          const queue = await queueService.getQueue(room);

          if (queue.length > 0) {
            console.log(`[${room}] First user connected with songs in queue, auto-starting playback...`);
            await playbackStateManager.playNext(room);
          }
        }
      }
    });

    // Handle remove song from queue
    socket.on('queue:remove', async (songId) => {
      try {
        const room = socket.data.room || 'general';
        console.log(`[${room}] Removing song:`, songId);
        const removed = await queueService.removeSong(songId);

        if (removed) {
          // Broadcast updated queue to all clients in the room
          const updatedQueue = await queueService.getQueue(room);
          io.to(room).emit('queue:updated', updatedQueue);
        }
      } catch (error) {
        console.error('Error removing song:', error);
        socket.emit('error', { message: 'Failed to remove song' });
      }
    });

    // Handle ping from client
    socket.on('ping', (data) => {
      console.log('Received ping:', data);
      socket.emit('pong', { message: 'pong from server', timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      const room = socket.data.room || 'general';

      // Broadcast updated user count to the room
      setTimeout(async () => {
        const roomSockets = await io.in(room).fetchSockets();
        const userCount = roomSockets.length;
        console.log(`[${room}] Current user count:`, userCount);
        io.to(room).emit('users:count', userCount);
      }, 100);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

async function getRoomUserCount(room) {
  if (!io) return 0;
  const roomSockets = await io.in(room).fetchSockets();
  return roomSockets.length;
}

module.exports = { initSocketServer, getIO, getRoomUserCount };

