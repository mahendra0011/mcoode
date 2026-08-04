import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';

export function Usage() {
  const { data, isLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => (await api.get('/usage')).data,
    refetchInterval: 15000
  });

  if (isLoading) return <p className="font-mono text-sm text-gray-500">loading…</p>;

  const d = data?.usage || {};

  return (
    <div>
      <h1 className="font-mono text-xl font-semibold text-white">Usage</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-400">Sessions</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl font-bold text-white">
            {d.totalSessions || 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-gray-400">Report</CardTitle>
            <a
              href="/api/usage/report.pdf"
              target="_blank"
              rel="noreferrer"
              className="rounded border border-mcode-border px-3 py-1.5 font-mono text-xs text-mcode-green hover:border-mcode-green/50"
            >
              download PDF report
            </a>
          </CardHeader>
          <CardContent className="font-mono text-sm text-gray-500">
            Session history exported as PDF.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
