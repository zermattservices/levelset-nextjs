import * as React from 'react';
import { useMemo } from 'react';
import sty from './RequestsMonthlyCalendar.module.css';
import type { TimeOffRequest, ApprovalItem } from '@/lib/scheduling.types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RequestsMonthlyCalendarProps {
  monthStart: Date; // 1st of the month
  timeOffRequests: TimeOffRequest[];
  onRequestClick: (request: ApprovalItem) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Build the full grid of dates for a month view.
 * Starts from the Sunday at or before the 1st, ends at the Saturday
 * at or after the last day of the month.
 */
function getMonthGridDates(monthStart: Date): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(monthStart);
  // Go back to Sunday
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Return all time-off requests that overlap a given calendar day. */
function getRequestsForDay(day: Date, requests: TimeOffRequest[]): TimeOffRequest[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return requests.filter((req) => {
    const reqStart = new Date(req.start_datetime);
    const reqEnd = new Date(req.end_datetime);
    return reqStart <= dayEnd && reqEnd > dayStart;
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RequestsMonthlyCalendar({
  monthStart,
  timeOffRequests,
  onRequestClick,
}: RequestsMonthlyCalendarProps) {
  const dates = useMemo(() => getMonthGridDates(monthStart), [monthStart]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentMonth = monthStart.getMonth();

  return (
    <div className={sty.monthContainer}>
      <div className={sty.monthGrid}>
        {/* Day-of-week header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className={sty.monthHeaderCell}>
            {d}
          </div>
        ))}

        {/* Day cells */}
        {dates.map((day, i) => {
          const isOutsideMonth = day.getMonth() !== currentMonth;
          const isPast = day < today;
          const isToday = day.getTime() === today.getTime();
          const dayRequests = getRequestsForDay(day, timeOffRequests);
          const visibleRequests = dayRequests.slice(0, 3);
          const moreCount = dayRequests.length - 3;

          return (
            <div
              key={i}
              className={classNames(
                sty.monthCell,
                isOutsideMonth && sty.outsideMonth,
                isPast && !isToday && sty.pastDay,
                isToday && sty.todayDay,
              )}
            >
              <span className={sty.dayNumber}>{day.getDate()}</span>
              <div className={sty.chipList}>
                {visibleRequests.map((req) => (
                  <div
                    key={req.id}
                    className={classNames(
                      sty.chip,
                      req.status === 'pending' ? sty.chipPending : sty.chipApproved,
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestClick({ kind: 'time_off', data: req });
                    }}
                    title={`${req.employee?.full_name ?? 'Unknown'} — ${req.status}`}
                  >
                    {req.employee?.full_name ?? 'Unknown'}
                  </div>
                ))}
                {moreCount > 0 && (
                  <span className={sty.moreChip}>+{moreCount} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
