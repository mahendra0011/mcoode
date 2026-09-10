import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TestTube, FileCheck, Clipboard, CheckCircle, XCircle, AlertCircle,
  BarChart3, Bug, Shield, Archive, FileText, Play, Pause, SkipForward
} from 'lucide-react';

/**
 * mcodeTestsTab — Section 16 (Test Suite).
 *
 * Shows the complete mcode test suite: 13 Playwright E2E specs,
 * 9 Vitest unit test files, and 1 Python plugin test. Includes
 * test categories summary, run results, and detailed PPTX test breakdown.
 */
export function McodeTestsTab() {
  const [activeSuite, setActiveSuite] = useState<'e2e' | 'unit' | 'plugin'>('e2e');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Test Suite</h2>
        <p className="text-sm text-white/40">23 test files, ~97+ test cases across E2E (Playwright), unit (Vitest), and plugin (Python) suites.</p>
      </div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4"
      >
        <TestSummaryCard label="E2E (Playwright)" count="13 spec files" cases="60+ assertions" icon={FileCheck} color="text-blue-400" bg="bg-blue-500/10" />
        <TestSummaryCard label="Unit (Vitest)" count="9 test files" cases="34 cases" icon={TestTube} color="text-purple-400" bg="bg-purple-500/10" />
        <TestSummaryCard label="Plugin (Python)" count="1 file" cases="23 methods" icon={Shield} color="text-emerald-400" bg="bg-emerald-500/10" />
      </motion.div>

      {/* Suite Switcher */}
      <div className="flex gap-2">
        {[
          { id: 'e2e', label: 'E2E Specs' },
          { id: 'unit', label: 'Unit Tests' },
          { id: 'plugin', label: 'Plugin Tests' },
        ].map((s) => (
          <motion.button
            key={s.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveSuite(s.id as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSuite === s.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#0e0e0e] text-white/40 border border-white/5 hover:text-white/70'
            }`}
          >
            {s.label}
          </motion.button>
        ))}
      </div>

      {/* Test Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vitest */}
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-white">Vitest (root-level)</span>
            </div>
            <ul className="text-xs text-white/50 space-y-1">
              <li>• Runs: <code className="text-white/70">packages/**/tests/**/*.test.js</code></li>
              <li>• Pool: forks with v8 coverage</li>
              <li>• Coverage scoped to: <code className="text-white/70">packages/shared/src/**</code></li>
              <li>• Global globals: enabled</li>
              <li>• Root script: <code className="text-white/70">npm test → vitest run</code></li>
            </ul>
          </div>
          {/* Playwright */}
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-white">Playwright (packages/web)</span>
            </div>
            <ul className="text-xs text-white/50 space-y-1">
              <li>• webServer: <code className="text-white/70">npx vite --port 5175</code> (auto-start/stop)</li>
              <li>• Project: chromium (Desktop Chrome)</li>
              <li>• Reporter: HTML</li>
              <li>• Retries: 1 (CI: 2)</li>
              <li>• Timeout: 60s per test</li>
              <li>• Web script: <code className="text-white/70">npm test → playwright test</code></li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* E2E Specs */}
      {activeSuite === 'e2e' && (
        <motion.div
          key="e2e"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="bg-[#151515] border border-white/5 rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Playwright E2E Tests (13 Specs)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 text-white/60 font-medium">#</th>
                  <th className="text-left py-2 text-white/60 font-medium">File</th>
                  <th className="text-left py-2 text-white/60 font-medium">Focus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <SpecRow num={1} file="animations.spec.js" focus="Framer Motion usage, motion.button not plain button, fieldVariants, no GSAP" />
                <SpecRow num={2} file="chat-animations.spec.js" focus="ThinkingIndicator, ChatMessage, MessageContent, react-markdown, 3-view consistency" />
                <SpecRow num={3} file="chat-flow.spec.js" focus="Slash commands (/), /help, /clear, /god, /undo, /model, /watch, /debug, /export" />
                <SpecRow num={4} file="chat-mode.spec.js" focus="Empty state (SVG spinner 3s), ThinkingIndicator, cursor blink, stagger delays" />
                <SpecRow num={5} file="ai-chat.spec.js" focus="AIChatPage render, sidebar, tabs, God Mode toggle, file upload" />
                <SpecRow num={6} file="advanced-mode.spec.js" focus="Mode toggle styling, God Mode, AI Code Agent IDE layout" />
                <SpecRow num={7} file="components.spec.js" focus="Header animations, FeaturesGrid, Testimonials, IDE components" />
                <SpecRow num={8} file="landing.spec.js" focus="h1, CTA (motion.button), hero, features, footer, nav links" />
                <SpecRow num={9} file="auth.spec.js" focus="LoginPage, SignupPage, Google OAuth, OTP flow (6 inputs + dev code)" />
                <SpecRow num={10} file="chat-search-real.spec.js" focus="Real login + web search → SearchResultBlock, SourcePillRow, SourcesPanel" />
                <SpecRow num={11} file="settings.spec.js" focus="SettingsPage tabs ≥4, God-Mode tab, motion buttons, toggle switches" />
                <SpecRow num={12} file="settings-models.spec.js" focus="ApiKeysTab (providers search, static catalog, gradient border), UsageTab (real data, heatmap ≥10 cells)" />
                <SpecRow num={13} file="terminal-check.spec.ts" focus="terminal:write events → xterm, content + dimensions" />
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Unit Tests */}
      {activeSuite === 'unit' && (
        <motion.div
          key="unit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-6"
        >
          <UnitTestSection
            title="CLI Tests (packages/cli/tests/)"
            tests={[
              { file: 'router.test.js', count: 4, focus: 'ModelRouter: mock:mock for all domains, rate-limiting (61 reqs→null), excludes, routing overrides' },
              { file: 'undo-thread.test.js', count: 8, focus: 'Undo ID threading: write_file/edit_file return undoId, read_file does NOT, LIFO fallback' },
              { file: 'vault.test.js', count: 7, focus: 'AES-256-GCM, legacy pre-salt vaults, corrupt backup, maskSecret' },
            ]}
          />
          <UnitTestSection
            title="Shared Tests (packages/shared/tests/)"
            tests={[
              { file: 'domains.test.js', count: 3, focus: 'Routing table, ends with mock:mock, domain colors' },
              { file: 'plan.test.js', count: 7, focus: 'normalizeTodo/Plan, validatePlan, findCycle (DAG), planWaves, isEligible, mergeResults' },
              { file: 'plugins.test.js', count: 5, focus: 'Registry ≥40 plugins, category/description/config validation, listPlugins filter' },
            ]}
          />
          <UnitTestSection
            title="Backend Tests (packages/backend/tests/)"
            tests={[
              { file: 'auth-otp.test.js', count: 8, focus: 'OTP flow: send-otp, signup/duplicate, verify, wrong OTP, login intent' },
              { file: 'db.test.js', count: 3, focus: 'Memory storage: CRUD, ///sorting, isolation per model' },
              { file: 'sockets.test.js', count: 4, focus: 'Socket.IO: CLI→web forwarding, build:complete, watch:fix, token rejection' },
            ]}
          />
        </motion.div>
      )}

      {/* Plugin Tests */}
      {activeSuite === 'plugin' && (
        <motion.div
          key="plugin"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] } }
          className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-6"
        >
          <div>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">PPTX Test Details (test_pptx_reference.py, 467 lines)</h3>
            <p className="text-xs text-white/40">23 test methods across 6 categories (22 active + 1 Windows-skipped):</p>
          </div>

          <PluginTestSection
            title="Fingerprint validation (5 tests)"
            tests={[
              'test_inspects_shape_by_fingerprint_slide_part_and_node_id',
              'test_updates_shape_text_through_validated_temporary_output',
              'test_updates_exact_table_cell',
              'test_updates_multiple_references_from_one_source_revision',
              'test_user_context_does_not_change_full_text_fingerprint_guards',
              'test_inspect_resolves_the_same_bytes_that_were_fingerprinted',
              'test_batch_updates_the_same_bytes_that_were_fingerprinted',
            ]}
          />

          <PluginTestSection
            title="Archive security (6 tests)"
            tests={[
              'test_fails_closed_on_changed_source_without_output',
              'test_fails_closed_on_ambiguous_node_id',
              'test_fails_closed_on_text_or_cell_coordinate_conflict',
              'test_rejects_non_pptx_source_and_output_paths',
              'test_rejects_archive_before_reading_when_compressed_source_exceeds_limit',
              'test_rejects_entry_count_single_entry_total_and_media_limits',
              'test_rejects_high_compression_ratio',
              'test_rejects_duplicate_and_abnormal_entry_names',
              'test_rejects_nul_in_raw_entry_name',
            ]}
            warning="Tests may not run on Windows (skipped)"
          />

          <PluginTestSection
            title="Temporary file safety (3 tests)"
            tests={[
              'test_limit_failure_does_not_create_output_or_leave_temporary_file',
              'test_copy_failure_removes_temporary_file',
              'test_atomic_replace_preserves_existing_output_permissions',
            ]}
          />

          <PluginTestSection
            title="CLI/output contract (4 tests)"
            tests={[
              'test_cli_json_contract_is_serializable',
              'test_cli_reports_stable_zip_limit_reason',
              'test_cli_reports_stable_invalid_zip_entry_reason',
            ]}
          />

          <PluginTestSection
            title="Bounded read safety (1 test)"
            tests={['test_update_streams_zip_entries_without_unbounded_reads']}
          />

          {/* Error types & ZIP limits */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />Error Types</h4>
              <ul className="text-xs text-white/50 space-y-1">
                <li><code className="text-white/70">PptxArchiveLimitError</code> — archive bytes, entries, entry bytes, total uncompressed, media bytes, compression ratio</li>
                <li><code className="text-white/70">PptxInvalidArchiveError</code> — duplicate entries, path traversal, absolute paths, backslashes, NUL bytes</li>
                <li><code className="text-white/70">PptxReferenceConflict</code> — fingerprint, ambiguous, text fingerprint, coordinate</li>
              </ul>
            </div>
            <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-2"><Archive className="w-3.5 h-3.5" />ZIP Limit Constants</h4>
              <ul className="text-xs text-white/50 space-y-1">
                <li><code className="text-white/70">max_archive_bytes</code></li>
                <li><code className="text-white/70">max_entries</code></li>
                <li><code className="text-white/70">max_entry_uncompressed_bytes</code></li>
                <li><code className="text-white/70">max_total_uncompressed_bytes</code></li>
                <li><code className="text-white/70">max_media_bytes</code></li>
                <li><code className="text-white/70">max_compression_ratio</code></li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Run Results */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Test Run Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">Suite</th>
                <th className="text-left py-2 text-white/60 font-medium">Status</th>
                <th className="text-left py-2 text-white/60 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 text-white/80">Root (npm test)</td>
                <td className="py-1.5"><span className="text-red-400">Failed</span></td>
                <td className="py-1.5 text-white/50">33 failed tests</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/80">Web (.last-run.json)</td>
                <td className="py-1.5"><span className="text-emerald-400">Passed</span></td>
                <td className="py-1.5 text-white/50">0 failures</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/80">Chat flow e2e</td>
                <td className="py-1.5"><span className="text-amber-400">Partial</span></td>
                <td className="py-1.5 text-white/50">Error context files exist</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function TestSummaryCard({ label, count, cases, icon: Icon, color, bg }: {
  label: string; count: string; cases: string; icon: any; color: string; bg: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-[#0e0e0e] ${bg} border border-white/5 rounded-xl p-4 text-center`}
    >
      <div className="flex justify-center mb-2">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="text-xl font-bold text-white">{count}</div>
      <div className="text-xs text-white/40 mt-0.5">{cases}</div>
      <div className="text-xs text-white/60 mt-1">{label}</div>
    </motion.div>
  );
}

function SpecRow({ num, file, focus }: { num: number; file: string; focus: string }) {
  return (
    <tr>
      <td className="py-2 text-white/40 font-mono">{num}</td>
      <td className="py-2 text-white/80 font-mono">{file}</td>
      <td className="py-2 text-white/50">{focus}</td>
    </tr>
  );
}

function UnitTestSection({ title, tests }: {
  title: string;
  tests: Array<{ file: string; count: number; focus: string }>;
}) {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
      <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2 text-xs">
        {tests.map(t => (
          <div key={t.file} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <TestTube className="w-3 h-3 text-purple-400" />
              <code className="text-white/70">{t.file}</code>
            </div>
            <span className="text-xs text-emerald-400 font-medium">{t.count} tests</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PluginTestSection({ title, tests, warning }: {
  title: string;
  tests: string[];
  warning?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">{title}</h4>
        {warning && <span className="text-xs text-amber-400">⚠ {warning}</span>}
      </div>
      <div className="space-y-1">
        {tests.map(t => (
          <div key={t} className="text-xs text-white/40 font-mono break-all">
            <CheckCircle className="w-3 h-3 inline mr-1 text-white/30" />{t}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Re-export the layer switcher state for the parent
export const TestLayer = { TestTube, FileCheck, Shield };
