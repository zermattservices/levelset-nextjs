import * as React from 'react';
import sty from './ScheduleGrid.module.css';
import { ShiftBlock } from './ShiftBlock';
import AddIcon from '@mui/icons-material/Add';
import type { Shift, ShiftArea, GridViewMode, TimeViewMode, LaborSummary } from '@/lib/scheduling.types';

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
  areas: ShiftArea[];
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

// ── Week View: Employee Rows ──
function WeekEmployeeView({
  shifts, employees, days, laborSummary, isPublished,
  onCellClick, onShiftClick, onShiftDelete,
}: Omit<ScheduleGridProps, 'areas' | 'selectedDay' | 'gridViewMode' | 'timeViewMode'>) {
  // Build lookup: employeeId → date → shifts[]
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

  // Employees who have shifts + all employees from roster (merged, deduped)
  const rowEmployees = React.useMemo(() => {
    const ids = new Set<string>();
    const result: Employee[] = [];
    // First: employees with shifts
    for (const emp of employees) {
      if (shiftMap.has(emp.id)) {
        ids.add(emp.id);
        result.push(emp);
      }
    }
    // Then: remaining employees
    for (const emp of employees) {
      if (!ids.has(emp.id)) {
        result.push(emp);
      }
    }
    return result;
  }, [employees, shiftMap]);

  // Open shifts (unassigned)
  const openShifts = React.useMemo(() => shiftMap.get('__open__') ?? new Map(), [shiftMap]);

  // Per-employee weekly summary
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
        {/* Header row */}
        <div className={`${sty.headerCell} ${sty.cornerCell}`}>
          <span className={sty.cornerLabel}>Employee</span>
        </div>
        {days.map((day) => {
          const { dayLabel, dateLabel } = formatDateHeader(day);
          return (
            <div
              key={day}
              className={`${sty.headerCell} ${isToday(day) ? sty.todayHeader : ''}`}
            >
              <span className={sty.dayLabel}>{dayLabel}</span>
              <span className={sty.dateHeaderLabel}>{dateLabel}</span>
            </div>
          );
        })}

        {/* Employee rows */}
        {rowEmployees.map((emp) => {
          const summary = empWeekSummary(emp.id);
          const empDayMap = shiftMap.get(emp.id);
          return (
            <React.Fragment key={emp.id}>
              <div className={sty.rowLabel}>
                <span className={sty.empName}>{emp.full_name}</span>
                <span className={sty.empRole}>{emp.role}</span>
                {summary.hours > 0 && (
                  <span className={sty.empSummary}>
                    {summary.hours.toFixed(1)}h · {formatCurrency(summary.cost)}
                  </span>
                )}
              </div>
              {days.map((day) => {
                const dayShifts = empDayMap?.get(day) ?? [];
                return (
                  <div
                    key={day}
                    className={`${sty.cell} ${isToday(day) ? sty.todayCol : ''}`}
                    onClick={() => onCellClick(day, emp.id)}
                  >
                    {dayShifts.map((s) => (
                      <ShiftBlock
                        key={s.id}
                        shift={s}
                        viewMode="employees"
                        isPublished={isPublished}
                        onClick={onShiftClick}
                        onDelete={onShiftDelete}
                      />
                    ))}
                    {dayShifts.length === 0 && (
                      <div className={sty.addHint}>
                        <AddIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Open shifts row */}
        {openShifts.size > 0 && (
          <>
            <div className={`${sty.rowLabel} ${sty.openRow}`}>
              <span className={sty.empName}>Open Shifts</span>
            </div>
            {days.map((day) => {
              const dayShifts = openShifts.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={`${sty.cell} ${isToday(day) ? sty.todayCol : ''}`}
                  onClick={() => onCellClick(day)}
                >
                  {dayShifts.map((s) => (
                    <ShiftBlock
                      key={s.id}
                      shift={s}
                      viewMode="employees"
                      isPublished={isPublished}
                      onClick={onShiftClick}
                      onDelete={onShiftDelete}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}

        {/* Summary row */}
        <div className={`${sty.rowLabel} ${sty.summaryRow}`}>
          <span className={sty.summaryLabel}>Total</span>
        </div>
        {days.map((day) => {
          const daySummary = laborSummary.by_day[day];
          return (
            <div key={day} className={`${sty.cell} ${sty.summaryRow} ${isToday(day) ? sty.todayCol : ''}`}>
              <span className={sty.summaryValue}>
                {daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}
              </span>
              <span className={sty.summaryCost}>
                {daySummary ? formatCurrency(daySummary.cost) : '$0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View: Area Rows ──
function WeekAreaView({
  shifts, areas, days, laborSummary, isPublished,
  onCellClick, onShiftClick, onShiftDelete,
}: Omit<ScheduleGridProps, 'employees' | 'selectedDay' | 'gridViewMode' | 'timeViewMode'>) {
  // Build lookup: areaId → date → shifts[]
  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();
    for (const s of shifts) {
      const areaId = s.shift_area_id ?? '__none__';
      if (!map.has(areaId)) map.set(areaId, new Map());
      const dayMap = map.get(areaId)!;
      if (!dayMap.has(s.shift_date)) dayMap.set(s.shift_date, []);
      dayMap.get(s.shift_date)!.push(s);
    }
    return map;
  }, [shifts]);

  const rows = React.useMemo(() => {
    const result = [...areas];
    // Add "No Area" row if there are unassigned-area shifts
    if (shiftMap.has('__none__')) {
      result.push({ id: '__none__', name: 'No Area', color: '#6b7280' } as ShiftArea);
    }
    return result;
  }, [areas, shiftMap]);

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.grid} style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
        {/* Header row */}
        <div className={`${sty.headerCell} ${sty.cornerCell}`}>
          <span className={sty.cornerLabel}>Area</span>
        </div>
        {days.map((day) => {
          const { dayLabel, dateLabel } = formatDateHeader(day);
          return (
            <div
              key={day}
              className={`${sty.headerCell} ${isToday(day) ? sty.todayHeader : ''}`}
            >
              <span className={sty.dayLabel}>{dayLabel}</span>
              <span className={sty.dateHeaderLabel}>{dateLabel}</span>
            </div>
          );
        })}

        {/* Area rows */}
        {rows.map((area) => {
          const areaDayMap = shiftMap.get(area.id);
          return (
            <React.Fragment key={area.id}>
              <div className={sty.rowLabel}>
                <div className={sty.areaLabelRow}>
                  <span className={sty.areaColorDot} style={{ backgroundColor: area.color }} />
                  <span className={sty.empName}>{area.name}</span>
                </div>
              </div>
              {days.map((day) => {
                const dayShifts = areaDayMap?.get(day) ?? [];
                return (
                  <div
                    key={day}
                    className={`${sty.cell} ${isToday(day) ? sty.todayCol : ''}`}
                    onClick={() => onCellClick(day, area.id)}
                  >
                    {dayShifts.map((s) => (
                      <ShiftBlock
                        key={s.id}
                        shift={s}
                        viewMode="areas"
                        isPublished={isPublished}
                        onClick={onShiftClick}
                        onDelete={onShiftDelete}
                      />
                    ))}
                    {dayShifts.length === 0 && (
                      <div className={sty.addHint}>
                        <AddIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Summary row */}
        <div className={`${sty.rowLabel} ${sty.summaryRow}`}>
          <span className={sty.summaryLabel}>Total</span>
        </div>
        {days.map((day) => {
          const daySummary = laborSummary.by_day[day];
          return (
            <div key={day} className={`${sty.cell} ${sty.summaryRow} ${isToday(day) ? sty.todayCol : ''}`}>
              <span className={sty.summaryValue}>
                {daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}
              </span>
              <span className={sty.summaryCost}>
                {daySummary ? formatCurrency(daySummary.cost) : '$0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View: Employee Rows ──
function DayEmployeeView({
  shifts, employees, selectedDay, isPublished,
  onCellClick, onShiftClick, onShiftDelete,
}: {
  shifts: Shift[];
  employees: Employee[];
  selectedDay: string;
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
}) {
  const dayShifts = React.useMemo(
    () => shifts.filter((s) => s.shift_date === selectedDay),
    [shifts, selectedDay],
  );

  // Build lookup: employeeId → shifts
  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of dayShifts) {
      const empId = s.assignment?.employee_id ?? '__open__';
      if (!map.has(empId)) map.set(empId, []);
      map.get(empId)!.push(s);
    }
    return map;
  }, [dayShifts]);

  // Employees with shifts first, then rest
  const rowEmployees = React.useMemo(() => {
    const ids = new Set<string>();
    const result: Employee[] = [];
    for (const emp of employees) {
      if (shiftMap.has(emp.id)) {
        ids.add(emp.id);
        result.push(emp);
      }
    }
    for (const emp of employees) {
      if (!ids.has(emp.id)) result.push(emp);
    }
    return result;
  }, [employees, shiftMap]);

  // Time range for the day: 6am to 11pm (or extend based on shifts)
  const timeRange = React.useMemo(() => {
    let minHour = 6;
    let maxHour = 23;
    for (const s of dayShifts) {
      const startH = parseInt(s.start_time.split(':')[0], 10);
      const endH = parseInt(s.end_time.split(':')[0], 10);
      if (startH < minHour) minHour = startH;
      if (endH > maxHour) maxHour = endH + 1;
    }
    const hours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hours.push(h);
    return { minHour, maxHour, hours };
  }, [dayShifts]);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;

  function shiftStyle(shift: Shift) {
    const startMin = parseTime(shift.start_time) - timeRange.minHour * 60;
    const endMin = parseTime(shift.end_time) - timeRange.minHour * 60;
    const left = Math.max(0, (startMin / totalMinutes) * 100);
    const width = Math.max(2, ((endMin - startMin) / totalMinutes) * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.dayGrid}>
        {/* Time header */}
        <div className={sty.dayHeaderRow}>
          <div className={sty.dayCornerCell} />
          <div className={sty.timelineHeader}>
            {timeRange.hours.map((h) => (
              <span
                key={h}
                className={sty.timeLabel}
                style={{ left: `${((h - timeRange.minHour) / (timeRange.maxHour - timeRange.minHour)) * 100}%` }}
              >
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </span>
            ))}
          </div>
        </div>

        {/* Employee rows */}
        {rowEmployees.map((emp) => {
          const empShifts = shiftMap.get(emp.id) ?? [];
          return (
            <div key={emp.id} className={sty.dayRow}>
              <div className={sty.rowLabel}>
                <span className={sty.empName}>{emp.full_name}</span>
                <span className={sty.empRole}>{emp.role}</span>
              </div>
              <div
                className={sty.timeline}
                onClick={() => onCellClick(selectedDay, emp.id)}
              >
                {empShifts.map((s) => (
                  <div
                    key={s.id}
                    className={sty.timelineBlock}
                    style={{
                      ...shiftStyle(s),
                      backgroundColor: `${s.shift_area?.color ?? '#6b7280'}25`,
                      borderLeft: `3px solid ${s.shift_area?.color ?? '#6b7280'}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}
                  >
                    <span className={sty.timelineBlockTime}>
                      {formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}
                    </span>
                    <span className={sty.timelineBlockLabel}>
                      {s.shift_area?.name ?? ''}
                    </span>
                  </div>
                ))}
                {empShifts.length === 0 && (
                  <div className={sty.timelineEmpty}>
                    <AddIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Open shifts row */}
        {shiftMap.has('__open__') && (
          <div className={`${sty.dayRow} ${sty.openRow}`}>
            <div className={sty.rowLabel}>
              <span className={sty.empName}>Open Shifts</span>
            </div>
            <div className={sty.timeline} onClick={() => onCellClick(selectedDay)}>
              {(shiftMap.get('__open__') ?? []).map((s) => (
                <div
                  key={s.id}
                  className={`${sty.timelineBlock} ${sty.timelineBlockOpen}`}
                  style={shiftStyle(s)}
                  onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}
                >
                  <span className={sty.timelineBlockTime}>
                    {formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day View: Area Rows ──
function DayAreaView({
  shifts, areas, selectedDay, isPublished,
  onCellClick, onShiftClick, onShiftDelete,
}: {
  shifts: Shift[];
  areas: ShiftArea[];
  selectedDay: string;
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
}) {
  const dayShifts = React.useMemo(
    () => shifts.filter((s) => s.shift_date === selectedDay),
    [shifts, selectedDay],
  );

  const shiftMap = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of dayShifts) {
      const areaId = s.shift_area_id ?? '__none__';
      if (!map.has(areaId)) map.set(areaId, []);
      map.get(areaId)!.push(s);
    }
    return map;
  }, [dayShifts]);

  const rows = React.useMemo(() => {
    const result = [...areas];
    if (shiftMap.has('__none__')) {
      result.push({ id: '__none__', name: 'No Area', color: '#6b7280' } as ShiftArea);
    }
    return result;
  }, [areas, shiftMap]);

  const timeRange = React.useMemo(() => {
    let minHour = 6;
    let maxHour = 23;
    for (const s of dayShifts) {
      const startH = parseInt(s.start_time.split(':')[0], 10);
      const endH = parseInt(s.end_time.split(':')[0], 10);
      if (startH < minHour) minHour = startH;
      if (endH > maxHour) maxHour = endH + 1;
    }
    const hours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hours.push(h);
    return { minHour, maxHour, hours };
  }, [dayShifts]);

  const totalMinutes = (timeRange.maxHour - timeRange.minHour) * 60;

  function shiftStyle(shift: Shift) {
    const startMin = parseTime(shift.start_time) - timeRange.minHour * 60;
    const endMin = parseTime(shift.end_time) - timeRange.minHour * 60;
    const left = Math.max(0, (startMin / totalMinutes) * 100);
    const width = Math.max(2, ((endMin - startMin) / totalMinutes) * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.dayGrid}>
        {/* Time header */}
        <div className={sty.dayHeaderRow}>
          <div className={sty.dayCornerCell} />
          <div className={sty.timelineHeader}>
            {timeRange.hours.map((h) => (
              <span
                key={h}
                className={sty.timeLabel}
                style={{ left: `${((h - timeRange.minHour) / (timeRange.maxHour - timeRange.minHour)) * 100}%` }}
              >
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </span>
            ))}
          </div>
        </div>

        {/* Area rows */}
        {rows.map((area) => {
          const areaShifts = shiftMap.get(area.id) ?? [];
          return (
            <div key={area.id} className={sty.dayRow}>
              <div className={sty.rowLabel}>
                <div className={sty.areaLabelRow}>
                  <span className={sty.areaColorDot} style={{ backgroundColor: area.color }} />
                  <span className={sty.empName}>{area.name}</span>
                </div>
              </div>
              <div
                className={sty.timeline}
                onClick={() => onCellClick(selectedDay, area.id)}
              >
                {areaShifts.map((s) => (
                  <div
                    key={s.id}
                    className={`${sty.timelineBlock} ${!s.assignment ? sty.timelineBlockOpen : ''}`}
                    style={{
                      ...shiftStyle(s),
                      backgroundColor: `${area.color}25`,
                      borderLeft: `3px solid ${area.color}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}
                  >
                    <span className={sty.timelineBlockTime}>
                      {formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}
                    </span>
                    <span className={sty.timelineBlockLabel}>
                      {s.assignment?.employee?.full_name ?? 'Open'}
                    </span>
                  </div>
                ))}
                {areaShifts.length === 0 && (
                  <div className={sty.timelineEmpty}>
                    <AddIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared time format helper ──
function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

// ── Main ScheduleGrid ──
export function ScheduleGrid(props: ScheduleGridProps) {
  const {
    shifts, areas, employees, days, selectedDay,
    gridViewMode, timeViewMode, laborSummary, isPublished,
    onCellClick, onShiftClick, onShiftDelete,
  } = props;

  if (timeViewMode === 'day' && gridViewMode === 'employees') {
    return (
      <DayEmployeeView
        shifts={shifts}
        employees={employees}
        selectedDay={selectedDay}
        isPublished={isPublished}
        onCellClick={onCellClick}
        onShiftClick={onShiftClick}
        onShiftDelete={onShiftDelete}
      />
    );
  }

  if (timeViewMode === 'day' && gridViewMode === 'areas') {
    return (
      <DayAreaView
        shifts={shifts}
        areas={areas}
        selectedDay={selectedDay}
        isPublished={isPublished}
        onCellClick={onCellClick}
        onShiftClick={onShiftClick}
        onShiftDelete={onShiftDelete}
      />
    );
  }

  if (gridViewMode === 'areas') {
    return (
      <WeekAreaView
        shifts={shifts}
        areas={areas}
        days={days}
        laborSummary={laborSummary}
        isPublished={isPublished}
        onCellClick={onCellClick}
        onShiftClick={onShiftClick}
        onShiftDelete={onShiftDelete}
      />
    );
  }

  return (
    <WeekEmployeeView
      shifts={shifts}
      employees={employees}
      days={days}
      laborSummary={laborSummary}
      isPublished={isPublished}
      onCellClick={onCellClick}
      onShiftClick={onShiftClick}
      onShiftDelete={onShiftDelete}
    />
  );
}
