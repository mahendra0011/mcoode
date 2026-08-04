import { AnimatePresence, motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useState } from 'react';
import { DomainBadge } from './ui/badge.jsx';
import { CodeViewerPanel } from './CodeViewerPanel.jsx';

const cardVariants = {
  hidden: { opacity: 0, x: -24, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: 'auto',
    marginBottom: 12,
    transition: { type: 'spring', stiffness: 340, damping: 28 }
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.3, ease: 'easeInOut' }
  }
};

/**
 * Live agents panel — auto-appears on the right while subagents run,
 * auto-disappears when nothing is active. Agents are grouped by DAG wave
 * so parallel execution "feels fast". Click a card to view its code.
 */
export function AgentSidebar() {
  const agents = useSelector((s) => s.agents.agents || []);
  const [viewing, setViewing] = useState(null);

  const active = agents.filter((a) => ['running', 'pending', 'needs_review'].includes(a.status));

  const waves = active.reduce((acc, a) => {
    const w = a.wave || 1;
    (acc[w] = acc[w] || []).push(a);
    return acc;
  }, {});

  if (active.length === 0) return null;

  return (
    <>
      <aside className="w-80 shrink-0 border-l border-mcode-border bg-mcode-panel/40 p-4 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold text-white">
            Live agents <span className="text-mcode-green">({active.length})</span>
          </h2>
          <span className="flex h-2 w-2 animate-pulse-slow rounded-full bg-mcode-green" />
        </div>

        {Object.entries(waves).map(([wave, wagents]) => (
          <div key={wave} className="mb-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-gray-600">
              Wave {wave} · {wagents.length} running
            </p>
            <AnimatePresence initial={false}>
              {wagents.map((a) => (
                <motion.div
                  key={a.todoId}
                  layout
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={() => setViewing(a)}
                  className="cursor-pointer rounded-lg border border-mcode-border bg-mcode-bg p-3 transition-colors hover:border-mcode-green/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-mcode-green">{a.todoId}</span>
                    <DomainBadge domain={a.domain} />
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{a.model}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-gray-300">{a.message}</p>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-mcode-border">
                    <motion.div
                      className="h-full bg-mcode-green"
                      animate={{ width: `${a.total ? Math.min(100, ((a.step || 0) / a.total) * 100) : 8}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>

                  {a.filesChanged?.length > 0 && (
                    <p className="mt-2 font-mono text-[10px] text-gray-600">
                      {a.filesChanged.length} file{a.filesChanged.length > 1 ? 's' : ''} — click to view
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </aside>

      <AnimatePresence>
        {viewing && (
          <CodeViewerPanel agent={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </>
  );
}