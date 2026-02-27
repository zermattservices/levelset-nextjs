import * as React from 'react';
import sty from './BottomPanel.module.css';
import type { Shift, Position, LaborSummary, SalesForecast } from '@/lib/scheduling.types';
import { DAYPARTS } from '@/lib/scheduling/dayparts';

interface ScheduleSummaryTabProps {
  shifts: Shift[];
  positions: Position[];
  laborSummary: LaborSummary;
  canViewPay: boolean;
  forecasts?: SalesForecast[];
  days?: string[];
}

type ZoneFilterLocal = 'all' | 'FOH' | 'BOH';

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

export function ScheduleSummaryTab({ shifts, positions, laborSummary, canViewPay, forecasts, days }: ScheduleSummaryTabProps) {
  const [zoneFilter, setZoneFilter] = React.useState<ZoneFilterLocal>('all');

  const summaryRows = React.useMemo(() => {
    const posMap = new Map<string, { name: string; zone: string; hours: number; cost: number; employees: Set<string> }>();

    for (const s of shifts) {
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
      // calc hours
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      const netHours = Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60 - (s.break_minutes || 0) / 60);
      row.hours += netHours;
      row.cost += s.assignment?.projected_cost ?? 0;
      if (s.assignment?.employee_id) {
        row.employees.add(s.assignment.employee_id);
      }
    }

    let rows = Array.from(posMap.values());
    if (zoneFilter !== 'all') {
      rows = rows.filter(r => r.zone === zoneFilter);
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts, positions, zoneFilter]);

  const totals = React.useMemo(() => {
    let hours = 0;
    let cost = 0;
    let employees = new Set<string>();
    for (const r of summaryRows) {
      hours += r.hours;
      cost += r.cost;
      r.employees.forEach(e => employees.add(e));
    }
    return { hours, cost, headcount: employees.size };
  }, [summaryRows]);

  // ── Daypart productivity ──
  const hasForecast = forecasts && forecasts.length > 0 && forecasts.some(f => f.intervals?.length);

  const daypartProductivity = React.useMemo(() => {
    if (!hasForecast || !days?.length) return null;

    const dayparts = DAYPARTS.map(dp => ({
      id: dp.id,
      label: dp.label,
      startMin: parseTime(dp.defaultStart),
      endMin: parseTime(dp.defaultEnd),
      forecastSales: 0,
      laborHours: 0,
      laborCost: 0,
    }));

    // Sum forecast sales by daypart
    for (const fc of forecasts!) {
      if (!fc.intervals?.length) continue;
      for (const iv of fc.intervals) {
        const ivStart = parseTime(iv.interval_start.substring(0, 5));
        const sales = iv.sales_amount ?? 0;
        if (sales <= 0) continue;
        // Find which daypart this interval falls in
        for (const dp of dayparts) {
          if (ivStart >= dp.startMin && ivStart < dp.endMin) {
            dp.forecastSales += sales;
            break;
          }
        }
      }
    }

    // Sum labor hours and cost by daypart (proportional for shifts spanning dayparts)
    for (const shift of shifts) {
      const shiftStart = parseTime(shift.start_time);
      let shiftEnd = parseTime(shift.end_time);
      if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

      const shiftHours = Math.max(0, (shiftEnd - shiftStart) / 60 - (shift.break_minutes || 0) / 60);
      const totalCost = shift.assignment?.projected_cost ?? 0;
      const totalMin = shiftEnd - shiftStart;
      if (totalMin <= 0) continue;

      for (const dp of dayparts) {
        // Calculate overlap between shift and daypart
        const overlapStart = Math.max(shiftStart, dp.startMin);
        const overlapEnd = Math.min(shiftEnd, dp.endMin);
        if (overlapStart >= overlapEnd) continue;

        const overlapMin = overlapEnd - overlapStart;
        const fraction = overlapMin / totalMin;
        dp.laborHours += shiftHours * fraction;
        dp.laborCost += totalCost * fraction;
      }
    }

    return dayparts;
  }, [hasForecast, forecasts, shifts, days]);

  const daypartTotals = React.useMemo(() => {
    if (!daypartProductivity) return null;
    let forecastSales = 0;
    let laborHours = 0;
    let laborCost = 0;
    for (const dp of daypartProductivity) {
      forecastSales += dp.forecastSales;
      laborHours += dp.laborHours;
      laborCost += dp.laborCost;
    }
    return {
      forecastSales,
      laborHours,
      laborCost,
      productivity: laborHours > 0 ? forecastSales / laborHours : 0,
    };
  }, [daypartProductivity]);

  return (
    <div>
      <div className={sty.filterBar}>
        {(['all', 'FOH', 'BOH'] as ZoneFilterLocal[]).map(z => (
          <button
            key={z}
            className={`${sty.filterBtn} ${zoneFilter === z ? sty.filterBtnActive : ''}`}
            onClick={() => setZoneFilter(z)}
          >
            {z === 'all' ? 'All' : z}
          </button>
        ))}
      </div>
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
                <td className={sty.td} colSpan={2} style={{ color: 'var(--ls-color-warning-base)' }}>Overtime ({laborSummary.ot_hours.toFixed(1)} hrs)</td>
                <td className={sty.td} style={{ textAlign: 'right', color: 'var(--ls-color-warning-base)' }}>{laborSummary.ot_hours.toFixed(1)}</td>
                <td className={sty.td}></td>
                <td className={sty.td} style={{ textAlign: 'right', color: 'var(--ls-color-warning-base)' }}>+{formatCurrency(laborSummary.ot_premium)}</td>
              </tr>
            </>
          )}
        </tfoot>
      </table>

      {/* Daypart Productivity (only shown when forecast data available) */}
      {daypartProductivity && canViewPay && (
        <div style={{ marginTop: 20 }}>
          <table className={sty.table}>
            <thead>
              <tr>
                <th className={sty.th}>Daypart</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Forecast Sales</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Labor Hours</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Labor Cost</th>
                <th className={sty.th} style={{ textAlign: 'right' }}>Productivity ($/hr)</th>
              </tr>
            </thead>
            <tbody>
              {daypartProductivity.map(dp => (
                <tr key={dp.id} className={sty.tr}>
                  <td className={sty.td}>{dp.label}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>{formatCurrencyWhole(dp.forecastSales)}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>{dp.laborHours.toFixed(1)}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>{formatCurrency(dp.laborCost)}</td>
                  <td className={sty.td} style={{ textAlign: 'right' }}>
                    {dp.laborHours > 0 ? formatCurrency(dp.forecastSales / dp.laborHours) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {daypartTotals && (
              <tfoot>
                <tr className={sty.footerRow}>
                  <td className={sty.td}><strong>Total</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrencyWhole(daypartTotals.forecastSales)}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{daypartTotals.laborHours.toFixed(1)}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrency(daypartTotals.laborCost)}</strong></td>
                  <td className={sty.td} style={{ textAlign: 'right' }}><strong>{formatCurrency(daypartTotals.productivity)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
