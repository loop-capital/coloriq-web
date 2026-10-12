/**
 * Redis Helper — ColorIq
 * 
 * Production: Set REDIS_URL env var to your Redis connection string.
 * Development: Falls back to in-memory cache (no Redis required locally).
 */

interface CacheEntry {
  value: unknown
  expiresAt: number | null
}

class MemoryCache {
  private store = new Map<string, CacheEntry>()

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return JSON.stringify(entry.value)
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching: only supports trailing wildcards
    const prefix = pattern.replace('*', '')
    const result: string[] = []
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) result.push(key)
    }
    return result
  }
}

// Singleton instances
let redisClient: MemoryCache | null = null

function getClient(): MemoryCache {
  if (!redisClient) {
    redisClient = new MemoryCache()
  }
  return redisClient
}

/**
 * Get a cached value by key.
 * Returns parsed JSON or null if not found/expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient()
  const raw = await client.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Set a cached value with optional TTL in seconds.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = getClient()
  await client.set(key, value, ttlSeconds)
}

/**
 * Delete a cached value.
 */
export async function cacheDel(key: string): Promise<void> {
  const client = getClient()
  await client.del(key)
}

/**
 * Delete all keys matching a pattern (prefix*).
 */
export async function cacheClearPattern(pattern: string): Promise<void> {
  const client = getClient()
  const keys = await client.keys(pattern)
  for (const key of keys) {
    await client.del(key)
  }
}

/**
 * Cache keys used across the application.
 */
export const CACHE_KEYS = {
  TRENDING_FEED: 'trending:feed',
  TRENDING_SEASONAL: 'trending:seasonal',
  GALLERY_PUBLIC: 'gallery:public',
  GALLERY_STYLIST: (id: string) => `gallery:stylist:${id}`,
  MARKETPLACE_BROWSE: 'marketplace:browse',
  COMMUNITY_FEED: 'community:feed',
  STYLIST_STATS: (id: string) => `stats:stylist:${id}`,
} as const

/**
 * Default TTL values (in seconds).
 */
export const CACHE_TTL = {
  TRENDING: 15 * 60,     // 15 min — matches trending algorithm refresh
  GALLERY: 10 * 60,      // 10 min
  MARKETPLACE: 5 * 60,   // 5 min — prices change
  COMMUNITY: 2 * 60,     // 2 min — fresh content
  STATS: 30 * 60,        // 30 min
} as const

/**
 * TODO: Replace MemoryCache with real Redis client in production.
 * 
 * Install: npm install ioredis
 * 
 * Example production setup:
 * ```typescript
 * import Redis from 'ioredis'
 * 
 * const redis = new Redis(process.env.REDIS_URL!, {
 *   maxRetriesPerRequest: 3,
 *   retryStrategy: (times) => Math.min(times * 200, 2000),
 * })
 * 
 * export async function cacheGet<T>(key: string): Promise<T | null> {
 *   const raw = await redis.get(key)
 *   if (!raw) return null
 *   return JSON.parse(raw) as T
 * }
 * 
 * export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
 *   const serialized = JSON.stringify(value)
 *   if (ttlSeconds) {
 *     await redis.setex(key, ttlSeconds, serialized)
 *   } else {
 *     await redis.set(key, serialized)
 *   }
 * }
 * ```
 */