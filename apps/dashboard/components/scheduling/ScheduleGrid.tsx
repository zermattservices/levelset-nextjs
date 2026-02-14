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

// ── Week View: Employee Rows ──
function WeekEmployeeView({
  shifts, employees, days, laborSummary, isPublished,
  onCellClick, onShiftClick, onShiftDelete,
}: Omit<ScheduleGridProps, 'positions' | 'selectedDay' | 'gridViewMode' | 'timeViewMode'>) {
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
      if (!ids.has(emp.id)) {
        result.push(emp);
      }
    }
    return result;
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
              <span className={sty.summaryValue}>{daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}</span>
              <span className={sty.summaryCost}>{daySummary ? formatCurrency(daySummary.cost) : '$0'}</span>
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
}: Omit<ScheduleGridProps, 'employees' | 'selectedDay' | 'gridViewMode' | 'timeViewMode'>) {
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
              <span className={sty.summaryValue}>{daySummary ? `${daySummary.hours.toFixed(1)}h` : '0h'}</span>
              <span className={sty.summaryCost}>{daySummary ? formatCurrency(daySummary.cost) : '$0'}</span>
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
  onCellClick, onShiftClick,
}: {
  shifts: Shift[];
  employees: Employee[];
  selectedDay: string;
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
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
    const ids = new Set<string>();
    const result: Employee[] = [];
    for (const emp of employees) {
      if (shiftMap.has(emp.id)) { ids.add(emp.id); result.push(emp); }
    }
    for (const emp of employees) {
      if (!ids.has(emp.id)) result.push(emp);
    }
    return result;
  }, [employees, shiftMap]);

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
        {rowEmployees.map((emp) => {
          const empShifts = shiftMap.get(emp.id) ?? [];
          return (
            <div key={emp.id} className={sty.dayRow}>
              <div className={sty.rowLabel}>
                <span className={sty.empName}>{emp.full_name}</span>
                <span className={sty.empRole}>{emp.role}</span>
              </div>
              <div className={sty.timeline} onClick={() => onCellClick(selectedDay, emp.id)}>
                {empShifts.map((s) => {
                  const posColor = s.position ? (ZONE_COLORS[s.position.zone] ?? 'var(--ls-color-muted)') : 'var(--ls-color-muted)';
                  return (
                    <div key={s.id} className={sty.timelineBlock} style={{ ...shiftStyle(s), backgroundColor: `${posColor}25`, borderLeft: `3px solid ${posColor}` }} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
                      <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
                      <span className={sty.timelineBlockLabel}>{s.position?.name ?? ''}</span>
                    </div>
                  );
                })}
                {empShifts.length === 0 && (<div className={sty.timelineEmpty}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>)}
              </div>
            </div>
          );
        })}
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

// ── Day View: Position Rows ──
function DayPositionView({
  shifts, positions, selectedDay, isPublished,
  onCellClick, onShiftClick,
}: {
  shifts: Shift[];
  positions: Position[];
  selectedDay: string;
  isPublished: boolean;
  onCellClick: (date: string, entityId?: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDelete: (shiftId: string) => void;
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
        {rows.map((pos) => {
          const posShifts = shiftMap.get(pos.id) ?? [];
          const posColor = ZONE_COLORS[pos.zone] ?? 'var(--ls-color-muted)';
          return (
            <div key={pos.id} className={sty.dayRow}>
              <div className={sty.rowLabel}>
                <div className={sty.positionLabelRow}>
                  <span className={sty.positionColorDot} style={{ backgroundColor: posColor }} />
                  <span className={sty.empName}>{pos.name}</span>
                </div>
              </div>
              <div className={sty.timeline} onClick={() => onCellClick(selectedDay, pos.id)}>
                {posShifts.map((s) => (
                  <div key={s.id} className={`${sty.timelineBlock} ${!s.assignment ? sty.timelineBlockOpen : ''}`} style={{ ...shiftStyle(s), backgroundColor: `${posColor}25`, borderLeft: `3px solid ${posColor}` }} onClick={(e) => { e.stopPropagation(); onShiftClick(s); }}>
                    <span className={sty.timelineBlockTime}>{formatTimeShort(s.start_time)}–{formatTimeShort(s.end_time)}</span>
                    <span className={sty.timelineBlockLabel}>{s.assignment?.employee?.full_name ?? 'Open'}</span>
                  </div>
                ))}
                {posShifts.length === 0 && (<div className={sty.timelineEmpty}><AddIcon sx={{ fontSize: 14, color: 'var(--ls-color-border)' }} /></div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

// ── Main ScheduleGrid ──
export function ScheduleGrid(props: ScheduleGridProps) {
  const { shifts, positions, employees, days, selectedDay, gridViewMode, timeViewMode, laborSummary, isPublished, onCellClick, onShiftClick, onShiftDelete } = props;

  if (timeViewMode === 'day' && gridViewMode === 'employees') {
    return <DayEmployeeView shifts={shifts} employees={employees} selectedDay={selectedDay} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
  }
  if (timeViewMode === 'day' && gridViewMode === 'positions') {
    return <DayPositionView shifts={shifts} positions={positions} selectedDay={selectedDay} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
  }
  if (gridViewMode === 'positions') {
    return <WeekPositionView shifts={shifts} positions={positions} days={days} laborSummary={laborSummary} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
  }
  return <WeekEmployeeView shifts={shifts} employees={employees} days={days} laborSummary={laborSummary} isPublished={isPublished} onCellClick={onCellClick} onShiftClick={onShiftClick} onShiftDelete={onShiftDelete} />;
}
