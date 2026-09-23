import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { createSessionMiddleware } from './config/session';
import passport from './config/passport';
import { emailQueue } from './queues/email.queue';
import apiRoutes from './routes/api.routes';

export function createApp(): Application {
  const app: Application = express();

  // Security headers & CORS
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Session & Passport authentication
  app.use(createSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  // Logging
  app.use(requestLogger);

  // Bull Board Queue Monitoring Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });
  app.use('/admin/queues', serverAdapter.getRouter());

  // Mount API routes at /api
  app.use('/api', apiRoutes);

  // Fallback 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp();
