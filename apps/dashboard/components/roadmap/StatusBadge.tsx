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
      <span className={styles.statusDot} style={{ color: config.textColor }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="3" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </svg>
      </span>
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: keyof typeof PRIORITY_CONFIG;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  
  return (
    <span 
      className={styles.priorityBadge}
      style={{ 
        backgroundColor: config.bgColor, 
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      {config.label}
    </span>
  );
}
