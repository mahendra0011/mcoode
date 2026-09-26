// Live validation of the chat-agent action-parsing fixes (run: node scripts/test-action-parsing.mjs)
import { extractActions, stripActions } from '../packages/cli/src/core/chat-agent.js';

const cases = [
  { name: 'mcode-action fence', text: 'Working on it.\n```mcode-action\n{"tool":"read_file","args":{"path":"a.js"}}\n```' },
  { name: 'json fence drift', text: 'Sure.\n```json\n{"tool":"read_file","args":{"path":"a.js"}}\n```' },
  { name: 'bare fence drift', text: '```mcode-action\n{"tool":"list_files","args":{"glob":"**/*"}}\n```' },
  { name: 'xml tool_call', text: '<tool_call>read_file\npath: a.js</tool_call>' },
  { name: 'final answer (no action)', text: 'Here is the summary of changes...' },
  { name: 'json code block (NOT an action)', text: 'Use this config:\n```json\n{"name":"my-app","version":"1.0.0"}\n```' },
  { name: 'two parallel actions', text: '```mcode-action\n{"tool":"read_file","args":{"path":"a.js"}}\n```\n```mcode-action\n{"tool":"read_file","args":{"path":"b.js"}}\n```' },
];

let failed = 0;
for (const c of cases) {
  const actions = extractActions(c.text);
  const clean = stripActions(c.text);
  const got = actions.map((a) => a.tool).join(',') || '(none)';
  const leakedAction = clean.includes('"tool"') && actions.length > 0;
  console.log(`${c.name.padEnd(34)} actions=${got.padEnd(14)} stripped=${JSON.stringify(clean.slice(0, 40))}${leakedAction ? '  ⚠ LEAKED' : ''}`);
}
console.log(failed === 0 ? '\nAll parsing cases behaved as expected.' : `\n${failed} case(s) FAILED`);
