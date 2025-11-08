/**
 * Certification utility functions for calculating PEA Audit Days
 * and determining certification eligibility
 */

/**
 * Calculate the Monday of the 4th full week of a given month.
 * A "full week" now runs Monday–Saturday (Sundays are ignored for scheduling).
 * 
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Date object representing the Monday of the 4th full week
 * 
 * @example
 * // November 2025: Returns November 24, 2025 (Monday)
 * getPEAAuditDay(2025, 11)
 */
function getFirstFullWeekMonday(year: number, month: number): Date {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  const monday = new Date(firstDay);
  monday.setDate(firstDay.getDate() + daysUntilMonday);
  return monday;
}

function getNthFullWeekMonday(year: number, month: number, n: number): Date {
  const firstMonday = getFirstFullWeekMonday(year, month);
  const target = new Date(firstMonday);
  target.setDate(firstMonday.getDate() + (n - 1) * 7);

  const lastDay = new Date(year, month, 0).getDate();
  if (target.getMonth() !== month - 1) {
    const fallback = new Date(firstMonday);
    let candidate = new Date(fallback);
    while (candidate.getMonth() === month - 1) {
      fallback.setTime(candidate.getTime());
      candidate.setDate(candidate.getDate() + 7);
    }
    return fallback;
  }

  return target;
}

function addDays(base: Date, days: number): Date {
  const clone = new Date(base);
  clone.setDate(base.getDate() + days);
  return clone;
}

export function getFourthFullWeekThursday(year: number, month: number): Date {
  const fourthMonday = getNthFullWeekMonday(year, month, 4);
  return addDays(fourthMonday, 3);
}

export function getThirdFullWeekFriday(year: number, month: number): Date {
  const thirdMonday = getNthFullWeekMonday(year, month, 3);
  return addDays(thirdMonday, 4);
}

export function getPEAAuditDay(year: number, month: number): Date {
  return getFourthFullWeekThursday(year, month);
}

/**
 * Check if today is a PEA Audit Day for the current month
 * @returns boolean
 */
export function isTodayPEAAuditDay(): boolean {
  const today = new Date();
  const auditDay = getPEAAuditDay(today.getFullYear(), today.getMonth() + 1);
  return sameDay(today, auditDay);
}

/**
 * Get the next PEA Audit Day from a given date
 * @param fromDate - Starting date (defaults to today)
 * @returns Date of the next PEA Audit Day
 */
export function getNextPEAAuditDay(fromDate: Date = new Date()): Date {
  const currentMonthAudit = getPEAAuditDay(fromDate.getFullYear(), fromDate.getMonth() + 1);

  if (fromDate <= currentMonthAudit) {
    return currentMonthAudit;
  }

  const nextMonth = fromDate.getMonth() + 2;
  const nextYear = nextMonth > 12 ? fromDate.getFullYear() + 1 : fromDate.getFullYear();
  const adjustedMonth = nextMonth > 12 ? 1 : nextMonth;

  return getPEAAuditDay(nextYear, adjustedMonth);
}

/**
 * Get the previous PEA Audit Day from a given date
 * @param fromDate - Starting date (defaults to today)
 * @returns Date of the previous PEA Audit Day
 */
export function getPreviousPEAAuditDay(fromDate: Date = new Date()): Date {
  const currentMonthAudit = getPEAAuditDay(fromDate.getFullYear(), fromDate.getMonth() + 1);

  if (fromDate < currentMonthAudit) {
    const prevMonth = fromDate.getMonth();
    const prevYear = prevMonth < 1 ? fromDate.getFullYear() - 1 : fromDate.getFullYear();
    const adjustedMonth = prevMonth < 1 ? 12 : prevMonth;
    return getPEAAuditDay(prevYear, adjustedMonth);
  }

  return currentMonthAudit;
}

/**
 * Certification threshold for position averages
 */
export const CERTIFICATION_THRESHOLD = 2.75;

/**
 * Check if all position averages meet or exceed the certification threshold
 * @param positionAverages - Map of position names to their averages
 * @param threshold - Minimum average required (default 2.75)
 * @returns boolean
 */
export function allPositionsQualified(
  positionAverages: Record<string, number>,
  threshold: number = CERTIFICATION_THRESHOLD
): boolean {
  const positions = Object.keys(positionAverages);
  
  // No positions means not qualified
  if (positions.length === 0) {
    return false;
  }
  
  // Check if ALL positions meet the threshold
  return positions.every(position => positionAverages[position] >= threshold);
}

/**
 * Location IDs for Buda and West Buda
 */
export const BUDA_LOCATION_IDS = {
  BUDA: process.env.NEXT_PUBLIC_BUDA_LOCATION_ID || '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd',
  WEST_BUDA: process.env.NEXT_PUBLIC_WEST_BUDA_LOCATION_ID || 'e437119c-27d9-4114-9273-350925016738',
};

/**
 * Check if a location ID is eligible for certification tracking
 * @param locationId - The location ID to check
 * @returns boolean
 */
export function isEligibleLocation(locationId: string): boolean {
  return Object.values(BUDA_LOCATION_IDS).includes(locationId);
}

export function isTodayThirdFullWeekFriday(): boolean {
  const today = new Date();
  const thirdFriday = getThirdFullWeekFriday(today.getFullYear(), today.getMonth() + 1);
  return sameDay(today, thirdFriday);
}

export function getNextThirdFullWeekFriday(fromDate: Date = new Date()): Date {
  const currentMonthFriday = getThirdFullWeekFriday(fromDate.getFullYear(), fromDate.getMonth() + 1);
  if (fromDate <= currentMonthFriday) {
    return currentMonthFriday;
  }

  const nextMonth = fromDate.getMonth() + 2;
  const nextYear = nextMonth > 12 ? fromDate.getFullYear() + 1 : fromDate.getFullYear();
  const adjustedMonth = nextMonth > 12 ? 1 : nextMonth;
  return getThirdFullWeekFriday(nextYear, adjustedMonth);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
