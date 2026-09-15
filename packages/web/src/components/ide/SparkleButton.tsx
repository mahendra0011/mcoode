import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, Copy, ArrowRight, X, Lightbulb, Wand2 } from 'lucide-react';
import api from '../../lib/axios';

const STARTER_TEMPLATES = [
  {
    title: 'Full-Stack Auth System',
    prompt: 'Build a secure authentication system in Node.js and React with JWT, refresh tokens, bcrypt password hashing, and MongoDB.',
  },
  {
    title: 'Responsive Dashboard UI',
    prompt: 'Create a modern, responsive analytics dashboard in React with Tailwind CSS, interactive charts, dark mode, and filter controls.',
  },
  {
    title: 'Robust REST API',
    prompt: 'Create a production-grade REST API in Express with input validation, modular service architecture, centralized error handling, and unit tests.',
  },
  {
    title: 'Bug Fix & Code Refactor',
    prompt: 'Analyze this component for performance bottlenecks, fix memory leaks, type-safety issues, and refactor for readability and reusability.',
  },
];

const LOCAL_TYPO_MAP: [RegExp, string][] = [
  [/\bcreat\b/gi, 'create'],
  [/\bcretae\b/gi, 'create'],
  [/\bbuid\b/gi, 'build'],
  [/\blongin\b/gi, 'login'],
  [/\blogn\b/gi, 'login'],
  [/\bauthen?tication\b/gi, 'authentication'],
  [/\bauthntication\b/gi, 'authentication'],
  [/\brfrsh\b/gi, 'refresh'],
  [/\btokn\b/gi, 'token'],
  [/\bpasword\b/gi, 'password'],
  [/\bdatabse\b/gi, 'database'],
  [/\bmangodb\b/gi, 'MongoDB'],
  [/\bmongodb\b/gi, 'MongoDB'],
  [/\bposgres\b/gi, 'PostgreSQL'],
  [/\bpostgre\b/gi, 'PostgreSQL'],
  [/\btailwnd(\s*css)?\b/gi, 'Tailwind CSS'],
  [/\btailwind(\s*css)?\b/gi, 'Tailwind CSS'],
  [/\brecat\b/gi, 'React'],
  [/\breact(js)?\b/gi, 'React'],
  [/\bnodjs\b/gi, 'Node.js'],
  [/\bnode(js)?\b/gi, 'Node.js'],
  [/\bexpress(js)?\b/gi, 'Express'],
  [/\btypescrpt\b/gi, 'TypeScript'],
  [/\bjavascrpt\b/gi, 'JavaScript'],
  [/\bcomponet\b/gi, 'component'],
  [/\brespnsive\b/gi, 'responsive'],
  [/\bdasboard\b/gi, 'dashboard'],
  [/\bmidleware\b/gi, 'middleware'],
  [/\bendpont\b/gi, 'endpoint'],
];

function localEnhance(rawText: string) {
  let text = rawText.trim();
  const corrections: string[] = [];
  for (const [regex, replacement] of LOCAL_TYPO_MAP) {
    if (regex.test(text)) {
      text = text.replace(regex, replacement);
      corrections.push(replacement);
    }
  }
  text = text.replace(/(^\s*|\.\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());

  if (text.length > 150 && text.includes('\n')) {
    return { enhanced: text, corrections };
  }

  const pLower = text.toLowerCase();
  const additions: string[] = [];
  if (pLower.includes('api') || pLower.includes('backend') || pLower.includes('endpoint')) {
    additions.push('Include robust input validation, proper HTTP status codes, structured error handling, and clean modular code.');
  }
  if (pLower.includes('auth') || pLower.includes('login') || pLower.includes('jwt') || pLower.includes('token')) {
    additions.push('Follow security best practices: hash passwords with bcrypt, use HttpOnly cookies for refresh tokens, and guard routes.');
  }
  if (pLower.includes('component') || pLower.includes('page') || pLower.includes('ui') || pLower.includes('frontend') || pLower.includes('dashboard')) {
    additions.push('Ensure clean modern design, responsive layouts for mobile and desktop, accessible elements, and smooth interactions.');
  }
  if (pLower.includes('test')) {
    additions.push('Cover happy paths, edge cases, error conditions, and clean mock setup.');
  }

  const enhanced = additions.length > 0
    ? `${text}\n\nKey Requirements:\n- ${additions.join('\n- ')}`
    : `${text}\n\nPlease ensure clean architecture, complete error handling, and production-ready best practices.`;

  return { enhanced, corrections };
}

export interface SparkleButtonProps {
  prompt?: string;
  setPrompt: (prompt: string) => void;
  advancedMode?: boolean;
  watchMode?: boolean;
  onToggleWatch?: () => void;
}

export function SparkleButton({ prompt = '', setPrompt }: SparkleButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<{
    original: string;
    enhanced: string;
    corrections?: string[];
    source?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTriggerEnhance = async () => {
    const trimmed = (prompt || '').trim();
    setOpen(true);
    setCopied(false);
    setApplied(false);

    if (!trimmed) {
      // Empty prompt -> show starter guide and tips
      setEnhancedResult(null);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/prompt/enhance', { prompt: trimmed }, { timeout: 8000 });
      if (res.data && res.data.enhanced) {
        setEnhancedResult({
          original: trimmed,
          enhanced: res.data.enhanced,
          corrections: res.data.corrections || [],
          source: res.data.source || 'ai',
        });
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to instant local rule-based enhancement
    }

    const fallback = localEnhance(trimmed);
    setEnhancedResult({
      original: trimmed,
      enhanced: fallback.enhanced,
      corrections: fallback.corrections,
      source: 'smart-optimizer',
    });
    setLoading(false);
  };

  const handleApply = () => {
    if (enhancedResult?.enhanced) {
      setPrompt(enhancedResult.enhanced);
      setApplied(true);
      setTimeout(() => {
        setOpen(false);
        setApplied(false);
      }, 500);
    }
  };

  const handleCopy = () => {
    if (enhancedResult?.enhanced) {
      navigator.clipboard.writeText(enhancedResult.enhanced);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={handleTriggerEnhance}
        disabled={loading}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-xs font-medium border backdrop-blur-md cursor-pointer ${
          open || loading
            ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-amber-400'
        }`}
        title="Enhance prompt, fix typing errors & improve understanding (✨)"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 md:w-[440px] max-w-[90vw] bg-[#141419]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] p-4 z-50 text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-400/20 to-purple-500/20 border border-amber-400/30 flex items-center justify-center">
                  <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    Prompt Enhancer
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                      Smart Fix & Expand
                    </span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                  <Sparkles className="w-4 h-4 text-amber-400 absolute inset-0 m-auto" />
                </div>
                <div className="text-xs text-white/80 font-medium">Fixing errors & enhancing prompt...</div>
                <div className="text-[11px] text-white/40">Polishing grammar, adding technical specs & context</div>
              </div>
            ) : enhancedResult ? (
              <div className="mt-3 flex flex-col gap-3">
                {/* Corrections badge */}
                {enhancedResult.corrections && enhancedResult.corrections.length > 0 && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-[11px] text-emerald-300">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>
                      Corrected typos:{' '}
                      <strong className="text-white font-semibold">
                        {enhancedResult.corrections.slice(0, 4).join(', ')}
                        {enhancedResult.corrections.length > 4 ? '...' : ''}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Enhanced Result Box */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-white/50 px-1">
                    <span>Enhanced & Structured Prompt:</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 hover:text-white transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto bg-[#09090c] border border-white/10 rounded-xl p-3 text-xs text-white/90 font-mono whitespace-pre-wrap leading-relaxed custom-scrollbar selection:bg-purple-500/30">
                    {enhancedResult.enhanced}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleApply}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    {applied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Applied!
                      </>
                    ) : (
                      <>
                        Apply to Input <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            ) : (
              /* Empty state: prompt is empty -> Show explanation and Quick Starters */
              <div className="mt-3 flex flex-col gap-3">
                <div className="text-[12px] text-white/70 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold mb-1 text-xs">
                    <Lightbulb className="w-3.5 h-3.5" /> How it works:
                  </div>
                  Type any rough draft or typo-filled prompt in the box, then click <strong className="text-white">✨ Sparkle</strong> to fix spelling, expand specifications, and structure it for optimal AI understanding.
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-white/50 px-1">Or pick a starter prompt:</span>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {STARTER_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(tmpl.prompt);
                          setOpen(false);
                        }}
                        className="text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition flex flex-col gap-0.5 group cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                          {tmpl.title}
                        </span>
                        <span className="text-[11px] text-white/50 truncate w-full group-hover:text-white/70">
                          {tmpl.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
