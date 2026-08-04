import { Orchestrator } from '../packages/cli/src/core/orchestrator.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = join('D:/projects/mcoode', 'tmp-watch-test');
await mkdir(dir, { recursive: true });

const orch = new Orchestrator({ projectPath: dir });
await orch.init();

const daemon = await orch.startWatch({ scanIntervalMs: 500, debounceMs: 50 });
console.log('daemon status:', daemon.status);

orch.on('WATCH_SCAN', () => console.log('event: scan'));
orch.on('WATCH_FIX', (p) => console.log('event: fix', p.file, p.outcome));
orch.on('WATCH_CHANGE', (p) => console.log('event: change', p.file));

await new Promise((r) => setTimeout(r, 1200));
console.log('scans so far:', daemon.scansRun);

// create a file with an unresolved import -> static check should flag it
await writeFile(join(dir, 'broken.js'), "import x from './does-not-exist.js';\nconsole.log(x);\n", 'utf8');
console.log('wrote broken.js');

await new Promise((r) => setTimeout(r, 20_000));
console.log('summary:', JSON.stringify(daemon.summary(), null, 2));

await daemon.stop();
console.log('after stop:', daemon.status);
process.exit(0);
