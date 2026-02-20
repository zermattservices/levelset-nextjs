/**
 * Permission System Constants
 * Single source of truth for all permission definitions
 */

// Module definitions
export const PERMISSION_MODULES = {
  POSITIONAL_EXCELLENCE: 'positional_excellence',
  DISCIPLINE: 'discipline',
  ROSTER: 'roster',
  ORG_SETTINGS: 'org_settings',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  MOBILE_APP: 'mobile_app',
  HR_REPORTING: 'hr_reporting',
  BILLING: 'billing',
  SCHEDULING: 'scheduling',
  FORM_MANAGEMENT: 'form_management',
} as const;

// All permission keys as const for type safety
export const P = {
  // Positional Excellence
  PE_VIEW_DASHBOARD: 'positional_excellence.view_dashboard',
  PE_SUBMIT_RATINGS: 'positional_excellence.submit_ratings',
  PE_GENERATE_REPORTS: 'positional_excellence.generate_reports',
  PE_DELETE_MODIFY_RATINGS: 'positional_excellence.delete_modify_ratings',
  PE_MANAGE_POSITIONS: 'positional_excellence.manage_positions',
  PE_MANAGE_RATING_CRITERIA: 'positional_excellence.manage_rating_criteria',
  PE_MANAGE_ROLE_MAPPINGS: 'positional_excellence.manage_role_mappings',
  PE_MANAGE_RATING_SCALE: 'positional_excellence.manage_rating_scale',

  // Discipline
  DISC_VIEW_DASHBOARD: 'discipline.view_dashboard',
  DISC_SUBMIT_INFRACTIONS: 'discipline.submit_infractions',
  DISC_RECORD_ACTIONS: 'discipline.record_actions',
  DISC_GENERATE_REPORTS: 'discipline.generate_reports',
  DISC_DELETE_MODIFY_INFRACTIONS: 'discipline.delete_modify_infractions',
  DISC_DELETE_MODIFY_ACTIONS: 'discipline.delete_modify_actions',
  DISC_MANAGE_INFRACTIONS: 'discipline.manage_infractions_settings',
  DISC_MANAGE_ACTIONS: 'discipline.manage_actions_settings',
  DISC_MANAGE_ACCESS: 'discipline.manage_access_settings',
  DISC_MANAGE_NOTIFICATIONS: 'discipline.manage_notifications_settings',

  // Roster
  ROSTER_VIEW: 'roster.view_roster',
  ROSTER_EDIT_FOH_BOH: 'roster.edit_foh_boh',
  ROSTER_EDIT_ROLES: 'roster.edit_roles',
  ROSTER_EDIT_AVAILABILITY: 'roster.edit_availability',
  ROSTER_EDIT_CERTIFICATION: 'roster.edit_certification_status',
  ROSTER_EDIT_EMPLOYEE: 'roster.edit_employee',
  ROSTER_TERMINATE: 'roster.terminate_employees',
  ROSTER_SYNC: 'roster.sync_employees',
  ROSTER_MANAGE_PAY: 'roster.manage_pay_settings',

  // Organization Settings
  ORG_VIEW_SETTINGS: 'org_settings.view_settings',
  ORG_MANAGE_LOCATION: 'org_settings.manage_location_details',
  ORG_MANAGE_ORG: 'org_settings.manage_org_details',

  // Users
  USERS_VIEW: 'users.view_users',
  USERS_MANAGE: 'users.manage_users',

  // Roles
  ROLES_VIEW: 'roles.view_roles',
  ROLES_MANAGE: 'roles.manage_roles',

  // Permissions
  PERMS_VIEW: 'permissions.view_permissions',
  PERMS_MANAGE: 'permissions.manage_permissions',

  // Mobile App
  MOBILE_ACCESS: 'mobile_app.access_mobile_app',
  MOBILE_MANAGE_CONFIG: 'mobile_app.manage_configuration',
  MOBILE_VIEW_PASSWORD: 'mobile_app.view_form_password',
  MOBILE_CHANGE_PASSWORD: 'mobile_app.change_form_password',

  // HR Reporting
  HR_VIEW_REPORTING: 'hr_reporting.view_hr_reporting',

  // Billing
  BILLING_VIEW: 'billing.view_billing',
  BILLING_EDIT: 'billing.edit_billing',

  // Scheduling
  SCHED_VIEW: 'scheduling.view_schedule',
  SCHED_MANAGE: 'scheduling.manage_schedule',
  SCHED_MANAGE_SETTINGS: 'scheduling.manage_settings',

  // Form Management
  FM_VIEW_FORMS: 'form_management.view_forms',
  FM_CREATE_FORMS: 'form_management.create_forms',
  FM_EDIT_FORMS: 'form_management.edit_forms',
  FM_DELETE_FORMS: 'form_management.delete_forms',
  FM_VIEW_SUBMISSIONS: 'form_management.view_submissions',
  FM_MANAGE_SUBMISSIONS: 'form_management.manage_submissions',
} as const;

// Type for any valid permission key
export type PermissionKey = (typeof P)[keyof typeof P];

// All permission keys as array (for seeding, validation)
export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(P);

// Module metadata for UI display and seeding
export interface ModuleMetadata {
  name: string;
  description: string;
  order: number;
}

export const MODULE_METADATA: Record<string, ModuleMetadata> = {
  [PERMISSION_MODULES.POSITIONAL_EXCELLENCE]: {
    name: 'Positional Excellence',
    description: 'Ratings and performance tracking for team members',
    order: 1,
  },
  [PERMISSION_MODULES.DISCIPLINE]: {
    name: 'Discipline',
    description: 'Infraction and disciplinary action tracking',
    order: 2,
  },
  [PERMISSION_MODULES.ROSTER]: {
    name: 'Roster',
    description: 'Employee management, sync, and configuration',
    order: 3,
  },
  [PERMISSION_MODULES.ORG_SETTINGS]: {
    name: 'Organization Settings',
    description: 'Location and organization configuration',
    order: 4,
  },
  [PERMISSION_MODULES.USERS]: {
    name: 'Users',
    description: 'Dashboard user management',
    order: 5,
  },
  [PERMISSION_MODULES.ROLES]: {
    name: 'Roles',
    description: 'Organizational role configuration',
    order: 6,
  },
  [PERMISSION_MODULES.PERMISSIONS]: {
    name: 'Permissions',
    description: 'Permission level configuration',
    order: 7,
  },
  [PERMISSION_MODULES.MOBILE_APP]: {
    name: 'Mobile App',
    description: 'Mobile PWA application settings',
    order: 8,
  },
  [PERMISSION_MODULES.HR_REPORTING]: {
    name: 'HR Reporting',
    description: 'Access to HR reporting dashboards and reports',
    order: 9,
  },
  [PERMISSION_MODULES.BILLING]: {
    name: 'Billing',
    description: 'Billing and subscription management',
    order: 10,
  },
  [PERMISSION_MODULES.SCHEDULING]: {
    name: 'Scheduling',
    description: 'Schedule configuration, break rules, and position setup',
    order: 11,
  },
  [PERMISSION_MODULES.FORM_MANAGEMENT]: {
    name: 'Form Management',
    description: 'Create, edit, and manage forms and form submissions',
    order: 12,
  },
};

// Sub-item metadata for UI display and seeding
export interface SubItemMetadata {
  name: string;
  description: string;
  order: number;
  module: string;
  dependsOn?: PermissionKey;
}

export const SUB_ITEM_METADATA: Record<PermissionKey, SubItemMetadata> = {
  // Positional Excellence
  [P.PE_VIEW_DASHBOARD]: {
    name: 'View Dashboard',
    description: 'Access to view the Positional Excellence dashboard and all ratings data',
    order: 1,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_SUBMIT_RATINGS]: {
    name: 'Submit Ratings',
    description: 'Ability to submit positional ratings for team members via the mobile app',
    order: 2,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_GENERATE_REPORTS]: {
    name: 'Generate Reports',
    description: 'Ability to generate and export positional excellence reports',
    order: 3,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_DELETE_MODIFY_RATINGS]: {
    name: 'Delete/Modify Ratings',
    description: 'Ability to delete or modify existing ratings that have been submitted',
    order: 4,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_MANAGE_POSITIONS]: {
    name: 'Manage Positions',
    description: 'Configure positions and their descriptions in organization settings',
    order: 5,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_MANAGE_RATING_CRITERIA]: {
    name: 'Manage Rating Criteria',
    description: 'Configure the 5 rating criteria for each position',
    order: 6,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_MANAGE_ROLE_MAPPINGS]: {
    name: 'Manage Role Mappings',
    description: 'Configure which roles can submit ratings for which positions',
    order: 7,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },
  [P.PE_MANAGE_RATING_SCALE]: {
    name: 'Manage Rating Scale',
    description: 'Configure the rating thresholds (Not Yet, On the Rise, Crushing It)',
    order: 8,
    module: PERMISSION_MODULES.POSITIONAL_EXCELLENCE,
  },

  // Discipline
  [P.DISC_VIEW_DASHBOARD]: {
    name: 'View Dashboard',
    description: 'Access to view the Discipline dashboard and infraction history',
    order: 1,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_SUBMIT_INFRACTIONS]: {
    name: 'Submit Infractions',
    description: 'Ability to submit discipline infractions via the mobile app',
    order: 2,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_RECORD_ACTIONS]: {
    name: 'Record Actions',
    description: 'Ability to record disciplinary actions for employees',
    order: 3,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_GENERATE_REPORTS]: {
    name: 'Generate Reports',
    description: 'Ability to generate and export discipline reports',
    order: 4,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_DELETE_MODIFY_INFRACTIONS]: {
    name: 'Delete/Modify Infractions',
    description: 'Ability to delete or modify existing infractions',
    order: 5,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_DELETE_MODIFY_ACTIONS]: {
    name: 'Delete/Modify Actions',
    description: 'Ability to delete or modify recorded disciplinary actions',
    order: 6,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_MANAGE_INFRACTIONS]: {
    name: 'Manage Infractions Settings',
    description: 'Configure infraction types and point values',
    order: 7,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_MANAGE_ACTIONS]: {
    name: 'Manage Actions Settings',
    description: 'Configure disciplinary action types and thresholds',
    order: 8,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_MANAGE_ACCESS]: {
    name: 'Manage Access Settings',
    description: 'Configure which roles can submit discipline forms',
    order: 9,
    module: PERMISSION_MODULES.DISCIPLINE,
  },
  [P.DISC_MANAGE_NOTIFICATIONS]: {
    name: 'Manage Notifications Settings',
    description: 'Configure discipline notification preferences',
    order: 10,
    module: PERMISSION_MODULES.DISCIPLINE,
  },

  // Roster
  [P.ROSTER_VIEW]: {
    name: 'View Roster',
    description: 'Access to view the employee roster and team member details',
    order: 1,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_EDIT_FOH_BOH]: {
    name: 'Edit FOH/BOH',
    description: 'Ability to modify employee FOH/BOH assignments',
    order: 2,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_EDIT_ROLES]: {
    name: 'Edit Roles',
    description: 'Ability to change employee roles',
    order: 3,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_EDIT_AVAILABILITY]: {
    name: 'Edit Availability',
    description: 'Ability to modify employee availability status (Limited/Available)',
    order: 4,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_EDIT_CERTIFICATION]: {
    name: 'Edit Certification Status',
    description: 'Ability to manually modify employee certification status',
    order: 5,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_EDIT_EMPLOYEE]: {
    name: 'Edit Employee',
    description: 'Ability to edit employee details (name, email, phone, etc.)',
    order: 6,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_TERMINATE]: {
    name: 'Terminate Employees',
    description: 'Ability to remove/terminate employees from the roster',
    order: 7,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_SYNC]: {
    name: 'Sync Employees',
    description: 'Access to HotSchedules sync and payroll report upload features',
    order: 8,
    module: PERMISSION_MODULES.ROSTER,
  },
  [P.ROSTER_MANAGE_PAY]: {
    name: 'Manage Pay Settings',
    description: 'Configure suggested pay rates and pay calculation rules',
    order: 9,
    module: PERMISSION_MODULES.ROSTER,
  },

  // Organization Settings
  [P.ORG_VIEW_SETTINGS]: {
    name: 'View Settings',
    description: 'Access to view organization and location settings pages',
    order: 1,
    module: PERMISSION_MODULES.ORG_SETTINGS,
  },
  [P.ORG_MANAGE_LOCATION]: {
    name: 'Manage Location Details',
    description: 'Edit location information, images, and configuration',
    order: 2,
    module: PERMISSION_MODULES.ORG_SETTINGS,
  },
  [P.ORG_MANAGE_ORG]: {
    name: 'Manage Org Details',
    description: 'Edit organization-level information and configuration',
    order: 3,
    module: PERMISSION_MODULES.ORG_SETTINGS,
  },

  // Users
  [P.USERS_VIEW]: {
    name: 'View Users',
    description: 'Access to view the users list in organization settings',
    order: 1,
    module: PERMISSION_MODULES.USERS,
  },
  [P.USERS_MANAGE]: {
    name: 'Manage Users',
    description: 'Ability to add, edit, and remove dashboard users',
    order: 2,
    module: PERMISSION_MODULES.USERS,
  },

  // Roles
  [P.ROLES_VIEW]: {
    name: 'View Roles',
    description: 'Access to view the roles configuration in organization settings',
    order: 1,
    module: PERMISSION_MODULES.ROLES,
  },
  [P.ROLES_MANAGE]: {
    name: 'Manage Roles',
    description: 'Ability to add, edit, reorder, and delete organizational roles',
    order: 2,
    module: PERMISSION_MODULES.ROLES,
  },

  // Permissions
  [P.PERMS_VIEW]: {
    name: 'View Permissions',
    description: 'Access to view the permissions settings page',
    order: 1,
    module: PERMISSION_MODULES.PERMISSIONS,
  },
  [P.PERMS_MANAGE]: {
    name: 'Manage Permissions',
    description: 'Ability to modify permission levels (can only edit levels below own tier)',
    order: 2,
    module: PERMISSION_MODULES.PERMISSIONS,
  },

  // Mobile App
  [P.MOBILE_ACCESS]: {
    name: 'Access Mobile App',
    description: 'Access to use the mobile PWA application',
    order: 1,
    module: PERMISSION_MODULES.MOBILE_APP,
  },
  [P.MOBILE_MANAGE_CONFIG]: {
    name: 'Manage Configuration',
    description: 'Configure mobile app settings and features',
    order: 2,
    module: PERMISSION_MODULES.MOBILE_APP,
  },
  [P.MOBILE_VIEW_PASSWORD]: {
    name: 'View Form Password',
    description: 'Ability to view the discipline form password',
    order: 3,
    module: PERMISSION_MODULES.MOBILE_APP,
  },
  [P.MOBILE_CHANGE_PASSWORD]: {
    name: 'Change Form Password',
    description: 'Ability to change the discipline form password',
    order: 4,
    module: PERMISSION_MODULES.MOBILE_APP,
    dependsOn: P.MOBILE_VIEW_PASSWORD, // Auto-enable dependency
  },

  // HR Reporting
  [P.HR_VIEW_REPORTING]: {
    name: 'View HR Reporting',
    description: 'Access to view HR reporting dashboards, discipline reports, and employee data',
    order: 1,
    module: PERMISSION_MODULES.HR_REPORTING,
  },

  // Billing
  [P.BILLING_VIEW]: {
    name: 'View Billing',
    description: 'Access to view billing information, invoices, and subscription details',
    order: 1,
    module: PERMISSION_MODULES.BILLING,
  },
  [P.BILLING_EDIT]: {
    name: 'Edit Billing',
    description: 'Ability to manage billing settings, payment methods, and subscription plans',
    order: 2,
    module: PERMISSION_MODULES.BILLING,
  },

  // Scheduling
  [P.SCHED_VIEW]: {
    name: 'View Schedule',
    description: 'Access to view the scheduling dashboard',
    order: 1,
    module: PERMISSION_MODULES.SCHEDULING,
  },
  [P.SCHED_MANAGE]: {
    name: 'Manage Schedule',
    description: 'Create, edit, and publish schedules',
    order: 2,
    module: PERMISSION_MODULES.SCHEDULING,
  },
  [P.SCHED_MANAGE_SETTINGS]: {
    name: 'Manage Scheduling Settings',
    description: 'Configure break rules, position setup, and scheduling preferences',
    order: 3,
    module: PERMISSION_MODULES.SCHEDULING,
  },

  // Form Management
  [P.FM_VIEW_FORMS]: {
    name: 'View Forms',
    description: 'Access to view the Form Management page and browse forms',
    order: 1,
    module: PERMISSION_MODULES.FORM_MANAGEMENT,
  },
  [P.FM_CREATE_FORMS]: {
    name: 'Create Forms',
    description: 'Ability to create new form templates',
    order: 2,
    module: PERMISSION_MODULES.FORM_MANAGEMENT,
  },
  [P.FM_EDIT_FORMS]: {
    name: 'Edit Forms',
    description: 'Ability to edit existing form templates',
    order: 3,
    module: PERMISSION_MODULES.FORM_MANAGEMENT,
  },
  [P.FM_DELETE_FORMS]: {
    name: 'Delete Forms',
    description: 'Ability to delete or archive form templates',
    order: 4,
    module: PERMISSION_MODULES.FORM_MANAGEMENT,
  },
  [P.FM_VIEW_SUBMISSIONS]: {
    name: 'View Submissions',
    description: 'Access to view form submissions and results',
    order: 5,
    module: PERMISSION_MODULES.FORM_MANAGEMENT,
  },
  [P.FM_MANAGE_SUBMISSIONS]: {
    name: 'Manage Submissions',
    description: 'Ability to approve, reject, or manage form submissions',
    order: 6,
    module: PERMISSION_MODULES.FORM_MANAGEMENT,
  },
};

// Helper to get sub-item key from full permission key
export function getSubItemKey(permissionKey: PermissionKey): string {
  return permissionKey.split('.')[1];
}

// Helper to get module key from full permission key
export function getModuleKey(permissionKey: PermissionKey): string {
  return permissionKey.split('.')[0];
}

// Get all permission keys for a specific module
export function getModulePermissions(moduleKey: string): PermissionKey[] {
  return ALL_PERMISSION_KEYS.filter((key) => getModuleKey(key) === moduleKey);
}
