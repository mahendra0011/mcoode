import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Code, Smartphone, Globe, FileText, FileImage, FileType,
  ExternalLink, ChevronDown, Terminal, Sparkles, BarChart, Layers, Package
} from 'lucide-react';

/**
 * mcodeSkillsTab — Section 11 (Skills Catalog — All 15).
 *
 * Shows all 15 mcode skills organized by category:
 *   - mcode Guide (6): configuration-guide, diagnosing-commands, diagnosing-hooks,
 *     diagnosing-mcp, diagnosing-plugins, diagnosing-skills
 *   - Developer Tools (4): android-dev, control-browser, web-gui-tester, ios-dev
 *   - Document Skills (3): docx, pdf, pptx
 *   - Utilities (1): restore-legacy-sessions
 * Plus the skill-creator skill (total 14 cataloged + skill-creator itself = 15).
 */
export function McodeSkillsTab() {
  const [expanded, setExpanded] = useState<string | null>('control-browser');

  const skillCategories = [
    {
      name: 'mcode Guide Skills (6)',
      color: 'text-purple-400',
      icon: BookOpen,
      skills: [
        { id: 'mcode-configuration-guide', title: 'mcode-configuration-guide', icon: '⚙️', desc: 'Configuring MCP servers, slash commands, skills, hooks, plugins, or AGENTS.md. Scope: user (~/.mcode/cli/config.json), workspace (.mcode/config.json), AGENTS.md.' },
        { id: 'diagnosing-commands', title: 'diagnosing-commands', icon: '🔍', desc: 'When a slash command is missing, overridden, has parse error, or dropped. Root causes: not in list, shadowing, YAML error, unknown command.' },
        { id: 'diagnosing-hooks', title: 'diagnosing-hooks', icon: '🪝', desc: 'When a hook doesn\'t trigger, event name wrong, matcher mismatch, script not executable, or template vars not expanded.' },
        { id: 'diagnosing-mcp', title: 'diagnosing-mcp', icon: '🔌', desc: 'When MCP server won\'t connect, tools don\'t appear, disabled/failed. Root causes: missing config, crash, timeout, tool registration, transport mismatch.' },
        { id: 'diagnosing-plugins', title: 'diagnosing-plugins', icon: '📦', desc: 'When a plugin is not listed, install fails, enabled but skills/commands missing. Root causes: corrupted cache, extraction error, missing paths, suppressed.' },
        { id: 'diagnosing-skills', title: 'diagnosing-skills', icon: '🎯', desc: 'When a skill is not discovered, installed but doesn\'t trigger, shadowed, disabled, or frontmatter parse error.' },
      ]
    },
    {
      name: 'Developer Tools Skills (4)',
      color: 'text-blue-400',
      icon: Code,
      skills: [
        { id: 'android-dev', title: 'android-dev', icon: '🤖', desc: 'Build, run, inspect, and lightly automate Android apps. Workflow: preflight → discover → create → edit → build_and_run.', rules: 'Don\'t accept SDK licenses, enter passwords, wipe data, or delete AVDs without asking.' },
        { id: 'control-browser', title: 'control-browser', icon: '🌐', desc: 'Main-agent-only Browser Use. Open, navigate, inspect, test, click, type, fill, screenshot. Uses domSnapshot() as primary reading tool.', rules: 'Never guess selectors/URLs. Use networkidle→never. Persist tabs.' },
        { id: 'web-gui-tester', title: 'web-gui-tester', icon: '🧪', desc: 'Test web frontends via GUI black-box testing. 4-phase: Scenario Assessment → Test Env Prep → Test Execution → Conclusions.', rules: 'Screenshots mandatory for visual verification. Separate testing from fixing.' },
        { id: 'ios-dev', title: 'ios-dev', icon: '📱', desc: 'Build, run, inspect iOS SwiftUI apps. Workflow: preflight → boot_simulator → discover → create → build_and_run.', rules: 'Auto-boots for install/launch/screenshot. Never modify source ad-hoc.' },
      ]
    },
    {
      name: 'Document Skills (3)',
      color: 'text-amber-400',
      icon: FileText,
      skills: [
        { id: 'docx', title: 'docx', icon: '📝', desc: 'DOCX creation, editing, analysis with revisions, comments, formatting preservation. 15-point quality checker (postcheck.py).' },
        { id: 'pdf', title: 'pdf', icon: '📄', desc: 'Professional PDF toolkit — 4 workflows: reports (ReportLab), creative/posters (Playwright), academic/LaTeX (Tectonic), process. Iron rules: page.pdf() vector not screenshot, figures block-level, @page{margin:0}.' },
        { id: 'pptx', title: 'pptx', icon: '📊', desc: 'Inspect and narrowly update PPTX via fingerprint-checked OOXML references. Safety: sourceFingerprint, atomic temp+validate, ZIP bomb protection.' },
      ]
    },
    {
      name: 'Utilities (2)',
      color: 'text-emerald-400',
      icon: Package,
      skills: [
        { id: 'restore-legacy-sessions', title: 'restore-legacy-sessions', icon: '🔄', desc: 'Restore legacy ACP-era mcode sessions. Scripts: restore-conversation.mjs, scan-legacy-sessions.mjs (sqLite).' },
        { id: 'skill-creator', title: 'skill-creator', icon: '🎨', desc: 'Create, edit, and iterate local mcode skills. Core loop: Draft → Test (2-3 prompts) → Review → Improve → Repeat. Discovery roots: project/.mcode/skills → project/.agents/skills → ~/.mcode/skills → ~/.agents/skills.' },
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Skills Catalog (15)</h2>
        <p className="text-sm text-white/40">All 15 mcode skills organized by category — Guide (6), Developer Tools (4), Documents (3), Utilities (2).</p>
      </div>

      {/* Skill Discovery Order */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Skill Discovery Order (Highest Priority First)</h3>
        <div className="space-y-1.5">
          <DiscoveryStep step={1} label="Explicit skill/command plugin roots (from config)" />
          <DiscoveryStep step={2} label="User ~/.mcode/skills" />
          <DiscoveryStep step={3} label="User ~/.agents/skills" />
          <DiscoveryStep step={4} label="Workspace .mcode/skills (walks up to repo root)" />
          <DiscoveryStep step={5} label="Workspace .agents/skills" />
          <DiscoveryStep step={6} label="Enabled plugin roots (lowest priority)" />
        </div>
      </motion.div>

      {/* SKILL.md Format */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">SKILL.md Format</h3>
        <code className="text-xs text-white/70 block bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono">
          {`my-skill/
├── SKILL.md          (required: name + description frontmatter)
├── references/       (optional - extra docs on demand)
├── scripts/          (optional - helper scripts)
└── assets/           (optional - templates, fixtures)`}
        </code>
      </motion.div>

      {/* Skill Categories */}
      <AnimatePresence>
        {skillCategories.map((cat, catIdx) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + catIdx * 0.05 }}
              className="bg-[#151515] border border-white/5 rounded-xl p-6"
            >
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${cat.color}`}>
                <Icon className="w-4 h-4" />
                {cat.name}
              </h3>
              <div className="space-y-2">
                {cat.skills.map((skill, i) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (catIdx * 0.05) + (i * 0.03) }}
                    className="bg-[#0e0e0e] border border-white/5 rounded-xl overflow-hidden"
                  >
                    <motion.button
                      onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition"
                    >
                      <span className="text-lg flex-shrink-0">{skill.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{skill.title}</div>
                      </div>
                      <motion.div
                        animate={{ rotate: expanded === skill.id ? 90 : 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      </motion.div>
                    </motion.button>
                    <AnimatePresence initial={false}>
                      {expanded === skill.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="px-4 pb-3 pt-2 border-t border-white/5 text-xs">
                            <p className="text-white/50 mb-2">{skill.desc}</p>
                            {'rules' in skill && (
                              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
                                <ExternalLink className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                <span className="text-white/40">{skill.rules}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function DiscoveryStep({ step, label }: { step: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step * 0.05 }}
      className="flex items-center gap-3 group"
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: step * 0.05, type: 'spring', stiffness: 500, damping: 20 }}
      >
        {step}
      </motion.div>
      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{label}</span>
    </motion.div>
  );
}
