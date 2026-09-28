import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();

// ── Security baseline (scaffolded by `mcode init`) ────────────────────────
// Secure-by-default. Remember: anything in a VITE_* var is PUBLIC in the
// browser bundle — secrets belong in server env only, never in VITE_* vars.
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
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

app.get('/api/hello', (_req, res) => res.json({ message: 'hello from the API' }));
app.get('/health', (_req, res) => res.json({ status: 'up' }));

const dist = join(dirname(fileURLToPath(import.meta.url)), 'dist');
if (await import('node:fs').then(({ existsSync }) => existsSync(dist))) {
  app.use(express.static(dist));
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`api listening on :${port}`));

export default app;
