import { MarketingLayout } from './MarketingLayout.jsx';
import { CodeBlock } from '../components/ui/code-block.jsx';

const COMMANDS = [
  {
    name: 'init',
    usage: 'mcode init [name] --template <express|fastify|react-vite|full-stack>',
    desc: 'Scaffold a project from a bundled template. Writes files, links dependencies (cached), records the session in history.',
    flags: ['-t, --template', '-y, --yes']
  },
  {
    name: 'run',
    usage: 'mcode run <script>',
    desc: 'Run any package.json script with streamed output.',
    flags: []
  },
  {
    name: 'test',
    usage: 'mcode test [--changed]',
    desc: 'Run the test suite. --changed limits to git-changed files.',
    flags: ['--changed']
  },
  {
    name: 'env',
    usage: 'mcode env add|remove|list KEY [value] [--plain] [--file <path>]',
    desc: 'Manage secrets. Default stores AES-256-GCM encrypted in ~/.mcode/vault.json.enc; --plain writes .env for CI.',
    flags: ['--plain', '--file']
  },
  {
    name: 'add',
    usage: 'mcode add <plugin>',
    desc: 'Install a plugin/preset from the registry (eslint, prettier, test-watcher, deploy-*).',
    flags: []
  },
  {
    name: 'ship',
    usage: 'mcode ship [--env prod]',
    desc: 'Build, verify (tests), tag (git), and run the deploy hook in one pass.',
    flags: ['--env']
  },
  {
    name: 'doctor',
    usage: 'mcode doctor',
    desc: 'Diagnose the environment: Node version, config, vault, each provider key, provider connectivity.',
    flags: []
  },
  {
    name: 'gen',
    usage: 'mcode gen <route|component|controller> <name>',
    desc: 'Code generators for common scaffolding.',
    flags: []
  },
  {
    name: 'god',
    usage: 'mcode god "<prompt>" [--yes] [--concurrency n] [--watch-after]',
    desc: 'God Mode. Plan \u2192 todo DAG \u2192 parallel subagents (one per todo) \u2192 integration pass \u2192 summary. Best-fit model per domain.',
    flags: ['-y, --yes', '-c, --concurrency', '--deploy-target', '--no-tests', '--watch-after', '--stack']
  },
  {
    name: 'watch',
    usage: 'mcode watch [--background] [--scan-interval <ms>]',
    desc: 'Always-on scan + bugfix daemon. Runs until mcode watch-stop / Ctrl+C. Detaches with --background.',
    flags: ['--background', '--scan-interval']
  },
  {
    name: 'model',
    usage: 'mcode model list | show | set <task-type> <provider:model>',
    desc: 'Inspect the model catalog or pin models per task type.',
    flags: []
  },
  {
    name: 'history',
    usage: 'mcode history [--clear]',
    desc: 'Session history files with mode, project, status, and started-at.',
    flags: ['--clear']
  },
  {
    name: 'serve',
    usage: 'mcode serve [-p <port>]',
    desc: 'Start the local Express + Socket.IO backend for the web dashboard. Mongo/Redis optional (memory fallback).',
    flags: ['-p, --port']
  },
  {
    name: 'config',
    usage: 'mcode config [--open]',
    desc: 'Show or open ~/.mcode/config.json.',
    flags: ['--open']
  }
];

const SLASH = [
  ['/init', 'Scaffold a project without leaving the session'],
  ['/god <prompt>', 'Trigger God Mode from the REPL'],
  ['/bugfix', 'Toggle the background bugfix loop (never stops itself)'],
  ['/watch', 'Alias for /bugfix'],
  ['/agents', 'Show live subagent panel'],
  ['/model', 'Switch active model / view routing table'],
  ['/plan', 'Show the current todo plan'],
  ['/diff', 'Show pending changes before they are applied'],
  ['/undo', 'Revert the last applied change'],
  ['/clear', 'Clear the terminal screen'],
  ['/help', 'List all commands'],
  ['/exit', 'Quit the session (daemon keeps running if started)']
];

export function Commands() {
  return (
    <MarketingLayout
      label="Commands"
      title="Command reference"
      sub="Every mcode command, flag, and slash command."
    >
      <div className="space-y-6">
        {COMMANDS.map((c) => (
          <div key={c.name} className="terminal-card p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <code className="font-mono text-lg font-bold text-mcode-green">{c.name}</code>
              <code className="font-mono text-sm text-gray-500">{c.usage}</code>
            </div>
            <p className="mt-2 text-sm text-gray-400">{c.desc}</p>
            {c.flags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.flags.map((f) => (
                  <span key={f} className="rounded-sm border border-mcode-border px-1.5 py-0.5 font-mono text-[11px] text-gray-500">{f}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        <h2 className="pt-6 font-mono text-lg font-semibold text-white">Slash commands (inside the REPL)</h2>
        <div className="terminal-card overflow-hidden">
          <div className="border-b border-mcode-border px-4 py-2 font-mono text-xs text-gray-500">
            mcode — interactive session
          </div>
          {SLASH.map(([cmd, desc], i) => (
            <div key={cmd} className={`flex gap-4 px-4 py-2.5 text-sm ${i % 2 ? 'bg-mcode-panel/40' : ''}`}>
              <code className="w-32 shrink-0 font-mono text-mcode-green">{cmd}</code>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>

        <h2 className="pt-6 font-mono text-lg font-semibold text-white">Global flags</h2>
        <div className="terminal-card p-5">
          <CodeBlock code={`--json                machine-readable output (CI/scripts)\n--non-interactive     no TUI, plain stdout, no prompts\n--model <name>        override auto-routing\n--verbose             full tool-call trace logging\n--isolate             run subagents in child processes\n--concurrency <n>     max parallel subagents (default 5)`} />
        </div>
      </div>
    </MarketingLayout>
  );
}
