import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  Folder, Puzzle, Github, Crown, Settings,
  ChevronDown, Plus, Sparkles, ArrowUp, Send, Square,
  UploadCloud, FolderUp, Download, GitBranch, Share, Loader2, Slash, Zap,
  AlertCircle, AlertTriangle, CheckCircle2, X, MessageSquare, FileText, Terminal, GitFork, Wrench, MoreVertical, ChevronRight, Sun, Book, HelpCircle, Search, History, Trash2, Globe, Palette, ZoomIn, BarChart2, Rocket, LogOut, Hash, Minimize2, ListFilter, Archive,
  PanelLeft, PanelBottom, PanelRight, LayoutGrid, Bell, BellDot,
  Workflow, Monitor, MousePointerClick, Cpu, Paperclip, BrainCircuit, Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { McodeTurnMachineVisualization } from '../../components/mcode/McodeTurnMachineVisualization';
import { Group as ResizablePanelGroup, Panel as ResizablePanel, Separator as ResizablePanelHandle, usePanelRef } from 'react-resizable-panels';
import Link from 'next/link'; import { useRouter, useSearchParams } from 'next/navigation';
import { useChatSocket, getSocket } from '../../hooks/useChatSocket';
import api from '../../lib/axios';
import { setMode, addMessage, clearChat, setGodMode, resetStreaming, promptEnhancementResolved, clarifyAnswered, watchStatusUpdated } from '../../store/chatSlice';
import { handleSlashCommand, isSlashCommand, WEB_SLASH_COMMANDS } from '../../lib/slashCommands';
import { zipFilesOffMainThread, WORKSPACE_UPLOAD_TIMEOUT_MS, type ZipEntry } from '../../lib/zipInWorker';

// Moved out of the component (was previously re-created on every single render, since it
// lived inside the AIChatPage function body). These are static lookup tables, so they only
// need to be built once per page load, not once per keystroke/render.
const MASTER_IGNORE_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'coverage', '.cache', '.turbo', 'out',
  'bower_components', 'jspm_packages', '.expo', '.serverless', '.swc', '.yarn',
  '.pnpm-store', '.parcel-cache', '.nuxt', '.output', '.astro', '.vite',
  '.cache-loader', '.storybook-out', 'storybook-static', '.wxt', '.docusaurus',
  'venv', '.venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
  '.htmlcov', 'htmlcov', '.nox', '.tox', '.conda', 'env', '.env', 'ENV',
  'pip-wheel-metadata', 'site-packages', '.eggs', '.nyc_output',
  'target', '.target', '.gradle', '.cargo', '.nuget', 'vendor', 'obj', 'bin',
  'cmake-build-debug', 'cmake-build-release', 'CMakeFiles', 'ipch', '.vs',
  'x64', 'x86', 'Debug', 'Release',
  '.dart_tool', '.fvm', '.flutter-plugins', '.flutter-plugins-dependencies',
  'Pods', 'DerivedData', '.build', '.swiftpm', 'captures', '.externalNativeBuild',
  'xcuserdata', '.bundle', 'deps', '_build',
  '.git', '.idea', '.vscode', '.fleet', '.nova', '.history', 'tmp', 'temp',
  '.docker', '.vagrant',
  '.terraform', '.terragrunt-cache', '.elasticbeanstalk', '.local', '.npm',
  '.pnpm', '.nvm', '.hg', '.svn',
  '.vercel', '.firebase', '.angular', '.sass-cache', '.metals', '.bloop',
  '.ensime_cache', '$RECYCLE.BIN', '.Trashes', '.AppleDouble', '.LSOverride',
  '.Spotlight-V100'
]);

const MASTER_IGNORE_EXACT_FILES = new Set([
  '.DS_Store', 'Thumbs.db', 'desktop.ini', 'ehthumbs.db', 'npm-debug.log',
  'yarn-debug.log', 'yarn-error.log', 'pnpm-debug.log', 'coverage.xml',
  'lcov.info', '.pnp.cjs', '.pnp.loader.mjs'
]);

const MASTER_IGNORE_EXTENSIONS = new Set([
  'log', 'tmp', 'temp', 'bak', 'swp', 'swo',
  'pyc', 'pyo', 'pyd',
  'class', 'jar', 'war', 'ear',
  'o', 'obj', 'dll', 'so', 'dylib', 'exe', 'a', 'lib',
  'pdb', 'idb', 'ilk', 'suo', 'user',
  'zip', 'tar', 'gz', 'rar', '7z', 'iso', 'dmg'
]);

const FAST_SKIP_REGEX = /(\/|\\|^)(node_modules|\.git|\.next|dist|build|coverage|\.cache|vendor|venv|\.venv|__pycache__|\.turbo|out|\.idea|\.vscode|\.fleet|\.nova|\.history|tmp|temp|target|\.target|\.gradle|\.cargo|\.nuget|\.output|bower_components|jspm_packages|\.expo|\.serverless|\.swc|obj|bin|\.yarn|\.pnpm-store|\.vercel|\.firebase|\.angular|Pods|DerivedData|xcuserdata|\.dart_tool)(\/|\\|$)/i;

function isIgnoredUploadPath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  for (const part of parts) {
    if (MASTER_IGNORE_DIRS.has(part) || MASTER_IGNORE_DIRS.has(part.toLowerCase())) return true;
  }
  const fileName = parts[parts.length - 1];
  if (!fileName) return false;
  if (MASTER_IGNORE_EXACT_FILES.has(fileName) || MASTER_IGNORE_EXACT_FILES.has(fileName.toLowerCase())) return true;
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex > 0) {
    const ext = fileName.substring(dotIndex + 1).toLowerCase();
    if (MASTER_IGNORE_EXTENSIONS.has(ext)) return true;
  }
  return false;
}

/** Read a batch of DataTransferItem directory entries to exhaustion (readEntries only
 *  returns ~100 at a time per the spec), then return the full list. */
function readAllDirectoryEntries(dirReader: any): Promise<any[]> {
  return new Promise((resolve) => {
    const all: any[] = [];
    const readBatch = () => {
      dirReader.readEntries((batch: any[]) => {
        if (!batch || batch.length === 0) {
          resolve(all);
        } else {
          all.push(...batch);
          readBatch();
        }
      }, () => resolve(all));
    };
    readBatch();
  });
}

import { FileTree } from '../../components/ide/FileTree';
import { ExplorerPanel } from '../../components/ide/ExplorerPanel';
import { SearchPanel } from '../../components/ide/SearchPanel';
import { SourceControlPanel } from '../../components/ide/SourceControlPanel';
import { RunDebugPanel } from '../../components/ide/RunDebugPanel';
import { LanguagesPanel } from '../../components/ide/LanguagesPanel';
import { TestingPanel } from '../../components/ide/TestingPanel';
import { RemoteExplorerPanel } from '../../components/ide/RemoteExplorerPanel';
import { AndroidEmulatorsPanel } from '../../components/ide/AndroidEmulatorsPanel';
import { ContainersPanel } from '../../components/ide/ContainersPanel';
import { EditorPane } from '../../components/ide/EditorPane';
import { BottomPanel } from '../../components/ide/BottomPanel';
import { WorkspaceModals } from '../../components/ide/WorkspaceModals';
import { TodoCard } from '../../components/ide/TodoCard';
import { PermissionModal } from '../../components/ide/PermissionModal';
import { IDEActivitySidebar } from '../../components/ide/IDEActivitySidebar';
import { useIDEStore } from '../../store/ideStore';
import { IDEMenuBar } from '../../components/ide/menu/IDEMenuBar';
import { QuickOpenPalette } from '../../components/ide/menu/QuickOpenPalette';
import { SymbolPalette } from '../../components/ide/menu/SymbolPalette';
import { GoToLineModal } from '../../components/ide/menu/GoToLineModal';
import { ShortcutsReferenceModal } from '../../components/ide/menu/ShortcutsReferenceModal';
import { AboutModal } from '../../components/ide/menu/AboutModal';
import { ReleaseNotesModal } from '../../components/ide/menu/ReleaseNotesModal';
import { TasksModal } from '../../components/ide/menu/TasksModal';
import { QuickSettingsPanel } from '../../components/ide/QuickSettingsPanel';
import { AdvancedSettingsModal } from '../../components/ide/AdvancedSettingsModal';
import { GeneralSettingsModal } from '../../components/ide/GeneralSettingsModal';
import { SettingsPage } from './SettingsPage';
import { toast } from 'sonner';
import ExtensionsMarketplace from '../../components/ExtensionsMarketplace';
import editorApi from '../../lib/extensions/editorApi';
import { ModelSelector } from '../../components/ide/ModelSelector';
import { SparkleButton } from '../../components/ide/SparkleButton';
import { WaveProgress } from '../../components/ide/WaveProgress';
import { ClarifyCard } from '../../components/ide/ClarifyCard';
import { RoleAssignmentTable } from '../../components/ide/RoleAssignmentTable';
import { CodebaseReadingCard } from '../../components/ide/CodebaseReadingCard';
import { ComparisonTable } from '../../components/ide/ComparisonTable';
import { PlaywrightAuditPanel } from '../../components/ide/PlaywrightAuditPanel';
import { WatchStatusBadge } from '../../components/ide/WatchStatusBadge';
import { WatchActivityFeed } from '../../components/ide/WatchActivityFeed';
import { ThinkingIndicator } from '../../components/chat/ThinkingIndicator';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { SpinnerBlock } from '../../components/chat/SpinnerBlock';
import { AgentActionSequence } from '../../components/chat/AgentActionSequence';
import { ReactionBurst } from '../../components/chat/ReactionBurst';

export function AIChatPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  // IDE State — declare BEFORE useChatSocket so there's no TDZ
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mcode_active_workspace_id') || null;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState('Chat');

  // Persist active workspace to localStorage so refreshes always restore the active project
  useEffect(() => {
    if (activeWorkspaceId && typeof window !== 'undefined') {
      try {
        localStorage.setItem('mcode_active_workspace_id', activeWorkspaceId);
      } catch {}
    }
  }, [activeWorkspaceId]);

  const {
    messages,
    keysError,
    isStreaming,
    mode,
    plan,
    permissionRequest,
    models,
    selectedModel,
    godMode,
    waves,
    subagents,
    buildSummary,
    toasts: serverToasts,
    enhancedPrompt,
    clarifyQuestions,
    permissionMode,
    codebaseReading,
    projectTier,
    concurrency,
    comparisonRows,
    verificationPass,
    securityAudit,
    playwrightAudit,
    roleAssignments,
    watch,
  } = useAppSelector(state => state.chat);
  const { send, interrupt, answerPermission, undo, sendTerminalCommand, reloadModels } = useChatSocket(activeWorkspaceId);
  const [prompt, setPrompt] = useState('');
  const [showTurnMachine, setShowTurnMachine] = useState(false);
  const [showReactionBurst, setShowReactionBurst] = useState(false);

  // IDE layout toggles live in the Zustand store so the global keyboard
  // shortcuts (Ctrl+B / Ctrl+`) can drive them from anywhere. Read
  // unconditionally here — these values are consumed inside the conditional
  // `activeTab === 'AI Code Editor'` render branch below.
  const isSidebarOpen = useIDEStore((s) => s.isSidebarOpen);
  const isTerminalOpen = useIDEStore((s) => s.isTerminalOpen);
  const activeActivityBar = useIDEStore((s) => s.activeActivityBar);
  const setActiveActivityBar = useIDEStore((s) => s.setActiveActivityBar);
  const setRunTerminalCommandFn = useIDEStore((s) => s.setRunTerminalCommandFn);
  const zenMode = useIDEStore((s) => s.zenMode);
  const setZenMode = useIDEStore((s) => s.setZenMode);
  const secondarySideBarVisible = useIDEStore((s) => s.secondarySideBarVisible);
  const isSettingsOpen = useIDEStore((s) => s.isSettingsOpen);
  const settingsInitialTab = useIDEStore((s) => s.settingsInitialTab);
  const autoSaveEnabled = useIDEStore((s) => s.autoSaveEnabled);
  const toggleAutoSave = useIDEStore((s) => s.toggleAutoSave);
  const leftPanelRef = usePanelRef();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (e.shiftKey) {
          useIDEStore.getState().setQuickSettingsOpen(true);
        } else {
          useIDEStore.getState().openSettings('models');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeTab === 'AI Code Editor') {
      useIDEStore.getState().setSecondarySideBarVisible(true);
    }
    if (isSidebarOpen && activeActivityBar !== 'extensions' && !zenMode) {
      const timer = setTimeout(() => {
        leftPanelRef.current?.expand();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      leftPanelRef.current?.collapse();
    }
  }, [activeTab, isSidebarOpen, activeActivityBar, zenMode, leftPanelRef]);

  useEffect(() => {
    setRunTerminalCommandFn(sendTerminalCommand);
  }, [sendTerminalCommand, setRunTerminalCommandFn]);

  // Auto-reset streaming if it gets stuck after a tool execution
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isStreaming && messages.length > 0 && messages[messages.length - 1]?.kind !== 'stream') {
      // If we are waiting for a stream to start after a tool completes, and it takes >15s,
      // it's likely the backend crashed or the connection dropped without a chat:done event.
      timer = setTimeout(() => {
        dispatch(resetStreaming());
      }, 15000);
    }
    return () => clearTimeout(timer);
  }, [isStreaming, messages, dispatch]);

  // Auto-scroll refs — keep the chat scrolled to the bottom when new
  // messages arrive or streaming updates come in
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const ideChatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Scroll to bottom on new messages or streaming updates.
    // We scroll the appropriate container depending on which tab is active.
    const target = activeTab === 'Chat' || activeTab === 'AI Code Assistant' ? chatEndRef.current : ideChatEndRef.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, keysError]);

  // Safety net: if isStreaming is stuck true for 60s without any stream
  // activity (e.g. backend crashed silently without socket disconnect),
  // reset it so the ThinkingIndicator stops spinning and the user can
  // type a new message.
  const streamingSinceRef = useRef<number | null>(null);
  useEffect(() => {
    if (isStreaming) {
      if (!streamingSinceRef.current) {
        streamingSinceRef.current = Date.now();
      }
      const elapsed = Date.now() - streamingSinceRef.current;
      const remaining = 60000 - elapsed;
      if (remaining <= 0) {
        dispatch(resetStreaming());
        streamingSinceRef.current = null;
      } else {
        const timer = setTimeout(() => {
          dispatch(resetStreaming());
          streamingSinceRef.current = null;
        }, remaining);
        return () => clearTimeout(timer);
      }
    } else {
      streamingSinceRef.current = null;
    }
  }, [isStreaming, dispatch]);
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const commandPickerRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [showModeSwitchModal, setShowModeSwitchModal] = useState(false);

  // Auth guard — get token from localStorage (or URL params for dev)
  const getTokens = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const accessParam = params.get('access');
      const refreshParam = params.get('refresh');
      if (accessParam && refreshParam) {
        const tokens = { access: accessParam, refresh: refreshParam };
        localStorage.setItem('mcode_tokens', JSON.stringify(tokens));
        return tokens;
      }
      return JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    } catch {
      return {};
    }
  };
  const { access: token } = getTokens();

  useEffect(() => {
    const handler = (e: any) => {
      if (commandPickerRef.current && !commandPickerRef.current.contains(e.target)) {
        setShowCommandPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!token) return;
    api.get('/api/v1/sessions', { timeout: 15000 })
      .then(res => res.data)
      .then(data => {
        if (data && data.items) {
          setChats((data.items as any[]).map(s => ({
            id: s._id,
            title: s.projectName || s.workspace || 'Untitled Chat',
            isActive: activeWorkspaceId === s._id,
            createdAt: s.createdAt,
            summary: s.plan?.summary || 'No recent activity...'
          })));
        }
      })
      .catch(err => {
        if ((err as any)?.response?.status !== 401) {
          console.error('Error fetching chats:', err);
        }
      });
  }, [activeWorkspaceId, isHistoryOpen, token]);

  const deleteChat = async (id: string, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    try {
      const res = await api.delete(`/api/v1/sessions/${id}`, { timeout: 15000 });
      if (res.status === 200) {
        setChats(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoadingProfile(true);
    api.get('/api/v1/auth/me', { timeout: 15000 })
      .then(res => res.data)
      .then(data => {
        if (data && data.email) {
          setUserProfile(data);
        } else {
          setUserProfile(null);
        }
      })
      .catch(err => {
        if ((err as any)?.response?.status !== 401) {
          console.error(err);
        }
        setUserProfile(null);
      })
      .finally(() => setIsLoadingProfile(false));
  }, [token]); // [token] only — `navigate` was a stale react-router leftover; this effect uses no router method

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mcode_tokens');
    window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
    if (!window.mcodeElectron) {
      router.push('/login');
    }
  };
	const [isModalsOpen, setIsModalsOpen] = useState(false);
	const [githubAccount, setGithubAccount] = useState<any>(null);
	const bumpRefresh = useIDEStore((s) => s.bumpRefresh);

  // Branch selector state
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranch, setActiveBranch] = useState('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
		const [isUploading, setIsUploading] = useState(false);
		const [uploadProgressText, setUploadProgressText] = useState('');
		const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
		const watchMode = watch?.active ?? false;
		const [debugMode, setDebugMode] = useState(false);

		// Sync initial watch status when workspace loads or changes
		useEffect(() => {
			if (!activeWorkspaceId) return;
			api.get(`/api/v1/watch/${activeWorkspaceId}/status`)
				.then((res) => {
					if (res?.data) {
						dispatch(watchStatusUpdated(res.data));
					}
				})
				.catch(() => {});
		}, [activeWorkspaceId, dispatch]);

		const toggleWatchMode = useCallback(async () => {
			if (!activeWorkspaceId) {
				toast.error('Please select or open a project first');
				return;
			}
			const socket = getSocket();
			if (watch?.active) {
				try {
					await api.post(`/api/v1/watch/${activeWorkspaceId}/stop`);
				} catch {}
				socket?.emit('watch:stop', { projectId: activeWorkspaceId });
				dispatch(watchStatusUpdated({ status: 'stopped' }));
				toast.info('Watch daemon stopped');
			} else {
				try {
					await api.post(`/api/v1/watch/${activeWorkspaceId}/start`);
				} catch {}
				socket?.emit('watch:start', { projectId: activeWorkspaceId });
				dispatch(watchStatusUpdated({ status: 'running' }));
				toast.success('Watch daemon active — watching project changes');
			}
		}, [activeWorkspaceId, watch?.active, dispatch]);

		// Modal for commit message (replaces window.prompt)
			const [showCommitModal, setShowCommitModal] = useState(false);
			const [commitMessage, setCommitMessage] = useState('Initial commit');
			const [githubRepoForPush, setGithubRepoForPush] = useState('');
		// Modal for new branch name (replaces window.prompt)
		const [showBranchModal, setShowBranchModal] = useState(false);
		const [branchName, setBranchName] = useState('');

	const toggleDebug = () => setDebugMode(!debugMode);

		// Toast notifications (replaces native alert())
		const [localToasts, setLocalToasts] = useState<any[]>([]);
		const showToast = useCallback((message: string, type: string = 'success') => {
			const id = Date.now().toString();
			setLocalToasts((prev) => [...prev, { id, message, type }]);
			setTimeout(() => {
				setLocalToasts((prev) => prev.filter((t) => t.id !== id));
			}, 3500);
		}, []);

	// Auth guard removed for lazy auth flow
	useEffect(() => {
		// Lazy auth lets users browse without redirecting
	}, [token]);

	// Tab → engine-mode mapping. Mode is derived from the active tab (Advanced Mode toggle removed).
	//  Chat              → chat mode (lightweight conversation + auto-search)
	//  AI Code Assistant → agent mode (full CLI: god-mode, waves, step cards, all tools)
	//  AI Code Editor    → IDE in chat mode (edit + follow-ups, no agent planning)
	const TABS = ['Chat', 'AI Code Assistant', 'AI Code Editor'];
	const TAB_MODE: Record<string, string> = { Chat: 'chat', 'AI Code Assistant': 'agent', 'AI Code Editor': 'chat' };
	const TAB_WIDTH: Record<string, number> = { Chat: 76, 'AI Code Assistant': 170, 'AI Code Editor': 170 };
	const TAB_LEFT = (() => { const m: Record<string, number> = {}; let c = 2; for (const t of TABS) { m[t] = c; c += TAB_WIDTH[t]; } return m; })();
	const executeTabSwitch = (tab: string, startNewProcess = false) => {
		setActiveTab(tab);
		setShowModeSwitchModal(false);
		setShowTurnMachine(false);
		setShowBranchDropdown(false);
		setShowCommitModal(false);
		setShowBranchModal(false);
		const next = TAB_MODE[tab];
		dispatch(setMode(next));
		if (next !== 'agent') dispatch(setGodMode(false));

		if (tab === 'AI Code Editor') {
			useIDEStore.getState().setSecondarySideBarVisible(true);
			if (startNewProcess) {
				// Start fresh: Welcome screen visible, primary sidebar collapsed
				useIDEStore.getState().setWelcomeOpen(true);
				useIDEStore.getState().setActivePath(null);
				useIDEStore.getState().setSidebarOpen(false);
			} else {
				// Continue existing project: keep open files, don't force welcome screen
				if (useIDEStore.getState().openFiles.length > 0) {
					useIDEStore.getState().setWelcomeOpen(false);
				}
				useIDEStore.getState().setSidebarOpen(true);
			}
		}
	};

	const handleTabSwitch = (tab: string) => {
		if (tab === 'AI Code Editor' && activeTab === 'AI Code Assistant') {
			setShowModeSwitchModal(true);
			return;
		}
		executeTabSwitch(tab);
	};
	const switchToAssistantTab = () => handleTabSwitch('AI Code Assistant');

  const handleAttachFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let targetWorkspaceId = activeWorkspaceId;

    if (!targetWorkspaceId) {
      try {
        const createForm = new FormData();
        createForm.append('name', 'Untitled Project');
        createForm.append('source', 'blank');
        
        const wsRes = await api.post('/api/v1/workspaces', createForm, { timeout: 15000 });
        const wsData = wsRes.data;
        if (wsData.workspace) {
          targetWorkspaceId = wsData.workspace._id;
          setWorkspaces(prev => [...prev, wsData.workspace]);
          setActiveWorkspaceId(targetWorkspaceId);
        } else {
          showToast('Failed to create workspace for upload', 'error');
          setIsUploading(false);
          return;
        }
      } catch (err) {
        showToast('Error creating workspace', 'error');
        setIsUploading(false);
        return;
      }
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      const res = await api.post(`/api/v1/workspaces/${targetWorkspaceId}/upload`, formData);
      const data = res.data;
      if (data.ok && data.uploadedFiles) {
        const attachText = (data.uploadedFiles as any[]).map(f => `[Attached File: ${f}]`).join('\n');
        setPrompt(prev => prev ? `${prev}\n${attachText}\n` : `${attachText}\n`);
        bumpRefresh(); // Refresh file tree
      } else {
        showToast(data.error?.message || 'Failed to attach files', 'error');
      }
    } catch (err) {
      showToast('Network error while attaching files', 'error');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!token) return;

    api.get('/api/v1/workspaces', { timeout: 15000 })
      .then(res => res.data)
      .then(data => {
        if (data.workspaces && data.workspaces.length > 0) {
          setWorkspaces(data.workspaces);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('mcode_active_workspace_id') : null;
          const matched = savedId ? data.workspaces.find((w: any) => w._id === savedId) : null;
          if (matched) {
            setActiveWorkspaceId(matched._id);
          } else {
            setActiveWorkspaceId(data.workspaces[0]._id);
          }
        }
      })
      .catch(err => {
        if (err?.response?.status !== 401) {
          console.error('Error fetching workspaces:', err);
        }
      });

    api.get('/api/v1/github/status', { timeout: 15000 })
      .then(res => res.data)
      .then(data => {
        if (data.connected) setGithubAccount(data);
      })
      .catch(err => {
        if (err?.response?.status !== 401) {
          console.error('Error fetching github status:', err);
        }
      });
  }, [token]);

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (showBranchDropdown && !e.target.closest('.branch-dropdown')) {
        setShowBranchDropdown(false);
      }
    };
    if (showBranchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBranchDropdown]);

  // Fetch available git branches for the current workspace
  const fetchBranches = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await api.get(`/api/v1/workspaces/${activeWorkspaceId}/branches`, { timeout: 10000 });
      if (res.status === 200) {
        setBranches(res.data.branches || []);
        if (res.data.current) setActiveBranch(res.data.current);
      }
    } catch (err: any) {
      if (err?.response?.status !== 401 && err?.response?.status !== 404) {
        console.warn('Failed to fetch branches:', err?.message || err);
      }
    }
  }, [activeWorkspaceId]);

  // Switch (or create) the active git branch
  const switchBranch = useCallback(async (branch: string, create = false) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await api.post(`/api/v1/workspaces/${activeWorkspaceId}/checkout`, { branch, create }, { timeout: 5000 });
      if (res.status === 200) {
        setActiveBranch(res.data.branch);
        setShowBranchDropdown(false);
        if (!create && !branches.includes(res.data.branch)) {
          setBranches(prev => [...prev, res.data.branch]);
        }
      }
    } catch (err) {
      console.error('Failed to switch branch:', err);
    }
  }, [activeWorkspaceId, branches]);

  // Fetch branches when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      fetchBranches();
    }
  }, [activeWorkspaceId, fetchBranches]);

  const handleUploadZip = async (file: File) => {
    const formData = new FormData();
    formData.append('name', file.name.replace('.zip', ''));
    formData.append('source', 'zip');
    formData.append('zipfile', file);

    try {
      setIsUploading(true);
      setUploadProgressText(`Extracting & uploading ZIP '${file.name}'...`);
      const res = await api.post('/api/v1/workspaces', formData);
      if (res.status >= 400) {
        const msg = res.data?.error?.message || `Upload failed (${res.status})`;
        showToast(msg, 'error');
        throw new Error(msg);
      }
      const data = res.data;
      if (data.workspace) {
        setWorkspaces(prev => {
          const filtered = prev.filter(w => w._id !== data.workspace._id);
          return [data.workspace, ...filtered];
        });
        setActiveWorkspaceId(data.workspace._id);
        try { localStorage.setItem('mcode_active_workspace_id', data.workspace._id); } catch {}
        useIDEStore.setState({ openFiles: [], activePath: null });
        useIDEStore.getState().setActiveActivityBar('explorer');
        useIDEStore.getState().setSidebarOpen(true);
        leftPanelRef.current?.expand();
        bumpRefresh();
        showToast('Project uploaded successfully');
      } else {
        const msg = data.error?.message || 'Upload failed — no workspace returned';
        showToast(msg, 'error');
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to upload project';
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  /** Shared tail: zip the collected entries off the main thread, then upload with real
   *  network progress. Used by all three folder-upload entry points below so the
   *  performance-critical path only has to be fixed in one place. */
  const zipAndUploadEntries = async (
    entries: ZipEntry[],
    folderName: string,
    successVerb: string
  ) => {
    if (entries.length === 0) {
      showToast('No valid source files found in selected folder (all ignored)', 'error');
      setIsUploading(false);
      return;
    }

    // Scan phase already happened by the time we get here → treat as 0-15%.
    setUploadProgressPercent(15);
    setUploadProgressText(`Bundling ${entries.length} files (off main thread)...`);

    // Zip phase: 15-55%. Runs in a Web Worker so the UI (this very overlay's animation,
    // typing, tab switching, etc.) never freezes, no matter how large the project is.
    //
    // Watchdog: if the worker never posts a message back (crashed silently, blocked by
    // a broken CSP, whatever), the old code just hung forever with the overlay stuck
    // on screen. Race it against a hard timeout so the user always gets an error
    // instead of an infinite "processing" spinner.
    const ZIP_WATCHDOG_MS = 90_000;
    const zipBlob = await Promise.race([
      zipFilesOffMainThread(entries, (pct) => {
        setUploadProgressPercent(15 + pct * 0.4);
        setUploadProgressText(`Bundling '${folderName}' (${pct}%)...`);
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Zipping timed out — try again or upload a smaller folder')), ZIP_WATCHDOG_MS)
      ),
    ]);

    // Upload phase: 55-100%, driven by real bytes sent, not a guess.
    setUploadProgressText(`Uploading & extracting '${folderName}' on server...`);
    showToast(`Uploading project archive to server...`, 'info');

    // A dev-server restart (nodemon / `node --watch` reloading on a source-file save)
    // landing mid-upload kills the TCP connection with a bare "Network Error" —
    // no HTTP status at all, so it isn't something the server can respond to gracefully.
    // One silent retry after a short pause covers this without bothering the user;
    // if the second attempt also has no server to talk to, we surface the real error.
    const postWorkspace = (wsName: string) => {
      const fd = new FormData();
      fd.append('name', wsName);
      fd.append('source', 'zip');
      fd.append('zipfile', new File([zipBlob], `${wsName}.zip`, { type: 'application/zip' }));
      return api.post('/api/v1/workspaces', fd, {
        timeout: WORKSPACE_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (evt: any) => {
          if (evt.total) {
            const pct = (evt.loaded / evt.total) * 100;
            setUploadProgressPercent(55 + pct * 0.44);
            // Once network bytes are fully sent, the server still has to unzip everything
            // to disk before it responds. Without this, the bar sat frozen at 100% for
            // several seconds and looked hung. Cap at 99% and relabel so it's clear
            // something is still happening.
            if (pct >= 100) {
              setUploadProgressText(`Extracting '${wsName}' on server...`);
            }
          }
        },
      });
    };

    // Try the upload, auto-renaming on duplicate (409) up to MAX_RENAME_ATTEMPTS
    // so re-uploading the same folder "just works" → "EventO" → "EventO-2" → "EventO-3" etc.
    const MAX_RENAME_ATTEMPTS = 5;
    let uploadName = folderName;
    let res;

    for (let attempt = 0; attempt <= MAX_RENAME_ATTEMPTS; attempt++) {
      try {
        res = await postWorkspace(uploadName);
        break; // success
      } catch (err: any) {
        const status = err?.response?.status;
        const isNetworkError = !err?.response;

        if (isNetworkError && attempt === 0) {
          // Dev-server restart — one silent retry
          setUploadProgressText(`Server restarted — retrying '${uploadName}' upload...`);
          await new Promise((r) => setTimeout(r, 1500));
          try {
            res = await postWorkspace(uploadName);
            break;
          } catch (retryErr: any) {
            if (retryErr?.response?.status !== 409) throw retryErr;
            // fall through to duplicate handling below
          }
        }

        if (status === 409 && attempt < MAX_RENAME_ATTEMPTS) {
          // Workspace name already exists — auto-rename and retry
          uploadName = `${folderName}-${attempt + 2}`;
          setUploadProgressText(`Name taken — trying '${uploadName}'...`);
          showToast(`"${attempt === 0 ? folderName : `${folderName}-${attempt + 1}`}" already exists, trying "${uploadName}"...`, 'info');
          continue;
        }

        throw err;
      }
    }

    if (!res) {
      showToast(`Could not create workspace — name "${folderName}" is taken and auto-rename failed`, 'error');
      return;
    }

    if (res.status >= 400) {
      const msg = res.data?.error?.message || `Upload failed (${res.status})`;
      showToast(msg, 'error');
      throw new Error(msg);
    }

    const data = res.data;
    if (data.workspace) {
      setUploadProgressPercent(100);
      setWorkspaces(prev => {
        const filtered = prev.filter(w => w._id !== data.workspace._id);
        return [data.workspace, ...filtered];
      });
      setActiveWorkspaceId(data.workspace._id);
      try { localStorage.setItem('mcode_active_workspace_id', data.workspace._id); } catch {}
      useIDEStore.setState({ openFiles: [], activePath: null });
      useIDEStore.getState().setActiveActivityBar('explorer');
      useIDEStore.getState().setSidebarOpen(true);
      leftPanelRef.current?.expand();
      bumpRefresh();
      const nameNote = uploadName !== folderName ? ` (saved as "${uploadName}")` : '';
      showToast(`Folder '${folderName}' (${entries.length} files) ${successVerb}${nameNote}!`);
    } else {
      const msg = data.error?.message || 'Upload failed — no workspace returned';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleUploadFolder = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgressPercent(2);

    const firstFile = files[0];
    const rawPath = firstFile.webkitRelativePath || firstFile.name;
    const folderName = rawPath.includes('/') ? rawPath.split('/')[0] : 'Uploaded-Folder';

    setUploadProgressText(`Scanning folder '${folderName}'...`);
    showToast(`Scanning '${folderName}'...`, 'info');

    // Yield to the event loop so React can paint the upload overlay BEFORE
    // the potentially heavy file-scanning loop begins — otherwise the UI
    // looks frozen for several seconds on large projects (8k+ files).
    await new Promise((r) => setTimeout(r, 0));

    try {
      const entries: ZipEntry[] = [];

      // Process files in chunks, yielding to the event loop between chunks so
      // React can render the upload overlay immediately instead of appearing
      // frozen for ~10 seconds while scanning thousands of files.
      const SCAN_CHUNK = 500;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relPath = file.webkitRelativePath || file.name;
        if (FAST_SKIP_REGEX.test(relPath)) continue;
        if (!isIgnoredUploadPath(relPath)) {
          const normalized = relPath.replace(/\\/g, '/');
          const zipPath = normalized.startsWith(`${folderName}/`)
            ? normalized.substring(folderName.length + 1)
            : normalized;
          entries.push({ path: zipPath, file });
        }
        // Every SCAN_CHUNK files, yield to the event loop so React can paint
        if (i > 0 && i % SCAN_CHUNK === 0) {
          setUploadProgressText(`Scanning '${folderName}'... (${i}/${files.length} checked, ${entries.length} kept)`);
          setUploadProgressPercent(2 + (i / files.length) * 10);
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setUploadProgressText(`Scan complete — ${entries.length} files to upload`);
      setUploadProgressPercent(12);

      await zipAndUploadEntries(entries, folderName, 'uploaded & extracted successfully');
    } catch (err: any) {
      console.error('Folder ZIP upload error:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Folder upload failed';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      setUploadProgressPercent(0);
    }
  };

  const handleUploadDirectoryHandle = async (dirHandle: any) => {
    if (!dirHandle) return;
    const folderName = dirHandle.name || 'Uploaded-Folder';

    setIsUploading(true);
    setUploadProgressPercent(1);
    setUploadProgressText(`Scanning '${folderName}' (skipping heavy cache/build dirs)...`);
    showToast(`Scanning '${folderName}'...`, 'info');

    try {
      // Reverted from a chunked-parallel-HTTP-request approach: in practice, many
      // small requests (auth check + DB lookup + CORS + logging middleware EACH time)
      // cost more in fixed per-request overhead than they save, especially for a
      // large file count. A single zip upload pays that overhead exactly once.
      //
      // Single-pass collect+read (not two separate full tree walks) with a global
      // concurrency cap, plus a time-based yield so the browser can actually paint
      // the progress overlay instead of starving on back-to-back microtasks.
      const entries: ZipEntry[] = [];
      let filesSeen = 0;
      let lastTextUpdate = 0;
      let lastYield = Date.now();
      let inFlight = 0;
      const CONCURRENCY = 64;
      const waiters: Array<() => void> = [];

      const yieldToRenderIfDue = async () => {
        const now = Date.now();
        if (now - lastYield > 80) {
          lastYield = now;
          await new Promise((r) => setTimeout(r, 0));
        }
      };

      const acquireSlot = async () => {
        if (inFlight >= CONCURRENCY) {
          await new Promise<void>((r) => { waiters.push(r); });
        }
        inFlight++;
      };
      const releaseSlot = () => {
        inFlight--;
        const next = waiters.shift();
        if (next) next();
      };

      const readTasks: Promise<void>[] = [];

      async function collect(handle: any, currentPath: string) {
        const children: { entry: any; relPath: string }[] = [];
        for await (const entry of handle.values()) {
          if (entry.kind === 'directory' && (MASTER_IGNORE_DIRS.has(entry.name) || MASTER_IGNORE_DIRS.has(entry.name.toLowerCase()))) {
            continue;
          }
          const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          if (isIgnoredUploadPath(relPath)) continue;
          children.push({ entry, relPath });
          await yieldToRenderIfDue();
        }

        await Promise.all(children.map(async ({ entry, relPath }) => {
          if (entry.kind === 'directory') {
            await collect(entry, relPath);
            return;
          }
          readTasks.push((async () => {
            await acquireSlot();
            try {
              const file = await entry.getFile();
              entries.push({ path: relPath, file });
            } catch {
              // skip unreadable file, don't fail the whole upload
            } finally {
              filesSeen++;
              const now = Date.now();
              if (now - lastTextUpdate > 150) {
                lastTextUpdate = now;
                setUploadProgressText(`Scanning & reading '${folderName}'... (${filesSeen} files)`);
                setUploadProgressPercent((p) => Math.min(15, p + 0.15));
              }
              releaseSlot();
              await yieldToRenderIfDue();
            }
          })());
        }));
      }

      await collect(dirHandle, '');
      await Promise.all(readTasks);

      await zipAndUploadEntries(entries, folderName, 'uploaded & extracted successfully');
    } catch (err: any) {
      console.error('Directory handle upload error:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Folder upload failed';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      setUploadProgressPercent(0);
    }
  };

  const handleUploadDataTransferItems = async (items: DataTransferItemList) => {
    if (!items || items.length === 0) return;

    setIsUploading(true);
    setUploadProgressPercent(1);
    setUploadProgressText("Scanning dropped folder...");
    showToast("Scanning dropped folder...", "info");

    try {
      const entries: ZipEntry[] = [];
      let folderName = 'Dropped-Project';
      let lastTextUpdate = 0;

      // Same fix as the directory-handle path: gather every sibling entry first, then
      // recurse/read them all CONCURRENTLY via Promise.all instead of a sequential
      // `for (const subEntry of entries) { await readEntry(...) }` loop.
      const readEntry = async (entry: any, currentPath: string): Promise<void> => {
        if (entry.isDirectory && (MASTER_IGNORE_DIRS.has(entry.name) || MASTER_IGNORE_DIRS.has(entry.name.toLowerCase()))) return;

        const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        if (isIgnoredUploadPath(relPath)) return;

        if (entry.isFile) {
          const file: File | null = await new Promise((resolve) => entry.file(resolve, () => resolve(null)));
          if (!file) return;
          const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
          entries.push({ path: filePath, file });
          const now = Date.now();
          if (now - lastTextUpdate > 200) {
            lastTextUpdate = now;
            setUploadProgressText(`Reading dropped files... (${entries.length} found)`);
            setUploadProgressPercent((p) => Math.min(9, p + 0.2));
          }
        } else if (entry.isDirectory) {
          if (!currentPath && entry.name) folderName = entry.name;
          const dirReader = entry.createReader();
          const allChildren = await readAllDirectoryEntries(dirReader);
          const subRelPath = currentPath ? `${currentPath}/${entry.name}` : (entry.name !== folderName ? entry.name : '');
          await Promise.all(allChildren.map((subEntry) => readEntry(subEntry, subRelPath)));
        }
      };

      const topLevelEntries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) topLevelEntries.push(entry);
        }
      }

      await Promise.all(topLevelEntries.map((entry) => readEntry(entry, '')));

      await zipAndUploadEntries(entries, folderName, 'uploaded instantly with 0 browser prompts');
    } catch (err: any) {
      console.error('Drag drop upload error:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Drag and drop folder upload failed';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      setUploadProgressPercent(0);
    }
  };

  const handleUploadSingleFile = async (file: File) => {
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadProgressText(`Uploading file '${file.name}'...`);
      showToast(`Uploading file ${file.name}...`, 'info');

      const createForm = new FormData();
      createForm.append('name', file.name);
      createForm.append('source', 'blank');
      const wsRes = await api.post('/api/v1/workspaces', createForm, { timeout: 15000 });
      const wsData = wsRes.data;
      if (!wsData.workspace) throw new Error('Workspace creation failed');

      const targetId = wsData.workspace._id;

      const formData = new FormData();
      formData.append('files', file);
      const uploadRes = await api.post(`/api/v1/workspaces/${targetId}/upload`, formData);
      if (uploadRes.data?.ok) {
        setWorkspaces(prev => [wsData.workspace, ...prev.filter(w => w._id !== targetId)]);
        setActiveWorkspaceId(targetId);
        try { localStorage.setItem('mcode_active_workspace_id', targetId); } catch {}
        useIDEStore.setState({ openFiles: [file.name], activePath: file.name });
        bumpRefresh();
        showToast(`File '${file.name}' uploaded successfully!`);
      } else {
        showToast('File upload failed', 'error');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast(err?.response?.data?.error?.message || err?.message || 'File upload failed', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleCloneGit = async (repoUrl: any) => {
    const name = repoUrl.split('/').pop().replace('.git', '');
    try {
      setIsUploading(true);
      setUploadProgressText(`Cloning GitHub repo '${name}'...`);
      const res = await api.post('/api/v1/workspaces', { name, source: 'git', repoUrl });
      if (res.status >= 400) {
        const msg = res.data?.error?.message || `Clone failed (${res.status})`;
        showToast(msg, 'error');
        throw new Error(msg);
      }
      const data = res.data;
      if (data.workspace) {
        setWorkspaces(prev => {
          const filtered = prev.filter(w => w._id !== data.workspace._id);
          return [data.workspace, ...filtered];
        });
        setActiveWorkspaceId(data.workspace._id);
        try { localStorage.setItem('mcode_active_workspace_id', data.workspace._id); } catch {}
        useIDEStore.setState({ openFiles: [], activePath: null });
        useIDEStore.getState().setActiveActivityBar('explorer');
        useIDEStore.getState().setSidebarOpen(true);
        leftPanelRef.current?.expand();
        bumpRefresh();
        showToast('Project cloned successfully');
      } else {
        const msg = data.error?.message || 'Clone failed — no workspace returned';
        showToast(msg, 'error');
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error('Clone failed:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to clone repository';
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleExport = async () => {
    if (!activeWorkspaceId) return showToast('No active workspace', 'error');
    try {
      const res = await api.get(`/api/v1/workspaces/${activeWorkspaceId}/export`, {
        timeout: 10000,
        responseType: 'blob'
      });
      if (res.status >= 400) throw new Error('Export failed');
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export-${activeWorkspaceId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Failed to export workspace', 'error');
    }
  };

  const handlePush = async () => {
    if (!activeWorkspaceId) return showToast('No active workspace', 'error');
    if (!commitMessage.trim()) return;

    try {
      const body: any = { message: commitMessage, branch: activeBranch };
      // For zip-uploaded workspaces, include the GitHub repo URL if provided
      if (githubRepoForPush) body.githubRepo = githubRepoForPush;

      const res = await api.post(`/api/v1/workspaces/${activeWorkspaceId}/push`, body);
      const data = res.data;
      if (data.ok) {
        showToast('Pushed successfully!');
        fetchBranches();
      }
      else showToast('Failed to push: ' + (data.error?.message || 'Unknown error'), 'error');
    } catch (e) {
      showToast((e as any).response?.data?.error?.message || 'Error pushing', 'error');
    } finally {
      setShowCommitModal(false);
      setGithubRepoForPush('');
    }
  };

  const [isScreenDragging, setIsScreenDragging] = useState(false);

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isScreenDragging) setIsScreenDragging(true);
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsScreenDragging(false);
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScreenDragging(false);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      handleUploadDataTransferItems(e.dataTransfer.items);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        handleUploadZip(file);
      } else {
        handleUploadSingleFile(file);
      }
    }
  };

  const handleCreateBranch = () => {
    if (!branchName.trim()) return;
    switchBranch(branchName, true);
    setShowBranchModal(false);
  };

  const handleGithubConnect = () => {
    const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    const url = `/api/v1/auth/github?token=${encodeURIComponent(tokens.access || '')}`;
    if (window.mcodeElectron?.openOAuthPopup) {
      window.mcodeElectron.openOAuthPopup(url).catch(() => {
        window.location.href = url;
      });
    } else {
      window.location.href = url;
    }
  };

  // open-files state + tree-refresh now live in useIDEStore (FileTree/EditorPane read them directly).



  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    if (!token) {
      router.push('/login');
      return;
    }

    // Handle slash commands client-side before sending to backend
    if (isSlashCommand(prompt)) {
      const handled = handleSlashCommand(prompt, dispatch, { send, undo }, {
        setPrompt,
        toggleWatchMode,
        switchToAssistantTab,
        watchMode,
        debugMode,
        toggleDebug,
        handleExport,
        clearMessages: () => dispatch(clearChat()),
      });
      if (handled) {
        setPrompt('');
        return;
      }
    }

    // Echo the user's message into the Redux store so it appears in the chat UI
    dispatch(addMessage({
      id: Date.now().toString(),
      role: 'user',
      text: prompt,
    }));
    // In advanced mode, god-mode toggle sends with 'god' mode for parallel subagent execution
    const effectiveMode = (mode === 'agent' && godMode) ? 'god' : mode;
    send(prompt, effectiveMode);
    setPrompt('');
    setShowReactionBurst(true);
    setTimeout(() => setShowReactionBurst(false), 800);
  };

  // ── Compute whether the thinking/flow indicator should show ──
  // Bulletproof: for chat mode, only while the last message is from the user
  // (the moment ANY assistant reply appears — stream, tool, or agentMessage — it hides).
  // For agent mode, show whenever last message isn't an active stream.
  const showThinkingIndicator = (() => {
    if (!isStreaming) return false;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return false;
    if (mode === 'chat') {
      return lastMsg.role === 'user';
    }
    return lastMsg.kind !== 'stream';
  })();

  return (
    <div 
      className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-[#f4f4f5] font-sans overflow-hidden relative"
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      <AnimatePresence>
        {isScreenDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] bg-[#0a0a0d]/90 backdrop-blur-md border-4 border-dashed border-emerald-500/80 flex flex-col items-center justify-center pointer-events-none p-8 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-4 animate-bounce shadow-[0_0_50px_rgba(16,185,129,0.3)]">
              <FolderUp className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Drop Project Folder Anywhere</h3>
            <p className="text-sm text-emerald-400/90 font-medium mt-1">⚡ Instant 0.05s memory bundling (0 Chrome prompts)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOPBAR */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleAttachFiles} 
        className="hidden" 
      />
      <header className="w-full flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-[#0a0a0d]/90 backdrop-blur-md relative min-h-[52px] z-50 flex-shrink-0 shadow-md select-none">
        {/* Left: Logo & VS Code Menu Bar */}
        <div className="flex items-center gap-3 z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative group flex items-center justify-center">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-40 group-hover:opacity-80 transition duration-300"></div>
              <div className="relative w-7 h-7 rounded-xl overflow-hidden bg-[#09090b] border border-white/15 p-0.5 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="MCODE"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
            {activeTab === 'AI Code Editor' ? (
              <IDEMenuBar
                className="bg-transparent border-0 h-auto"
                onOpenFile={() => fileInputRef.current?.click()}
                onOpenFolder={() => {
                  if ("showDirectoryPicker" in window) {
                    (window as any).showDirectoryPicker().then((handle: any) => {
                      handleUploadDirectoryHandle(handle);
                    }).catch(() => {});
                  } else {
                    setIsModalsOpen(true);
                  }
                }}
                onSave={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, metaKey: true }));
                }}
                onSaveAs={() => {
                  const ap = useIDEStore.getState().activePath;
                  if (ap) {
                    const content = useIDEStore.getState().fileContentsCache[ap] || useIDEStore.getState().activeEditor?.getValue() || '';
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = ap.split('/').pop() || 'file.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                onSaveAll={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, metaKey: true }));
                  toast.success("All files saved");
                }}
              />
            ) : (
              <span className="text-white font-bold tracking-tight text-sm bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
                M CODE
              </span>
            )}
          </div>
        </div>
        
        {/* Center: Fluid Animated Segmented Control Tabs */}
        <div className="flex items-center justify-center px-2 flex-1 min-w-0 z-20">
          <nav className="flex items-center bg-[#13131a] p-1 rounded-xl border border-white/10 shadow-inner max-w-full overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabSwitch(tab)}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 z-10 whitespace-nowrap cursor-pointer ${
                    isActive ? 'text-white' : 'text-white/50 hover:text-white/90'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeHeaderTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-lg shadow-md shadow-blue-500/25 z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab === 'Chat' && <MessageSquare className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-400'}`} />}
                    {tab === 'AI Code Assistant' && <Sparkles className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />}
                    {tab === 'AI Code Editor' && <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-blue-400'}`} />}
                    <span className="hidden md:inline">{tab}</span>
                    <span className="md:hidden">{tab === 'AI Code Assistant' ? 'Assistant' : tab === 'AI Code Editor' ? 'Editor' : 'Chat'}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right side: Cohesive Tool & Action Toolbar */}
        <div className="flex items-center gap-2 z-30 flex-shrink-0">
          
          {/* Workspace & Branch Group */}
          <div className="flex items-center gap-1 bg-[#13131a] p-1 rounded-xl border border-white/10 shadow-sm">
            <motion.button
              type="button"
              onClick={() => setIsModalsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-white px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Upload files, folders or ZIP project"
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline">Upload</span>
            </motion.button>

            <div className="w-px h-3.5 bg-white/10 mx-0.5" />

            {/* Branch Selector & Popover */}
            <div className="relative branch-dropdown">
              <motion.button
                type="button"
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-white px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 transition cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Git Branch"
              >
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[80px] truncate">{activeBranch}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showBranchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-[#181820] border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 flex flex-col gap-1"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-between border-b border-white/5">
                      <span>Git Branches</span>
                      <GitBranch className="w-3 h-3" />
                    </div>

                    <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 py-1">
                      {branches.length > 0 ? (
                        branches.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => switchBranch(b)}
                            className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all text-left ${
                              activeBranch === b
                                ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                                : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{b}</span>
                            {activeBranch === b && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                          </button>
                        ))
                      ) : (
                        <div className="px-2.5 py-1.5 text-xs text-white/50">{activeBranch} (current)</div>
                      )}
                    </div>

                    <div className="border-t border-white/5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBranchDropdown(false);
                          setShowBranchModal(true);
                        }}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create new branch</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Export & Push Group */}
          <div className="flex items-center gap-1 bg-[#13131a] p-1 rounded-xl border border-white/10 shadow-sm">
            <motion.button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
              title="Export workspace as ZIP"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Export</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setShowCommitModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition"
              title="Push changes to Git repository"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Share className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Push</span>
            </motion.button>
          </div>

          {/* Auto Save Toggle Group — defaults to ON to preserve user progress */}
          <div className="flex items-center gap-1 bg-[#13131a] p-1 rounded-xl border border-white/10 shadow-sm">
            <motion.button
              type="button"
              onClick={() => {
                toggleAutoSave();
                const nextState = !autoSaveEnabled;
                if (nextState) {
                  toast.success("Auto Save enabled — all progress is automatically saved", { id: "autosave-status" });
                } else {
                  toast.info("Auto Save disabled", { id: "autosave-status" });
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                autoSaveEnabled
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/70 hover:bg-white/10'
              }`}
              title={autoSaveEnabled ? "Auto Save is ON (All files and progress save automatically)" : "Auto Save is OFF (Click to turn on)"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative flex h-2 w-2">
                {autoSaveEnabled && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${autoSaveEnabled ? 'bg-emerald-400' : 'bg-white/30'}`}></span>
              </span>
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto Save</span>
              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                autoSaveEnabled ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/40'
              }`}>
                {autoSaveEnabled ? 'ON' : 'OFF'}
              </span>
            </motion.button>
          </div>

          {/* Watch Status Badge (docs 38-40) */}
          <WatchStatusBadge
            active={watch.active}
            scansRun={watch.scansRun}
            fixesApplied={watch.fixesApplied}
            onClick={() => {
              useIDEStore.getState().setActivePanelTab('watch');
              useIDEStore.getState().setTerminalOpen(true);
            }}
          />

          {/* Integrations & Views Group */}
          {activeTab === 'AI Code Editor' && (
            <motion.button
              type="button"
              onClick={() => useIDEStore.getState().toggleSecondarySideBar()}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                secondarySideBarVisible
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-[#13131a] text-white/60 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle AI Chat & Prompt Section"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline font-medium">AI Section</span>
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={handleGithubConnect}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition cursor-pointer"
            title={githubAccount ? `Connected as ${githubAccount.username}` : 'Connect GitHub account'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {githubAccount ? (
              <img src={githubAccount.avatarUrl} alt="GitHub" className="w-3.5 h-3.5 rounded-full" />
            ) : (
              <Github className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="hidden xl:inline">GitHub</span>
          </motion.button>

          {(activeTab === 'Chat' || activeTab === 'AI Code Assistant') && (
            <motion.button
              type="button"
              onClick={() => setShowTurnMachine(!showTurnMachine)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                showTurnMachine
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : 'bg-[#13131a] text-white/60 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title="Show mcode Turn Machine"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Workflow className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xl:inline">Turn Machine</span>
            </motion.button>
          )}
        </div>
      </header>

      {/* WORKSPACE WRAPPER */}
      <div className="flex-1 overflow-hidden px-2 pb-2 flex">
        <div className="flex h-full w-full bg-[#0e0e0e] rounded-[16px] border border-white/10 overflow-hidden shadow-2xl relative">
          
          {/* LEFT SIDEBAR */}
          {(!zenMode || activeTab !== 'AI Code Editor') && (
          <aside className={`flex-shrink-0 bg-[#121212] border-r border-white/5 flex flex-col z-20 ${activeTab === 'AI Code Editor' ? 'w-14' : 'w-64'}`}>
            {activeTab === 'AI Code Editor' ? (
              <IDEActivitySidebar
                active={activeActivityBar}
                onSelectTab={(tabId) => setActiveActivityBar(tabId)}
                onSourceControl={() => setShowBranchDropdown(true)}
              />
            ) : (
            <>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative group flex items-center justify-center flex-shrink-0">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-40 group-hover:opacity-80 transition duration-300"></div>
                  <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-[#09090b] border border-white/15 p-0.5 flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="MCODE"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
                <span className="text-white font-bold tracking-wider text-sm">MCODE</span>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsHistoryOpen(true)} className="text-white/40 hover:text-white transition-colors flex items-center justify-center rounded-md hover:bg-white/5 p-1">
                    <Search className="w-4 h-4" />
                  </button>
                <span className="text-emerald-400 text-[10px] font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">v1.0.0</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-6 custom-scrollbar">
              
              {/* New Chat Button */}
              <button 
                onClick={() => {
                  setActiveWorkspaceId(null);
                  dispatch(clearChat());
                  window.history.replaceState({}, '', '/ai/chat');
                }}
                className="flex items-center justify-between w-full bg-[#1A1A1A] hover:bg-[#222222] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">New Chat</span>
                </div>
                <div className="flex items-center gap-1 text-white/30 text-[10px] font-mono font-medium">
                  <span className="px-1.5 py-0.5 bg-black/40 rounded border border-white/5">⌘</span>
                  <span className="px-1.5 py-0.5 bg-black/40 rounded border border-white/5">N</span>
                </div>
              </button>



              {/* Recent Chats Section */}
              <div className="flex flex-col mt-2">
                <div className="flex items-center justify-between px-4 mb-2">
                  <h3 className="text-white/30 text-[10px] font-bold tracking-[0.15em] uppercase">Recent Chats</h3>
                </div>

                {/* Group/Project Toolbar */}
                <div className="flex items-center justify-between px-4 mb-3">
                  <div className="flex bg-black/40 rounded-full p-[3px] border border-white/5">
                    <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-medium transition-colors text-[#666] hover:text-white">
                      <Hash className="w-3.5 h-3.5 opacity-60" />
                      Group
                    </button>
                    <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-medium transition-colors bg-[#252525] text-white/90 border border-white/5 shadow-sm">
                      <Folder className="w-3.5 h-3.5 opacity-80" />
                      Project
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5 pr-1">
                    <button className="text-[#666] hover:text-white transition-colors">
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-[#666] hover:text-white transition-colors">
                      <ListFilter className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-[#666] hover:text-white transition-colors">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {filteredChats.map(chat => (
                    <button 
                      key={chat.id} 
                      onClick={() => setActiveWorkspaceId(chat.id)}
                      className={`flex items-center justify-between w-full rounded-xl px-4 py-3 group transition-all ${chat.isActive ? 'bg-white/5 text-emerald-400 border border-white/5 hover:border-white/10' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                    >
                      <div className="flex gap-3 text-left">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 mt-0.5 ${chat.isActive ? 'text-blue-400' : ''}`} />
                        <span className={`text-xs font-medium leading-relaxed ${chat.isActive ? 'text-white/90 group-hover:text-white transition-colors' : ''}`}>
                          { (chat.title as string).split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                              {line}{i === 0 && <br/>}
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                        <button 
                          onClick={(e) => deleteChat(chat.id, e)} 
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </button>
                  ))}
                  
                  {filteredChats.length === 0 && (
                    <div className="text-center py-4 text-white/30 text-xs">No chats found.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Upgrade Card */}
            <div className="p-4 flex-shrink-0">
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-white/10 transition-all">
                {/* Glowing Top Border */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500 opacity-80"></div>
                {/* Ambient Internal Glow */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-12 bg-emerald-500/20 blur-xl pointer-events-none"></div>

                <div className="flex items-center gap-2 relative z-10">
                  <Crown className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">M Code Pro</span>
                </div>
                <div className="flex flex-col gap-1 relative z-10">
                  <span className="text-white/50 text-xs font-medium">Unlimited messages</span>
                  <span className="text-white/30 text-[10px]">Active until 12 Aug 2025</span>
                </div>
                <button className="flex items-center justify-between w-full mt-2 bg-[#1A1A1A] hover:bg-[#222222] border border-white/5 hover:border-emerald-500/30 rounded-lg px-3 py-2 transition-all group/btn relative z-10">
                  <span className="text-emerald-400 text-xs font-medium">Upgrade Plan</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400/50 group-hover/btn:translate-x-1 group-hover/btn:text-emerald-400 transition-all" />
                </button>
              </div>
            </div>

            {/* User Profile */}
            <div className="px-4 py-3 flex-shrink-0 relative" ref={profileMenuRef}>
              {isLoadingProfile ? (
                <div className="flex items-center justify-center gap-2 w-full rounded-xl px-3 py-2 border border-transparent">
                  <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                </div>
              ) : userProfile ? (
                <div 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 w-full rounded-xl px-3 py-2 transition-all hover:bg-white/5 cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : userProfile.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white/90 text-[13px] font-medium truncate">
                    {userProfile.name || userProfile.email}
                  </span>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/login')}
                  className="flex items-center justify-center gap-2 w-full rounded-xl px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all font-semibold text-sm"
                >
                  Login
                </motion.button>
              )}

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {showProfileMenu && userProfile && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute bottom-full left-4 mb-2 w-[220px] bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-1.5 flex flex-col">
                      <button className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-white/50" />
                          <span>Language</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                      </button>
                      <button className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Palette className="w-4 h-4 text-white/50" />
                          <span>App theme</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                      </button>
                      <button className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <div className="flex items-center gap-2.5">
                          <ZoomIn className="w-4 h-4 text-white/50" />
                          <span>Interface zoom</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                      </button>
                    </div>

                    <div className="h-px bg-white/10 mx-2" />

                    <div className="p-1.5 flex flex-col">
                      <button className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <BarChart2 className="w-4 h-4 text-white/50" />
                        <span>Usage stats</span>
                      </button>
                      <button className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <Rocket className="w-4 h-4 text-white/50" />
                        <span>Upgrade</span>
                      </button>
                    </div>

                    <div className="h-px bg-white/10 mx-2" />

                    <div className="p-1.5">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="h-14 flex items-center justify-between px-6 border-t border-white/5 bg-[#121212] flex-shrink-0">
              <button onClick={() => setIsHistoryOpen(true)} className="text-white/30 hover:text-white transition-colors">
                <History className="w-5 h-5" />
              </button>
              <button onClick={() => useIDEStore.getState().openSettings('models')} className="text-white/30 hover:text-white transition-colors cursor-pointer" title="Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button className="text-white/30 hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            </>
            )}
          </aside>
          )}

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0e0e0e]">
            
            {/* Background Ambient Glows */}
            <div className="absolute top-1/2 -left-64 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
            <div className="absolute top-1/2 -right-64 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

            {(activeTab === 'Chat' || activeTab === 'AI Code Assistant') && messages.length === 0 ? (
              /* EMPTY STATE (Chat or AI Code Assistant, no messages — the AI Code Editor tab shows the IDE view) */
              <div className="w-full h-full flex flex-col items-center justify-center px-4 relative z-10">
                <div className="mb-8 flex flex-col items-center gap-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative w-28 h-28 rounded-3xl p-2 bg-[#09090b] border border-white/20 shadow-[0_0_40px_rgba(59,130,246,0.4)] overflow-hidden flex items-center justify-center">
                      <img
                        src="/logo.png"
                        alt="MCODE"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    </div>
                  </motion.div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium shadow-sm backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ready</span>
                  </div>
                </div>
                <h1 className="text-[2.5rem] font-bold mb-10 tracking-tight text-white">What do you want to build?</h1>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition flex items-center gap-2" onClick={() => setPrompt('Create a website')}>
                    <Globe className="w-4 h-4 text-blue-400" />
                    Create a website
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition flex items-center gap-2" onClick={() => setPrompt('Build a mobile app')}>
                    <Monitor className="w-4 h-4 text-purple-400" />
                    Build a mobile app
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition flex items-center gap-2" onClick={() => setPrompt('Design a dashboard')}>
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    Design a dashboard
                  </motion.button>
                </div>
                <AnimatePresence>
                  {keysError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="w-full max-w-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-2 rounded-lg mb-4 text-center"
                    >
                      {keysError}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[24px] group mt-6">
                  {/* Premium Animated Glowing Border (Outer Glow) */}
                  <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 blur-[10px] opacity-50 group-focus-within:opacity-80 transition-opacity duration-500">
                    <div className="absolute inset-[-150%] mcode-input-glow"></div>
                  </div>
                  
                  {/* Premium Animated Glowing Border (Sharp Border) */}
                  <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 opacity-80 group-focus-within:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-[-150%] mcode-input-glow"></div>
                  </div>
                  
                  {/* Main background */}
                  <div className="absolute inset-[0px] bg-[#121212] rounded-[24px] z-0"></div>
                  
                  <div className="relative z-10 p-4 flex flex-col gap-2">
                    
                    {/* Top Action Bar (Upload & Git Branch) */}
                    <div className="flex items-center gap-3 px-1 pb-1">
                      <motion.button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-[13px] font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-md border border-purple-500/20 transition disabled:opacity-50 cursor-pointer" title={activeWorkspaceId ? "Project Options" : "Upload Folder, File, or ZIP"}>
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <UploadCloud className="w-4 h-4 text-purple-400"/>}
                        <span>{activeWorkspaceId ? (workspaces.find(w => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload Folder / File'}</span>
                        <ChevronDown className="w-3 h-3 opacity-50"/>
                      </motion.button>
                      <motion.button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-[13px] font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/20 transition cursor-pointer" title="Git Branch">
                        <GitBranch className="w-4 h-4 text-blue-400"/>
                        <span>{activeBranch}</span>
                        <ChevronDown className="w-3 h-3 opacity-50"/>
                      </motion.button>
                    </div>

                    {/* Textarea Container */}
                    <div className="bg-[#161616] rounded-[16px] p-3 flex flex-col border border-white/5 shadow-inner relative" ref={commandPickerRef}>
                      <textarea 
                        value={prompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrompt(val);
                          // Show picker when user types '/' (and nothing more, or a partial command)
                          if (val.startsWith('/')) {
                            setShowCommandPicker(true);
                          } else if (!val.includes('/')) {
                            setShowCommandPicker(false);
                          }
                        }}
                        placeholder="Ask a follow-up..." 
                        className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-1 py-1 min-h-[60px] text-[15px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
                          if (e.key === 'Escape') setShowCommandPicker(false);
                        }}
                      />
                      {/* Slash Command Picker */}
                      <AnimatePresence>
                        {showCommandPicker && prompt.startsWith('/') && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50 overflow-y-auto max-h-60"
                          >
                            {(() => {
                              const cmd = prompt.slice(1).toLowerCase();
                              const filtered = WEB_SLASH_COMMANDS.filter(c => c.cmd.includes(cmd));
                              return filtered.length > 0 ? filtered.map((c, i) => (
                                <motion.button
                                  key={c.cmd}
                                  onClick={() => { setPrompt('/' + c.cmd); setShowCommandPicker(false); }}
                                  className="w-full text-left text-xs text-white/70 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition flex items-center gap-2"
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                >
                                  <span className="text-[13px]">{c.icon}</span>
                                  <span>/{c.cmd}</span>
                                  <span className="text-[#666] ml-auto">{c.desc}</span>
                                </motion.button>
                              )) : (
                                <div className="text-[11px] text-[#888] px-3 py-2">No matching commands</div>
                              );
                            })()}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex items-center justify-between mt-2">
                        {/* Left Group: Plus */}
                        <div className="flex items-center gap-2">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50" title="Attach file or context">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Paperclip className="w-4 h-4" />}
                          </motion.button>
                        </div>

                        {/* Middle Group: Sparkle, Slash, God (Separated) */}
                        <div className="flex items-center gap-2 ml-auto mr-6">
                          <SparkleButton setPrompt={setPrompt} advancedMode={mode === 'agent'} watchMode={watchMode} onToggleWatch={toggleWatchMode} />
                          {mode === 'agent' && (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setPrompt('/')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title="Command Palette (/)">
                              <Slash className="w-4 h-4" />
                            </motion.button>
                          )}
                          {mode === 'agent' && (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => dispatch(setGodMode(!godMode))} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-250 text-xs font-medium border backdrop-blur-md ${godMode ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                              <Zap className="w-3.5 h-3.5" /> God
                            </motion.button>
                          )}
                        </div>

                        {/* Right Group: Model Selector and Send/Stop */}
                        <div className="flex items-center gap-2">
                          <ModelSelector 
                            onAuthRequired={() => router.push('/login')} 
                          />
                          <AnimatePresence mode="wait">
                            {isStreaming ? (
                              <motion.button 
                                key="stop-btn"
                                type="button" 
                                onClick={interrupt} 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                className="w-8 h-8 rounded-[10px] bg-[#303030] hover:bg-[#404040] flex items-center justify-center transition-all"
                              >
                                <Square className="w-4 h-4 text-[#d0d0d0] fill-current" />
                              </motion.button>
                            ) : (
                              <motion.button 
                                key="send-btn"
                                type="submit" 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50" 
                                disabled={!prompt.trim() || isStreaming}
                                title="Send message"
                              >
                                <Send className="w-4 h-4 drop-shadow-md ml-0.5" />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : activeTab !== 'AI Code Editor' ? (
              /* FULL SCREEN CHAT VIEW */
              <motion.div
                className="flex flex-col w-full h-full relative bg-[#0e0e0e] z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col gap-6 custom-scrollbar">
                  <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
                    {keysError && (
                      <motion.div
                        key="keys-error-alert"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-2 rounded-lg text-center"
                      >
                        {keysError}
                      </motion.div>
                    )}
                    {enhancedPrompt?.pending && (
                      <ThinkingIndicator label="expanding your prompt..." />
                    )}
                    {enhancedPrompt && !enhancedPrompt.pending && !enhancedPrompt.accepted && enhancedPrompt.enhanced && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 p-4">
                        <div className="text-xs text-white/50 mb-2">Your prompt looks short — expanded it:</div>
                        <div className="text-sm text-white/80 bg-black/30 rounded-lg p-3">{enhancedPrompt.enhanced}</div>
                        <div className="flex gap-2 mt-3">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { dispatch(promptEnhancementResolved(true)); send(enhancedPrompt.enhanced); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium">
                            Use expanded version
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { dispatch(promptEnhancementResolved(false)); send(enhancedPrompt.original); }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium">
                            Keep original
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                    {clarifyQuestions && clarifyQuestions.map((q) => (
                      <ClarifyCard key={q.question} question={q} onAnswer={(question, answer) => {
                        dispatch(clarifyAnswered({ question, answer }));
                        const socket = getSocket();
                        if (socket && socket.connected) {
                          socket.emit('clarify:answer', { question, answer });
                        }
                      }} />
                    ))}
                    <CodebaseReadingCard state={codebaseReading} />
                    <RoleAssignmentTable assignments={roleAssignments} />
                    <TodoCard plan={plan as any} />
                    {godMode && (
                      <WaveProgress
                        waves={waves as any}
                        subagents={subagents as any}
                        buildSummary={buildSummary as any}
                        godMode={godMode}
                        projectTier={projectTier}
                        concurrency={concurrency}
                      />
                    )}
                    {comparisonRows && comparisonRows.length > 0 && (
                      <ComparisonTable rows={comparisonRows} pass={verificationPass} maxPasses={8} title="Verification" />
                    )}
                    {securityAudit && securityAudit.rows && securityAudit.rows.length > 0 && (
                      <ComparisonTable rows={securityAudit.rows} pass={securityAudit.pass} maxPasses={5} title="Security Audit" />
                    )}
                    {playwrightAudit && (
                      <PlaywrightAuditPanel
                        active={playwrightAudit.active}
                        pass={playwrightAudit.pass ?? 1}
                        maxPasses={5}
                        issues={playwrightAudit.issues ?? []}
                        clean={playwrightAudit.clean ?? false}
                      />
                    )}
                    <PermissionModal request={permissionRequest as any} onAnswer={answerPermission} />
                    <AnimatePresence>
                    {messages.map((msg, idx) => {
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showAvatar =
                        msg.role === 'assistant' &&
                        msg.kind !== 'tool' &&
                        (!prevMsg || prevMsg.role !== 'assistant' || prevMsg.kind === 'tool');
                      return (
                        <ChatMessage
                          key={`chat-msg-${idx}-${msg.id || msg.role || 'm'}`}
                          msg={msg}
                          idx={idx}
                          size="md"
                          isStreaming={isStreaming && idx === messages.length - 1}
                          undo={undo as any}
                          isNormalChat={mode === 'chat'}
                          showAvatar={showAvatar}
                        />
                      );
                    })}
                    {showThinkingIndicator && (
                      <motion.div
                        key="thinking-indicator-chat"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center text-xs">
                          M
                        </div>
                        <div className="flex-1 min-w-0">
                          <AgentActionSequence key="agent-action-sequence-1" mode={mode} />
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                    <ReactionBurst key="chat-reaction-burst" emoji="✓" show={showReactionBurst} />
                    {/* Scroll sentinel — triggers useEffect auto-scroll to bottom */}
                    <div key="chat-scroll-sentinel" ref={chatEndRef} />
                  </div>
                </div>
                {/* Chat Input Bottom */}
                <div className="p-6 md:pb-8 w-full max-w-4xl mx-auto flex flex-col items-center">
                  <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[24px] group mt-2">
                    {/* Premium Animated Glowing Border (Outer Glow) */}
                    <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 blur-[10px] opacity-50 group-focus-within:opacity-80 transition-opacity duration-500">
                      <div className="absolute inset-[-150%] mcode-input-glow"></div>
                    </div>
                    
                    {/* Premium Animated Glowing Border (Sharp Border) */}
                    <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 opacity-80 group-focus-within:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-[-150%] mcode-input-glow"></div>
                    </div>
                    
                    {/* Main background */}
                    <div className="absolute inset-[0px] bg-[#121212] rounded-[24px] z-0"></div>
                    
                    <div className="relative z-10 p-4 flex flex-col gap-2">
                      
                      {/* Top Action Bar (Upload & Git Branch) */}
                      <div className="flex items-center gap-3 px-1 pb-1">
                        <motion.button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-[13px] font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-md border border-purple-500/20 transition disabled:opacity-50 cursor-pointer" title={activeWorkspaceId ? "Project Options" : "Upload Folder, File, or ZIP"}>
                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <UploadCloud className="w-4 h-4 text-purple-400"/>}
                          <span>{activeWorkspaceId ? (workspaces.find(w => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload Folder / File'}</span>
                          <ChevronDown className="w-3 h-3 opacity-50"/>
                        </motion.button>
                        <motion.button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-[13px] font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/20 transition cursor-pointer" title="Git Branch">
                          <GitBranch className="w-4 h-4 text-blue-400"/>
                          <span>{activeBranch}</span>
                          <ChevronDown className="w-3 h-3 opacity-50"/>
                        </motion.button>
                      </div>

                      {/* Textarea Container */}
                      <div className="bg-[#161616] rounded-[16px] p-3 flex flex-col border border-white/5 shadow-inner relative" ref={commandPickerRef}>
                        <textarea
                          value={prompt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPrompt(val);
                            if (val.startsWith('/')) { setShowCommandPicker(true); }
                            else if (!val.includes('/')) { setShowCommandPicker(false); }
                          }}
                          placeholder="Ask a follow-up..."
                          className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-1 py-1 min-h-[60px] text-[15px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
                            if (e.key === 'Escape') setShowCommandPicker(false);
                          }}
                        />
                        {/* Slash Command Picker */}
                        <AnimatePresence>
                          {showCommandPicker && prompt.startsWith('/') && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.95 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50 overflow-y-auto max-h-60"
                            >
                              {(() => {
                                const cmd = prompt.slice(1).toLowerCase();
                                const filtered = WEB_SLASH_COMMANDS.filter(c => c.cmd.includes(cmd));
                                return filtered.length > 0 ? filtered.map((c, i) => (
                                  <motion.button
                                    key={c.cmd}
                                    onClick={() => { setPrompt('/' + c.cmd); setShowCommandPicker(false); }}
                                    className="w-full text-left text-xs text-white/70 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition flex items-center gap-2"
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                  >
                                    <span className="text-[13px]">{c.icon}</span>
                                    <span>/{c.cmd}</span>
                                    <span className="text-[#666] ml-auto">{c.desc}</span>
                                  </motion.button>
                                )) : (
                                  <div className="text-[11px] text-[#888] px-3 py-2">No matching commands</div>
                                );
                              })()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50" title="Upload Project (Folder, File, ZIP)">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Plus className="w-4 h-4" />}
                          </motion.button>
                          <SparkleButton setPrompt={setPrompt} advancedMode={mode === 'agent'} watchMode={watchMode} onToggleWatch={toggleWatchMode} />
                          {mode === 'agent' && (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setPrompt('/')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title="Command Palette (/)">
                              <Slash className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <ModelSelector />
                          <AnimatePresence mode="wait">
                          {isStreaming ? (
                            <motion.button
                              key="stop-btn"
                              type="button"
                              onClick={interrupt}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-all border border-red-500/50"
                            >
                              <Square className="w-3 h-3 text-red-400 fill-current" />
                            </motion.button>
                          ) : (
                            <motion.button
                              key="send-btn"
                              type="submit" 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50" 
                              disabled={!prompt.trim() || isStreaming}
                            >
                              <ArrowUp className="w-4 h-4 drop-shadow-md" />
                            </motion.button>
                          )}
                          </AnimatePresence>
                        </div>
                        </div>
                    </div>
                  </div>
                </form>
                </div>
              </motion.div>
            ) : (
              /* IDE VIEW */
              <motion.div
                className="w-full h-full z-10 relative flex flex-col min-w-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0 h-full">
                {/* Left Activity Panel (Explorer, Search, Source Control, Run & Debug, Testing, Languages) */}
                <ResizablePanel
                  id="left-activity-panel"
                  panelRef={leftPanelRef}
                  defaultSize="260px"
                  minSize="180px"
                  maxSize="480px"
                  collapsible
                  collapsedSize={0}
                  className="ide-left-panel"
                >
                  <div className="h-full flex flex-col border-r border-white/5 bg-[#0e0e0e] overflow-hidden w-full">
                    {activeActivityBar === 'explorer' && (
                      <ExplorerPanel
                        workspaceId={activeWorkspaceId}
                        projectName={workspaces.find((w) => w._id === activeWorkspaceId)?.name || 'Folders'}
                      />
                    )}
                    {activeActivityBar === 'search' && (
                      <SearchPanel />
                    )}
                    {activeActivityBar === 'source-control' && (
                      <SourceControlPanel />
                    )}
                    {activeActivityBar === 'run-debug' && (
                      <RunDebugPanel workspaceId={activeWorkspaceId} />
                    )}
                    {activeActivityBar === 'languages' && (
                      <LanguagesPanel />
                    )}
                    {activeActivityBar === 'testing' && (
                      <TestingPanel />
                    )}
                    {activeActivityBar === 'remote' && (
                      <RemoteExplorerPanel
                        workspaceId={activeWorkspaceId}
                        activeBranch={activeBranch}
                      />
                    )}
                    {activeActivityBar === 'containers' && (
                      <ContainersPanel />
                    )}
                    {activeActivityBar === 'android' && (
                      <AndroidEmulatorsPanel />
                    )}
                  </div>
                </ResizablePanel>

                <ResizablePanelHandle
                  className={`w-[3px] bg-[#222222] hover:bg-[#3b82f6] transition-colors ${
                    !isSidebarOpen || activeActivityBar === 'extensions' || zenMode ? 'hidden pointer-events-none' : ''
                  }`}
                />

                {/* Editor & Terminal Center Pane */}
                <ResizablePanel minSize="30%">
                {activeActivityBar === 'extensions' ? (
                  <div className="h-full flex-1 flex flex-col min-w-0 bg-[#0e0e0e] overflow-hidden">
                    <ExtensionsMarketplace editorApi={editorApi} />
                  </div>
                ) : (
                  <div className="h-full flex-1 flex flex-col min-w-0 bg-[#0e0e0e]">
                    <EditorPane
                      workspaceId={activeWorkspaceId as string}
                      workspaces={workspaces}
                      onSelectWorkspace={(id) => {
                        if (id !== activeWorkspaceId) {
                          useIDEStore.setState({ openFiles: [], activePath: null });
                        }
                        setActiveWorkspaceId(id);
                        try { localStorage.setItem('mcode_active_workspace_id', id); } catch {}
                        useIDEStore.getState().setActiveActivityBar('explorer');
                        useIDEStore.getState().setSidebarOpen(true);
                        leftPanelRef.current?.expand();
                        bumpRefresh();
                      }}
                      onOpenFolder={() => setIsModalsOpen(true)}
                      onCloneRepo={() => setIsModalsOpen(true)}
                    />
                    {isTerminalOpen && !zenMode && (
                      <BottomPanel
                        workspaceId={activeWorkspaceId}
                        messages={messages}
                        onCommand={sendTerminalCommand}
                        onInterrupt={interrupt}
                        defaultTab="terminal"
                      />
                    )}
                  </div>
                )}
                </ResizablePanel>

                {/* AI Chat Right Pane */}
                {!zenMode && secondarySideBarVisible && (
                  <>
                    <ResizablePanelHandle className="w-[3px] bg-[#222222] hover:bg-[#10b981] transition-colors" />
                    <ResizablePanel
                      id="right-ai-panel"
                      defaultSize="380px"
                      minSize="280px"
                      maxSize="650px"
                    >
                      <div className="h-full border-l border-white/5 bg-[#0e0e0e] flex flex-col relative z-20 w-full min-w-[280px] overflow-hidden">
                    <div className="p-3 px-4 flex items-center justify-between border-b border-white/5 bg-[#121212]/50">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-white">AI Assistance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Mode toggle pill: Chat vs Agent */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => dispatch(setMode('chat'))}
                            className={`px-2 py-0.5 rounded-md transition font-medium ${mode === 'chat' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                          >
                            Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => dispatch(setMode('agent'))}
                            className={`px-2 py-0.5 rounded-md transition font-medium ${mode === 'agent' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-white/40 hover:text-white'}`}
                          >
                            Agent
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => useIDEStore.getState().setSecondarySideBarVisible(false)}
                          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
                          title="Close AI Panel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
                    {enhancedPrompt?.pending && (
                      <ThinkingIndicator label="expanding your prompt..." size="sm" />
                    )}
                    {enhancedPrompt && !enhancedPrompt.pending && !enhancedPrompt.accepted && enhancedPrompt.enhanced && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 p-4">
                        <div className="text-xs text-white/50 mb-2">Your prompt looks short — expanded it:</div>
                        <div className="text-sm text-white/80 bg-black/30 rounded-lg p-3">{enhancedPrompt.enhanced}</div>
                        <div className="flex gap-2 mt-3">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { dispatch(promptEnhancementResolved(true)); send(enhancedPrompt.enhanced); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium">
                            Use expanded version
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { dispatch(promptEnhancementResolved(false)); send(enhancedPrompt.original); }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium">
                            Keep original
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                    {clarifyQuestions && clarifyQuestions.map((q) => (
                      <ClarifyCard key={q.question} question={q} onAnswer={(question, answer) => {
                        dispatch(clarifyAnswered({ question, answer }));
                        const socket = getSocket();
                        if (socket && socket.connected) {
                          socket.emit('clarify:answer', { question, answer });
                        }
                      }} />
                    ))}
                    <CodebaseReadingCard state={codebaseReading} />
                    <RoleAssignmentTable assignments={roleAssignments} />
                    <TodoCard plan={plan as any} />
                    {godMode && (
                      <div className="mb-2">
                        <WaveProgress
                          waves={waves as any}
                          subagents={subagents as any}
                          buildSummary={buildSummary as any}
                          godMode={godMode}
                          projectTier={projectTier}
                          concurrency={concurrency}
                        />
                      </div>
                    )}
                    {comparisonRows && comparisonRows.length > 0 && (
                      <ComparisonTable rows={comparisonRows} pass={verificationPass} maxPasses={8} title="Verification" />
                    )}
                    {securityAudit && securityAudit.rows && securityAudit.rows.length > 0 && (
                      <ComparisonTable rows={securityAudit.rows} pass={securityAudit.pass} maxPasses={5} title="Security Audit" />
                    )}
                    {playwrightAudit && (
                      <PlaywrightAuditPanel
                        active={playwrightAudit.active}
                        pass={playwrightAudit.pass ?? 1}
                        maxPasses={5}
                        issues={playwrightAudit.issues ?? []}
                        clean={playwrightAudit.clean ?? false}
                      />
                    )}
                    <PermissionModal request={permissionRequest as any} onAnswer={answerPermission} />
                      <AnimatePresence>
                      {messages.map((msg, idx) => (
                        <ChatMessage
                          key={`ide-msg-${idx}-${msg.id || msg.role || 'm'}`}
                          msg={msg}
                          idx={idx}
                          size="sm"
                          isStreaming={isStreaming && idx === messages.length - 1}
                          undo={undo as any}
                          isNormalChat={mode === 'chat'}
                        />
                      ))}
                    </AnimatePresence>
                      {showThinkingIndicator && (
                        <motion.div
                          key="thinking-indicator-ide"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                          className="flex items-start gap-2.5"
                        >
                          <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center text-xs">
                            M
                          </div>
                          <div className="flex-1 min-w-0">
                            <AgentActionSequence key="agent-action-sequence-2" mode={mode} />
                          </div>
                        </motion.div>
                      )}
                      <ReactionBurst key="ide-reaction-burst" emoji="✓" show={showReactionBurst} />
                      {/* Scroll sentinel — triggers useEffect auto-scroll to bottom */}
                      <div key="ide-scroll-sentinel" ref={ideChatEndRef} />
                  </div>

                  {/* Inline Chat Input */}
                  <div className="p-4 border-t border-white/5 bg-[#0c0c0c]">
                    <form onSubmit={handleSubmit} className="w-full relative rounded-[20px] group">
                      <div className="absolute -inset-[1.5px] rounded-[21px] overflow-hidden z-0">
                        <div className="absolute inset-[-150%] mcode-input-glow-reversed opacity-50 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                      </div>
                      <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
                        <div className="relative z-10 rounded-[20px] p-2 flex flex-col gap-2" ref={commandPickerRef}>
                          {/* Top Action Bar (Upload & Git Branch) */}
                          <div className="flex items-center gap-3 px-1 pb-1">
                            <motion.button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-[13px] font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-md border border-purple-500/20 transition disabled:opacity-50 cursor-pointer" title={activeWorkspaceId ? "Project Options" : "Upload Folder, File, or ZIP"}>
                              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <UploadCloud className="w-4 h-4 text-purple-400"/>}
                              <span>{activeWorkspaceId ? (workspaces.find(w => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload Folder'}</span>
                              <ChevronDown className="w-3 h-3 opacity-50"/>
                            </motion.button>
                            <motion.button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-[13px] font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/20 transition cursor-pointer" title="Git Branch">
                              <GitBranch className="w-4 h-4 text-blue-400"/>
                              <span>{activeBranch}</span>
                              <ChevronDown className="w-3 h-3 opacity-50"/>
                            </motion.button>
                          </div>

                          <textarea
                          value={prompt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPrompt(val);
                            if (val.startsWith('/')) { setShowCommandPicker(true); }
                            else if (!val.includes('/')) { setShowCommandPicker(false); }
                          }}
                          placeholder="Ask AI code agent..."
                          className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-2 py-1 min-h-[40px] text-sm"
                          onKeyDown={(e) => {
                            if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
                            if(e.key === 'Escape') setShowCommandPicker(false);
                          }}
                        />
                        {/* Slash Command Picker */}
                        <AnimatePresence>
                          {showCommandPicker && prompt.startsWith('/') && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.95 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50 overflow-y-auto max-h-60"
                            >
                              {(() => {
                                const cmd = prompt.slice(1).toLowerCase();
                                const filtered = WEB_SLASH_COMMANDS.filter(c => c.cmd.includes(cmd));
                                return filtered.length > 0 ? filtered.map((c, i) => (
                                  <motion.button
                                    key={c.cmd}
                                    onClick={() => { setPrompt('/' + c.cmd); setShowCommandPicker(false); }}
                                    className="w-full text-left text-xs text-white/70 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition flex items-center gap-2"
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                  >
                                    <span className="text-[13px]">{c.icon}</span>
                                    <span>/{c.cmd}</span>
                                    <span className="text-[#666] ml-auto">{c.desc}</span>
                                  </motion.button>
                                )) : (
                                  <div className="text-[11px] text-[#888] px-3 py-2">No matching commands</div>
                                );
                              })()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50" title="Upload Project (Folder, File, ZIP)">
                              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Paperclip className="w-3.5 h-3.5" />}
                            </motion.button>
                            <SparkleButton setPrompt={setPrompt} advancedMode={mode === 'agent'} watchMode={watchMode} onToggleWatch={toggleWatchMode} />
                            {mode === 'agent' && (
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setPrompt('/')} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title="Command Palette (/)">
                                <Slash className="w-4 h-4" />
                              </motion.button>
                            )}
                            {mode === 'agent' && (
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => dispatch(setGodMode(!godMode))} className={`px-3 h-7 rounded-lg flex items-center gap-2 transition-all duration-250 text-xs font-medium border backdrop-blur-md ${godMode ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                                <Zap className="w-3.5 h-3.5" /> God
                              </motion.button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ModelSelector />
                            <AnimatePresence mode="wait">
                              {isStreaming ? (
                                <motion.button 
                                  key="stop-btn"
                                  type="button" 
                                  onClick={interrupt} 
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.9, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                  className="w-7 h-7 rounded-[8px] bg-[#303030] hover:bg-[#404040] flex items-center justify-center transition-all"
                                >
                                  <Square className="w-3.5 h-3.5 text-[#d0d0d0] fill-current" />
                                </motion.button>
                              ) : (
                                <motion.button 
                                  key="send-btn"
                                  type="submit" 
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.9, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                  className="w-7 h-7 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 transition disabled:opacity-50" 
                                  disabled={!prompt.trim() || isStreaming}
                                  title="Send message"
                                >
                                  <Send className="w-3.5 h-3.5 ml-0.5" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
                </ResizablePanel>
                </>
                )}
                </ResizablePanelGroup>

                {/* VS Code-style Status Bar */}
                {!zenMode && (
                  <div className="h-[22px] flex items-center justify-between bg-[#007acc] text-white text-[11px] px-2 select-none flex-shrink-0 z-30">
                    {/* Left side */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => useIDEStore.getState().setActiveActivityBar('source-control')}
                        className="flex items-center gap-1 px-1 hover:bg-white/20 rounded transition cursor-pointer h-full"
                        title={`Branch: ${activeBranch}`}
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>{activeBranch || 'main'}</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 px-1 hover:bg-white/20 rounded transition cursor-pointer h-full"
                        title="0 Errors, 0 Warnings"
                      >
                        <AlertCircle className="w-3 h-3" />
                        <span>0</span>
                        <AlertTriangle className="w-3 h-3 ml-0.5" />
                        <span>0</span>
                      </button>
                    </div>
                    {/* Right side — Layout Controls */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => useIDEStore.getState().setActivePanelTab('terminal')}
                        className="flex items-center gap-1 px-1 hover:bg-white/20 rounded transition cursor-pointer h-full"
                        title="Layout"
                      >
                        <LayoutGrid className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = useIDEStore.getState();
                          if (s.isSidebarOpen) {
                            s.setSidebarOpen(false);
                          } else {
                            s.setSidebarOpen(true);
                          }
                        }}
                        className={`flex items-center px-1 hover:bg-white/20 rounded transition cursor-pointer h-full ${isSidebarOpen ? 'bg-white/15' : ''}`}
                        title="Toggle Primary Side Bar"
                      >
                        <PanelLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => useIDEStore.getState().toggleTerminal()}
                        className={`flex items-center px-1 hover:bg-white/20 rounded transition cursor-pointer h-full ${isTerminalOpen ? 'bg-white/15' : ''}`}
                        title="Toggle Panel"
                      >
                        <PanelBottom className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => useIDEStore.getState().toggleSecondarySideBar()}
                        className={`flex items-center px-1 hover:bg-white/20 rounded transition cursor-pointer h-full ${secondarySideBarVisible ? 'bg-white/15' : ''}`}
                        title="Toggle Secondary Side Bar"
                      >
                        <PanelRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center px-1 hover:bg-white/20 rounded transition cursor-pointer h-full ml-1"
                        title="No Notifications"
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {zenMode && (
                  <button
                    onClick={() => setZenMode(false)}
                    className="absolute top-10 right-4 z-50 px-3 py-1.5 rounded-lg bg-[#18181b]/95 border border-white/20 text-white/80 hover:text-white text-xs flex items-center gap-1.5 shadow-2xl backdrop-blur-md transition hover:bg-[#252529]"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-blue-400" /> Exit Zen Mode (Esc)
                  </button>
                )}

              </motion.div>
            )}
          </main>
        </div>
      </div>

      {/* Branch selector dropdown */}
      <AnimatePresence>
        {showBranchDropdown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="branch-dropdown fixed top-16 right-6 z-[200] w-56 bg-[#151515] border border-white/10 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-white/5 text-xs font-semibold text-white/50 uppercase tracking-wider">
              Switch Branch
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {branches.map((branch) => (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  key={branch}
                  onClick={() => switchBranch(branch)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
                    branch === activeBranch
                      ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" /> {branch}
                </motion.button>
              ))}
              {branches.length === 0 && !activeWorkspaceId && (
                <div className="px-3 py-2 text-xs text-white/40">No branches found</div>
              )}
            </div>
            <div className="p-2 border-t border-white/5">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setBranchName(''); setShowBranchModal(true); }}
                className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Create new branch
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notifications (top-right, auto-dismissing) */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {(localToasts ?? []).map((toast, i) => (
            <motion.div
              key={toast.id && String(toast.id).trim() ? String(toast.id) : `local-toast-${i}`}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={`max-w-sm px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 border ${
                toast.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Server-side toasts (god-mode, from Redux store) */}
        <AnimatePresence>
          {(serverToasts ?? []).map((toast, i) => {
            const isError = toast.kind === 'error' || toast.kind === 'failed';
            return (
              <motion.div
                key={toast.id && String(toast.id).trim() ? String(toast.id) : `server-toast-${i}`}
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className={`max-w-sm px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 border ${
                  isError
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {isError ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{toast.text || (toast as any).message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
	      </div>

      {/* Commit Message Modal (replaces window.prompt) */}
      <AnimatePresence>
        {showCommitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCommitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="bg-[#18181b] border border-white/20 rounded-xl p-6 w-80 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-sm font-medium text-white/80 mb-4">Commit Message</h3>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition mb-4"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePush(); if (e.key === 'Escape') setShowCommitModal(false); }}
                />
                {/* GitHub repo URL — only needed for zip-uploaded workspaces that aren't linked to a repo yet */}
                <input
                  type="url"
                  value={githubRepoForPush}
                  onChange={(e) => setGithubRepoForPush(e.target.value)}
                  placeholder="GitHub repo URL (e.g. https://github.com/user/repo.git) — for new repos"
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition mb-4"
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePush(); if (e.key === 'Escape') setShowCommitModal(false); }}
                />
                <div className="flex gap-2 justify-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCommitModal(false)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handlePush}
                  className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition"
                >
                  Commit & Push
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Branch Modal (replaces window.prompt) */}
      <AnimatePresence>
        {showBranchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowBranchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="bg-[#18181b] border border-white/20 rounded-xl p-6 w-80 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-white/80 mb-4">New Branch</h3>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Enter branch name..."
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition mb-4"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowBranchModal(false); }}
              />
              <div className="flex gap-2 justify-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBranchModal(false)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreateBranch}
                  className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition"
                >
                  Create
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white tracking-tight">Chat History</h2>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-white/5 flex-shrink-0 bg-white/[0.02]">
                <div className="relative">
                  <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search past conversations..." 
                    className="w-full bg-[#151515] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {filteredChats.map(chat => (
                  <button 
                    key={chat.id} 
                    onClick={() => {
                      setActiveWorkspaceId(chat.id);
                      setIsHistoryOpen(false);
                    }}
                    className="flex flex-col gap-1 w-full text-left p-4 hover:bg-white/5 rounded-xl transition-colors border-b border-transparent hover:border-white/5 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] font-medium text-white/90 group-hover:text-emerald-400 transition-colors">{chat.title.replace('\n', ' ')}</span>
                      <span className="text-[11px] text-white/30 font-medium">{chat.isActive ? 'Just now' : '2 days ago'}</span>
                    </div>
                    <span className="text-xs text-white/40 line-clamp-1">
                      {chat.summary}
                    </span>
                  </button>
                ))}
                
                {filteredChats.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <Search className="w-5 h-5 text-white/20" />
                    </div>
                    <span className="text-sm font-medium text-white/40">No matching history found</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mode Switch Modal (Agent -> Editor) */}
      <AnimatePresence>
        {showModeSwitchModal && (
          <div 
            onClick={() => setShowModeSwitchModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white cursor-default"
            >
              <div className="flex items-center gap-3">
                <div className="relative group flex items-center justify-center flex-shrink-0">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-50"></div>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#09090b] border border-white/15 p-0.5 flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="MCODE"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Switch to AI Code Editor</h3>
                  <p className="text-xs text-white/50">Choose how you want to proceed into the editor</p>
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                You are switching from AI Code Assistant to the Editor. You can switch into your current project, start fresh with the Welcome Screen, or continue in Assistant mode.
              </p>

              <div className="flex flex-col gap-2.5 pt-2">
                {/* 2nd Button: Switch to AI Code Editor mode (Current Project) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModeSwitchModal(false);
                    executeTabSwitch('AI Code Editor', false);
                  }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#252526] hover:bg-[#2e2e30] border border-white/10 text-left transition group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                      Switch in AI Code Editor mode (Current Project)
                    </div>
                    <div className="text-[11px] text-white/50">
                      Open imported project files and media directly in the editor.
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white" />
                </button>

                {/* 3rd Button: Start New Process in AI Code Editor mode (Welcome Screen) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModeSwitchModal(false);
                    executeTabSwitch('AI Code Editor', true);
                  }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#094771]/40 hover:bg-[#094771]/70 border border-[#0078d4]/40 text-left transition group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#4fc1ff]">
                      Start New Process (mcode Welcome Screen)
                    </div>
                    <div className="text-[11px] text-white/60">
                      Opens the full-screen Welcome page to select 54+ languages and start fresh.
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-[#4fc1ff]" />
                </button>

                {/* 1st Button: Continue in AI Code Agent mode */}
                <button
                  type="button"
                  onClick={() => setShowModeSwitchModal(false)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white text-center rounded-xl hover:bg-white/5 transition cursor-pointer mt-1"
                >
                  Continue in AI Code Agent mode
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal (Image 2) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-hidden">
            <SettingsPage
              onClose={() => useIDEStore.getState().setSettingsOpen(false)}
              initialTab={settingsInitialTab || 'models'}
            />
          </div>
        )}
      </AnimatePresence>

      {/* IDE Menu Palettes & Dialogs */}
      <QuickOpenPalette workspaceId={activeWorkspaceId} />
      <SymbolPalette />
      <GoToLineModal />
      <ShortcutsReferenceModal />
      <AboutModal />
      <ReleaseNotesModal />
      <TasksModal />
      <QuickSettingsPanel />
      <AdvancedSettingsModal />
      <GeneralSettingsModal />

      {/* mcode Turn Machine — live overlay for AI Code Assistant (UI side) */}
      <AnimatePresence>
        {showTurnMachine && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTurnMachine(false)}
          >
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[90vh] overflow-y-auto">
                <McodeTurnMachineVisualization
                  state={{
                    currentPhase: isStreaming ? 'streaming' : (mode === 'agent' ? 'executing_tools' : 'idle'),
                    transitions: [],
                    waves: godMode ? waves : undefined,
                    subagents: godMode ? subagents : undefined,
                  }}
                  showOverlay={true}
                  onClose={() => setShowTurnMachine(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKSPACE MODALS (Upload / ZIP / Folder / GitHub Clone) */}
      <WorkspaceModals
        isOpen={isModalsOpen}
        onClose={() => setIsModalsOpen(false)}
        onUploadZip={handleUploadZip}
        onUploadFolder={handleUploadFolder}
        onUploadDirectoryHandle={handleUploadDirectoryHandle}
        onUploadDataTransferItems={handleUploadDataTransferItems}
        onUploadSingleFile={handleUploadSingleFile}
        onCloneGit={handleCloneGit}
        onStartUploading={(text) => {
          if (text) {
            setIsUploading(true);
            setUploadProgressText(text);
          } else {
            setIsUploading(false);
            setUploadProgressText('');
          }
        }}
      />

      {/* COMMIT & PUSH MODAL */}
      <AnimatePresence>
        {showCommitModal && (
          <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#181820] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base">Push to Git</h3>
                </div>
                <button onClick={() => setShowCommitModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Commit Message</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Initial commit"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Target Branch</label>
                  <div className="text-xs font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-blue-300">
                    {activeBranch}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">GitHub Repo URL (Optional for zip projects)</label>
                  <input
                    type="text"
                    value={githubRepoForPush}
                    onChange={(e) => setGithubRepoForPush(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCommitModal(false)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePush}
                  className="px-4 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg transition flex items-center gap-1.5"
                >
                  <Share className="w-3.5 h-3.5" />
                  Push Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE BRANCH MODAL */}
      <AnimatePresence>
        {showBranchModal && (
          <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#181820] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-base">Create New Branch</h3>
                </div>
                <button onClick={() => setShowBranchModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-1">Branch Name</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="feature/new-header"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBranch();
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create & Checkout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION STACK */}
      <div className="fixed bottom-5 right-5 z-[400] flex flex-col gap-2 pointer-events-none">
        {localToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium flex items-center gap-2 pointer-events-auto ${
              t.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-200'
                : t.type === 'info'
                ? 'bg-blue-950/90 border-blue-500/30 text-blue-200'
                : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            {t.type === 'info' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </div>

      {/* GLOBAL HIGH-TECH ANIMATED UPLOAD OVERLAY */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121215] border border-purple-500/30 rounded-2xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(168,85,247,0.25)] relative flex flex-col items-center gap-4 overflow-hidden"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-purple-500/20 bg-purple-500/10 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                </div>
                <Sparkles className="w-5 h-5 text-purple-300 absolute -top-1 -right-1 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-wide flex items-center justify-center gap-2">
                  <UploadCloud className="w-5 h-5 text-purple-400 animate-pulse" />
                  Uploading Project
                </h3>
                <p className="text-xs text-purple-300/90 font-mono font-medium px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  {uploadProgressText || 'Uploading and processing files...'}
                </p>
              </div>

              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/10 mt-2">
                <motion.div
                  className="bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-400 h-full rounded-full"
                  animate={{ width: `${Math.max(4, Math.min(100, uploadProgressPercent))}%` }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-white/30 font-mono -mt-1">{Math.round(uploadProgressPercent)}%</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
