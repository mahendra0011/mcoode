import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { execa } from 'execa';
import chalk from 'chalk';
import { multiselect, isCancel } from '@clack/prompts';
import { ok, fail, info } from '../core/logger.js';
import { isGitRepo, changedFiles } from '../core/git.js';
import { loadConfig } from '../core/store.js';
import { loadVault } from '../core/vault.js';
import { TEST_TYPES, runTestMode, createTestBus } from '../core/test-mode/index.js';

/** Legacy behavior: run the project's own `npm test` script. */
async function runNpmTest({ changed, cwd }) {
  const pkgPath = join(cwd, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  } catch {
    fail('no package.json found in this directory');
    process.exit(1);
  }
  const script = pkg.scripts?.test;
  if (!script) {
    fail('no "test" script defined');
    process.exit(1);
  }
  if (changed) {
    if (!(await isGitRepo(cwd))) {
      fail('--changed requires a git repository');
      process.exit(1);
    }
    const files = await changedFiles(cwd);
    if (files.length === 0) {
      ok('no changed files to test');
      return;
    }
    info(`testing ${files.length} changed file(s)`);
  }
  ok(`running → ${script}`);
  try {
    await execa('npm', ['test'], { cwd, stdio: 'inherit' });
  } catch (err) {
    process.exit(err.exitCode ?? 1);
  }
}

/** Pretty-render the feature inventory (Step 2). */
function renderInventory(inventory) {
  console.log(chalk.bold(`\nFEATURE INVENTORY — ${inventory.length} features found\n`));
  for (const f of inventory.slice(0, 40)) {
    const layer = chalk.cyan(f.layer.padEnd(8));
    const route = chalk.white(f.route || '—');
    const auth = f.requiresAuth ? chalk.yellow('needs auth: yes') : chalk.dim('needs auth: no');
    console.log(`  ${layer}  ${route.padEnd(38)}  ${auth}`);
  }
  if (inventory.length > 40) console.log(chalk.dim(`  ... ${inventory.length - 40} more`));
  console.log('');
}

/** Pretty-render the autonomous self-heal loop live (Step 3b). */
function renderAutonomousLive(bus) {
  bus.on('TEST_FEATURE_START', ({ feature, route }) => {
    console.log(chalk.bold.magenta(`\nTesting feature: ${feature}${route ? chalk.dim(` (${route})`) : ''}`));
  });
  bus.on('TEST_STEP', ({ index, total, desc, status, retried }) => {
    const mark = status === 'ok' ? chalk.green('ok') : chalk.red('FAILED');
    const retryTag = retried ? chalk.green(' (retry succeeded)') : '';
    console.log(`  ${chalk.dim(`${index}.`)} ${desc} - ${mark}${retryTag}`);
  });
  bus.on('TEST_STEP_FAILED', ({ index, error }) => {
    console.log(`    ${chalk.red(`✗ step ${index} failed — ${error}`)}`);
  });
  bus.on('TEST_DIAGNOSIS', ({ attempt, issue, likelyFiles }) => {
    console.log(chalk.dim(`\n  diagnosing... (attempt ${attempt})`));
    console.log(`  ${chalk.yellow('→ issue:')} ${issue}`);
    if (likelyFiles?.length) console.log(chalk.dim(`    likely files: ${likelyFiles.join(', ')}`));
    console.log(chalk.dim('  spawning fix-subagent...'));
  });
  bus.on('TEST_FEATURE_DONE', ({ feature, status, selfHealed }) => {
    const badge = status === 'needs-review'
      ? chalk.yellow('needs manual review')
      : status === 'passed-after-fix'
        ? chalk.green(`passed (${selfHealed} issue${selfHealed === 1 ? '' : 's'} found and fixed automatically)`)
        : chalk.green('passed');
    console.log(`\n${chalk.bold(feature)} — ${badge}`);
  });
}

/**
 * Test Mode (doc 48) — asks what kind of testing, scans the codebase into a
 * feature inventory, runs the selected suites (including the autonomous
 * self-healing browser agent), and writes a markdown report.
 */
async function runTestModeFlow({ types = null, target = null, allowRemote = false, cwd }) {
  let selected = types;
  if (!selected || selected.length === 0) {
    // Step 1 — ask what kind of testing (always first, before anything scans)
    try {
      const result = await multiselect({
        message: 'What kind of testing do you want? (space to select, enter to confirm — select multiple)',
        options: TEST_TYPES.map((t) => ({
          value: t.id,
          label: t.recommended ? `${t.label} — recommended` : t.label,
          hint: t.desc
        })),
        required: true,
        initialValues: ['autonomous']
      });
      if (isCancel(result)) {
        console.log(chalk.yellow('\nTest mode cancelled.'));
        return;
      }
      selected = result;
    } catch {
      // Non-interactive fallback — autonomous is the mode's core capability
      selected = ['autonomous'];
    }
  }

  const bus = createTestBus();
  renderAutonomousLive(bus);
  bus.on('TEST_INVENTORY', ({ features }) => renderInventory(features));
  bus.on('MESSAGE', (msg) => {
    if (msg.kind === 'warn') console.log(chalk.yellow(`  ! ${msg.text}`));
    else console.log(chalk.dim(`  ${msg.text}`));
  });
  bus.on('TEST_TRADITIONAL', (t) => {
    const label = { unit: 'Unit', integration: 'Integration', load: 'Load', a11y: 'Accessibility' }[t.kind] || t.kind;
    if (t.status === 'done' || t.status === 'failed') {
      console.log(`\n${chalk.bold(label)}: ${t.passed}/${t.total} passed — ${chalk.dim(t.detail || '')}`);
    }
  });

  console.log(chalk.bold('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.bold('║  mcode TEST MODE — self-healing agent    ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════╝\n'));

  // Router (same construction as the orchestrator uses)
  let router = null;
  try {
    const secrets = await loadVault();
    const config = await loadConfig();
    const { getProviders } = await import('../providers/index.js');
    const { ModelRouter } = await import('../core/router.js');
    const { CostLedger } = await import('@mcode/shared');
    const providers = await getProviders({ secrets });
    router = new ModelRouter({ secrets, config, ledger: new CostLedger(), providers });
    await router.warmUp?.();
  } catch (err) {
    console.log(chalk.yellow(`! could not initialize model routing (${err.message}) — heuristic mode only`));
  }

  const config = await loadConfig().catch(() => ({}));
  let summary;
  try {
    summary = await runTestMode(selected, {
      projectPath: cwd,
      router,
      config,
      bus,
      targetUrl: target,
      allowRemote
    });
  } catch (err) {
    fail(err.message);
    process.exit(1);
  }

  // Final rendered report (same shape as the doc)
  if (summary.autonomous.length > 0 || summary.autonomousSkipped) {
    console.log(chalk.bold(`\nAUTONOMOUS TESTING — ${summary.inventoryCount} features`));
    console.log(`  ${chalk.green(`${summary.autonomous.filter((r) => r.status !== 'needs-review').length} passed`)}` +
      (summary.selfHealedCount > 0 ? chalk.green(` · ${summary.selfHealedCount} auto-fixed`) : '') +
      (summary.needsReview > 0 ? chalk.yellow(` · ${summary.needsReview} need${summary.needsReview === 1 ? 's' : ''} manual review`) : ''));
    if (summary.autonomousSkipped) console.log(chalk.dim(`  (skipped: ${summary.autonomousSkipped})`));
  }
  console.log(chalk.green(`\n✓ test report saved to .mcode/reports/${summary.reportFileName}`));
  console.log(chalk.dim(`  target: ${summary.targetUrl} · elapsed: ${summary.elapsedSecs}s\n`));
}

export async function testCommand({ changed = false, npm = false, types = null, target = null, allowRemote = false, cwd = process.cwd() } = {}) {
  // Legacy behavior preserved: --changed / --npm run the project's own test script
  if (changed || npm) {
    return runNpmTest({ changed, cwd });
  }
  // Test Mode (doc 48)
  await runTestModeFlow({ types, target, allowRemote, cwd });
}
