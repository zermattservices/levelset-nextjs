import * as React from 'react';
import sty from './BottomPanel.module.css';
import type { Shift, Position, LaborSummary } from '@/lib/scheduling.types';

interface ScheduleSummaryTabProps {
  shifts: Shift[];
  positions: Position[];
  laborSummary: LaborSummary;
  canViewPay: boolean;
}

type ZoneFilterLocal = 'all' | 'FOH' | 'BOH';

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function ScheduleSummaryTab({ shifts, positions, laborSummary, canViewPay }: ScheduleSummaryTabProps) {
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
        </tfoot>
      </table>
    </div>
  );
}
