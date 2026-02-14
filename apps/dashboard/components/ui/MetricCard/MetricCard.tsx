import * as React from 'react';
import sty from './MetricCard.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { TrendCard } from '../TrendCard/TrendCard';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface MetricCardProps {
  className?: string;
  metricName?: React.ReactNode;
  trendCard2?: React.ReactNode;
  children?: React.ReactNode;
  metricTotal2?: React.ReactNode;
  delta?: React.ReactNode;
  heading5?: React.ReactNode;
  onClick?: () => void;
}

export function MetricCard({
  className,
  metricName,
  trendCard2,
  children,
  metricTotal2,
  delta,
  heading5,
  onClick,
}: MetricCardProps) {
  return (
    <div
      className={classNames(
        projectcss.all,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        sty.root,
        className
      )}
      onClick={onClick}
    >
      <div className={classNames(projectcss.all, sty.metricItem)}>
        {/* Title and Trend */}
        <div className={classNames(projectcss.all, sty.titleAndTrend)}>
          <div className={classNames(projectcss.all, sty.number)}>
            <span className={sty.slotTargetMetricName}>
              {metricName}
            </span>
          </div>
          {trendCard2}
        </div>

        {/* Supporting Metrics */}
        <div className={classNames(projectcss.all, sty.supportingMetrics)}>
          <div className={classNames(projectcss.all, sty.numberAndBadge)}>
            <div className={classNames(projectcss.all, sty.heading)}>
              <span className={sty.slotTargetChildren}>
                {children}
              </span>
            </div>
            <div className={classNames(projectcss.all, sty.metricTotal)}>
              <span className={sty.slotTargetMetricTotal2}>
                {metricTotal2}
              </span>
            </div>
            <span className={sty.slotTargetDelta}>
              {delta}
            </span>
          </div>
          
          {heading5 && (
            <div className={classNames(projectcss.all, sty.numberAndBadge2)}>
              <span className={sty.slotTargetHeading5}>
                {heading5}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetricCard;
