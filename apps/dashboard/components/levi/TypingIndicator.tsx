/**
 * TypingIndicator — pulsing "Thinking..." indicator shown while waiting for first response.
 */

import * as React from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import styles from './TypingIndicator.module.css';

export function TypingIndicator() {
  return (
    <div className={styles.container}>
      <div className={styles.avatar}>
        <SmartToyOutlinedIcon style={{ fontSize: 18, color: 'var(--ls-color-brand)' }} />
      </div>
      <span className={styles.text}>Thinking...</span>
    </div>
  );
}
