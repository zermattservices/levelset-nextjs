// Supabase type definitions
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
  position?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Infraction {
  id: string;
  employee_id: string;
  points: number;
  infraction_date: string;
  org_id: string;
  location_id: string;
  description?: string;
}

