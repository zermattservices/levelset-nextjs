import * as React from 'react';
import sty from './ScheduleGrid.module.css';
import { ShiftBlock } from './ShiftBlock';
import AddIcon from '@mui/icons-material/Add';
import type { Shift, Position, GridViewMode, TimeViewMode, LaborSummary } from '@/lib/scheduling.types';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  calculated_pay?: number;
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
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
}

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ZONE_COLORS: Record<string, string> = {
  BOH: '#dc6843',
  FOH: '#3b82f6',
};

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
  const end = parseTime(shift.end_time);
  return Math.max(0, (end - start) / 60 - (shift.break_minutes || 0) / 60);
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

// ── Week View: Employee Rows ──
function WeekEmployeeView({
  shifts, employees, days, laborSummary, isPublished,
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
                  {summary.hours > 0 ? (
                    <>
                      <span className={sty.empHours}>{summary.hours.toFixed(0)} / {summary.hours.toFixed(0)}</span>
                      <span className={sty.empWage}>{formatCurrency(summary.cost)}</span>
                    </>
                  ) : (
                    <span className={sty.empHours}>{emp.role}</span>
                  )}
                </div>
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
                <span className={sty.summaryCost}>{daySummary ? formatCurrency(daySummary.cost) : '$0'}</span>
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
  shifts, positions, days, laborSummary, isPublished,
  onCellClick, onShiftClick, onShiftDelete,
}: Omit<ScheduleGridProps, 'employees' | 'selectedDay' | 'gridViewMode' | 'timeViewMode' | 'onDragCreate'>) {
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
            <div className={`${sty.rowLabel} ${sty.zoneSectionHeader}`}>
              <span className={sty.zoneBadge} style={{ backgroundColor: '#dc684320', color: '#dc6843' }}>BOH</span>
            </div>
            {days.map((day) => (<div key={day} className={`${sty.cell} ${sty.zoneSectionHeader}`} />))}
            {renderPositionRows(bohPositions)}
          </>
        )}

        {fohPositions.length > 0 && (
          <>
            <div className={`${sty.rowLabel} ${sty.zoneSectionHeader}`}>
              <span className={sty.zoneBadge} style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>FOH</span>
            </div>
            {days.map((day) => (<div key={day} className={`${sty.cell} ${sty.zoneSectionHeader}`} />))}
            {renderPositionRows(fohPositions)}
          </>
        )}

        <div className={`${sty.rowLabel} ${sty.summaryRow}`}><span className={sty.summaryLabel}>Total</span></div>
        {days.map((day) => {
          const daySummary = laborSummary.by_day[day];
          return (
            <div key={day} className={`${sty.cell} ${sty.summaryRow} ${isToday(day) ? sty.todayCol : ''}`}>
              <div className={sty.summaryCell}>
                <span className={sty.summaryValue}>{daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}</span>
                <span className={sty.summaryCost}>{daySummary ? formatCurrency(daySummary.cost) : '$0'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Drag-to-create hook for timeline rows ──
function useDragToCreate(
  timeRange: { minHour: number; maxHour: number },
  isPublished: boolean,
  onDragCreate?: (startTime: string, endTime: string) => void,
) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartPct, setDragStartPct] = React.useState(0);
  const [dragEndPct, setDragEndPct] = React.useState(0);
  const timelineRef = React.useRef<HTMLDivElement>(null);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;

  const pctToMinutes = React.useCallback((pct: number) => {
    return timeRange.minHour * 60 + (pct / 100) * totalMinutes;
  }, [timeRange.minHour, totalMinutes]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPublished || !onDragCreate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setDragStartPct(pct);
    setDragEndPct(pct);
    setIsDragging(true);
  }, [isPublished, onDragCreate]);

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      setDragEndPct(pct);
    };

    const handleMouseUp = () => {
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
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartPct, dragEndPct, pctToMinutes, onDragCreate, timeRange.minHour, timeRange.maxHour]);

  const dragPreview = React.useMemo(() => {
    if (!isDragging) return null;
    const left = Math.min(dragStartPct, dragEndPct);
    const width = Math.abs(dragEndPct - dragStartPct);
    const startMin = snapTo15(pctToMinutes(left));
    const endMin = snapTo15(pctToMinutes(left + width));
    if (endMin - startMin < 15) return null;
    return {
      left: `${left}%`,
      width: `${width}%`,
      label: `${formatTimeShort(minutesToTimeStr(startMin))} – ${formatTimeShort(minutesToTimeStr(endMin))}`,
    };
  }, [isDragging, dragStartPct, dragEndPct, pctToMinutes]);

  return { timelineRef, isDragging, handleMouseDown, dragPreview };
}

// ── Day View: Employee Rows ──
function DayEmployeeView({
  shifts, employees, selectedDay, isPublished,
  onCellClick, onShiftClick, onDragCreate,
}: {
  shifts: Shift[];
  employees: Employee[];
  selectedDay: string;
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
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

  const timeRange = React.useMemo(() => {
    let minHour = 6;
    let maxHour = 23;
    for (const s of dayShifts) {
      const startH = parseInt(s.start_time.split(':')[0], 10);
      const endH = parseInt(s.end_time.split(':')[0], 10);
      if (startH < minHour) minHour = startH;
      if (endH >= maxHour) maxHour = endH + 1;
    }
    const hours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hours.push(h);
    return { minHour, maxHour, hours };
  }, [dayShifts]);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;
  function shiftStyle(shift: Shift) {
    const startMin = parseTime(shift.start_time) - timeRange.minHour * 60;
    const endMin = parseTime(shift.end_time) - timeRange.minHour * 60;
    return { left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`, width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%` };
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.dayGrid}>
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
        {rowEmployees.map((emp) => (
          <DayEmployeeRow
            key={emp.id}
            emp={emp}
            empShifts={shiftMap.get(emp.id) ?? []}
            selectedDay={selectedDay}
            timeRange={timeRange}
            totalMinutes={totalMinutes}
            shiftStyleFn={shiftStyle}
            isPublished={isPublished}
            onCellClick={onCellClick}
            onShiftClick={onShiftClick}
            onDragCreate={onDragCreate}
          />
        ))}
        {shiftMap.has('__open__') && (
          <div className={`${sty.dayRow} ${sty.openRow}`}>
            <div className={sty.rowLabel}><span className={sty.empName}>Open Shifts</span></div>
            <div className={sty.timeline} onClick={() => onCellClick(selectedDay)}>
              {(shiftMap.get('__open__') ?? []).map((s) => (
                <div key={s.id} className={`${sty.timelineBlock} ${sty.timelineBlockOpen}`} style={shiftStyle(s)} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
                  <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Single employee row with drag-to-create
function DayEmployeeRow({
  emp, empShifts, selectedDay, timeRange, totalMinutes, shiftStyleFn, isPublished,
  onCellClick, onShiftClick, onDragCreate,
}: {
  emp: Employee;
  empShifts: Shift[];
  selectedDay: string;
  timeRange: { minHour: number; maxHour: number };
  totalMinutes: number;
  shiftStyleFn: (s: Shift) => { left: string; width: string };
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
}) {
  const { timelineRef, isDragging, handleMouseDown, dragPreview } = useDragToCreate(
    timeRange,
    isPublished,
    onDragCreate ? (startTime, endTime) => onDragCreate(selectedDay, startTime, endTime, emp.id) : undefined,
  );

  const handleTimelineClick = (e: React.MouseEvent) => {
    // Don't open modal if we just finished dragging
    if (isDragging) return;
    onCellClick(selectedDay, emp.id);
  };

  return (
    <div className={sty.dayRow}>
      <div className={sty.rowLabel}>
        <span className={sty.empNameLink}>{emp.full_name}</span>
        <span className={sty.empHours}>{emp.role}</span>
      </div>
      <div
        ref={timelineRef}
        className={sty.timeline}
        onMouseDown={handleMouseDown}
        onClick={handleTimelineClick}
      >
        {empShifts.map((s) => {
          const posColor = s.position ? (ZONE_COLORS[s.position.zone] ?? 'var(--ls-color-muted)') : 'var(--ls-color-muted)';
          return (
            <div key={s.id} className={sty.timelineBlock} style={{ ...shiftStyleFn(s), backgroundColor: `${posColor}1f`, borderLeft: `3px solid ${posColor}` }} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
              <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
              <span className={sty.timelineBlockLabel}>{s.position?.name ?? ''}</span>
            </div>
          );
        })}
        {empShifts.length === 0 && !isDragging && (
          <div className={sty.timelineEmpty}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>
        )}
        {dragPreview && (
          <div className={sty.dragPreview} style={{ left: dragPreview.left, width: dragPreview.width }}>
            <span className={sty.dragPreviewLabel}>{dragPreview.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day View: Position Rows ──
function DayPositionView({
  shifts, positions, selectedDay, isPublished,
  onCellClick, onShiftClick, onDragCreate,
}: {
  shifts: Shift[];
  positions: Position[];
  selectedDay: string;
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
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

  const timeRange = React.useMemo(() => {
    let minHour = 6;
    let maxHour = 23;
    for (const s of dayShifts) {
      const startH = parseInt(s.start_time.split(':')[0], 10);
      const endH = parseInt(s.end_time.split(':')[0], 10);
      if (startH < minHour) minHour = startH;
      if (endH >= maxHour) maxHour = endH + 1;
    }
    const hours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hours.push(h);
    return { minHour, maxHour, hours };
  }, [dayShifts]);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;
  function shiftStyle(shift: Shift) {
    const startMin = parseTime(shift.start_time) - timeRange.minHour * 60;
    const endMin = parseTime(shift.end_time) - timeRange.minHour * 60;
    return { left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`, width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%` };
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.dayGrid}>
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
        {rows.map((pos) => (
          <DayPositionRow
            key={pos.id}
            pos={pos}
            posShifts={shiftMap.get(pos.id) ?? []}
            selectedDay={selectedDay}
            timeRange={timeRange}
            totalMinutes={totalMinutes}
            shiftStyleFn={shiftStyle}
            isPublished={isPublished}
            onCellClick={onCellClick}
            onShiftClick={onShiftClick}
            onDragCreate={onDragCreate}
          />
        ))}
      </div>
    </div>
  );
}

// Single position row with drag-to-create
function DayPositionRow({
  pos, posShifts, selectedDay, timeRange, totalMinutes, shiftStyleFn, isPublished,
  onCellClick, onShiftClick, onDragCreate,
}: {
  pos: Position;
  posShifts: Shift[];
  selectedDay: string;
  timeRange: { minHour: number; maxHour: number };
  totalMinutes: number;
  shiftStyleFn: (s: Shift) => { left: string; width: string };
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, entityId?: string) => void;
}) {
  const posColor = ZONE_COLORS[pos.zone] ?? 'var(--ls-color-muted)';

  const { timelineRef, isDragging, handleMouseDown, dragPreview } = useDragToCreate(
    timeRange,
    isPublished,
    onDragCreate ? (startTime, endTime) => onDragCreate(selectedDay, startTime, endTime, pos.id) : undefined,
  );

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
        {posShifts.map((s) => (
          <div key={s.id} className={`${sty.timelineBlock} ${!s.assignment ? sty.timelineBlockOpen : ''}`} style={{ ...shiftStyleFn(s), backgroundColor: `${posColor}1f`, borderLeft: `3px solid ${posColor}` }} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
            <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
            <span className={sty.timelineBlockLabel}>{s.assignment?.employee?.full_name ?? 'Open'}</span>
          </div>
        ))}
        {posShifts.length === 0 && !isDragging && (
          <div className={sty.timelineEmpty}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>
        )}
        {dragPreview && (
          <div className={sty.dragPreview} style={{ left: dragPreview.left, width: dragPreview.width }}>
            <span className={sty.dragPreviewLabel}>{dragPreview.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ScheduleGrid ──
export function ScheduleGrid(props: ScheduleGridProps) {
  const { shifts, positions, employees, days, selectedDay, gridViewMode, timeViewMode, laborSummary, isPublished, onCellClick, onShiftClick, onShiftDelete, onDragCreate } = props;

  if (timeViewMode === 'day' && gridViewMode === 'employees') {
    return <DayEmployeeView shifts={shifts} employees={employees} selectedDay={selectedDay} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} onDragCreate={onDragCreate} />;
  }
  if (timeViewMode === 'day' && gridViewMode === 'positions') {
    return <DayPositionView shifts={shifts} positions={positions} selectedDay={selectedDay} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} onDragCreate={onDragCreate} />;
  }
  if (gridViewMode === 'positions') {
    return <WeekPositionView shifts={shifts} positions={positions} days={days} laborSummary={laborSummary} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
  }
  return <WeekEmployeeView shifts={shifts} employees={employees} days={days} laborSummary={laborSummary} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
}
