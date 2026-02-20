/**
 * Permission Middleware
 * API route protection middleware for Next.js API routes
 *
 * Decodes the Supabase JWT locally instead of calling supabase.auth.getUser()
 * because getUser() hits GoTrue's /user endpoint which does session-based
 * validation. If the session was refreshed, GoTrue returns 403
 * "session_not_found" even though the JWT is still valid. Local decode avoids
 * this and is faster (no network round-trip).
 */

import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { checkPermission, checkAnyPermission, checkAllPermissions } from './service';
import { PermissionKey } from './constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';

type PermissionCheck = PermissionKey | PermissionKey[];

/**
 * Check if the user has a Levelset Admin app_user record in any org.
 * Cached per-request via a simple in-memory map keyed by auth_user_id.
 */
const adminCache = new Map<string, boolean>();
const ADMIN_CACHE_TTL = 5 * 60 * 1000;
const adminCacheTimestamps = new Map<string, number>();

async function isLevelsetAdmin(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  authUserId: string
): Promise<boolean> {
  const cached = adminCache.get(authUserId);
  const ts = adminCacheTimestamps.get(authUserId);
  if (cached !== undefined && ts && Date.now() - ts < ADMIN_CACHE_TTL) {
    return cached;
  }

  const { count } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('auth_user_id', authUserId)
    .eq('role', 'Levelset Admin');

  const result = (count ?? 0) > 0;
  adminCache.set(authUserId, result);
  adminCacheTimestamps.set(authUserId, Date.now());
  return result;
}

/**
 * Decode a Supabase JWT and extract the user ID (sub claim).
 * Returns null if the token is malformed or expired.
 */
function decodeJwt(token: string): { sub: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

/**
 * API middleware to require specific permission(s)
 *
 * Usage:
 *   export default withPermission(P.ROSTER_EDIT_ROLES, handler);
 *   export default withPermission([P.ROSTER_VIEW, P.ROSTER_EDIT_FOH_BOH], handler, 'any');
 */
export function withPermission(
  permission: PermissionCheck,
  handler: NextApiHandler,
  mode: 'all' | 'any' = 'all'
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decoded = decodeJwt(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = decoded.sub;
      const supabase = createServerSupabaseClient();

      // Get org_id from request (body, query, or header)
      let orgId =
        req.body?.org_id ||
        req.query?.org_id ||
        req.headers['x-org-id'] ||
        req.body?.orgId ||
        req.query?.orgId;

      // If no org_id, try to resolve from location_id
      if (!orgId) {
        const locationId = req.body?.location_id || req.query?.location_id;
        if (locationId) {
          const { data: location } = await supabase
            .from('locations')
            .select('org_id')
            .eq('id', locationId)
            .single();
          if (location) {
            orgId = location.org_id;
          }
        }
      }

      if (!orgId) {
        return res.status(400).json({ error: 'org_id or location_id required' });
      }

      // Levelset Admin bypasses all permission checks
      if (await isLevelsetAdmin(supabase, userId)) {
        return handler(req, res);
      }

      // Check permission(s)
      const permissions = Array.isArray(permission) ? permission : [permission];
      let hasPermission: boolean;

      if (permissions.length === 1) {
        hasPermission = await checkPermission(supabase, userId, orgId as string, permissions[0]);
      } else if (mode === 'any') {
        hasPermission = await checkAnyPermission(supabase, userId, orgId as string, permissions);
      } else {
        hasPermission = await checkAllPermissions(supabase, userId, orgId as string, permissions);
      }

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Permission granted - continue to handler
      return handler(req, res);
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Helper type for handlers that receive the authenticated user
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email?: string;
  };
  orgId?: string;
}

/**
 * Extended middleware that also provides user and org info to the handler
 */
export function withPermissionAndContext(
  permission: PermissionCheck,
  handler: (
    req: AuthenticatedRequest,
    res: NextApiResponse,
    context: { userId: string; orgId: string }
  ) => Promise<void> | void,
  mode: 'all' | 'any' = 'all'
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decoded = decodeJwt(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = decoded.sub;
      const supabase = createServerSupabaseClient();

      // Get org_id from request (body, query, or header)
      let orgId =
        req.body?.org_id ||
        req.query?.org_id ||
        req.headers['x-org-id'] ||
        req.body?.orgId ||
        req.query?.orgId;

      // If no org_id, try to resolve from location_id
      if (!orgId) {
        const locationId = req.body?.location_id || req.query?.location_id;
        if (locationId) {
          const { data: location } = await supabase
            .from('locations')
            .select('org_id')
            .eq('id', locationId)
            .single();
          if (location) {
            orgId = location.org_id;
          }
        }
      }

      if (!orgId) {
        return res.status(400).json({ error: 'org_id or location_id required' });
      }

      // Levelset Admin bypasses all permission checks
      if (await isLevelsetAdmin(supabase, userId)) {
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = { id: userId };
        authenticatedReq.orgId = orgId as string;
        return handler(authenticatedReq, res, { userId, orgId: orgId as string });
      }

      // Check permission(s)
      const permissions = Array.isArray(permission) ? permission : [permission];
      let hasPermission: boolean;

      if (permissions.length === 1) {
        hasPermission = await checkPermission(supabase, userId, orgId as string, permissions[0]);
      } else if (mode === 'any') {
        hasPermission = await checkAnyPermission(supabase, userId, orgId as string, permissions);
      } else {
        hasPermission = await checkAllPermissions(supabase, userId, orgId as string, permissions);
      }

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Add user and org to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = { id: userId };
      authenticatedReq.orgId = orgId as string;

      // Permission granted - continue to handler with context
      return handler(authenticatedReq, res, { userId, orgId: orgId as string });
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
