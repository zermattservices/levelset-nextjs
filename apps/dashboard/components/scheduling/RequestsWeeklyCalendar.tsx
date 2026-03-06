import * as React from 'react';
import { useMemo } from 'react';
import sty from './RequestsWeeklyCalendar.module.css';
import type { TimeOffRequest, ApprovalItem } from '@/lib/scheduling.types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RequestsWeeklyCalendarProps {
  weekStart: Date; // Sunday
  timeOffRequests: TimeOffRequest[];
  employees: { id: string; full_name: string }[];
  onRequestClick: (request: ApprovalItem) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime12h(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function getBarLabel(req: TimeOffRequest): string {
  const start = new Date(req.start_datetime);
  const end = new Date(req.end_datetime);
  // All day check: both start and end at midnight
  if (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0) {
    return 'All day';
  }
  return `${formatTime12h(start)} \u2013 ${formatTime12h(end)}`;
}

/**
 * Compute grid-column start and end for a request bar.
 * Grid columns: 1 = label, 2..8 = Sun..Sat
 */
function getBarColumns(
  req: TimeOffRequest,
  weekStart: Date,
): { startCol: number; endCol: number } {
  const reqStart = new Date(req.start_datetime);
  const reqEnd = new Date(req.end_datetime);

  const weekStartTime = new Date(weekStart).setHours(0, 0, 0, 0);
  const msPerDay = 86400000;

  // Day offset from weekStart (can be negative if request starts before the week)
  const startDayOffset = Math.floor((reqStart.getTime() - weekStartTime) / msPerDay);

  // End offset: for all-day requests ending at midnight, the end is the start of the next day
  let endDayOffset: number;
  if (reqEnd.getHours() === 0 && reqEnd.getMinutes() === 0) {
    // Midnight means "end of previous day", so this day is not included
    endDayOffset = Math.floor((reqEnd.getTime() - weekStartTime) / msPerDay);
  } else {
    // Partial day — include this day
    endDayOffset = Math.floor((reqEnd.getTime() - weekStartTime) / msPerDay) + 1;
  }

  // Grid columns are 2-indexed (column 1 is the label, columns 2-8 are Sun-Sat)
  const startCol = Math.max(startDayOffset, 0) + 2;
  const endCol = Math.min(endDayOffset, 7) + 2;

  return { startCol, endCol };
}

function isRequestPast(req: TimeOffRequest, today: Date): boolean {
  const end = new Date(req.end_datetime);
  return end < today;
}

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RequestsWeeklyCalendar({
  weekStart,
  timeOffRequests,
  employees,
  onRequestClick,
}: RequestsWeeklyCalendarProps) {
  // Generate 7 dates starting from weekStart (Sunday)
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [weekStart]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Group requests by employee
  const requestsByEmployee = useMemo(() => {
    const map = new Map<string, TimeOffRequest[]>();
    for (const req of timeOffRequests) {
      if (!map.has(req.employee_id)) {
        map.set(req.employee_id, []);
      }
      map.get(req.employee_id)!.push(req);
    }
    return map;
  }, [timeOffRequests]);

  // Sort employees:
  // 1. Those with pending requests (oldest created_at first)
  // 2. Those with approved requests only (alphabetical)
  // 3. Remaining employees with no requests (alphabetical)
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aReqs = requestsByEmployee.get(a.id) || [];
      const bReqs = requestsByEmployee.get(b.id) || [];
      const aHasPending = aReqs.some((r) => r.status === 'pending');
      const bHasPending = bReqs.some((r) => r.status === 'pending');
      const aHasReqs = aReqs.length > 0;
      const bHasReqs = bReqs.length > 0;

      if (aHasPending && !bHasPending) return -1;
      if (!aHasPending && bHasPending) return 1;
      if (aHasPending && bHasPending) {
        const aOldest = Math.min(
          ...aReqs
            .filter((r) => r.status === 'pending')
            .map((r) => new Date(r.created_at!).getTime()),
        );
        const bOldest = Math.min(
          ...bReqs
            .filter((r) => r.status === 'pending')
            .map((r) => new Date(r.created_at!).getTime()),
        );
        return aOldest - bOldest;
      }
      if (aHasReqs && !bHasReqs) return -1;
      if (!aHasReqs && bHasReqs) return 1;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [employees, requestsByEmployee]);

  if (sortedEmployees.length === 0) {
    return (
      <div className={sty.grid}>
        {/* Header row */}
        <div className={sty.cornerCell} />
        {days.map((day, i) => (
          <div
            key={i}
            className={classNames(sty.headerCell, isSameDay(day, today) && sty.todayHeader)}
          >
            <span className={sty.headerDay}>{DAY_ABBREVS[day.getDay()]}</span>
            <span className={sty.headerDate}>{day.getDate()}</span>
          </div>
        ))}
        <div className={sty.emptyCalendar}>No employees found for this location.</div>
      </div>
    );
  }

  return (
    <div className={sty.grid}>
      {/* Header row */}
      <div className={sty.cornerCell} />
      {days.map((day, i) => (
        <div
          key={i}
          className={classNames(sty.headerCell, isSameDay(day, today) && sty.todayHeader)}
        >
          <span className={sty.headerDay}>{DAY_ABBREVS[day.getDay()]}</span>
          <span className={sty.headerDate}>{day.getDate()}</span>
        </div>
      ))}

      {/* Employee rows */}
      {sortedEmployees.map((emp, empIdx) => {
        const empRequests = requestsByEmployee.get(emp.id) || [];
        const rowNum = empIdx + 2; // row 1 is header

        return (
          <React.Fragment key={emp.id}>
            {/* Row label */}
            <div className={sty.rowLabel} style={{ gridRow: rowNum }}>
              <span className={sty.empName}>{emp.full_name}</span>
            </div>

            {/* Day cells */}
            {days.map((day, colIdx) => (
              <div
                key={`${emp.id}-${colIdx}`}
                className={classNames(
                  sty.dayCell,
                  day < today && !isSameDay(day, today) && sty.pastCell,
                  isSameDay(day, today) && sty.todayCell,
                )}
                style={{ gridRow: rowNum, gridColumn: colIdx + 2 }}
              />
            ))}

            {/* Request bars */}
            {empRequests.map((req) => {
              const { startCol, endCol } = getBarColumns(req, weekStart);
              // Skip if fully outside visible range (columns 2-8)
              if (startCol >= 9 || endCol <= 1) return null;
              const clampedStart = Math.max(startCol, 2);
              const clampedEnd = Math.min(endCol, 9); // columns 2..8, so end at 9
              if (clampedStart >= clampedEnd) return null;

              return (
                <div
                  key={req.id}
                  className={classNames(
                    sty.bar,
                    req.status === 'pending' ? sty.barPending : sty.barApproved,
                    isRequestPast(req, today) && sty.barPast,
                  )}
                  style={{
                    gridRow: rowNum,
                    gridColumn: `${clampedStart} / ${clampedEnd}`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestClick({ kind: 'time_off', data: req });
                  }}
                >
                  <span className={sty.barText}>{getBarLabel(req)}</span>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
