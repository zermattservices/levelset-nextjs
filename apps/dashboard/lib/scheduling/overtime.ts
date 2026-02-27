/**
 * Overtime calculation utility.
 *
 * Rules are state-based and stored in the `overtime_rules` table.
 * Most states follow federal FLSA: >40 hrs/week = 1.5x.
 * California adds daily OT: >8 hrs/day = 1.5x, >12 hrs/day = 2.0x.
 *
 * OT is computed on the fly from the week's shift data — it is NOT
 * stored per-shift because adding/removing any shift changes the OT
 * picture for every other shift belonging to the same employee.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface OvertimeRule {
  rule_type: 'daily' | 'weekly' | 'seventh_consecutive_day';
  threshold_hours: number;
  multiplier: number;
  priority: number;
}

/** Minimal shift info needed for OT calculation. */
export interface ShiftForOT {
  id: string;
  employee_id: string;
  shift_date: string;      // YYYY-MM-DD
  start_time: string;       // HH:MM
  end_time: string;          // HH:MM
  break_minutes: number;
  hourly_rate: number;       // actual_pay ?? calculated_pay
}

/** Per-shift OT breakdown. */
export interface ShiftOTResult {
  shift_id: string;
  regular_hours: number;
  ot_hours_15x: number;     // hours at 1.5x
  ot_hours_2x: number;      // hours at 2.0x (CA daily >12h)
  ot_premium: number;       // extra cost beyond base rate
}

/** Per-employee OT summary for the week. */
export interface EmployeeOTResult {
  employee_id: string;
  total_hours: number;
  regular_hours: number;
  ot_hours: number;
  regular_cost: number;
  ot_premium: number;       // additional cost from OT multipliers
  total_cost: number;       // regular_cost + ot_premium
  by_shift: Record<string, ShiftOTResult>;
}

/** Overall week OT summary. */
export interface WeeklyOTSummary {
  total_regular_hours: number;
  total_ot_hours: number;
  total_regular_cost: number;
  total_ot_premium: number;
  total_cost: number;
  by_employee: Record<string, EmployeeOTResult>;
}

// ── Defaults ─────────────────────────────────────────────────────────

/** Federal FLSA default rules (used when no state-specific rules exist). */
export const DEFAULT_OT_RULES: OvertimeRule[] = [
  { rule_type: 'weekly', threshold_hours: 40, multiplier: 1.5, priority: 0 },
];

// ── Helpers ──────────────────────────────────────────────────────────

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function shiftNetHours(shift: ShiftForOT): number {
  const start = parseTime(shift.start_time);
  let end = parseTime(shift.end_time);
  if (end <= start) end += 24 * 60; // cross-day
  return Math.max(0, (end - start) / 60 - (shift.break_minutes || 0) / 60);
}

// ── Core Calculation ─────────────────────────────────────────────────

/**
 * Calculate overtime for all shifts in a week, grouped by employee.
 *
 * @param shifts   All shifts for the week (with hourly_rate populated)
 * @param rules    Overtime rules for the location's state
 * @returns        WeeklyOTSummary with per-employee and per-shift breakdowns
 */
export function calculateWeeklyOvertime(
  shifts: ShiftForOT[],
  rules: OvertimeRule[],
): WeeklyOTSummary {
  // Group shifts by employee
  const byEmployee = new Map<string, ShiftForOT[]>();
  for (const s of shifts) {
    if (!s.employee_id || !s.hourly_rate) continue;
    const list = byEmployee.get(s.employee_id) || [];
    list.push(s);
    byEmployee.set(s.employee_id, list);
  }

  const hasDailyRules = rules.some(r => r.rule_type === 'daily');
  const weeklyRule = rules
    .filter(r => r.rule_type === 'weekly')
    .sort((a, b) => a.threshold_hours - b.threshold_hours)[0]; // lowest threshold
  const dailyRules = rules
    .filter(r => r.rule_type === 'daily')
    .sort((a, b) => a.threshold_hours - b.threshold_hours);

  const summary: WeeklyOTSummary = {
    total_regular_hours: 0,
    total_ot_hours: 0,
    total_regular_cost: 0,
    total_ot_premium: 0,
    total_cost: 0,
    by_employee: {},
  };

  Array.from(byEmployee.entries()).forEach(([empId, empShifts]) => {
    const empResult = hasDailyRules
      ? calculateWithDailyOT(empShifts, dailyRules, weeklyRule)
      : calculateWeeklyOnlyOT(empShifts, weeklyRule);

    summary.by_employee[empId] = empResult;
    summary.total_regular_hours += empResult.regular_hours;
    summary.total_ot_hours += empResult.ot_hours;
    summary.total_regular_cost += empResult.regular_cost;
    summary.total_ot_premium += empResult.ot_premium;
    summary.total_cost += empResult.total_cost;
  });

  return summary;
}

/**
 * Weekly-only OT (federal FLSA, most states).
 * Shifts are ordered chronologically; hours beyond the threshold
 * are OT and paid at the multiplier rate.
 */
function calculateWeeklyOnlyOT(
  shifts: ShiftForOT[],
  weeklyRule: OvertimeRule | undefined,
): EmployeeOTResult {
  const sorted = [...shifts].sort((a, b) => {
    if (a.shift_date !== b.shift_date) return a.shift_date.localeCompare(b.shift_date);
    return parseTime(a.start_time) - parseTime(b.start_time);
  });

  const empId = sorted[0].employee_id;
  const rate = sorted[0].hourly_rate;
  const threshold = weeklyRule?.threshold_hours ?? 40;
  const multiplier = weeklyRule?.multiplier ?? 1.5;

  let cumHours = 0;
  let totalRegular = 0;
  let totalOT = 0;
  let regularCost = 0;
  let otPremium = 0;
  const byShift: Record<string, ShiftOTResult> = {};

  for (const shift of sorted) {
    const hours = shiftNetHours(shift);
    const shiftRate = shift.hourly_rate;

    let regHours: number;
    let otHours: number;

    if (cumHours >= threshold) {
      // Already past threshold — entire shift is OT
      regHours = 0;
      otHours = hours;
    } else if (cumHours + hours > threshold) {
      // This shift crosses the threshold
      regHours = threshold - cumHours;
      otHours = hours - regHours;
    } else {
      // Entirely regular
      regHours = hours;
      otHours = 0;
    }

    cumHours += hours;
    totalRegular += regHours;
    totalOT += otHours;
    regularCost += regHours * shiftRate;
    // OT premium is the EXTRA cost: (multiplier - 1) * rate * hours
    const shiftOTPremium = otHours * shiftRate * (multiplier - 1);
    otPremium += shiftOTPremium;

    byShift[shift.id] = {
      shift_id: shift.id,
      regular_hours: round2(regHours),
      ot_hours_15x: round2(otHours),
      ot_hours_2x: 0,
      ot_premium: round2(shiftOTPremium),
    };
  }

  return {
    employee_id: empId,
    total_hours: round2(totalRegular + totalOT),
    regular_hours: round2(totalRegular),
    ot_hours: round2(totalOT),
    regular_cost: round2(regularCost),
    ot_premium: round2(otPremium),
    total_cost: round2(regularCost + otPremium + totalOT * rate),
    by_shift: byShift,
  };
}

/**
 * Daily + weekly OT (California).
 *
 * 1) Apply daily OT first: for each day, hours >8 at 1.5x, hours >12 at 2.0x.
 * 2) Apply weekly OT: hours >40/week that were NOT already counted as daily OT
 *    get 1.5x premium.
 *
 * This prevents double-counting — daily OT hours are subtracted from the
 * weekly total before applying the weekly threshold.
 */
function calculateWithDailyOT(
  shifts: ShiftForOT[],
  dailyRules: OvertimeRule[],
  weeklyRule: OvertimeRule | undefined,
): EmployeeOTResult {
  const sorted = [...shifts].sort((a, b) => {
    if (a.shift_date !== b.shift_date) return a.shift_date.localeCompare(b.shift_date);
    return parseTime(a.start_time) - parseTime(b.start_time);
  });

  const empId = sorted[0].employee_id;
  const byShift: Record<string, ShiftOTResult> = {};

  // Group shifts by day
  const byDay = new Map<string, ShiftForOT[]>();
  for (const s of sorted) {
    const list = byDay.get(s.shift_date) || [];
    list.push(s);
    byDay.set(s.shift_date, list);
  }

  // Find daily thresholds
  const daily8 = dailyRules.find(r => r.threshold_hours === 8);
  const daily12 = dailyRules.find(r => r.threshold_hours === 12);
  const threshold8 = daily8?.threshold_hours ?? 8;
  const multiplier15 = daily8?.multiplier ?? 1.5;
  const threshold12 = daily12?.threshold_hours ?? 12;
  const multiplier2 = daily12?.multiplier ?? 2.0;
  const weeklyThreshold = weeklyRule?.threshold_hours ?? 40;
  const weeklyMultiplier = weeklyRule?.multiplier ?? 1.5;

  // Initialize per-shift results
  for (const s of sorted) {
    byShift[s.id] = {
      shift_id: s.id,
      regular_hours: shiftNetHours(s),
      ot_hours_15x: 0,
      ot_hours_2x: 0,
      ot_premium: 0,
    };
  }

  // Pass 1: Apply daily OT
  let totalDailyOTHours = 0;

  Array.from(byDay.values()).forEach((dayShifts) => {
    let dailyCum = 0;

    for (const shift of dayShifts) {
      const hours = shiftNetHours(shift);
      const result = byShift[shift.id];

      // Determine what portion of this shift falls in each OT tier
      const prevCum = dailyCum;
      dailyCum += hours;

      let ot15x = 0;
      let ot2x = 0;
      let reg = hours;

      if (dailyCum > threshold12) {
        // Some hours are at 2x
        const hoursAbove12 = Math.min(hours, dailyCum - threshold12);
        ot2x = hoursAbove12;
        // Hours between 8 and 12 (in this shift)
        const effectiveStart8 = Math.max(prevCum, threshold8);
        if (prevCum < threshold12) {
          ot15x = Math.max(0, Math.min(dailyCum, threshold12) - effectiveStart8);
        }
        reg = hours - ot15x - ot2x;
      } else if (dailyCum > threshold8) {
        // Some hours at 1.5x, none at 2x
        const hoursAbove8 = Math.min(hours, dailyCum - Math.max(prevCum, threshold8));
        ot15x = hoursAbove8;
        reg = hours - ot15x;
      }

      result.regular_hours = round2(reg);
      result.ot_hours_15x = round2(ot15x);
      result.ot_hours_2x = round2(ot2x);
      result.ot_premium = round2(
        ot15x * shift.hourly_rate * (multiplier15 - 1) +
        ot2x * shift.hourly_rate * (multiplier2 - 1),
      );

      totalDailyOTHours += ot15x + ot2x;
    }
  });

  // Pass 2: Apply weekly OT (only to hours not already marked as daily OT)
  // Total non-OT hours across the week
  let totalRegularHours = 0;
  for (const s of sorted) {
    totalRegularHours += byShift[s.id].regular_hours;
  }

  if (totalRegularHours > weeklyThreshold) {
    // Apply weekly OT to the excess regular hours
    let weeklyOTRemaining = totalRegularHours - weeklyThreshold;

    // Walk shifts in reverse chronological order — later shifts become OT first
    const reversed = [...sorted].reverse();
    for (const shift of reversed) {
      if (weeklyOTRemaining <= 0) break;
      const result = byShift[shift.id];
      if (result.regular_hours <= 0) continue;

      const convertHours = Math.min(result.regular_hours, weeklyOTRemaining);
      result.regular_hours = round2(result.regular_hours - convertHours);
      result.ot_hours_15x = round2(result.ot_hours_15x + convertHours);
      result.ot_premium = round2(
        result.ot_premium + convertHours * shift.hourly_rate * (weeklyMultiplier - 1),
      );
      weeklyOTRemaining -= convertHours;
    }
  }

  // Aggregate
  let totalHours = 0;
  let regularHours = 0;
  let otHours = 0;
  let regularCost = 0;
  let otPremium = 0;

  for (const shift of sorted) {
    const result = byShift[shift.id];
    const hours = shiftNetHours(shift);
    totalHours += hours;
    regularHours += result.regular_hours;
    otHours += result.ot_hours_15x + result.ot_hours_2x;
    regularCost += hours * shift.hourly_rate; // base cost for all hours
    otPremium += result.ot_premium;
  }

  return {
    employee_id: empId,
    total_hours: round2(totalHours),
    regular_hours: round2(regularHours),
    ot_hours: round2(otHours),
    regular_cost: round2(regularCost),
    ot_premium: round2(otPremium),
    total_cost: round2(regularCost + otPremium),
    by_shift: byShift,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
