import * as React from 'react';
import sty from './LaborSpreadTab.module.css';
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { LaborSummary } from '@/lib/scheduling.types';

interface LaborSpreadTabProps {
  laborSummary: LaborSummary;
  days: string[];
  canViewPay: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatCurrency(n: number): string {
  return '$' + n.toFixed(0);
}

export function LaborSpreadTab({ laborSummary, days, canViewPay }: LaborSpreadTabProps) {
  const chartData = React.useMemo(() => {
    return days.map(day => {
      const d = new Date(day + 'T00:00:00');
      const daySummary = laborSummary.by_day[day];
      return {
        name: DAY_LABELS[d.getDay()],
        hours: Math.round((daySummary?.hours ?? 0) * 10) / 10,
        cost: Math.round(daySummary?.cost ?? 0),
        suggestedHours: 0, // placeholder for future
        projectedSales: 0, // placeholder for future
      };
    });
  }, [days, laborSummary]);

  return (
    <div className={sty.container}>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ls-color-muted-soft)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fontFamily: 'var(--ls-font-heading)', fontWeight: 600, fill: 'var(--ls-color-muted)' }}
            axisLine={{ stroke: 'var(--ls-color-muted-border)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="hours"
            tick={{ fontSize: 11, fontFamily: 'var(--ls-font-heading)', fill: 'var(--ls-color-muted)' }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}h`}
          />
          {canViewPay && (
            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fontSize: 11, fontFamily: 'var(--ls-font-heading)', fill: 'var(--ls-color-muted)' }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => formatCurrency(v)}
            />
          )}
          <Tooltip
            contentStyle={{
              fontFamily: 'var(--ls-font-body)',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid var(--ls-color-muted-border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'hours') return [`${value}h`, 'Scheduled Hours'];
              if (name === 'cost') return [formatCurrency(value), 'Labor Cost'];
              if (name === 'suggestedHours') return [`${value}h`, 'Suggested Hours'];
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--ls-font-body)', paddingTop: 4 }}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                hours: 'Scheduled Hours',
                suggestedHours: 'Suggested Hours (Coming Soon)',
                projectedSales: 'Projected Sales (Coming Soon)',
              };
              return labels[value] ?? value;
            }}
          />
          <Bar
            yAxisId="hours"
            dataKey="hours"
            fill="#31664a"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
          />
          <Bar
            yAxisId="hours"
            dataKey="suggestedHours"
            fill="#d1d5db"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
            strokeDasharray="4 2"
          />
          <Area
            yAxisId={canViewPay ? 'cost' : 'hours'}
            dataKey="projectedSales"
            fill="#bfdbfe40"
            stroke="#93c5fd"
            strokeDasharray="4 2"
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
