import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ArrowLeft, Search,
  Moon, Sun, Monitor, Copy,
  Database, BarChart2, Settings, Users, GitBranch, X,
} from 'lucide-react';
import api from '../../lib/axios';
import { connectOAuth } from '../../lib/electron-nav';

const MotionLink = motion.create(Link);

/* ─────────────────── SETTINGS STRUCTURE (mcode actual) ─────────────────── */

const SIDEBAR_SECTIONS = [
  {
    id: 'basics',
    label: 'Basics',
    icon: Settings,
    children: [
      { id: 'general', label: 'General' },
      { id: 'appearance', label: 'Appearance' },
      { id: 'models', label: 'Model settings' },
      { id: 'browser', label: 'Browser Use' },
      { id: 'computer', label: 'Computer Use' },
    ],
  },
  {
    id: 'agent',
    label: 'Agent capabilities',
    icon: Users,
    children: [
      { id: 'memory', label: 'Memory' },
      { id: 'subagents', label: 'Subagents' },
    ],
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: GitBranch,
    children: [
      { id: 'plugins', label: 'Plugins' },
      { id: 'mcp', label: 'MCP Servers' },
      { id: 'skills', label: 'Skills' },
      { id: 'commands', label: 'Commands' },
      { id: 'hooks', label: 'Hooks' },
    ],
  },
  {
    id: 'data',
    label: 'Data and statistics',
    icon: Database,
    children: [
      { id: 'indexing', label: 'Indexing' },
      { id: 'usage', label: 'Usage stats' },
      { id: 'onboard', label: 'Onboard' },
    ],
  },
];

const SETTING_GROUPS: Record<string, any> = {
  general: {
    title: 'General',
    settings: [
      { key: 'locale', label: 'Language', description: 'Choose the display language used by the application UI.', type: 'select', options: ['English'], defaultValue: 'English', defaultOpen: true },
      { key: 'terminalInheritProfile', label: 'Inherit system terminal profile', description: 'When launching the built-in terminal, inherit login shell environment, proxy, Kubernetes variables, and local terminal font when possible.', type: 'toggle', defaultValue: true },
      { key: 'terminalFont', label: 'Terminal font', description: 'Leave blank to auto-detect system terminal settings; set a value to override the mcode terminal font.', type: 'text', placeholder: 'e.g. MesloLGS NF, monospace', defaultValue: '' },
      { key: 'integratedTerminalShell', label: 'Integrated terminal shell', description: 'Applies to new sessions only. On Windows, Bash uses this shell; Auto tries Git Bash, then cmd.exe.', type: 'select', options: ['Auto'], defaultValue: 'Auto' },
      { key: 'enhancedFind', label: 'Enhanced Find and Grep', description: 'Use enhanced Find and Grep in new sessions and sessions restored after an app restart.', type: 'toggle', defaultValue: true },
      { key: 'httpProxy', label: 'HTTP Proxy', description: 'Route model, MCP, command-tool, and app renderer egress traffic through this proxy. Leave blank for direct connection.', type: 'text', placeholder: 'e.g. http://127.0.0.1:7890', defaultValue: '' },
      { key: 'noProxy', label: 'No proxy', description: 'Requests matching these hosts connect directly instead of using the HTTP proxy. Separate rules with commas.', type: 'text', placeholder: 'e.g. localhost,127.0.0.1,::1,.example.com,*.corp.com', defaultValue: '' },
      { key: 'customCert', label: 'Custom certificate', description: 'Set a PEM root certificate path to inject as NODE_EXTRA_CA_CERTS for models, MCP, and command tools.', type: 'text', placeholder: 'e.g. /Users/name/certs/root-ca.pem', defaultValue: '' },
      { key: 'chromeHWAccel', label: 'Chrome hardware acceleration', description: 'Turn this off to work around blank windows, crashes, or rendering issues caused by some GPUs or drivers.', type: 'toggle', defaultValue: true },
      { key: 'previewUpdates', label: 'Receive preview updates early', description: 'Get earliest access to new features and improvements.', type: 'toggle', defaultValue: false },
      { key: 'autoInstallUpdates', label: 'Automatically download and install updates', description: 'Updates start downloading as soon as they are found.', type: 'toggle', defaultValue: true },
      { key: 'taskNotifications', label: 'Task notifications', description: 'Send desktop notifications when a task completes, fails, or needs approval.', type: 'toggle', defaultValue: true },
      { key: 'notificationSound', label: 'Notification sound', description: 'Mute the task notification sound separately.', type: 'toggle', defaultValue: false },
      { key: 'hideToTray', label: 'Hide to tray when closing window', description: 'Windows only. The close button hides the window; Quit from tray still exits.', type: 'toggle', defaultValue: false },
      { key: 'keepAwake', label: 'Keep computer running', description: 'Prevent the system from sleeping due to idle.', type: 'toggle', defaultValue: false },
      { key: 'interactionBehavior', label: 'Interaction behavior', description: 'While mcode is running, add follow-up actions to the queue or guide them.', type: 'select', options: ['Queue', 'Inline', 'Modal'], defaultValue: 'Queue' },
      { key: 'autoContinue', label: 'Automatically continue questions', description: 'Agent questions automatically continue after 5 minutes without an answer.', type: 'toggle', defaultValue: false },
      { key: 'keepModelIO', label: 'Keep complete model I/O', description: 'Keep complete model requests and responses without compression.', type: 'toggle', defaultValue: false },
      { key: 'showReasoning', label: 'Show reasoning', description: 'Show full reasoning inside the message stream.', type: 'toggle', defaultValue: false },
      { key: 'showTodos', label: 'Show todos', description: 'Show Todo tool cards inside the message stream.', type: 'toggle', defaultValue: true },
      { key: 'groupExploration', label: 'Group exploration tools', description: 'Group consecutive reads and searches into an Explore section.', type: 'toggle', defaultValue: true },
      { key: 'groupTerminal', label: 'Group terminal commands', description: 'Group consecutive non-read-only shell commands into a Terminal section.', type: 'toggle', defaultValue: true },
      { key: 'groupFileChanges', label: 'Group file changes', description: 'Group consecutive Write, Edit, and ApplyPatch calls into a Changes section.', type: 'toggle', defaultValue: true },
      { key: 'autoArchive', label: 'Auto-archive old tasks', description: 'Periodically scan workspaces and archive completed tasks after retention.', type: 'toggle', defaultValue: true },
      { key: 'archiveRetention', label: 'Archive retention', description: 'A task becomes eligible after its last update is older than this window.', type: 'select', options: ['7 days', '14 days', '30 days', '90 days'], defaultValue: '7 days' },
    ],
  },
  appearance: {
    title: 'Appearance',
    settings: [
      { key: 'theme', label: 'App theme', description: 'Choose light, dark, or follow the system theme.', type: 'theme', defaultValue: 'dark' },
      { key: 'uiFontSize', label: 'UI font size', description: 'Adjust interface text without changing icons or layout dimensions.', type: 'slider', min: 10, max: 24, step: 1, defaultValue: 14 },
      { key: 'codeThemeLight', label: 'Light code theme', description: 'Highlighting theme for code in light mode.', type: 'select', options: ['GitHub Light'], defaultValue: 'GitHub Light' },
      { key: 'codeThemeDark', label: 'Dark code theme', description: 'Highlighting theme for code in dark mode.', type: 'select', options: ['GitHub Dark'], defaultValue: 'GitHub Dark' },
      { key: 'showLineNumbers', label: 'Show line numbers', description: 'Display line numbers in code and diff views.', type: 'toggle', defaultValue: true },
      { key: 'wrapLongLines', label: 'Wrap long lines', description: 'Wrap long code lines automatically.', type: 'toggle', defaultValue: false },
      { key: 'codeFontSize', label: 'Code font size', description: 'Adjust the default font size for code blocks, file previews, and diff views.', type: 'slider', min: 8, max: 20, step: 1, defaultValue: 12 },
    ],
  },
};

function SettingToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <motion.label
      className="flex items-start gap-3 cursor-pointer group"
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div className="relative mt-0.5 flex-shrink-0 w-10 h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="opacity-0 w-0 h-0"
        />
        <div
          onClick={() => setChecked(!checked)}
          className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${
            checked ? 'bg-[var(--mcode-green,#3ecf8e)]' : 'bg-[#3a3a3f]'
          }`}
        >
          <motion.div
            animate={{ x: checked ? 5 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">{label}</span>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">{description}</p>
      </div>
    </motion.label>
  );
}

function SettingSelect({ label, description, options, defaultValue }: { label: string; description: string; options: string[]; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue || '');
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">{label}</label>
      <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{description}</p>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)] rounded-lg px-3 py-2 text-sm text-[var(--mcode-text,#e6e6ea)] focus:outline-none focus:border-[var(--mcode-green,#3ecf8e)] transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[var(--mcode-bg,#0d0e12)]">{opt}</option>
        ))}
      </select>
    </div>
  );
}

function SettingText({ label, description, placeholder, defaultValue }: { label: string; description: string; placeholder?: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue || '');
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">{label}</label>
      <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{description}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)] rounded-lg px-3 py-2 text-sm text-[var(--mcode-text,#e6e6ea)] placeholder-[var(--mcode-text-dim,#8b8d98)]/50 focus:outline-none focus:border-[var(--mcode-green,#3ecf8e)] transition-colors font-mono"
      />
    </div>
  );
}

function SettingSlider({ label, description, min, max, step, defaultValue }: { label: string; description: string; min: number; max: number; step: number; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue ?? min);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">{label}</span>
        <span className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{value}px</span>
      </div>
      <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{description}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-1 bg-[var(--mcode-border,#26272f)] rounded-full accent-[var(--mcode-green,#3ecf8e)]"
      />
    </div>
  );
}

function SettingTheme({ label, description, options }: { label: string; description: string; options: { id: string; label: string; icon: React.ReactNode }[] }) {
  const [selected, setSelected] = useState('dark');
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">{label}</label>
      <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{description}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selected === opt.id
                ? 'bg-[var(--mcode-green,#3ecf8e)]/20 text-[var(--mcode-green,#3ecf8e)] border border-[var(--mcode-green,#3ecf8e)]/30'
                : 'bg-[var(--mcode-panel,#16171d)] text-[var(--mcode-text-dim,#8b8d98)] border border-[var(--mcode-border,#26272f)] hover:text-[var(--mcode-text,#e6e6ea)]'
            }`}
          >
            <div className="flex items-center gap-2">{opt.icon}{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)] rounded-xl overflow-hidden"
    >
      <motion.button
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between text-left cursor-pointer"
      >
        <h3 className="text-sm font-semibold text-[var(--mcode-text,#e6e6ea)] uppercase tracking-wider">{title}</h3>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[var(--mcode-text-dim,#8b8d98)]" />
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="px-5 pb-4 space-y-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────── TABS ─────────────────── */

const MODEL_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', envVar: 'OPENAI_API_KEY', free: false },
  { id: 'anthropic', name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY', free: false },
  { id: 'google', name: 'Google', envVar: 'GOOGLE_API_KEY', free: false },
  { id: 'openrouter', name: 'OpenRouter', envVar: 'OPENROUTER_API_KEY', free: true },
  { id: 'groq', name: 'Groq', envVar: 'GROQ_API_KEY', free: true },
  { id: 'cohere', name: 'Cohere', envVar: 'COHERE_API_KEY', free: false },
  { id: 'openai-compatible', name: 'OpenAI-Compatible', envVar: '', free: false },
];

const BUILT_IN_SUBAGENTS = [
  { name: 'general-purpose', tools: 'All tools', description: 'General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks.' },
  { name: 'Explore', tools: '7 tools', description: 'Read-only search agent for broad fan-out searches.' },
];

const BUILT_IN_PLUGINS = [
  { name: 'Android Emulator', description: 'Provides Android development workflows and emulator automation for mcode.', default: true },
  { name: 'Browser Use', description: 'Built-in browser automation runtime and guidance.', default: true },
  { name: 'Document Skills', description: 'Built-in DOCX and PDF document production skills.', default: true },
  { name: 'IOS Simulator', description: 'Provides iOS development workflows and simulator automation.', default: true },
  { name: 'Restore Legacy Sessions', description: 'Select and restore legacy sessions into the new task store.', default: true },
  { name: 'Skill Creator', description: 'Create, edit, and iterate local mcode skills.', default: true },
  { name: 'mcode Guide', description: 'mcode usage and self-diagnosis guide for MCP, commands, skills, hooks, and plugins.', default: true },
  { name: 'Computer Use', description: 'Automate desktop apps with mouse, keyboard, and UI element control.', default: true },
];

const MCP_SERVERS = [
  { name: 'Browser Use', count: 1, description: 'node_repl — managed by the host.' },
  { name: 'Computer Use', count: 1, description: 'computer-use — connected and available.' },
  { name: 'Document Skills', count: 1, description: 'image_search — requires Coding Plan.' },
];

const SKILLS = [
  { category: 'Browser Use', name: 'control-browser', description: 'Main-agent-only Browser Use.' },
  { category: 'Browser Use', name: 'web-gui-tester', description: 'Test web frontends interactively.' },
  { category: 'Document Skills', items: ['docx', 'pdf', 'pptx'] },
  { category: 'Skill Creator', name: 'skill-creator', description: 'Create and edit local skills.' },
  { category: 'mcode Guide', items: ['diagnosing-commands', 'diagnosing-hooks', 'diagnosing-mcp', 'diagnosing-plugins', 'diagnosing-skills', 'zcode-configuration-guide'] },
];

/* ─────────────────── TAB RENDERERS ─────────────────── */

// GeneralTab renders settings from a settings array (used for both General and Appearance)
function GeneralTab({ settings }: { settings?: any[] }) {
  const items = settings || SETTING_GROUPS.general.settings;
  return (
    <div className="space-y-6">
      {items.map((s: any, i: number) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          {s.type === 'toggle' && (
            <SettingToggle label={s.label} description={s.description} defaultChecked={s.defaultValue as boolean} />
          )}
          {s.type === 'select' && (
            <SettingSelect label={s.label} description={s.description} options={s.options} defaultValue={s.defaultValue as string} />
          )}
          {s.type === 'text' && (
            <SettingText label={s.label} description={s.description} placeholder={s.placeholder} defaultValue={s.defaultValue as string} />
          )}
          {s.type === 'slider' && (
            <SettingSlider label={s.label} description={s.description} min={s.min} max={s.max} step={s.step} defaultValue={s.defaultValue as number} />
          )}
          {s.type === 'theme' && (
            <SettingTheme label={s.label} description={s.description} options={[
              { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
              { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
              { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
            ]} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function AppearanceTab() {
  return <GeneralTab settings={SETTING_GROUPS.appearance.settings} />;
}

function ModelSettingsTab() {
  const [providers, setProviders] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState('openrouter');
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/settings/providers', { timeout: 5000 }).then(r => setProviders(r.data?.providers || [])).catch(() => []),
      api.get('/api/v1/keys', { timeout: 10000 }).then(r => setKeys(r.data?.keys || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!newKey) return;
    const provider = providers.find(p => p.id === activeProvider);
    await api.post('/api/v1/keys', {
      providerId: activeProvider,
      envVar: provider?.envVar || `${activeProvider.toUpperCase()}_API_KEY`,
      displayName: provider?.name || activeProvider,
      apiKey: newKey,
    });
    setNewKey('');
    setShowKey(false);
    window.dispatchEvent(new CustomEvent('mcode:reload-models'));
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-sm font-semibold text-[var(--mcode-text-dim,#8b8d98)] uppercase tracking-wider mb-3">Providers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODEL_PROVIDERS.map((p) => {
            const isConfigured = keys.some(k => k.providerId === p.id);
            return (
              <motion.div
                key={p.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                  isConfigured
                    ? 'bg-[var(--mcode-green,#3ecf8e)]/10 border-[var(--mcode-green,#3ecf8e)]/30'
                    : 'bg-[var(--mcode-panel,#16171d)] border-[var(--mcode-border,#26272f)]'
                }`}
              >
                <div className="font-medium text-sm text-[var(--mcode-text,#e6e6ea)]">{p.name}</div>
                <div className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1">
                  {isConfigured ? 'Configured' : p.free ? 'Free' : 'Paid'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold text-[var(--mcode-text-dim,#8b8d98)] uppercase tracking-wider mb-3">API Key</h3>
        <div className="flex gap-2">
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Enter API key"
            className="flex-1 bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)] rounded-lg px-3 py-2 text-sm text-[var(--mcode-text,#e6e6ea)] focus:outline-none focus:border-[var(--mcode-green,#3ecf8e)]"
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-[var(--mcode-green,#3ecf8e)] text-black font-medium text-sm hover:bg-[var(--mcode-green,#3ecf8e)]/90 transition"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BrowserUseTab() {
  return (
    <div className="space-y-6">
      <SettingToggle
        label="Enable built-in browser control"
        description="Enable the official Browser Use plugin so new sessions can access and control web pages in the built-in browser."
        defaultChecked={true}
      />
      <SettingToggle
        label="Ignore certificate errors"
        description="When enabled, the built-in browser stops verifying HTTPS certificates. Affects the built-in browser only."
        defaultChecked={false}
      />
    </div>
  );
}

function ComputerUseTab() {
  return (
    <div className="space-y-6">
      <SettingToggle
        label="Enable Computer Use"
        description="Turning this on enables Computer Use — its MCP server and skills."
        defaultChecked={false}
      />
      <SettingToggle
        label="Show Computer Use button in the composer"
        description="When off, the composer button is hidden."
        defaultChecked={true}
      />
    </div>
  );
}

function MemoryTab() {
  return (
    <div className="space-y-6">
      <SettingToggle
        label="Workspace Memory"
        description="Save and reuse long-term context in workspaces. Applies to new sessions and may increase model requests and token costs."
        defaultChecked={true}
      />
    </div>
  );
}

function SubagentsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--mcode-text-dim,#8b8d98)] uppercase tracking-wider">Built-in subagents</h3>
        <span className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{BUILT_IN_SUBAGENTS.length} items</span>
      </div>
      <div className="space-y-3">
        {BUILT_IN_SUBAGENTS.map((sub) => (
          <motion.div key={sub.name} className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-[var(--mcode-text,#e6e6ea)]">{sub.name}</div>
                <div className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1">{sub.tools}</div>
                <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1 opacity-70">{sub.description}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-[var(--mcode-green,#3ecf8e)]/10 text-[var(--mcode-green,#3ecf8e)] rounded-full">Default</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PluginsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--mcode-text-dim,#8b8d98)] uppercase tracking-wider">Built-in</h3>
        <span className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{BUILT_IN_PLUGINS.length} items</span>
      </div>
      <div className="space-y-3">
        {BUILT_IN_PLUGINS.map((p) => (
          <motion.div key={p.name} className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-[var(--mcode-text,#e6e6ea)]">{p.name}</div>
                <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1 opacity-70">{p.description}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-[var(--mcode-green,#3ecf8e)]/10 text-[var(--mcode-green,#3ecf8e)] rounded-full">Default</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function McpServersTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--mcode-text-dim,#8b8d98)] uppercase tracking-wider">Installed</h3>
        <span className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">{MCP_SERVERS.length} servers</span>
      </div>
      <div className="space-y-3">
        {MCP_SERVERS.map((s) => (
          <motion.div key={s.name} className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-[var(--mcode-text,#e6e6ea)]">{s.name}</div>
                <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1">{s.description}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-[var(--mcode-green,#3ecf8e)]/10 text-[var(--mcode-green,#3ecf8e)] rounded-full">{s.count} server</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SkillsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--mcode-text-dim,#8b8d98)] uppercase tracking-wider">Built-in</h3>
        <span className="text-xs text-[var(--mcode-text-dim,#8b8d98)]">12 items</span>
      </div>
      <div className="space-y-4">
        {SKILLS.map((cat, i) => (
          <motion.div key={i} className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
            <div className="font-medium text-sm text-[var(--mcode-green,#3ecf8e)] mb-2">{cat.category}</div>
            {'items' in cat ? (
              <div className="flex flex-wrap gap-2">
                {cat.items?.map((item: string) => (
                  <span key={item} className="text-xs px-2 py-1 bg-[var(--mcode-border,#26272f)] rounded text-[var(--mcode-text-dim,#8b8d98)]">{item}</span>
                ))}
              </div>
            ) : (
              <div>
                <div className="font-medium text-sm text-[var(--mcode-text,#e6e6ea)]">{cat.name}</div>
                <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1 opacity-70">{cat.description}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CommandsTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Search className="w-8 h-8 text-[var(--mcode-text-dim,#8b8d98)]/50 mx-auto mb-2" />
        <p className="text-[var(--mcode-text-dim,#8b8d98)]">No commands installed</p>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)]/50 mt-1">Create a command or import one from an external agent.</p>
      </div>
    </div>
  );
}

function HooksTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Search className="w-8 h-8 text-[var(--mcode-text-dim,#8b8d98)]/50 mx-auto mb-2" />
        <p className="text-[var(--mcode-text-dim,#8b8d98)]">No hooks installed</p>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)]/50 mt-1">Create a hook to run commands during task lifecycle events.</p>
      </div>
    </div>
  );
}

function IndexingTab() {
  return (
    <div className="space-y-6">
      <SettingToggle
        label="Index new folders"
        description="Automatically index any new folders with fewer than 50,000 files."
        defaultChecked={true}
      />
      <SettingToggle
        label="Index repositories for instant grep"
        description="Automatically index repositories to speed up Grep searches. All data is stored locally."
        defaultChecked={false}
      />
      <motion.div className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-[var(--mcode-green,#3ecf8e)]" />
          <div>
            <div className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">Data storage path</div>
            <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">Root directory for app data.</p>
            <div className="flex items-center gap-2 mt-1.5">
              <code className="text-xs text-[var(--mcode-text-dim,#8b8d98)] bg-[var(--mcode-bg,#0d0e12)] px-2 py-1 rounded">
                C:\Users\mahen
              </code>
              <button className="p-1 text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)]">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function UsageStatsTab() {
  return (
    <div className="space-y-6">
      <motion.div className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-[var(--mcode-green,#3ecf8e)]" />
          <div>
            <div className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">Data storage path</div>
            <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">Root directory for app data (defaults to user home directory).</p>
            <div className="flex items-center gap-2 mt-1.5">
              <code className="text-xs text-[var(--mcode-text-dim,#8b8d98)] bg-[var(--mcode-bg,#0d0e12)] px-2 py-1 rounded">
                C:\Users\mahen
              </code>
              <button className="p-1 text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)]">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OnboardTab() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)] cursor-pointer"
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[var(--mcode-green,#3ecf8e)]" />
          <div>
            <div className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">Reopen onboarding flow</div>
            <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">Review migration options and import settings.</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]"
      >
        <div className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 accent-[var(--mcode-green,#3ecf8e)]" defaultChecked />
          <div>
            <span className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">Improve experience</span>
            <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">Allow us to use your conversations to improve the Agent experience.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────── SIDEBAR ─────────────────── */

function SettingsSidebar({ activeTab, setActiveTab, onClose, settings }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
  settings: any;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    basics: true, agent: true, plugins: true, data: true,
  });

  return (
    <aside className="w-64 flex-shrink-0 bg-[var(--mcode-panel,#16171d)] border-r border-[var(--mcode-border,#26272f)] flex flex-col">
      <motion.div
        className="p-5 border-b border-[var(--mcode-border,#26272f)]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)] transition text-sm group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to workspace
          </button>
        ) : (
          <MotionLink
            href="/ai/chat"
            className="flex items-center gap-2 text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)] transition text-sm group"
            whileHover={{ x: -3 }}
          >
            <motion.div whileHover={{ x: -3 }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            Back to workspace
          </MotionLink>
        )}
        <motion.h1
          className="text-lg font-semibold text-[var(--mcode-text,#e6e6ea)] mt-4 tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          Settings
        </motion.h1>
      </motion.div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {SIDEBAR_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = expanded[section.id] ?? false;
          return (
            <div key={section.id}>
              <motion.button
                onClick={() => setExpanded(e => ({ ...e, [section.id]: !e[section.id] }))}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
                  isOpen ? 'text-[var(--mcode-text,#e6e6ea)]' : 'text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)]'
                }`}
                whileHover={{ x: 2 }}
              >
                <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3 h-3 text-[var(--mcode-text-dim,#8b8d98)]" />
                </motion.div>
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </motion.button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {section.children.map((child) => {
                      const isActive = activeTab === child.id;
                      return (
                        <motion.button
                          key={child.id}
                          onClick={() => setActiveTab(child.id)}
                          className={`w-full flex items-center gap-3 ml-7 px-3 py-1.5 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'text-[var(--mcode-green,#3ecf8e)]'
                              : 'text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)]'
                          }`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          whileHover={{ x: 2 }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="active-pill"
                              className="absolute w-0.5 h-4 -ml-[13px] bg-[var(--mcode-green,#3ecf8e)] rounded-full"
                            />
                          )}
                          <span>{child.label}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <motion.div
        className="p-4 border-t border-[var(--mcode-border,#26272f)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-[10px] text-[var(--mcode-text-dim,#8b8d98)] text-center">mcode v1.0</p>
      </motion.div>
    </aside>
  );
}

/* ─────────────────── MAIN SETTINGS PAGE ─────────────────── */
export function SettingsPage({ onClose, initialTab }: { onClose?: () => void; initialTab?: string } = {}) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab || searchParams?.get('tab') || 'general');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const tabRenderers: Record<string, React.ComponentType> = {
    general: GeneralTab,
    appearance: AppearanceTab,
    models: ModelSettingsTab,
    browser: BrowserUseTab,
    computer: ComputerUseTab,
    memory: MemoryTab,
    subagents: SubagentsTab,
    plugins: PluginsTab,
    mcp: McpServersTab,
    skills: SkillsTab,
    commands: CommandsTab,
    hooks: HooksTab,
    indexing: IndexingTab,
    usage: UsageStatsTab,
    onboard: OnboardTab,
  };

  const TabContent = tabRenderers[activeTab] || GeneralTab;
  const activeSection = SIDEBAR_SECTIONS.find(s => s.children.some(c => c.id === activeTab));
  const activeLabel = activeSection?.children.find(c => c.id === activeTab)?.label || 'Settings';

  return (
    <div className="flex h-screen w-screen bg-[var(--mcode-bg,#0d0e12)] text-[var(--mcode-text,#e6e6ea)] font-sans overflow-hidden">
      <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={onClose} settings={{}} />

      <motion.main
        className="flex-1 overflow-y-auto custom-scrollbar"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Page header */}
          <motion.div
            className="mb-8 pb-4 border-b border-[var(--mcode-border,#26272f)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-6 right-6 px-2.5 py-1.5 rounded-xl text-[var(--mcode-text-dim,#8b8d98)] hover:text-[var(--mcode-text,#e6e6ea)] hover:bg-white/5 transition z-50 flex items-center gap-1.5 text-xs border border-[var(--mcode-border,#26272f)]"
                title="Close Settings (Esc)"
              >
                <span className="text-[10px] text-[var(--mcode-text-dim,#8b8d98)] font-mono">Esc</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <h1 className="text-xl font-semibold text-[var(--mcode-text,#e6e6ea)]">{activeLabel}</h1>
            <p className="text-sm text-[var(--mcode-text-dim,#8b8d98)] mt-1">{activeSection?.label}</p>
          </motion.div>

          <TabContent />
        </div>
      </motion.main>
    </div>
  );
}
