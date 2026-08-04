import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
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
