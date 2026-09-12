# ZCode Icons Reference

Complete documentation of all icons used in the ZCode application, including tool type mappings, key component icons, icon color variables, and where each icon renders in the UI.

---

## 📁 Icon Source

All icons come from the `lucide-react` library (v0.469.0). Custom ZCode-specific icons (like the app logo) are rendered as text or inline SVG.

```typescript
// Standard import pattern
import { BrainCircuit, Sparkles } from 'lucide-react';

// Aliased imports (for same-named icons from different libraries)
import { Terminal as TerminalIcon } from 'lucide-react';
```

---

## 🎯 Tool Type Icon Mapping (mcodeUX.tsx)

The `ICONS` object in `packages/web/src/components/chat/mcodeUX.tsx` maps tool execution types to their Lucide icons. This is used by `ToolCallCard` to display the appropriate icon next to each tool name:

| Tool Type Key | Lucide Icon | Used For |
|---------------|-------------|----------|
| `explored` | `FolderSearch` | `read_file`, `list_files`, `search_code`, default tool type |
| `searched` | `Search` | `web_search`, `web_fetch` |
| `ran` | `Terminal` | `run_shell`, `run_tests` |
| `wrote` | `FileText` | `write_file` |
| `updated` | `Pencil` | `edit_file` |

**Fallback**: If a tool type is not found in the `ICONS` map, `FolderSearch` is used as the default.

### Component Usage

```typescript
// In ToolCallCard (mcodeUX.tsx)
const Icon = (ICONS[type as IconKey] ?? FolderSearch);
// Renders as: <Icon size={14} className="text-emerald-400" />
```

```typescript
// In StepCard (StepCards.tsx), the type is derived from the tool:
// read_file → type='explored' → FolderSearch
// web_search → rendered via WebSearchAnimation (bypasses StepCard)
// web_fetch → rendered via WebFetchAnimation (bypasses StepCard)
// write_file → type='wrote' → FileText
// edit_file → type='updated' → Pencil
// run_shell → type='ran' → Terminal
// list_files/search_code → type='searched' → Search
```

---

## 🧠 Key Component Icons

### ThinkingIndicator / AgentActionSequence

| Component | Icon | Color | Size | Purpose |
|-----------|------|-------|------|---------|
| `ThinkingIndicator` | `BrainCircuit` | `text-white/40` (Tailwind class) | `w-4 h-4` | Brain icon next to "Thinking..." gradient text |
| `AgentActionSequence` | `BrainCircuit` | `var(--mcode-green, #3ecf8e)` | `size={14}` | Brain icon next to "Working for Xs" timer |
| `AgentActionSequence` | `StepPulse` (custom) | `var(--mcode-green, #3ecf8e)` | 6×6px circle | Emerald pulsing dot (CSS animation: 1.1s ease-in-out infinite) |

**Note:** The Chat tab uses `AgentActionSequence` (which includes `BrainCircuit` in emerald green). The `ThinkingIndicator` component still exists (`components/chat/ThinkingIndicator.tsx`) but was replaced by `AgentActionSequence` in the Chat tab.

### SpinnerBlock

| Element | Icon/Symbol | Color | Animation | Purpose |
|---------|-------------|-------|-----------|---------|
| Spinner frame | `● ◐ ◓ ◑ ◒` | `text-emerald-400` | 80ms interval rotation | IDE spinner (5 frames at 80ms intervals) |
| Label | Text | Same as spinner | — | "Running…" (tool) or "Ready…" (empty state) |

### ReactionBurst

| Element | Icon/Symbol | Color | Animation | Purpose |
|---------|-------------|-------|-----------|---------|
| Pop icon | Dynamic (`✓`, `✗`) | `text-emerald-400` | CSS `mcode-reaction-pop` keyframe (250ms) | Primary burst emoji |
| 6 particles | 1×1px circles | `bg-emerald-400` | Stagger + radiate (500ms, 60° separation) | Particle explosion ring |

### ChatMessage

| Context | Icon | Color | Size | Purpose |
|---------|------|-------|------|---------|
| User avatar | `M` (text badge) | `text-emerald-400` bg `bg-emerald-500/10` | 6×6 circle | User message avatar in agent mode |
| Assistant avatar | `M` (text badge) | `text-white/60` bg `border-white/10` | 5×5 circle | Assistant message avatar |
| Streaming cursor | Inline block | `bg-emerald-400` | 1.5×3.5px | Blinking cursor at end of streaming text |
| Tool accordion | `Cpu` or `Wrench` | `text-emerald-400` or `text-white/50` | `w-3.5 h-3.5` | Running status indicator in ToolCallAccordion |

---

## 🎨 Icon Color Variables

Icons in the ZCode app use CSS custom properties defined in `styles/index.css`:

| Variable | Value | Used For |
|----------|-------|----------|
| `--mcode-green` | `#3ecf8e` | StepPulse, BrainCircuit in AgentActionSequence, spinner color, accent elements |
| `--mcode-text-dim` | `#8b8d98` | Dim secondary text and icons (less prominent) |
| `--mcode-accent` | `#6c8cff` | Primary accent (links, active states) |
| `--mcode-text` | `#e6e6ea` | Primary text |
| `--mcode-border` | `#26272f` | Border colors |

### Tailwind Color Overrides

| Tailwind Class | Hex | Usage |
|----------------|-----|-------|
| `text-emerald-400` | `#38b383` | Icons, spinner text, success states |
| `text-emerald-500` | `#10b981` | Active toggles, success accents |
| `text-emerald-300` | `#6ee7b7` | Active toggle text |
| `text-emerald-500/10` | rgba(16, 185, 129, 0.1) | Avatar backgrounds |
| `text-blue-400` | `#60a5fa` | Blue context info |
| `text-purple-400` | `#a78bfa` | Purple context info |
| `text-amber-400` | `#fbbf24` | Amber context info |
| `text-red-400` | `#f87171` | Error states |

---

## 📋 Full Icon Inventory (All Icons Used in Codebase)

### Sidebar / Navigation
| Icon | Component | Purpose |
|------|-----------|---------|
| `Settings` | SettingsPage, SIDEBAR_SECTIONS | Settings page navigation |
| `Database` | SettingsPage | Data & Statistics section |
| `Users` | SettingsPage | Agent Capabilities section |
| `GitBranch` | SettingsPage, AIChatPage | Plugins & MCP section, branch dropdown |
| `Key` | SettingsPage, McodeMcpTab | API Keys / model providers |
| `Globe` | SettingsPage | Network & System section |
| `BarChart3` | SettingsPage | Usage stats |
| `Shield` | McodeMcpTab, McodeSettingsTab | Permissions / security |
| `Layers` | McodeArchitectureTab, AIChatPage | Architecture / view layers |
| `Activity` | McodeSettingsTab, AIChatPage | Activity/waves indicator |
| `Cpu` | McodeDependenciesTab, AIChatPage | CPU/tools indicator |
| `Terminal` | McodeDependenciesTab, StepPulse | Terminal / shell |
| `FileText` | McodeDependenciesTab | File/document type |
| `Cloud` | McodeMcpTab | Cloud/remote |
| `Server` | McodeMcpTab | Server configuration |
| `Plug` | McodePluginsTab | Plugin connection |

### Chat & AI
| Icon | Component | Purpose |
|------|-----------|---------|
| `BrainCircuit` | ThinkingIndicator, AgentActionSequence, ThoughtBlock | Brain/thinking indicator |
| `CircleDashed` | ThoughtBlock | Collapsed thought state |
| `ChevronRight` | ThoughtBlock, StepCards | Expand/collapse chevron |
| `ChevronDown` | AIChatPage, SettingsPage | Dropdown indicators |
| `Sparkles` | AIChatPage | AI/sparkle effects |
| `Play` | SparkleButton, WaveProgress | Play/watch mode |
| `Pause` | SparkleButton | Pause watch mode |
| `Send` | AIChatPage, mcodeUX | Send message button |
| `Paperclip` | mcodeUX | Attach file |
| `ShieldCheck` | mcodeUX | Shield/permission |
| `Search` | AIChatPage, StepCards | Search functionality |
| `Copy` | MessageContent, StepPulse | Copy to clipboard |
| `Check` | MessageContent | Copied confirmation |
| `Loader2` | AIChatPage | Loading spinner (upload, etc.) |
| `ArrowUpRight` | StepPulse | Flow/indicator |
| `ArrowDownRight` | StepPulse | Flow/indicator |
| `MousePointerClick` | AIChatPage | Computer use click |
| `Workflow` | AIChatPage | Workflow/god mode |
| `Zap` | AIChatPage, McodeGitToolsTab | God mode activation |
| `Rocket` | AIChatPage | Launch/deploy |
| `Clock` | AIChatPage, StepPulse | Time/duration |
| `CheckCircle` | StepPulse, AIChatPage | Success state |
| `CheckCircle2` | StepPulse | Success state (alt) |
| `AlertCircle` | AIChatPage | Warning/error |
| `AlertTriangle` | AIChatPage | Alert |
| `X` | AIChatPage, SettingsPage | Close/clear |
| `XCircle` | StepPulse | Error state |
| `Eye` / `EyeOff` | SettingsPage | Show/hide password |
| `Trash2` | SettingsPage | Delete |
| `Edit2` | SettingsPage | Edit |
| `Plus` | AIChatPage | Add |
| `Box` | AIChatPage | Settings box |
| `RefreshCw` | SettingsPage, AIChatPage | Refresh/reload |
| `ExternalLink` | McodeMcpTab | External link |
| `UploadCloud` | AIChatPage | Upload folder |
| `FolderUp` | AIChatPage | Folder upload |
| `Monitor` | AIChatPage | Monitor/system |
| `Mail` | SettingsPage | Email/account |
| `CalendarCheck` | StepPulse | Calendar/checked |
| `Users` | StepPulse | Users |
| `ToggleLeft` / `ToggleRight` | McodeSettingsTab | Toggle switches |
| `Code` | StepPulse | Code |
| `Image` | McodeMcpTab | Image |
| `FileCode` | StepPulse | File code |
| `FileJson` | StepPulse | JSON file |
| `File` / `FileIcon` | StepPulse | Generic file |
| `FileType2` | StepPulse | File type |
| `Wifi` | McodeMcpTab | Network |
| `Circle` | StepPulse | Status indicator |

---

## 📍 Icon Locations Summary

| Icon | Primary Location | Secondary Locations |
|------|------------------|----------------------|
| `BrainCircuit` | `AgentActionSequence.tsx:37` | `ThinkingIndicator.tsx:46`, `ThoughtBlock.tsx:42` |
| `FolderSearch` | `ToolCallCard` (via ICONS map) | `StepCard` for read/list/search tools |
| `Search` | `ICONS` map (web_search) | `AIChatPage` search button |
| `Terminal` | `ICONS` map (shell commands) | `BottomPanel`, `RunDebugPanel` |
| `FileText` | `ICONS` map (write_file) | `StepCard` file results |
| `Pencil` | `ICONS` map (edit_file) | `StepCard` edit results |
| `Loader2` | `AIChatPage` upload button | `SettingsPage` saving state |
| `Sparkles` | `SparkleButton.tsx` | `AIChatPage` mode toggle |
| `Zap` | `AIChatPage` god mode toggle | `McodeGitToolsTab` |
| `Activity` | `WaveProgress` | `AIChatPage` god mode waves |
| `ChevronDown` | `AIChatPage` dropdown | `SettingsPage` select |
| `Send` | `mcodeUX.tsx` AgentInputBar | Not used (AgentInputBar is dead code) |
| `Paperclip` | `mcodeUX.tsx` AgentInputBar | Not used (AgentInputBar is dead code) |

---

## 📂 Icon File Sources

| Component File | Icons Imported | Status |
|----------------|----------------|--------|
| `chat/ThinkingIndicator.tsx` | `BrainCircuit` | Orphaned (not imported) |
| `chat/AgentActionSequence.tsx` | `BrainCircuit` | ✅ Live in AIChatPage |
| `chat/mcodeUX.tsx` | `Search, Terminal, FileText, Pencil, FolderSearch, Send, Paperclip, ShieldCheck, ChevronDown` | `Send` + `Paperclip` only used in `AgentInputBar` (dead code) |
| `chat/SpinnerBlock.tsx` | None | ✅ Live |
| `chat/ReactionBurst.tsx` | None | ✅ Live |
| `ide/StepCards.tsx` | None (imports from mcodeUX) | ✅ Live |
| `mcode/McodeAnimationsTab.tsx` | `Layers, Zap, Sparkles, Code, BarChart3, CheckCircle, Terminal, GitBranch, Activity, Timer, ChevronDown, Play, Pause, Square, MousePointerClick` | Dead code (not routed) |
| `mcode/McodeArchitectureTab.tsx` | `Server, Globe, Database, Shield, Zap, GitBranch, Package, Users, HardDrive, Cpu, Layers, Network, FileCode` | Dead code |
| `mcode/McodeConfigTab.tsx` | `Database, Shield, Key, Settings, Layers, FileText, ChevronDown, Server, Cloud, ToggleLeft, Zap, Activity, Terminal, Wifi` | Dead code |
| `mcode/McodeMcpTab.tsx` | `Server, Shield, Zap, AlertTriangle, Image, Database, Wifi, Settings, ChevronDown, ExternalLink` | Dead code |
| `mcode/McodePluginsTab.tsx` | `Package, Users, Download, Upload, Settings, ExternalLink, Shield, Zap` | Dead code |
| `mcode/McodeSettingsTab.tsx` | `Settings, ToggleLeft, ToggleRight, Sliders, Globe, Shield, Clock, Database, Terminal, Save, RefreshCw, Info, AlertTriangle, CheckCircle2` | Dead code |
| `mcode/McodeTestsTab.tsx` | `BarChart3, CheckCircle, XCircle, Clock, Play, Pause` | Dead code |
| `mcode/McodeTurnMachineTab.tsx` | `Layers, ChevronDown, Activity` | Dead code |
| `pages/AIChatPage.tsx` | All main icons | ✅ Live |
| `pages/SettingsPage.tsx` | `Shield, Key, BarChart3, Palette, Globe, Radar, Zap, User, Github, Settings, Cpu, Brain, Database, Terminal, Network` | ✅ Live |
