import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { dbEvents } from '../db/listener';
import { OrderEvent } from '../types';

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log(`↑ Client connected   | total: ${wss.clients.size}`);

    let isAlive = true;
    ws.on('pong', () => { isAlive = true; });

    const pingInterval = setInterval(() => {
      if (!isAlive) return ws.terminate();
      isAlive = false;
      ws.ping();
    }, 30_000);

    ws.on('close', () => {
      clearInterval(pingInterval);
      console.log(`↓ Client disconnected | total: ${wss.clients.size}`);
    });

    ws.on('error', (err) => console.error('WebSocket client error:', err));
  });

  dbEvents.on('order_change', (event: OrderEvent) => {
    const message = JSON.stringify({ type: 'order_change', ...event });
    let sent = 0;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    });

    console.log(`⚡ ${event.operation} broadcasted to ${sent} client(s) — order #${event.data.id}`);
  });

  return wss;
}
