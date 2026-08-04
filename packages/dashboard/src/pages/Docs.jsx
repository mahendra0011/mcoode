import { MarketingLayout } from './MarketingLayout.jsx';
import { CodeBlock } from '../components/ui/code-block.jsx';
import { Accordion } from '../components/ui/accordion.jsx';

const DOCS = [
  {
    section: 'Getting started',
    items: [
      { q: 'Install', a: 'npm i -g mcode-cli — then run `mcode` for the interactive session, `mcode doctor` to verify your environment.' },
      { q: 'Add provider keys', a: 'mcode env add OPENROUTER_API_KEY sk-... stores keys in an encrypted local vault. Without any keys, mcode runs on the mock provider so the full pipeline is demo-able.' },
      { q: 'Your first god-mode build', a: 'mcode god "build a full-stack todo app with auth" — mcode plans the work, splits it into todos, dispatches one subagent per todo in parallel, then runs an integration pass.' }
    ]
  },
  {
    section: 'Model routing',
    items: [
      { q: 'How does routing work?', a: 'Each task type (frontend/backend/db/devops/test/docs/bugfix/planning) has a preference list. The router picks the first available, non-rate-limited model from it, else falls back to the highest-scoring available model.' },
      { q: 'Pin a model to a task', a: 'mcode model set frontend openrouter:qwen/qwen-2.5-coder-32b-instruct — overrides are stored in ~/.mcode/config.json.' },
      { q: 'Local models', a: 'Set OLLAMA_HOST or LMSTUDIO_HOST (defaults localhost:11434/1234). mcode probes them at startup and routes to them when no remote keys exist.' }
    ]
  },
  {
    section: 'Watch daemon',
    items: [
      { q: 'Start / stop', a: 'mcode watch starts the foreground daemon; mcode watch --background detaches it; mcode watch-stop ends it. Inside a session, /bugfix toggles the same engine.' },
      { q: 'What does it scan?', a: 'Two mechanisms: chokidar event-driven detection (debounced 400ms) plus a full-repo scan every 30s (configurable via watch.scanIntervalMs).' },
      { q: 'When does it call a model?', a: 'Only when lint or static checks fail. Clean files cost zero tokens. maxFixesPerHour (default 60) caps runaway loops.' }
    ]
  },
  {
    section: 'Plugin API',
    items: [
      { q: 'Anatomy of a plugin', a: 'A plugin exports definePlugin({ name, version, commands, hooks }). Commands run with a context that includes run(), log(), and project paths.' },
      { q: 'Registry', a: 'mcode add plugin:eslint installs a preset. Publish your own via the dashboard (/plugins) — authenticated, ownership-checked.' }
    ]
  }
];

export function Docs() {
  return (
    <MarketingLayout
      label="Docs"
      title="Documentation"
      sub="Command reference, model routing, the watch daemon, and the plugin API."
    >
      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <nav className="space-y-2 font-mono text-sm">
          {DOCS.map((d) => (
            <a key={d.section} href={`#${d.section.toLowerCase().replace(/\s+/g, '-')}`} className="block text-gray-500 hover:text-mcode-green">
              {d.section}
            </a>
          ))}
          <Link to="/commands" />
        </nav>
        <div className="space-y-12">
          {DOCS.map((d) => (
            <section key={d.section} id={d.section.toLowerCase().replace(/\s+/g, '-')}>
              <h2 className="font-mono text-lg font-semibold text-white">{d.section}</h2>
              <div className="mt-4">
                <Accordion items={d.items} />
              </div>
            </section>
          ))}
          <section>
            <h2 className="font-mono text-lg font-semibold text-white">Install</h2>
            <div className="mt-4">
              <CodeBlock code={`npm i -g mcode-cli\nmcode doctor\nmcode env add OPENROUTER_API_KEY sk-...`} />
            </div>
          </section>
        </div>
      </div>
    </MarketingLayout>
  );
}
