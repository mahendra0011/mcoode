import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Copy, Check, Github, TerminalSquare } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button.jsx';
import { CommandMarquee } from '../components/marketing/CommandMarquee.jsx';
import { TerminalWindow } from '../components/marketing/TerminalWindow.jsx';
import { CodeBlock } from '../components/ui/code-block.jsx';
import { Accordion } from '../components/ui/accordion.jsx';

const TERMINAL_LINES = [
  { text: '> mcode init my-api --template fastify' },
  { text: '\u2713 workspace resolved \u2192 /dev/my-api', color: 'text-mcode-green' },
  { text: '\u2713 template fastify@2.x fetched in 240ms', color: 'text-mcode-green' },
  { text: '\u2713 dependencies linked (npm, cached)', color: 'text-mcode-green' },
  { text: '> mcode god "build a full-stack todo app with auth"' },
  { text: '\u2713 plan generated \u2014 12 todos across 4 domains', color: 'text-mcode-green' },
  { text: '\u2713 12 subagents dispatched (frontend: 4, backend: 5, db: 2, devops: 1)', color: 'text-mcode-green' },
  { text: '\u2713 frontend done (gpt-4o) \u00b7 backend done (claude-3.5) \u00b7 db done (deepseek)', color: 'text-mcode-green' },
  { text: '\u2713 integration build passed \u00b7 tests passed (38/38)', color: 'text-mcode-green' },
  { text: '\u2192 shipped \u2192 https://preview.mcode.app', color: 'text-mcode-blue' }
];

const FEATURES = [
  { icon: '⚡', title: 'Sub-100ms startup', desc: 'esbuild-bundled single file. No transpile step, no cold boots. \u201c118ms cold-boot\u201d on the landing page is real.' },
  { icon: '🗂', title: 'Templates that scale', desc: 'express, fastify, react-vite, full-stack \u2014 one command from empty folder to running app.' },
  { icon: '🧩', title: 'Plugin architecture', desc: 'A definePlugin registry, installable in an afternoon. Presets for lint, deploy, secrets.' },
  { icon: '🌿', title: 'Git-aware workflows', desc: 'mcode test --changed runs only affected tests. watch mode diffs against the last-known-good tree.' },
  { icon: '🔐', title: 'Secrets stay local', desc: 'AES-256-GCM encrypted vault, machine-bound keys, never written to disk in plaintext.' },
  { icon: '🖥', title: 'Cross platform', desc: 'macOS, Linux, Windows. One source, SEA binaries for all three.' }
];

const WORKFLOW = [
  { n: '01', cmd: 'mcode init', desc: 'Scaffold a project from a template with dependencies linked and cached.' },
  { n: '02', cmd: 'mcode run dev', desc: 'Stream dev server logs with hot-reload. Focus on code, not tooling.' },
  { n: '03', cmd: 'mcode ship', desc: 'Build, verify, tag and deploy in one pass. env-aware, git-integrated.' }
];

const PLUGIN_CODE = `import { definePlugin } from 'mcode';

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  commands: {
    'build:icons': async (ctx) => {
      await ctx.run('node scripts/icons.js');
    }
  },
  hooks: {
    'session:start': (ctx) => ctx.log('session started')
  }
});`;

const TESTIMONIALS = [
  { quote: 'God Mode built our entire MVP backend while we were on a call. Ten todos, ten subagents, parallel — finished in 4 minutes.', name: 'Priya Sharma', role: 'Founding Engineer, Loopline' },
  { quote: 'The watch daemon caught a merge regression before CI did. It just... fixed it, re-ran tests, and told me.', name: 'Marcus Reid', role: 'Staff Engineer, Northbeam' },
  { quote: 'Switched from a one-model CLI to mcode. Router picks Claude for backend, Groq for tests, saves us ~$40/week.', name: 'Ana Kowalski', role: 'Indie hacker' }
];

const CHANGELOG = [
  { version: 'v2.4.6', date: 'Aug 2026', items: ['Plugin registry is live \u2014 mcode add plugin:eslint', 'watch daemon: .mcodeignore support', 'Faster sidebar animations in TUI'] },
  { version: 'v2.4.0', date: 'Jul 2026', items: ['God Mode \u2014 full autonomous multi-model builds', 'Subagent swarm with dependency-wave scheduling'] },
  { version: 'v2.3.0', date: 'Jun 2026', items: ['OpenCode Zen provider', 'mcode ship with tag + deploy hooks', '18 provider adapters'] }
];

const FAQ = [
  { question: 'Does mcode require its own backend?', answer: 'No. The CLI is fully local-first. The Express/Mongo backend is optional and additive — it powers the web dashboard, cloud history sync and the plugin registry.' },
  { question: 'Which model providers work?', answer: 'Any OpenAI-compatible endpoint: OpenRouter (recommended), OpenCode Zen, OpenAI, Groq, Together, Mistral, DeepSeek, xAI, Cerebras, Novita, Ollama and LM Studio locally. Drop keys into `mcode env add`.' },
  { question: 'How does subagent routing work?', answer: 'Each todo is assigned a domain (frontend/backend/db/devops/test/docs). The router picks the best-scoring available model per domain — so frontend models do frontend work. All model callbacks respect provider rate limits.' },
  { question: 'Will the watch daemon burn through my API budget?', answer: 'mcode watch only calls a model when it detects a real break (lint or static failure). Clean files cost zero tokens. A maxFixesPerHour budget (default 60) caps runaway loops.' },
  { question: 'Is there TypeScript?', answer: 'No \u2014 plain JavaScript (ES6+) everywhere, by design. No transpile step keeps the CLI fast; JSDoc provides editor intellisense.' }
];

function SectionLabel({ children }) {
  return <p className="section-label">{children}</p>;
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 text-gray-500 hover:text-mcode-green"
      aria-label="copy install command"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-mcode-green" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-mcode-bg bg-grid-dots bg-size-dots">
      <nav className="sticky top-0 z-50 border-b border-mcode-border bg-mcode-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 font-mono">
            <TerminalSquare className="h-5 w-5 text-mcode-green" />
            <span className="font-bold text-white">mcode</span>
            <span className="rounded-sm border border-mcode-border px-1 text-[10px] text-gray-500">v2.4.6</span>
          </div>
          <div className="hidden gap-6 text-sm text-gray-400 md:flex">
            <a href="#features" className="hover:text-mcode-green">Features</a>
            <a href="#workflow" className="hover:text-mcode-green">Workflow</a>
            <Link to="/commands" className="hover:text-mcode-green">Commands</Link>
            <Link to="/plugins" className="hover:text-mcode-green">Plugins</Link>
            <Link to="/changelog" className="hover:text-mcode-green">Changelog</Link>
            <a href="#faq" className="hover:text-mcode-green">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com" className="text-gray-500 hover:text-mcode-green" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <Link to="/signup">
              <Button size="sm">Install</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-mcode-green/30 bg-mcode-green/5 px-3 py-1 font-mono text-xs text-mcode-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mcode-green" />
            v2.4 — plugin registry is live
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
            Ship code without leaving your{' '}
            <span className="bg-gradient-to-r from-mcode-green to-mcode-teal bg-clip-text text-transparent">terminal</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
            mcode is a terminal-first, multi-model AI coding CLI. Bring your own model keys, split work into parallel subagents, and let a background daemon keep your project fixed while you sleep.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg">
                Get started <span className="font-mono text-xs opacity-70">\u2192</span>
              </Button>
            </Link>
            <Link to="/commands">
              <Button size="lg" variant="outline">Browse commands</Button>
            </Link>
          </div>
          <div className="mx-auto mt-8 flex max-w-md items-center justify-between rounded-md border border-mcode-border bg-mcode-panel px-4 py-3 font-mono text-sm text-gray-300">
            <code>npm i -g mcode-cli</code>
            <CopyButton value="npm i -g mcode-cli" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-12 max-w-3xl"
        >
          <TerminalWindow title="mcode — ~/dev/my-api" lines={TERMINAL_LINES} />
        </motion.div>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            ['118ms', 'cold-boot'],
            ['40+', 'official plugins'],
            ['3', 'platforms supported'],
            ['MIT', 'license']
          ].map(([n, l]) => (
            <div key={l}>
              <p className="font-mono text-3xl font-bold text-mcode-green">{n}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      </header>

      <CommandMarquee />

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Features</SectionLabel>
        <h2 className="text-3xl font-bold text-white md:text-4xl">One tool, the whole loop</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -4 }}
              className="terminal-card p-6"
            >
              <div className="font-mono text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-mono text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-t border-mcode-border bg-mcode-panel/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionLabel>Workflow</SectionLabel>
          <h2 className="text-3xl font-bold text-white md:text-4xl">Three commands, empty folder to production</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {WORKFLOW.map((w) => (
              <div key={w.n} className="terminal-card p-6">
                <p className="font-mono text-4xl font-bold text-mcode-green/30">{w.n}</p>
                <h3 className="mt-3 font-mono text-lg font-semibold text-white">{w.cmd}</h3>
                <p className="mt-2 text-sm text-gray-400">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Comparison</SectionLabel>
        <h2 className="text-3xl font-bold text-white md:text-4xl">Less glue, fewer scripts</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="terminal-card p-6 opacity-60">
            <p className="font-mono text-xs text-gray-500">BEFORE — five tools</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              <li><span className="text-mcode-red">✗</span> npm init + hand-write scaffold</li>
              <li><span className="text-mcode-red">✗</span> separate AI CLI per model provider</li>
              <li><span className="text-mcode-red">✗</span> write test scripts by hand</li>
              <li><span className="text-mcode-red">✗</span> CI catches regressions after you push</li>
            </ul>
          </div>
          <div className="terminal-card border-mcode-green/40 p-6">
            <p className="font-mono text-xs text-mcode-green">AFTER — one mcode</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              <li><span className="text-mcode-green">✓</span> mcode init + god mode build</li>
              <li><span className="text-mcode-green">✓</span> one CLI, 18+ providers, auto-routing</li>
              <li><span className="text-mcode-green">✓</span> mcode test --changed, subagents write tests</li>
              <li><span className="text-mcode-green">✓</span> watch daemon fixes before CI ever sees it</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <section className="border-y border-mcode-border bg-mcode-green/5 py-14 text-center">
        <h2 className="text-2xl font-bold text-white md:text-3xl">Install once. Never context switch again.</h2>
        <div className="mx-auto mt-6 flex max-w-md items-center justify-between rounded-md border border-mcode-border bg-mcode-panel px-4 py-3 font-mono text-sm text-gray-300">
          <code>curl -fsSL mcode.dev/install | sh</code>
          <CopyButton value="curl -fsSL mcode.dev/install | sh" />
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/docs"><Button variant="outline">Read the docs</Button></Link>
          <a href="https://github.com"><Button variant="ghost">Star on GitHub</Button></a>
        </div>
      </section>

      {/* Commands overview */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Commands</SectionLabel>
        <h2 className="text-3xl font-bold text-white md:text-4xl">One tool, the whole loop</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            ['mcode init', 'Scaffold a project from a template'],
            ['mcode run dev', 'Stream scripts with hot-reload'],
            ['mcode god "..."', 'Full autonomous multi-model build'],
            ['mcode watch', 'Always-on bugfix daemon'],
            ['mcode ship', 'Build, verify, tag, deploy'],
            ['mcode model set', 'Pin models per task type'],
            ['mcode env add', 'Encrypted secrets vault'],
            ['mcode doctor', 'Diagnose keys & providers']
          ].map(([cmd, desc]) => (
            <div key={cmd} className="flex items-center gap-3 rounded-md border border-mcode-border bg-mcode-panel/50 px-4 py-3">
              <code className="font-mono text-sm text-mcode-green">{cmd}</code>
              <span className="text-sm text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link to="/commands" className="font-mono text-sm text-mcode-green underline-offset-4 hover:underline">
            Read the reference \u2192
          </Link>
        </div>
      </section>

      {/* Plugins */}
      <section className="border-t border-mcode-border bg-mcode-panel/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionLabel>Plugins</SectionLabel>
          <h2 className="text-3xl font-bold text-white md:text-4xl">Extend it in an afternoon</h2>
          <div className="mt-10 grid items-start gap-8 md:grid-cols-2">
            <CodeBlock code={PLUGIN_CODE} language="js" />
            <ul className="space-y-3 text-sm text-gray-400">
              <li><span className="text-mcode-green">✓</span> Custom commands with full context</li>
              <li><span className="text-mcode-green">✓</span> Hooks into session & watch lifecycle</li>
              <li><span className="text-mcode-green">✓</span> Registry install: mcode add plugin:name</li>
              <li><span className="text-mcode-green">✓</span> Presets for lint, format, deploy, secrets</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Teams</SectionLabel>
        <h2 className="text-3xl font-bold text-white md:text-4xl">Trusted where the terminal is home</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="terminal-card p-6">
              <p className="text-sm text-gray-300">"{t.quote}"</p>
              <div className="mt-4 border-t border-mcode-border pt-3">
                <p className="font-mono text-sm text-white">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Changelog teaser */}
      <section className="border-t border-mcode-border bg-mcode-panel/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionLabel>Changelog</SectionLabel>
          <h2 className="text-3xl font-bold text-white md:text-4xl">Shipping every few weeks</h2>
          <div className="mt-8 space-y-4">
            {CHANGELOG.map((c) => (
              <div key={c.version} className="terminal-card p-5">
                <div className="flex items-center gap-3">
                  <code className="font-mono text-sm font-bold text-mcode-green">{c.version}</code>
                  <span className="text-xs text-gray-600">{c.date}</span>
                </div>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-400">
                  {c.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/changelog" className="font-mono text-sm text-mcode-green underline-offset-4 hover:underline">
              Full changelog \u2192
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="text-3xl font-bold text-white md:text-4xl">Questions, answered</h2>
        <div className="mt-8">
          <Accordion items={FAQ} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-mcode-border py-20 text-center">
        <h2 className="text-3xl font-bold text-white md:text-4xl">Your terminal deserves better.</h2>
        <div className="mx-auto mt-6 flex max-w-md items-center justify-between rounded-md border border-mcode-border bg-mcode-panel px-4 py-3 font-mono text-sm text-gray-300">
          <code>npm i -g mcode-cli</code>
          <CopyButton value="npm i -g mcode-cli" />
        </div>
      </section>

      <footer className="border-t border-mcode-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
            <TerminalSquare className="h-4 w-4 text-mcode-green" />
            <span>mcode</span>
            <span className="text-gray-600">© 2026</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            <Link to="/docs" className="hover:text-mcode-green">Docs</Link>
            <Link to="/commands" className="hover:text-mcode-green">Commands</Link>
            <Link to="/plugins" className="hover:text-mcode-green">Plugins</Link>
            <Link to="/changelog" className="hover:text-mcode-green">Changelog</Link>
            <Link to="/app" className="hover:text-mcode-green">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
