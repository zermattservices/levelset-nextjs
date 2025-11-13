// Supabase type definitions
export type AvailabilityType = 'Limited' | 'Available';
export type CertificationStatus = 'Not Certified' | 'Pending' | 'Certified' | 'PIP';

export interface Employee {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  org_id: string;
  location_id: string;
  active: boolean;
  email?: string;
  is_foh?: boolean;
  is_boh?: boolean;
  is_leader?: boolean;
  is_trainer?: boolean;
  certified_status?: CertificationStatus;
  availability?: AvailabilityType;
  calculated_pay?: number;
  position?: string;
  hire_date?: string;
  payroll_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Infraction {
  id: string;
  employee_id: string;
  employee_name?: string; // Populated from view/JOIN
  points: number;
  infraction_date: string;
  org_id: string;
  location_id: string;
  description?: string;
  infraction?: string; // The type/description of infraction
  leader_id?: string; // ID of documenting leader
  leader_name?: string; // Name of leader who documented (populated from view/JOIN)
  acknowledgement?: string; // Status: "Notified", "Notified not present", etc.
  ack_bool?: boolean; // Boolean version: true if notified, false if not notified
  notes?: string;
  leader_signature?: string | null;
  team_member_signature?: string | null;
  created_at?: string;
}

export interface DisciplinaryAction {
  id: string;
  employee_id: string;
  employee_name?: string; // Populated from view/JOIN
  action: string; // The action taken (e.g., "Documented Warning")
  action_date: string;
  action_id?: string; // Reference to disc_actions_rubric
  acting_leader?: string; // ID of leader who took the action (actual field name in DB)
  leader_name?: string; // Name of leader who took action (populated from view/JOIN)
  org_id: string;
  location_id: string;
  notes?: string;
  created_at?: string;
}

export interface Rating {
  id: string;
  employee_id: string;
  employee_name?: string; // from JOIN with employees table
  rater_user_id: string;
  rater_name?: string; // from JOIN with employees table
  position: string;
  rating_1: number | null;
  rating_2: number | null;
  rating_3: number | null;
  rating_4: number | null;
  rating_5: number | null;
  rating_avg: number | null;
  created_at: string;
  location_id: string;
  org_id: string;
}

export interface PositionBig5Labels {
  id: string;
  org_id: string;
  location_id: string;
  position: string;
  label_1: string;
  label_2: string;
  label_3: string;
  label_4: string;
  label_5: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeRatingAggregate {
  employee_id: string;
  employee_name: string;
  last_rating_date: string | null;
  positions: Record<string, number | null>; // position -> avg rating
  overall_avg: number | null;
  total_count_90d: number; // 90-day rolling count
  recent_ratings: Rating[]; // last 4 for expandable rows
}

export interface LeaderRatingAggregate {
  leader_id: string;
  leader_name: string;
  last_rating_date: string | null;
  positions: Record<string, number | null>; // position -> avg rating
  overall_avg: number | null;
  total_count_90d: number; // 90-day rolling count
  recent_ratings: Rating[]; // last 10 for expandable rows
}

export interface CertificationAudit {
  id: string;
  employee_id: string;
  employee_name?: string; // For easier audit review
  org_id: string;
  location_id: string;
  audit_date: string; // ISO date string
  status_before: CertificationStatus | null;
  status_after: CertificationStatus;
  all_positions_qualified: boolean;
  position_averages: Record<string, number>; // e.g., {"iPOS": 2.9, "Host": 2.85}
  created_at: string;
  notes?: string;
}

