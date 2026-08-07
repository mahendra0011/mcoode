import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Folder, Puzzle, Github, Crown, Settings, 
  ChevronDown, Plus, Sparkles, ArrowUp, Square,
  UploadCloud, Download, GitBranch, Share, Loader2
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useChatSocket } from '../hooks/useChatSocket';
import { setMode } from '../store/chatSlice';

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

export function AIChatPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // IDE State — declare BEFORE useChatSocket so there's no TDZ
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeTab, setActiveTab] = useState('Chat');

  const { messages, keysError, isStreaming, mode, plan, permissionRequest, models, selectedModel } = useSelector(state => state.chat);
  const { send, interrupt, answerPermission, undo, reloadModels } = useChatSocket(activeWorkspaceId);
  const [openFiles, setOpenFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [prompt, setPrompt] = useState('');
  
  const [isModalsOpen, setIsModalsOpen] = useState(false);
  const [githubAccount, setGithubAccount] = useState(null);
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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
        body: formData
      });
      const data = await res.json();
      if (data.ok && data.uploadedFiles) {
        const attachText = data.uploadedFiles.map(f => `[Attached File: ${f}]`).join('\n');
        setPrompt(prev => prev ? `${prev}\n${attachText}\n` : `${attachText}\n`);
        setTriggerRefresh(r => r + 1); // Refresh file tree
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetch('/api/v1/workspaces')
      .then(res => res.json())
      .then(data => {
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
          if (data.workspaces.length > 0) setActiveWorkspaceId(data.workspaces[0]._id);
        }
      })
      .catch(console.error);

    fetch('/api/v1/github/status')
      .then(res => res.json())
      .then(data => {
        if (data.connected) setGithubAccount(data);
      })
      .catch(console.error);
  }, []);

  const handleUploadZip = async (file) => {
    const formData = new FormData();
    formData.append('name', file.name.replace('.zip', ''));
    formData.append('source', 'zip');
    formData.append('zipfile', file);

    const res = await fetch('/api/v1/workspaces', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.workspace) {
      setWorkspaces([...workspaces, data.workspace]);
      setActiveWorkspaceId(data.workspace._id);
      setTriggerRefresh(r => r + 1);
    }
  };

  const handleCloneGit = async (repoUrl) => {
    const name = repoUrl.split('/').pop().replace('.git', '');
    const res = await fetch('/api/v1/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, source: 'git', repoUrl })
    });
    const data = await res.json();
    if (data.workspace) {
      setWorkspaces([...workspaces, data.workspace]);
      setActiveWorkspaceId(data.workspace._id);
      setTriggerRefresh(r => r + 1);
    }
  };

  const handleExport = () => {
    if (!activeWorkspaceId) return;
    window.location.href = `/api/v1/workspaces/${activeWorkspaceId}/export`;
  };

  const handlePush = async () => {
    if (!activeWorkspaceId) return;
    const msg = window.prompt("Enter commit message:");
    if (!msg) return;

    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, branch: 'main' })
      });
      const data = await res.json();
      if (data.ok) alert('Pushed successfully!');
      else alert('Failed to push: ' + (data.error?.message || 'Unknown error'));
    } catch (e) {
      alert('Error pushing');
    }
  };

  const handleGithubConnect = () => {
    // Generate a temporary auth token for state (simulate it for now since we're client side without the real session JWT, usually the backend handles this if we redirect directly)
    // Here we just redirect to the auth endpoint.
    window.location.href = `/api/v1/auth/github`;
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
    if (prompt.trim() && !isStreaming) {
      // In IDE mode, agent needs to know the active workspace
      send(prompt);
      setPrompt('');
      if (activeTab === 'Chat' && mode === 'agent') {
         // Auto-switch to AI code Agent if they use agent mode (optional UX choice, sticking to user choice for now)
      }
    }
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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition">
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
            ) : messages.length === 0 && activeTab !== 'AI code Agent' ? (
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
                {keysError && (
                  <div className="w-full max-w-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-2 rounded-lg mb-4 text-center">
                    {keysError}
                  </div>
                )}
                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[20px] group">
                  <div className="absolute -top-[4px] -left-[2px] -right-[2px] -bottom-[1px] bg-gradient-to-r from-blue-600 via-teal-400 to-emerald-600 rounded-[22px] opacity-100 blur-[2px]"></div>
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
                        <button type="button" onClick={() => dispatch(setMode(mode === 'agent' ? 'chat' : 'agent'))} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${mode === 'agent' ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                          <Settings className="w-3.5 h-3.5" /> Advanced Mode
                        </button>
                        <SparkleButton setPrompt={setPrompt} />
                      </div>
                      {isStreaming ? (
                        <button type="button" onClick={interrupt} className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-all border border-red-500/50">
                          <Square className="w-3 h-3 text-red-400 fill-current" />
                        </button>
                      ) : (
                        <button type="submit" className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50" disabled={!prompt.trim()}>
                          <ArrowUp className="w-4 h-4 drop-shadow-md" />
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            ) : activeTab === 'Chat' ? (
              /* FULL SCREEN CHAT VIEW */
              <div className="flex flex-col w-full h-full animate-in fade-in duration-500 relative bg-[#0e0e0e] z-10">
                <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col gap-6 custom-scrollbar">
                  <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
                    <TodoCard plan={plan} />
                    <PermissionModal request={permissionRequest} onAnswer={answerPermission} />
                  </div>
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
                          <>
                            <div className="text-xs text-white/40 font-medium flex items-center gap-2">
                              MCode AI
                              {msg.kind === 'stream' && isStreaming && idx === messages.length - 1 && (
                                <div className="animate-spin-slow w-3 h-3 text-white/50">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
                                </div>
                              )}
                            </div>
                            <div className="h-px w-full bg-white/5"></div>
                            <div className="text-sm text-white/90 leading-relaxed mt-1 whitespace-pre-wrap">
                              {msg.text}
                            </div>
                          </>
                        )}
                        {msg.kind === 'tool' && <StepCard msg={msg} undo={undo} />}
                      </div>
                    )
                  ))}
                </div>
                {/* Chat Input Bottom */}
                <div className="p-6 md:pb-8 w-full max-w-4xl mx-auto flex flex-col items-center">
                  <form onSubmit={handleSubmit} className="w-full max-w-xl relative rounded-[20px] group">
                    <div className="absolute -top-[4px] -left-[2px] -right-[2px] -bottom-[1px] bg-gradient-to-r from-blue-600 via-teal-400 to-emerald-600 rounded-[22px] opacity-100 blur-[2px]"></div>
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
                           <button type="button" onClick={() => dispatch(setMode(mode === 'agent' ? 'chat' : 'agent'))} className={`px-3 h-8 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-medium border backdrop-blur-md ${mode === 'agent' ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}>
                            <Settings className="w-3.5 h-3.5" /> Advanced Mode
                          </button>
                          <SparkleButton setPrompt={setPrompt} />
                        </div>
                        {isStreaming ? (
                          <button type="button" onClick={interrupt} className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-all border border-red-500/50">
                            <Square className="w-3 h-3 text-red-400 fill-current" />
                          </button>
                        ) : (
                          <button type="submit" className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50" disabled={!prompt.trim()}>
                            <ArrowUp className="w-4 h-4 drop-shadow-md" />
                          </button>
                        )}
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
                   <button onClick={handlePush} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition">
                     <Share className="w-3.5 h-3.5"/> Push ↑
                   </button>
                   <button className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition">
                     <GitBranch className="w-3.5 h-3.5"/> main <ChevronDown className="w-3 h-3"/>
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
                    <PermissionModal request={permissionRequest} onAnswer={answerPermission} />
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`w-full flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start gap-3'}`}>
                        {msg.role === 'user' ? (
                          <div className="bg-[#27272a] text-white/90 px-4 py-2.5 rounded-2xl text-sm max-w-[90%] border border-white/5 shadow-sm">
                            {msg.text}
                          </div>
                        ) : (
                          <>
                            {msg.text && (
                              <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                                {msg.text}
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
                      <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-400 via-blue-500/50 to-transparent rounded-[21px] opacity-100"></div>
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
                            <button type="button" onClick={() => dispatch(setMode(mode === 'agent' ? 'chat' : 'agent'))} className={`px-2 h-7 rounded-lg flex items-center gap-1.5 transition text-[10px] font-medium border ml-1 ${mode === 'agent' ? 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30' : 'bg-white/5 text-white/50 border-white/5'}`}>
                              <Settings className="w-3 h-3" /> Agent
                            </button>
                          </div>
                          {isStreaming ? (
                            <button type="button" onClick={interrupt} className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center transition-all border border-red-500/50">
                              <Square className="w-3 h-3 text-red-400 fill-current" />
                            </button>
                          ) : (
                            <button type="submit" className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition disabled:opacity-50" disabled={!prompt.trim()}>
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}} />
    </div>
  );
}
