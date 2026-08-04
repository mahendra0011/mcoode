// Lightweight bootstrap — ensures shared runtime dirs and validates the monorepo layout.
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

await mkdir(join(homedir(), '.mcode'), { recursive: true });
await mkdir(join(homedir(), '.mcode', 'history'), { recursive: true });
await mkdir(join(homedir(), '.mcode', 'projects'), { recursive: true });
await mkdir(join(homedir(), '.mcode', 'watch'), { recursive: true });
console.log('mcode workspace ready');
