/**
 * EmptyState — shown before any messages are sent.
 */

import * as React from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import styles from './EmptyState.module.css';

export function EmptyState() {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>
        <SmartToyOutlinedIcon style={{ fontSize: 40, color: 'var(--ls-color-brand)' }} />
      </div>
      <h2 className={styles.title}>How can I help you today?</h2>
      <p className={styles.subtitle}>
        Ask me about employees, ratings, infractions, or team performance.
      </p>
    </div>
  );
}
