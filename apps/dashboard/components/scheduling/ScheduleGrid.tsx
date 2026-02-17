import * as React from 'react';
import sty from './ScheduleGrid.module.css';
import { ShiftBlock } from './ShiftBlock';
import { ColumnConfigPopover } from './ColumnConfigPopover';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Shift, Position, GridViewMode, TimeViewMode, LaborSummary } from '@/lib/scheduling.types';
import { ZONE_COLORS, ZONE_TEXT_COLORS, ZONE_BG_COLORS } from '@/lib/zoneColors';
import type { ColumnConfig } from './useColumnConfig';
import type { LocationBusinessHours } from '@/lib/supabase.types';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  calculated_pay?: number;
}

/** Describes a pending shift being created (shown while the drawer is open) */
export interface PendingShiftPreview {
  date: string;
  startTime: string;
  endTime: string;
  entityId?: string; // employee or position id depending on view
  positionZone?: 'FOH' | 'BOH' | null; // set when position is selected in the drawer
}

interface ScheduleGridProps {
  shifts: Shift[];
  positions: Position[];
  employees: Employee[];
  days: string[];
  selectedDay: string;
  gridViewMode: GridViewMode;
  timeViewMode: TimeViewMode;
  laborSummary: LaborSummary;
  isPublished: boolean;
  canViewPay?: boolean;
  businessHours?: LocationBusinessHours[];
  columnConfig?: ColumnConfig;
  onColumnConfigUpdate?: (partial: Partial<ColumnConfig>) => void;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
  pendingShift?: PendingShiftPreview | null;
  /** Hover time in minutes-of-day from LaborSpreadTab */
  externalHoverMinute?: number | null;
  /** Called when user hovers in the grid timeline — passes minutes-of-day */
  onHoverMinuteChange?: (minute: number | null) => void;
}

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateHeader(dateStr: string): { dayLabel: string; dateLabel: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    dayLabel: DAY_LABELS_SHORT[d.getDay()],
    dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
  };
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(0);
}

function formatCurrencyWhole(n: number): string {
  return '$' + Math.round(n);
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${day}`;
}

function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function shiftNetHours(shift: Shift): number {
  const start = parseTime(shift.start_time);
  let end = parseTime(shift.end_time);
  if (end <= start) end += 24 * 60; // cross-day shift
  return Math.max(0, (end - start) / 60 - (shift.break_minutes || 0) / 60);
}

/** Compute net hours from two HH:MM time strings */
function computeNetHours(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  let end = parseTime(endTime);
  if (end <= start) end += 24 * 60; // cross-day shift
  return Math.max(0, (end - start) / 60);
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

/** Format a decimal hours value compactly: 8 -> "8h", 4.5 -> "4.5h", 4.25 -> "4.25h" */
function formatHoursCompact(h: number): string {
  if (h % 1 === 0) return `${h}h`;
  // For quarter-hours (.25, .75) show 2 decimals; for half-hours (.5) show 1
  const frac = h % 1;
  if (Math.abs(frac - 0.5) < 0.001) return `${h.toFixed(1)}h`;
  return `${h.toFixed(2)}h`;
}

// ── Grid-level hover cursor hook ──
// Lifted to the grid level so the vertical line spans all rows
function useGridHoverCursor(
  timeRange: { minHour: number; maxHour: number },
  onHoverMinuteChange?: (minute: number | null) => void,
) {
  const [hoverPct, setHoverPct] = React.useState<number | null>(null);
  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Find the nearest .timeline element to compute correct pct
    const timeline = (e.target as HTMLElement).closest(`.${sty.timeline}`) as HTMLElement | null;
    if (!timeline) {
      setHoverPct(null);
      if (onHoverMinuteChange) onHoverMinuteChange(null);
      return;
    }
    const rect = timeline.getBoundingClientRect();
    const rawPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const rawMinutes = timeRange.minHour * 60 + (rawPct / 100) * totalMinutes;
    const snapped = snapTo15(rawMinutes);
    const snappedPct = ((snapped - timeRange.minHour * 60) / totalMinutes) * 100;
    setHoverPct(Math.max(0, Math.min(100, snappedPct)));
    if (onHoverMinuteChange) onHoverMinuteChange(snapped);
  }, [timeRange.minHour, totalMinutes, onHoverMinuteChange]);

  const handleMouseLeave = React.useCallback(() => {
    setHoverPct(null);
    if (onHoverMinuteChange) onHoverMinuteChange(null);
  }, [onHoverMinuteChange]);

  return { hoverPct, handleMouseMove, handleMouseLeave };
}

// ── Gridlines component for timeline areas ──
function TimelineGridLines({ timeRange }: { timeRange: { minHour: number; maxHour: number; hours: number[] } }) {
  return (
    <>
      {timeRange.hours.map((h) => (
        <div
          key={h}
          className={sty.timeGridLine}
          style={{ left: `${((h - timeRange.minHour) / (timeRange.maxHour - timeRange.minHour)) * 100}%` }}
        />
      ))}
    </>
  );
}

// ── Week View: Employee Rows ──
function WeekEmployeeView({
  shifts, employees, days, laborSummary, isPublished,
  canViewPay, columnConfig, onColumnConfigUpdate,
  onCellClick, onShiftClick, onShiftDelete,
}: Omit<ScheduleGridProps, 'positions' | 'selectedDay' | 'gridViewMode' | 'timeViewMode' | 'onDragCreate'>) {
  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();
    for (const s of shifts) {
      const empId = s.assignment?.employee_id ?? '__open__';
      if (!map.has(empId)) map.set(empId, new Map());
      const dayMap = map.get(empId)!;
      if (!dayMap.has(s.shift_date)) dayMap.set(s.shift_date, []);
      dayMap.get(s.shift_date)!.push(s);
    }
    return map;
  }, [shifts]);

  // Sort: employees with shifts first, then alphabetically
  const rowEmployees = React.useMemo(() => {
    const withShifts: Employee[] = [];
    const without: Employee[] = [];
    for (const emp of employees) {
      if (shiftMap.has(emp.id)) withShifts.push(emp);
      else without.push(emp);
    }
    return [...withShifts, ...without];
  }, [employees, shiftMap]);

  const openShifts = React.useMemo(() => shiftMap.get('__open__') ?? new Map(), [shiftMap]);

  function empWeekSummary(empId: string) {
    let hours = 0;
    let cost = 0;
    for (const s of shifts) {
      if (s.assignment?.employee_id === empId) {
        hours += shiftNetHours(s);
        cost += s.assignment?.projected_cost ?? 0;
      }
    }
    return { hours, cost };
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.grid} style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
        <div className={`${sty.headerCell} ${sty.cornerCell}`}>
          <span className={sty.cornerLabel}>Employee</span>
          {columnConfig && onColumnConfigUpdate && (
            <ColumnConfigPopover config={columnConfig} canViewPay={!!canViewPay} onUpdate={onColumnConfigUpdate} />
          )}
        </div>
        {days.map((day) => {
          const { dayLabel, dateLabel } = formatDateHeader(day);
          return (
            <div key={day} className={`${sty.headerCell} ${isToday(day) ? sty.todayHeader : ''}`}>
              <span className={sty.dayLabel}>{dayLabel}</span>
              <span className={sty.dateHeaderLabel}>{dateLabel}</span>
            </div>
          );
        })}

        {rowEmployees.map((emp) => {
          const summary = empWeekSummary(emp.id);
          const empDayMap = shiftMap.get(emp.id);
          return (
            <React.Fragment key={emp.id}>
              <div className={sty.rowLabel}>
                <span className={sty.empNameLink}>{emp.full_name}</span>
                <div className={sty.empMeta}>
                  {columnConfig?.showHours !== false && (
                    <span className={sty.empHours}>{summary.hours.toFixed(1)} / {summary.hours.toFixed(1)}</span>
                  )}
                  {columnConfig?.showWage !== false && canViewPay && (
                    <span className={sty.empWage}>{formatCurrency(summary.cost)}</span>
                  )}
                </div>
                {columnConfig?.showRole && (
                  <span className={sty.empRole}>{emp.role}</span>
                )}
              </div>
              {days.map((day) => {
                const dayShifts = empDayMap?.get(day) ?? [];
                return (
                  <div key={day} className={`${sty.cell} ${isToday(day) ? sty.todayCol : ''}`} onClick={() => onCellClick(day, emp.id)}>
                    {dayShifts.map((s) => (
                      <ShiftBlock key={s.id} shift={s} viewMode="employees" isPublished={isPublished} onClick={onShiftClick} onDelete={onShiftDelete} />
                    ))}
                    {dayShifts.length === 0 && (
                      <div className={sty.addHint}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {openShifts.size > 0 && (
          <>
            <div className={`${sty.rowLabel} ${sty.openRow}`}><span className={sty.empName}>Open Shifts</span></div>
            {days.map((day) => {
              const dayShifts = openShifts.get(day) ?? [];
              return (
                <div key={day} className={`${sty.cell} ${isToday(day) ? sty.todayCol : ''}`} onClick={() => onCellClick(day)}>
                  {dayShifts.map((s) => (
                    <ShiftBlock key={s.id} shift={s} viewMode="employees" isPublished={isPublished} onClick={onShiftClick} onDelete={onShiftDelete} />
                  ))}
                </div>
              );
            })}
          </>
        )}

        <div className={`${sty.rowLabel} ${sty.summaryRow}`}><span className={sty.summaryLabel}>Total</span></div>
        {days.map((day) => {
          const daySummary = laborSummary.by_day[day];
          return (
            <div key={day} className={`${sty.cell} ${sty.summaryRow} ${isToday(day) ? sty.todayCol : ''}`}>
              <div className={sty.summaryCell}>
                <span className={sty.summaryValue}>{daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}</span>
                {canViewPay && (
                  <span className={sty.summaryCost}>{daySummary ? formatCurrency(daySummary.cost) : '$0'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View: Position Rows (grouped by zone) ──
function WeekPositionView({
  shifts, positions, days, laborSummary, isPublished, canViewPay,
  onCellClick, onShiftClick, onShiftDelete,
}: Omit<ScheduleGridProps, 'employees' | 'selectedDay' | 'gridViewMode' | 'timeViewMode' | 'onDragCreate' | 'columnConfig' | 'onColumnConfigUpdate'>) {
  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();
    for (const s of shifts) {
      const posId = s.position_id ?? '__none__';
      if (!map.has(posId)) map.set(posId, new Map());
      const dayMap = map.get(posId)!;
      if (!dayMap.has(s.shift_date)) dayMap.set(s.shift_date, []);
      dayMap.get(s.shift_date)!.push(s);
    }
    return map;
  }, [shifts]);

  const rows = React.useMemo(() => {
    const result = [...positions];
    if (shiftMap.has('__none__')) {
      result.push({ id: '__none__', name: 'No Position', zone: 'BOH', display_order: 999 } as Position);
    }
    return result;
  }, [positions, shiftMap]);

  const bohPositions = rows.filter((p) => p.zone === 'BOH');
  const fohPositions = rows.filter((p) => p.zone === 'FOH');

  const [collapsedZones, setCollapsedZones] = React.useState<Set<string>>(new Set());
  const toggleZone = React.useCallback((zone: string) => {
    setCollapsedZones(prev => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  function renderPositionRows(positionList: Position[]) {
    return positionList.map((pos) => {
      const posDayMap = shiftMap.get(pos.id);
      const posColor = ZONE_COLORS[pos.zone] ?? 'var(--ls-color-muted)';
      return (
        <React.Fragment key={pos.id}>
          <div className={sty.rowLabel}>
            <div className={sty.positionLabelRow}>
              <span className={sty.positionColorDot} style={{ backgroundColor: posColor }} />
              <span className={sty.empName}>{pos.name}</span>
            </div>
          </div>
          {days.map((day) => {
            const dayShifts = posDayMap?.get(day) ?? [];
            return (
              <div key={day} className={`${sty.cell} ${isToday(day) ? sty.todayCol : ''}`} onClick={() => onCellClick(day, pos.id)}>
                {dayShifts.map((s) => (
                  <ShiftBlock key={s.id} shift={s} viewMode="positions" isPublished={isPublished} onClick={onShiftClick} onDelete={onShiftDelete} />
                ))}
                {dayShifts.length === 0 && (
                  <div className={sty.addHint}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>
                )}
              </div>
            );
          })}
        </React.Fragment>
      );
    });
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.grid} style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
        <div className={`${sty.headerCell} ${sty.cornerCell}`}><span className={sty.cornerLabel}>Position</span></div>
        {days.map((day) => {
          const { dayLabel, dateLabel } = formatDateHeader(day);
          return (
            <div key={day} className={`${sty.headerCell} ${isToday(day) ? sty.todayHeader : ''}`}>
              <span className={sty.dayLabel}>{dayLabel}</span>
              <span className={sty.dateHeaderLabel}>{dateLabel}</span>
            </div>
          );
        })}

        {bohPositions.length > 0 && (
          <>
            <div className={`${sty.rowLabel} ${sty.zoneSectionHeader} ${sty.zoneSectionClickable}`} onClick={() => toggleZone('BOH')}>
              <ExpandMoreIcon sx={{ fontSize: 16, color: ZONE_TEXT_COLORS['BOH'], transition: 'transform 0.2s ease', transform: collapsedZones.has('BOH') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
              <span className={sty.zoneBadge} style={{ backgroundColor: ZONE_BG_COLORS['BOH'], color: ZONE_TEXT_COLORS['BOH'] }}>BOH</span>
            </div>
            {days.map((day) => (<div key={day} className={`${sty.cell} ${sty.zoneSectionHeader}`} />))}
            {!collapsedZones.has('BOH') && renderPositionRows(bohPositions)}
          </>
        )}

        {fohPositions.length > 0 && (
          <>
            <div className={`${sty.rowLabel} ${sty.zoneSectionHeader} ${sty.zoneSectionClickable}`} onClick={() => toggleZone('FOH')}>
              <ExpandMoreIcon sx={{ fontSize: 16, color: ZONE_TEXT_COLORS['FOH'], transition: 'transform 0.2s ease', transform: collapsedZones.has('FOH') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
              <span className={sty.zoneBadge} style={{ backgroundColor: ZONE_BG_COLORS['FOH'], color: ZONE_TEXT_COLORS['FOH'] }}>FOH</span>
            </div>
            {days.map((day) => (<div key={day} className={`${sty.cell} ${sty.zoneSectionHeader}`} />))}
            {!collapsedZones.has('FOH') && renderPositionRows(fohPositions)}
          </>
        )}

        <div className={`${sty.rowLabel} ${sty.summaryRow}`}><span className={sty.summaryLabel}>Total</span></div>
        {days.map((day) => {
          const daySummary = laborSummary.by_day[day];
          return (
            <div key={day} className={`${sty.cell} ${sty.summaryRow} ${isToday(day) ? sty.todayCol : ''}`}>
              <div className={sty.summaryCell}>
                <span className={sty.summaryValue}>{daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}</span>
                {canViewPay && (
                  <span className={sty.summaryCost}>{daySummary ? formatCurrency(daySummary.cost) : '$0'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Drag-to-create hook for timeline rows (snaps to 15-min during drag) ──
// Includes edge-scroll: when the cursor nears the left/right edge of the
// scrollable .gridWrapper during a drag, the container auto-scrolls.
const EDGE_SCROLL_ZONE = 60; // px from viewport edge to start scrolling
const EDGE_SCROLL_SPEED = 12; // px per animation frame

function useDragToCreate(
  timeRange: { minHour: number; maxHour: number },
  isPublished: boolean,
  onDragCreate?: (startTime: string, endTime: string) => void,
) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartPct, setDragStartPct] = React.useState(0);
  const [dragEndPct, setDragEndPct] = React.useState(0);
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const scrollRafRef = React.useRef<number | null>(null);
  const lastClientXRef = React.useRef(0);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;

  const pctToMinutes = React.useCallback((pct: number) => {
    return timeRange.minHour * 60 + (pct / 100) * totalMinutes;
  }, [timeRange.minHour, totalMinutes]);

  const minutesToPct = React.useCallback((min: number) => {
    return ((min - timeRange.minHour * 60) / totalMinutes) * 100;
  }, [timeRange.minHour, totalMinutes]);

  /** Find the scrollable .gridWrapper ancestor */
  const getScrollContainer = React.useCallback(() => {
    if (!timelineRef.current) return null;
    let el: HTMLElement | null = timelineRef.current;
    while (el) {
      if (el.classList.contains(sty.gridWrapper)) return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  /** Start a rAF loop that scrolls while the cursor stays in the edge zone */
  const startEdgeScroll = React.useCallback(() => {
    const tick = () => {
      const container = getScrollContainer();
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = lastClientXRef.current;

      const distFromRight = rect.right - clientX;
      const distFromLeft = clientX - rect.left;

      if (distFromRight < EDGE_SCROLL_ZONE && distFromRight > 0) {
        // Scroll right — faster the closer to edge
        const intensity = 1 - distFromRight / EDGE_SCROLL_ZONE;
        container.scrollLeft += Math.ceil(EDGE_SCROLL_SPEED * intensity);
      } else if (distFromLeft < EDGE_SCROLL_ZONE && distFromLeft > 0) {
        // Scroll left
        const intensity = 1 - distFromLeft / EDGE_SCROLL_ZONE;
        container.scrollLeft -= Math.ceil(EDGE_SCROLL_SPEED * intensity);
      }

      // Also update the drag end position as the scroll changes the timeline rect
      if (timelineRef.current) {
        const tlRect = timelineRef.current.getBoundingClientRect();
        const rawPct = Math.max(0, Math.min(100, ((clientX - tlRect.left) / tlRect.width) * 100));
        const rawMin = timeRange.minHour * 60 + (rawPct / 100) * totalMinutes;
        const snappedMin = snapTo15(rawMin);
        const snappedPct = ((snappedMin - timeRange.minHour * 60) / totalMinutes) * 100;
        setDragEndPct(Math.max(0, Math.min(100, snappedPct)));
      }

      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  }, [getScrollContainer, timeRange.minHour, totalMinutes]);

  const stopEdgeScroll = React.useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPublished || !onDragCreate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    // Snap the start position to 15-min
    const rawMin = pctToMinutes(rawPct);
    const snappedMin = snapTo15(rawMin);
    const snappedPct = minutesToPct(snappedMin);
    setDragStartPct(Math.max(0, Math.min(100, snappedPct)));
    setDragEndPct(Math.max(0, Math.min(100, snappedPct)));
    setIsDragging(true);
    lastClientXRef.current = e.clientX;
  }, [isPublished, onDragCreate, pctToMinutes, minutesToPct]);

  React.useEffect(() => {
    if (!isDragging) return;

    // Start the edge-scroll rAF loop
    startEdgeScroll();

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      lastClientXRef.current = e.clientX;
      const rect = timelineRef.current.getBoundingClientRect();
      const rawPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      // Snap end position to 15-min during drag
      const rawMin = timeRange.minHour * 60 + (rawPct / 100) * totalMinutes;
      const snappedMin = snapTo15(rawMin);
      const snappedPct = ((snappedMin - timeRange.minHour * 60) / totalMinutes) * 100;
      setDragEndPct(Math.max(0, Math.min(100, snappedPct)));
    };

    const handleMouseUp = () => {
      stopEdgeScroll();
      setIsDragging(false);
      const startMin = snapTo15(pctToMinutes(Math.min(dragStartPct, dragEndPct)));
      const endMin = snapTo15(pctToMinutes(Math.max(dragStartPct, dragEndPct)));
      // Only create if at least 15 min wide
      if (endMin - startMin >= 15 && onDragCreate) {
        const clampedStart = Math.max(startMin, timeRange.minHour * 60);
        const clampedEnd = Math.min(endMin, timeRange.maxHour * 60);
        onDragCreate(minutesToTimeStr(clampedStart), minutesToTimeStr(clampedEnd));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      stopEdgeScroll();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartPct, dragEndPct, pctToMinutes, onDragCreate, timeRange.minHour, timeRange.maxHour, totalMinutes, startEdgeScroll, stopEdgeScroll]);

  const dragPreview = React.useMemo(() => {
    if (!isDragging) return null;
    const left = Math.min(dragStartPct, dragEndPct);
    const width = Math.abs(dragEndPct - dragStartPct);
    const startMin = snapTo15(pctToMinutes(left));
    const endMin = snapTo15(pctToMinutes(left + width));
    if (endMin - startMin < 15) return null;
    const hours = computeNetHours(minutesToTimeStr(startMin), minutesToTimeStr(endMin));
    return {
      left: `${left}%`,
      width: `${width}%`,
      label: `${formatTimeShort(minutesToTimeStr(startMin))} – ${formatTimeShort(minutesToTimeStr(endMin))}`,
      hours,
    };
  }, [isDragging, dragStartPct, dragEndPct, pctToMinutes]);

  return { timelineRef, isDragging, handleMouseDown, dragPreview };
}

// ── Day View: Employee Rows ──
function DayEmployeeView({
  shifts, employees, selectedDay, isPublished,
  canViewPay, columnConfig, onColumnConfigUpdate,
  onCellClick, onShiftClick, onDragCreate,
  pendingShift, businessHours,
  externalHoverMinute, onHoverMinuteChange,
}: {
  shifts: Shift[];
  employees: Employee[];
  selectedDay: string;
  isPublished: boolean;
  canViewPay?: boolean;
  columnConfig?: ColumnConfig;
  onColumnConfigUpdate?: (partial: Partial<ColumnConfig>) => void;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
  pendingShift?: PendingShiftPreview | null;
  businessHours?: LocationBusinessHours[];
  externalHoverMinute?: number | null;
  onHoverMinuteChange?: (minute: number | null) => void;
}) {
  const dayShifts = React.useMemo(() => shifts.filter((s) => s.shift_date === selectedDay), [shifts, selectedDay]);

  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of dayShifts) {
      const empId = s.assignment?.employee_id ?? '__open__';
      if (!map.has(empId)) map.set(empId, []);
      map.get(empId)!.push(s);
    }
    return map;
  }, [dayShifts]);

  const rowEmployees = React.useMemo(() => {
    const withShifts: Employee[] = [];
    const without: Employee[] = [];
    for (const emp of employees) {
      if (shiftMap.has(emp.id)) withShifts.push(emp);
      else without.push(emp);
    }
    return [...withShifts, ...without];
  }, [employees, shiftMap]);

  // Full 24h time range (always 0-24)
  const timeRange = React.useMemo(() => {
    const hours: number[] = [];
    for (let h = 0; h <= 24; h++) hours.push(h);
    return { minHour: 0, maxHour: 24, hours };
  }, []);

  // Business range for auto-scroll positioning
  const businessRange = React.useMemo(() => {
    let minHour = 6;
    let maxHour = 23;
    if (businessHours && businessHours.length > 0) {
      const dayOfWeek = new Date(selectedDay + 'T00:00:00').getDay();
      const todayHours = businessHours.filter((h) => h.day_of_week === dayOfWeek);
      if (todayHours.length > 0) {
        minHour = Math.min(...todayHours.map((h) => h.open_hour));
        maxHour = Math.max(...todayHours.map((h) => h.close_hour)) + 1;
      }
    }
    return { minHour, maxHour };
  }, [businessHours, selectedDay]);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;
  function shiftStyle(shift: Shift) {
    const startMin = parseTime(shift.start_time) - timeRange.minHour * 60;
    let endMin = parseTime(shift.end_time) - timeRange.minHour * 60;
    // Cross-day shift: clamp to end of timeline (24:00)
    if (endMin <= startMin) endMin = totalMinutes;
    return { left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`, width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%` };
  }

  // Grid-level hover cursor that spans all rows
  const { hoverPct, handleMouseMove: gridMouseMove, handleMouseLeave: gridMouseLeave } = useGridHoverCursor(timeRange, onHoverMinuteChange);

  // Convert external hover minute (from LaborSpreadTab) to a percentage
  const externalHoverPct = React.useMemo(() => {
    if (externalHoverMinute == null) return null;
    const totalMin = (timeRange.maxHour - timeRange.minHour) * 60;
    const pct = ((externalHoverMinute - timeRange.minHour * 60) / totalMin) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  }, [externalHoverMinute, timeRange.minHour, timeRange.maxHour]);

  // Use internal hover if present, otherwise use external
  const activeHoverPct = hoverPct ?? externalHoverPct;

  // Auto-scroll to business hours on mount and day change
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    // Wait a frame for layout to settle
    requestAnimationFrame(() => {
      const scrollWidth = el.scrollWidth;
      const nameColWidth = 180; // sticky name column width
      const scrollableWidth = scrollWidth - nameColWidth;
      const targetLeft = (businessRange.minHour / 24) * scrollableWidth;
      el.scrollLeft = Math.max(0, targetLeft - 40);
    });
  }, [selectedDay, businessRange.minHour]);

  return (
    <div className={sty.gridWrapper} ref={scrollRef}>
      <div className={sty.dayGrid} onMouseMove={gridMouseMove} onMouseLeave={gridMouseLeave}>
        <div className={sty.dayHeaderRow}>
          <div className={sty.dayCornerCell}>
            {columnConfig && onColumnConfigUpdate && (
              <ColumnConfigPopover config={columnConfig} canViewPay={!!canViewPay} onUpdate={onColumnConfigUpdate} />
            )}
          </div>
          <div className={sty.timelineHeader}>
            {timeRange.hours.map((h) => (
              <span key={h} className={sty.timeLabel} style={{ left: `${((h - timeRange.minHour) / (timeRange.maxHour - timeRange.minHour)) * 100}%` }}>
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </span>
            ))}
          </div>
        </div>
        {rowEmployees.map((emp) => {
          const empShifts = shiftMap.get(emp.id) ?? [];
          let hours = 0;
          let cost = 0;
          for (const s of shifts) {
            if (s.assignment?.employee_id === emp.id) {
              hours += shiftNetHours(s);
              cost += s.assignment?.projected_cost ?? 0;
            }
          }
          // Show pending shift preview on matching employee row
          const empPending = pendingShift?.date === selectedDay && pendingShift?.entityId === emp.id ? pendingShift : null;
          return (
            <DayEmployeeRow
              key={emp.id}
              emp={emp}
              empShifts={empShifts}
              empHours={hours}
              empCost={cost}
              selectedDay={selectedDay}
              timeRange={timeRange}
              totalMinutes={totalMinutes}
              shiftStyleFn={shiftStyle}
              isPublished={isPublished}
              canViewPay={canViewPay}
              columnConfig={columnConfig}
              onCellClick={onCellClick}
              onShiftClick={onShiftClick}
              onDragCreate={onDragCreate}
              pendingShift={empPending}
              gridHoverPct={activeHoverPct}
            />
          );
        })}
        {shiftMap.has('__open__') && (
          <div className={`${sty.dayRow} ${sty.openRow}`}>
            <div className={sty.rowLabel}><span className={sty.empName}>Open Shifts</span></div>
            <div className={sty.timeline} onClick={() => onCellClick(selectedDay)}>
              <TimelineGridLines timeRange={timeRange} />
              {(shiftMap.get('__open__') ?? []).map((s) => (
                <div key={s.id} className={`${sty.timelineBlock} ${sty.timelineBlockOpen}`} style={shiftStyle(s)} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
                  <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
                </div>
              ))}
              {activeHoverPct !== null && (
                <div className={sty.hoverCursorLine} style={{ left: `${activeHoverPct}%` }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Single employee row with drag-to-create
function DayEmployeeRow({
  emp, empShifts, empHours, empCost, selectedDay, timeRange, totalMinutes, shiftStyleFn, isPublished,
  canViewPay, columnConfig,
  onCellClick, onShiftClick, onDragCreate,
  pendingShift, gridHoverPct,
}: {
  emp: Employee;
  empShifts: Shift[];
  empHours: number;
  empCost: number;
  selectedDay: string;
  timeRange: { minHour: number; maxHour: number; hours: number[] };
  totalMinutes: number;
  shiftStyleFn: (s: Shift) => { left: string; width: string };
  isPublished: boolean;
  canViewPay?: boolean;
  columnConfig?: ColumnConfig;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
  pendingShift?: PendingShiftPreview | null;
  gridHoverPct: number | null;
}) {
  const { timelineRef, isDragging, handleMouseDown, dragPreview } = useDragToCreate(
    timeRange,
    isPublished,
    onDragCreate ? (startTime, endTime) => onDragCreate(selectedDay, startTime, endTime, emp.id) : undefined,
  );

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    onCellClick(selectedDay, emp.id);
  };

  // Compute pending shift position and hours/cost
  const pendingStyle = React.useMemo(() => {
    if (!pendingShift) return null;
    const startMin = parseTime(pendingShift.startTime) - timeRange.minHour * 60;
    let endMin = parseTime(pendingShift.endTime) - timeRange.minHour * 60;
    // Cross-day: clamp to end of timeline
    if (endMin <= startMin) endMin = totalMinutes;
    const zoneColor = pendingShift.positionZone ? ZONE_COLORS[pendingShift.positionZone] : null;
    const hours = computeNetHours(pendingShift.startTime, pendingShift.endTime);
    const payRate = emp.calculated_pay ?? 0;
    const cost = hours * payRate;
    return {
      left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`,
      width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%`,
      borderColor: zoneColor ?? 'var(--ls-color-brand)',
      background: zoneColor ? `${zoneColor}1a` : 'rgba(49, 102, 74, 0.08)',
      labelColor: zoneColor ?? 'var(--ls-color-brand)',
      label: `${formatTimeShort(pendingShift.startTime)} – ${formatTimeShort(pendingShift.endTime)}`,
      hours,
      cost,
      payRate,
    };
  }, [pendingShift, timeRange.minHour, totalMinutes, emp.calculated_pay]);

  // Compute drag preview cost
  const dragCostInfo = React.useMemo(() => {
    if (!dragPreview) return null;
    const payRate = emp.calculated_pay ?? 0;
    return {
      hours: dragPreview.hours,
      cost: dragPreview.hours * payRate,
      payRate,
    };
  }, [dragPreview, emp.calculated_pay]);

  return (
    <div className={sty.dayRow}>
      <div className={sty.rowLabel}>
        <span className={sty.empNameLink}>{emp.full_name}</span>
        <div className={sty.empMeta}>
          {columnConfig?.showHours !== false && (
            <span className={sty.empHours}>{empHours.toFixed(1)} / {empHours.toFixed(1)}</span>
          )}
          {columnConfig?.showWage !== false && canViewPay && (
            <span className={sty.empWage}>{formatCurrency(empCost)}</span>
          )}
        </div>
        {columnConfig?.showRole && (
          <span className={sty.empRole}>{emp.role}</span>
        )}
      </div>
      <div
        ref={timelineRef}
        className={sty.timeline}
        onMouseDown={handleMouseDown}
        onClick={handleTimelineClick}
      >
        <TimelineGridLines timeRange={timeRange} />
        {empShifts.map((s) => {
          const posColor = s.position ? (ZONE_COLORS[s.position.zone] ?? 'var(--ls-color-muted)') : 'var(--ls-color-muted)';
          const hours = shiftNetHours(s);
          const cost = s.assignment?.projected_cost ?? 0;
          return (
            <div key={s.id} className={sty.timelineBlock} style={{ ...shiftStyleFn(s), backgroundColor: `${posColor}1f`, borderLeft: `3px solid ${posColor}` }} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
              <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
              <span className={sty.timelineBlockLabel}>{s.position?.name ?? ''}</span>
              <span className={sty.timelineBlockMeta}>{formatHoursCompact(hours)}{canViewPay && cost > 0 ? ` · ${formatCurrencyWhole(cost)}` : ''}</span>
            </div>
          );
        })}
        {pendingStyle && !isDragging && (
          <div className={sty.pendingShiftPreview} style={{ left: pendingStyle.left, width: pendingStyle.width, borderColor: pendingStyle.borderColor, background: pendingStyle.background }}>
            <span className={sty.pendingShiftLabel} style={{ color: pendingStyle.labelColor }}>{pendingStyle.label}</span>
            <span className={sty.pendingShiftMeta} style={{ color: pendingStyle.labelColor }}>
              {formatHoursCompact(pendingStyle.hours)}{canViewPay && pendingStyle.payRate > 0 ? ` · ${formatCurrencyWhole(pendingStyle.cost)}` : ''}
            </span>
          </div>
        )}
        {empShifts.length === 0 && !isDragging && !pendingStyle && (
          <div className={sty.timelineEmpty}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>
        )}
        {dragPreview && (
          <div className={sty.dragPreview} style={{ left: dragPreview.left, width: dragPreview.width }}>
            <span className={sty.dragPreviewLabel}>{dragPreview.label}</span>
            {dragCostInfo && (
              <span className={sty.dragPreviewMeta}>
                {formatHoursCompact(dragCostInfo.hours)}{canViewPay && dragCostInfo.payRate > 0 ? ` · ${formatCurrencyWhole(dragCostInfo.cost)}` : ''}
              </span>
            )}
          </div>
        )}
        {gridHoverPct !== null && !isDragging && (
          <div className={sty.hoverCursorLine} style={{ left: `${gridHoverPct}%` }} />
        )}
      </div>
    </div>
  );
}

// ── Day View: Position Rows ──
function DayPositionView({
  shifts, positions, selectedDay, isPublished, canViewPay,
  onCellClick, onShiftClick, onDragCreate,
  pendingShift, businessHours,
  externalHoverMinute, onHoverMinuteChange,
}: {
  shifts: Shift[];
  positions: Position[];
  selectedDay: string;
  isPublished: boolean;
  canViewPay?: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
  pendingShift?: PendingShiftPreview | null;
  businessHours?: LocationBusinessHours[];
  externalHoverMinute?: number | null;
  onHoverMinuteChange?: (minute: number | null) => void;
}) {
  const dayShifts = React.useMemo(() => shifts.filter((s) => s.shift_date === selectedDay), [shifts, selectedDay]);

  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of dayShifts) {
      const posId = s.position_id ?? '__none__';
      if (!map.has(posId)) map.set(posId, []);
      map.get(posId)!.push(s);
    }
    return map;
  }, [dayShifts]);

  const rows = React.useMemo(() => {
    const result = [...positions];
    if (shiftMap.has('__none__')) {
      result.push({ id: '__none__', name: 'No Position', zone: 'BOH', display_order: 999 } as Position);
    }
    return result;
  }, [positions, shiftMap]);

  const bohPositions = rows.filter((p) => p.zone === 'BOH');
  const fohPositions = rows.filter((p) => p.zone === 'FOH');

  const [collapsedZones, setCollapsedZones] = React.useState<Set<string>>(new Set());
  const toggleZone = React.useCallback((zone: string) => {
    setCollapsedZones(prev => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  // Full 24h time range (always 0-24)
  const timeRange = React.useMemo(() => {
    const hours: number[] = [];
    for (let h = 0; h <= 24; h++) hours.push(h);
    return { minHour: 0, maxHour: 24, hours };
  }, []);

  // Business range for auto-scroll positioning
  const businessRange = React.useMemo(() => {
    let minHour = 6;
    let maxHour = 23;
    if (businessHours && businessHours.length > 0) {
      const dayOfWeek = new Date(selectedDay + 'T00:00:00').getDay();
      const todayHours = businessHours.filter((h) => h.day_of_week === dayOfWeek);
      if (todayHours.length > 0) {
        minHour = Math.min(...todayHours.map((h) => h.open_hour));
        maxHour = Math.max(...todayHours.map((h) => h.close_hour)) + 1;
      }
    }
    return { minHour, maxHour };
  }, [businessHours, selectedDay]);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;
  function shiftStyle(shift: Shift) {
    const startMin = parseTime(shift.start_time) - timeRange.minHour * 60;
    let endMin = parseTime(shift.end_time) - timeRange.minHour * 60;
    // Cross-day shift: clamp to end of timeline (24:00)
    if (endMin <= startMin) endMin = totalMinutes;
    return { left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`, width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%` };
  }

  // Grid-level hover cursor that spans all rows
  const { hoverPct, handleMouseMove: gridMouseMove, handleMouseLeave: gridMouseLeave } = useGridHoverCursor(timeRange, onHoverMinuteChange);

  // Convert external hover minute (from LaborSpreadTab) to a percentage
  const externalHoverPct = React.useMemo(() => {
    if (externalHoverMinute == null) return null;
    const totalMin = (timeRange.maxHour - timeRange.minHour) * 60;
    const pct = ((externalHoverMinute - timeRange.minHour * 60) / totalMin) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  }, [externalHoverMinute, timeRange.minHour, timeRange.maxHour]);

  // Use internal hover if present, otherwise use external
  const activeHoverPct = hoverPct ?? externalHoverPct;

  // Auto-scroll to business hours on mount and day change
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      const scrollWidth = el.scrollWidth;
      const nameColWidth = 180;
      const scrollableWidth = scrollWidth - nameColWidth;
      const targetLeft = (businessRange.minHour / 24) * scrollableWidth;
      el.scrollLeft = Math.max(0, targetLeft - 40);
    });
  }, [selectedDay, businessRange.minHour]);

  return (
    <div className={sty.gridWrapper} ref={scrollRef}>
      <div className={sty.dayGrid} onMouseMove={gridMouseMove} onMouseLeave={gridMouseLeave}>
        <div className={sty.dayHeaderRow}>
          <div className={sty.dayCornerCell} />
          <div className={sty.timelineHeader}>
            {timeRange.hours.map((h) => (
              <span key={h} className={sty.timeLabel} style={{ left: `${((h - timeRange.minHour) / (timeRange.maxHour - timeRange.minHour)) * 100}%` }}>
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </span>
            ))}
          </div>
        </div>

        {bohPositions.length > 0 && (
          <>
            <div className={`${sty.dayRow} ${sty.zoneSectionHeader} ${sty.zoneSectionClickable}`} onClick={() => toggleZone('BOH')}>
              <div className={sty.rowLabel}>
                <ExpandMoreIcon sx={{ fontSize: 16, color: ZONE_TEXT_COLORS['BOH'], transition: 'transform 0.2s ease', transform: collapsedZones.has('BOH') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                <span className={sty.zoneBadge} style={{ backgroundColor: ZONE_BG_COLORS['BOH'], color: ZONE_TEXT_COLORS['BOH'] }}>BOH</span>
              </div>
              <div className={sty.timeline} style={{ cursor: 'default' }} />
            </div>
            {!collapsedZones.has('BOH') && bohPositions.map((pos) => {
              const posPending = pendingShift?.date === selectedDay && pendingShift?.entityId === pos.id ? pendingShift : null;
              return (
                <DayPositionRow
                  key={pos.id}
                  pos={pos}
                  posShifts={shiftMap.get(pos.id) ?? []}
                  selectedDay={selectedDay}
                  timeRange={timeRange}
                  totalMinutes={totalMinutes}
                  shiftStyleFn={shiftStyle}
                  isPublished={isPublished}
                  canViewPay={canViewPay}
                  onCellClick={onCellClick}
                  onShiftClick={onShiftClick}
                  onDragCreate={onDragCreate}
                  pendingShift={posPending}
                  gridHoverPct={activeHoverPct}
                />
              );
            })}
          </>
        )}

        {fohPositions.length > 0 && (
          <>
            <div className={`${sty.dayRow} ${sty.zoneSectionHeader} ${sty.zoneSectionClickable}`} onClick={() => toggleZone('FOH')}>
              <div className={sty.rowLabel}>
                <ExpandMoreIcon sx={{ fontSize: 16, color: ZONE_TEXT_COLORS['FOH'], transition: 'transform 0.2s ease', transform: collapsedZones.has('FOH') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                <span className={sty.zoneBadge} style={{ backgroundColor: ZONE_BG_COLORS['FOH'], color: ZONE_TEXT_COLORS['FOH'] }}>FOH</span>
              </div>
              <div className={sty.timeline} style={{ cursor: 'default' }} />
            </div>
            {!collapsedZones.has('FOH') && fohPositions.map((pos) => {
              const posPending = pendingShift?.date === selectedDay && pendingShift?.entityId === pos.id ? pendingShift : null;
              return (
                <DayPositionRow
                  key={pos.id}
                  pos={pos}
                  posShifts={shiftMap.get(pos.id) ?? []}
                  selectedDay={selectedDay}
                  timeRange={timeRange}
                  totalMinutes={totalMinutes}
                  shiftStyleFn={shiftStyle}
                  isPublished={isPublished}
                  canViewPay={canViewPay}
                  onCellClick={onCellClick}
                  onShiftClick={onShiftClick}
                  onDragCreate={onDragCreate}
                  pendingShift={posPending}
                  gridHoverPct={activeHoverPct}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// Single position row with drag-to-create
function DayPositionRow({
  pos, posShifts, selectedDay, timeRange, totalMinutes, shiftStyleFn, isPublished,
  canViewPay,
  onCellClick, onShiftClick, onDragCreate,
  pendingShift, gridHoverPct,
}: {
  pos: Position;
  posShifts: Shift[];
  selectedDay: string;
  timeRange: { minHour: number; maxHour: number; hours: number[] };
  totalMinutes: number;
  shiftStyleFn: (s: Shift) => { left: string; width: string };
  isPublished: boolean;
  canViewPay?: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
  pendingShift?: PendingShiftPreview | null;
  gridHoverPct: number | null;
}) {
  const posColor = ZONE_COLORS[pos.zone] ?? 'var(--ls-color-muted)';

  const { timelineRef, isDragging, handleMouseDown, dragPreview } = useDragToCreate(
    timeRange,
    isPublished,
    onDragCreate ? (startTime, endTime) => onDragCreate(selectedDay, startTime, endTime, pos.id) : undefined,
  );

  // Compute pending shift position
  const pendingStyle = React.useMemo(() => {
    if (!pendingShift) return null;
    const startMin = parseTime(pendingShift.startTime) - timeRange.minHour * 60;
    let endMin = parseTime(pendingShift.endTime) - timeRange.minHour * 60;
    // Cross-day: clamp to end of timeline
    if (endMin <= startMin) endMin = totalMinutes;
    const zoneColor = pendingShift.positionZone ? ZONE_COLORS[pendingShift.positionZone] : null;
    const hours = computeNetHours(pendingShift.startTime, pendingShift.endTime);
    return {
      left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`,
      width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%`,
      borderColor: zoneColor ?? 'var(--ls-color-brand)',
      background: zoneColor ? `${zoneColor}1a` : 'rgba(49, 102, 74, 0.08)',
      labelColor: zoneColor ?? 'var(--ls-color-brand)',
      label: `${formatTimeShort(pendingShift.startTime)} – ${formatTimeShort(pendingShift.endTime)}`,
      hours,
    };
  }, [pendingShift, timeRange.minHour, totalMinutes]);

  return (
    <div className={sty.dayRow}>
      <div className={sty.rowLabel}>
        <div className={sty.positionLabelRow}>
          <span className={sty.positionColorDot} style={{ backgroundColor: posColor }} />
          <span className={sty.empName}>{pos.name}</span>
        </div>
      </div>
      <div
        ref={timelineRef}
        className={sty.timeline}
        onMouseDown={handleMouseDown}
        onClick={() => !isDragging && onCellClick(selectedDay, pos.id)}
      >
        <TimelineGridLines timeRange={timeRange} />
        {posShifts.map((s) => {
          const hours = shiftNetHours(s);
          const cost = s.assignment?.projected_cost ?? 0;
          return (
            <div key={s.id} className={`${sty.timelineBlock} ${!s.assignment ? sty.timelineBlockOpen : ''}`} style={{ ...shiftStyleFn(s), backgroundColor: `${posColor}1f`, borderLeft: `3px solid ${posColor}` }} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
              <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
              <span className={sty.timelineBlockLabel}>{s.assignment?.employee?.full_name ?? 'Open'}</span>
              <span className={sty.timelineBlockMeta}>{formatHoursCompact(hours)}{canViewPay && cost > 0 ? ` · ${formatCurrencyWhole(cost)}` : ''}</span>
            </div>
          );
        })}
        {pendingStyle && !isDragging && (
          <div className={sty.pendingShiftPreview} style={{ left: pendingStyle.left, width: pendingStyle.width, borderColor: pendingStyle.borderColor, background: pendingStyle.background }}>
            <span className={sty.pendingShiftLabel} style={{ color: pendingStyle.labelColor }}>{pendingStyle.label}</span>
            <span className={sty.pendingShiftMeta} style={{ color: pendingStyle.labelColor }}>
              {formatHoursCompact(pendingStyle.hours)}
            </span>
          </div>
        )}
        {posShifts.length === 0 && !isDragging && !pendingStyle && (
          <div className={sty.timelineEmpty}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>
        )}
        {dragPreview && (
          <div className={sty.dragPreview} style={{ left: dragPreview.left, width: dragPreview.width }}>
            <span className={sty.dragPreviewLabel}>{dragPreview.label}</span>
            <span className={sty.dragPreviewMeta}>{formatHoursCompact(dragPreview.hours)}</span>
          </div>
        )}
        {gridHoverPct !== null && !isDragging && (
          <div className={sty.hoverCursorLine} style={{ left: `${gridHoverPct}%` }} />
        )}
      </div>
    </div>
  );
}

// ── Main ScheduleGrid ──
export function ScheduleGrid(props: ScheduleGridProps) {
  const {
    shifts, positions, employees, days, selectedDay,
    gridViewMode, timeViewMode, laborSummary, isPublished,
    canViewPay, columnConfig, onColumnConfigUpdate,
    onCellClick, onShiftClick, onShiftDelete, onDragCreate,
    pendingShift, businessHours,
    externalHoverMinute, onHoverMinuteChange,
  } = props;

  if (timeViewMode === 'day' && gridViewMode === 'employees') {
    return <DayEmployeeView shifts={shifts} employees={employees} selectedDay={selectedDay} isPublished={isPublished} canViewPay={canViewPay} columnConfig={columnConfig} onColumnConfigUpdate={onColumnConfigUpdate} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} onDragCreate={onDragCreate} pendingShift={pendingShift} businessHours={businessHours} externalHoverMinute={externalHoverMinute} onHoverMinuteChange={onHoverMinuteChange} />;
  }
  if (timeViewMode === 'day' && gridViewMode === 'positions') {
    return <DayPositionView shifts={shifts} positions={positions} selectedDay={selectedDay} isPublished={isPublished} canViewPay={canViewPay} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} onDragCreate={onDragCreate} pendingShift={pendingShift} businessHours={businessHours} externalHoverMinute={externalHoverMinute} onHoverMinuteChange={onHoverMinuteChange} />;
  }
  if (gridViewMode === 'positions') {
    return <WeekPositionView shifts={shifts} positions={positions} days={days} laborSummary={laborSummary} isPublished={isPublished} canViewPay={canViewPay} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
  }
  return <WeekEmployeeView shifts={shifts} employees={employees} days={days} laborSummary={laborSummary} isPublished={isPublished} canViewPay={canViewPay} columnConfig={columnConfig} onColumnConfigUpdate={onColumnConfigUpdate} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
}
