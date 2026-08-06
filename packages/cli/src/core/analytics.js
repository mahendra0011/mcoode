import { listHistory } from './history.js';
import { cache } from './cache.js';

/** Aggregate build metrics from persisted session history.
 * Results are cached for 60s to avoid re-reading all history files. */
export async function computeAnalytics() {
  return cache.wrap('analytics', async () => {
    const history = await listHistory();
    const builds = history.filter((h) => h.mode === 'god' || h.mode === 'run');

  let totalBuilds = 0;
  let successfulBuilds = 0;
  let totalCost = 0;
  let totalDuration = 0;
  let totalTodos = 0;
  let doneTodos = 0;
  let failedTodos = 0;
  const projectStats = new Map();
  const modelUsage = new Map();
  const dailyBuilds = new Map();

  for (const entry of builds) {
    totalBuilds++;
    const data = entry.results || entry;
    const duration = data.elapsedSecs || 0;
    totalDuration += duration;
    totalCost += Number(data.cost || 0);
    totalTodos += data.total || 0;
    doneTodos += data.done || 0;
    failedTodos += data.failed || 0;

    if (!data.failed || data.failed === 0) {
      successfulBuilds++;
    }

    // Project stats
    const projName = entry.projectName || 'unknown';
    if (!projectStats.has(projName)) {
      projectStats.set(projName, { builds: 0, cost: 0, lastBuild: null });
    }
    const ps = projectStats.get(projName);
    ps.builds++;
    ps.cost += Number(data.cost || 0);
    ps.lastBuild = entry.completedAt || entry.startedAt;

    // Model usage
    if (data.models && Array.isArray(data.models)) {
      for (const m of data.models) {
        const key = String(m.model || 'unknown');
        if (!modelUsage.has(key)) {
          modelUsage.set(key, { domain: m.domain, count: 0 });
        }
        modelUsage.get(key).count += m.count || 1;
      }
    }

    // Daily builds (for trend)
    const day = new Date(entry.startedAt || Date.now()).toISOString().slice(0, 10);
    const dayEntry = dailyBuilds.get(day) || { builds: 0, cost: 0, duration: 0 };
    dayEntry.builds++;
    dayEntry.cost += Number(data.cost || 0);
    dayEntry.duration += duration;
    dailyBuilds.set(day, dayEntry);
  }

  const avgBuildTime = totalBuilds > 0 ? Math.round(totalDuration / totalBuilds) : 0;
  const successRate = totalBuilds > 0 ? Math.round((successfulBuilds / totalBuilds) * 100) : 0;
  const todoSuccessRate = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

  // Sort model usage by count descending
  const topModels = [...modelUsage.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([model, info]) => ({ model, domain: info.domain, count: info.count }));

  // Sort projects by cost descending
  const topProjects = [...projectStats.entries()]
    .sort((a, b) => b[1].cost - a[1].cost)
    .map(([name, stats]) => ({ name, builds: stats.builds, cost: Number(stats.cost.toFixed(2)), lastBuild: stats.lastBuild }));

  // Daily trend (last 7 days)
  const trend = [...dailyBuilds.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .reverse()
    .map(([day, stats]) => ({ day, builds: stats.builds, cost: Number(stats.cost.toFixed(2)), avgDuration: Math.round(stats.duration / stats.builds) || 0 }));

  // Recent builds
  const recentBuilds = builds
    .slice(0, 10)
    .map((entry) => {
      const data = entry.results || entry;
      const startedAt = entry.startedAt || '';
      const completedAt = entry.completedAt || '';
      let status = 'completed';
      if ((data.failed || 0) > 0) status = 'issues';
      return {
        id: entry.id,
        projectName: entry.projectName || 'unknown',
        startedAt,
        completedAt,
        duration: data.elapsedSecs || 0,
        cost: Number(data.cost || 0),
        total: data.total || 0,
        done: data.done || 0,
        failed: data.failed || 0,
        status,
      };
    });

  // Domain breakdown: count todos per domain
  const domainStats = new Map();
  for (const entry of builds) {
    const plan = entry.plan;
    if (!plan?.todos) continue;
    for (const t of plan.todos) {
      const key = t.domain || 'unknown';
      const stat = domainStats.get(key) || { total: 0, done: 0, failed: 0, needsReview: 0 };
      stat.total++;
      const result = entry.results?.[t.id] || entry.results?.results?.find((r) => r.id === t.id);
      const status = result?.status || 'pending';
      if (status === 'done') stat.done++;
      else if (status === 'failed') stat.failed++;
      else if (status === 'needs_review') stat.needsReview++;
      domainStats.set(key, stat);
    }
  }
  const domainBreakdown = [...domainStats.entries()].map(([domain, s]) => ({
    domain,
    total: s.total,
    done: s.done,
    failed: s.failed,
    needsReview: s.needsReview,
    successRate: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
  }));

  // Error patterns: collect failed todo errors
  const errorPatterns = new Map();
  for (const entry of builds) {
    const results = entry.results?.results || [];
    for (const r of results) {
      if (r.status === 'failed' && r.error) {
        // Normalize: take first line as the pattern
        const pattern = String(r.error).slice(0, 80);
        const stat = errorPatterns.get(pattern) || { count: 0, domains: new Set() };
        stat.count++;
        if (r.domain) stat.domains.add(r.domain);
        errorPatterns.set(pattern, stat);
      }
    }
  }
  const errorStats = [...errorPatterns.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([pattern, stat]) => ({ pattern, count: stat.count, domains: [...stat.domains] }));

  // Project health score: composite of success rate, todo rate, cost efficiency
  const healthScore = totalBuilds > 0
    ? Math.round(
      (successRate * 0.4) +
      (todoSuccessRate * 0.4) +
      (Math.min(100, 100 - (totalCost / Math.max(1, totalBuilds))) * 0.2)
    )
    : 0;

  // Throughput: builds per day
  const buildsByDay = new Map();
  for (const entry of builds) {
    const day = new Date(entry.startedAt || Date.now()).toISOString().slice(0, 10);
    buildsByDay.set(day, (buildsByDay.get(day) || 0) + 1);
  }
  const throughput = [...buildsByDay.entries()]
    .map(([day, count]) => ({ day, builds: count }))
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .reverse();

  return {
    totalBuilds,
    successfulBuilds,
    successRate,
    avgBuildTime,
    totalCost,
    totalTodos,
    doneTodos,
    failedTodos,
    todoSuccessRate,
    healthScore,
    topModels,
    domainBreakdown,
    errorPatterns: errorStats,
    throughput,
    topProjects,
    trend,
    recentBuilds,
  };
  });
}
