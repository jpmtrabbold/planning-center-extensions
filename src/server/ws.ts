import type { Server } from 'node:http';

import { WebSocketServer } from 'ws';

import { onProgress } from './progress.js';

export const attachWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const unsubscribe = onProgress((payload) => {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  });

  wss.on('close', () => {
    unsubscribe();
  });

  return wss;
};
