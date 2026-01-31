/**
 * Database Type Definitions
 * Types for Supabase database tables
 */

// =============================================================================
// Auth Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  organization_id?: string;
  mobile_token?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Organization Types
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  created_at: string;
}

export interface OrgFeatureToggles {
  id: string;
  organization_id: string;
  require_rating_comments: boolean;
  // Add other feature toggles as needed
}

// =============================================================================
// Employee Types
// =============================================================================

export interface DbEmployee {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

// =============================================================================
// Infraction Types
// =============================================================================

export interface InfractionRubric {
  id: string;
  organization_id: string;
  action: string;
  action_es?: string;
  points: number;
  require_tm_signature: boolean;
  require_leader_signature: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DisciplineRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  leader_id: string;
  infraction_id: string;
  date: string;
  acknowledged: boolean;
  notes?: string;
  team_member_signature?: string;
  leader_signature: string;
  created_at: string;
}

// =============================================================================
// Position Types
// =============================================================================

export interface DbPosition {
  id: string;
  organization_id: string;
  name: string;
  name_es?: string;
  zone: "FOH" | "BOH";
  description?: string;
  description_es?: string;
  is_active: boolean;
  created_at: string;
}

export interface PositionCompetency {
  id: string;
  position_id: string;
  label: string;
  label_es?: string;
  description?: string;
  description_es?: string;
  sort_order: number;
}

export interface PositionalRating {
  id: string;
  organization_id: string;
  employee_id: string;
  leader_id: string;
  position_id: string;
  ratings: number[];
  notes?: string;
  created_at: string;
}

// =============================================================================
// Schedule Types (for future Deputy integration)
// =============================================================================

export interface Shift {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  area?: string;
  role?: string;
  hours: number;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
}

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: "vacation" | "sick" | "personal" | "other";
  status: "pending" | "approved" | "denied";
  notes?: string;
  created_at: string;
}
