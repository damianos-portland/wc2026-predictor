// Pluggable cache so live scraping is rate-limited and cached.
// Default: in-memory TTL cache (works everywhere, zero deps).
// Swap `cache` for a SQLite/Postgres-backed store in production — see README.

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

class MemoryCache implements CacheStore {
  private store = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }
}

export const cache: CacheStore = new MemoryCache();

/** cache-through helper */
export async function cached<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await produce();
  await cache.set(key, value, ttlMs);
  return value;
}
