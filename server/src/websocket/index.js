const { Server } = require('socket.io');

let io;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Broadcast user count to all clients
    const userCount = io.sockets.sockets.size;
    console.log('Current user count:', userCount);
    io.emit('users:count', userCount);

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

