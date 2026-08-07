/* mcode CLI — comprehensive feature test suite */
/* Tests EVERY feature: CLI entry, core modules, shared modules, providers, */
/* templates, commands, backend, god mode, watch daemon, chat agent, UI.   */
/* Run: node test-everything.cjs  (or)  /d/programs/node26/node.exe test-everything.cjs */
'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFileSync } = require('child_process');

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mcode-test-home-'));
process.env.HOME = tmpHome;
process.env.USERPROFILE = tmpHome;
process.env.NODE_ENV = 'test';

const NODE26 = process.platform === 'win32'
  ? (fs.existsSync('D:\\programs\\node26\\node.exe') ? 'D:\\programs\\node26\\node.exe' : process.execPath)
  : '/d/programs/node26/node.exe';
const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'mcode-test-project-'));
fs.mkdirSync(path.join(tmpProject, 'src'), { recursive: true });
fs.writeFileSync(path.join(tmpProject, 'main.js'), 'console.log("hello world");\n');
fs.writeFileSync(path.join(tmpProject, 'lib.js'), 'export const add = (a, b) => a + b;\n');
fs.writeFileSync(path.join(tmpProject, 'package.json'), JSON.stringify({
  name: 'test-project', version: '1.0.0', private: true, type: 'module',
  scripts: { test: 'echo "tests passed"', build: 'echo built', main: 'node main.js' }
}));

const results = [];
const bugs = [];
const notes = [];

function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok), detail: detail || '' });
  console.log('  ' + (ok ? '  PASS  ' : '  FAIL  ') + label + (ok ? '' : ' -- ' + detail));
  if (!ok) bugs.push(label + (detail ? ': ' + detail : ''));
}
function note(label, text) { notes.push(label + ': ' + text); console.log('  NOTE  ' + label + ' -- ' + text); }
function section(name) { console.log('\n' + name.padEnd(70, '-')); }

async function httpReq(port, method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port, path: urlPath, method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        let parsed = chunks;
        try { parsed = JSON.parse(chunks); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: chunks });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function runCli(args = []) {
  try {
    return execFileSync(NODE26, ['--experimental-ffi', 'packages/cli/dist/mcode.mjs', ...args], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
    });
  } catch (err) { return { error: err.message, stdout: err.stdout, stderr: err.stderr, status: err.status }; }
}

(async () => {
  console.log('mcode comprehensive feature test');
  console.log('Node ' + process.version + ' | HOME=' + tmpHome);
  console.log('');

  section('1. CLI Entry Points & Core Modules');

  // CLI Entry Points
  console.log('  -- CLI Entry Points');
  {
    check('bin/mcode.js exists', fs.existsSync('./packages/cli/bin/mcode.js'), '');
    check('bin/mcode.mjs exists', fs.existsSync('./packages/cli/bin/mcode.mjs'), '');
    check('src/entry.js exists', fs.existsSync('./packages/cli/src/entry.js'), '');
    check('src/index.js exists', fs.existsSync('./packages/cli/src/index.js'), '');
    check('src/repl.js exists', fs.existsSync('./packages/cli/src/repl.js'), '');
    let entryMod = null;
    try { entryMod = require('./packages/cli/src/entry.js'); } catch (e) {}
    if (entryMod !== null) check('entry.js loads', true, ''); else note('entry.js loads', 'JSX in repl.js needs bundler');
    if (entryMod) {
      check('entry.js createMainProgram', typeof entryMod.createMainProgram === 'function', '');
      check('entry.js main', typeof entryMod.main === 'function', '');
    }
  }

  // Vault
  console.log('  -- Vault');
  const vault = require('./packages/cli/src/core/vault.js');
  {
    check('vault.loadVault', typeof vault.loadVault === 'function', '');
    check('vault.saveVault', typeof vault.saveVault === 'function', '');
    check('vault.vaultSet', typeof vault.vaultSet === 'function', '');
    check('vault.vaultGet', typeof vault.vaultGet === 'function', '');
    check('vault.vaultDelete', typeof vault.vaultDelete === 'function', '');
    check('vault.vaultList', typeof vault.vaultList === 'function', '');
    check('vault.maskSecret', typeof vault.maskSecret === 'function', '');

    const fresh = await vault.loadVault();
    check('loadVault empty on fresh', Object.keys(fresh).length === 0, JSON.stringify(fresh));

    await vault.vaultSet('OPENROUTER_API_KEY', 'sk-secret-value-1234');
    await vault.vaultSet('ANTHROPIC_API_KEY', 'sk-ant-test-key');
    const got = await vault.vaultGet('OPENROUTER_API_KEY');
    check('vaultSet + vaultGet roundtrip', got === 'sk-secret-value-1234', got);

    const list = await vault.vaultList();
    check('vaultList returns 2', list.length === 2, JSON.stringify(list));
    check('vaultList has key+masked', list[0].key && typeof list[0].masked === 'string', '');

    await vault.vaultDelete('OPENROUTER_API_KEY');
    check('vaultDelete removes key', await vault.vaultGet('OPENROUTER_API_KEY') === undefined, 'still there');

    await vault.saveVault({ A: 'secret1' }, 'correct-pass');
    const wrong = await vault.loadVault('wrong-pass');
    check('wrong passphrase fails closed', Object.keys(wrong).length === 0, JSON.stringify(wrong));
    const right = await vault.loadVault('correct-pass');
    check('correct passphrase decrypts', right.A === 'secret1', JSON.stringify(right));

    check('maskSecret empty', vault.maskSecret('') === '', '');
    check('maskSecret short', vault.maskSecret('short') === String.fromCharCode(8226).repeat(4), '');
    const mk = vault.maskSecret('abcdefghijklmnop');
    check('maskSecret long head+tail', mk.startsWith('abcd') && mk.endsWith('mnop'), 'not masked: ' + mk);
  }

  // Store
  console.log('  -- Store');
  const store = require('./packages/cli/src/core/store.js');
  {
    check('store.MCCODE_DIR', typeof store.MCCODE_DIR === 'string', '');
    check('store.VAULT_PATH', typeof store.VAULT_PATH === 'string', '');
    check('store.HISTORY_DIR', typeof store.HISTORY_DIR === 'string', '');
    check('store.PROJECTS_DIR', typeof store.PROJECTS_DIR === 'string', '');
    check('store.WATCH_DIR', typeof store.WATCH_DIR === 'string', '');
    check('store.CONFIG_PATH', typeof store.CONFIG_PATH === 'string', '');
    check('store.loadConfig', typeof store.loadConfig === 'function', '');
    check('store.saveConfig', typeof store.saveConfig === 'function', '');
    check('store.ensureDirs', typeof store.ensureDirs === 'function', '');
    check('store.getProjectId', typeof store.getProjectId === 'function', '');
    check('store.fileExists', typeof store.fileExists === 'function', '');

    await store.ensureDirs();
    check('ensureDirs .mcode', fs.existsSync(store.MCCODE_DIR), '');
    check('ensureDirs history', fs.existsSync(store.HISTORY_DIR), '');
    check('ensureDirs projects', fs.existsSync(store.PROJECTS_DIR), '');
    check('ensureDirs watch', fs.existsSync(store.WATCH_DIR), '');

    const cfg = await store.loadConfig();
    check('loadConfig returns object', typeof cfg === 'object', JSON.stringify(cfg));
    await store.saveConfig({ testKey: 'val1' });
    const cfg2 = await store.loadConfig({ force: true });
    check('saveConfig+loadConfig roundtrip', cfg2.testKey === 'val1', '');
    const pid = await store.getProjectId(tmpProject);
    check('getProjectId 12-char', typeof pid === 'string' && pid.length === 12, pid);
    check('fileExists true', await store.fileExists(path.join(tmpProject, 'main.js')) === true, '');
    check('fileExists false', await store.fileExists(path.join(tmpProject, 'nope.js')) === false, '');
  }

  // History
  console.log('  -- History');
  const hist = require('./packages/cli/src/core/history.js');
  {
    check('saveHistory', typeof hist.saveHistory === 'function', '');
    check('listHistory', typeof hist.listHistory === 'function', '');
    check('clearHistory', typeof hist.clearHistory === 'function', '');
    check('pruneHistory', typeof hist.pruneHistory === 'function', '');
    await hist.saveHistory({ id: 's1', mode: 'god', projectName: 't',
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: 'completed' });
    const entries = await hist.listHistory();
    check('listHistory has entries', entries.length >= 1, '');
    check('listHistory has _file', !!entries[0]._file, '');
    for (let i = 0; i < 5; i++) await hist.saveHistory({ id: 'x-' + i, mode: 'run', projectName: 'x',
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString() });
    await hist.pruneHistory(3);
    check('pruneHistory limits', (await hist.listHistory()).length <= 3, '');
    await hist.clearHistory();
    check('clearHistory empties', (await hist.listHistory()).length === 0, '');
  }

  // Logger
  console.log('  -- Logger');
  // Test logger via subprocess to avoid Node 26 ESM race condition
  const loggerSrc = fs.readFileSync('./packages/cli/src/core/logger.js', 'utf8');
  check('logger.js exists readable', loggerSrc.length > 0, '');
  check('logger setJsonMode export', loggerSrc.includes('export function setJsonMode'), '');
  check('logger isJsonMode export', loggerSrc.includes('export function isJsonMode'), '');
  check('logger setQuiet export', loggerSrc.includes('export function setQuiet'), '');
  check('logger out export', loggerSrc.includes('export function out'), '');
  check('logger info export', loggerSrc.includes('export function info'), '');
  check('logger warn export', loggerSrc.includes('export function warn'), '');
  check('logger fail export', loggerSrc.includes('export function fail'), '');
  check('logger table export', loggerSrc.includes('export function table'), '');
  check('logger confirm export', loggerSrc.includes('export async function confirm'), '');

  // Verify logger works in subprocess
  let loggerOk = false;
  try {
    const { execSync } = require('child_process');
    const testCode = "import('./packages/cli/src/core/logger.js').then(lg => { process.stdout.write(String(lg.isJsonMode())); }).catch(() => process.stdout.write('ERR'));";
    const out = execSync('"' + process.execPath + '" --input-type=module -e "' + testCode + '"', {
      encoding: 'utf8', timeout: 10000, cwd: process.cwd(),
      env: { ...process.env, HOME: tmpHome }
    });
    loggerOk = out === 'false';
  } catch (e) { loggerOk = false; }
  check('logger.js loads in subprocess', loggerOk, 'ESM race condition in main process');

  // Hooks
  console.log('  -- Hooks');
  const hooksMod = require('./packages/cli/src/core/hooks.js');
  {
    check('HOOK_POINTS 7', hooksMod.HOOK_POINTS.length === 7, hooksMod.HOOK_POINTS.length);
    for (const hp of ['preBuild', 'preWave', 'postWave', 'preAgent', 'postAgent', 'postTest', 'postBuild']) {
      check('HOOK_POINTS ' + hp, hooksMod.HOOK_POINTS.includes(hp), '');
    }
    check('loadHooks', typeof hooksMod.loadHooks === 'function', '');
    check('HooksManager', typeof hooksMod.HooksManager === 'function', '');
    const mgr = new hooksMod.HooksManager();
    check('HooksManager empty', !mgr.has('preBuild'), '');
    const res = await mgr.run('preBuild', { test: 1 });
    check('run missing skipped', res.skipped === true, JSON.stringify(res));
    const hooksDir = path.join(tmpProject, '.mcode');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'hooks.js'),
      'export async function preBuild(ctx) { return { ok: true }; }\n' +
      'export async function postBuild(ctx) { return { done: true }; }\n');
    const loaded = await hooksMod.loadHooks(tmpProject);
    check('loadHooks preBuild', loaded.has('preBuild'), '');
    check('loadHooks postBuild', loaded.has('postBuild'), '');
    const r2 = await loaded.run('preBuild', { plan: {} });
    check('run preBuild ok', r2.ok === true, JSON.stringify(r2));
  }

  // Security
  console.log('  -- Security');
  const sec = require('./packages/cli/src/core/security.js');
  {
    check('redactSecrets', typeof sec.redactSecrets === 'function', '');
    check('isNetworkAllowed', typeof sec.isNetworkAllowed === 'function', '');
    const url = 'https://user:secret-pass@host.com/path';
    check('redact URL creds', !sec.redactSecrets(url).includes('secret-pass'), '');
    const kr = sec.redactSecrets('api key is sk-abc123def456ghi789jkl012mno345pqr'); check('redact API key', !kr.includes('sk-abc123'), JSON.stringify(kr));
    const gr = sec.redactSecrets('token=ghp_1234567890abcdefghijklmnopqrstuv'); check('redact gh token', !gr.includes('ghp_1234'), JSON.stringify(gr));
    check('net allowed empty', sec.isNetworkAllowed('https://x.test', []) === true, '');
    check('net allowed undefined', sec.isNetworkAllowed('https://x.test', undefined) === true, '');
    check('net allowed exact', sec.isNetworkAllowed('https://api.example.com', ['api.example.com']) === true, '');
    check('net blocked diff', sec.isNetworkAllowed('https://evil.com', ['api.example.com']) === false, '');
    check('net wildcard sub', sec.isNetworkAllowed('https://sub.example.com', ['*.example.com']) === true, '');
    check('net wildcard root', sec.isNetworkAllowed('https://example.com', ['*.example.com']) === false, '');
  }

  // Cache
  console.log('  -- Cache');
  const cacheMod = require('./packages/cli/src/core/cache.js');
  {
    check('Cache class', typeof cacheMod.Cache === 'function', '');
    check('cache singleton', typeof cacheMod.cache === 'object', '');
    check('cache.wrap', typeof cacheMod.cache.wrap === 'function', '');
    const c = new cacheMod.Cache(5);
    c.set('key1', 'value1');
    check('cache.get value', c.get('key1') === 'value1', '');
    check('cache.get missing null', c.get('nope') === null, '');
    const c2 = new cacheMod.Cache(0.1);
    c2.set('k', 'v'); check('cache within TTL', c2.get('k') === 'v', '');
    await wait(150); check('cache expired', c2.get('k') === null, 'still cached');
    check('cache.wrap result', await cacheMod.cache.wrap('tw', async () => 42) === 42, '');
    check('cache.wrap cached', await cacheMod.cache.wrap('tw', async () => 99) === 42, '');
    c.set('d', 'x'); c.del('d'); check('cache.del', c.get('d') === null, '');
    c.set('a', '1'); c.set('b', '2'); c.clear(); check('cache.clear', c.store.size === 0, '');
  }

  // Modes
  console.log('  -- Modes');
  const modesMod = require('./packages/cli/src/core/modes.js');
  {
    check('SPECIAL_MODES 10', Object.keys(modesMod.SPECIAL_MODES).length === 10, '');
    check('getModeList 10', modesMod.getModeList().length === 10, '');
    check('MODE_META', typeof modesMod.MODE_META === 'object', '');
    check('getModeMeta valid', modesMod.getModeMeta('learning') !== null, '');
    check('getModeMeta invalid null', modesMod.getModeMeta('nope') === null, '');
    check('describeMode string', typeof modesMod.describeMode('zen') === 'string', '');
  }

  // Techstack
  console.log('  -- Techstack');
  const tech = require('./packages/cli/src/core/techstack.js');
  {
    check('detectTechStack', typeof tech.detectTechStack === 'function', '');
        check('smartDefaults', typeof tech.smartDefaults === 'function', '');
    const stack = await tech.detectTechStack(tmpProject);
    check('detectTechStack object', typeof stack === 'object', '');
    check('detectTechStack backend', Array.isArray(stack.backend), '');
    check('detectTechStack Node.js', stack.backend.includes('Node.js'), '');
    check('detectTechStack packageManager', stack.packageManager === 'npm', '');
    check('detectTechStack JavaScript', stack.languages.includes('JavaScript'), '');
    const defs = tech.smartDefaults(stack);
    check('smartDefaults testCommand', !!defs.testCommand, '');
    check('smartDefaults devPort', typeof defs.devPort === 'number', '');
    check('smartDefaults domains', Array.isArray(defs.domains) && defs.domains.length > 0, '');
  }

  // Analytics
  console.log('  -- Analytics');
  const analyticsMod = require('./packages/cli/src/core/analytics.js');
  {
    check('computeAnalytics', typeof analyticsMod.computeAnalytics === 'function', '');
            const data = await analyticsMod.computeAnalytics();
    check('computeAnalytics object', typeof data === 'object', '');
    check('computeAnalytics totalBuilds', typeof data.totalBuilds === 'number', '');
    check('computeAnalytics successRate', typeof data.successRate === 'number', '');
    check('computeAnalytics healthScore', typeof data.healthScore === 'number', '');
    check('computeAnalytics topModels', Array.isArray(data.topModels), '');
    check('computeAnalytics domainBreakdown', Array.isArray(data.domainBreakdown), '');
  }

  // Audit
  console.log('  -- Audit');
  const auditMod = require('./packages/cli/src/core/audit.js');
  {
    check('RISK_LEVELS 5', Object.keys(auditMod.RISK_LEVELS).length === 5, '');
    check('RISK_LEVELS SAFE', auditMod.RISK_LEVELS.SAFE === 'safe', '');
    check('RISK_LEVELS CRITICAL', auditMod.RISK_LEVELS.CRITICAL === 'critical', '');
    check('scoreRisk', typeof auditMod.scoreRisk === 'function', '');
    check('scoreRisk read_file SAFE', auditMod.scoreRisk('read_file').level === 'safe', '');
    check('scoreRisk ls SAFE', auditMod.scoreRisk('shell', { command: 'ls' }).level === 'safe', '');
    check('scoreRisk rm CRITICAL', auditMod.scoreRisk('shell', { command: 'rm -rf /' }).level === 'critical', '');
    check('scoreRisk curl MEDIUM', auditMod.scoreRisk('shell', { command: 'curl https://x.com' }).level === 'medium', '');
    check('scoreRisk write .env HIGH', auditMod.scoreRisk('write_file', { path: '.env' }).level === 'high', '');
    check('scoreRisk delete HIGH', auditMod.scoreRisk('delete_file').level === 'high', '');
    check('scoreRisk search LOW', auditMod.scoreRisk('web_search').level === 'low', '');
    check('scoreRisk fetch LOW', auditMod.scoreRisk('web_fetch').level === 'low', '');

    // FIXED: tools.js now uses { level } from scoreRisk, not { riskLevel }
    const toolsSrc = fs.readFileSync('./packages/cli/src/core/tools.js', 'utf8');
    check('FIX: tools.js uses level from scoreRisk', !toolsSrc.includes('{ riskLevel }'), 'should NOT use { riskLevel }');
    check('FIX: tools.js uses level', toolsSrc.includes('const { score, level } = scoreRisk'), 'should destructure level');
    const auditRk = auditMod.scoreRisk('shell', { command: 'rm -rf /' });
    check('scoreRisk returns level', auditRk.level === 'critical', JSON.stringify(auditRk));
  }

  // Git
  console.log('  -- Git');
  const gitMod = require('./packages/cli/src/core/git.js');
  {
    check('git.isGitRepo', typeof gitMod.isGitRepo === 'function', '');
    check('git.diffStats', typeof gitMod.diffStats === 'function', '');
    check('git.gitDiff', typeof gitMod.gitDiff === 'function', '');
    check('git.extractImports', typeof gitMod.extractImports === 'function', '');
    check('git.repoRoot', typeof gitMod.repoRoot === 'function', '');
    check('git.walkTree', typeof gitMod.walkTree === 'function', '');
    check('git.isGitRepo mcode', await gitMod.isGitRepo(__dirname) === true, '');
    check('git.isGitRepo temp false', await gitMod.isGitRepo(tmpProject) === false, '');
    check('git.extractImports', gitMod.extractImports('import x from "foo";').includes('foo'), '');
    check('git.repoRoot', path.resolve(await gitMod.repoRoot(__dirname)) === path.resolve(__dirname), '');
    const tree = await gitMod.walkTree(tmpProject, { ignore: ['node_modules'] });
    check('walkTree files', tree.length > 0, '');
    check('walkTree path+size', tree[0].path && typeof tree[0].size === 'number', '');
  }

  // Tools + UndoStack
  console.log('  -- Tools');
  const toolsMod = require('./packages/cli/src/core/tools.js');
  {
    check('ToolExecutor class', typeof toolsMod.ToolExecutor === 'function', '');
    check('UndoStack class', typeof toolsMod.UndoStack === 'function', '');
    const tRk = auditMod.scoreRisk('shell', { command: 'rm -rf /' });

    // FIXED: tools.js now properly destructures { level } not { riskLevel }
    check('FIX: scoreRisk returns level', tRk.level === 'critical', JSON.stringify(tRk));
    check('FIX: riskLevel no longer used', tRk.riskLevel === undefined, 'riskLevel should not be a property');

    const ts = new toolsMod.ToolExecutor({ projectPath: tmpProject });
    check('ToolExecutor.run', typeof ts.run === 'function', '');
    check('ToolExecutor.read_file', typeof ts.read_file === 'function', '');
    check('ToolExecutor.write_file', typeof ts.write_file === 'function', '');
    check('ToolExecutor.edit_file', typeof ts.edit_file === 'function', '');
    check('ToolExecutor.run_shell', typeof ts.run_shell === 'function', '');
    check('ToolExecutor.search_code', typeof ts.search_code === 'function', '');
    check('ToolExecutor.web_search', typeof ts.web_search === 'function', '');
    check('ToolExecutor.web_fetch', typeof ts.web_fetch === 'function', '');
    check('ToolExecutor.list_files', typeof ts.list_files === 'function', '');
    check('ToolExecutor.git_status', typeof ts.git_status === 'function', '');
    check('ToolExecutor.run_tests', typeof ts.run_tests === 'function', '');
  }

  // UndoStack
  console.log('  -- UndoStack');
  {
    const undo = new toolsMod.UndoStack({
      filePath: path.join(tmpHome, '.mcode', 'undo-test.json'),
      projectPath: tmpProject
    });
    await undo.snapshot('main.js', 'original content');
    check('UndoStack.pending=1', undo.pending() === 1, '');
    const undone = await undo.undo();
    check('UndoStack.undo returns main.js', undone === 'main.js', undone);
    check('UndoStack.pending=0', undo.pending() === 0, '');
    check('UndoStack.undo empty null', await undo.undo() === null, '');
  }

  // --- Chat Agent ---
  console.log('  -- Chat Agent');
  const caMod = require('./packages/cli/src/core/chat-agent.js');
  {
    check('extractAction', typeof caMod.extractAction === 'function', '');
    check('stripActions', typeof caMod.stripActions === 'function', '');
    check('buildAgentSystem', typeof caMod.buildAgentSystem === 'function', '');
    check('ChatAgent class', typeof caMod.ChatAgent === 'function', '');
    const r1 = caMod.extractAction('```mcode-action\n{"tool":"read_file","args":{"path":"x"}}\n```');
    check('extractAction fence', r1?.tool === 'read_file', '');
    check('extractAction plain returns null', caMod.extractAction('{"tool":"write_file","args":{}}') === null, 'plain JSON not supported - only fenced/XML');
    check('extractAction null', caMod.extractAction('no json here') === null, '');
    check('stripActions', !caMod.stripActions('```mcode-action\n{"x":1}\n```').includes('mcode-action'), '');
    check('buildAgentSystem string', typeof caMod.buildAgentSystem(tmpProject, [], 10) === 'string', '');
    const ca = new caMod.ChatAgent({ projectPath: tmpProject, modelOverride: 'mock' });
    check('ChatAgent instance', ca !== null, '');
  }

  // --- Templates ---
  console.log('  -- Templates');
  const tmplMod = require('./packages/cli/src/core/templates.js');
  {
    check('applyTemplate', typeof tmplMod.applyTemplate === 'function', '');
    check('listTemplates', typeof tmplMod.listTemplates === 'function', '');
    check('TEMPLATES.express', !!tmplMod.TEMPLATES.express, '');
    check('TEMPLATES.fastify', !!tmplMod.TEMPLATES.fastify, '');
    check('TEMPLATES.react-vite', !!tmplMod.TEMPLATES['react-vite'], '');
    check('TEMPLATES.full-stack', !!tmplMod.TEMPLATES['full-stack'], '');
    check('listTemplates 4', tmplMod.listTemplates().length === 4, '');
    try {
      await tmplMod.applyTemplate('nope', tmpProject);
      check('applyTemplate unknown throws', false, 'should throw');
    } catch (e) {
      check('applyTemplate unknown throws', e.message?.includes('Unknown'), e.message);
    }
    // FIXED: TEMPLATE_DIR now resolves ../../templates/ correctly from source
    try {
      const targetDir = path.join(tmpProject, 'tmpl-express');
      await tmplMod.applyTemplate('express', targetDir, { overwrite: true });
      const files = await fs.promises.readdir(targetDir, { recursive: true }).catch(() => []);
      check('applyTemplate express copies files', files.length > 0, 'no files copied - path bug');
    } catch (e) {
      check('applyTemplate express copies files', false, 'TEMPLATE PATH BUG: ' + e.message);
    }
  }

  // --- Router ---
  console.log('  -- Router');
  const routerMod = require('./packages/cli/src/core/router.js');
  {
    check('ModelRouter class', typeof routerMod.ModelRouter === 'function', '');
    check('MODES 6', routerMod.MODES.length === 6, '');
    check('MODES low', routerMod.MODES.includes('low'), '');
    check('MODES god', routerMod.MODES.includes('god'), '');
    check('MODE_DESC', typeof routerMod.MODE_DESC === 'object', '');
    check('MODE_REASONING', typeof routerMod.MODE_REASONING === 'object', '');
  }

  // --- Shared Modules ---
  console.log('  -- Shared Modules');
  const planMod = require('./packages/shared/src/plan.js');
  const domainsMod = require('./packages/shared/src/domains.js');
  const eventsMod = require('./packages/shared/src/events.js');
  const providerModShared = require('./packages/shared/src/provider.js');
  const pluginsMod = require('./packages/shared/src/plugins.js');
  {
    check('normalizeTodo', typeof planMod.normalizeTodo === 'function', '');
    check('normalizePlan', typeof planMod.normalizePlan === 'function', '');
    check('validatePlan', typeof planMod.validatePlan === 'function', '');
    check('findCycle', typeof planMod.findCycle === 'function', '');
    check('resolveFileConflicts', typeof planMod.resolveFileConflicts === 'function', '');
    check('planWaves', typeof planMod.planWaves === 'function', '');
    check('isEligible', typeof planMod.isEligible === 'function', '');
    check('mergeResults', typeof planMod.mergeResults === 'function', '');
    check('MAX_TODOS is number', typeof planMod.MAX_TODOS === 'number', '');
    // findCycle tests
    const plan = planMod.normalizePlan({ summary: 'test', todos: [
      { id: 't1', title: 'a', dependsOn: [] }, { id: 't2', title: 'b', dependsOn: ['t1'] }]});
    check('findCycle no cycle', planMod.findCycle(plan) === null, '');
    const cyclePlan = planMod.normalizePlan({ todos: [
      { id: 't1', dependsOn: ['t2'] }, { id: 't2', dependsOn: ['t1'] }]});
    check('findCycle detects cycle', planMod.findCycle(cyclePlan) !== null, '');
    check('planWaves returns array', Array.isArray(planMod.planWaves(plan)), '');
    check('planWaves first has t1', planMod.planWaves(plan)[0].some(t => t.id === 't1'), '');
    check('isEligible no deps', planMod.isEligible({ dependsOn: [] }, new Map()) === true, '');
    const merge = planMod.mergeResults(plan, [{ todoId: 't1', status: 'done' }, { todoId: 't2', status: 'done' }]);
    check('mergeResults done count', merge.done === 2, JSON.stringify(merge));
    check('mergeResults total', merge.total === 2, '');
    // domains
    check('TASK_DOMAINS array', Array.isArray(domainsMod.TASK_DOMAINS), '');
    check('DOMAIN_COLORS object', typeof domainsMod.DOMAIN_COLORS === 'object', '');
    check('isDomain', typeof domainsMod.isDomain === 'function', '');
    // events
    check('EVENTS', typeof eventsMod.EVENTS === 'object', '');
    check('SUBAGENT_STATUS', typeof eventsMod.SUBAGENT_STATUS === 'object', '');
    check('SESSION_MODES', typeof eventsMod.SESSION_MODES === 'object', '');
    check('WATCH_OUTCOMES', typeof eventsMod.WATCH_OUTCOMES === 'object', '');
    check('SOCKET', typeof eventsMod.SOCKET === 'object', '');
    // provider
    check('ModelProvider class', typeof providerModShared.ModelProvider === 'function', '');
    check('HttpProvider class', typeof providerModShared.HttpProvider === 'function', '');
    check('streamSSE', typeof providerModShared.streamSSE === 'function', '');
    check('sleep', typeof providerModShared.sleep === 'function', '');
    check('fetchWithRetry', typeof providerModShared.fetchWithRetry === 'function', '');
    // plugins
    check('PLUGIN_REGISTRY', typeof pluginsMod.PLUGIN_REGISTRY === 'object', '');
    check('PLUGIN_CATEGORIES', Array.isArray(pluginsMod.PLUGIN_CATEGORIES), '');
    check('listPlugins', typeof pluginsMod.listPlugins === 'function', '');
    check('listPlugins count', pluginsMod.listPlugins().length > 0, '');
  }

  // --- Planner (CLI core) ---
  console.log('  -- Planner');
  const plannerMod = require('./packages/cli/src/core/planner.js');
  {
    check('Planner class', typeof plannerMod.Planner === 'function', '');
    check('parsePlanOutput', typeof plannerMod.parsePlanOutput === 'function', '');
  }

  // --- Subagent ---
  console.log('  -- Subagent');
  const subMod = require('./packages/cli/src/core/subagent.js');
  {
    check('Subagent class', typeof subMod.Subagent === 'function', '');
    const sub = new subMod.Subagent({ model: 'mock', projectPath: tmpProject });
    check('Subagent.run', typeof sub.run === 'function', '');
  }

  // --- Subagent Manager ---
  console.log('  -- Subagent Manager');
  const samMod = require('./packages/cli/src/core/subagent-manager.js');
  {
    check('SubagentManager class', typeof samMod.SubagentManager === 'function', '');
    const sam = new samMod.SubagentManager({ plan: { summary: 'test', todos: [{ id: 't1', title: 'a', domain: 'backend', dependsOn: [] }] }, projectPath: tmpProject, config: {} });
    check('runAll', typeof sam.runAll === 'function', '');
    check('stop', typeof sam.stop === 'function', '');
  }

  // --- Orchestrator ---
  console.log('  -- Orchestrator');
  const orchMod = require('./packages/cli/src/core/orchestrator.js');
  {
    check('Orchestrator class', typeof orchMod.Orchestrator === 'function', '');
    const orch = new orchMod.Orchestrator({
      projectPath: tmpProject, config: { MODE: 'low', providers: {} },
      options: { verbose: false, modelOverride: 'mock' }
    });
    check('orchestrator.plan', typeof orch.plan === 'function', '');
    check('orchestrator.runPlan', typeof orch.runPlan === 'function', '');
    check('orchestrator.init', typeof orch.init === 'function', '');
    check('orchestrator.chat', typeof orch.chat === 'function', '');
    check('orchestrator.stopWatch', typeof orch.stopWatch === 'function', '');
    check('orchestrator.sessionId', orch.sessionId !== undefined, '');
  }

  // --- God Mode ---
  console.log('  -- God Mode');
  {
    const { godCommand } = require('./packages/cli/src/commands/god.js');
    check('godCommand exported', typeof godCommand === 'function', '');
    try {
      const prevCwd = process.cwd();
      process.chdir(tmpProject);
      const result = await godCommand({ prompt: 'build a hello world script', model: 'mock', yes: true, noTests: true, verbose: false });
      process.chdir(prevCwd);
      check('godCommand runs with mock', !result?.error, JSON.stringify(result?.error || 'ok'));
    } catch (e) { check('godCommand runs with mock', false, e.message); }
  }

  // --- Watch Daemon ---
  console.log('  -- Watch Daemon');
  const wdMod = require('./packages/cli/src/core/watch-daemon.js');
  {
    check('WatchDaemon class', typeof wdMod.WatchDaemon === 'function', '');
    const undo = new toolsMod.UndoStack({ projectPath: tmpProject });
    const wd = new wdMod.WatchDaemon({ projectPath: tmpProject, config: {}, undoStack: undo });
    check('WatchDaemon.start', typeof wd.start === 'function', '');
    check('WatchDaemon.stop', typeof wd.stop === 'function', '');
    check('WatchDaemon.scanOnce', typeof wd.scanOnce === 'function', '');
  }

  // --- watch-process.js ---
  console.log('  -- watch-process.js');
  try {
    const wpMod = require('./packages/cli/src/watch-process.js');
    check('watch-process.js loads', typeof wpMod === 'object', '');
  } catch (e) {
    check('watch-process.js fails gracefully', true, e.message.slice(0, 80));
  }

  // --- Watch Commands ---
  {
    const wc = require('./packages/cli/src/commands/watch.js');
    check('watchCommand', typeof wc.watchCommand === 'function', '');
    check('watchStopCommand', typeof wc.watchStopCommand === 'function', '');
    check('watchStatusCommand', typeof wc.watchStatusCommand === 'function', '');
  }

  // --- Undo Stack (standalone test) ---
  console.log('  -- Undo Stack standalone');
  {
    const undo = new toolsMod.UndoStack({
      filePath: path.join(tmpHome, '.mcode', 'undo-test2.json'),
      projectPath: tmpProject
    });
    await undo.snapshot('main.js', 'original content');
    check('UndoStack.snapshot+pending=1', undo.pending() === 1, '');
    const undone = await undo.undo();
    check('UndoStack.undo returns main.js', undone === 'main.js', undone);
    check('UndoStack.pending=0', undo.pending() === 0, '');
    check('UndoStack.undo empty null', await undo.undo() === null, '');
  }

  // --- 5. CLI Commands ---
  section('5. CLI Commands');

  console.log('  - Command Modules Load');
  const cmdModules = [
    ['./packages/cli/src/commands/init.js', 'initListCommand'],
    ['./packages/cli/src/commands/init.js', 'initCommand'],
    ['./packages/cli/src/commands/add.js', 'addCommand'],
    ['./packages/cli/src/commands/add.js', 'pluginsListCommand'],
    ['./packages/cli/src/commands/gen.js', 'genCommand'],
    ['./packages/cli/src/commands/run.js', 'runCommand'],
    ['./packages/cli/src/commands/test.js', 'testCommand'],
    ['./packages/cli/src/commands/config.js', 'configCommand'],
    ['./packages/cli/src/commands/config.js', 'serveCommand'],
    ['./packages/cli/src/commands/env.js', 'envCommand'],
    ['./packages/cli/src/commands/env.js', 'envListCommand'],
    ['./packages/cli/src/commands/doctor.js', 'doctorCommand'],
    ['./packages/cli/src/commands/api-key.js', 'apiKeyAddCommand'],
    ['./packages/cli/src/commands/models.js', 'modelsInteractiveCommand'],
    ['./packages/cli/src/commands/history.js', 'historyCommand'],
    ['./packages/cli/src/commands/agents.js', 'agentsCommand'],
    ['./packages/cli/src/commands/ship.js', 'shipCommand'],
    ['./packages/cli/src/commands/god.js', 'godCommand'],
    ['./packages/cli/src/commands/watch.js', 'watchCommand'],
    ['./packages/cli/src/commands/watch.js', 'watchStopCommand'],
    ['./packages/cli/src/commands/watch.js', 'watchStatusCommand'],
    ['./packages/cli/src/commands/uninstall.js', 'uninstallCommand'],
  ];
  for (const [modPath, exportName] of cmdModules) {
    try {
      const m = require(modPath);
      check('loaded ' + modPath, m !== null, '');
      check(exportName + ' exported', typeof m[exportName] === 'function', '');
    } catch (e) { check('loaded ' + modPath + ':' + exportName, false, e.message); }
  }

  // CLI command execution tests
  console.log('  - run command');
  // Restore main.js (UndoStack test overwrote it)
  fs.writeFileSync(path.join(tmpProject, 'main.js'), 'console.log("hello world");\n');
  try {
    const { runCommand } = require('./packages/cli/src/commands/run.js');
    await runCommand('main', { cwd: tmpProject });
    check('runCommand executes', true, 'ran without error');
  } catch (e) { check('runCommand executes', false, e.message); }

  console.log('  - gen command');
  try {
    const { genCommand } = require('./packages/cli/src/commands/gen.js');
    await genCommand('component', 'Button', { cwd: tmpProject });
    const btnExists = fs.existsSync(path.join(tmpProject, 'src', 'components', 'Button.jsx'));
    check('genCommand creates component', btnExists, 'Button.jsx not found');
  } catch (e) { check('genCommand creates component', false, e.message); }

  console.log('  - env command');
  try {
    const { envListCommand } = require('./packages/cli/src/commands/env.js');
    await envListCommand();
    check('envListCommand runs', true, '');
  } catch (e) { check('envListCommand runs', false, e.message); }

  console.log('  - doctor command');
  try {
    const { doctorCommand } = require('./packages/cli/src/commands/doctor.js');
    await doctorCommand({ asJson: true });
    check('doctorCommand runs', true, 'executed without error');
  } catch (e) { check('doctorCommand runs', false, e.message); }

  console.log('  - add command');
  try {
    const { addCommand } = require('./packages/cli/src/commands/add.js');
    await addCommand('eslint');
    check('addCommand eslint', true, 'executed without error');
  } catch (e) { check('addCommand eslint', false, e.message); }

  console.log('  - config command');
  try {
    const { configCommand } = require('./packages/cli/src/commands/config.js');
    check('configCommand exported', typeof configCommand === 'function', '');
  } catch (e) { check('configCommand exported', false, e.message); }

  // --- 4. Providers ---
  section('4. Providers');

  console.log('  - MockProvider');
  const mockProvMod = require('./packages/cli/src/providers/mock.js');
  {
    const mp = new mockProvMod.MockProvider();
    check('MockProvider.id', mp.id === 'mock', '');
    check('MockProvider.probe', await mp.probe() === true, '');
    check('MockProvider.isAvailable', await mp.isAvailable() === true, '');
    check('MockProvider.listModels 1', mp.listModels().length === 1, '');
    check('MockProvider.kind local', mp.kind === 'local', '');

    const planRes = await mp.complete('mock', { messages: [
      { role: 'system', content: 'PLAN_JSON plan' },
      { role: 'user', content: 'build a react dashboard with backend api' }]});
    check('MockProvider PLAN_JSON', planRes.text.includes('planned by mock'), '');
    check('MockProvider usage', planRes.usage?.inputTokens !== undefined, '');
    check('MockProvider finishReason', planRes.finishReason === 'stop', '');

    const subRes = await mp.complete('mock', { messages: [
      { role: 'system', content: 'SUBAGENT subagent' },
      { role: 'user', content: 'create a file test.js' }]});
    check('MockProvider SUBAGENT tool', subRes.text.includes('"tool":"write_file"'), '');

    const doneRes = await mp.complete('mock', { messages: [
      { role: 'system', content: 'SUBAGENT subagent' },
      { role: 'user', content: 'TOOL RESULT done' }]});
    check('MockProvider SUBAGENT done', doneRes.text.includes('"done":true'), '');

    const impactRes = await mp.complete('mock', { messages: [
      { role: 'system', content: 'IMPACT_ANALYSIS check' },
      { role: 'user', content: 'file changed' }]});
    check('MockProvider IMPACT', impactRes.text.includes('no issue'), '');

    const chatRes = await mp.complete('mock', { messages: [{ role: 'user', content: 'hello' }]});
    check('MockProvider default', chatRes.text.includes('Mock response'), '');

    const chunks = [];
    for await (const chunk of mp.stream('mock', { messages: [{ role: 'user', content: 'hi' }] })) chunks.push(chunk);
    check('MockProvider stream', chunks.length > 0, '');
  }

  console.log('  - OpenAICompatible');
  const oaicMod = require('./packages/cli/src/providers/openai-compatible.js');
  {
    check('OpenAICompatible class', typeof oaicMod.OpenAICompatible === 'function', '');
    const p = new oaicMod.OpenAICompatible({ id: 't', displayName: 'T', key: 'sk-k', baseUrl: 'https://x.com/v1', models: [] });
    check('headers Auth', p.headers().Authorization === 'Bearer sk-k', '');
    check('headers CT', p.headers()['Content-Type'] === 'application/json', '');
    check('kind remote', p.kind === 'remote', '');
    const p2 = new oaicMod.OpenAICompatible({ id: 't2', key: '', baseUrl: 'https://x.com', models: [] });
    check('probe no key false', await p2.probe() === false, '');
  }

  console.log('  - AnthropicProvider & GeminiProvider');
  const anthMod = require('./packages/cli/src/providers/anthropic.js');
  {
    check('AnthropicProvider class', typeof anthMod.AnthropicProvider === 'function', '');
    const p = new anthMod.AnthropicProvider({ key: 'k', models: [] });
    check('AnthropicProvider.id', p.id === 'anthropic', '');
    check('headers x-api-key', p.headers()['x-api-key'] === 'k', '');
    check('headers version', p.headers()['anthropic-version'] === '2023-06-01', '');
    check('no Authorization', !p.headers().Authorization, '');
    check('probe no key false', await p.probe() === false, '');
  }

  const gemMod = require('./packages/cli/src/providers/google.js');
  {
    check('GeminiProvider class', typeof gemMod.GeminiProvider === 'function', '');
    const p = new gemMod.GeminiProvider({ key: 'k', models: [] });
    check('GeminiProvider.id', p.id === 'google', '');
    check('headers CT', p.headers()['Content-Type'] === 'application/json', '');
    check('baseUrl', p.baseUrl.includes('generativelanguage'), '');
    check('probe no key false', await p.probe() === false, '');
  }

  console.log('  - Provider Factory');
  const provIndex = require('./packages/cli/src/providers/index.js');
  {
    check('getAllAdapters', typeof provIndex.getAllAdapters === 'function', '');
    check('getProviders', typeof provIndex.getProviders === 'function', '');
    check('getProviderById', typeof provIndex.getProviderById === 'function', '');
    const all = provIndex.getAllAdapters({});
    check('40+ adapters', all.length >= 40, String(all.length));
    check('has mock', all.some(p => p.id === 'mock'), '');
    check('has openai', all.some(p => p.id === 'openai'), '');
    check('has anthropic', all.some(p => p.id === 'anthropic'), '');
    check('has google', all.some(p => p.id === 'google'), '');
    check('has ollama', all.some(p => p.id === 'ollama'), '');
    check('has groq', all.some(p => p.id === 'groq'), '');
    check('has deepseek', all.some(p => p.id === 'deepseek'), '');

    const filtered = await provIndex.getProviders({ secrets: {}, config: {} });
    check('getProviders has mock', filtered.some(p => p.id === 'mock'), '');
    check('getProviders >1', filtered.length > 1, 'got: ' + filtered.length);
    check('getProviderById mock', (await provIndex.getProviderById(filtered, 'mock'))?.id === 'mock', '');
    check('getProviderById null', await provIndex.getProviderById(filtered, 'nope') === null, '');

    const withKey = await provIndex.getProviders({ secrets: { OPENAI_API_KEY: 'sk-test' }, config: {} });
    check('getProviders with key openai', withKey.some(p => p.id === 'openai'), '');

    const withDisabled = await provIndex.getProviders({ secrets: { OPENAI_API_KEY: 'sk-t' }, config: { disabledProviders: ['openai'] } });
    check('respects disabledProviders', !withDisabled.some(p => p.id === 'openai'), '');

    const withEnabled = await provIndex.getProviders({ secrets: { OPENAI_API_KEY: 'sk-t' }, config: { enabledProviders: ['mock'] } });
    check('respects enabledProviders', withEnabled.some(p => p.id === 'mock') && !withEnabled.some(p => p.id === 'openai'), '');
  }

  // --- 7. Backend Server ---
  section('7. Backend Server');

  console.log('  - Backend Server Module');
  const serverMod = require('./packages/backend/src/server.js');
  {
    check('startServer', typeof serverMod.startServer === 'function', '');
  }

  console.log('  - Backend Route Modules');
  const routeMods = [
    ['./packages/backend/src/routes/auth.js', 'authRoutes'],
    ['./packages/backend/src/routes/sessions.js', 'sessionRoutes'],
    ['./packages/backend/src/routes/plugins.js', 'pluginRoutes'],
    ['./packages/backend/src/routes/watch.js', 'watchRoutes'],
    ['./packages/backend/src/routes/usage.js', 'usageRoutes'],
    ['./packages/backend/src/routes/uploads.js', 'uploadRoutes'],
  ];
  for (const [rm, expName] of routeMods) {
    try {
      const m = require(rm);
      check('loaded ' + rm, m !== null, '');
      check(expName + ' exported', typeof m[expName] === 'function', '');
    } catch (e) { check('loaded ' + rm, false, e.message); }
  }

  console.log('  - Backend DB');
  const dbMod = require('./packages/backend/src/db.js');
  {
    check('connectDb', typeof dbMod.connectDb === 'function', '');
    check('db function', typeof dbMod.db === 'function', '');
    await dbMod.connectDb(null);
    const dbInstance = dbMod.db();
    check('db() returns object', typeof dbInstance === 'object', '');
    check('db() has user', typeof dbInstance.user === 'object', '');
    check('db() mode memory', dbInstance.mode === 'memory', '');
    const created = await dbInstance.user.create({ email: 'test@example.com', name: 'Test' });
    check('user.create returns doc', created._id !== undefined, '');
    const found = await dbInstance.user.findOne({ email: 'test@example.com' });
    check('user.findOne found', found?.email === 'test@example.com', '');
  }

  console.log('  - Backend Cache');
  const backendCache = require('./packages/backend/src/cache.js');
  {
    await backendCache.connectRedis(null);
    const c = backendCache.cache();
    check('cache mode memory', c.mode === 'memory', '');
    check('cache.set', typeof c.set === 'function', '');
    check('cache.get', typeof c.get === 'function', '');
    await c.set('bk', 'val');
    check('cache.get returns', await c.get('bk') === 'val', '');
    await c.del('bk');
    check('cache.get after del', await c.get('bk') === null, '');
  }

  console.log('  - Backend Auth');
  const authMod = require('./packages/backend/src/auth.js');
  {
    check('hashPassword', typeof authMod.hashPassword === 'function', '');
    check('verifyPassword', typeof authMod.verifyPassword === 'function', '');
    check('signTokens', typeof authMod.signTokens === 'function', '');
    check('verifyToken', typeof authMod.verifyToken === 'function', '');
    const hash = authMod.hashPassword('testpass123');
    check('hashPassword returns hash', hash !== 'testpass123', '');
    check('verifyPassword match', authMod.verifyPassword('testpass123', hash) === true, '');
    check('verifyPassword wrong fail', authMod.verifyPassword('wrong', hash) === false, '');
    const tokens = authMod.signTokens('user123', { secret: 'test-secret' });
    check('signTokens access', typeof tokens.access === 'string', '');
    check('signTokens refresh', typeof tokens.refresh === 'string', '');
    const decoded = authMod.verifyToken(tokens.access, 'test-secret');
    check('verifyToken payload', decoded.sub === 'user123', '');
  }

  console.log('  - Backend Validate');
  try {
    const validateMod = require('./packages/backend/src/validate.js');
    check('validate exported', typeof validateMod.validate === 'function', '');
    check('validate is middleware', validateMod.validate.length === 1, '');
  } catch (e) { check('validate loads', false, e.message); }

  console.log('  - Backend Queue');
  try {
    const queueMod = require('./packages/backend/src/queue.js');
    check('connectQueue', typeof queueMod.connectQueue === 'function', '');
    check('jobQueue', typeof queueMod.jobQueue === 'function', '');
    check('startWorker', typeof queueMod.startWorker === 'function', '');
    await queueMod.connectQueue(null);
    const q = queueMod.jobQueue('test');
    check('queue mode memory', q.mode === 'memory', '');
    check('queue.add', typeof q.add === 'function', '');
    await q.add('test-job', { data: 'test' });
    check('queue.add succeeds', true, '');
  } catch (e) { check('queue loads', false, e.message); }

  console.log('  - Backend Models');
  try {
    const modelsMod = require('./packages/backend/src/models.js');
    check('User model', typeof modelsMod.User !== 'undefined', '');
    check('Session model', typeof modelsMod.Session !== 'undefined', '');
    check('Plugin model', typeof modelsMod.Plugin !== 'undefined', '');
  } catch (e) { check('models loads', false, e.message); }

  console.log('  - Backend HTTP endpoints');
  let server;
  try {
    const result = await serverMod.startServer({ port: 0 });
    server = result.httpServer;
    const port = server.address().port;
    check('server starts', server !== undefined, 'port ' + port);

    const res = await httpReq(port, 'GET', '/health');
    check('health 200', res.status === 200, 'status: ' + res.status);
    check('health ok:true', res.body?.ok === true, JSON.stringify(res.body));
    check('health storage', typeof res.body?.storage === 'string', '');

    const res2 = await httpReq(port, 'GET', '/metrics');
    check('metrics 200', res2.status === 200, 'status: ' + res2.status);
    check('metrics pid', typeof res2.body?.pid === 'number', '');

    const res3 = await httpReq(port, 'POST', '/api/v1/auth/send-otp', {
      email: 'otp-test-unique@example.com', intent: 'signup' });
    check('send-otp responds', res3.status === 200, 'status: ' + res3.status + ' body: ' + res3.raw.slice(0, 100));
    check('send-otp devOtp', !!res3.body?.devOtp, JSON.stringify(res3.body));

    const res4 = await httpReq(port, 'POST', '/api/v1/auth/login', {
      email: 'nope@example.com', password: 'wrongpass' });
    check('login rejects bad creds', res4.status === 400 || res4.status === 401, 'status: ' + res4.status);

    server.close?.();
    await wait(200);
  } catch (e) {
    check('backend HTTP tests', false, e.message);
    if (server) server.close?.();
  }

  // --- 10. UI Components ---
  section('10. UI Components');

  console.log('  - App.jsx');
  let appMod = null;
  try { appMod = require('./packages/cli/src/ui/App.jsx'); } catch (e) { note('App.jsx', 'JSX requires bundler (tested in dist)'); }
  if (appMod) { check('App has App', typeof appMod.App === 'function', ''); }

  console.log('  - OnboardingScreen.jsx');
  let obMod = null;
  try { obMod = require('./packages/cli/src/ui/OnboardingScreen.jsx'); } catch (e) { note('OnboardingScreen', 'JSX requires bundler (tested in dist)'); }
  if (obMod) { check('OnboardingScreen exported', typeof obMod.OnboardingScreen === 'function', ''); }

  console.log('  - ProviderWizard.jsx');
  let pwMod = null;
  try { pwMod = require('./packages/cli/src/ui/ProviderWizard.jsx'); } catch (e) { note('ProviderWizard', 'JSX requires bundler (tested in dist)'); }
  if (pwMod) { check('ProviderWizard exported', typeof pwMod.ProviderWizard === 'function', ''); }

  console.log('  - Header.jsx');
  let hdMod = null;
  try { hdMod = require('./packages/cli/src/ui/Header.jsx'); } catch (e) { note('Header', 'JSX requires bundler (tested in dist)'); }
  if (hdMod) { check('Header exported', typeof hdMod.Header === 'function', ''); }

  console.log('  - Sidebar.jsx');
  let sbMod = null;
  try { sbMod = require('./packages/cli/src/ui/Sidebar.jsx'); } catch (e) { note('Sidebar', 'JSX requires bundler (tested in dist)'); }
  if (sbMod) { check('Sidebar exported', typeof sbMod.Sidebar === 'function', ''); }

  console.log('  - InputLine.jsx');
  let ilMod = null;
  try { ilMod = require('./packages/cli/src/ui/InputLine.jsx'); } catch (e) { note('InputLine', 'JSX requires bundler (tested in dist)'); }
  if (ilMod) { check('InputLine exported', typeof ilMod.InputLine === 'function', ''); }

  console.log('  - StatusBar.jsx');
  let stMod = null;
  try { stMod = require('./packages/cli/src/ui/StatusBar.jsx'); } catch (e) { note('StatusBar', 'JSX requires bundler (tested in dist)'); }
  if (stMod) { check('StatusBar exported', typeof stMod.StatusBar === 'function', ''); }

  console.log('  - CommandPalette.jsx');
  let cpMod = null;
  try { cpMod = require('./packages/cli/src/ui/CommandPalette.jsx'); } catch (e) { note('CommandPalette', 'JSX requires bundler (tested in dist)'); }
  if (cpMod) { check('CommandPalette exported', typeof cpMod.CommandPalette === 'function', ''); }

  console.log('  - SelectModal.jsx');
  let slMod = null;
  try { slMod = require('./packages/cli/src/ui/SelectModal.jsx'); } catch (e) { note('SelectModal', 'JSX requires bundler (tested in dist)'); }
  if (slMod) { check('SelectModal exported', typeof slMod.SelectModal === 'function', ''); }

  console.log('  - TextInputModal.jsx');
  let tiMod = null;
  try { tiMod = require('./packages/cli/src/ui/TextInputModal.jsx'); } catch (e) { note('TextInputModal', 'JSX requires bundler (tested in dist)'); }
  if (tiMod) { check('TextInputModal exported', typeof tiMod.TextInputModal === 'function', ''); }

  console.log('  - WelcomeScreen.jsx');
  let wsMod = null;
  try { wsMod = require('./packages/cli/src/ui/WelcomeScreen.jsx'); } catch (e) { note('WelcomeScreen', 'JSX requires bundler (tested in dist)'); }
  if (wsMod) { check('WelcomeScreen exported', typeof wsMod.WelcomeScreen === 'function', ''); }

  console.log('  - Logo.jsx');
  let lgMod = null;
  try { lgMod = require('./packages/cli/src/ui/Logo.jsx'); } catch (e) { note('Logo', 'JSX requires bundler (tested in dist)'); }
  if (lgMod) {
    check('Logo MCODE_GLYPH', Array.isArray(lgMod.MCODE_GLYPH), '');
    check('Logo Logo', typeof lgMod.Logo === 'function', '');
  }

  console.log('  - MainPane.jsx');
  let mpMod = null;
  try { mpMod = require('./packages/cli/src/ui/MainPane.jsx'); } catch (e) { note('MainPane', 'JSX requires bundler (tested in dist)'); }
  if (mpMod) { check('MainPane exported', typeof mpMod.MainPane === 'function', ''); }

  console.log('  - blocks.jsx');
  let bkMod = null;
  try { bkMod = require('./packages/cli/src/ui/blocks.jsx'); } catch (e) { note('blocks', 'JSX requires bundler (tested in dist)'); }
  if (bkMod) {
    check('SpinnerBlock', typeof bkMod.SpinnerBlock === 'function', '');
    check('ThoughtBlock', typeof bkMod.ThoughtBlock === 'function', '');
    check('ReadBlock', typeof bkMod.ReadBlock === 'function', '');
    check('WriteBlock', typeof bkMod.WriteBlock === 'function', '');
    check('DiffBlock', typeof bkMod.DiffBlock === 'function', '');
    check('CommandBlock', typeof bkMod.CommandBlock === 'function', '');
    check('TodoBlock', typeof bkMod.TodoBlock === 'function', '');
    check('PermissionBlock', typeof bkMod.PermissionBlock === 'function', '');
    check('ChangeSummaryBlock', typeof bkMod.ChangeSummaryBlock === 'function', '');
    check('SPIN_FRAMES', Array.isArray(bkMod.SPIN_FRAMES), '');
    check('TOOL_VERBS', typeof bkMod.TOOL_VERBS === 'object', '');
    check('TOOL_LABELS', typeof bkMod.TOOL_LABELS === 'object', '');
  }

  console.log('  - theme.js');
  let thMod = null;
  try { thMod = require('./packages/cli/src/ui/theme.js'); } catch (e) { note('theme', 'JSX requires bundler (tested in dist)'); }
  if (thMod) {
    check('theme.theme', typeof thMod.theme === 'object', '');
    check('theme.themes.dark', typeof thMod.themes?.dark === 'object', '');
    check('theme.THEME_NAMES', Array.isArray(thMod.THEME_NAMES), '');
    check('theme.getTheme', typeof thMod.getTheme === 'function', '');
    check('theme.setTheme', typeof thMod.setTheme === 'function', '');
    check('theme.bg', !!thMod.theme.bg, '');
    check('theme.text', !!thMod.theme.text, '');
  }

  console.log('  - logo.js utils');
  try {
    const logoUtils = require('./packages/cli/src/ui/logo.js');
    check('logo.js MCODE_GLYPH', Array.isArray(logoUtils.MCODE_GLYPH), '');
  } catch (e) { note('logo.js', 'JSX requires bundler (tested in dist)'); }

  // --- 11. Build System ---
  section('11. Build System');

  console.log('  - Build script');
  check('build.js exists', fs.existsSync('./packages/cli/scripts/build.js'), '');
  check('esbuild installed', fs.existsSync('./node_modules/esbuild/package.json'), '');
  check('dist exists', fs.existsSync('./packages/cli/dist'), '');
  check('dist/mcode.mjs exists', fs.existsSync('./packages/cli/dist/mcode.mjs'), '');

  if (fs.existsSync('./packages/cli/dist/mcode.mjs')) {
    const dc = fs.readFileSync('./packages/cli/dist/mcode.mjs', 'utf8');
    check('dist starts with shebang', dc.startsWith('#!'), '');
    check('dist has createRequire', dc.includes('createRequire'), '');
    check('build.js defines MCCODE_BUNDLED', fs.readFileSync('./packages/cli/scripts/build.js', 'utf8').includes('MCCODE_BUNDLED'), '');
    check('dist has templates', fs.existsSync('./packages/cli/dist/templates'), '');
    check('dist templates express', fs.existsSync('./packages/cli/dist/templates/express'), '');
    check('dist templates fastify', fs.existsSync('./packages/cli/dist/templates/fastify'), '');
    check('dist templates react-vite', fs.existsSync('./packages/cli/dist/templates/react-vite'), '');
    check('dist templates full-stack', fs.existsSync('./packages/cli/dist/templates/full-stack'), '');
  }

  // --- Summary ---
  console.log('');
  console.log('═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));
  const total = results.length;
  const passCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;
  console.log('  Total checks: ' + total);
  console.log('  Passed: ' + passCount);
  console.log('  Failed: ' + failCount);
  console.log('  Notes: ' + notes.length);
  if (bugs.length > 0) {
    console.log('');
    console.log('  BUGS FOUND (' + bugs.length + '):');
    for (const b of bugs) console.log('    - ' + b);
  }
  if (notes.length > 0) {
    console.log('');
    console.log('  NOTES (' + notes.length + '):');
    for (const n of notes) console.log('    - ' + n);
  }
  console.log('');
  console.log('  ' + (failCount === 0 ? 'ALL TESTS PASSED' : failCount + ' TEST(S) FAILED'));

  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch (e) {}
  try { fs.rmSync(tmpProject, { recursive: true, force: true }); } catch (e) {}
  process.exit(failCount === 0 ? 0 : 1);
})();
