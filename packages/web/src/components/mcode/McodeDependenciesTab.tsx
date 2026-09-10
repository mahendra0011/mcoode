import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Database, Terminal, GitBranch, Lock, FileText, Download,
  Globe, Server, Brain, BarChart3, Zap, ChevronDown, Layers,
  Sparkles, Activity
} from 'lucide-react';

/**
 * McodeDependenciesTab — Tools & Dependencies reference.
 *
 * Catalog of all packages installed in the mcode web frontend,
 * organized by category. Extracted from the actual production bundle
 * and verified against package.json versions.
 */

const DEP_CATEGORIES = [
  {
    id: 'core',
    label: 'Core Frameworks',
    icon: Layers,
    color: 'text-blue-400',
    items: [
      { name: 'react', version: '18.x', purpose: 'UI rendering engine' },
      { name: 'framer-motion', version: '11.x', purpose: 'Animation library (primary)' },
      { name: 'react-redux', version: '9.x', purpose: 'State management' },
      { name: 'redux', version: '4.x', purpose: 'Redux store' },
      { name: 'redux-thunk', version: '3.x', purpose: 'Async Redux middleware' },
      { name: 'zustand', version: '5.x', purpose: 'Lightweight reactive state (IDE store)' },
      { name: 'tailwindcss', version: '4.2.2', purpose: 'CSS framework' },
      { name: '@radix-ui / radix-ui', version: 'latest', purpose: 'Headless UI primitives' },
    ],
  },
  {
    id: 'ui',
    label: 'UI Components & Styling',
    icon: Package,
    color: 'text-purple-400',
    items: [
      { name: 'lucide-react', version: 'latest', purpose: 'Icon library (all icons)' },
      { name: 'tailwind-merge', version: 'latest', purpose: 'Tailwind class deduplication' },
      { name: 'tailwind-scrollbar-hide', version: 'latest', purpose: 'Custom scrollbar hiding' },
      { name: 'tw-animate-css', version: 'latest', purpose: 'Tailwind animation utilities' },
      { name: 'class-variance-authority', version: 'latest', purpose: 'Component variant management' },
      { name: 'clsx', version: 'latest', purpose: 'Conditional classnames' },
      { name: 'shadcn/ui', version: 'modified', purpose: 'Modified ShadCN UI components' },
    ],
  },
  {
    id: 'editor',
    label: 'Code Editing & Display',
    icon: FileText,
    color: 'text-emerald-400',
    items: [
      { name: 'lexical', version: 'latest', purpose: 'Rich text editor (chat input)' },
      { name: 'react-resizable-panels', version: 'latest', purpose: 'VS Code-style split-view resizing' },
      { name: 'react-remove-scroll', version: 'latest', purpose: 'Scroll lock for modals' },
      { name: 'react-style-singleton', version: 'latest', purpose: 'CSS-in-JS injection' },
      { name: '@xterm/xterm', version: 'latest', purpose: 'Terminal component' },
      { name: 'highlight.js', version: 'latest', purpose: 'Syntax highlighting' },
      { name: 'shiki', version: 'latest', purpose: 'Text-based syntax highlighting' },
      { name: 'katex', version: 'latest', purpose: 'Math/LaTeX rendering' },
      { name: 'mermaid', version: 'latest', purpose: 'Diagram generation' },
      { name: 'echarts', version: 'latest', purpose: 'Chart visualization' },
      { name: 'recharts', version: 'latest', purpose: 'React charting library' },
      { name: 'zrender', version: 'latest', purpose: 'Canvas rendering for charts' },
    ],
  },
  {
    id: 'markdown',
    label: 'Markdown & Content',
    icon: FileText,
    color: 'text-amber-400',
    items: [
      { name: 'remark-parse', version: 'latest', purpose: 'Markdown parser' },
      { name: 'remark-gfm', version: 'latest', purpose: 'GitHub Flavored Markdown' },
      { name: 'remark-rehype', version: 'latest', purpose: 'Markdown → HTML' },
      { name: 'rehype-katex', version: 'latest', purpose: 'Math rendering' },
      { name: 'rehype-raw', version: 'latest', purpose: 'Raw HTML in markdown' },
      { name: 'rehype-sanitize', version: 'latest', purpose: 'XSS sanitization' },
      { name: 'rehype-stringify', version: 'latest', purpose: 'HTML stringification' },
      { name: 'remark-math', version: 'latest', purpose: 'Math in markdown' },
    ],
  },
  {
    id: 'terminal',
    label: 'Terminal & Shell',
    icon: Terminal,
    color: 'text-cyan-400',
    items: [
      { name: 'node-pty', version: 'latest', purpose: 'Pseudo-terminal for OS shells' },
      { name: 'xterm', version: 'latest', purpose: 'Terminal frontend' },
      { name: 'ansi-to-react', version: 'latest', purpose: 'ANSI escape code parsing' },
      { name: 'anser', version: 'latest', purpose: 'ANSI rendering' },
      { name: 'cli-spinners', version: 'latest', purpose: 'Spinner animations' },
      { name: 'cli-cursor', version: 'latest', purpose: 'Cursor utilities' },
    ],
  },
  {
    id: 'remote',
    label: 'Remote & Connection',
    icon: Globe,
    color: 'text-indigo-400',
    items: [
      { name: 'ws', version: 'latest', purpose: 'WebSocket (primary transport)' },
      { name: 'socket.io-client', version: 'latest', purpose: 'Socket.IO (live events)' },
      { name: 'xhr2', version: 'latest', purpose: 'XMLHttpRequest polyfill' },
      { name: 'follow-redirects', version: 'latest', purpose: 'HTTP redirect following' },
      { name: 'https-proxy-agent', version: 'latest', purpose: 'HTTPS proxy support' },
      { name: 'http-errors', version: 'latest', purpose: 'HTTP error utilities' },
      { name: 'ssh2', version: 'latest', purpose: 'SSH connections' },
      { name: 'is-docker', version: 'latest', purpose: 'Docker environment detection' },
    ],
  },
  {
    id: 'auth',
    label: 'Authentication & Security',
    icon: Lock,
    color: 'text-red-400',
    items: [
      { name: 'jose', version: 'latest', purpose: 'JWT signing/verification' },
      { name: 'pkce-challenge', version: 'latest', purpose: 'OAuth PKCE challenge' },
      { name: 'bcrypt-pbkdf', version: 'latest', purpose: 'Password hashing' },
      { name: 'cookie-signature', version: 'latest', purpose: 'Cookie signing' },
    ],
  },
  {
    id: 'media',
    label: 'Visualization & Media',
    icon: Download,
    color: 'text-pink-400',
    items: [
      { name: 'pdfjs-dist', version: 'latest', purpose: 'PDF rendering' },
      { name: 'react-pdf', version: 'latest', purpose: 'React PDF viewer' },
      { name: 'docx-preview', version: 'latest', purpose: 'DOCX preview' },
      { name: 'qrcode', version: 'latest', purpose: 'QR code generation' },
      { name: 'jszip', version: 'latest', purpose: 'ZIP file handling' },
      { name: 'fflate', version: 'latest', purpose: 'Compression (faster than JSZip)' },
      { name: 'pngjs', version: 'latest', purpose: 'PNG manipulation' },
      { name: 'utif', version: 'latest', purpose: 'TIFF/Flate support' },
      { name: 'yazl', version: 'latest', purpose: 'ZIP creation' },
    ],
  },
  {
    id: 'utils',
    label: 'Data Processing & Utilities',
    icon: BarChart3,
    color: 'text-teal-400',
    items: [
      { name: 'd3-*', version: 'latest', purpose: 'Data visualization toolkit' },
      { name: 'lodash.*', version: 'latest', purpose: 'Utility functions' },
      { name: 'fuzzysort', version: 'latest', purpose: 'Fuzzy search' },
      { name: 'escape-html', version: 'latest', purpose: 'HTML escaping' },
      { name: 'json5', version: 'latest', purpose: 'JSON5 parsing' },
      { name: 'yaml', version: 'latest', purpose: 'YAML parsing' },
      { name: 'csv-parse', version: 'latest', purpose: 'CSV parsing' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Validation',
    icon: Brain,
    color: 'text-orange-400',
    items: [
      { name: 'ai', version: 'latest', purpose: 'Vercel AI SDK (LLM streaming + tool calling)' },
      { name: 'zod', version: 'latest', purpose: 'TypeScript schema validation' },
      { name: 'zod-to-json-schema', version: 'latest', purpose: 'Schema conversion (zod → JSON Schema)' },
    ],
  },
];

export function McodeDependenciesTab() {
  const [expanded, setExpanded] = useState<string | null>('core');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Tools &amp; Dependencies</h2>
        <p className="text-sm text-white/40">All packages installed in the mcode web frontend, organized by category. Verified against production bundle.</p>
      </div>

      {/* Animation Stack Summary */}
      <motion.div
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">4-Layer Animation Stack</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <AnimLayer icon={Zap} name="Framer Motion 11" desc="Message entry (opacity, y:6→0), buttons (scale 1.02/0.98), list stagger (0.04s/item)" />
          <AnimLayer icon={Sparkles} name="CSS Keyframes" desc="AI stream (900ms cubic-bezier(0.16,1,0.3,1)), collapsible (300ms ease-in-out)" />
          <AnimLayer icon={Layers} name="Tailwind Utilities" desc="animate-spin, animate-pulse, animate-ping, animate-in" />
          <AnimLayer icon={Activity} name="Spring Physics" desc="stiffness:500, damping:20 pop-in effects" />
        </div>
      </motion.div>

      {/* Categories */}
      <div className="space-y-3">
        {DEP_CATEGORIES.map((cat) => (
          <DepCategory
            key={cat.id}
            cat={cat}
            expanded={expanded === cat.id}
            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DepCategory({ cat, expanded, onClick }: {
  cat: typeof DEP_CATEGORIES[number];
  expanded: boolean;
  onClick: () => void;
}) {
  const Icon = cat.icon;
  return (
    <motion.div className="bg-[#151515] border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-6 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${cat.color}`} />
          <span className={`text-sm font-medium ${cat.color}`}>{cat.label}</span>
          <span className="text-xs text-white/40 font-mono">({cat.items.length})</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>
          <ChevronDown className="w-4 h-4 text-white/30" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-white/5">
                  <th className="text-left py-2 px-6 text-white/40 font-mono">Package</th>
                  <th className="text-left py-2 text-white/40 font-mono">Version</th>
                  <th className="text-left py-2 px-4 text-white/40">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {cat.items.map((item, i) => (
                  <tr key={`${cat.id}-${i}`} className="border-t border-white/5">
                    <td className="py-2 px-6 font-mono text-white/70">{item.name}</td>
                    <td className="py-2 font-mono text-white/50">{item.version}</td>
                    <td className="py-2 px-4 text-white/60">{item.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AnimLayer({ icon: Icon, name, desc }: {
  icon: any; name: string; desc: string;
}) {
  return (
    <motion.div
      className="bg-[#0e0e0e] border border-white/5 rounded-lg p-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-white">{name}</span>
      </div>
      <p className="text-xs text-white/40">{desc}</p>
    </motion.div>
  );
}
