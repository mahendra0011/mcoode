import { useSelector } from 'react-redux';
import { Card, CardContent } from '../../components/ui/card.jsx';

export function Agents() {
  const agents = useSelector((s) => s.agents.agents || []);
  const active = agents.filter((a) => ['running', 'pending'].includes(a.status));

  return (
    <div>
      <h1 className="font-mono text-xl font-semibold text-white">Agents</h1>
      <p className="mt-1 text-sm text-gray-500">
        {active.length > 0
          ? `${active.length} agent${active.length > 1 ? 's' : ''} running — see the live panel on the right`
          : 'No agents running. Launch a build with mcode god "…" and watch the live panel appear on the right.'}
      </p>
      <Card className="mt-6">
        <CardContent className="p-6 font-mono text-sm text-gray-500">
          Live agent activity now lives in the sidebar — it auto-appears while work is running and
          disappears when it completes. Click any agent card to inspect the code it wrote.
        </CardContent>
      </Card>
    </div>
  );
}