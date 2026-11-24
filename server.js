const http = require('http');
const { Server } = require('socket.io');
const env = require('./src/config/env');
const { createApp } = require('./src/index');
const { sequelize } = require('./src/models');
const { initializeSockets } = require('./src/sockets');

const app = createApp();

const startServer = async () => {
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  initializeSockets(io);

  try {
    await sequelize.authenticate();
    console.log('[Taantira DB] Connected to MySQL Community Edition successfully.');
  } catch (err) {
    console.warn(`[Taantira DB] MySQL not connected yet (${err.message}). Configure MySQL in backend/.env and run migrations/seeders.`);
  }

  httpServer.listen(env.port, () => {
    console.log(`[Taantira API] Server listening on http://localhost:${env.port}`);
  });

  return { app, httpServer, io };
};

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
