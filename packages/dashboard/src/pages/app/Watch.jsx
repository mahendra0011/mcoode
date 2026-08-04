import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client.js';
import { Card, CardContent } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export function Watch() {
  const dispatch = useDispatch();
  const events = useSelector((s) => s.watch.activity);
  const { data } = useQuery({
    queryKey: ['watch-projects'],
    queryFn: async () => (await api.get('/watch/projects')).data,
    refetchInterval: 8000
  });

  React.useEffect(() => {
    if (data?.items?.length && events.length === 0) {
      dispatch({ type: 'watch/setActivity', payload: data.items });
    }
  }, [data, dispatch, events.length]);

  const projects = data?.items || [];

  return (
    <div>
      <h1 className="font-mono text-xl font-semibold text-white">Watch daemon</h1>
      <p className="mt-1 text-sm text-gray-500">Detection events, auto-fixes, and daemon health across projects.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-mono text-sm font-semibold text-gray-400">Projects</h2>
          <div className="space-y-3">
            {projects.length === 0 && (
              <Card>
                <CardContent className="p-5 font-mono text-sm text-gray-500">
                  No watch projects yet. Run <code className="text-mcode-green">mcode watch --background</code> in a repo.
                </CardContent>
              </Card>
            )}
            {projects.map((p) => (
              <Card key={p._id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-sm text-mcode-green">{p.projectPath}</code>
                    <span className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
                      <span className={`h-2 w-2 rounded-full ${p.status === 'running' ? 'animate-pulse bg-mcode-green' : 'bg-gray-700'}`} />
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] text-gray-600">
                    <span>events {p.stats?.eventsDetected || 0}</span>
                    <span>fixed {p.stats?.autoFixesApplied || 0}</span>
                    <span>model calls {p.stats?.modelCalls || 0}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-mono text-sm font-semibold text-gray-400">Activity feed</h2>
          <div className="space-y-2">
            {events.length === 0 && (
              <Card>
                <CardContent className="p-5 font-mono text-sm text-gray-600">no events recorded yet</CardContent>
              </Card>
            )}
            <AnimatePresence initial={false}>
              {events.slice(0, 50).map((e, i) => (
                <motion.div
                  key={e._id || `${e.file}-${i}`}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-md border border-mcode-border bg-mcode-panel/30 px-3 py-2.5"
                >
                  <Badge variant={e.type === 'fix' ? 'success' : 'default'}>{e.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <code className="block truncate font-mono text-xs text-gray-300">{e.file}</code>
                    <span className="text-[11px] text-gray-600">
                      {e.issue ? `${e.issue.slice(0, 90)}…` : new Date(e.timestamp || Date.now()).toISOString().slice(11, 19)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
