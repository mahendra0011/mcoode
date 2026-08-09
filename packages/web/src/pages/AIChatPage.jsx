import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Folder, Puzzle, Github, Crown, Settings,
  ChevronDown, Plus, Sparkles, ArrowUp, Square,
  UploadCloud, Download, GitBranch, Share, Loader2, Slash, Zap,
  AlertCircle, CheckCircle2, X, MessageSquare, FileText, Terminal, GitFork, Wrench, MoreVertical, ChevronRight, Sun, Book, HelpCircle, Search, History, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useChatSocket } from '../hooks/useChatSocket';
import { getAuthHeaders, fetchWithAuth } from '../lib/api';
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

  const { messages, keysError, isStreaming, mode, plan, permissionRequest, models, selectedModel, godMode, waves, subagents, buildSummary, toasts: serverToasts } = useSelector(state => state.chat);
  const { send, interrupt, answerPermission, undo, reloadModels } = useChatSocket(activeWorkspaceId);
  const [openFiles, setOpenFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);
	const [prompt, setPrompt] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    fetchWithAuth('/api/v1/sessions')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.items) {
          setChats(data.items.map(s => ({
            id: s._id,
            title: s.projectName || s.workspace || 'Untitled Chat',
            isActive: activeWorkspaceId === s._id,
            createdAt: s.createdAt,
            summary: s.plan?.summary || 'No recent activity...'
          })));
        }
      })
      .catch(err => console.error('Error fetching chats:', err));
  }, [activeWorkspaceId, isHistoryOpen]);

  const deleteChat = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetchWithAuth(`/api/v1/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
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
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let targetWorkspaceId = activeWorkspaceId;

    if (!targetWorkspaceId) {
      try {
        const createForm = new FormData();
        createForm.append('name', 'Untitled Project');
        createForm.append('source', 'blank');
        
        const wsRes = await fetch('/api/v1/workspaces', {
          method: 'POST',
          headers: { Authorization: getAuthHeaders().Authorization },
          body: createForm
        });
        
        const wsData = await wsRes.json();
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
      const res = await fetch(`/api/v1/workspaces/${targetWorkspaceId}/upload`, {
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
    if (!activeWorkspaceId) return showToast('No active workspace', 'error');
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

  const handlePush = async () => {
    if (!activeWorkspaceId) return showToast('No active workspace', 'error');
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
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0a0a] relative min-h-[53px]">
        {/* Left Spacer */}
        <div className="w-32"></div>
        
        {/* Segmented Control */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-[#121212] p-0.5 rounded-lg border border-white/5">
          <div 
            className="absolute inset-y-0.5 bg-blue-500 rounded-md transition-all duration-300 ease-out shadow"
            style={{
              width: activeTab === 'Design' ? '64px' : activeTab === 'Chat' ? '56px' : '116px',
              left: activeTab === 'Design' ? '2px' : activeTab === 'Chat' ? '66px' : '122px'
            }}
          />
          {['Design', 'Chat', 'AI code Agent'].map((tab) => (
            <motion.button 
              key={tab}
              whileHover={{ scale: activeTab === tab ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab)}
              className={`relative z-10 px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white'}`}
              style={{ width: tab === 'Design' ? '64px' : tab === 'Chat' ? '56px' : '116px' }}
            >
              {tab === 'AI code Agent' && <Sparkles className="w-3 h-3"/>}
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#121212] px-1 py-1 rounded-lg border border-white/5 mr-2">
            <motion.button type="button" onClick={handleExport} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Export ZIP" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Download className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Export</span>
            </motion.button>
            <motion.button type="button" onClick={() => setShowCommitModal(true)} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition" title="Push to Git" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Share className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Push</span>
            </motion.button>
          </div>
          <motion.button type="button" onClick={handleGithubConnect} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition" title={githubAccount ? `Connected as ${githubAccount.username}` : 'Connect GitHub'} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            {githubAccount ? <img src={githubAccount.avatarUrl} className="w-3.5 h-3.5 rounded-full" /> : <Github className="w-3.5 h-3.5"/>}
            GitHub
          </motion.button>
        </div>
      </header>

      {/* WORKSPACE WRAPPER */}
      <div className="flex-1 overflow-hidden px-2 pb-2 flex">
        <div className="flex h-full w-full bg-[#0e0e0e] rounded-[16px] border border-white/10 overflow-hidden shadow-2xl relative">
          
          {/* LEFT SIDEBAR */}
          <aside className="w-64 flex-shrink-0 bg-[#121212] border-r border-white/5 flex flex-col z-20">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  M
                </div>
                <span className="text-white font-bold tracking-wider text-sm">M CODE</span>
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
                <div className="flex items-center justify-between px-4 mb-3">
                  <h3 className="text-white/30 text-[10px] font-bold tracking-[0.15em] uppercase">Recent Chats</h3>
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
                          {chat.title.split('\n').map((line, i) => (
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

            {/* Footer */}
            <div className="h-14 flex items-center justify-between px-6 border-t border-white/5 bg-[#121212] flex-shrink-0">
              <button onClick={() => setIsHistoryOpen(true)} className="text-white/30 hover:text-white transition-colors">
                <History className="w-5 h-5" />
              </button>
              <Link to="/settings" className="text-white/30 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              <button className="text-white/30 hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
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
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition" onClick={() => setPrompt('Create a website')}>Create a website</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition" onClick={() => setPrompt('Build a mobile app')}>Build a mobile app</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-sm font-medium text-white transition" onClick={() => setPrompt('Design a dashboard')}>Design a dashboard</motion.button>
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
                    <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,#3b82f6_30%,transparent_50%,transparent_50%,#10b981_80%,transparent_100%)]"></div>
                  </div>
                  
                  {/* Premium Animated Glowing Border (Sharp Border) */}
                  <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 opacity-80 group-focus-within:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,#3b82f6_30%,transparent_50%,transparent_50%,#10b981_80%,transparent_100%)]"></div>
                  </div>
                  
                  {/* Main background */}
                  <div className="absolute inset-[0px] bg-[#121212] rounded-[24px] z-0"></div>
                  
                  <div className="relative z-10 p-4 flex flex-col gap-2">
                    
                    {/* Top Action Bar (Inside Input) */}
                    <div className="flex items-center gap-4 px-1 pb-1">
                      <motion.button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white transition disabled:opacity-50" title={activeWorkspaceId ? "Project Options" : "Upload Folder"}>
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Folder className="w-4 h-4"/>}
                        {activeWorkspaceId ? (workspaces.find(w => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload Folder'} 
                        <ChevronDown className="w-3 h-3 opacity-50"/>
                      </motion.button>
                      <motion.button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white transition" title="Branch">
                        <GitBranch className="w-4 h-4"/> {activeBranch} <ChevronDown className="w-3 h-3 opacity-50"/>
                      </motion.button>
                    </div>

                    {/* Textarea Container */}
                    <div className="bg-[#161616] rounded-[16px] p-3 flex flex-col border border-white/5 shadow-inner">
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask a follow-up..." 
                        className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-1 py-1 min-h-[60px] text-[15px]"
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        {/* Left Group: Plus and Advanced Mode */}
                        <div className="flex items-center gap-2">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={toggleAdvancedMode} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${mode === 'agent' ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                            <Settings className="w-3.5 h-3.5" /> Advanced Mode
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
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => dispatch(setGodMode(!godMode))} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${godMode ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                              <Zap className="w-3.5 h-3.5" /> God
                            </motion.button>
                          )}
                        </div>

                        {/* Right Group: Model Selector and Send/Stop */}
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
                                transition={{ duration: 0.15 }}
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
                      <motion.div
                        key={msg.id || idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="flex justify-end w-full max-w-4xl mx-auto"
                      >
                        <div className="bg-[#27272a] text-white/90 px-5 py-3 rounded-2xl text-sm max-w-[80%] border border-white/5 shadow-sm">
                          {msg.text}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={msg.id || idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: idx * 0.02 }}
                        className="w-full max-w-4xl mx-auto flex flex-col gap-3"
                      >
                        {msg.text && (
                          <div className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap font-sans">
                            {msg.text}
                            {msg.kind === 'stream' && isStreaming && idx === messages.length - 1 && (
                              <motion.span
                                className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            )}
                          </div>
                        )}
                        {msg.kind === 'tool' && <StepCard msg={msg} undo={undo} />}
                      </motion.div>
                    )
                  ))}
                </div>
                {/* Action Bar (Advanced Mode) */}

                {/* Chat Input Bottom */}
                <div className="p-6 md:pb-8 w-full max-w-4xl mx-auto flex flex-col items-center">
                  <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[24px] group mt-2">
                    {/* Premium Animated Glowing Border (Outer Glow) */}
                    <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 blur-[10px] opacity-50 group-focus-within:opacity-80 transition-opacity duration-500">
                      <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,#3b82f6_30%,transparent_50%,transparent_50%,#10b981_80%,transparent_100%)]"></div>
                    </div>
                    
                    {/* Premium Animated Glowing Border (Sharp Border) */}
                    <div className="absolute -inset-[2px] rounded-[26px] overflow-hidden z-0 opacity-80 group-focus-within:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,#3b82f6_30%,transparent_50%,transparent_50%,#10b981_80%,transparent_100%)]"></div>
                    </div>
                    
                    {/* Main background */}
                    <div className="absolute inset-[0px] bg-[#121212] rounded-[24px] z-0"></div>
                    
                    <div className="relative z-10 p-4 flex flex-col gap-2">
                      
                      {/* Top Action Bar (Inside Input) */}
                      {mode === 'agent' && (
                        <div className="flex items-center gap-4 px-1 pb-1">
                          <motion.button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white transition disabled:opacity-50" title={activeWorkspaceId ? "Project Options" : "Upload Folder"}>
                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Folder className="w-4 h-4"/>}
                            {activeWorkspaceId ? (workspaces.find(w => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload Folder'}
                            <ChevronDown className="w-3 h-3 opacity-50"/>
                          </motion.button>
                          <motion.button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white transition" title="Branch">
                            <GitBranch className="w-4 h-4"/> {activeBranch} <ChevronDown className="w-3 h-3 opacity-50"/>
                          </motion.button>
                        </div>
                      )}

                      {/* Textarea Container */}
                      <div className="bg-[#161616] rounded-[16px] p-3 flex flex-col border border-white/5 shadow-inner">
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ask a follow-up..." 
                          className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-1 py-1 min-h-[60px] text-[15px]"
                          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                        />
                        <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={toggleAdvancedMode} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${mode === 'agent' ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                            <Settings className="w-3.5 h-3.5" /> Advanced Mode
                          </motion.button>
                          <SparkleButton setPrompt={setPrompt} advancedMode={mode === 'agent'} watchMode={watchMode} onToggleWatch={toggleWatchMode} />
                          {mode === 'agent' && (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setPrompt('/')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title="Command Palette (/)">
                              <Slash className="w-4 h-4" />
                            </motion.button>
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
                  </div>
                </form>
                </div>
              </div>
            ) : (
              /* IDE VIEW */
              <div className="flex w-full h-full animate-in fade-in duration-500 z-10 relative">
                
                {/* Actions overlay for Workspace */}
                <div className="absolute top-2 left-2 z-30 flex items-center gap-2 bg-[#121212]/80 backdrop-blur-md p-1.5 rounded-lg border border-white/5">
                   <motion.button onClick={() => setIsModalsOpen(true)} className="flex items-center gap-1 text-xs text-white/70 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                     <UploadCloud className="w-3.5 h-3.5"/> Upload
                   </motion.button>
                   <div className="w-px h-4 bg-white/10 mx-1"></div>
                   <motion.button onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                     <GitBranch className="w-3.5 h-3.5"/> {activeBranch} <ChevronDown className="w-3 h-3"/>
                   </motion.button>
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
                          <div className="flex items-center gap-2">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50">
                              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            </motion.button>
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
                                  transition={{ duration: 0.15 }}
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

    </div>
  );
}
