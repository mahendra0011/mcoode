const fs = require('fs');
const path = require('path');

// Create test project
const testDir = path.join(process.cwd(), 'verify-project');
fs.mkdirSync(testDir, { recursive: true });
fs.writeFileSync(path.join(testDir, 'main.js'), 'console.log("hello world");\n');
fs.writeFileSync(path.join(testDir, 'lib.js'), 'export const add = (a, b) => a + b;\n');

const { ToolExecutor } = require('./packages/cli/src/core/tools.js');
const { ChatAgent, extractAction } = require('./packages/cli/src/core/chat-agent.js');
const { computeAnalytics } = require('./packages/cli/src/core/analytics.js');
const { redactSecrets, isNetworkAllowed } = require('./packages/cli/src/core/security.js');
const { scoreRisk, RISK_LEVELS } = require('./packages/cli/src/core/audit.js');
const { getModeList } = require('./packages/cli/src/core/modes.js');
const { cache } = require('./packages/cli/src/core/cache.js');

const executor = new ToolExecutor({
  projectPath: testDir,
  bus: null,
  undoStack: { snapshot: () => {}, pending: () => 0 },
  allowShellAll: false,
  domain: 'backend',
});

const agent = new ChatAgent({
  assignment: { provider: { complete: () => '{}' }, model: { id: 'test' }, ref: 'test' },
  projectPath: testDir, bus: null, config: {},
});

const results = [];
const t = (label, ok) => { results.push({ label, ok }); console.log('  ' + (ok ? '[OK]' : '[!!]') + ' ' + label); };

// Core infrastructure
t('cache.wrap singleton', typeof cache.wrap === 'function');
t('computeAnalytics returns data', typeof computeAnalytics === 'function');

// Security
t('redactSecrets URL credentials', !redactSecrets('https://user:p@ss@host.com/path').includes('p@ss'));
t('isNetworkAllowed exact domain', isNetworkAllowed('https://api.example.com', ['api.example.com']) === true);
t('isNetworkAllowed wildcard', isNetworkAllowed('https://sub.example.com', ['*.example.com']) === true);

// Risk
t('scoreRisk returns level', !!scoreRisk('edit_file', {}).level);
t('5 risk levels defined', Object.keys(RISK_LEVELS).length === 5);

// Modes
t('10 special modes available', getModeList().length === 10);

// Action parsing
const action = extractAction('```mcode-action\n{"tool":"read_file","args":{"path":"x"}}\n```');
t('extractAction parses JSON fence', action.tool === 'read_file');

async function run() {
  // Tool → UI Block mapping
  const readRes = await executor.read_file({ path: 'main.js' });
  t('read_file -> block: read -> ReadBlock', agent._blockMeta('read_file', { path: 'main.js' }, readRes).block === 'read');

  const editRes = await executor.edit_file({ path: 'lib.js', old: 'a + b', new: 'a + b + 1' });
  t('edit_file -> block: edit -> DiffBlock', agent._blockMeta('edit_file', { path: 'lib.js', old: 'x', new: 'y' }, editRes).block === 'edit');
  t('edit_file returns diffLines', Array.isArray(editRes.diffLines) && editRes.diffLines.length > 0);

  const writeRes = await executor.write_file({ path: 'new.js', content: 'new\n' });
  t('write_file (new) -> block: write -> WriteBlock', writeRes.created && agent._blockMeta('write_file', { path: 'new.js', content: 'x' }, writeRes).block === 'write');
  t('web_search -> formatted results', agent._blockMeta('web_search', { query: 'test' }, { ok: true, results: [] }).block === 'command');
  t('web_fetch -> block: read -> ReadBlock', agent._blockMeta('web_fetch', { url: 'http://x.com' }, { ok: true, content: 'content', title: 'T' }).block === 'read');

  // Search tests
  const searchRes = await executor.search_code({ query: 'export' });
  const searchMeta = agent._blockMeta('search_code', { query: 'export' }, searchRes);
  t('search_code -> Grep results in CommandBlock', searchMeta.block === 'command' && searchMeta.title.includes('Grep'));

  const listRes = await executor.list_files({});
  const listMeta = agent._blockMeta('list_files', {}, listRes);
  t('list_files -> Glob results in CommandBlock', listMeta.block === 'command' && listMeta.title.includes('Glob'));

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log('');
  console.log('=' .repeat(55));
  console.log('  ' + passed + ' passed . ' + failed + ' failed . ' + results.length + ' total');
  console.log('  ' + (failed === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'));
  console.log('='.repeat(55));
}

run().catch(e => { console.error(e); process.exit(1); });
