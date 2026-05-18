import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { runMigrations } from './db/migrate';
import { startDBListener } from './db/listener';
import { createWebSocketServer } from './ws/server';
import orderRoutes from './api/routes';

const PORT = process.env.PORT || 3000;

async function main() {
  // Setup Database Schema
  await runMigrations();

  // Start DB Listener
  await startDBListener();

  // Setup Express App
  const app = express();
  app.use(express.json());

  // Serve Client
  app.use(express.static(path.join(__dirname, '../../client')));

  // REST Routes
  app.use('/api/orders', orderRoutes);

  const httpServer = http.createServer(app);

  // Setup WebSocket Server
  createWebSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀  Server    →  http://localhost:${PORT}`);
    console.log(`📡  WebSocket →  ws://localhost:${PORT}`);
    console.log(`📋  REST API  →  http://localhost:${PORT}/api/orders\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
