/**
 * Cache management routes.
 *
 * POST /api/cache/invalidate — clear cached data for an org.
 * GET  /api/cache/stats     — view cache hit/miss statistics.
 *
 * Both endpoints require Levelset Admin auth (via authMiddleware on /api/*).
 */

import { Hono } from 'hono';
import { tenantCache, type CacheScope } from '../lib/tenant-cache.js';

const cacheRoute = new Hono();

/**
 * POST /api/cache/invalidate
 * Body: { org_id: string, scope?: CacheScope }
 *
 * Clears cached data for the given org. Scope controls what's cleared:
 * - "team"       → employee lists, team overviews, profiles
 * - "ratings"    → rating queries, rankings, profiles
 * - "infractions"→ infraction queries, discipline summaries, profiles
 * - "org_config" → org context (roles, positions, rubrics)
 * - "all"        → everything for this org (default)
 */
cacheRoute.post('/invalidate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const orgId = body.org_id as string;
  const scope = (body.scope as CacheScope) || 'all';

  if (!orgId) {
    return c.json({ error: 'org_id is required' }, 400);
  }

  const validScopes: CacheScope[] = ['team', 'ratings', 'infractions', 'org_config', 'all'];
  if (!validScopes.includes(scope)) {
    return c.json({ error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` }, 400);
  }

  tenantCache.invalidateByScope(orgId, scope);

  return c.json({ ok: true, org_id: orgId, scope, message: `Cache invalidated for scope: ${scope}` });
});

/**
 * GET /api/cache/stats
 * Returns cache hit/miss statistics and entry counts.
 */
cacheRoute.get('/stats', (c) => {
  return c.json(tenantCache.getStats());
});

export { cacheRoute };
