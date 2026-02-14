import * as React from 'react';
import sty from './LaborSummaryBar.module.css';
import type { LaborSummary } from '@/lib/scheduling.types';

interface LaborSummaryBarProps {
  laborSummary: LaborSummary;
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function LaborSummaryBar({ laborSummary }: LaborSummaryBarProps) {
  const avgPerHour = laborSummary.total_hours > 0
    ? laborSummary.total_cost / laborSummary.total_hours
    : 0;

  return (
    <div className={sty.bar}>
      <div className={sty.stat}>
        <span className={sty.statLabel}>Total Hours</span>
        <span className={sty.statValue}>{laborSummary.total_hours.toFixed(1)}</span>
      </div>
      <div className={sty.divider} />
      <div className={sty.stat}>
        <span className={sty.statLabel}>Labor Cost</span>
        <span className={sty.statValue}>{formatCurrency(laborSummary.total_cost)}</span>
      </div>
      <div className={sty.divider} />
      <div className={sty.stat}>
        <span className={sty.statLabel}>Avg $/Hour</span>
        <span className={sty.statValue}>{formatCurrency(avgPerHour)}</span>
      </div>
    </div>
  );
}
