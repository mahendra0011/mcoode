import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, SkipForward, Route, Loader2 } from 'lucide-react';
import api from '../../lib/axios';
import { DOMAIN_BG } from './WaveProgress';

const OUTCOME_ICON: Record<string, React.ReactNode> = {
  fixed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />,
  'needs-review': <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
  skipped: <SkipForward className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />,
  routing: <Route className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />,
};

function relativeTime(ts: string) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.max(0, Math.round(diff / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function WatchActivityFeed({ projectId, live = [] }: { projectId?: string | null; live?: any[] }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/api/v1/watch/${projectId}/activity?limit=20`)
      .then((res) => {
        const items = res?.data?.items;
        if (Array.isArray(items)) {
          setHistory(items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const merged = [...live, ...history.filter((h) => !live.some((l) => l.timestamp === h.timestamp))].slice(0, 30);

  return (
    <div className="h-full flex flex-col bg-[#111]">
      <div className="px-3 py-2 border-b border-white/5 text-xs font-semibold text-white/70">Watch Activity</div>
      {loading && merged.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
          <AnimatePresence initial={false}>
            {merged.map((item, idx) => (
              <motion.div
                key={item.timestamp || `watch-item-${idx}`}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 py-2 flex items-start gap-2"
              >
                {OUTCOME_ICON[item.outcome] || OUTCOME_ICON.skipped}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-white/80 font-mono truncate">{item.file}</span>
                    {item.domain && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${DOMAIN_BG[item.domain] || 'bg-white/10 text-white/40'}`}>
                        {item.domain}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">{item.detail}</div>
                </div>
                <span className="text-[9px] text-white/20 flex-shrink-0">{relativeTime(item.timestamp)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {merged.length === 0 && (
            <div className="px-3 py-6 text-center text-[11px] text-white/30">No activity yet — watch daemon is idle</div>
          )}
        </div>
      )}
    </div>
  );
}
