/**
 * Permission System
 * Public exports for the permission system
 */

// Constants
export {
  PERMISSION_MODULES,
  P,
  ALL_PERMISSION_KEYS,
  MODULE_METADATA,
  SUB_ITEM_METADATA,
  getSubItemKey,
  getModuleKey,
  getModulePermissions,
} from './constants';

export type { PermissionKey, ModuleMetadata, SubItemMetadata } from './constants';

// Defaults
export {
  DEFAULT_PERMISSIONS,
  DEFAULT_PROFILE_NAMES,
  getDefaultPermissions,
  getDefaultPermissionsArray,
  getDefaultProfileName,
} from './defaults';

// Service
export {
  loadUserPermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  canEditPermissionLevel,
  clearPermissionCache,
  clearAllPermissionCache,
  resolveDependencies,
  getDependentPermissions,
} from './service';

// Middleware
export { withPermission, withPermissionAndContext } from './middleware';

export type { AuthenticatedRequest } from './middleware';
