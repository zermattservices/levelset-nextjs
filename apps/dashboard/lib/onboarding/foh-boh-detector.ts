/**
 * FOH/BOH auto-detection from HotSchedules job names.
 *
 * Used during onboarding employee import to pre-fill is_foh/is_boh
 * based on the jobs an employee is assigned to in HotSchedules.
 */

// Common CFA FOH job name keywords (case-insensitive matching)
const FOH_KEYWORDS = [
  'ipos',
  'drinks',
  'drink',
  'beverage',
  'host',
  'runner',
  'omd',
  'outside meal delivery',
  'bagging',
  'bagger',
  'drive-thru',
  'drive thru',
  'dt ',
  'front counter',
  'front of house',
  'foh',
  'dining room',
  'cashier',
  'headset',
  'order taker',
  'curbside',
  'mobile',
  'team lead foh',
  'tl foh',
];

// Common CFA BOH job name keywords (case-insensitive matching)
const BOH_KEYWORDS = [
  'primary',
  'secondary',
  'machines',
  'machine',
  'breader',
  'breading',
  'prep',
  'fries',
  'fry',
  'kitchen',
  'grill',
  'back of house',
  'boh',
  'cook',
  'centerline',
  'center line',
  'filet',
  'nugget',
  'strip',
  'team lead boh',
  'tl boh',
];

export interface FohBohResult {
  isFoh: boolean;
  isBoh: boolean;
}

/**
 * Detect FOH/BOH assignment from a list of HotSchedules job names.
 *
 * If an employee has ANY FOH job assignment → isFoh = true
 * If an employee has ANY BOH job assignment → isBoh = true
 * Both can be true if they work cross-trained positions.
 */
export function detectFohBoh(jobNames: string[]): FohBohResult {
  let isFoh = false;
  let isBoh = false;

  for (const job of jobNames) {
    const lower = job.toLowerCase().trim();

    if (!isFoh && FOH_KEYWORDS.some(kw => lower.includes(kw))) {
      isFoh = true;
    }

    if (!isBoh && BOH_KEYWORDS.some(kw => lower.includes(kw))) {
      isBoh = true;
    }

    // Early exit if both are detected
    if (isFoh && isBoh) break;
  }

  return { isFoh, isBoh };
}

/**
 * Determine if an employee is likely salaried based on HS data.
 * Salaried employees in HotSchedules typically have type === 1
 * or payType set to 'salary'.
 */
export function isSalariedEmployee(employeeData: {
  type?: number;
  payType?: string;
}): boolean {
  if (employeeData.type === 1) return true;
  if (employeeData.payType?.toLowerCase() === 'salary') return true;
  return false;
}
