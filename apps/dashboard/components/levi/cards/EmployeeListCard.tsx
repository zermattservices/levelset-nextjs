/**
 * EmployeeListCard — ranked or filtered list of employees.
 * Shows optional title, numbered rows with avatar, name, role, and metric.
 */

import * as React from 'react';
import styles from './EmployeeListCard.module.css';

interface EmployeeListItem {
  employee_id: string;
  name: string;
  role: string;
  rank?: number;
  metric_label?: string;
  metric_value?: number;
}

interface EmployeeListCardProps {
  payload: {
    title?: string;
    employees: EmployeeListItem[];
  };
  onEmployeeClick?: (employeeId: string) => void;
}

function getMetricClass(value: number): string {
  if (value >= 2.5) return styles.metricGreen;
  if (value >= 2.0) return styles.metricYellow;
  return styles.metricRed;
}

export function EmployeeListCard({
  payload,
  onEmployeeClick,
}: EmployeeListCardProps) {
  const { title, employees } = payload;

  if (!employees || employees.length === 0) return null;

  return (
    <div className={styles.card}>
      {title && <div className={styles.title}>{title}</div>}

      {employees.map((emp, index) => {
        const initial = emp.name.charAt(0).toUpperCase();
        const isLast = index === employees.length - 1;
        const isRatingMetric =
          emp.metric_value !== undefined && emp.metric_value <= 3.0;

        return (
          <div
            key={emp.employee_id || `emp-${index}`}
            className={`${styles.row} ${!isLast ? styles.rowBorder : ''} ${onEmployeeClick ? styles.clickable : ''}`}
            onClick={() => onEmployeeClick?.(emp.employee_id)}
            role={onEmployeeClick ? 'button' : undefined}
            tabIndex={onEmployeeClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onEmployeeClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onEmployeeClick(emp.employee_id);
              }
            }}
          >
            {emp.rank !== undefined && (
              <span className={styles.rank}>{emp.rank}</span>
            )}

            <div className={styles.avatar}>
              <span className={styles.avatarText}>{initial}</span>
            </div>

            <div className={styles.info}>
              <span className={styles.name}>{emp.name}</span>
              <span className={styles.role}>{emp.role}</span>
            </div>

            {emp.metric_value !== undefined && (
              <div className={styles.metricWrap}>
                <span
                  className={`${styles.metricValue} ${
                    isRatingMetric
                      ? getMetricClass(emp.metric_value)
                      : styles.metricRed
                  }`}
                >
                  {emp.metric_value.toFixed(2)}
                </span>
                {emp.metric_label && (
                  <span className={styles.metricLabel}>{emp.metric_label}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
