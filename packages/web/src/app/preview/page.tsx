'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Minimize2,
  Code2,
  Sparkles,
  Play,
} from 'lucide-react';
import { getSocket } from '../../hooks/useChatSocket';
import { toast } from 'sonner';
import { reportError } from '../../lib/logger';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const QUICK_PORTS = [
  { label: '5500 (HTML)', url: 'http://localhost:5500' },
  { label: '5173 (Vite)', url: 'http://localhost:5173' },
  { label: '3001 (Node)', url: 'http://localhost:3001' },
  { label: '8080 (Web)', url: 'http://localhost:8080' },
];

function isHttpPreviewUrl(value: string): boolean {
  try {
    const parsed = new URL(value, 'http://localhost');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const workspaceId = searchParams.get('workspaceId') || '';
  const defaultUrl = workspaceId ? `/api/v1/workspaces/${workspaceId}/preview/index.html` : 'http://localhost:5500';
  const requestedUrl = searchParams.get('url') || defaultUrl;
  const initialUrl = isHttpPreviewUrl(requestedUrl) ? requestedUrl : defaultUrl;
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // SECURITY: allow-scripts + allow-same-origin on an origin identical to the
  // dashboard would let previewed project code strip its own sandbox and
  // script the whole app. Project previews normally live on a different
  // port (127.0.0.1:<port>), so allow-same-origin is only granted when the
  // origins actually differ; same-origin previews run fully sandboxed.
  const previewSandbox = React.useMemo(() => {
    const base = 'allow-forms allow-modals allow-popups allow-presentation allow-scripts';
    if (typeof window === 'undefined') return base;
    try {
      const target = new URL(url, window.location.origin);
      if (target.protocol !== 'http:' && target.protocol !== 'https:') return base;
      if (target.origin !== window.location.origin) return `${base} allow-same-origin`;
    } catch { /* malformed URL — stay conservative (no same-origin) */ }
    return base;
  }, [url]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Safety: auto-clear loading overlay after 3.5s so spinner never gets stuck
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isLoading, url]);

  // Sync if query param changes
  useEffect(() => {
    const qUrl = searchParams.get('url');
    if (qUrl && qUrl !== url) {
      if (!isHttpPreviewUrl(qUrl)) {
        toast.error('Preview URLs must use HTTP or HTTPS');
        return;
      }
      setUrl(qUrl);
      setInputUrl(qUrl);
      setIsLoading(true);
      setLoadError(false);
    }
  }, [searchParams]);

  // Listen to socket for project server ready
  useEffect(() => {
    const socket = getSocket();
    const handleProjectReady = (payload: { previewUrl?: string }) => {
      if (payload?.previewUrl) {
        setUrl(payload.previewUrl);
        setInputUrl(payload.previewUrl);
        setIsLoading(true);
        setLoadError(false);
        toast.success(`Server ready: ${payload.previewUrl}`);
      }
    };
    const handleProjectError = (payload: { error?: string }) => {
      if (payload?.error) {
        toast.error(`Server error: ${payload.error}`);
        setIsLoading(false);
        setLoadError(true);
      }
    };
    socket.on('project:run-ready', handleProjectReady);
    socket.on('project:run-error', handleProjectError);
    return () => {
      socket.off('project:run-ready', handleProjectReady);
      socket.off('project:run-error', handleProjectError);
    };
  }, []);

  const handleStartServer = () => {
    const socket = getSocket();
    const wsId = searchParams.get('workspaceId') || undefined;
    socket.emit('project:run', { workspaceId: wsId });
    setIsLoading(true);
    setLoadError(false);
    toast.info('Starting local project server...');
  };

  const handleReload = () => {
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleSelectPort = (newUrl: string) => {
    if (!isHttpPreviewUrl(newUrl)) return;
    setUrl(newUrl);
    setInputUrl(newUrl);
    setIsLoading(true);
    setLoadError(false);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = 'http://' + target;
    }
    if (!isHttpPreviewUrl(target)) {
      toast.error('Preview URLs must use HTTP or HTTPS');
      return;
    }
    setUrl(target);
    setInputUrl(target);
    setIsLoading(true);
    setLoadError(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copied to clipboard');
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Device width classes
  const getContainerWidthClass = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-[375px] h-[667px] my-auto rounded-3xl border-4 border-[#2c2c2e] shadow-2xl overflow-hidden';
      case 'tablet':
        return 'w-[768px] h-[1024px] my-auto rounded-2xl border-4 border-[#2c2c2e] shadow-2xl overflow-hidden';
      case 'desktop':
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-neutral-900 select-none overflow-hidden">
      {/* Top Address & Navigation Bar */}
      <header className="h-12 flex items-center justify-between px-3 bg-white border-b border-slate-200 z-30 flex-shrink-0 shadow-xs gap-2">
        {/* Left Navigation Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => router.push('/ai/chat')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-slate-100 text-xs font-bold transition mr-1 cursor-pointer"
            title="Return to IDE"
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">IDE</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <button
            onClick={() => {
              try {
                iframeRef.current?.contentWindow?.history.back();
              } catch (err) {
                reportError('preview back navigation', err, { userVisible: false });
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              try {
                iframeRef.current?.contentWindow?.history.forward();
              } catch (err) {
                reportError('preview forward navigation', err, { userVisible: false });
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReload}
            className={`p-1.5 rounded-lg hover:bg-slate-100 text-neutral-500 hover:text-neutral-900 transition cursor-pointer ${
              isLoading ? 'animate-spin text-emerald-600' : ''
            }`}
            title="Reload Page"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Start Server Button */}
          <button
            type="button"
            onClick={handleStartServer}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition ml-1 cursor-pointer shadow-xs"
            title="Start local server for active project"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden md:inline">Start Server</span>
          </button>
        </div>

        {/* Center: Browser URL Address Bar + Quick Ports */}
        <div className="flex-1 max-w-2xl mx-1 flex items-center gap-1.5 min-w-0">
          <form
            onSubmit={handleNavigate}
            className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition shadow-xs min-w-0"
          >
            <div className="flex items-center gap-1 text-emerald-600 mr-2 flex-shrink-0">
              <Lock className="w-3 h-3" />
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-700 hidden lg:inline">
                Live
              </span>
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 bg-transparent text-neutral-900 outline-none font-mono text-xs placeholder-neutral-400 truncate"
              placeholder="http://localhost:5500"
            />

            <div className="flex items-center gap-1 ml-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1 rounded-lg hover:bg-slate-200/60 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleOpenExternal}
                className="p-1 rounded-lg hover:bg-slate-200/60 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                title="Open in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Port Chips */}
          <div className="hidden xl:flex items-center gap-1 flex-shrink-0">
            {QUICK_PORTS.map((p) => (
              <button
                key={p.url}
                type="button"
                onClick={() => handleSelectPort(p.url)}
                className={`px-1.5 py-1 rounded-lg text-[10.5px] font-mono transition cursor-pointer ${
                  url === p.url
                    ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Tools: Responsive Viewport Switcher & Fullscreen */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                deviceMode === 'desktop' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                deviceMode === 'tablet' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                deviceMode === 'mobile' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-neutral-500 hover:text-neutral-900 transition ml-1 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Screen: Full Viewport Iframe Container */}
      <main className="flex-1 w-full h-[calc(100vh-48px)] flex items-center justify-center bg-slate-200/50 relative overflow-hidden">
        {/* Loading overlay with safety dismiss */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-20 transition-opacity">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
              <Sparkles className="w-5 h-5 text-emerald-600 absolute animate-pulse" />
            </div>
            <p className="text-sm font-bold text-neutral-800 tracking-tight">Connecting to project server...</p>
            <p className="text-xs font-mono text-neutral-500 mt-1">{url}</p>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsLoading(false)}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-700 text-xs font-medium transition cursor-pointer border border-slate-200"
              >
                Show page now
              </button>
              <button
                type="button"
                onClick={handleStartServer}
                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition cursor-pointer shadow-xs"
              >
                Start Local Server
              </button>
            </div>
          </div>
        )}

        {/* Load error state */}
        {loadError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold mb-3 shadow-xs">
              ✕
            </div>
            <h2 className="text-base font-bold text-neutral-900">Could not connect to project server</h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-md font-mono">{url}</p>
            <p className="text-xs text-neutral-400 mt-2 max-w-sm">
              Start your server using the button below or run <code>npx serve .</code> / <code>npm run dev</code> in the IDE terminal.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleStartServer}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Local Server</span>
              </button>
              <button
                onClick={handleReload}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-neutral-700 text-xs font-semibold rounded-xl transition border border-slate-200 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* The Live Website Iframe */}
        <div className={`transition-all duration-300 bg-white shadow-md ${getContainerWidthClass()}`}>
          <iframe
            ref={iframeRef}
            src={url}
            title="Project Web Preview"
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
            sandbox={previewSandbox}
            onLoad={() => {
              setIsLoading(false);
              setLoadError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setLoadError(true);
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-neutral-900">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" />
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
