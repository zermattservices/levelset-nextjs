/**
 * Role color utilities for consistent styling across the app
 */

export const DEFAULT_ROLE_COLORS = {
  green: { bg: '#dcfce7', text: '#166534' },
  blue: { bg: '#dbeafe', text: '#1d4ed8' },
  red: { bg: '#fee2e2', text: '#dc2626' },
  amber: { bg: '#fef3c7', text: '#d97706' },
  purple: { bg: '#f3e8ff', text: '#7c3aed' },
  teal: { bg: '#ccfbf1', text: '#0d9488' },
  pink: { bg: '#fce7f3', text: '#db2777' },
  grey: { bg: '#f3f4f6', text: '#4b5563' },
  black: { bg: '#374151', text: '#ffffff' },
  indigo: { bg: '#e0e7ff', text: '#4f46e5' },
} as const;

export type RoleColorKey = keyof typeof DEFAULT_ROLE_COLORS;

export const ROLE_COLOR_KEYS: RoleColorKey[] = [
  'green', 'blue', 'red', 'amber', 'purple', 'teal', 'pink', 'grey', 'black', 'indigo'
];

/**
 * Get the color scheme for a role based on its color key
 * Falls back to blue if the color key is invalid
 */
export function getRoleColor(colorKey: string | null | undefined): { bg: string; text: string } {
  if (colorKey && colorKey in DEFAULT_ROLE_COLORS) {
    return DEFAULT_ROLE_COLORS[colorKey as RoleColorKey];
  }
  return DEFAULT_ROLE_COLORS.blue;
}

/**
 * Get a random role color key
 */
export function getRandomRoleColor(): RoleColorKey {
  return ROLE_COLOR_KEYS[Math.floor(Math.random() * ROLE_COLOR_KEYS.length)];
}

/**
 * Get a unique role color that isn't already used by existing roles
 * Falls back to random if all colors are used
 */
export function getUniqueRoleColor(usedColors: (RoleColorKey | string)[]): RoleColorKey {
  const availableColors = ROLE_COLOR_KEYS.filter(color => !usedColors.includes(color));
  if (availableColors.length > 0) {
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }
  // All colors used, fall back to random
  return getRandomRoleColor();
}

/**
 * Interface for org role data from database
 */
export interface OrgRole {
  id: string;
  org_id: string;
  role_name: string;
  hierarchy_level: number;
  is_leader: boolean;
  is_trainer: boolean;
  color: RoleColorKey;
  created_at?: string;
  updated_at?: string;
}
