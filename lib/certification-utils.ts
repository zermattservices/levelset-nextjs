/**
 * Certification utility functions for calculating PEA Audit Days
 * and determining certification eligibility
 */

/**
 * Calculate the Monday of the 4th full week of a given month.
 * A "full week" is defined as Sun-Sat where all 7 days fall within that month.
 * 
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Date object representing the Monday of the 4th full week
 * 
 * @example
 * // November 2025: Returns November 24, 2025 (Monday)
 * getPEAAuditDay(2025, 11)
 */
export function getPEAAuditDay(year: number, month: number): Date {
  // Get the first day of the month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // Last day of the month
  
  // Find all full weeks (Sun-Sat) where all 7 days are in this month
  const fullWeeks: Date[] = [];
  
  // Start from the first day and scan for full weeks
  let currentDate = new Date(firstDay);
  
  while (currentDate <= lastDay) {
    // Find the next Sunday
    const dayOfWeek = currentDate.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunday = new Date(currentDate);
    sunday.setDate(currentDate.getDate() + daysUntilSunday);
    
    // Check if this Sunday + 6 days (full week) is still in the same month
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    // If both Sunday and Saturday are in the target month, this is a full week
    if (sunday.getMonth() === month - 1 && saturday.getMonth() === month - 1) {
      // Store the Monday of this week (Sunday + 1 day)
      const monday = new Date(sunday);
      monday.setDate(sunday.getDate() + 1);
      fullWeeks.push(monday);
    }
    
    // Move to the next potential week start
    if (daysUntilSunday === 0) {
      currentDate.setDate(currentDate.getDate() + 7);
    } else {
      currentDate.setDate(currentDate.getDate() + daysUntilSunday);
    }
  }
  
  // Return the Monday of the 4th full week
  if (fullWeeks.length >= 4) {
    return fullWeeks[3]; // 0-indexed, so index 3 = 4th week
  }
  
  // Fallback: if there aren't 4 full weeks, return the last Monday found
  // This should be rare, but handles edge cases
  if (fullWeeks.length > 0) {
    return fullWeeks[fullWeeks.length - 1];
  }
  
  // Ultimate fallback: just return a Monday in the 4th week of the month
  const fallbackDate = new Date(year, month - 1, 22); // Roughly 4th week
  const fallbackDay = fallbackDate.getDay();
  const daysToMonday = fallbackDay === 0 ? 1 : fallbackDay === 1 ? 0 : 8 - fallbackDay;
  fallbackDate.setDate(fallbackDate.getDate() + daysToMonday);
  return fallbackDate;
}

/**
 * Check if today is a PEA Audit Day for the current month
 * @returns boolean
 */
export function isTodayPEAAuditDay(): boolean {
  const today = new Date();
  const auditDay = getPEAAuditDay(today.getFullYear(), today.getMonth() + 1);
  
  return (
    today.getFullYear() === auditDay.getFullYear() &&
    today.getMonth() === auditDay.getMonth() &&
    today.getDate() === auditDay.getDate()
  );
}

/**
 * Get the next PEA Audit Day from a given date
 * @param fromDate - Starting date (defaults to today)
 * @returns Date of the next PEA Audit Day
 */
export function getNextPEAAuditDay(fromDate: Date = new Date()): Date {
  const currentMonthAudit = getPEAAuditDay(fromDate.getFullYear(), fromDate.getMonth() + 1);
  
  // If current month's audit day hasn't passed, return it
  if (fromDate <= currentMonthAudit) {
    return currentMonthAudit;
  }
  
  // Otherwise, return next month's audit day
  const nextMonth = fromDate.getMonth() + 2; // +1 for next month, +1 for 1-indexed
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
  
  // If current month's audit day hasn't passed yet, go to previous month
  if (fromDate < currentMonthAudit) {
    const prevMonth = fromDate.getMonth(); // Already 0-indexed
    const prevYear = prevMonth < 1 ? fromDate.getFullYear() - 1 : fromDate.getFullYear();
    const adjustedMonth = prevMonth < 1 ? 12 : prevMonth;
    return getPEAAuditDay(prevYear, adjustedMonth);
  }
  
  // Current month's audit day has passed, so it's the previous audit day
  return currentMonthAudit;
}

/**
 * Check if all position averages meet or exceed the certification threshold
 * @param positionAverages - Map of position names to their averages
 * @param threshold - Minimum average required (default 2.85)
 * @returns boolean
 */
export function allPositionsQualified(
  positionAverages: Record<string, number>,
  threshold: number = 2.85
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
 * Location IDs for Buda and West Buda (these will need to be updated with actual IDs)
 */
export const BUDA_LOCATION_IDS = {
  BUDA: process.env.NEXT_PUBLIC_BUDA_LOCATION_ID || 'buda-location-id',
  WEST_BUDA: process.env.NEXT_PUBLIC_WEST_BUDA_LOCATION_ID || 'west-buda-location-id',
};

/**
 * Check if a location ID is eligible for certification tracking
 * @param locationId - The location ID to check
 * @returns boolean
 */
export function isEligibleLocation(locationId: string): boolean {
  return Object.values(BUDA_LOCATION_IDS).includes(locationId);
}
