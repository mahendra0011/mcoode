/**
 * Job queue — BullMQ when Redis is available, otherwise a tiny in-process
 * queue with the same interface so web-triggered builds still run.
 */
let mode = 'memory';
let queueImpl = null;

export async function connectQueue(redisClient) {
  if (redisClient) {
    try {
      const { Queue, Worker } = await import('bullmq');
      queueImpl = { Queue, Worker, client: redisClient };
      mode = 'redis';
    } catch {
      mode = 'memory';
    }
  } else {
    mode = 'memory';
  }
  return mode;
}

export function jobQueue(name = 'subagents') {
  if (mode === 'redis' && queueImpl) {
    return new queueImpl.Queue(name, { connection: queueImpl.client });
  }
  const handlers = new Map();
  return {
    mode: 'memory',
    async add(jobName, data) {
      const fn = handlers.get(jobName);
      const payload = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, jobName, data };
      setImmediate(async () => {
        try {
          if (fn) await fn(payload);
        } catch (err) {
          console.error('[queue:error]', err.message);
        }
      });
      return payload;
    },
    async process(jobName, fn) {
      handlers.set(jobName, fn);
    }
  };
}

export async function startWorker(name, handler) {
  if (mode === 'redis' && queueImpl) {
    const worker = new queueImpl.Worker(name, handler, { connection: queueImpl.client });
    return worker;
  }
  return { mode: 'memory', close: async () => {} };
}
