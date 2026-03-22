/**
 * Permission Middleware
 * API route protection middleware for Next.js API routes
 *
 * Decodes the Supabase JWT locally instead of calling supabase.auth.getUser()
 * because getUser() hits GoTrue's /user endpoint which does session-based
 * validation. If the session was refreshed, GoTrue returns 403
 * "session_not_found" even though the JWT is still valid. Local decode avoids
 * this and is faster (no network round-trip).
 *
 * Tokens are extracted from the Authorization: Bearer header first, then
 * from the levelset-access-token cookie (set by AuthProvider for cross-domain auth).
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
 * Extract auth token from the request.
 * Checks three sources in order:
 *   1. Authorization: Bearer header (explicit, used by newer client code)
 *   2. levelset-access-token cookie (cross-domain on .levelset.io, production only)
 *   3. Supabase SSR auth cookies (sb-<ref>-auth-token, same-origin, works on localhost)
 *      These are base64url-encoded with a "base64-" prefix by @supabase/ssr
 */
function getAuthToken(req: NextApiRequest): string | null {
  // 1. Authorization: Bearer header
  const bearerToken = req.headers.authorization?.replace('Bearer ', '');
  if (bearerToken) return bearerToken;

  // 2. levelset-access-token cookie (works on *.levelset.io, not localhost)
  const cookieToken = req.cookies?.['levelset-access-token'];
  if (cookieToken) return cookieToken;

  // 3. Supabase SSR auth cookies (set by @supabase/ssr createBrowserClient)
  try {
    const cookies = req.cookies || {};
    const cookieNames = Object.keys(cookies);

    // Find the base cookie name: sb-<ref>-auth-token (non-chunked)
    const baseName = cookieNames.find(
      k => k.startsWith('sb-') && k.includes('-auth-token') && !k.includes('.')
    );

    let rawValue: string | null = null;

    if (baseName) {
      rawValue = cookies[baseName];
    } else {
      // Try chunked cookies: sb-<ref>-auth-token.0, .1, .2, ...
      const firstChunk = cookieNames.find(
        k => k.startsWith('sb-') && k.includes('-auth-token.')
      );
      if (firstChunk) {
        const prefix = firstChunk.substring(0, firstChunk.lastIndexOf('.'));
        const chunks = cookieNames
          .filter(k => k.startsWith(prefix + '.'))
          .sort((a, b) => {
            const numA = parseInt(a.substring(a.lastIndexOf('.') + 1) || '0');
            const numB = parseInt(b.substring(b.lastIndexOf('.') + 1) || '0');
            return numA - numB;
          })
          .map(k => cookies[k]);
        rawValue = chunks.join('');
      }
    }

    if (rawValue) {
      // @supabase/ssr base64url-encodes values with a "base64-" prefix
      let decoded = rawValue;
      if (rawValue.startsWith('base64-')) {
        decoded = Buffer.from(rawValue.substring(7), 'base64url').toString();
      }
      const session = JSON.parse(decoded);
      if (session?.access_token) return session.access_token;
    }
  } catch {
    // Failed to parse Supabase SSR cookies — fall through to null
  }

  return null;
}

/**
 * Verify and decode a Supabase JWT.
 *
 * When SUPABASE_JWT_SECRET is set, verifies the HMAC-SHA256 signature locally
 * (no network call). When the secret is not available, falls back to
 * decode-only (payload + expiration check) for backwards compatibility.
 */
const jwtSecret = process.env.SUPABASE_JWT_SECRET || null;

function decodeJwt(token: string): { sub: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Verify signature if secret is available
    if (jwtSecret) {
      const { createHmac } = require('crypto');
      const signatureInput = parts[0] + '.' + parts[1];
      const expectedSig = createHmac('sha256', jwtSecret)
        .update(signatureInput)
        .digest('base64url');
      if (expectedSig !== parts[2]) return null;
    }

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
      const token = getAuthToken(req);
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
    context: { userId: string; orgId: string; isAdmin?: boolean }
  ) => Promise<void> | void,
  mode: 'all' | 'any' = 'all'
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = getAuthToken(req);
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
      const admin = await isLevelsetAdmin(supabase, userId);
      if (admin) {
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = { id: userId };
        authenticatedReq.orgId = orgId as string;
        return handler(authenticatedReq, res, { userId, orgId: orgId as string, isAdmin: true });
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

/**
 * Lightweight auth middleware — validates JWT but does NOT check permissions.
 * Use for routes where any authenticated user should have access.
 * Supports both Authorization: Bearer header and levelset-access-token cookie.
 *
 * Usage:
 *   export default withAuth(handler);
 */
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = getAuthToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decoded = decodeJwt(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Admin auth middleware — validates JWT and requires Levelset Admin role.
 * Use for admin-only routes (user management, billing admin, etc.).
 *
 * Usage:
 *   export default withAdminAuth(handler);
 */
export function withAdminAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = getAuthToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const supabase = createServerSupabaseClient();
      const decoded = decodeJwt(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const admin = await isLevelsetAdmin(supabase, decoded.sub);
      if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      return handler(req, res);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
