/**
 * HotSchedules API response types
 *
 * These interfaces match the schemas returned by the HS REST API endpoints.
 * All pay fields (regPay, ovtPay, totalCost, payRate on userJobs) are in CENTS.
 * Forecast volumes (storeVolume, SLS projected amount) are in DOLLARS.
 * Timestamps (birthDate, hireDate) are Unix MILLISECONDS.
 * Shift duration is in MINUTES.
 */

// ---------------------------------------------------------------------------
// Shifts — GET /hs/spring/scheduling/shift/?start={ISO}&end={ISO}
// ---------------------------------------------------------------------------
export interface HotSchedulesShift {
  id: number;
  ownerId: number; // Employee ID assigned (0 or absent = open/house shift)
  startDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" 24h
  duration: number; // Minutes (range: 30-720)
  jobId: number; // Job position ID
  roleId: number; // Role/schedule group ID
  house: boolean; // true = open/unassigned shift
  scheduled: boolean;
  regHours: number;
  ovtHours: number;
  regPay: number; // CENTS
  ovtPay: number; // CENTS
  totalCost: number; // CENTS
  clientId: number;
  shiftNote: string | null;
  mbpBreaks: HotSchedulesBreak[];
  special: boolean;
  offered: boolean;
  [key: string]: any;
}

export interface HotSchedulesBreak {
  startTime?: string; // "HH:MM"
  duration?: number; // Minutes
  paid?: boolean;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Jobs — GET /hs/spring/client/jobs/
// ---------------------------------------------------------------------------
export interface HotSchedulesJob {
  id: number;
  jobName: string;
  shortName: string;
  payRate: number; // CENTS
  defaultScheduleId: number; // Links to role
  disabled: boolean;
  visible: boolean;
  externalRef?: string;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Roles — GET /hs/spring/client/roles/
// ---------------------------------------------------------------------------
export interface HotSchedulesRole {
  id: number;
  name: string;
  disabled: boolean;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Bootstrap — GET /hs/spring/scheduling/bootstrap (subset)
// ---------------------------------------------------------------------------
export interface HotSchedulesBootstrap {
  id: number; // clientId (store)
  userId: number; // Current user's employeeId
  currentWeekStartDate: string; // "YYYY-MM-DD"
  utcOffset: number; // Minutes from UTC (e.g. -360 for CST)
  tz: string; // e.g. "America/Chicago"
  scheduleMinuteInterval: number; // e.g. 15
  clientWorkWeekStart: number; // Day of week (6 = Saturday)
  userJobs: HotSchedulesUserJob[];
  jobs: HotSchedulesJob[];
  schedules: HotSchedulesRole[];
  skills?: HotSchedulesSkill[];
  dayParts?: any[];
  clientSettings?: Record<string, any>;
  [key: string]: any;
}

export interface HotSchedulesUserJob {
  employeeId: number;
  jobId: number;
  skillLevel: number;
  skillLevelId: number;
  payRate: number; // CENTS
  primary: boolean;
  [key: string]: any;
}

export interface HotSchedulesSkill {
  skillId: number;
  rank: number;
  name: string; // "01", "02", "03"
}

// ---------------------------------------------------------------------------
// Forecast — GET /hs/spring/forecast/forecast-summary/{YYYY-MM-DD}
// ---------------------------------------------------------------------------
export interface HotSchedulesForecastDaily {
  date: string; // "YYYY-MM-DD"
  volume: number; // DOLLARS for Sales, count for Transactions
  storeName: string; // "Sales" or "Transactions"
  storeType: number; // 0 = Sales, 6 = Transactions
}

// ---------------------------------------------------------------------------
// 15-min Interval — GET /hs/spring/forecast/lp-store-volume-data/?forecastId={id}
// ---------------------------------------------------------------------------
export interface HotSchedulesForecastInterval {
  forecastId: number;
  dateTime: string; // ISO datetime e.g. "2026-02-23T06:15:00.000"
  storeVolume: number; // DOLLARS
  volumeTypeId: number; // 0 = Sales, 6 = Transactions
}

// ---------------------------------------------------------------------------
// Benchmark — GET /hs/spring/benchmark/sales?amount={sales}&date={DATE}
// ---------------------------------------------------------------------------
export interface HotSchedulesBenchmark {
  date: string;
  salesAmount: number;
  benchmarkLevels: Array<{
    benchmarkLabel: string; // "Top 10%", "Top 20%", etc.
    benchmarkHours: number;
  }>;
}

// ---------------------------------------------------------------------------
// Time-Off — GET /hs/rest-session/timeoff/range/?start={ISO}&end={ISO}
// ---------------------------------------------------------------------------
export interface HotSchedulesTimeOff {
  id: number;
  employeeId: number;
  requestType: number;
  note: string | null;
  startDateTime: string; // ISO with timezone
  endDateTime: string; // ISO with timezone
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Time-Off Status — GET /hs/rest-session/timeoff/range/status/
// ---------------------------------------------------------------------------
export interface HotSchedulesTimeOffStatus {
  timeoffRangeId: number;
  status: string; // "Approved", "Pending", "Denied"
}

// ---------------------------------------------------------------------------
// Availability — GET /hs/rest-session/availability-calendar/
// ---------------------------------------------------------------------------
export interface HotSchedulesAvailability {
  employeeId: number;
  approvalStatus: number;
  ranges: Array<{
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    weekDay: number; // 1=Sun through 7=Sat
  }>;
  threshold: {
    hoursInWeekMax: number | null;
    daysInWeekMax: number | null;
  };
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Full sync payload — POST /api/employees/sync-hotschedules
// ---------------------------------------------------------------------------
export interface HotSchedulesSyncPayload {
  employees: any[]; // Uses existing HotSchedulesEmployee from sync-hotschedules.ts
  shifts?: HotSchedulesShift[];
  jobs?: HotSchedulesJob[];
  roles?: HotSchedulesRole[];
  bootstrap?: HotSchedulesBootstrap;
  forecasts?: {
    daily?: HotSchedulesForecastDaily[];
    intervals?: HotSchedulesForecastInterval[];
    benchmarks?: HotSchedulesBenchmark[];
  };
  slsProjected?: Array<{ dateOfBusiness: string; amount: number }>;
  timeOff?: HotSchedulesTimeOff[];
  timeOffStatuses?: HotSchedulesTimeOffStatus[];
  availability?: HotSchedulesAvailability[];
  weekStartDate?: string; // "YYYY-MM-DD" — the week being viewed
  location_id?: string;
  org_id?: string;
}

// ---------------------------------------------------------------------------
// Scheduling sync analysis — stored in hs_sync_notifications.sync_data
// ---------------------------------------------------------------------------
export interface SchedulingSyncAnalysis {
  /** Total shifts received for the target week */
  total_shifts: number;
  /** Total unique employees with shifts */
  total_employees_scheduled: number;
  /** Total hours scheduled */
  total_hours: number;
  /** Estimated labor cost from HS pay data (dollars) */
  total_estimated_cost: number;
  /** HS jobs that are used in this week's shifts */
  hs_jobs_used: Array<{
    hs_job_id: number;
    hs_job_name: string;
    hs_role_id: number;
    hs_role_name: string;
    shift_count: number;
  }>;
  /** Jobs already mapped to Levelset positions */
  mapped_jobs: Array<{
    hs_job_id: number;
    hs_job_name: string;
    position_id: string;
    position_name: string;
  }>;
  /** Jobs not yet mapped — user must map in modal */
  unmapped_jobs: Array<{
    hs_job_id: number;
    hs_job_name: string;
    hs_role_id: number;
    hs_role_name: string;
    shift_count: number;
  }>;
  /** Shifts grouped by employee hs_id for review display */
  shifts_by_employee: Array<{
    hs_employee_id: number;
    employee_name: string;
    levelset_employee_id: string | null;
    shifts: Array<{
      hs_shift_id: number;
      date: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      hs_job_id: number;
      hs_job_name: string;
      is_house_shift: boolean;
      break_minutes: number;
      notes: string | null;
    }>;
  }>;
}
