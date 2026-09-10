import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from packages/backend/.env first, then root .env fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
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
import { keyRoutes } from './routes/keys.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { settingsRoutes } from './routes/settings.js';
import { githubAuthRoutes, githubApiRoutes } from './routes/github.js';
import { searchRoutes } from './routes/search.js';
import { extensionRoutes } from './routes/extensions.js';
import { languageRoutes } from './routes/languages.js';
import { androidRoutes } from './routes/android.js';
import { validateEnv } from './config/envValidator.js';

export async function startServer({ port = 3100, env = process.env } = {}) {
  // ─── Environment validation (fail fast) ─────────────────────────────────────
  const envResult = validateEnv(env);
  if (!envResult.ok && env.NODE_ENV === 'production') {
    console.error('[server] ❌ Environment validation failed — aborting startup.');
    process.exit(1);
  }

  // ─── JWT secret ─────────────────────────────────────────────────────────────
  const secret = env.JWT_SECRET || 'mcode-dev-secret-change-me';
  if (secret === 'mcode-dev-secret-change-me' && env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production — refusing to start with the dev fallback secret');
  }
  if (secret === 'mcode-dev-secret-change-me') {
    console.warn('[auth] using the DEV JWT secret — set JWT_SECRET in production');
  }

  // ─── MongoDB Atlas (REQUIRED — no fallback) ─────────────────────────────────
  const mongoUri = env.MONGODB_URI || null;
  // connectDb() calls process.exit(1) if connection fails — no memory fallback
  const storage = await connectDb(mongoUri);

  // ─── Redis (Optional — caching/job queuing) ─────────────────────────────────
  const redisUri = env.REDIS_URI || null;
  const cacheResult = await connectRedis(redisUri);
  let redisClient = null;
  if (cacheResult.mode === 'redis') {
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

  // ─── Job Queue (Optional — background jobs) ─────────────────────────────────
  await connectQueue(redisClient);

  configureMailer({
    apiKey: env.BREVO_API_KEY,
    from: env.MAIL_FROM,
    name: env.MAIL_FROM_NAME
  });

  // ─── Express ────────────────────────────────────────────────────────────────
  const logger = pino({ level: env.LOG_LEVEL || 'info' });
  const app = express();
  app.disable('x-powered-by');
  app.use((req, _res, next) => {
    // Socket.IO / Engine.IO handles all /live requests at the httpServer level
    if (req.url === '/live' || req.url.startsWith('/live/') || req.url.startsWith('/live?')) {
      return;
    }
    next();
  });
  app.use(helmet());
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'], credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(pinoHttp({ logger }));
  app.use('/api/v1', rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Health endpoint — reports true Atlas connection status
  app.get('/health', (_req, res) => res.json({
    ok: storage.connected,
    storage: storage.mode,
    cache: cache().mode,
    queue: jobQueue().mode,
    uptime: process.uptime()
  }));

  // ─── Routes (all auth-protected routes use authMiddleware) ───────────────────
  app.use('/api/v1/auth', authRoutes({ secret }));
  app.use('/api/v1/sessions', sessionRoutes({ secret }));
  app.use('/api/v1/plugins', pluginRoutes({ secret }));
  app.use('/api/v1/watch', watchRoutes({ secret }));
  app.use('/api/v1/usage', usageRoutes({ secret }));
  app.use('/api/v1/uploads', uploadRoutes({ secret }));
  app.use('/api/v1/keys', keyRoutes({ secret }));
  app.use('/api/v1/workspaces', workspaceRoutes({ secret }));
  app.use('/api/v1/settings', settingsRoutes({ secret }));
  app.use('/api/v1/auth/github', githubAuthRoutes({ secret }));
  app.use('/api/v1/github', githubApiRoutes({ secret }));
  app.use('/api/v1/search', searchRoutes({ secret }));
  app.use('/api/v1/extensions', extensionRoutes());
  app.use('/api/v1/languages', languageRoutes());
  app.use('/api/v1/android', androidRoutes());

  // ─── Error handler ──────────────────────────────────────────────────────────
  // Consistent { error: { code, message } } shape
  // DB hiccups during auth return 503 (not 401) so clients retry instead of logging out.
  app.use((err, _req, res, _next) => {
    logger.error(err);
    const status = err.status || 500;
    res.status(status).json({
      error: { code: err.code || 'INTERNAL', message: err.message || 'internal error' }
    });
  });

  const httpServer = createServer();
  const io = attachSockets(httpServer, { secret });
  app.set('io', io);
  httpServer.on('request', app);

  // Normalize Socket.IO /live requests so trailing slash is always present for Engine.IO.
  // Must be prepended AFTER attachSockets so it runs before Engine.IO's internal request handler.
  const normalizeLiveUrl = (req) => {
    if (req.url === '/live') {
      req.url = '/live/';
    } else if (req.url.startsWith('/live?')) {
      req.url = '/live/' + req.url.slice(5);
    }
  };
  httpServer.prependListener('request', normalizeLiveUrl);
  httpServer.prependListener('upgrade', normalizeLiveUrl);

  // /metrics — reports runtime performance stats
  app.get('/metrics', (_req, res) => res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cacheSize: cache() && cache().mode === 'redis' ? 'delegated' : 'pass-through',
    activeConnections: httpServer._connections != null ? httpServer._connections : null,
    pid: process.pid,
    nodeVersion: process.version,
  }));

  // demo worker: web-triggered god builds log their progress
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
    logger.info(
      { port, storage: storage.mode, cache: cache().mode, queue: queue.mode },
      'mcode backend listening'
    );
  });

  return { app, httpServer, io, queue, db: () => db() };
}
