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
  phone?: string;
  hs_id?: number;
  birth_date?: string;
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
  consolidated_employee_id?: string;
  termination_date?: string;
  termination_reason?: string;
  last_points_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InfractionDocument {
  id: string;
  infraction_id: string;
  org_id: string;
  location_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by?: string;
  created_at?: string;
  url?: string; // Populated at runtime with signed URL
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
  documents?: InfractionDocument[]; // Attached files (populated when fetched)
  document_count?: number; // Count of attached documents (populated in list views)
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
  notes: string | null;
  created_at: string;
  location_id: string;
  org_id: string;
}

export interface PositionBig5Labels {
  id: string;
  org_id: string;
  location_id: string;
  position: string;
  zone: 'FOH' | 'BOH';
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

export interface Location {
  id: string;
  org_id: string;
  name: string;
  location_number: string;
  address?: string;
  phone?: string;
  operator?: string;
  code?: string;
  location_type?: string;
  image_url?: string;
  location_mobile_token?: string;
  has_synced_before?: boolean;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  google_rating?: number;
  google_review_count?: number;
  google_hours_display?: string[];
  google_last_synced_at?: string;
  created_at?: string;
}

export interface LocationBusinessHours {
  id: string;
  location_id: string;
  day_of_week: number; // 0=Sunday through 6=Saturday
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
  period_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface GoogleReview {
  id: string;
  location_id: string;
  org_id: string;
  google_review_name: string;
  author_name?: string;
  author_photo_url?: string;
  author_uri?: string;
  rating: number;
  review_text?: string;
  review_language?: string;
  original_text?: string;
  original_language?: string;
  publish_time: string;
  relative_time_description?: string;
  google_maps_uri?: string;
  first_synced_at: string;
  last_synced_at: string;
  mentioned_employee_ids?: string[];
  sentiment_score?: number;
  ai_summary?: string;
  ai_analyzed_at?: string;
  ai_tags?: string[];
  pillar_score_applied: boolean;
  created_at: string;
}

