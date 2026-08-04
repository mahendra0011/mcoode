import Fastify from 'fastify';

const app = Fastify({ logger: false });

app.get('/', async () => ({ ok: true, service: 'fastify-starter' }));
app.get('/health', async () => ({ status: 'up' }));

const port = process.env.PORT || 3000;
app.listen({ port }, () => console.log(`listening on :${port}`));

export default app;
