import { run } from './index.js';

run(process.argv).catch((err) => {
  process.stderr.write(`mcode: ${err?.stack || err}\n`);
  process.exit(1);
});
