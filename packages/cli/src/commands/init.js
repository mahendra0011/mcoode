import { resolve, join } from 'node:path';
import { stat, writeFile } from 'node:fs/promises';
import { execa } from 'execa';
import { applyTemplate, listTemplates, previewTemplate } from '../core/templates.js';
import { ok, info, warn, out, fail } from '../core/logger.js';
import { saveHistory } from '../core/history.js';
import { getProjectId } from '../core/store.js';

export const initCommand = async ({ name = null, template = 'express', dir = process.cwd(), yes = false } = {}) => {
  const targetDir = name ? resolve(process.cwd(), name) : dir;
  const isNewDir = !(await stat(targetDir).catch(() => null));
  if (!isNewDir && !yes && !(await isEmptyDir(targetDir))) {
    throw Object.assign(
      new Error(`directory is not empty: ${targetDir} (re-run with -y to proceed)`),
      { code: 'INIT_DIR_NOT_EMPTY' }
    );
  }
  await import('node:fs/promises').then(({ mkdir }) => mkdir(targetDir, { recursive: true }));

  const startedAt = new Date().toISOString();
  info(`workspace resolved \u2192 ${targetDir}`);
  const t0 = Date.now();
  const { meta, files } = await applyTemplate(template, targetDir);
  ok(`template ${meta.name} fetched in ${Date.now() - t0}ms`);
  info(`${files.length} files written`);

  if (!(await stat(join(targetDir, 'package.json')).catch(() => null))) {
    const pkg = {
      name: (name || 'mcode-project').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      private: true,
      type: 'module'
    };
    await writeFile(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  if (meta.deps?.length || meta.devDeps?.length) {
    info('linking dependencies (npm, cached)...');
    const args = ['install'];
    if (meta.deps?.length) args.push(...meta.deps);
    if (meta.devDeps?.length) args.push('-D', ...meta.devDeps);
    try {
      await execa('npm', args, { cwd: targetDir, stdio: 'ignore' });
      ok('dependencies linked');
    } catch (err) {
      warn(`dependency install failed: ${err.shortMessage || err.message}`);
    }
  }

  const projectId = await getProjectId(targetDir);
  const entry = {
    id: projectId,
    mode: 'init',
    projectName: name || 'unnamed',
    projectPath: targetDir,
    startedAt,
    completedAt: new Date().toISOString(),
    template: meta.name,
    status: 'completed'
  };
  await saveHistory(entry);
  ok(`project ready \u2014 ${targetDir}`);
  out(`\n  next:\n    cd ${name || '.'}\n    npm run dev\n`);
  return entry;
};

async function isEmptyDir(dir) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dir).catch(() => []);
  return entries.length === 0;
}

export const initListCommand = async () => {
  out('Available templates:');
  for (const t of listTemplates()) {
    out(`  ${t.name.padEnd(14)} ${t.description}`);
  }
};

export const initPreviewCommand = async ({ template }) => {
  const { meta, files } = await previewTemplate(template);
  out(`Template ${meta.name} — ${meta.description}`);
  out(`deps: ${(meta.deps || []).join(', ') || 'none'} | devDeps: ${(meta.devDeps || []).join(', ') || 'none'}`);
  out(`files (${files.length}, nothing written):`);
  for (const f of files) out(`  ${f}`);
};
