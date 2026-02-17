import * as React from 'react';
import sty from './LaborSpreadTab.module.css';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Shift, LaborSummary, TimeViewMode } from '@/lib/scheduling.types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LaborSpreadTabProps {
  shifts: Shift[];
  laborSummary: LaborSummary;
  days: string[];
  canViewPay: boolean;
  timeViewMode: TimeViewMode;
  selectedDay: string;
  /** Hover time in minutes-of-day (0-1440) from ScheduleGrid, or null */
  externalHoverMinute?: number | null;
  /** Called when user hovers inside the chart — passes minutes-of-day */
  onHoverMinuteChange?: (minute: number | null) => void;
}

interface IntervalDataPoint {
  /** Index for ordering (0-based across all intervals) */
  index: number;
  /** Display label for the x-axis tick */
  dayLabel: string;
  /** Number of scheduled employees active in this 15-min interval */
  scheduledHeadcount: number;
  /** Scheduled cost (headcount * rate * 0.25h) per interval */
  scheduledCost: number;
  /** Date string YYYY-MM-DD this interval belongs to */
  date: string;
  /** Whether this is the first interval of a day (for reference lines) */
  isDayBoundary: boolean;
  /** Minute-of-day this interval starts at (0-1410) */
  minuteOfDay: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INTERVAL_MINUTES = 15; // 15-minute intervals
const INTERVALS_PER_DAY = (24 * 60) / INTERVAL_MINUTES; // 96

function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** Format minutes to "4:30 PM" style */
function formatTime12h(minutes: number): string {
  const totalMin = ((minutes % 1440) + 1440) % 1440; // normalize to 0-1439
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Short time for day-view x-axis: "6a", "12p" etc */
function formatTimeShort(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Format date string "2026-02-17" to "Mon 2/17" */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAY_LABELS[d.getDay()];
  return `${dayName} ${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Build an array of 15-minute interval data points.
 * For week view: entire week. For day view: single day.
 */
function buildIntervalData(
  shifts: Shift[],
  days: string[],
  canViewPay: boolean,
): IntervalDataPoint[] {
  const data: IntervalDataPoint[] = [];
  let index = 0;

  for (const day of days) {
    // Get shifts for this day
    const dayShifts = shifts.filter(s => s.shift_date === day);

    for (let interval = 0; interval < INTERVALS_PER_DAY; interval++) {
      const intervalStart = interval * INTERVAL_MINUTES;
      const intervalEnd = intervalStart + INTERVAL_MINUTES;

      // Count how many shifts are active during this interval
      let headcount = 0;
      let costRate = 0;

      for (const shift of dayShifts) {
        const shiftStart = parseTime(shift.start_time);
        let shiftEnd = parseTime(shift.end_time);

        // Cross-day: if end <= start, clamp to end of day (1440)
        if (shiftEnd <= shiftStart) shiftEnd = 24 * 60;

        // Shift overlaps interval if shiftStart < intervalEnd AND shiftEnd > intervalStart
        if (shiftStart < intervalEnd && shiftEnd > intervalStart) {
          headcount++;
          if (canViewPay && shift.assignment?.employee?.calculated_pay) {
            costRate += shift.assignment.employee.calculated_pay;
          }
        }
      }

      // Also count shifts from PREVIOUS day that cross midnight into this day
      const dayIdx = days.indexOf(day);
      if (dayIdx > 0) {
        const prevDay = days[dayIdx - 1];
        const prevDayShifts = shifts.filter(s => s.shift_date === prevDay);
        for (const shift of prevDayShifts) {
          const shiftStart = parseTime(shift.start_time);
          const shiftEnd = parseTime(shift.end_time);
          // Cross-day shift: end <= start
          if (shiftEnd <= shiftStart) {
            // The "overflow" portion: from 0 to shiftEnd on this day
            if (0 < intervalEnd && shiftEnd > intervalStart) {
              headcount++;
              if (canViewPay && shift.assignment?.employee?.calculated_pay) {
                costRate += shift.assignment.employee.calculated_pay;
              }
            }
          }
        }
      }

      const isDayBoundary = interval === 0;

      data.push({
        index,
        dayLabel: isDayBoundary ? formatDateLabel(day) : '',
        scheduledHeadcount: headcount,
        scheduledCost: costRate * (INTERVAL_MINUTES / 60),
        date: day,
        isDayBoundary,
        minuteOfDay: intervalStart,
      });
      index++;
    }
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload as IntervalDataPoint | undefined;
  if (!point) return null;

  const d = new Date(point.date + 'T00:00:00');
  const dayName = DAY_LABELS[d.getDay()];
  const monthDay = `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  const startTime = formatTime12h(point.minuteOfDay);
  const endTime = formatTime12h(point.minuteOfDay + INTERVAL_MINUTES);

  // Deduplicate: only show each metric once (Area and Line share dataKey)
  const seenKeys = new Set<string>();

  return (
    <div className={sty.tooltip}>
      <div className={sty.tooltipHeader}>{dayName}, {monthDay}</div>
      <div className={sty.tooltipTime}>{startTime} – {endTime}</div>
      {payload.map((entry: any, i: number) => {
        if (seenKeys.has(entry.dataKey)) return null;
        seenKeys.add(entry.dataKey);

        if (entry.dataKey === 'scheduledHeadcount') {
          return (
            <div key={i} className={sty.tooltipRow}>
              <span className={sty.tooltipDot} style={{ background: '#2c5f8a' }} />
              <span>Scheduled: <strong>{Number(entry.value).toFixed(1)}</strong></span>
            </div>
          );
        }
        if (entry.dataKey === 'scheduledCost' && entry.value > 0) {
          return (
            <div key={i} className={sty.tooltipRow}>
              <span className={sty.tooltipDot} style={{ background: '#b91c1c' }} />
              <span>Labor Cost: <strong>{formatCurrency(entry.value)}</strong></span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom X-axis tick — week view (day + date labels at boundaries)   */
/* ------------------------------------------------------------------ */

function DayBoundaryTick({ x, y, payload, data }: any) {
  // Ticks are placed at the midpoint of each day; look up the day's label
  // from the boundary point (value - half day)
  const idx = payload?.value;
  const halfDay = Math.floor(INTERVALS_PER_DAY / 2);
  const boundaryIdx = idx != null ? idx - halfDay : -1;
  const boundaryPoint = data?.[boundaryIdx];
  const label = boundaryPoint?.dayLabel;
  if (!label) return null;

  return (
    <g>
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        fill="var(--ls-color-neutral-soft-foreground)"
        fontSize={11}
        fontFamily="var(--ls-font-heading)"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom X-axis tick — day view (hourly time labels)                 */
/* ------------------------------------------------------------------ */

function HourlyTick({ x, y, payload, data }: any) {
  // payload.value is the data index (from dataKey="index")
  const point = data?.[payload?.value];
  if (!point) return null;
  if (point.minuteOfDay % 60 !== 0) return null;

  return (
    <g>
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        fill="var(--ls-color-neutral-soft-foreground)"
        fontSize={10}
        fontFamily="var(--ls-font-heading)"
        fontWeight={500}
      >
        {formatTimeShort(point.minuteOfDay)}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Legend items                                                        */
/* ------------------------------------------------------------------ */

function ChartLegend({ canViewPay }: { canViewPay: boolean }) {
  return (
    <div className={sty.legend}>
      <div className={sty.legendItem}>
        <span className={sty.legendSwatch} style={{ background: '#2c5f8a' }} />
        <span>Scheduled</span>
      </div>
      {canViewPay && (
        <div className={sty.legendItem}>
          <span className={sty.legendSwatchLine} style={{ borderColor: '#b91c1c' }} />
          <span>Labor Cost</span>
        </div>
      )}
      {/* Benchmark items hidden for now — keep code for later */}
      {/* <div className={sty.legendItem}>
        <span className={sty.legendSwatchLine} style={{ borderColor: '#c0392b' }} />
        <span>Scheduled All</span>
      </div>
      <div className={sty.legendItem}>
        <span className={sty.legendSwatch} style={{ background: '#93c5fd80' }} />
        <span>Benchmark Hrs</span>
      </div>
      <div className={sty.legendItemMuted}>Benchmark Allocation</div> */}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LaborSpreadTab({
  shifts, laborSummary, days, canViewPay,
  timeViewMode, selectedDay,
  externalHoverMinute, onHoverMinuteChange,
}: LaborSpreadTabProps) {
  const isDayView = timeViewMode === 'day';

  // In day view, only build data for the selected day
  const chartDays = React.useMemo(
    () => isDayView ? [selectedDay] : days,
    [isDayView, selectedDay, days],
  );

  const intervalData = React.useMemo(
    () => buildIntervalData(shifts, chartDays, canViewPay),
    [shifts, chartDays, canViewPay],
  );

  // Find the max headcount for Y-axis domain
  const maxHeadcount = React.useMemo(() => {
    let max = 0;
    for (const d of intervalData) {
      if (d.scheduledHeadcount > max) max = d.scheduledHeadcount;
    }
    return Math.max(4, Math.ceil(max * 1.2)); // At least 4, 20% padding
  }, [intervalData]);

  // Find day boundary indices for reference lines (week view only)
  const dayBoundaries = React.useMemo(
    () => isDayView ? [] : intervalData.filter(d => d.isDayBoundary).map(d => d.index),
    [intervalData, isDayView],
  );

  // Ticks — week view uses midpoint of each day; day view uses hourly
  const xTicks = React.useMemo(() => {
    if (isDayView) {
      // Every hour boundary (every 4 intervals at 15-min)
      return intervalData.filter(d => d.minuteOfDay % 60 === 0).map(d => d.index);
    }
    // Midpoint of each day for centered labels
    const halfDay = Math.floor(INTERVALS_PER_DAY / 2);
    return intervalData.filter(d => d.isDayBoundary).map(d => d.index + halfDay);
  }, [intervalData, isDayView]);

  // Convert external hover minute to chart index for ReferenceLine
  const hoverRefIndex = React.useMemo(() => {
    if (externalHoverMinute == null) return null;
    if (isDayView) {
      // Day view: single day, index = minute / interval
      const intervalIdx = Math.floor(externalHoverMinute / INTERVAL_MINUTES);
      if (intervalIdx < 0 || intervalIdx >= intervalData.length) return null;
      return intervalIdx;
    }
    // Week view: not supported (time axes don't align 1:1)
    return null;
  }, [externalHoverMinute, isDayView, intervalData.length]);

  // Handle mouse move on chart to emit hover minute
  const handleChartMouseMove = React.useCallback((state: any) => {
    if (!onHoverMinuteChange || !isDayView) return;
    if (state && state.activePayload && state.activePayload.length > 0) {
      const point = state.activePayload[0].payload as IntervalDataPoint;
      onHoverMinuteChange(point.minuteOfDay);
    }
  }, [onHoverMinuteChange, isDayView]);

  const handleChartMouseLeave = React.useCallback(() => {
    if (onHoverMinuteChange) onHoverMinuteChange(null);
  }, [onHoverMinuteChange]);

  return (
    <div className={sty.container}>
      <div className={sty.chartRow}>
        {/* Legend sidebar */}
        <div className={sty.legendSidebar}>
          <ChartLegend canViewPay={canViewPay} />
        </div>

        {/* Chart */}
        <div className={sty.chartContainer}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={intervalData}
              margin={{ top: 8, right: canViewPay ? 48 : 16, bottom: 4, left: 0 }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <defs>
                <linearGradient id="scheduledGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.15} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={isDayView}
                stroke="var(--ls-color-muted-soft)"
                strokeDasharray="none"
              />

              {/* Vertical reference lines at day boundaries (week view) */}
              {dayBoundaries.map((idx) => (
                <ReferenceLine
                  key={`day-${idx}`}
                  x={idx}
                  stroke="var(--ls-color-muted-border)"
                  strokeWidth={1}
                />
              ))}

              {/* External hover cursor synced from ScheduleGrid (day view) */}
              {hoverRefIndex != null && (
                <ReferenceLine
                  x={hoverRefIndex}
                  stroke="var(--ls-color-brand)"
                  strokeWidth={1}
                  yAxisId="headcount"
                />
              )}

              <XAxis
                dataKey="index"
                ticks={xTicks}
                tick={isDayView
                  ? <HourlyTick data={intervalData} />
                  : <DayBoundaryTick data={intervalData} />
                }
                axisLine={{ stroke: 'var(--ls-color-brand)', strokeWidth: 2 }}
                tickLine={false}
                interval={0}
                height={28}
              />

              <YAxis
                yAxisId="headcount"
                domain={[0, maxHeadcount]}
                tick={{
                  fontSize: 11,
                  fontFamily: 'var(--ls-font-heading)',
                  fill: 'var(--ls-color-muted)',
                }}
                axisLine={false}
                tickLine={false}
                width={32}
                label={{
                  value: 'Staff',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 8,
                  style: {
                    fontSize: 10,
                    fontFamily: 'var(--ls-font-body)',
                    fill: 'var(--ls-color-muted)',
                    fontWeight: 600,
                  },
                }}
              />

              {canViewPay && (
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{
                    fontSize: 11,
                    fontFamily: 'var(--ls-font-heading)',
                    fill: 'var(--ls-color-muted)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickFormatter={(v) => formatCurrency(v)}
                />
              )}

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'var(--ls-color-brand)', strokeWidth: 1 }}
              />

              {/* Scheduled area fill (light blue) */}
              <Area
                yAxisId="headcount"
                dataKey="scheduledHeadcount"
                fill="url(#scheduledGradient)"
                stroke="none"
                type="stepAfter"
                isAnimationActive={false}
              />

              {/* Scheduled headcount stepped line (dark blue) */}
              <Line
                yAxisId="headcount"
                dataKey="scheduledHeadcount"
                stroke="#2c5f8a"
                strokeWidth={1.5}
                type="stepAfter"
                dot={false}
                isAnimationActive={false}
              />

              {/* Cost line (red, if pay visible) */}
              {canViewPay && (
                <Line
                  yAxisId="cost"
                  dataKey="scheduledCost"
                  stroke="#b91c1c"
                  strokeWidth={1.5}
                  type="monotone"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
