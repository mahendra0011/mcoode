process.on('unhandledRejection', (reason) => {
  console.error('[mcode backend] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[mcode backend] Uncaught Exception:', err.message || err);
});

import { startServer } from './server.js';

const port = Number(process.env.PORT) || 3100;
startServer({ port }).catch((err) => {
  console.error('[mcode backend] failed to start:', err.message);
  process.exit(1);
});