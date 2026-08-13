/**
 * Cache adapter — Redis (ioredis) only.
 *
 * Production-grade: if Redis is not configured or unreachable, the cache
 * operates in a pass-through mode (no-op cache). There is NO in-memory
 * fallback — Redis must be provisioned externally.
 *
 * This mirrors the mediCore reference project: fail gracefully but
 * transparently, let Redis be the single source of truth for cache.
 */
import Redis from 'ioredis';

let client = null;
let mode = 'passthrough'; // 'redis' or 'passthrough'

export async function connectRedis(uri) {
  if (!uri) {
    console.warn('[cache] ⚠️  REDIS_URI not set — running in pass-through (no cache) mode.');
    mode = 'passthrough';
    return { mode, connected: false };
  }

  try {
    const redis = new Redis(uri, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 5) return null; // stop retrying after 5 attempts
        return Math.min(times * 100, 3000);
      }
    });

    redis.on('error', (err) => {
      console.error('[cache] Redis error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[cache] ✅ Connected to Redis');
    });

    redis.on('reconnecting', () => {
      console.warn('[cache] ⚠️  Redis reconnecting...');
    });

    await redis.connect();
    client = redis;
    mode = 'redis';
    return { mode, connected: true };
  } catch (err) {
    console.error('[cache] ❌ Redis connection failed:', err.message);
    console.error('[cache]    Running in pass-through mode — caching disabled.');
    mode = 'passthrough';
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

  // Pass-through cache: no storage, just logs that cache is inactive.
  // This is NOT a memory cache — data is not persisted.
  // If you need caching, provision Redis.
  console.warn('[cache] pass-through mode — no caching active. Configure REDIS_URI for caching.');
  return {
    mode,
    async get() { return null; },
    async set() { /* no-op */ },
    async del() { /* no-op */ },
    async incr() { return 0; }
  };
}
