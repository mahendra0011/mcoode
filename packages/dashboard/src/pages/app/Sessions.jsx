import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export function Sessions() {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/sessions')).data,
    refetchInterval: 5000
  });

  if (isLoading) return <p className="font-mono text-sm text-gray-500">loading sessions…</p>;

  const sessions = data?.items || [];

  return (
    <div>
      <h1 className="font-mono text-xl font-semibold text-white">Sessions</h1>
      <p className="mt-1 text-sm text-gray-500">Every build, god-mode run, and watch activity record.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sessions.length === 0 && (
          <Card>
            <CardContent className="p-6 font-mono text-sm text-gray-500">
              No sessions yet. Run <code className="text-mcode-green">mcode god "…"</code> with the backend connected.
            </CardContent>
          </Card>
        )}
        {sessions.map((s) => (
          <Link key={s._id} to={`/app/sessions/${s._id}`}>
            <Card className="transition-colors hover:border-mcode-green/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{s.projectName || 'unnamed'}</CardTitle>
                  <Badge variant={s.status === 'completed' ? 'success' : s.status === 'failed' ? 'danger' : 'warning'}>
                    {s.status}
                  </Badge>
                </div>
                <CardDescription>
                  {s.mode} · {new Date(s.createdAt || Date.now()).toISOString().slice(0, 16).replace('T', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between font-mono text-xs text-gray-500">
                <span>{s.plan?.todos?.length || 0} todos</span>
                <span>{s.results?.total || s.results?.done || ''}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
