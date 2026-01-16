import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router.js';
const app = express();
const port = Number.parseInt(process.env.PORT ?? '', 10) || 5173;
const rootDir = process.cwd();
if (typeof globalThis.fetch !== 'function') {
    throw new Error('Node 18+ is required (global fetch is missing).');
}
app.use(cors());
app.use('/trpc', createExpressMiddleware({
    router: appRouter,
}));
app.use('/dist', express.static(path.join(rootDir, 'dist')));
app.get('/', (_req, res) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running at http://localhost:${port}`);
});
