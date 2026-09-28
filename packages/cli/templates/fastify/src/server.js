import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({ logger: false });

// ── Security baseline (scaffolded by `mcode init`) ────────────────────────
// Secure-by-default: set CORS_ORIGIN to open CORS up, raise the rate limit only
// when you know why. Never commit real values — keep them in `.env`.
await app.register(helmet);

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
await app.register(cors, {
  // Empty allowlist → no CORS headers → same-origin only.
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
});

await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
});

app.get('/', async () => ({ ok: true, service: 'fastify-starter' }));
app.get('/health', async () => ({ status: 'up' }));

const port = process.env.PORT || 3000;
app.listen({ port }, () => console.log(`listening on :${port}`));

export default app;
