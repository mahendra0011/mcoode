import React, { useState } from 'react';
import { 
  Folder, Puzzle, Github, Crown, Settings, 
  ChevronDown, Plus, Sparkles, Wand2, ArrowUp,
  Search, MessageSquare, ChevronRight, FileCode, FileJson, FileType2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AIChatPage() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      setIsBuilding(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-[#f4f4f5] font-sans overflow-hidden">
      
      {/* TOPBAR */}
      <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-4 z-20">
        {/* Logo & Dropdown */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-5 h-5 relative">
              {/* Codient Logo SVG */}
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
          <button className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white bg-[#121212] px-2.5 py-1 rounded-md border border-white/5 transition ml-2">
            Untitled <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-[#121212] p-0.5 rounded-lg border border-white/5">
          <button className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white rounded-md transition">Preview</button>
          <button className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white rounded-md transition">Design</button>
          <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md shadow font-medium">Code</button>
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

      {/* WORKSPACE WRAPPER (This matches the rounded container inside the dark screen) */}
      <div className="flex-1 overflow-hidden px-2 pb-2 flex">
        <div className="flex h-full w-full bg-[#0e0e0e] rounded-[16px] border border-white/10 overflow-hidden shadow-2xl relative">
          
          {/* LEFT SIDEBAR (Inside the rounded container) */}
          <aside className="w-14 flex-shrink-0 bg-[#151515] border-r border-white/5 flex flex-col justify-between py-4 items-center z-20">
            <div className="flex flex-col gap-4 items-center">
              <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-white">
                <Folder className="w-4 h-4" fill="currentColor" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition">
                <Puzzle className="w-4 h-4" fill="currentColor" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition">
                <Github className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 items-center">
              <button className="w-8 h-8 rounded-full border border-[#eab308]/30 flex items-center justify-center text-[#eab308] hover:bg-[#eab308]/10 transition">
                <Crown className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0e0e0e]">
            
            {/* Background Ambient Glows */}
            <div className="absolute top-1/2 -left-64 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute top-1/2 -right-64 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

            {!isBuilding ? (
              /* EMPTY STATE */
              <div className="w-full h-full flex flex-col items-center justify-center px-4 relative z-10">
                
                {/* Custom SVG Loader */}
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

                {/* Glowing Chat Input Wrapper */}
                <form onSubmit={handleSubmit} className="w-full max-w-2xl relative rounded-[20px] group">
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-400 via-blue-500/50 to-transparent rounded-[21px] opacity-100"></div>
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
                        <button type="button" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button type="button" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition">
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button type="button" className="px-3 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2 text-white/70 transition text-xs font-medium border border-white/5">
                          <Wand2 className="w-3.5 h-3.5" /> Builder
                        </button>
                      </div>
                      <button type="submit" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition disabled:opacity-50" disabled={!prompt.trim()}>
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </form>

              </div>
            ) : (
              /* ACTIVE SPLIT VIEW */
              <div className="flex w-full h-full animate-in fade-in duration-500">
                
                {/* Explorer Pane */}
                <div className="w-64 border-r border-white/5 bg-[#0e0e0e]/50 flex flex-col">
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <span className="text-sm font-semibold tracking-wide text-white">Explorer</span>
                    <Search className="w-4 h-4 text-white/50" />
                  </div>
                  <div className="p-2 overflow-y-auto custom-scrollbar text-sm text-white/70">
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><ChevronRight className="w-4 h-4" /> <Folder className="w-4 h-4 text-white/40" fill="currentColor"/> node_modules</div>
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><ChevronRight className="w-4 h-4" /> <Folder className="w-4 h-4 text-white/40" fill="currentColor"/> public</div>
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><ChevronDown className="w-4 h-4" /> <Folder className="w-4 h-4 text-blue-400" fill="currentColor"/> src</div>
                    
                    <div className="ml-5 border-l border-white/5 pl-2">
                      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><ChevronRight className="w-4 h-4" /> <Folder className="w-4 h-4 text-white/40" fill="currentColor"/> assets</div>
                      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><ChevronRight className="w-4 h-4" /> <Folder className="w-4 h-4 text-white/40" fill="currentColor"/> styles</div>
                      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><ChevronDown className="w-4 h-4" /> <Folder className="w-4 h-4 text-blue-400" fill="currentColor"/> components</div>
                      
                      <div className="ml-5 border-l border-white/5 pl-2">
                        <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><FileType2 className="w-4 h-4 text-cyan-400" /> header.tsx</div>
                        <div className="flex items-center gap-2 py-1.5 px-2 bg-white/10 rounded cursor-pointer text-white font-medium"><FileType2 className="w-4 h-4 text-cyan-400" /> banner.tsx</div>
                        <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><FileType2 className="w-4 h-4 text-cyan-400" /> codeeditor.tsx</div>
                        <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><FileType2 className="w-4 h-4 text-cyan-400" /> footer.tsx</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer mt-2"><FileCode className="w-4 h-4 text-orange-400" /> index.html</div>
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><FileJson className="w-4 h-4 text-yellow-400" /> package.json</div>
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"><FileCode className="w-4 h-4 text-cyan-300" /> README.md</div>
                  </div>
                </div>

                {/* Code Editor Pane */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e]">
                  {/* Editor Tabs */}
                  <div className="flex items-center border-b border-white/5 bg-[#151515]">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0e0e0e] border-t-2 border-blue-500 text-sm font-medium">
                      <FileType2 className="w-4 h-4 text-cyan-400" /> banner.tsx <span className="text-white/30 ml-2 hover:text-white cursor-pointer">×</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/50 hover:bg-white/5 cursor-pointer">
                      <FileJson className="w-4 h-4 text-yellow-400" /> package.json
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/50 hover:bg-white/5 cursor-pointer">
                      <FileCode className="w-4 h-4 text-orange-400" /> index.html
                    </div>
                  </div>
                  
                  {/* Code Content (Mock) */}
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-relaxed">
                    <div className="text-white/40 select-none flex">
                      <div className="w-8 text-right pr-4 border-r border-white/10 mr-4">
                        {Array.from({length: 25}).map((_, i) => <div key={i}>{i+1}</div>)}
                      </div>
                      <div className="text-white/80">
                        <span className="text-pink-400">import</span> <span className="text-blue-300">React</span> <span className="text-pink-400">from</span> <span className="text-green-300">"react"</span>;<br/>
                        <span className="text-pink-400">import</span> {'{'} <span className="text-blue-300">useState</span>, <span className="text-blue-300">useEffect</span> {'}'} <span className="text-pink-400">from</span> <span className="text-green-300">"react"</span>;<br/>
                        <span className="text-pink-400">import</span> {'{'} <span className="text-blue-300">Button</span> {'}'} <span className="text-pink-400">from</span> <span className="text-green-300">"@/components/ui/button"</span>;<br/>
                        <span className="text-pink-400">import</span> {'{'} <span className="text-blue-300">ChevronLeft</span>, <span className="text-blue-300">ChevronRight</span> {'}'} <span className="text-pink-400">from</span> <span className="text-green-300">"lucide-react"</span>;<br/>
                        <span className="text-pink-400">import</span> <span className="text-blue-300">bannerImg</span> <span className="text-pink-400">from</span> <span className="text-green-300">"../assets/hero-banner.png"</span>;<br/>
                        <br/>
                        <span className="text-pink-400">export function</span> <span className="text-yellow-200">Banner</span>() {'{'}<br/>
                        &nbsp;&nbsp;<span className="text-pink-400">const</span> [currentIndex, setCurrentIndex] = <span className="text-yellow-200">useState</span>(<span className="text-purple-300">0</span>);<br/>
                        <br/>
                        &nbsp;&nbsp;<span className="text-pink-400">return</span> (<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-blue-300">div</span> <span className="text-cyan-200">className</span>=<span className="text-green-300">"relative w-full h-[600px] overflow-hidden rounded-2xl"</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-blue-300">img</span> <br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-cyan-200">src</span>={'{'}<span className="text-blue-300">bannerImg</span>{'}'} <br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-cyan-200">alt</span>=<span className="text-green-300">"Hero Banner"</span> <br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-cyan-200">className</span>=<span className="text-green-300">"w-full h-full object-cover"</span><br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-blue-300">div</span> <span className="text-cyan-200">className</span>=<span className="text-green-300">"absolute inset-0 bg-black/40 flex items-center justify-center"</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-blue-300">h1</span> <span className="text-cyan-200">className</span>=<span className="text-green-300">"text-6xl font-bold text-white text-center max-w-4xl"</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Build your dreams into reality<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-blue-300">h1</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-blue-300">div</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-blue-300">div</span>&gt;<br/>
                        &nbsp;&nbsp;);<br/>
                        {'}'}<br/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Chat Pane */}
                <div className="w-[400px] border-l border-white/5 bg-[#0e0e0e] flex flex-col relative z-20">
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <span className="text-sm font-semibold">AI Assistance</span>
                    <button className="flex items-center gap-1.5 text-xs bg-white/10 px-2 py-1 rounded text-white/70 hover:text-white transition">
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
                    
                    {/* File Attachment Pill */}
                    <div className="bg-[#1e2e22] border border-[#2d4a22] rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <div className="text-[10px] font-bold text-black bg-white px-1 py-0.5 rounded-sm">FIG</div>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-white">Taxfarm.fig</div>
                        <div className="text-xs text-white/50">520.2 MB</div>
                      </div>
                    </div>

                    {/* AI Message */}
                    <div className="text-sm text-white/90 leading-relaxed">
                      I'll create a landing page based on the Figma design. First, let me access the design to analyze its structure and components.
                    </div>

                    {/* Reasoning Block */}
                    <div>
                      <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition mb-3">
                        Reasoning <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-sm text-white/70 leading-relaxed">
                        I'll completely redesign the hero section in a brighter, fresher style. Vibrant green background, bold headline 'TAXFARM', tagline about $FARM tokens buying land and growing food. 3D potted sprout with Bitcoin coin and honeybee. White circular CTA bottom right 'LAUNCH APP'.
                      </div>
                    </div>

                    {/* Code Snippet Action */}
                    <div className="bg-[#111111] rounded-xl border border-white/5 overflow-hidden">
                      <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-mono text-white/50">banner.tsx</span>
                      </div>
                      <div className="p-4 text-xs font-mono leading-relaxed text-white/60">
                        <span className="text-pink-400">import</span> <span className="text-blue-300">React</span> <span className="text-pink-400">from</span> <span className="text-green-300">"react"</span>;<br/>
                        <span className="text-pink-400">import</span> {'{'} <span className="text-blue-300">useState</span>, <span className="text-blue-300">useEffect</span> {'}'} <span className="text-pink-400">from</span> <span className="text-green-300">"react"</span>;<br/>
                      </div>
                      <div className="p-3 border-t border-white/5 flex items-center justify-end gap-2 bg-[#0c0c0c]">
                        <button className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-white/70 hover:bg-white/5 transition">
                          ✕ Cancel
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium hover:bg-green-500/30 transition flex items-center gap-1">
                          ✓ Apply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Chat Input */}
                  <div className="p-4 border-t border-white/5 bg-[#0c0c0c]">
                    <form onSubmit={(e) => { e.preventDefault(); setPrompt(''); }} className="w-full relative rounded-[20px] group">
                      <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-400 via-blue-500/50 to-transparent rounded-[21px] opacity-100"></div>
                      <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
                      <div className="relative z-10 rounded-[20px] p-2 flex flex-col gap-2">
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ask a follow-up..." 
                          className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-2 py-1 min-h-[40px] text-sm"
                          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) setPrompt(''); }}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button type="button" className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 transition">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 transition">
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" className="px-2 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-1.5 text-white/70 transition text-[10px] font-medium border border-white/5 ml-1">
                              <Wand2 className="w-3 h-3" /> Builder
                            </button>
                          </div>
                          <button type="button" onClick={() => setPrompt('')} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
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
