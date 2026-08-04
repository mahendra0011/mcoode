import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { MarketingLayout } from './MarketingLayout.jsx';
import { Badge } from '../components/ui/badge.jsx';

export function Plugins() {
  const { data, isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: async () => (await api.get('/plugins')).data
  });

  const plugins = data?.items || [];
  const fallback = [
    { name: 'plugin:eslint', category: 'lint', description: 'ESLint flat-config preset (JS-only ruleset)', latestVersion: '1.0.0', installs: 1284 },
    { name: 'plugin:prettier', category: 'format', description: 'Prettier formatting preset', latestVersion: '1.0.1', installs: 946 },
    { name: 'plugin:deploy-docker', category: 'deploy', description: 'Dockerfile + compose preset', latestVersion: '1.2.0', installs: 612 }
  ];

  return (
    <MarketingLayout
      label="Plugins"
      title="Plugin registry"
      sub="Browse, search, and install mcode plugins and presets."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(isLoading ? fallback : plugins).map((p) => (
          <div key={p.name} className="terminal-card p-5">
            <div className="flex items-start justify-between gap-2">
              <code className="font-mono text-sm font-bold text-mcode-green">{p.name}</code>
              <Badge variant="default">{p.category}</Badge>
            </div>
            <p className="mt-2 min-h-[3rem] text-sm text-gray-400">{p.description}</p>
            <div className="mt-3 flex items-center justify-between border-t border-mcode-border pt-3 text-xs text-gray-600">
              <span>v{p.latestVersion}</span>
              <span>{p.installs} installs</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 font-mono text-sm text-gray-500">
        Install: <code className="text-mcode-green">mcode add plugin:eslint</code>
      </p>
    </MarketingLayout>
  );
}
