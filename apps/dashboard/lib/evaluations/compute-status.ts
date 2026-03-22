import type { EvaluationCadence, EvaluationStatus, CadencePeriod } from './types';

/**
 * Get the current cadence period boundaries for a given cadence type.
 * All periods are calendar-aligned.
 */
export function getCurrentPeriod(cadence: EvaluationCadence, referenceDate?: Date): CadencePeriod {
  const now = referenceDate ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (cadence) {
    case 'monthly':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    case 'quarterly': {
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, qStart, 1),
        end: new Date(year, qStart + 3, 0, 23, 59, 59, 999),
      };
    }
    case 'semi_annual': {
      const hStart = month < 6 ? 0 : 6;
      return {
        start: new Date(year, hStart, 1),
        end: new Date(year, hStart + 6, 0, 23, 59, 59, 999),
      };
    }
    case 'annual':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
  }
}

/**
 * Get the period start date as ISO string for use in overrides.
 */
export function getPeriodStartISO(cadence: EvaluationCadence, referenceDate?: Date): string {
  const period = getCurrentPeriod(cadence, referenceDate);
  const d = period.start;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Derive evaluation status from last submission date, cadence, overrides, and current date.
 */
export function computeStatus(
  cadence: EvaluationCadence,
  lastSubmissionAt: string | null,
  overrideType: string | null,
  deferUntil: string | null,
  now?: Date
): EvaluationStatus {
  if (overrideType === 'skip') return 'skipped';

  const currentDate = now ?? new Date();

  if (overrideType === 'defer' && deferUntil) {
    const deferDate = new Date(deferUntil);
    if (currentDate < deferDate) return 'not_yet_due';
  }

  const period = getCurrentPeriod(cadence, currentDate);

  if (lastSubmissionAt) {
    const submissionDate = new Date(lastSubmissionAt);
    if (submissionDate >= period.start && submissionDate <= period.end) {
      return 'completed';
    }
  }

  if (currentDate > period.end) {
    return 'overdue';
  }

  return 'due';
}

/**
 * Get the due date (end of current period) for display.
 * Returns YYYY-MM-DD in local time (not UTC) to avoid timezone shift.
 */
export function getDueDate(cadence: EvaluationCadence, referenceDate?: Date): string {
  const period = getCurrentPeriod(cadence, referenceDate);
  const d = period.end;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
