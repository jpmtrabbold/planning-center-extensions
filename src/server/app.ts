import cors from 'cors';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { appRouter } from '../trpc/router.js';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
    })
  );

  return app;
};
