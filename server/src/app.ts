import cors from 'cors';
import express, { Application } from 'express';

import { productsRouter } from './routes/products';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/products', productsRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
