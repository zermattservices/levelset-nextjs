/**
 * ChatContainer — scrollable message list with auto-scroll and history pagination.
 * Renders history messages, then session messages, with typing indicator.
 */

import * as React from 'react';
import { useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { EmptyState } from './EmptyState';
import { ChatInput } from './ChatInput';
import type { HistoryMessage } from '@/lib/hooks/useLeviChat';
import styles from './ChatContainer.module.css';

interface ChatContainerProps {
  historyMessages: HistoryMessage[];
  sessionMessages: any[]; // UIMessage[] from @ai-sdk/react
  historyLoaded: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => void;
  sendMessage: (text: string) => void;
  status: string;
  onEmployeeClick?: (employeeId: string) => void;
}

export function ChatContainer({
  historyMessages,
  sessionMessages,
  historyLoaded,
  isLoadingMore,
  hasMoreHistory,
  loadMoreHistory,
  sendMessage,
  status,
  onEmployeeClick,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const totalMessages = historyMessages.length + sessionMessages.length;
  const isEmpty = totalMessages === 0 && historyLoaded;
  const isSending = status === 'streaming' || status === 'submitted';

  // Scroll to bottom helper — debounced via rAF to avoid excessive calls during streaming
  const scrollToBottom = useCallback(() => {
    if (userScrolledUpRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as any });
      rafRef.current = null;
    });
  }, []);

  // Auto-scroll whenever sessionMessages changes (AI SDK returns new array ref on each token)
  useEffect(() => {
    if (sessionMessages.length > 0) {
      scrollToBottom();
    }
  }, [sessionMessages, scrollToBottom]);

  // Also scroll when a new history message batch arrives
  useEffect(() => {
    scrollToBottom();
  }, [totalMessages, scrollToBottom]);

  // Detect when user scrolls up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 100;
  }, []);

  // Scroll to bottom on initial history load
  useEffect(() => {
    if (historyLoaded) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as any });
      });
    }
  }, [historyLoaded]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.scrollArea}
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className={styles.messageList}>
          {/* Load more history button */}
          {hasMoreHistory && (
            <div className={styles.loadMoreRow}>
              <button
                type="button"
                className={styles.loadMoreButton}
                onClick={loadMoreHistory}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && <EmptyState onPromptClick={sendMessage} />}

          {/* History messages */}
          {historyMessages.map((msg) => (
            <ChatMessage
              key={`h-${msg.id}`}
              historyMessage={msg}
              onEmployeeClick={onEmployeeClick}
            />
          ))}

          {/* Session messages */}
          {sessionMessages.map((msg: any) => (
            <ChatMessage
              key={`s-${msg.id}`}
              sessionMessage={msg}
              onEmployeeClick={onEmployeeClick}
            />
          ))}

          {/* Typing indicator */}
          {isSending &&
            sessionMessages.length > 0 &&
            sessionMessages[sessionMessages.length - 1]?.role === 'user' && (
              <TypingIndicator />
            )}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={sendMessage} disabled={isSending} />
    </div>
  );
}
