export interface Position {
  id: string;
  org_id: string;
  name: string;
  zone: 'FOH' | 'BOH';
  description?: string;
  display_order: number;
  is_active: boolean;
  position_type?: 'standard' | 'scheduling_only';
  area_id?: string;
  scheduling_enabled?: boolean;
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
  end_date?: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_house_shift?: boolean;
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

export type GridViewMode = 'employees' | 'positions' | 'setup';
export type TimeViewMode = 'week' | 'day';
export type ZoneFilter = 'all' | 'FOH' | 'BOH';

export interface LaborSummary {
  total_hours: number;
  total_cost: number;
  by_day: Record<string, { hours: number; cost: number }>;
  by_position: Record<string, { hours: number; cost: number; position_name: string; zone: string }>;
}

export interface BreakRule {
  id: string;
  org_id: string;
  break_duration_minutes: number;
  trigger_hours: number;
  is_active: boolean;
  display_order: number;
  isNew?: boolean; // client-side only
}

export interface SchedulingArea {
  id: string;
  org_id: string;
  name: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
}

// ── Setup Board Types ──────────────────────────────────────────────

export interface SetupTemplate {
  id: string;
  org_id: string;
  name: string;
  zone: 'FOH' | 'BOH';
  priority: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  schedules?: SetupTemplateSchedule[];
  slots?: SetupTemplateSlot[];
}

export interface SetupTemplateSchedule {
  id: string;
  template_id: string;
  day_of_week: number[];
  start_time: string;
  end_time: string;
}

export interface SetupTemplateSlot {
  id: string;
  template_id: string;
  position_id: string;
  time_slot: string;
  slot_count: number;
  is_required: boolean;
}

export interface SetupAssignment {
  id: string;
  org_id: string;
  shift_id: string;
  employee_id: string;
  position_id: string;
  assignment_date: string;
  start_time: string;
  end_time: string;
  assigned_by?: string;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: string;
    full_name: string;
    calculated_pay?: number;
  };
  position?: {
    id: string;
    name: string;
    zone: string;
  };
  shift?: Shift;
}

/** Resolved slot configuration for a single position at a point in time. */
export interface ResolvedPositionSlots {
  position_id: string;
  position_name: string;
  zone: 'FOH' | 'BOH';
  slots: {
    index: number;
    is_required: boolean;
    assignment?: SetupAssignment;
  }[];
}
