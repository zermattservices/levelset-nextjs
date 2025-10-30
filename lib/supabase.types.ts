// Supabase type definitions
export type AvailabilityType = 'Limited' | 'Available';

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
  is_certified?: boolean;
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
  points: number;
  infraction_date: string;
  org_id: string;
  location_id: string;
  description?: string;
}

