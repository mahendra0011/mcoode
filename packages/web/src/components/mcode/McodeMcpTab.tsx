import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Shield, Zap, AlertTriangle, Image, Database, Wifi, Settings, ChevronDown, ExternalLink } from 'lucide-react';
import { domainColor } from '../../../../shared/src/domains';

/**
 * mcodeMcpTab — Section 10 (MCP Servers).
 *
 * Shows all 3 MCP servers with their tools, security annotations,
 * constants, and browser backend types.
 */
export function McodeMcpTab() {
  const [expanded, setExpanded] = useState<string | null>('node_repl');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">MCP Servers</h2>
        <p className="text-sm text-white/40">3 MCP servers providing 46 tools. Security: high-risk tools require approval with system side-effect scope.</p>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Server Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">3</div>
            <div className="text-xs text-white/50">Servers</div>
          </div>
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">46</div>
            <div className="text-xs text-white/50">Total Tools</div>
          </div>
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">2</div>
            <div className="text-xs text-white/50">Browser Backends (iab, extension, cdp)</div>
          </div>
        </div>
      </motion.div>

      {/* node_repl server */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">1. node_repl (browser-use/0.2.1)</h3>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400 font-medium">High risk — needs approval, system side-effect scope</span>
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">#</th>
                <th className="text-left py-2 text-white/60 font-medium">Tool</th>
                <th className="text-left py-2 text-white/60 font-medium">Required Input</th>
                <th className="text-left py-2 text-white/60 font-medium">Optional</th>
                <th className="text-left py-2 text-white/60 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 text-white/40">1</td>
                <td className="py-1.5 text-white/80 font-mono">js</td>
                <td className="py-1.5 text-white/50">code (string), title (1–120)</td>
                <td className="py-1.5 text-white/50">timeout_ms (1–120000)</td>
                <td className="py-1.5 text-white/50">Run JS in fresh Node kernel for browser control</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/40">2</td>
                <td className="py-1.5 text-white/80 font-mono">js_add_node_module_dir</td>
                <td className="py-1.5 text-white/50">path OR dir (string)</td>
                <td className="py-1.5 text-white/50">—</td>
                <td className="py-1.5 text-white/50">Add node_modules directory to search roots</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/40">3</td>
                <td className="py-1.5 text-white/80 font-mono">js_reset</td>
                <td className="py-1.5 text-white/50">—</td>
                <td className="py-1.5 text-white/50">—</td>
                <td className="py-1.5 text-white/50">Compatibility barrier (kernel already fresh)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Image constants */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <McpConstant name="MCP_IMAGE_INLINE_BASE64_BYTES" value="200 * 1024" desc="Max inline base64 image" />
          <McpConstant name="MCP_IMAGE_INLINE_RAW_BYTES" value="150 * 1024" desc="Max inline raw image" />
          <McpConstant name="HOST_NODE_REPL_IMAGE_MAX_DIMENSION" value="2048" desc="Max image dimension" />
          <McpConstant name="HOST_NODE_REPL_MODEL_IMAGE_MAX_DIMENSION" value="2000" desc="Max model image dimension" />
        </div>

        {/* Browser backends */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-white/80 mb-2">Browser Backend Types</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <McpBackend name="iab" desc="In-app browser" />
            <McpBackend name="extension" desc="Chrome ext" />
            <McpBackend name="cdp" desc="Managed Chromium" />
          </div>
        </div>
      </motion.div>

      {/* android-emulator server */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">2. android-emulator (android-emulator/0.1.0) — 23 tools</h3>
        <p className="text-xs text-white/40 mb-2">Shared target schema: <code className="text-white/60">{"{ serial?, avd?, timeoutMs? }"}</code></p>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`| # | Tool | Input | Description
|---|------|-------|-------------|
| 1 | android_preflight | {} | Check SDK, adb, emulator, AVDs, Java, Gradle
| 2 | android_discover_project | {} | Find Gradle root, modules, manifest
| 3 | android_create_app | {name, packageName?, dir?, minSdk?, compileSdk?, overwrite?} | Create Kotlin/Compose app
| 4 | android_build_app | build2 | Build Gradle project
| 5 | android_build_and_run | build2 + launchActivity? | Build, install, launch
| 6 | android_list_devices | {} | List adb devices
| 7 | android_list_avds | {} | List AVDs
| 8 | android_start_emulator | {avd?, timeoutMs?} | Start GUI emulator
| 9 | android_stop_emulator | {serial (req)} | Stop emulator
| 10 | android_create_avd | {name?, packageId?, device?, force?} | Create AVD
| 11 | android_install_app | target + {apkPath} | Install APK
| 12 | android_launch_app | target + {applicationId, activity?} | Launch app
| 13 | android_terminate_app | target + {applicationId} | Force-stop
| 14 | android_open_url | target + {url} | Open URL
| 15 | android_screenshot | target + {path?} | PNG screenshot
| 16 | android_logs | target + {applicationId?, lines?, limit?} | Read logcat
| 17 | android_ui_status | {} | Report UI backend
| 18 | android_ui_describe | target | UI Automator tree
| 19 | android_ui_resolve | target + {query} | Resolve to coords
| 20 | android_ui_tap | target + {x, y} | Tap coordinates
| 21 | android_ui_swipe | target + {x1,y1,x2,y2, durationMs?} | Swipe
| 22 | android_ui_type_text | target + {text} | Enter text
| 23 | android_ui_keyevent | target + {key} | Press key (BACK/HOME/ENTER/APP_SWITCH/MENU/SEARCH)|`}
          </code>
        </div>
      </motion.div>

      {/* ios-simulator server */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">3. ios-simulator (ios-simulator/0.1.0) — 20 tools</h3>
        <p className="text-xs text-white/40 mb-2">Shared target schema: <code className="text-white/60">{"{ udid?, device?, runtime? }"}</code> — auto-boots simulator for install/launch/screenshot.</p>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`| # | Tool | Input | Description
|---|------|-------|-------------|
| 1 | ios_preflight | {} | Check macOS, Xcode, simctl
| 2 | ios_list_simulators | {} | List simulators
| 3 | ios_boot_simulator | target2 + {openSimulator?} | Boot simulator
| 4 | ios_show_simulator | {udid?} | Open Simulator app
| 5 | ios_discover_project | {} | Find .xcodeproj/.xcworkspace
| 6 | ios_create_app | {name, bundleId?, dir?, deployment?, overwrite?} | Create SwiftUI app
| 7 | ios_build_app | build2 | Build via xcodebuild
| 8 | ios_build_and_run | build2 + {launchArgs?} | Build, install, launch
| 9 | ios_install_app | target2 + {appPath} | Install .app (auto-boots)
| 10 | ios_launch_app | target2 + {bundleId, launchArgs?} | Launch (auto-boots)
| 11 | ios_terminate_app | target2 + {bundleId} | Terminate
| 12 | ios_open_url | target2 + {url} | Open URL (auto-boots)
| 13 | ios_screenshot | target2 + {path?, openSimulator?} | PNG (auto-boots)
| 14 | ios_logs | target2 + {bundleId?, seconds?, limit?} | Read logs
| 15 | ios_ui_status | {} | Report UI backend (idb)
| 16 | ios_ui_tap | target2 + {x, y, duration?} | Tap coordinates
| 17 | ios_ui_swipe | target2 + {x1,y1,x2,y2,delta?} | Swipe
| 18 | ios_ui_type_text | target2 + {text} | Enter text
| 19 | ios_ui_button | target2 + {button, duration?} | Press hardware button
| 20 | ios_ui_describe | target2 | Accessibility info via idb|`}
          </code>
        </div>
      </motion.div>
    </div>
  );
}

function McpConstant({ name, value, desc }: { name: string; value: string; desc: string }) {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <Database className="w-3 h-3 text-white/30" />
        <code className="text-xs text-white/60 font-mono">{name}</code>
      </div>
      <div className="text-xs text-white/50 mt-1">= {value}</div>
      <div className="text-[10px] text-white/30">{desc}</div>
    </div>
  );
}

function McpBackend({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-2.5 text-center">
      <code className="text-xs text-blue-400 font-mono block">{name}</code>
      <span className="text-[10px] text-white/40 block mt-0.5">{desc}</span>
    </div>
  );
}
