/**
 * Job queue — BullMQ (Redis) only.
 *
 * Production-grade: requires Redis for background job processing.
 * There is NO in-memory queue fallback — if Redis is unavailable,
 * background jobs (e.g. build notifications) will not be processed.
 *
 * This mirrors the mediCore reference: fail hard on missing infrastructure.
 */
let mode = 'disabled';
let queueImpl = null;

export async function connectQueue(redisClient) {
  if (!redisClient) {
    console.warn('[queue] ⚠️  Redis not configured — background jobs disabled.');
    console.warn('[queue]    Set REDIS_URI to enable job queuing (BullMQ).');
    mode = 'disabled';
    return { mode, connected: false };
  }

  try {
    const { Queue, Worker } = await import('bullmq');
    queueImpl = { Queue, Worker, client: redisClient };
    mode = 'redis';
    return { mode, connected: true };
  } catch (err) {
    console.error('[queue] ❌ Failed to load BullMQ:', err.message);
    console.error('[queue]    Install dependency: npm i bullmq');
    mode = 'disabled';
    return { mode, connected: false };
  }
}

export function jobQueue(name = 'subagents') {
  if (mode === 'redis' && queueImpl) {
    return new queueImpl.Queue(name, { connection: queueImpl.client });
  }
  // Return a no-op queue — jobs are silently dropped.
  // This is intentional: no in-memory job queue to prevent data loss confusion.
  return {
    mode: 'disabled',
    async add() {
      console.warn(`[queue] Job not queued (Redis unavailable) — ${name}`);
      return null;
    },
    async process() {
      console.warn(`[queue] Cannot process jobs (Redis unavailable) — ${name}`);
    }
  };
}

export async function startWorker(name, handler) {
  if (mode === 'redis' && queueImpl) {
    const worker = new queueImpl.Worker(name, handler, { connection: queueImpl.client });
    return worker;
  }
  console.warn(`[queue] Worker not started for "${name}" — Redis unavailable`);
  return { mode: 'disabled', close: async () => {} };
}
