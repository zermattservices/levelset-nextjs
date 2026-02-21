/**
 * TenantCache — org-scoped in-memory cache with TTL.
 *
 * Designed for long-running Fly.io process. Stores data keyed by
 * orgId + cacheKey with configurable TTL per entry. Auto-cleanup
 * runs every 5 minutes to evict expired entries.
 *
 * Future: This cache will serve as the source data layer for
 * pgvector embeddings (Phase 3 RAG). When embeddings.ts is added,
 * it will read from TenantCache to avoid double-fetching.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

/** Predefined TTL tiers (in milliseconds) */
export const CacheTTL = {
  /** Org config: roles, positions, rubrics, features (10 min) */
  ORG_CONFIG: 10 * 60 * 1000,
  /** Team data: employee list, team overview (5 min) */
  TEAM: 5 * 60 * 1000,
  /** Individual profiles (5 min) */
  PROFILE: 5 * 60 * 1000,
  /** Dynamic data: ratings, infractions (2 min) */
  DYNAMIC: 2 * 60 * 1000,
} as const;

/** Cache invalidation scopes (used by the invalidation endpoint) */
export type CacheScope = 'team' | 'ratings' | 'infractions' | 'org_config' | 'all';

/** Scope → key prefix mapping for targeted invalidation */
const SCOPE_PREFIXES: Record<CacheScope, string[]> = {
  team: ['employees:', 'team:', 'profile:'],
  ratings: ['ratings:', 'rankings:', 'profile:'],
  infractions: ['infractions:', 'discipline:', 'profile:'],
  org_config: ['org_context:'],
  all: [], // special: clears everything
};

// ---------------------------------------------------------------------------
// TenantCache
// ---------------------------------------------------------------------------

class TenantCache {
  /** Map<orgId, Map<cacheKey, CacheEntry>> */
  private store = new Map<string, Map<string, CacheEntry>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  /** Stats for logging */
  private stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };

  constructor() {
    // Auto-cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   */
  get<T>(orgId: string, key: string): T | undefined {
    const orgCache = this.store.get(orgId);
    if (!orgCache) {
      this.stats.misses++;
      return undefined;
    }

    const entry = orgCache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      orgCache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Store a value with TTL.
   */
  set<T>(orgId: string, key: string, data: T, ttlMs: number): void {
    let orgCache = this.store.get(orgId);
    if (!orgCache) {
      orgCache = new Map();
      this.store.set(orgId, orgCache);
    }

    orgCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
    this.stats.sets++;
  }

  /**
   * Get or fetch: returns cached value if available, otherwise calls
   * the fetcher function, caches the result, and returns it.
   */
  async getOrFetch<T>(
    orgId: string,
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(orgId, key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    this.set(orgId, key, data, ttlMs);
    return data;
  }

  /**
   * Invalidate cache entries.
   * - If no key: clears all entries for the org
   * - If key provided: clears that specific entry
   */
  invalidate(orgId: string, key?: string): void {
    if (!key) {
      this.store.delete(orgId);
      return;
    }

    const orgCache = this.store.get(orgId);
    if (orgCache) {
      orgCache.delete(key);
    }
  }

  /**
   * Invalidate by scope — clears all entries matching the scope's
   * key prefixes. Used by the cache invalidation endpoint.
   */
  invalidateByScope(orgId: string, scope: CacheScope): void {
    if (scope === 'all') {
      this.store.delete(orgId);
      return;
    }

    const orgCache = this.store.get(orgId);
    if (!orgCache) return;

    const prefixes = SCOPE_PREFIXES[scope];
    for (const key of orgCache.keys()) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        orgCache.delete(key);
      }
    }
  }

  /**
   * Remove all expired entries across all orgs.
   */
  cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [orgId, orgCache] of this.store) {
      for (const [key, entry] of orgCache) {
        if (now > entry.expiresAt) {
          orgCache.delete(key);
          evicted++;
        }
      }
      // Remove empty org maps
      if (orgCache.size === 0) {
        this.store.delete(orgId);
      }
    }

    this.stats.evictions += evicted;
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats() {
    let totalEntries = 0;
    for (const orgCache of this.store.values()) {
      totalEntries += orgCache.size;
    }

    return {
      ...this.stats,
      totalOrgs: this.store.size,
      totalEntries,
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
          : 0,
    };
  }

  /**
   * Shutdown: clear the cleanup interval.
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Global tenant cache instance (lives for the lifetime of the Fly.io process) */
export const tenantCache = new TenantCache();
