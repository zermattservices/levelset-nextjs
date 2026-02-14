export interface Position {
  id: string;
  org_id: string;
  name: string;
  zone: 'FOH' | 'BOH';
  description?: string;
  display_order: number;
  is_active: boolean;
}

export type ScheduleStatus = 'draft' | 'published';

export interface Schedule {
  id: string;
  org_id: string;
  location_id: string;
  week_start: string;
  status: ScheduleStatus;
  published_at?: string;
  published_by?: string;
  total_labor_cost?: number;
  total_hours?: number;
  notes?: string;
}

export interface Shift {
  id: string;
  org_id: string;
  schedule_id: string;
  position_id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes?: string;
  position?: Position;
  assignment?: ShiftAssignment;
}

export interface ShiftAssignment {
  id: string;
  org_id: string;
  shift_id: string;
  employee_id: string;
  assigned_by?: string;
  projected_cost?: number;
  employee?: {
    id: string;
    full_name: string;
    role: string;
    is_foh: boolean;
    is_boh: boolean;
    calculated_pay?: number;
  };
}

export interface ScheduleGridData {
  schedule: Schedule | null;
  shifts: Shift[];
  positions: Position[];
}

export type GridViewMode = 'employees' | 'positions';
export type TimeViewMode = 'week' | 'day';
export type ZoneFilter = 'all' | 'FOH' | 'BOH';

export interface LaborSummary {
  total_hours: number;
  total_cost: number;
  by_day: Record<string, { hours: number; cost: number }>;
  by_position: Record<string, { hours: number; cost: number; position_name: string; zone: string }>;
}
