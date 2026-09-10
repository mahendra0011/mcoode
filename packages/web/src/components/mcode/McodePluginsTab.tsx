import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Terminal, Globe, FileText, Code, Layers,
  ExternalLink, ChevronDown, Users, Server, Shield, Settings
} from 'lucide-react';

/**
 * mcodePluginsTab — Section 9 (Plugin System).
 *
 * Shows the 7 active plugins with categories, tool counts, features,
 * the plugin cache directory structure, manifest format, marketplaces,
 * and seed files.
 */
export function McodePluginsTab() {
  const [expanded, setExpanded] = useState<string | null>('android-emulator');

  const plugins = [
    { id: 'android-emulator', version: '0.1.0', category: 'developer-tools', lang: 'TS', features: ['skills', 'commands', 'MCP(23 tools)', 'userConfig(7)', 'hooks'] },
    { id: 'browser-use', version: '0.2.1', category: 'developer-tools', lang: 'TS/ESM', features: ['skills', 'MCP node_repl(3 tools)'] },
    { id: 'document-skills', version: '0.1.0', category: 'productivity', lang: 'TS+Python', features: ['skills (docx, pdf, pptx)', 'Python scripts'] },
    { id: 'ios-simulator', version: '0.1.0', category: 'developer-tools', lang: 'TS', features: ['skills', 'commands', 'MCP(20 tools)', 'userConfig(2)', 'hooks'] },
    { id: 'restore-legacy-sessions', version: '0.1.0', category: 'utilities', lang: 'JS', features: ['skills', 'commands'] },
    { id: 'skill-creator', version: '0.1.0', category: 'developer-tools', lang: 'TS', features: ['skill-creator skill'] },
    { id: 'mcode-guide', version: '0.1.0', category: 'guides', lang: 'TS', features: ['6 diagnosing/guide skills'] },
  ];

  const categoryColors: Record<string, string> = {
    'developer-tools': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'productivity': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'utilities': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    'guides': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  const langColors: Record<string, string> = {
    'TS': 'text-blue-400',
    'TS/ESM': 'text-cyan-400',
    'TS+Python': 'text-amber-400',
    'JS': 'text-yellow-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Plugin System</h2>
        <p className="text-sm text-white/40">7 active plugins across developer-tools, productivity, utilities, and guides categories.</p>
      </div>

      {/* Plugin Inventory */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Plugin Inventory</h3>
        <div className="space-y-3">
          {plugins.map((plugin, i) => (
            <motion.div
              key={plugin.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#0e0e0e] border border-white/5 rounded-xl overflow-hidden"
            >
              <motion.button
                onClick={() => setExpanded(expanded === plugin.id ? null : plugin.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-white/30" />
                  <div>
                    <span className="text-sm font-medium text-white">{plugin.id}</span>
                    <span className="text-xs text-white/40 ml-2">v{plugin.version}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[plugin.category]}`}>
                    {plugin.category}
                  </span>
                  <span className={`text-xs font-mono ${langColors[plugin.lang] || 'text-white/40'}`}>{plugin.lang}</span>
                </div>
                <motion.div animate={{ rotate: expanded === plugin.id ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </motion.div>
              </motion.button>
              <AnimatePresence initial={false}>
                {expanded === plugin.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-4 py-3 border-t border-white/5">
                      <div className="text-xs text-white/40 space-y-2">
                        {plugin.features.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-white/30" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Plugin Cache Structure */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Plugin Cache Structure</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`~/.mcode/cli/plugins/cache/mcode-plugins-official/
├── android-emulator/0.1.0/
│   ├── .mcode-plugin/plugin.json   # MCP, commands, userConfig manifest
│   ├── dist/mcp/server.js          # 41K lines bundled MCP server
│   ├── dist/lib/result.js          # content helpers
│   ├── dist/lib/run.js             # child-process spawn
│   ├── dist/lib/path.js            # data-dir resolution
│   ├── scripts/build-mcp.mjs       # esbuild bundling
│   ├── skills/android-dev/SKILL.md
│   ├── commands/android-dev.md
│   ├── hooks/hooks.json            # {"hooks": {}}
│   └── .mcp.json
├── browser-use/0.2.1/
│   ├── dist/mcp/server.js          # 139K lines node_repl MCP
│   ├── scripts/browser-client.mjs   # browser runtime entry
│   ├── skills/control-browser/SKILL.md
│   └── skills/web-gui-tester/SKILL.md
├── document-skills/0.1.0/
│   ├── skills/docx/ (SKILL.md, scripts/, tests/)
│   ├── skills/pdf/ (SKILL.md 919 lines, scripts/, briefs/)
│   └── skills/pptx/ (SKILL.md, scripts/, tests/test_pptx_reference.py)
├── ios-simulator/0.1.0/            # same structure as android-emulator
├── restore-legacy-sessions/0.1.0/
│   ├── scripts/restore-conversation.mjs
│   ├── scripts/scan-legacy-sessions.mjs
│   └── skills/restore-legacy-sessions/SKILL.md
├── skill-creator/0.1.0/
└── mcode-guide/0.1.0/
    ├── skills/mcode-configuration-guide/SKILL.md
    ├── skills/diagnosing-commands/SKILL.md
    ├── skills/diagnosing-hooks/SKILL.md
    ├── skills/diagnosing-mcp/SKILL.md
    ├── skills/diagnosing-plugins/SKILL.md
    └── skills/diagnosing-skills/SKILL.md`}
          </code>
        </div>
      </motion.div>

      {/* Plugin Manifest Format */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Plugin Manifest Format (plugin.json)</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`{
  "name": "plugin-name",
  "version": "0.1.0",
  "description": "...",
  "author": {"name": "Z.ai"},
  "license": "MIT",
  "skills": "skills",              // optional — path to skills dir
  "commands": "commands",          // optional — path to commands dir
  "mcpServers": { ... },           // optional — MCP server manifests
  "userConfig": { ... },           // optional — user config schema
  "hooks": "hooks",                // optional — path to hooks/hooks.json
  "agents": "agents"               // optional — agent definitions
}`}
          </code>
        </div>
      </motion.div>

      {/* Marketplaces */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Marketplaces</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">Marketplace</th>
                <th className="text-left py-2 text-white/60 font-medium">Source</th>
                <th className="text-left py-2 text-white/60 font-medium">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 text-white/80 font-mono">mcode-plugins-official</td>
                <td className="py-1.5 text-white/50">URL</td>
                <td className="py-1.5 text-white/50 break-all">https://cdn-mcode.z.ai/mcode/official-plugin/marketplace.json</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/80 font-mono">claude-plugins-official</td>
                <td className="py-1.5 text-white/50">GitHub</td>
                <td className="py-1.5 text-white/50">anthropics/claude-plugins-official</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Seed Files & Build Setup */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Seed Files (.mcode-plugin-seed.json)</h3>
          <code className="text-xs text-white/70 block bg-[#0a0a0a] border border-white/5 rounded-lg p-3">
            {`{"version": 1, "source": "filesystem",
  "hash": "sha256:...",
  "marketplace": "mcode-plugins-official",
  "plugin": "plugin-name",
  "pluginVersion": "0.1.0"}`}
          </code>
        </div>
        <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Build Setup</h3>
          <code className="text-xs text-white/70 block bg-[#0a0a0a] border border-white/5 rounded-lg p-3">
            {`{
  "type": "module",
  "main": "./dist/mcp/server.js",
  "scripts": {
    "build": "tsc && node scripts/build-mcp.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run test",
    "lint": "oxlint src"
  }
}`}
          </code>
        </div>
      </motion.div>
    </div>
  );
}
