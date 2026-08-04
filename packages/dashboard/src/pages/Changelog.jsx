import { MarketingLayout } from './MarketingLayout.jsx';
import { Badge } from '../components/ui/badge.jsx';

const VERSIONS = [
  {
    version: '2.4.6',
    date: 'Aug 4, 2026',
    tag: 'latest',
    items: ['Plugin registry is live — mcode add plugin:eslint', 'watch daemon honors .mcodeignore', 'Faster sidebar enter/exit animations in the TUI', 'Live socket forwarding for build/integration/needs-review events']
  },
  {
    version: '2.4.0',
    date: 'Jul 21, 2026',
    tag: null,
    items: ['God Mode: one prompt → plan → parallel subagents → integration pass', 'Subagent swarm with dependency-wave scheduling and concurrency cap (default 5)', 'Web dashboard live subagent monitor over Socket.IO']
  },
  {
    version: '2.3.0',
    date: 'Jun 30, 2026',
    tag: null,
    items: ['OpenCode Zen provider adapter', 'mcode ship with env-aware tag + deploy hooks', '18 provider adapters, auto-detected by key presence', 'Encrypted vault (AES-256-GCM, machine-bound key)']
  },
  {
    version: '2.2.0',
    date: 'Jun 2, 2026',
    tag: null,
    items: ['mcode watch --background detached daemon', 'Impact analysis: eslint pass first, model only when broken', 'maxFixesPerHour budget with warning surfacing']
  },
  {
    version: '2.1.0',
    date: 'May 8, 2026',
    tag: null,
    items: ['Ink-based TUI: agents sidebar with enter/exit animations', 'Collapsible syntax-highlighted code viewer', 'Slash-command autocomplete menu']
  }
];

export function Changelog() {
  return (
    <MarketingLayout
      label="Changelog"
      title="Shipping every few weeks"
      sub="What's new in mcode."
    >
      <div className="space-y-6">
        {VERSIONS.map((v) => (
          <div key={v.version} className="terminal-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <code className="font-mono text-lg font-bold text-mcode-green">{v.version}</code>
              <span className="text-xs text-gray-600">{v.date}</span>
              {v.tag && <Badge variant="success">{v.tag}</Badge>}
            </div>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-gray-400">
              {v.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </MarketingLayout>
  );
}
