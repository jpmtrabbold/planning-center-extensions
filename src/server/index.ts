import { createServer } from 'node:http';

import { createApp } from './app.js';
import { addStaticClient } from './static.js';
import { attachWebSocketServer } from './ws.js';

const port = Number.parseInt(process.env.PORT ?? '', 10) || 5174;
const rootDir = process.cwd();

if (typeof globalThis.fetch !== 'function') {
  throw new Error('Node 18+ is required (global fetch is missing).');
}

const app = createApp();
addStaticClient(app, rootDir);

const server = createServer(app);
attachWebSocketServer(server);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
