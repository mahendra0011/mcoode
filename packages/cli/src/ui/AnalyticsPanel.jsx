import { useEffect, useState } from 'react';
import { TextAttributes, useKeyboard } from '@opentui/react';
import { theme } from './theme.js';
import { computeAnalytics } from '../core/analytics.js';

function fmtCost(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'domains', label: 'Domains' },
  { id: 'models', label: 'Models' },
  { id: 'errors', label: 'Errors' },
  { id: 'projects', label: 'Projects' },
  { id: 'recent', label: 'Recent' },
];

export function AnalyticsPanel({ width = 52, height = 24, onBack = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    computeAnalytics().then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useKeyboard((key) => {
    if (key.name === 'escape') {
      if (searchQuery) setSearchQuery('');
      else onBack?.();
      return;
    }
    if (key.name === 'left') {
      setTab((t) => TABS[(TABS.findIndex((x) => x.id === t) - 1 + TABS.length) % TABS.length]);
    }
    if (key.name === 'right') {
      setTab((t) => TABS[(TABS.findIndex((x) => x.id === t) + 1) % TABS.length]);
    }
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setSearchQuery((q) => q + input);
    }
    if (key.name === 'backspace') {
      setSearchQuery((q) => q.slice(0, -1));
    }
  });

  const renderOverview = () => {
    if (!data) return null;
    return (
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1} overflow="hidden">
        <box flexDirection="row" marginTop={1} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Build Success Rate</text>
        </box>
        <box flexDirection="row" alignItems="center" marginBottom={1}>
          <text fg={theme.green}>{'\u2588'.repeat(Math.round(data.successRate / 10))}</text>
          <text fg={theme.divider}>{'\u2591'.repeat(10 - Math.round(data.successRate / 10))}</text>
          <text fg={theme.dim}>{' '}{data.successRate}% ({data.successfulBuilds}/{data.totalBuilds})</text>
        </box>

        <box flexDirection="row" flexWrap="wrap">
          <box flexDirection="column" marginRight={4} marginBottom={1}>
            <text fg={theme.dim}>Total builds</text>
            <text fg={theme.textBright}>{data.totalBuilds}</text>
          </box>
          <box flexDirection="column" marginRight={4} marginBottom={1}>
            <text fg={theme.dim}>Avg duration</text>
            <text fg={theme.textBright}>{fmtDuration(data.avgBuildTime)}</text>
          </box>
          <box flexDirection="column" marginRight={4} marginBottom={1}>
            <text fg={theme.dim}>Total cost</text>
            <text fg={theme.green}>{fmtCost(data.totalCost)}</text>
          </box>
          <box flexDirection="column" marginRight={4} marginBottom={1}>
            <text fg={theme.dim}>Todo success</text>
            <text fg={theme.textBright}>{data.todoSuccessRate}%</text>
          </box>
          <box flexDirection="column" marginBottom={1}>
            <text fg={theme.dim}>Health score</text>
            <text fg={data.healthScore >= 80 ? theme.green : data.healthScore >= 50 ? theme.amber : theme.red}>{data.healthScore}/100</text>
          </box>
        </box>

        <box flexDirection="row" marginTop={1} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Daily Trend (last 7 days)</text>
        </box>
        <box flexDirection="column" paddingLeft={1}>
          {data.trend.map((d) => {
            const maxCost = Math.max(...data.trend.map((t) => t.cost || 1));
            const barPct = d.builds > 0 ? (d.cost / maxCost) * 100 : 0;
            const barCells = Math.max(1, Math.round(barPct / 5));
            return (
              <box key={d.day} flexDirection="row" alignItems="center" marginBottom={0} paddingTop={0} paddingBottom={0}>
                <text fg={theme.muted}>{d.day.slice(5)}</text>
                <text fg={theme.dim}>{' '}</text>
                <text fg={theme.blue}>{'\u2588'.repeat(barCells)}</text>
                <text fg={theme.divider}>{'\u2591'.repeat(20 - barCells)}</text>
                <text fg={theme.dim}>{' '}{d.builds}b {'\u2502'} {fmtCost(d.cost)} {'\u2502'} avg {fmtDuration(d.avgDuration)}</text>
              </box>
            );
          })}
        </box>
      </box>
    );
  };

  const renderModels = () => {
    if (!data) return null;
    return (
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1} overflow="hidden">
        <box flexDirection="row" marginTop={1} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Top Models by Usage</text>
        </box>
        <box flexDirection="column" paddingLeft={1}>
          {data.topModels.map((m, i) => (
            <box key={m.model} flexDirection="row" alignItems="center" marginBottom={0} paddingTop={0} paddingBottom={0}>
              <text fg={theme.muted}>{`${i + 1}.`}</text>
              <text fg={theme.blue}>{' '}{String(m.model).split(':').pop().slice(0, 24)}</text>
              <text fg={theme.dim}>{' ['}{m.domain}{'] '} </text>
              <text fg={theme.green}>{'#'.repeat(m.count)}</text>
              <text fg={theme.dim}> {' '}{m.count}x</text>
            </box>
          ))}
          {data.topModels.length === 0 && (
            <text fg={theme.muted}>No model usage data yet</text>
          )}
        </box>
      </box>
    );
  };

  const renderDomains = () => {
    if (!data) return null;
    return (
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1} overflow="hidden">
        <box flexDirection="row" marginTop={1} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Domain Breakdown </text>
          <text fg={theme.dim}>({data.domainBreakdown?.length || 0} domains)</text>
        </box>
        <box flexDirection="column" paddingLeft={1}>
          {data.domainBreakdown?.map((d) => {
            const barLen = Math.round(d.successRate / 10);
            const color = d.successRate >= 80 ? theme.green : d.successRate >= 50 ? theme.amber : theme.red;
            return (
              <box key={d.domain} flexDirection="column" marginBottom={1}>
                <box flexDirection="row" alignItems="center">
                  <text fg={theme.dim}>{String(d.domain).padEnd(14)}</text>
                  <text fg={color}>{'\u2588'.repeat(barLen)}</text>
                  <text fg={theme.divider}>{'\u2591'.repeat(10 - barLen)}</text>
                  <text fg={theme.dim}>{' '}{d.successRate}% {'\u2502'} {d.done}/{d.total}</text>
                  {d.failed > 0 && <text fg={theme.red}>{' \u2717' + d.failed}</text>}
                </box>
              </box>
            );
          })}
          {(!data.domainBreakdown || data.domainBreakdown.length === 0) && (
            <text fg={theme.muted}>No domain data yet</text>
          )}
        </box>

        <box flexDirection="row" marginTop={2} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Throughput (builds/day)</text>
        </box>
          <box flexDirection="column" paddingLeft={1}>
            {data.throughput?.map((t) => {
            const maxBuilds = Math.max(...(data.throughput || [{ builds: 1 }]).map((x) => x.builds), 1);
            const barCells = Math.round((t.builds / maxBuilds) * 15);
            return (
              <box key={t.day} flexDirection="row" alignItems="center" marginBottom={0}>
                <text fg={theme.muted}>{t.day.slice(5)}</text>
                <text fg={theme.dim}>{' '}</text>
                <text fg={theme.blue}>{'\u2588'.repeat(barCells)}</text>
                <text fg={theme.divider}>{'\u2591'.repeat(15 - barCells)}</text>
                <text fg={theme.dim}>{' '}{t.builds}</text>
              </box>
            );
          })}
        </box>
      </box>
    );
  };

  const renderErrors = () => {
    if (!data) return null;
    return (
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1} overflow="hidden">
        <box flexDirection="row" marginTop={1} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Error Patterns </text>
          <text fg={theme.dim}>({data.errorPatterns?.length || 0} unique)</text>
        </box>
        <scrollbox
          flexGrow={1}
          scrollY
          scrollX={false}
          rootOptions={{ flexDirection: 'column', width: width - 2 }}
          viewportOptions={{ flexGrow: 1 }}
          scrollbarOptions={{ visible: true }}
        >
          <box flexDirection="column" paddingLeft={1} paddingRight={1} paddingTop={1}>
            {data.errorPatterns?.map((e, i) => (
              <box key={i} flexDirection="column" marginBottom={1} borderBottom={1} borderBottomColor={theme.divider}>
                <box flexDirection="row" alignItems="center">
                  <text fg={theme.muted}>{`${i + 1}.`}</text>
                  <text fg={theme.red}>{' '}</text>
                  <text fg={theme.text}>{String(e.pattern).slice(0, width - 20)}</text>
                  <text fg={theme.dim}>{' '}{e.count}x</text>
                </box>
                {e.domains.length > 0 && (
                  <text fg={theme.muted} paddingLeft={2}>domains: {e.domains.join(', ')}</text>
                )}
              </box>
            ))}
            {(!data.errorPatterns || data.errorPatterns.length === 0) && (
              <text fg={theme.muted}>No error patterns recorded</text>
            )}
          </box>
        </scrollbox>
      </box>
    );
  };

  const renderProjects = () => {
    if (!data) return null;
    return (
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1} overflow="hidden">
        <box flexDirection="row" marginTop={1} marginBottom={1}>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Projects by Cost</text>
        </box>
        <box flexDirection="column" paddingLeft={1}>
          {data.topProjects.map((p) => (
            <box key={p.name} flexDirection="row" alignItems="center" marginBottom={0} paddingTop={0} paddingBottom={0}>
              <text fg={theme.dim}>{String(p.name).slice(0, 20).padEnd(20)}</text>
              <text fg={theme.dim}>{' '}{p.builds}b </text>
              <text fg={theme.green}>{fmtCost(p.cost)}</text>
              <text fg={theme.dim}>{'  \u2502  '}{fmtDate(p.lastBuild)}</text>
            </box>
          ))}
          {data.topProjects.length === 0 && (
            <text fg={theme.muted}>No project data yet</text>
          )}
        </box>
      </box>
    );
  };

  const renderRecent = () => {
    if (!data) return null;
    const filtered = searchQuery
      ? data.recentBuilds.filter((b) =>
          b.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.startedAt.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : data.recentBuilds;
    return (
      <box flexDirection="column" flexGrow={1}>
        <box
          marginTop={1}
          flexDirection="row"
          backgroundColor={theme.surface}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg={theme.accent}>{'\u25b0'} </text>
          <text fg={theme.dim}>search </text>
          <text fg={theme.textBright}>{searchQuery || <span fg={theme.muted}>project name / status</span>}</text>
          <text fg={theme.dim}>{'  (esc to clear) '}</text>
          <text fg={theme.muted}>{filtered.length}/{data.recentBuilds.length}</text>
        </box>
        <scrollbox
          flexGrow={1}
          scrollY
          scrollX={false}
          rootOptions={{ flexGrow: 1, flexDirection: 'column', width: width - 2 }}
          viewportOptions={{ flexGrow: 1 }}
          scrollbarOptions={{ visible: true }}
        >
          <box flexDirection="column" paddingLeft={1} paddingRight={1} paddingTop={1}>
            {filtered.map((b) => {
            const statusLabel = b.status === 'completed' ? 'done' : 'issues';
            return (
              <box key={b.id} flexDirection="column" marginBottom={1} borderBottom={1} borderBottomColor={theme.divider}>
                <box flexDirection="row" alignItems="center">
                  <text fg={theme.green}>{'\u2713'}</text>
                  <text fg={theme.textBright} attributes={TextAttributes.BOLD}>{' '}{b.projectName}</text>
                  <text fg={theme.dim}>{' '}{'\u2502'}{' '}{b.done}/{b.total} todos{' '}{'\u2502'}{' '}{fmtCost(b.cost)}</text>
                  <text fg={theme.dim}>{' '}{'\u2502'}{' '}{fmtDuration(b.duration)}</text>
                  <box flexGrow={1} />
                  <text fg={theme.amber}>{' '}{statusLabel}</text>
                </box>
                <text fg={theme.muted} paddingLeft={1}>{fmtDate(b.startedAt)}</text>
              </box>
            );
          })}
          {data.recentBuilds.length === 0 && (
            <text fg={theme.muted}>No build history yet</text>
          )}
        </box>
      </scrollbox>
      </box>
    );
  };

  return (
    <box
      position="absolute"
      width={width}
      height={height}
      flexDirection="column"
      backgroundColor={theme.panel}
      borderStyle="single"
      border
      borderColor={theme.accent}
      flexShrink={0}
    >
      <box flexDirection="row" paddingBottom={1} borderStyle="single" border={['bottom']} borderColor={theme.divider} justifyContent="space-between">
        <text fg={theme.textBright} attributes={TextAttributes.BOLD}> Analytics </text>
        <text fg={theme.muted}>esc close</text>
      </box>

      {/* Tab strip */}
      <box flexDirection="row" flexShrink={0} paddingLeft={1} paddingBottom={1} borderBottom={1} borderBottomColor={theme.divider}>
        {TABS.map((t) => (
          <box
            key={t.id}
            marginRight={2}
            borderBottom={tab === t.id ? ['bottom'] : undefined}
            borderBottomColor={tab === t.id ? theme.accent : undefined}
            onMouseDown={() => setTab(t.id)}
          >
            <text fg={tab === t.id ? theme.textBright : theme.muted} attributes={tab === t.id ? { BOLD: true } : 0}>
              {t.label}
            </text>
          </box>
        ))}
      </box>

      {loading ? (
        <box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <text fg={theme.dim}>Loading analytics\u2026</text>
        </box>
      ) : (
        <>
          {tab === 'overview' && renderOverview()}
          {tab === 'domains' && renderDomains()}
          {tab === 'models' && renderModels()}
          {tab === 'errors' && renderErrors()}
          {tab === 'projects' && renderProjects()}
          {tab === 'recent' && renderRecent()}
        </>
      )}

      <box flexDirection="row" paddingTop={1} borderStyle="single" border={['top']} borderColor={theme.divider}>
        <text fg={theme.muted}>esc close \u00b7 tab switch</text>
      </box>
    </box>
  );
}
