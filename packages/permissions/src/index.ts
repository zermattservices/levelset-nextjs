/**
 * @levelset/permissions - Permission system
 *
 * Stub package: the agent service uses this to check Levelset Admin role.
 * Full permission system lives in apps/dashboard/lib/permissions/.
 * Will be fully extracted in a future PR.
 */

/** Role that bypasses all permission checks */
export const ADMIN_ROLE = 'Levelset Admin';

/**
 * Check if a user role is the Levelset Admin role.
 * Levelset Admin bypasses all permission checks.
 */
export function isLevelsetAdmin(role: string | null | undefined): boolean {
  return role === ADMIN_ROLE;
}
