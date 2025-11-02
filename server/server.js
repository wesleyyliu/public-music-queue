require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocketServer } = require('./src/websocket');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
