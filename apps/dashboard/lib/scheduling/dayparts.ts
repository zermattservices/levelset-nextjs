/** Global daypart definitions.
 *  Dayparts are fixed time windows used across all orgs.
 *  Breakfast starts at location open time (fallback: defaultStart).
 *  Dinner ends at location close time (fallback: defaultEnd). */

export interface Daypart {
  id: string;
  label: string;
  defaultStart: string; // HH:MM — used when business hours are unavailable
  defaultEnd: string;   // HH:MM
}

export const DAYPARTS: readonly Daypart[] = [
  { id: 'breakfast',  label: 'Breakfast',  defaultStart: '06:00', defaultEnd: '10:30' },
  { id: 'lunch',      label: 'Lunch',      defaultStart: '10:30', defaultEnd: '14:00' },
  { id: 'afternoon',  label: 'Afternoon',  defaultStart: '14:00', defaultEnd: '17:00' },
  { id: 'dinner',     label: 'Dinner',     defaultStart: '17:00', defaultEnd: '22:00' },
] as const;

export type DaypartId = 'breakfast' | 'lunch' | 'afternoon' | 'dinner';

/** Parse HH:MM into minutes since midnight. */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Resolve daypart time windows for a given day, using business hours where available.
 *  @param openTime  Location open time (HH:MM) or null
 *  @param closeTime Location close time (HH:MM) or null */
export function resolveDaypartTimes(
  openTime: string | null,
  closeTime: string | null,
): { id: DaypartId; label: string; start: string; end: string }[] {
  return DAYPARTS.map((dp, i) => {
    let start = dp.defaultStart;
    let end = dp.defaultEnd;

    // First daypart: start at location open time if earlier
    if (i === 0 && openTime) {
      const openMin = parseTime(openTime);
      const defaultMin = parseTime(dp.defaultStart);
      if (openMin < defaultMin) start = openTime;
    }

    // Last daypart: end at location close time if later
    if (i === DAYPARTS.length - 1 && closeTime) {
      const closeMin = parseTime(closeTime);
      const defaultMin = parseTime(dp.defaultEnd);
      if (closeMin > defaultMin) end = closeTime;
    }

    return { id: dp.id as DaypartId, label: dp.label, start, end };
  });
}

/** Get the current active daypart based on local time. */
export function getCurrentDaypart(
  resolvedDayparts: { id: DaypartId; start: string; end: string }[],
): DaypartId {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const dp of resolvedDayparts) {
    const startMin = parseTime(dp.start);
    const endMin = parseTime(dp.end);
    if (nowMin >= startMin && nowMin < endMin) {
      return dp.id;
    }
  }

  // If outside all dayparts, return the closest upcoming or the last one
  const first = resolvedDayparts[0];
  const last = resolvedDayparts[resolvedDayparts.length - 1];
  if (first && nowMin < parseTime(first.start)) return first.id;
  return last?.id ?? 'breakfast';
}
