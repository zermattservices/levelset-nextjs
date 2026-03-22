import * as React from 'react';
import sty from './BottomPanel.module.css';
import type { Shift, Position, LaborSummary, SalesForecast, TimeViewMode } from '@/lib/scheduling.types';
import { DAYPARTS } from '@/lib/scheduling/dayparts';

interface ScheduleSummaryTabProps {
  shifts: Shift[];
  positions: Position[];
  laborSummary: LaborSummary;
  canViewPay: boolean;
  forecasts?: SalesForecast[];
  days?: string[];
  timeViewMode?: TimeViewMode;
  selectedDay?: string;
}

type BreakdownMode = 'daypart' | 'hourly';

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCurrencyWhole(n: number): string {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function shiftNetHours(s: Shift): number {
  const [sh, sm] = s.start_time.split(':').map(Number);
  const [eh, em] = s.end_time.split(':').map(Number);
  let endMin = eh * 60 + em;
  const startMin = sh * 60 + sm;
  if (endMin <= startMin) endMin += 1440;
  return Math.max(0, (endMin - startMin - (s.break_minutes || 0)) / 60);
}

export function ScheduleSummaryTab({ shifts, positions, laborSummary, canViewPay, forecasts, days, timeViewMode, selectedDay }: ScheduleSummaryTabProps) {
  const [breakdownMode, setBreakdownMode] = React.useState<BreakdownMode>('daypart');

  // Filter shifts to selected day in day view
  const filteredShifts = React.useMemo(() => {
    if (timeViewMode === 'day' && selectedDay) {
      return shifts.filter(s => s.shift_date === selectedDay);
    }
    return shifts;
  }, [shifts, timeViewMode, selectedDay]);

  // Filter forecasts to selected day in day view
  const filteredForecasts = React.useMemo(() => {
    if (timeViewMode === 'day' && selectedDay && forecasts) {
      return forecasts.filter(f => f.forecast_date === selectedDay);
    }
    return forecasts;
  }, [forecasts, timeViewMode, selectedDay]);

  const filteredDays = React.useMemo(() => {
    if (timeViewMode === 'day' && selectedDay) return [selectedDay];
    return days;
  }, [days, timeViewMode, selectedDay]);

  const summaryRows = React.useMemo(() => {
    const posMap = new Map<string, { name: string; zone: string; hours: number; cost: number; employees: Set<string> }>();

    for (const s of filteredShifts) {
      const posId = s.position_id ?? '__none__';
      if (!posMap.has(posId)) {
        const pos = positions.find(p => p.id === posId);
        posMap.set(posId, {
          name: pos?.name ?? 'No Position',
          zone: pos?.zone ?? '—',
          hours: 0,
          cost: 0,
          employees: new Set(),
        });
      }
      const row = posMap.get(posId)!;
      row.hours += shiftNetHours(s);
      row.cost += s.assignment?.projected_cost ?? 0;
      if (s.assignment?.employee_id) {
        row.employees.add(s.assignment.employee_id);
      }
    }

    return Array.from(posMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredShifts, positions]);

  const totals = React.useMemo(() => {
    let hours = 0;
    let cost = 0;
    const employees = new Set<string>();
    for (const r of summaryRows) {
      hours += r.hours;
      cost += r.cost;
      r.employees.forEach(e => employees.add(e));
    }
    return { hours, cost, headcount: employees.size };
  }, [summaryRows]);

  // ── Breakdown rows (daypart or hourly) ──
  const hasForecast = filteredForecasts && filteredForecasts.length > 0 && filteredForecasts.some(f => f.intervals?.length);

  interface BreakdownRow {
    id: string;
    label: string;
    startMin: number;
    endMin: number;
    forecastSales: number;
    laborHours: number;
    laborCost: number;
  }

  const breakdownRows = React.useMemo((): BreakdownRow[] | null => {
    if (!hasForecast || !filteredDays?.length) return null;

    let buckets: BreakdownRow[];
    if (breakdownMode === 'daypart') {
      buckets = DAYPARTS.map(dp => ({
        id: dp.id,
        label: dp.label,
        startMin: parseTime(dp.defaultStart),
        endMin: parseTime(dp.defaultEnd),
        forecastSales: 0,
        laborHours: 0,
        laborCost: 0,
      }));
    } else {
      // Hourly: find the range of hours that have shifts
      let minHour = 24;
      let maxHour = 0;
      for (const s of filteredShifts) {
        const startH = Math.floor(parseTime(s.start_time) / 60);
        let endH = Math.ceil(parseTime(s.end_time) / 60);
        if (endH <= startH) endH = 24;
        if (startH < minHour) minHour = startH;
        if (endH > maxHour) maxHour = endH;
      }
      if (minHour >= maxHour) return null;
      buckets = [];
      for (let h = minHour; h < maxHour; h++) {
        buckets.push({
          id: `hour-${h}`,
          label: `${formatHour(h)} – ${formatHour(h + 1)}`,
          startMin: h * 60,
          endMin: (h + 1) * 60,
          forecastSales: 0,
          laborHours: 0,
          laborCost: 0,
        });
      }
    }

    // Sum forecast sales into buckets
    for (const fc of filteredForecasts!) {
      if (!fc.intervals?.length) continue;
      for (const iv of fc.intervals) {
        const ivStart = parseTime(iv.interval_start.substring(0, 5));
        const sales = iv.sales_amount ?? 0;
        if (sales <= 0) continue;
        for (const b of buckets) {
          if (ivStart >= b.startMin && ivStart < b.endMin) {
            b.forecastSales += sales;
            break;
          }
        }
      }
    }

    // Sum labor hours and cost (proportional for shifts spanning buckets)
    for (const shift of filteredShifts) {
      const shiftStart = parseTime(shift.start_time);
      let shiftEnd = parseTime(shift.end_time);
      if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

      const shiftHours = shiftNetHours(shift);
      const totalCost = shift.assignment?.projected_cost ?? 0;
      const totalMin = shiftEnd - shiftStart;
      if (totalMin <= 0) continue;

      for (const b of buckets) {
        const overlapStart = Math.max(shiftStart, b.startMin);
        const overlapEnd = Math.min(shiftEnd, b.endMin);
        if (overlapStart >= overlapEnd) continue;

        const fraction = (overlapEnd - overlapStart) / totalMin;
        b.laborHours += shiftHours * fraction;
        b.laborCost += totalCost * fraction;
      }
    }

    return buckets;
  }, [hasForecast, filteredForecasts, filteredShifts, filteredDays, breakdownMode]);

  const breakdownTotals = React.useMemo(() => {
    if (!breakdownRows) return null;
    let forecastSales = 0;
    let laborHours = 0;
    let laborCost = 0;
    for (const b of breakdownRows) {
      forecastSales += b.forecastSales;
      laborHours += b.laborHours;
      laborCost += b.laborCost;
    }
    return {
      forecastSales,
      laborHours,
      laborCost,
      productivity: laborHours > 0 ? forecastSales / laborHours : 0,
    };
  }, [breakdownRows]);

  return (
    <div>
      <table className={sty.table}>
        <thead>
          <tr>
            <th className={sty.th}>Position</th>
            <th className={sty.th}>Zone</th>
            <th className={sty.th} style={{ textAlign: 'right' }}>Hours</th>
            <th className={sty.th} style={{ textAlign: 'right' }}>Headcount</th>
            {canViewPay && <th className={sty.th} style={{ textAlign: 'right' }}>Labor Cost</th>}
          </tr>
        </thead>
        <tbody>
          {summaryRows.map((row, i) => (
            <tr key={i} className={sty.tr}>
              <td className={sty.td}>{row.name}</td>
              <td className={sty.td}>{row.zone}</td>
              <td className={sty.td} style={{ textAlign: 'right' }}>{row.hours.toFixed(1)}</td>
              <td className={sty.td} style={{ textAlign: 'right' }}>{row.employees.size}</td>
              {canViewPay && <td className={sty.td} style={{ textAlign: 'right' }}>{formatCurrency(row.cost)}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={sty.footerRow}>
            <td className={sty.td}><strong>Total</strong></td>
            <td className={sty.td}></td>
            <td className={sty.td} style={{ textAlign: 'right' }}><strong>{totals.hours.toFixed(1)}</strong></td>
            <td className={sty.td} style={{ textAlign: 'right' }}><strong>{totals.headcount}</strong></td>
            {canViewPay && <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrency(totals.cost)}</strong></td>}
          </tr>
          {canViewPay && laborSummary.ot_hours > 0 && (
            <>
              <tr className={sty.footerRow}>
                <td className={sty.td} colSpan={2} style={{ color: 'var(--ls-color-muted)' }}>Regular Hours</td>
                <td className={sty.td} style={{ textAlign: 'right', color: 'var(--ls-color-muted)' }}>{laborSummary.regular_hours.toFixed(1)}</td>
                <td className={sty.td}></td>
                <td className={sty.td} style={{ textAlign: 'right', color: 'var(--ls-color-muted)' }}>{formatCurrency(totals.cost - laborSummary.ot_premium)}</td>
              </tr>
              <tr className={sty.footerRow}>
                <td className={sty.td} colSpan={2} style={{ color: 'var(--ls-color-destructive-base)' }}>Overtime ({laborSummary.ot_hours.toFixed(1)} hrs)</td>
                <td className={sty.td} style={{ textAlign: 'right', color: 'var(--ls-color-destructive-base)' }}>{laborSummary.ot_hours.toFixed(1)}</td>
                <td className={sty.td}></td>
                <td className={sty.td} style={{ textAlign: 'right', color: 'var(--ls-color-destructive-base)' }}>+{formatCurrency(laborSummary.ot_premium)}</td>
              </tr>
            </>
          )}
        </tfoot>
      </table>

      {/* Breakdown table (daypart or hourly) — only shown when forecast data available */}
      {breakdownRows && canViewPay && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div className={sty.filterBar} style={{ margin: 0, padding: 0, border: 'none' }}>
              <button
                className={`${sty.filterBtn} ${breakdownMode === 'daypart' ? sty.filterBtnActive : ''}`}
                onClick={() => setBreakdownMode('daypart')}
              >
                Daypart
              </button>
              <button
                className={`${sty.filterBtn} ${breakdownMode === 'hourly' ? sty.filterBtnActive : ''}`}
                onClick={() => setBreakdownMode('hourly')}
              >
                Hourly
              </button>
            </div>
          </div>
          <table className={sty.table}>
            <thead>
              <tr>
                <th className={sty.th}>{breakdownMode === 'daypart' ? 'Daypart' : 'Hour'}</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Forecast Sales</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Labor Hours</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Labor Cost</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Labor Cost %</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Productivity ($/hr)</th>
              </tr>
            </thead>
            <tbody>
              {breakdownRows.map(b => (
                <tr key={b.id} className={sty.tr}>
                  <td className={sty.td}>{b.label}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>{formatCurrencyWhole(b.forecastSales)}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>{b.laborHours.toFixed(1)}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>{formatCurrency(b.laborCost)}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>
                    {b.forecastSales > 0 ? ((b.laborCost / b.forecastSales) * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>
                    {b.laborHours > 0 ? formatCurrency(b.forecastSales / b.laborHours) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {breakdownTotals && (
              <tfoot>
                <tr className={sty.footerRow}>
                  <td className={sty.td}><strong>Total</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrencyWhole(breakdownTotals.forecastSales)}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{breakdownTotals.laborHours.toFixed(1)}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrency(breakdownTotals.laborCost)}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{breakdownTotals.forecastSales > 0 ? ((breakdownTotals.laborCost / breakdownTotals.forecastSales) * 100).toFixed(2) + '%' : '—'}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrency(breakdownTotals.productivity)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
