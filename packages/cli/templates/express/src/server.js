import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// ── Security baseline (scaffolded by `mcode init`) ────────────────────────
// Secure-by-default: tighten CORS with CORS_ORIGIN, raise limits only when you
// know why. Never commit real values — keep them in `.env` (git-ignored).
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  // Empty allowlist → no CORS headers → browsers can only call this API
  // same-origin. Flip to a list (or a function) deliberately.
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
}));

app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json());

app.get('/', (_req, res) => res.json({ ok: true, service: 'express-starter' }));
app.get('/health', (_req, res) => res.json({ status: 'up' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

export default app;
