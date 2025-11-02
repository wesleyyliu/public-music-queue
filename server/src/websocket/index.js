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

    // Send current queue to new connection
    const currentQueue = await queueService.getQueue();
    socket.emit('queue:updated', currentQueue);
    
    // Send current playback state to new connection
    const playbackState = playbackStateManager.getPlaybackState();
    socket.emit('playback:state', playbackState);

    // Broadcast user count to all clients
    const userCount = io.sockets.sockets.size;
    console.log('Current user count:', userCount);
    io.emit('users:count', userCount);

    // Handle user authentication registration
    socket.on('user:register', async (userId) => {
      console.log('User registered with socket:', userId);
      socket.data.userId = userId;
      
      // Auto-start playback if this is the first user and there are songs in queue
      const connectedUsers = await io.fetchSockets();
      const authenticatedUsers = connectedUsers.filter(s => s.data.userId);
      
      if (authenticatedUsers.length === 1) {
        // This is the first authenticated user
        const currentState = playbackStateManager.getPlaybackState();
        
        if (!currentState.isPlaying) {
          // No song is currently playing, check if there are songs in queue
          const queue = await queueService.getQueue();
          
          if (queue.length > 0) {
            console.log('First user connected with songs in queue, auto-starting playback...');
            await playbackStateManager.playNext();
          }
        }
      }
    });

    // Handle remove song from queue
    socket.on('queue:remove', async (songId) => {
      try {
        console.log('Removing song:', songId);
        const removed = await queueService.removeSong(songId);
        
        if (removed) {
          // Broadcast updated queue to all clients
          const updatedQueue = await queueService.getQueue();
          io.emit('queue:updated', updatedQueue);
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
      // Broadcast updated user count
      const userCount = io.sockets.sockets.size;
      console.log('Current user count:', userCount);
      io.emit('users:count', userCount);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocketServer, getIO };

