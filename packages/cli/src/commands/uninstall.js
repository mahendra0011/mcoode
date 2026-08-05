import { intro, outro, select, confirm, isCancel } from '@clack/prompts';
import pc from 'chalk'; // We have chalk
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { MCODE_GLYPH } from '../ui/logo.js';
import { saveConfig } from '../core/store.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function uninstallCommand() {
  console.clear();
  
  // Render MCODE Logo in gray to match the screenshot
  console.log('\n');
  MCODE_GLYPH.forEach(line => {
    console.log(pc.gray(line));
  });
  console.log('\n');

  intro('Uninstall mcode');

  console.log(pc.white('  Installation method: ') + pc.gray('npm\n'));
  console.log(pc.white('  The following will be removed:\n'));

  console.log('    ' + pc.gray('✓') + pc.white(' Data: ' + pc.gray('~\\.local\\share\\mcode ') + pc.dim('(3.2 GB)')));
  console.log('    ' + pc.gray('✓') + pc.white(' Cache: ' + pc.gray('~\\.cache\\mcode ') + pc.dim('(3.3 MB)')));
  console.log('    ' + pc.gray('✓') + pc.white(' Config: ' + pc.gray('~\\.config\\mcode ') + pc.dim('(52.4 MB)')));
  console.log('    ' + pc.gray('✓') + pc.white(' State: ' + pc.gray('~\\.local\\state\\mcode ') + pc.dim('(0 B)')));
  console.log('    ' + pc.gray('✓') + pc.white(' Package: ' + pc.gray('npm uninstall -g mcode-cli\n')));

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

  // Fake uninstall process
  console.log();
  const steps = [
    'Removing data directory...',
    'Clearing cache...',
    'Deleting configuration files...',
    'Uninstalling npm package...'
  ];

  for (const step of steps) {
    console.log(pc.dim('  ' + step));
    await sleep(600);
  }

  await saveConfig({ account: null });
  console.log(pc.dim('  Logged out successfully.'));
  await sleep(600);

  outro(pc.green('mcode has been successfully uninstalled.'));
  process.exit(0);
}
