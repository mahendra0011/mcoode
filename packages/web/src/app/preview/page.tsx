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
} from 'lucide-react';
import { getSocket } from '../../hooks/useChatSocket';
import { toast } from 'sonner';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialUrl = searchParams.get('url') || 'http://localhost:3000';
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Sync if query param changes
  useEffect(() => {
    const qUrl = searchParams.get('url');
    if (qUrl && qUrl !== url) {
      setUrl(qUrl);
      setInputUrl(qUrl);
      setIsLoading(true);
      setLoadError(false);
    }
  }, [searchParams]);

  // Listen to socket for new project container preview URLs
  useEffect(() => {
    const socket = getSocket();
    const handleProjectReady = (payload: { previewUrl?: string }) => {
      if (payload?.previewUrl) {
        setUrl(payload.previewUrl);
        setInputUrl(payload.previewUrl);
        setIsLoading(true);
        setLoadError(false);
        toast.success(`Project updated: ${payload.previewUrl}`);
      }
    };
    socket.on('project:run-ready', handleProjectReady);
    return () => {
      socket.off('project:run-ready', handleProjectReady);
    };
  }, []);

  const handleReload = () => {
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = 'http://' + target;
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
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-white select-none overflow-hidden">
      {/* Top Address & Navigation Bar */}
      <header className="h-11 flex items-center justify-between px-3 bg-[#121212] border-b border-white/10 z-30 flex-shrink-0">
        {/* Left Navigation Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => router.push('/ai/chat')}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 text-xs font-medium transition mr-1"
            title="Return to IDE"
          >
            <Code2 className="w-4 h-4 text-[#0078d4]" />
            <span className="hidden sm:inline">IDE</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          <button
            onClick={() => {
              try {
                iframeRef.current?.contentWindow?.history.back();
              } catch {}
            }}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              try {
                iframeRef.current?.contentWindow?.history.forward();
              } catch {}
            }}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReload}
            className={`p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition ${
              isLoading ? 'animate-spin text-emerald-400' : ''
            }`}
            title="Reload Page"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Browser URL Address Bar */}
        <form
          onSubmit={handleNavigate}
          className="flex-1 max-w-xl mx-4 flex items-center bg-[#1e1e1e] border border-white/10 rounded-full px-3 py-1 text-xs focus-within:border-[#0078d4] focus-within:ring-1 focus-within:ring-[#0078d4] transition shadow-inner"
        >
          <div className="flex items-center gap-1.5 text-emerald-400 mr-2 flex-shrink-0">
            <Lock className="w-3 h-3" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-400/80 hidden md:inline">
              Live
            </span>
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-transparent text-white/90 outline-none font-mono text-xs placeholder-white/20 truncate"
            placeholder="http://localhost:3000"
          />

          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition"
              title="Copy URL"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={handleOpenExternal}
              className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Right Tools: Responsive Viewport Switcher & Fullscreen */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center bg-[#181818] border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-md text-xs transition ${
                deviceMode === 'desktop' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-md text-xs transition ${
                deviceMode === 'tablet' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-md text-xs transition ${
                deviceMode === 'mobile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition ml-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Screen: Full Viewport Iframe Container */}
      <main className="flex-1 w-full h-[calc(100vh-44px)] flex items-center justify-center bg-[#0e0e0e] relative overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0e0e] z-20 transition-opacity">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#0078d4]/20 border-t-[#0078d4] animate-spin" />
              <Sparkles className="w-5 h-5 text-[#0078d4] absolute animate-pulse" />
            </div>
            <p className="text-sm font-medium text-white/80 tracking-wide">Connecting to project server...</p>
            <p className="text-xs font-mono text-white/40 mt-1">{url}</p>
          </div>
        )}

        {/* Load error state */}
        {loadError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0e0e] z-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
              ✕
            </div>
            <h2 className="text-base font-semibold text-white/90">Could not connect to project server</h2>
            <p className="text-xs text-white/50 mt-1 max-w-md font-mono">{url}</p>
            <p className="text-xs text-white/40 mt-2 max-w-sm">
              Make sure your project server or Docker container is running and listening on this port.
            </p>
            <button
              onClick={handleReload}
              className="mt-4 px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-medium rounded-lg transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* The Live Website Iframe */}
        <div className={`transition-all duration-300 bg-white ${getContainerWidthClass()}`}>
          <iframe
            ref={iframeRef}
            src={url}
            title="Project Web Preview"
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
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
        <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a] text-white">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#0078d4] animate-spin" />
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
