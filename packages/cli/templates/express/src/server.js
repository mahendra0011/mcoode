import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.json({ ok: true, service: 'express-starter' }));
app.get('/health', (_req, res) => res.json({ status: 'up' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

export default app;
