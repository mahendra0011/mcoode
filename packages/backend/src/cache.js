/**
 * Cache adapter — Redis (ioredis) when available, in-memory Map fallback.
 */
import Redis from 'ioredis';

let client = null;
let mode = 'memory';

export async function connectRedis(uri) {
  if (!uri) {
    mode = 'memory';
    return { mode, connected: false };
  }
  try {
    const redis = new Redis(uri, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 2 ? null : 200)
    });
    await redis.connect();
    client = redis;
    mode = 'redis';
    return { mode, connected: true };
  } catch {
    mode = 'memory';
    return { mode, connected: false };
  }
}

export function cache() {
  if (mode === 'redis' && client) {
    return {
      mode,
      async get(key) {
        const v = await client.get(key);
        return v == null ? null : JSON.parse(v);
      },
      async set(key, value, ttlSec = 300) {
        await client.set(key, JSON.stringify(value), 'EX', ttlSec);
      },
      async del(key) {
        await client.del(key);
      },
      async incr(key, ttlSec = 60) {
        const v = await client.incr(key);
        if (v === 1 && ttlSec) await client.expire(key, ttlSec);
        return v;
      }
    };
  }
  const store = new Map();
  return {
    mode,
    async get(key) {
      const hit = store.get(key);
      if (!hit) return null;
      if (hit.exp < Date.now()) {
        store.delete(key);
        return null;
      }
      return hit.value;
    },
    async set(key, value, ttlSec = 300) {
      store.set(key, { value, exp: Date.now() + ttlSec * 1000 });
    },
    async del(key) {
      store.delete(key);
    },
    async incr(key, ttlSec = 60) {
      const hit = store.get(key) || { value: 0, exp: Date.now() + ttlSec * 1000 };
      hit.value += 1;
      store.set(key, hit);
      return hit.value;
    }
  };
}
