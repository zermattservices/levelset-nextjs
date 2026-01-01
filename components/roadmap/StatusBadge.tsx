import React from 'react';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface StatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idea;
  
  return (
    <span 
      className={styles.statusBadge}
      style={{ 
        backgroundColor: config.bgColor, 
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <span className={styles.statusDot} style={{ backgroundColor: config.textColor }} />
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: keyof typeof PRIORITY_CONFIG;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  
  // Only show badge for critical and high priority
  if (priority !== 'critical' && priority !== 'high') {
    return null;
  }
  
  return (
    <span 
      className={styles.priorityBadge}
      style={{ 
        backgroundColor: config.bgColor, 
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <span className={styles.priorityDot} style={{ backgroundColor: config.textColor }} />
      {config.label}
    </span>
  );
}
