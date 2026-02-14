/**
 * Permission Middleware
 * API route protection middleware for Next.js API routes
 */

import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkPermission, checkAnyPermission, checkAllPermissions } from './service';
import { PermissionKey } from './constants';

type PermissionCheck = PermissionKey | PermissionKey[];

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
      // Get auth token from request
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Create supabase client with user's token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      // Get user info
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

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

      // Check permission(s)
      const permissions = Array.isArray(permission) ? permission : [permission];
      let hasPermission: boolean;

      if (permissions.length === 1) {
        hasPermission = await checkPermission(supabase, user.id, orgId as string, permissions[0]);
      } else if (mode === 'any') {
        hasPermission = await checkAnyPermission(supabase, user.id, orgId as string, permissions);
      } else {
        hasPermission = await checkAllPermissions(supabase, user.id, orgId as string, permissions);
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
      // Get auth token from request
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Create supabase client with user's token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      // Get user info
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

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

      // Check permission(s)
      const permissions = Array.isArray(permission) ? permission : [permission];
      let hasPermission: boolean;

      if (permissions.length === 1) {
        hasPermission = await checkPermission(supabase, user.id, orgId as string, permissions[0]);
      } else if (mode === 'any') {
        hasPermission = await checkAnyPermission(supabase, user.id, orgId as string, permissions);
      } else {
        hasPermission = await checkAllPermissions(supabase, user.id, orgId as string, permissions);
      }

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Add user and org to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = { id: user.id, email: user.email };
      authenticatedReq.orgId = orgId as string;

      // Permission granted - continue to handler with context
      return handler(authenticatedReq, res, { userId: user.id, orgId: orgId as string });
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
