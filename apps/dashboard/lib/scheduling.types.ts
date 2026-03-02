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
  published_at?: string;
  updated_at?: string;
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
  regular_hours: number;
  ot_hours: number;
  ot_premium: number;
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

// ── Sales Forecast Types ─────────────────────────────────────────────

export interface SalesForecast {
  id: string;
  org_id: string;
  location_id: string;
  forecast_date: string;
  projected_sales: number | null;
  projected_transactions: number | null;
  source: 'hotschedules' | 'manual';
  created_at?: string;
  updated_at?: string;
  intervals?: SalesForecastInterval[];
}

export interface SalesForecastInterval {
  id: string;
  forecast_id: string;
  interval_start: string; // HH:MM TIME
  sales_amount: number | null;
  transaction_count: number | null;
  created_at?: string;
}

// ── Availability Types ───────────────────────────────────────────────

export interface EmployeeAvailability {
  id: string;
  org_id: string;
  employee_id: string;
  day_of_week: number; // 0=Sun, 6=Sat
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  created_at?: string;
  updated_at?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export interface AvailabilityChangeRequest {
  id: string;
  org_id: string;
  employee_id: string;
  status: ApprovalStatus;
  requested_availability: { day_of_week: number; start_time: string; end_time: string }[];
  effective_date: string | null;
  is_permanent: boolean;
  end_date: string | null;
  employee_notes: string | null;
  manager_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at?: string;
  updated_at?: string;
  employee?: { id: string; full_name: string };
}

// ── Time Off Types ───────────────────────────────────────────────────

export interface TimeOffRequest {
  id: string;
  org_id: string;
  employee_id: string;
  location_id: string;
  start_datetime: string;
  end_datetime: string;
  status: ApprovalStatus;
  note: string | null;
  is_paid: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  hs_id: number | null;
  created_at?: string;
  updated_at?: string;
  employee?: { id: string; full_name: string };
}

// ── Shift Trade Types ────────────────────────────────────────────────

export type ShiftTradeType = 'giveaway' | 'swap' | 'house_pickup';
export type ShiftTradeStatus = 'open' | 'pending_approval' | 'approved' | 'denied' | 'cancelled' | 'expired';

export interface ShiftTradeRequest {
  id: string;
  org_id: string;
  schedule_id: string | null;
  type: ShiftTradeType;
  status: ShiftTradeStatus;
  source_shift_id: string;
  source_employee_id: string | null;
  target_shift_id: string | null;
  target_employee_id: string | null;
  notes: string | null;
  manager_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  hs_id: number | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  source_shift?: Shift;
  source_employee?: { id: string; full_name: string };
  target_shift?: Shift;
  target_employee?: { id: string; full_name: string };
}

// ── Approval Queue Types ─────────────────────────────────────────────

/** Unified approval item for the approvals page */
export type ApprovalItem =
  | { kind: 'shift_trade'; data: ShiftTradeRequest }
  | { kind: 'time_off'; data: TimeOffRequest }
  | { kind: 'availability'; data: AvailabilityChangeRequest };

export interface PendingCounts {
  shiftTrades: number;
  timeOff: number;
  availability: number;
  total: number;
}

// ── Daypart Productivity Types ───────────────────────────────────────

export interface DaypartProductivity {
  daypartId: string;
  daypartLabel: string;
  forecastSales: number;
  laborHours: number;
  laborCost: number;
  productivity: number; // forecastSales / laborHours
}
