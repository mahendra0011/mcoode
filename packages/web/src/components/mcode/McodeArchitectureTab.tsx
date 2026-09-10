import React from 'react';
import { motion } from 'framer-motion';
import {
  Server, Globe, Database, Shield, Zap, GitBranch,
  Package, Users, HardDrive, Cpu, Layers, Network, FileCode
} from 'lucide-react';

/**
 * mcodeArchitectureTab — Sections 1 (Architecture Overview),
 * 3 (Electron Desktop App), and 5 (Process Architecture) from the
 * mcode Knowledge Base.
 *
 * Shows the 4-process Electron architecture, the 37 host services,
 * the preload contextBridge bridge, and key file paths.
 */
export function McodeArchitectureTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Architecture Overview</h2>
        <p className="text-sm text-white/40">mcode Desktop App v3.7.6 — Electron + React 19 + Vite</p>
      </div>

      {/* 4-Process Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Four-Process Architecture</h3>
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-semibold text-white">Main Process</h4>
            </div>
            <p className="text-xs text-white/40 mb-2">index.js (1043 KB)</p>
            <ul className="text-xs text-white/50 space-y-1">
              <li>• App lifecycle (app.whenReady, app.on activate)</li>
              <li>• BrowserWindow creation</li>
              <li>• IPC handlers</li>
              <li>• Protocol handlers</li>
              <li>• Spawns scheduler + host processes</li>
              <li>• Crash reporting (crashReporter)</li>
            </ul>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-white">Renderer</h4>
            </div>
            <p className="text-xs text-white/40 mb-2">React 19 (757 JS files)</p>
            <ul className="text-xs text-white/50 space-y-1">
              <li>• index.html (7.3 KB — startup animation)</li>
              <li>• assets/index-ABImDspU.js (37 services via React context)</li>
              <li>• styles-CdEGpc2x.js (4.5 MB — main bundle)</li>
              <li>• styles-BxSv8qTx.css (366 KB — Tailwind)</li>
            </ul>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-semibold text-white">Host Process</h4>
            </div>
            <p className="text-xs text-white/40 mb-2">index.js (1.5 MB, 1503 lines)</p>
            <ul className="text-xs text-white/50 space-y-1">
              <li>• 37 mcode services (ESM context)</li>
              <li>• ChannelServer over MessagePort</li>
              <li>• Task scheduling & execution</li>
              <li>• File ops, git, search, terminal, model providers</li>
            </ul>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-white">Scheduler</h4>
            </div>
            <p className="text-xs text-white/40 mb-2">SQLite-based</p>
            <ul className="text-xs text-white/50 space-y-1">
              <li>• Cron-based automation</li>
              <li>• SQLite DatabaseSync</li>
              <li>• Hash computation & file ops</li>
            </ul>
          </motion.div>
        </div>
      </motion.div>

      {/* Preload Bridge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Preload Bridge (contextBridge)</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`contextBridge.exposeInMainWorld("mcode", {
  connectRemote, cancelPendingRemoteConnection,
  startWebRemoteControl, stopWebRemoteControl,
  log, selectDirectory, selectFile, selectFiles, saveFile,
  printPageToPdf, getPathForFile, createTempTextAttachment,
  onRemoteConnectionLog, onRemoteSessionClosed, ...
});
contextBridge.exposeInMainWorld("__mcode_DEVICE_ID__", deviceId);`}
          </code>
        </div>
      </motion.div>

      {/* Key Paths */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Key Paths</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <HardDrive className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-white/50">Desktop app:</span>
              <code className="text-white/70 block">app-extracted/out/</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileCode className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-white/50">CLI bundle:</span>
              <code className="text-white/70 block">mcode.cjs (3,641 lines)</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-white/50">Model catalog:</span>
              <code className="text-white/70 block">model-providers/*.json</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-white/50">Plugins cache:</span>
              <code className="text-white/70 block">~/.mcode/cli/plugins/cache/</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-white/50">v2 config:</span>
              <code className="text-white/70 block">~/.mcode/v2/</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-white/50">Project docs:</span>
              <code className="text-white/70 block">docs/cli/, docs/web/</code>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 37 Services Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
          Host Process — 37 Services
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {[
            'settingService', 'credentialService', 'oauthCredentialRepo',
            'modelProviderService', 'apiClient', 'gitService', 'fileService',
            'mcodeAgentService', 'mcodeTaskService', 'usageStatsService',
            'searchService', 'shellService', 'telemetryService',
            'pluginService', 'hookService', 'skillService', 'mcpService',
            'sessionService', 'toolService', 'webSearchService', 'webFetchService',
            'terminalService', 'processMonitorService', 'workspaceService',
            'authService', 'conversationService', 'taskService',
            'projectMemoryService', 'rewindService', 'compactService',
            'forkService', 'expertService', 'workflowService',
            'localeService', 'localePreferenceService',
            'themeService', 'notificationService',
            'downloadService', 'updateService', 'configService',
            'agentRuntimeService', 'mcpGatewayService',
            'documentPreviewService', 'processManagerService',
          ].map(svc => (
            <motion.div
              key={svc}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0e0e0e] border border-white/5 rounded-lg px-3 py-1.5 text-white/60"
            >
              {svc}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
