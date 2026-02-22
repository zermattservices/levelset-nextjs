/**
 * ChatInput — bottom input bar for the Levi chat.
 * Auto-expanding textarea, Enter to send (Shift+Enter for newline).
 */

import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_LENGTH = 2000;

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= MAX_LENGTH) {
        setText(val);
        requestAnimationFrame(adjustHeight);
      }
    },
    [adjustHeight]
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
      }
    });
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Ask Levi anything..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
          />
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            <ArrowUpwardIcon style={{ fontSize: 20 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
