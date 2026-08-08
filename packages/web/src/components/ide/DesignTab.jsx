import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Search, Sparkles, Copy, Download, ExternalLink,
  Monitor, Tablet, Smartphone, Trash2, Edit3, History
} from 'lucide-react';
import { getAuthHeaders } from '../../lib/api';
import {
  setDesignStreaming,
  setCurrentDesign,
  setDesignError,
  setDesigns,
  removeDesign
} from '../../store/chatSlice';

/** Starter templates — each pre-fills the prompt box. */
const STARTER_TEMPLATES = [
  { id: 'landing', name: 'Landing Page', desc: 'Hero, features, CTA, footer', prompt: 'Modern SaaS landing page, dark theme, hero with gradient accent, 3 feature cards, email signup form, footer with links' },
  { id: 'dashboard', name: 'Dashboard', desc: 'Stats cards, charts, activity feed', prompt: 'AI agent dashboard, dark theme, 4 stats cards with icons, recent activity table, sidebar navigation, responsive grid' },
  { id: 'pricing', name: 'Pricing Page', desc: '3-tier pricing cards with features', prompt: 'SaaS pricing page, dark theme, 3 pricing tiers (Basic, Pro, Enterprise), feature comparison table, FAQ section' },
  { id: 'ecommerce', name: 'E-commerce', desc: 'Product grid with cart', prompt: 'Modern e-commerce product page, dark theme, product image gallery, price, description, add to cart, related products grid' },
  { id: 'portfolio', name: 'Portfolio', desc: 'Hero, project showcase, contact', prompt: 'Creative portfolio page, dark theme, animated hero, project showcase grid with hover effects, contact form, social links' },
  { id: 'auth', name: 'Auth Form', desc: 'Sign in / sign up forms', prompt: 'Modern auth page, dark theme, sign-in and sign-up toggle, email/password fields, social login buttons, remember me checkbox' },
  { id: 'blog', name: 'Blog', desc: 'Article list with cards', prompt: 'Blog homepage, dark theme, hero header, featured article card, article list with titles and excerpts, pagination, sidebar' },
  { id: 'blank', name: 'Blank Canvas', desc: 'Start from scratch', prompt: 'A clean, minimal page with a dark gradient background, centered content area, and a single call-to-action button' },
];

/** Device preset widths for the preview iframe wrapper. */
const DEVICE_PRESETS = [
  { id: 'desktop', name: 'Desktop', icon: Monitor, width: 'w-full' },
  { id: 'tablet', name: 'Tablet', icon: Tablet, width: 'max-w-[768px]' },
  { id: 'mobile', name: 'Mobile', icon: Smartphone, width: 'max-w-[375px]' },
];

/**
 * DesignTab — the "Design" tab inside AIChatPage.
 * Three-pane layout: template gallery (left) | live preview (center) | prompt panel (right)
 */
export function DesignTab() {
  const dispatch = useDispatch();
  const { designs, currentDesign, designStatus, designError } = useSelector((state) => state.chat);

  const [prompt, setPrompt] = useState('');
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [device, setDevice] = useState('desktop');
  const [showHistory, setShowHistory] = useState(false);
  const [versionIndex, setVersionIndex] = useState(0);

  // Load saved designs on mount
  useEffect(() => {
    fetch('/api/v1/design', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => dispatch(setDesigns(d.designs || [])))
      .catch(console.error);
  }, [dispatch]);

  // Socket streaming is handled by useChatSocket.js which dispatches Redux
  // actions (setDesignStream, setDesignDone) that update this component's
  // state via useSelector. No direct socket/event listeners needed here.

  const filteredTemplates = STARTER_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTemplateClick = (template) => {
    setActiveTemplate(template);
    setPrompt(template.prompt);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const baseTemplate = activeTemplate ? activeTemplate.id : null;
    const designId = currentDesign?._id || null;

    dispatch(setDesignStreaming());

    try {
      const res = await fetch('/api/v1/design/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt, baseTemplate, designId, device })
      });
      const data = await res.json();
      if (data.design) {
        dispatch(setCurrentDesign(data.design));
      } else {
        dispatch(setDesignError(data.error?.message || 'Generation failed'));
      }
    } catch (err) {
      dispatch(setDesignError(err.message || 'Network error'));
    }
  };

  const handleRefine = async () => {
    if (!prompt.trim() || !currentDesign) return;
    dispatch(setDesignStreaming());


    try {
      const res = await fetch('/api/v1/design/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt, designId: currentDesign._id, device })
      });
      const data = await res.json();
      if (data.design) {
        dispatch(setCurrentDesign(data.design));
      }
    } catch (err) {
      dispatch(setDesignError(err.message || 'Network error'));
    }
  };

  const handleCopyCode = async () => {
    const html = currentDesign?.html || '';
    if (html) await navigator.clipboard.writeText(html);
  };

  const handleDownload = () => {
    const html = currentDesign?.html || '';
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentDesign.prompt?.slice(0, 40).replace(/\s+/g, '-') || 'design';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInAgent = () => {
    if (currentDesign?._id) {
      fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: `from-design-${String(currentDesign._id).slice(-6)}`,
          source: 'design',
          designId: currentDesign._id
        })
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.workspace) {
            window.location.href = `/ai/chat?workspace=${data.workspace._id}`;
          }
        })
        .catch(console.error);
    }
  };

  const handleDeleteDesign = (id) => {
    if (window.confirm('Delete this design and all its versions?')) {
      fetch(`/api/v1/design/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
        .then(() => dispatch(removeDesign(id)))
        .catch(console.error);
    }
  };

  const versions = currentDesign?.versions || [];
  const displayHtml = versionIndex === 0
    ? currentDesign?.html
    : versions[versions.length - 1 - versionIndex]?.html || currentDesign?.html;

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-[#f4f4f5] font-sans overflow-hidden">
      {/* LEFT SIDEBAR — Template gallery + history */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0e0e0e]">
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 text-white/30 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full bg-[#121212] border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-sm text-white/80 placeholder-white/30 outline-none"
            />
          </div>
        </div>

        <div className="flex border-b border-white/5">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              !showHistory ? 'text-white border-b-2 border-blue-500' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              showHistory ? 'text-white border-b-2 border-blue-500' : 'text-white/40 hover:text-white/70'
            }`}
          >
            History ({designs.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!showHistory ? (
            <div className="p-2 space-y-1">
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateClick(t)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition border ${
                    activeTemplate?.id === t.id
                      ? 'bg-white/10 border-blue-500/50 text-white'
                      : 'bg-[#151515]/50 border-white/5 hover:bg-white/5 text-white/70'
                  }`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-white/40 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {designs.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">No saved designs yet</div>
              ) : (
                designs.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => {
                      fetch(`/api/v1/design/${d._id}`, { headers: getAuthHeaders() })
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.design) dispatch(setCurrentDesign({ ...data.design, versions: data.versions || [] }));
                          setVersionIndex(0);
                        })
                        .catch(console.error);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition border border-transparent hover:border-white/5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/80 truncate">
                        {d.prompt?.slice(0, 30)}...
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDesign(d._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 transition p-1 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      v{d.version || 1}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT — Preview canvas */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0e0e0e]">
        {/* Toolbar */}
        <div className="h-[44px] flex-shrink-0 flex items-center justify-between px-4 border-b border-white/5 bg-[#121212]/50">
          <div className="flex items-center gap-2">
            {DEVICE_PRESETS.map((d) => {
              const Icon = d.icon;
              const isActive = device === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-3 h-3" /> {d.name}
                </button>
              );
            })}
          </div>

          {currentDesign && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <Download className="w-3 h-3" /> Download
              </button>
              <button
                onClick={handleOpenInAgent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition border border-emerald-500/20"
              >
                <ExternalLink className="w-3 h-3" /> Open in Agent
              </button>
            </div>
          )}
        </div>

        {/* Live preview canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-[#0a0a0a]">
          {designStatus === 'generating' && !currentDesign?.html ? (
            <div className="text-center text-white/30">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="w-8 h-8 mx-auto mb-2" />
              </motion.div>
              <p className="text-sm mb-1">Generating your design…</p>
              <p className="text-[10px] text-white/30">The AI is crafting your UI</p>
            </div>
          ) : displayHtml ? (
            <div className={`w-full transition-all duration-300 ${DEVICE_PRESETS.find((d) => d.id === device)?.width || 'w-full'}`}>
              <iframe
                srcDoc={displayHtml}
                sandbox="allow-scripts"
                className="w-full h-[calc(100vh-120px)] border border-white/5 rounded-xl bg-white"
                title="Design preview"
              />
            </div>
          ) : (
            <div className="text-center text-white/20">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Enter a prompt or pick a template to generate a design</p>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR — Prompt panel */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-l border-white/5 bg-[#0e0e0e]">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {currentDesign ? 'Refine Design' : 'Generate Design'}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want… e.g. 'SaaS pricing page, dark theme, 3 tiers, gradient accents'"
              className="w-full h-[100px] bg-[#121212] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none resize-none focus:border-blue-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            {!currentDesign ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleGenerate}
                disabled={!prompt.trim() || designStatus === 'generating'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black rounded-xl font-medium text-sm transition disabled:opacity-50"
              >
                {designStatus === 'generating' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {designStatus === 'generating' ? 'Generating…' : 'Generate Design'}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleRefine}
                disabled={!prompt.trim() || designStatus === 'generating'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-sm transition disabled:opacity-50"
              >
                {designStatus === 'generating' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Edit3 className="w-4 h-4" />
                )}
                {designStatus === 'generating' ? 'Refining…' : 'Refine Design'}
              </motion.button>
            )}
          </div>

          {/* Version history */}
          {currentDesign && versions.length > 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="w-3 h-3 text-white/40" />
                <span className="text-xs font-medium text-white/50">Version History</span>
              </div>
              <div className="space-y-1">
                {versions.slice().reverse().map((v, idx) => (
                  <button
                    key={v._id}
                    onClick={() => setVersionIndex(idx)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition ${
                      versionIndex === idx
                        ? 'bg-white/10 text-white border border-blue-500/30'
                        : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div>v{v.version} • {(v.prompt || '').slice(0, 30)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {designError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{designError}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
