import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export function SessionDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', id],
    queryFn: async () => (await api.get(`/sessions/${id}`)).data,
    refetchInterval: 3000
  });

  if (isLoading) return <p className="font-mono text-sm text-gray-500">loading…</p>;

  const s = data?.session || data;
  if (!s) return <p className="font-mono text-sm text-gray-500">Session not found.</p>;

  return (
    <div>
      <Link to="/app" className="font-mono text-xs text-gray-500 hover:text-mcode-green">← sessions</Link>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="font-mono text-xl font-semibold text-white">{s.projectName || 'unnamed'}</h1>
        <Badge variant={s.status === 'completed' ? 'success' : s.status === 'failed' ? 'danger' : 'warning'}>{s.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {s.mode || 'run'} · {s.plan?.model || 'auto'}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Todo plan</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(s.plan?.todos || []).map((t, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-xs">
                  <span className={t.status === 'done' ? 'text-mcode-green' : 'text-gray-600'}>
                    {t.status === 'done' ? '✓' : '•'}
                  </span>
                  <span className="text-gray-400">{t.title}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-sm">Agent transcripts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(s.agentTranscripts || []).length === 0 && (
              <p className="font-mono text-xs text-gray-600">no transcripts recorded</p>
            )}
            {(s.agentTranscripts || []).map((t, i) => (
              <div key={i} className="rounded-md border border-mcode-border bg-mcode-bg p-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-mcode-green">{t.todoTitle || t.agentId}</span>
                  <span className="text-gray-600">{t.status}</span>
                </div>
                {t.terminalLog && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-gray-500">
                    {t.terminalLog}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
