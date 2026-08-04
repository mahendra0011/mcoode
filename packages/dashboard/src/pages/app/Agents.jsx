import { useSelector } from 'react-redux';
import { Card, CardContent } from '../../components/ui/card.jsx';
import { Badge, DomainBadge } from '../../components/ui/badge.jsx';

export function Agents() {
  const agents = useSelector((s) => s.agents.agents || []);

  const running = agents.filter((a) => a.status === 'running' || a.status === 'pending');

  if (running.length === 0) {
    return (
      <div>
        <h1 className="font-mono text-xl font-semibold text-white">Live agents</h1>
        <Card className="mt-6">
          <CardContent className="p-6 font-mono text-sm text-gray-500">
            No subagents are working right now. Launch a build from the CLI
            (<code className="text-mcode-green">mcode god "…"</code>) and watch them stream in.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-mono text-xl font-semibold text-white">Live agents</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {running.map((a) => (
          <Card key={a.todoId}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-mcode-green">{a.todoId}</span>
                <div className="flex items-center gap-2">
                  <DomainBadge domain={a.domain} />
                  <Badge variant={a.status === 'done' ? 'success' : 'warning'}>{a.status}</Badge>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 font-mono text-xs text-gray-400">{a.model}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-300">{a.message || 'working…'}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-mcode-border">
                <div
                  className="h-full bg-mcode-green transition-all duration-500"
                  style={{ width: `${a.total ? Math.min(100, ((a.step || 0) / a.total) * 100) : 8}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-gray-600">
                <span>step {a.step || 0}/{a.total || '…'}</span>
                <span>{a.total ? Math.round(((a.step || 0) / a.total) * 100) : 0}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
