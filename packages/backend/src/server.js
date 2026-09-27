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
import { pinoHttp } from 'pino-http';
import { connectDb, db } from './db.js';
import { connectRedis, cache, getRedisClient } from './cache.js';
import { connectQueue, jobQueue, startWorker } from './queue.js';
import { attachSockets } from './sockets.js';
import { configureMailer, sendMail } from './mailer.js';
import { authMiddleware } from './auth.js';
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
import { pairRoutes, handlePairSuggest } from './routes/pair.js';
import { promptRoutes } from './routes/prompt.js';
import { cleanRoutes } from './routes/clean.js';
import { validateEnv } from './config/envValidator.js';
import { isPistonAvailable } from './piston-client.js';
import { detectAvailableLanguages } from './host-runner.js';
import { exec } from 'node:child_process';

export async function startServer({ port = 3100, env = process.env } = {}) {
  // ─── Environment validation (fail fast) ─────────────────────────────────────
  const envResult = validateEnv(env);
  if (!envResult.ok && env.NODE_ENV === 'production') {
    console.error('[server] ❌ Environment validation failed — aborting startup.');
    process.exit(1);
  }

  // ─── JWT secret ─────────────────────────────────────────────────────────────
  let secret = env.JWT_SECRET;
  if (!secret) {
    if (env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production — refusing to start without a secret');
    }
    const { randomBytes } = await import('node:crypto');
    secret = randomBytes(32).toString('hex');
    process.env.JWT_SECRET = secret;
    console.warn('[auth] JWT_SECRET not configured: generated a dynamic random instance secret for development');
  }

  // ─── MongoDB Atlas (REQUIRED — no fallback) ─────────────────────────────────
  const mongoUri = env.MONGODB_URI || null;
  // connectDb() calls process.exit(1) if connection fails — no memory fallback
  const storage = await connectDb(mongoUri);

  // ─── Redis (Optional — caching/job queuing) ─────────────────────────────────
  // connectRedis() owns the single client; reuse it (no second connection).
  const redisUri = env.REDIS_URI || null;
  const cacheResult = await connectRedis(redisUri);
  const redisClient = cacheResult.client || getRedisClient();

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
    // Socket.IO / Engine.IO handles all /live requests at the httpServer level.
    // Skip the rest of the Express chain for those URLs (must call next).
    if (req.url === '/live' || req.url.startsWith('/live/') || req.url.startsWith('/live?')) {
      return next('router');
    }
    next();
  });
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));
  const allowedOrigins = String(env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5174').split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Electron, curl, server-to-server) or explicit allowlist + local dev origins
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin) && env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS blocked: origin not allowed'));
    },
    credentials: true,
  }));
  // BKD-008: uploads (project ZIPs) may legitimately take minutes — extend the
  // socket timeout for this route only. Every other route keeps the 30s default.
  app.use('/api/v1/uploads', (req, res, next) => {
    req.setTimeout(10 * 60 * 1000);
    if (typeof res.setTimeout === 'function') res.setTimeout(10 * 60 * 1000);
    next();
  });
  // AUTH-014: cookie-CSRF guard for state-changing requests. Browser form
  // POSTs always carry Origin/Referer — a cross-origin value with ambient
  // cookies is a CSRF attempt → 403. Bearer clients, curl and native apps
  // (no Origin) are unaffected; OAuth GET callbacks are untouched.
  app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    if (req.headers.authorization?.startsWith('Bearer ')) return next();
    if (!req.headers.cookie) return next();
    const origin = req.headers.origin || req.headers.referer || '';
    if (!origin) return next();
    try {
      const host = req.headers.host || '';
      const oHost = new URL(origin, `http://${host}`).host;
      if (oHost && oHost !== host) {
        return res.status(403).json({ error: { code: 'CSRF_BLOCKED', message: 'cross-origin request refused' } });
      }
    } catch {
      return res.status(403).json({ error: { code: 'CSRF_BLOCKED', message: 'unparseable origin' } });
    }
    next();
  });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '50mb', type: ['text/*', 'application/octet-stream'] }));
  app.use(pinoHttp({ logger }));
  app.use('/api/v1', rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  }));
  // ARCH-002: auth endpoints get a stricter per-IP budget (credential
  // stuffing / OTP brute force) on top of the global limiter.
  app.use('/api/v1/auth', rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Health endpoint — reports true Atlas connection status + execution capabilities
  app.get('/health', async (_req, res) => {
    const pistonReady = await isPistonAvailable();
    const dockerAvailable = await new Promise((resolve) => {
      exec('docker info', { timeout: 3000 }, (err) => resolve(!err));
    });
    res.json({
      ok: storage.connected,
      storage: storage.mode,
      cache: cache().mode,
      queue: jobQueue().mode,
      uptime: process.uptime(),
      execution: {
        hostRunner: true,
        piston: pistonReady,
        docker: dockerAvailable,
      }
    });
  });

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
  app.use('/api/v1/extensions', extensionRoutes({ secret }));
  app.use('/api/v1/languages', languageRoutes());
  app.use('/api/v1/android', androidRoutes({ secret }));
  app.use('/api/v1/pair', pairRoutes({ secret }));
  app.post('/api/v1/pair-suggest', authMiddleware({ secret }), (req, res) => handlePairSuggest(req, res, { secret }));
  app.use('/api/v1/prompt', promptRoutes({ secret }));
  app.use('/api/v1/clean', cleanRoutes({ secret }));

  app.get('/api/v1/version', async (_req, res) => {
    let pkgVersion = '0.1.0';
    try {
      const { readFile } = await import('node:fs/promises');
      const rawPkg = await readFile(path.resolve(__dirname, '../package.json'), 'utf8')
        .catch(() => readFile(path.resolve(__dirname, '../../../package.json'), 'utf8'));
      if (rawPkg) {
        pkgVersion = JSON.parse(rawPkg).version || '0.1.0';
      }
    } catch {}
    res.json({
      version: pkgVersion,
      name: 'mcode',
      latestTag: `v${pkgVersion}`,
      platform: process.platform,
      arch: process.arch,
    });
  });

  // ─── Error handler ──────────────────────────────────────────────────────────
  // Consistent { error: { code, message } } shape
  // DB hiccups during auth return 503 (not 401) so clients retry instead of logging out.
  app.use((err, _req, res, _next) => {
    logger.error(err);
    const status = err.status || 500;
    const isProd = env.NODE_ENV === 'production';
    const message = (isProd && status === 500) ? 'An unexpected error occurred' : (err.message || 'internal error');
    res.status(status).json({
      error: { code: err.code || 'INTERNAL', message }
    });
  });

  // BKD-002: intentional ordering — the bare httpServer is created first so
  // Socket.IO/Engine.IO owns `/live` upgrades directly; Express is attached
  // afterwards via `httpServer.on('request', app)` and explicitly skips /live
  // URLs (see the middleware above). Do NOT switch to createServer(app)
  // without also reworking normalizeLiveUrl + the Engine.IO handshake path.
  // Optional TLS: set TLS_CERT + TLS_KEY (PEM paths) to serve HTTPS directly
  // (otherwise terminate TLS at the ingress — see docs/DEPLOYMENT.md).
  let httpServer;
  if (env.TLS_CERT && env.TLS_KEY) {
    const { readFileSync } = await import('node:fs');
    const { createServer: createSecureServer } = await import('node:https');
    httpServer = createSecureServer({
      cert: readFileSync(env.TLS_CERT, 'utf8'),
      key: readFileSync(env.TLS_KEY, 'utf8'),
    });
    logger.info('TLS enabled — serving HTTPS');
  } else {
    httpServer = createServer();
  }
  // Default timeout 30s for general routes (prevents slow loris attacks)
  httpServer.requestTimeout = 30 * 1000;
  httpServer.headersTimeout = 35 * 1000;
  httpServer.keepAliveTimeout = 30 * 1000;

  const io = attachSockets(httpServer, { secret, env });
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
  app.get('/metrics', async (_req, res) => {
    let activeConnections = 0;
    try {
      activeConnections = await new Promise((resolve) => httpServer.getConnections((_, count) => resolve(count || 0)));
    } catch {
      activeConnections = 0;
    }
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cacheSize: cache() && cache().mode === 'redis' ? 'delegated' : 'pass-through',
      activeConnections,
      pid: process.pid,
      nodeVersion: process.version,
    });
  });

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

  let retries = 0;
  const maxRetries = 5;

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (retries < maxRetries) {
        retries++;
        logger.warn(`Port ${port} in use (EADDRINUSE). Retrying connection in 1s (${retries}/${maxRetries})...`);
        try {
          httpServer.close();
        } catch {
          // ignore if already closed
        }
        setTimeout(() => {
          httpServer.listen(port);
        }, 1000);
      } else {
        logger.error(`Port ${port} is still in use after ${maxRetries} retries. Please stop the process running on port ${port} or free up the port.`);
        process.exit(1);
      }
    } else {
      logger.error({ err }, 'HTTP server error');
    }
  });

  // ARCH-005: graceful shutdown — stop accepting, drain sockets, then exit.
  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down');
    try { io?.close?.(); } catch { /* already closed */ }
    httpServer.close(() => {
      logger.info('HTTP server closed — exiting');
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10_000).unref?.();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  httpServer.listen(port, () => {
    logger.info(
      { port, storage: storage.mode, cache: cache().mode, queue: queue.mode },
      'mcode backend listening'
    );

    // ── Non-blocking: auto-detect execution capabilities ──────────────
    (async () => {
      try {
        // 1. Check what languages the host can run natively
        const { available, unavailable } = await detectAvailableLanguages();
        logger.info(
          { hostLanguages: available.length, unavailableLanguages: unavailable.length },
          `[exec] Host runner ready — ${available.length} languages available (${available.slice(0, 8).join(', ')}${available.length > 8 ? '...' : ''})`
        );

        // 2. Check if Docker is available
        const dockerAvailable = await new Promise((resolve) => {
          exec('docker info', { timeout: 5000 }, (err) => resolve(!err));
        });

        if (dockerAvailable) {
          logger.info('[exec] Docker daemon detected ✓');

          // 3. Auto-start Piston container if not already running (safe sandboxing, no --privileged)
          const pistonReady = await isPistonAvailable();
          if (!pistonReady) {
            logger.info('[exec] Piston not running — attempting auto-start...');
            exec(
              'docker start piston 2>/dev/null || docker run -d --name piston --restart unless-stopped -p 2000:2000 ghcr.io/engineer-man/piston',
              { timeout: 60_000 },
              (err) => {
                if (err) {
                  logger.warn(`[exec] Piston auto-start failed: ${err.message}. Single-file execution will use host runner.`);
                } else {
                  logger.info('[exec] Piston container started ✓ — sandboxed execution available');
                }
              }
            );
          } else {
            logger.info('[exec] Piston sandbox already running ✓');
          }
        } else {
          logger.info('[exec] Docker not available — using host-based execution (no sandbox). Install Docker Desktop for sandboxed execution.');
        }
      } catch (err) {
        logger.warn(`[exec] Execution auto-detection failed: ${err.message}`);
      }
    })();
  });

  return { app, httpServer, io, queue, db: () => db() };
}
