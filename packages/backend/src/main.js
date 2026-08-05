import { startServer } from './server.js';

const port = Number(process.env.PORT) || 3100;
startServer({ port }).catch((err) => {
  console.error('[mcode backend] failed to start:', err.message);
  process.exit(1);
});