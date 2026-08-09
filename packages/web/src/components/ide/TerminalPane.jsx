import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function TerminalPane({ messages }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const processedRef = useRef(new Set());
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#f4f4f5',
        cursor: 'transparent',
        // Project accent colors: emerald + blue palette
        black: '#0a0a0a',
        red: '#f87171',
        green: '#10b981',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#2dd677',
        white: '#e5e5e5',
        brightBlack: '#27272a',
        brightRed: '#fb6b6b',
        brightGreen: '#2dd677',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#4feda8',
        brightWhite: '#f4f4f5'
      },
      fontSize: 13,
      fontFamily: 'monospace',
      convertEol: true,
      disableStdin: true
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Slight delay to ensure container has dimensions before fitting
    setTimeout(() => fitAddon.fit(), 50);
    xtermRef.current = term;

    // Use ResizeObserver for accurate pane resizing
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // Listen for live chunks from active shell commands
    const handleLiveStream = (e) => {
      setHasContent(true);
      term.write(e.detail.replace(/\n/g, '\r\n'));
    };
    document.addEventListener('terminal:write', handleLiveStream);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      document.removeEventListener('terminal:write', handleLiveStream);
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;

    messages.forEach(msg => {
      // Use replaceKey (stable across start→done) instead of msg.id, which
      // may be undefined/colliding for multiple messages from the backend.
      const key = msg.replaceKey || msg.id || 'unknown';

      // Whenever a shell command starts (status='running'), we print the prompt
      if ((msg.tool === 'run_shell' || msg.tool === 'run_tests') && msg.status === 'running') {
        const cmdKey = `start-${key}`;
        if (!processedRef.current.has(cmdKey)) {
          const cmd = msg.command || msg.args?.command || msg.args?.file || '...';
          term.write(`\x1b[34m$ ${cmd}\x1b[0m\r\n`);
          processedRef.current.add(cmdKey);
          setHasContent(true);
        }
      }

      // When done, add trailing newlines to separate from the next command
      if ((msg.tool === 'run_shell' || msg.tool === 'run_tests') && msg.status === 'done') {
        const endKey = `end-${key}`;
        if (!processedRef.current.has(endKey)) {
          term.write('\r\n\r\n');
          processedRef.current.add(endKey);
        }
      }
    });
  }, [messages]);

  const handleClear = () => {
    xtermRef.current?.clear();
    setHasContent(false);
  };

  return (
    <motion.div
      className="h-48 border-t border-white/5 bg-[#0e0e0e] flex flex-col flex-shrink-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#121212]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <TerminalIcon className="w-4 h-4 text-white/50" />
          </motion.div>
          <motion.span
            className="text-xs font-semibold text-white/70 uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Terminal
          </motion.span>
        </motion.div>
        <motion.button
          onClick={handleClear}
          className="text-white/40 hover:text-white/90 transition flex items-center justify-center p-1"
          title="Clear Terminal"
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </motion.div>

      <div className="flex-1 overflow-hidden p-2 relative">
        <AnimatePresence>
          {!hasContent && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center text-white/30 italic text-sm pointer-events-none z-10"
            >
              No commands run yet — terminal output will appear here
            </motion.div>
          )}
        </AnimatePresence>
        <div className="w-full h-full" ref={terminalRef}></div>
      </div>
    </motion.div>
  );
}
