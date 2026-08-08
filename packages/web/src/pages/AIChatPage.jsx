import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Folder, Puzzle, Github, Crown, Settings,
  ChevronDown, Plus, Sparkles, ArrowUp, Square,
  UploadCloud, Download, GitBranch, Share, Loader2, Slash, Zap,
  AlertCircle, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useChatSocket } from '../hooks/useChatSocket';
import { getAuthHeaders } from '../lib/api';
import { setMode, addMessage, clearChat, setGodMode } from '../store/chatSlice';
import { handleSlashCommand, isSlashCommand } from '../lib/slashCommands';

import { FileTree } from '../components/ide/FileTree';
import { EditorPane } from '../components/ide/EditorPane';
import { TerminalPane } from '../components/ide/TerminalPane';
import { WorkspaceModals } from '../components/ide/WorkspaceModals';
import { StepCard } from '../components/ide/StepCards';
import { TodoCard } from '../components/ide/TodoCard';
import { PermissionModal } from '../components/ide/PermissionModal';
import { ModelSelector } from '../components/ide/ModelSelector';
import { SparkleButton } from '../components/ide/SparkleButton';
import { DesignTab } from '../components/ide/DesignTab';
import { WaveProgress } from '../components/ide/WaveProgress';

export function AIChatPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // IDE State — declare BEFORE useChatSocket so there's no TDZ
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeTab, setActiveTab] = useState('Chat');

  const { messages, keysError, isStreaming, mode, plan, permissionRequest, models, selectedModel, godMode, waves, subagents, buildSummary, serverToasts } = useSelector(state => state.chat);
  const { send, interrupt, answerPermission, undo, reloadModels } = useChatSocket(activeWorkspaceId);
  const [openFiles, setOpenFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);
	const [prompt, setPrompt] = useState('');

	// Auth guard — redirect to /login if no token
	const getTokens = () => {
		try {
			// Check URL params first (for dev/testing token injection)
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

	const [isModalsOpen, setIsModalsOpen] = useState(false);
	const [githubAccount, setGithubAccount] = useState(null);
	const [triggerRefresh, setTriggerRefresh] = useState(0);

  // Branch selector state
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
		const [isUploading, setIsUploading] = useState(false);
		const [watchMode, setWatchMode] = useState(false);
		const [debugMode, setDebugMode] = useState(false);

		// Modal for commit message (replaces window.prompt)
		const [showCommitModal, setShowCommitModal] = useState(false);
		const [commitMessage, setCommitMessage] = useState('Initial commit');
		// Modal for new branch name (replaces window.prompt)
		const [showBranchModal, setShowBranchModal] = useState(false);
		const [branchName, setBranchName] = useState('');

	const toggleWatchMode = () => setWatchMode(!watchMode);
	const toggleDebug = () => setDebugMode(!debugMode);

		// Toast notifications (replaces native alert())
		const [localToasts, setLocalToasts] = useState([]);
		const showToast = useCallback((message, type = 'success') => {
			const id = Date.now().toString();
			setLocalToasts((prev) => [...prev, { id, message, type }]);
			setTimeout(() => {
				setLocalToasts((prev) => prev.filter((t) => t.id !== id));
			}, 3500);
		}, []);

	// Auth guard
	useEffect(() => {
		if (!token) {
			window.location.href = '/login';
		}
	}, [token]);

	// Toggle Advanced Mode — stays in Chat tab, just flips the engine mode.
	// Advanced Mode ON = full CLI power (step cards, action bar, all tools).
	// AI Code Agent tab = same power, IDE layout (switched via tab buttons, not this toggle).
	// Per the master spec: "The only difference is the UI layout/skin."
	const toggleAdvancedMode = () => {
		dispatch(setMode(mode !== 'agent' ? 'agent' : 'chat'));
	};

	const handleAttachFiles = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeWorkspaceId) return;

    setIsUploading(true);
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/upload`, {
        method: 'POST',
        headers: { Authorization: getAuthHeaders().Authorization },
        body: formData
      });
      const data = await res.json();
      if (data.ok && data.uploadedFiles) {
        const attachText = data.uploadedFiles.map(f => `[Attached File: ${f}]`).join('\n');
        setPrompt(prev => prev ? `${prev}\n${attachText}\n` : `${attachText}\n`);
        setTriggerRefresh(r => r + 1); // Refresh file tree
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
    fetch('/api/v1/workspaces', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
          if (data.workspaces.length > 0) setActiveWorkspaceId(data.workspaces[0]._id);
        }
      })
      .catch(console.error);

    fetch('/api/v1/github/status', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.connected) setGithubAccount(data);
      })
      .catch(console.error);
  }, []);

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showBranchDropdown && !e.target.closest('.branch-dropdown')) {
        setShowBranchDropdown(false);
      }
    };
    if (showBranchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBranchDropdown]);

  // Fetch branches when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      fetchBranches();
    }
  }, [activeWorkspaceId, fetchBranches]);

  const handleUploadZip = async (file) => {
    const formData = new FormData();
    formData.append('name', file.name.replace('.zip', ''));
    formData.append('source', 'zip');
    formData.append('zipfile', file);

    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { Authorization: getAuthHeaders().Authorization },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      if (data.workspace) {
        setWorkspaces([...workspaces, data.workspace]);
        setActiveWorkspaceId(data.workspace._id);
        setTriggerRefresh(r => r + 1);
        showToast('Project uploaded successfully');
      } else {
        throw new Error(data.error?.message || 'Upload failed — no workspace returned');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      showToast(err.message || 'Failed to upload project', 'error');
    }
  };

  const handleCloneGit = async (repoUrl) => {
    const name = repoUrl.split('/').pop().replace('.git', '');
    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, source: 'git', repoUrl })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Clone failed (${res.status})`);
      }
      const data = await res.json();
      if (data.workspace) {
        setWorkspaces([...workspaces, data.workspace]);
        setActiveWorkspaceId(data.workspace._id);
        setTriggerRefresh(r => r + 1);
        showToast('Project cloned successfully');
      } else {
        throw new Error(data.error?.message || 'Clone failed — no workspace returned');
      }
    } catch (err) {
      console.error('Clone failed:', err);
      showToast(err.message || 'Failed to clone repository', 'error');
    }
  };

  const handleExport = async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/export`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
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

  // Fetch available git branches for the current workspace
  const fetchBranches = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/branches`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        if (data.current) setActiveBranch(data.current);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  }, [activeWorkspaceId]);

  // Switch (or create) the active git branch
  const switchBranch = useCallback(async (branch, create = false) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ branch, create })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveBranch(data.branch);
        setShowBranchDropdown(false);
        if (!create && !branches.includes(data.branch)) {
          setBranches(prev => [...prev, data.branch]);
        }
      }
    } catch (err) {
      console.error('Failed to switch branch:', err);
    }
  }, [activeWorkspaceId, branches]);

  const handlePush = async () => {
    if (!activeWorkspaceId) return;
    if (!commitMessage.trim()) return;

    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/push`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: commitMessage, branch: activeBranch })
      });
      const data = await res.json();
      if (data.ok) showToast('Pushed successfully!');
      else showToast('Failed to push: ' + (data.error?.message || 'Unknown error'), 'error');
    } catch (e) {
      showToast('Error pushing', 'error');
    } finally {
      setShowCommitModal(false);
    }
  };

  const handleCreateBranch = () => {
    if (!branchName.trim()) return;
    switchBranch(branchName, true);
    setShowBranchModal(false);
  };

  const handleGithubConnect = () => {
    const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    window.location.href = `/api/v1/auth/github?token=${encodeURIComponent(tokens.access || '')}`;
  };

  const handleFileSelect = (path) => {
    if (!openFiles.includes(path)) {
      setOpenFiles([...openFiles, path]);
    }
    setActivePath(path);
  };

  const closeFile = (path) => {
    const newFiles = openFiles.filter(p => p !== path);
    setOpenFiles(newFiles);
    if (activePath === path) {
      setActivePath(newFiles.length > 0 ? newFiles[newFiles.length - 1] : null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    // Handle slash commands client-side before sending to backend
    if (isSlashCommand(prompt)) {
      const handled = handleSlashCommand(prompt, dispatch, { send, undo }, {
        setPrompt,
        toggleWatchMode,
        toggleAdvancedMode,
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
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-[#f4f4f5] font-sans overflow-hidden">
      
      {/* TOPBAR */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleAttachFiles} 
        className="hidden" 
      />
      <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-5 h-5 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                {[...Array(12)].map((_, i) => (
                  <line key={i} x1="50" y1="25" x2="50" y2="10" stroke="url(#logo-grad)" strokeWidth="8" strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} opacity={0.4 + (i/12)*0.6} />
                ))}
              </svg>
            </div>
            <span className="font-semibold text-[15px] hover:text-white/80 transition cursor-pointer tracking-tight">Codient</span>
          </Link>
          
          <select 
            value={activeWorkspaceId || ''} 
            onChange={(e) => setActiveWorkspaceId(e.target.value)}
            className="bg-[#121212] border border-white/5 text-white/70 text-xs rounded-md px-2 py-1 outline-none ml-2"
          >
            <option value="" disabled>Untitled</option>
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-[#121212] p-0.5 rounded-lg border border-white/5 relative">
          <div 
            className="absolute inset-y-0.5 bg-blue-500 rounded-md transition-all duration-300 ease-out shadow"
            style={{
              width: activeTab === 'Design' ? '64px' : activeTab === 'Chat' ? '56px' : '116px',
              left: activeTab === 'Design' ? '2px' : activeTab === 'Chat' ? '66px' : '122px'
            }}
          />
          {['Design', 'Chat', 'AI code Agent'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative z-10 px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white'}`}
              style={{ width: tab === 'Design' ? '64px' : tab === 'Chat' ? '56px' : '116px' }}
            >
              {tab === 'AI code Agent' && <Sparkles className="w-3 h-3"/>}
              {tab}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white/20 overflow-hidden">
            <img src="https://i.pravatar.cc/100?img=33" alt="User" className="w-full h-full object-cover" />
          </div>
          <button onClick={() => showToast('Invite link copied to clipboard')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition">
            Invite
          </button>
        </div>
      </header>

      {/* WORKSPACE WRAPPER */}
      <div className="flex-1 overflow-hidden px-2 pb-2 flex">
        <div className="flex h-full w-full bg-[#0e0e0e] rounded-[16px] border border-white/10 overflow-hidden shadow-2xl relative">
          
          {/* LEFT SIDEBAR */}
          <aside className="w-14 flex-shrink-0 bg-[#151515] border-r border-white/5 flex flex-col justify-between py-4 items-center z-20">
            <div className="flex flex-col gap-4 items-center">
              <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-white">
                <Folder className="w-4 h-4" fill="currentColor" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition">
                <Puzzle className="w-4 h-4" fill="currentColor" />
              </button>
              <button onClick={handleGithubConnect} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition" title={githubAccount ? `Connected as ${githubAccount.username}` : 'Connect GitHub'}>
                {githubAccount ? <img src={githubAccount.avatarUrl} className="w-4 h-4 rounded-full" /> : <Github className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex flex-col gap-4 items-center">
              <button className="w-8 h-8 rounded-full border border-[#eab308]/30 flex items-center justify-center text-[#eab308] hover:bg-[#eab308]/10 transition">
                <Crown className="w-4 h-4" />
              </button>
              <Link to="/settings" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition">
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0e0e0e]">
            
            {/* Background Ambient Glows */}
            <div className="absolute top-1/2 -left-64 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
            <div className="absolute top-1/2 -right-64 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

            {activeTab === 'Design' ? (
              /* DESIGN TAB */
              <DesignTab />
            ) : messages.length === 0 ? (
              /* EMPTY STATE (For Chat) */
              <div className="w-full h-full flex flex-col items-center justify-center px-4 relative z-10">
                <div className="w-24 h-24 mb-10 relative animate-spin-slow">
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    {[...Array(12)].map((_, i) => (
                      <line 
                        key={i} 
                        x1="50" y1="20" x2="50" y2="2" 
                        stroke="url(#spinner-grad)" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        transform={`rotate(${i * 30} 50 50)`}
                        opacity={0.2 + (i / 12) * 0.8}
                      />
                    ))}
                  </svg>
                </div>
                <h1 className="text-[2.5rem] font-bold mb-10 tracking-tight text-white">What do you want to build?</h1>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
                  <button className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition" onClick={() => setPrompt('Create a website')}>Create a website</button>
                  <button className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition" onClick={() => setPrompt('Build a mobile app')}>Build a mobile app</button>
                  <button className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition" onClick={() => setPrompt('Design a dashboard')}>Design a dashboard</button>
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
                {/* Action Bar (Advanced Mode) */}
                {mode === 'agent' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="flex items-center justify-center gap-1 mb-4 px-4 py-2 bg-[#121212] rounded-xl border border-white/5"
                  >
                    <button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition disabled:opacity-50" title="Upload Project">
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5"/>}
                      Upload
                    </button>
                    <button type="button" onClick={handleExport} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Export ZIP">
                      <Download className="w-3.5 h-3.5"/> Export
                    </button>
                    <button type="button" onClick={() => setShowCommitModal(true)} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition" title="Push to Git">
                      <Share className="w-3.5 h-3.5"/> Push
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1"></div>
                    <button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition" title="Branch">
                      <GitBranch className="w-3.5 h-3.5"/> {activeBranch} <ChevronDown className="w-3 h-3"/>
                    </button>
                    <button type="button" onClick={handleGithubConnect} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition" title={githubAccount ? `Connected as ${githubAccount.username}` : 'Connect GitHub'}>
                      {githubAccount ? <img src={githubAccount.avatarUrl} className="w-3.5 h-3.5 rounded-full" /> : <Github className="w-3.5 h-3.5"/>}
                      GitHub
                    </button>
                  </motion.div>
                )}
                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[20px] group">
                  <div className="absolute -inset-[2px] rounded-[22px] overflow-hidden z-0">
                    <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_70%,#10b981,#3b82f6)] opacity-50 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
                  <div className="relative z-10 rounded-[20px] p-3 flex flex-col gap-3">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask a follow-up..." 
                      className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-2 py-2 min-h-[60px] text-[15px]"
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !activeWorkspaceId} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50">
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                        <ModelSelector />
                        <button type="button" onClick={toggleAdvancedMode} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${mode === 'agent' ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                          <Settings className="w-3.5 h-3.5" /> Advanced Mode
                        </button>
                        {mode === 'agent' && (
                          <button type="button" onClick={() => dispatch(setGodMode(!godMode))} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${godMode ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                            <Zap className="w-3.5 h-3.5" /> God
                          </button>
                        )}
                        <SparkleButton setPrompt={setPrompt} advancedMode={mode === 'agent'} watchMode={watchMode} onToggleWatch={toggleWatchMode} />
                        {mode === 'agent' && (
                          <button type="button" onClick={() => setPrompt('/')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title="Command Palette (/)">
                            <Slash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <AnimatePresence mode="wait">
                        {isStreaming ? (
                          <motion.button 
                            key="stop-btn"
                            type="button" 
                            onClick={interrupt} 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.15 }}
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
                            transition={{ duration: 0.15 }}
                            className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50" 
                            disabled={!prompt.trim() || isStreaming}
                          >
                            <ArrowUp className="w-4 h-4 drop-shadow-md" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </form>
              </div>
            ) : activeTab === 'Chat' ? (
              /* FULL SCREEN CHAT VIEW */
              <div className="flex flex-col w-full h-full animate-in fade-in duration-500 relative bg-[#0e0e0e] z-10">
                <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col gap-6 custom-scrollbar">
                  {keysError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="w-full max-w-4xl mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-2 rounded-lg text-center"
                    >
                      {keysError}
                    </motion.div>
                  )}
                  <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
                    <TodoCard plan={plan} />
                    <PermissionModal request={permissionRequest} onAnswer={answerPermission} />
                  </div>
                  {godMode && (
                    <div className="w-full max-w-4xl mx-auto">
                      <WaveProgress
                        waves={waves}
                        subagents={subagents}
                        buildSummary={buildSummary}
                        godMode={godMode}
                      />
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    msg.role === 'user' ? (
                      <div key={msg.id || idx} className="flex justify-end w-full max-w-4xl mx-auto">
                        <div className="bg-[#27272a] text-white/90 px-5 py-3 rounded-2xl text-sm max-w-[80%] border border-white/5 shadow-sm">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      <div key={msg.id || idx} className="w-full max-w-4xl mx-auto flex flex-col gap-3">
                        {msg.text && (
                          <div className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap font-sans">
                            {msg.text}
                            {msg.kind === 'stream' && isStreaming && idx === messages.length - 1 && (
                              <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"></span>
                            )}
                          </div>
                        )}
                        {msg.kind === 'tool' && <StepCard msg={msg} undo={undo} />}
                      </div>
                    )
                  ))}
                </div>
                {/* Action Bar (Advanced Mode) */}
                {mode === 'agent' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="w-full max-w-4xl mx-auto px-6 flex items-center gap-1 mb-2"
                  >
                    <button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition disabled:opacity-50" title="Upload Project">
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5"/>}
                      Upload
                    </button>
                    <button type="button" onClick={handleExport} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Export ZIP">
                      <Download className="w-3.5 h-3.5"/> Export
                    </button>
                    <button type="button" onClick={() => setShowCommitModal(true)} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition" title="Push to Git">
                      <Share className="w-3.5 h-3.5"/> Push
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1"></div>
                    <button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition" title="Branch">
                      <GitBranch className="w-3.5 h-3.5"/> {activeBranch} <ChevronDown className="w-3 h-3"/>
                    </button>
                    <button type="button" onClick={handleGithubConnect} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition" title={githubAccount ? `Connected as ${githubAccount.username}` : 'Connect GitHub'}>
                      {githubAccount ? <img src={githubAccount.avatarUrl} className="w-3.5 h-3.5 rounded-full" /> : <Github className="w-3.5 h-3.5"/>}
                      GitHub
                    </button>
                  </motion.div>
                )}
                {/* Chat Input Bottom */}
                <div className="p-6 md:pb-8 w-full max-w-4xl mx-auto flex flex-col items-center">
                  <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[20px] group">
                    <div className="absolute -inset-[2px] rounded-[22px] overflow-hidden z-0">
                      <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_70%,#10b981,#3b82f6)] opacity-50 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
                    <div className="relative z-10 rounded-[20px] p-3 flex flex-col gap-3">
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask a follow-up..." 
                        className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-2 py-2 min-h-[60px] text-[15px]"
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !activeWorkspaceId} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </button>
                          <button type="button" onClick={toggleAdvancedMode} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${mode === 'agent' ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                            <Settings className="w-3.5 h-3.5" /> Advanced Mode
                          </button>
                          <SparkleButton setPrompt={setPrompt} advancedMode={mode === 'agent'} watchMode={watchMode} onToggleWatch={toggleWatchMode} />
                          {mode === 'agent' && (
                            <button type="button" onClick={() => setPrompt('/')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title="Command Palette (/)">
                              <Slash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <AnimatePresence mode="wait">
                          {isStreaming ? (
                            <motion.button 
                              key="stop-btn"
                              type="button" 
                              onClick={interrupt} 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              transition={{ duration: 0.15 }}
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
                              transition={{ duration: 0.15 }}
                              className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50" 
                              disabled={!prompt.trim() || isStreaming}
                            >
                              <ArrowUp className="w-4 h-4 drop-shadow-md" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              /* IDE VIEW */
              <div className="flex w-full h-full animate-in fade-in duration-500 z-10 relative">
                
                {/* Actions overlay for Workspace */}
                <div className="absolute top-2 left-2 z-30 flex items-center gap-2 bg-[#121212]/80 backdrop-blur-md p-1.5 rounded-lg border border-white/5">
                   <button onClick={() => setIsModalsOpen(true)} className="flex items-center gap-1 text-xs text-white/70 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition">
                     <UploadCloud className="w-3.5 h-3.5"/> Upload
                   </button>
                   <button onClick={handleExport} className="flex items-center gap-1 text-xs text-white/70 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition">
                     <Download className="w-3.5 h-3.5"/> Export
                   </button>
                   <div className="w-px h-4 bg-white/10 mx-1"></div>
                   <button onClick={() => setShowCommitModal(true)} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition">
                     <Share className="w-3.5 h-3.5"/> Push ↑
                   </button>
                   <button onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition">
                     <GitBranch className="w-3.5 h-3.5"/> {activeBranch} <ChevronDown className="w-3 h-3"/>
                   </button>
                   <button onClick={handleGithubConnect} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition" title={githubAccount ? `Connected as ${githubAccount.username}` : 'Connect GitHub'}>
                     {githubAccount ? <img src={githubAccount.avatarUrl} className="w-3.5 h-3.5 rounded-full" /> : <Github className="w-3.5 h-3.5"/>}
                   </button>
                </div>

                {/* Explorer Pane */}
                <div className="w-64 border-r border-white/5 bg-[#0e0e0e]/50 flex flex-col mt-12">
                  <div className="p-3 flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-semibold tracking-wider uppercase text-white/50">Explorer</span>
                  </div>
                  <FileTree 
                    workspaceId={activeWorkspaceId} 
                    onFileSelect={handleFileSelect} 
                    activePath={activePath} 
                    triggerRefresh={triggerRefresh}
                  />
                </div>

                {/* Editor & Terminal Center Pane */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e] pt-12">
                  <EditorPane 
                    workspaceId={activeWorkspaceId}
                    openFiles={openFiles}
                    activePath={activePath}
                    setActivePath={setActivePath}
                    closeFile={closeFile}
                  />
                  <TerminalPane messages={messages} />
                </div>

                {/* AI Chat Right Pane */}
                <div className="w-[400px] border-l border-white/5 bg-[#0e0e0e] flex flex-col relative z-20">
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <span className="text-sm font-semibold">AI Assistance</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
                    <TodoCard plan={plan} />
                    {godMode && (
                      <div className="mb-2">
                        <WaveProgress
                          waves={waves}
                          subagents={subagents}
                          buildSummary={buildSummary}
                          godMode={godMode}
                        />
                      </div>
                    )}
                    <PermissionModal request={permissionRequest} onAnswer={answerPermission} />
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`w-full flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start gap-3'}`}>
                        {msg.role === 'user' ? (
                          <div className="bg-[#27272a] text-white/90 px-4 py-2.5 rounded-xl text-[13px] max-w-[90%] border border-white/5 shadow-sm">
                            {msg.text}
                          </div>
                        ) : (
                          <>
                            {msg.text && (
                              <div className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                                {msg.kind === 'stream' && isStreaming && idx === messages.length - 1 && (
                                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle"></span>
                                )}
                              </div>
                            )}
                            {msg.kind === 'tool' && <StepCard msg={msg} undo={undo} />}
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Inline Chat Input */}
                  <div className="p-4 border-t border-white/5 bg-[#0c0c0c]">
                    <form onSubmit={handleSubmit} className="w-full relative rounded-[20px] group">
                      <div className="absolute -inset-[1.5px] rounded-[21px] overflow-hidden z-0">
                        <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_70%,#10b981,#3b82f6)] opacity-50 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                      </div>
                      <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
                      <div className="relative z-10 rounded-[20px] p-2 flex flex-col gap-2">
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ask AI code agent..." 
                          className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-2 py-1 min-h-[40px] text-sm"
                          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !activeWorkspaceId} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50">
                              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                            <ModelSelector compact />
                          </div>
                          <AnimatePresence mode="wait">
                            {isStreaming ? (
                              <motion.button 
                                key="stop-btn"
                                type="button" 
                                onClick={interrupt} 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center transition-all border border-red-500/50"
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
                                transition={{ duration: 0.15 }}
                                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition disabled:opacity-50" 
                                disabled={!prompt.trim() || isStreaming}
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
      
      <WorkspaceModals 
        isOpen={isModalsOpen} 
        onClose={() => setIsModalsOpen(false)} 
        onUploadZip={handleUploadZip} 
        onCloneGit={handleCloneGit} 
      />

      {/* Branch selector dropdown */}
      <AnimatePresence>
        {showBranchDropdown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="branch-dropdown fixed top-16 right-6 z-[200] w-56 bg-[#151515] border border-white/10 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-white/5 text-xs font-semibold text-white/50 uppercase tracking-wider">
              Switch Branch
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {branches.map((branch) => (
                <button
                  key={branch}
                  onClick={() => switchBranch(branch)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
                    branch === activeBranch
                      ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" /> {branch}
                </button>
              ))}
              {branches.length === 0 && !activeWorkspaceId && (
                <div className="px-3 py-2 text-xs text-white/40">No branches found</div>
              )}
            </div>
            <div className="p-2 border-t border-white/5">
              <button
                onClick={() => { setBranchName(''); setShowBranchModal(true); }}
                className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Create new branch
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notifications (top-right, auto-dismissing) */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {(localToasts ?? []).map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
          {(serverToasts ?? []).map((toast) => {
            const isError = toast.kind === 'error' || toast.kind === 'failed';
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ duration: 0.2 }}
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
                <span>{toast.text || toast.message}</span>
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
              transition={{ duration: 0.15 }}
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
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCommitModal(false)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePush}
                  className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition"
                >
                  Commit & Push
                </button>
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
              transition={{ duration: 0.15 }}
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
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
