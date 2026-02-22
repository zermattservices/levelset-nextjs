/**
 * EmptyState — shown before any messages are sent.
 * Displays a large icon, heading, and quick-prompt buttons.
 */

import * as React from 'react';
import { LeviIcon } from './LeviIcon';
import styles from './EmptyState.module.css';

const PROMPTS = [
  'Who submitted the most ratings last week?',
  "Who's discipline record do we need to watch right now?",
  'What trends are you seeing in our ratings?',
  'How well are we adhering to our discipline system?',
];

interface EmptyStateProps {
  onPromptClick?: (text: string) => void;
}

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>
        <LeviIcon size={40} color="var(--ls-color-brand-base)" />
      </div>
      <h2 className={styles.title}>How can I help you today?</h2>

      {onPromptClick && (
        <div className={styles.promptGrid}>
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={styles.promptButton}
              onClick={() => onPromptClick(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
