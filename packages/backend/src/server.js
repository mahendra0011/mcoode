import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { connectDb, db } from './db.js';
import { connectRedis, cache } from './cache.js';
import { connectQueue, jobQueue, startWorker } from './queue.js';
import { attachSockets } from './sockets.js';
import { configureMailer, sendMail } from './mailer.js';
import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/sessions.js';
import { pluginRoutes } from './routes/plugins.js';
import { watchRoutes } from './routes/watch.js';
import { usageRoutes } from './routes/usage.js';
import { uploadRoutes } from './routes/uploads.js';

export async function startServer({ port = 3100, env = process.env } = {}) {
  const secret = env.JWT_SECRET || 'mcode-dev-secret-change-me';
  const mongoUri = env.MONGODB_URI || null;
  const redisUri = env.REDIS_URI || null;

  const storage = await connectDb(mongoUri);
  await connectRedis(redisUri);

  let redisClient = null;
  if (redisUri) {
    try {
      const { Redis } = await import('ioredis');
      const candidate = new Redis(redisUri, {
        lazyConnect: true,
        retryStrategy: (times) => (times > 2 ? null : 200)
      });
      candidate.on('error', () => {});
      await candidate.connect().catch(() => {});
      if (candidate.status === 'ready') redisClient = candidate;
    } catch {
      redisClient = null;
    }
  }
  await connectQueue(redisClient);
  configureMailer({
    apiKey: env.BREVO_API_KEY,
    from: env.MAIL_FROM,
    name: env.MAIL_FROM_NAME
  });

  const logger = pino({ level: env.LOG_LEVEL || 'info' });
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(pinoHttp({ logger }));
  app.use('/api/v1', rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  }));

  app.get('/health', (_req, res) => res.json({
    ok: true,
    storage: storage.mode,
    cache: cache().mode,
    uptime: process.uptime()
  }));

  app.use('/api/v1/auth', authRoutes({ secret }));
  app.use('/api/v1/sessions', sessionRoutes({ secret }));
  app.use('/api/v1/plugins', pluginRoutes({ secret }));
  app.use('/api/v1/watch', watchRoutes({ secret }));
  app.use('/api/v1/usage', usageRoutes({ secret }));
  app.use('/api/v1/uploads', uploadRoutes({ secret }));

  // error handler — consistent { error: { code, message } } shape
  app.use((err, _req, res, _next) => {
    logger.error(err);
    res.status(err.status || 500).json({
      error: { code: err.code || 'INTERNAL', message: err.message || 'internal error' }
    });
  });

  const httpServer = createServer(app);
  const io = attachSockets(httpServer, { secret });
  app.set('io', io);

  // demo worker: dashboard-triggered god builds log their progress
  const queue = jobQueue('subagents');
  await startWorker('subagents', async (job) => {
    logger.info({ job }, 'subagent job started');
    if (job.data?.notifyEmail) {
      await sendMail({
        to: job.data.notifyEmail,
        subject: `mcode: ${job.data.summary || 'build'} finished`,
        text: `Job ${job.id} completed. Summary: ${job.data.summary || ''}`
      });
    }
  });

  httpServer.listen(port, () => {
    logger.info({ port, storage: storage.mode, cache: cache().mode }, 'mcode backend listening');
  });

  return { app, httpServer, io, queue, db: () => db() };
}
