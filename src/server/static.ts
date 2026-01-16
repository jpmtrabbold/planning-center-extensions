import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Express } from 'express';

export const addStaticClient = (app: Express, rootDir: string) => {
  const clientDist = path.join(rootDir, 'dist', 'client');
  const clientIndex = path.join(clientDist, 'index.html');

  if (fs.existsSync(clientIndex)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(clientIndex);
    });
    return;
  }

  app.get('*', (_req, res) => {
    res.status(404).send('Client build not found. Run "npm run build:client" to generate it.');
  });
};
