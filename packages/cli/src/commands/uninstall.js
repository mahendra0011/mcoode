import { intro, outro, select, isCancel } from '@clack/prompts';
import pc from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { MCODE_GLYPH } from '../ui/logo.js';
import { rm } from 'node:fs/promises';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sizes() {
  return {
    data: joinSize(os.homedir(), '.local', 'share', 'mcode'),
    cache: joinSize(os.homedir(), '.cache', 'mcode'),
    config: joinSize(os.homedir(), '.config', 'mcode'),
    state: joinSize(os.homedir(), '.local', 'state', 'mcode'),
    home: joinSize(os.homedir(), '.mcode')
  };
}

function joinSize(...parts) {
  return path.join(...parts.filter(Boolean));
}

async function dirSizeMB(dir) {
  try {
    let bytes = 0;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      const entries = await fs.readdir(cur, { withFileTypes: true }).catch(() => null);
      if (!entries) continue;
      for (const e of entries) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.isFile()) {
          const st = await fs.stat(full).catch(() => null);
          if (st) bytes += st.size;
        }
      }
    }
    return bytes / (1024 * 1024);
  } catch {
    return 0;
  }
}

export async function uninstallCommand() {
  console.clear();

  // Render MCODE Logo in gray to match the screenshot
  console.log('\n');
  MCODE_GLYPH.forEach((line) => {
    console.log(pc.gray(line));
  });
  console.log('\n');

  intro('Uninstall mcode');

  const dirs = sizes();
  const existing = [];
  for (const [label, dir] of Object.entries(dirs)) {
    const exists = await fs.stat(dir).then(() => true).catch(() => false);
    if (exists) existing.push({ label, dir });
  }

  console.log(pc.white('  Installation method: ') + pc.gray('npm\n'));
  console.log(pc.white('  The following will be removed:\n'));

  if (existing.length === 0) {
    console.log('    ' + pc.gray('(no local mcode data found)'));
  } else {
    for (const { label, dir } of existing) {
      const mb = await dirSizeMB(dir);
      console.log(`    ${pc.gray('\u2713')} ${pc.white(label + ': ')}${pc.gray(dir)} ${pc.dim(`(${mb.toFixed(1)} MB)`)}`);
    }
  }
  console.log('    ' + pc.gray('\u2713') + pc.white(' Package: ' + pc.gray('npm uninstall -g mcode-cli')));

  const shouldUninstall = await select({
    message: 'Are you sure you want to uninstall?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    initialValue: 'no'
  });

  if (isCancel(shouldUninstall) || shouldUninstall === 'no') {
    outro('Uninstall cancelled.');
    process.exit(0);
  }

  // Real cleanup
  console.log();
  const steps = [
    'Removing data directory...',
    'Clearing cache...',
    'Deleting configuration files...',
    'Removing vault and state...'
  ];

  let removed = 0;
  for (const step of steps) {
    console.log(pc.dim('  ' + step));
    await sleep(300);
  }

  for (const { dir } of existing) {
    try {
      await rm(dir, { recursive: true, force: true });
      removed++;
    } catch {
      /* best effort */
    }
  }

  await sleep(300);
  if (removed > 0) {
    console.log(pc.dim(`  Removed ${removed} local mcode director${removed === 1 ? 'y' : 'ies'}.`));
  }

  outro(pc.green('mcode data has been uninstalled. Run "npm uninstall -g mcode-cli" to remove the CLI itself.'));
  process.exit(0);
}
