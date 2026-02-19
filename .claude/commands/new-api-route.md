Create a new API route for: $ARGUMENTS

Follow the established pattern from existing routes:

1. Create the file at `apps/dashboard/pages/api/<resource-name>.ts`

2. Use the standard structure:
   - Import `createServerSupabaseClient` from `@/lib/supabase-server`
   - Import `NextApiRequest, NextApiResponse` from `next`
   - Handle methods with `if (req.method === 'GET')` pattern
   - For multi-action POST endpoints, use `req.body.intent` dispatch
   - Always return 405 for unsupported methods

3. Security requirements:
   - Validate org_id from the authenticated user's session, NOT from the request body
   - All queries MUST be scoped by org_id
   - Use `checkPermission` from `@/lib/permissions/service` for permission-gated endpoints

Reference `apps/dashboard/pages/api/employees.ts` or `apps/dashboard/pages/api/ratings.ts` for the exact pattern.
