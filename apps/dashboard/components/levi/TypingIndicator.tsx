/**
 * TypingIndicator — pulsing "Thinking..." indicator shown while waiting for first response.
 */

import * as React from 'react';
import { LeviIcon } from './LeviIcon';
import styles from './TypingIndicator.module.css';

export function TypingIndicator() {
  return (
    <div className={styles.container}>
      <div className={styles.avatar}>
        <LeviIcon size={16} color="var(--ls-color-brand)" />
      </div>
      <span className={styles.text}>Thinking...</span>
    </div>
  );
}
