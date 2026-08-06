/** Simple in-memory cache with TTL support. */
export class Cache {
  constructor(defaultTtlSec = 300) {
    this.defaultTtlSec = defaultTtlSec;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.exp) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSec = this.defaultTtlSec) {
    this.store.set(key, { value, exp: Date.now() + ttlSec * 1000 });
  }

  del(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  /** Wrap an async function with caching. */
  async wrap(key, fn, ttlSec = this.defaultTtlSec) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const result = await fn();
    this.set(key, result, ttlSec);
    return result;
  }
}

// Shared singleton instance
export const cache = new Cache(60);
