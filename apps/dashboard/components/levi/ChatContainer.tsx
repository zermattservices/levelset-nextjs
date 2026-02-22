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
  const lastMessageCountRef = useRef(0);

  const totalMessages = historyMessages.length + sessionMessages.length;
  const isEmpty = totalMessages === 0 && historyLoaded;
  const isSending = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom on new messages (unless user scrolled up)
  useEffect(() => {
    if (totalMessages > lastMessageCountRef.current) {
      if (!userScrolledUpRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as any });
      }
    }
    lastMessageCountRef.current = totalMessages;
  }, [totalMessages]);

  // Also scroll when streaming status changes (response starting)
  useEffect(() => {
    if (isSending && !userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as any });
    }
  }, [isSending]);

  // Detect when user scrolls up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 100;
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (historyLoaded) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as any });
      });
    }
  }, [historyLoaded]);

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
          {isEmpty && <EmptyState />}

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
