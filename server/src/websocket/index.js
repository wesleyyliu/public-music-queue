const { Server } = require('socket.io');
const queueService = require('../services/queueService');

let io;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    // Send current queue to new connection
    const currentQueue = await queueService.getQueue();
    socket.emit('queue:updated', currentQueue);

    // Broadcast user count to all clients
    const userCount = io.sockets.sockets.size;
    console.log('Current user count:', userCount);
    io.emit('users:count', userCount);

    // Handle add song to queue
    socket.on('queue:add', async () => {
      try {
        console.log('Adding song from:', socket.id);
        await queueService.addSong(socket.id);
        
        // Broadcast updated queue to all clients
        const updatedQueue = await queueService.getQueue();
        io.emit('queue:updated', updatedQueue);
        console.log('Queue updated, length:', updatedQueue.length);
      } catch (error) {
        console.error('Error adding song:', error);
        socket.emit('error', { message: 'Failed to add song' });
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

