/**
 * ChatContainer — scrollable message list with auto-scroll and history pagination.
 * Renders history messages, then session messages, with typing indicator.
 *
 * Consecutive assistant session messages from the AI SDK (tool step + text step)
 * are grouped into a single visual message with one avatar.
 */

import * as React from 'react';
import { useRef, useEffect, useCallback, useMemo } from 'react';
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

// ---------------------------------------------------------------------------
// Group consecutive assistant messages into clusters
// ---------------------------------------------------------------------------

type SessionGroup =
  | { type: 'user'; message: any }
  | { type: 'assistant'; messages: any[] };

function groupSessionMessages(messages: any[]): SessionGroup[] {
  const groups: SessionGroup[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      groups.push({ type: 'user', message: msg });
    } else if (msg.role === 'assistant') {
      // Append to last group if it's also assistant
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.type === 'assistant') {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ type: 'assistant', messages: [msg] });
      }
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // Group consecutive assistant session messages
  const sessionGroups = useMemo(
    () => groupSessionMessages(sessionMessages),
    [sessionMessages]
  );

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

  // Show typing indicator whenever we're waiting for content:
  // 1. After user sends a message (waiting for first response)
  // 2. After tool calls finish but text hasn't started streaming yet
  //    (the LLM is generating the analysis — can take 30-60s)
  const showTyping = useMemo(() => {
    if (!isSending || sessionMessages.length === 0) return false;

    const lastMsg = sessionMessages[sessionMessages.length - 1];

    // Waiting for first assistant response
    if (lastMsg?.role === 'user') return true;

    // Check if the last assistant message group has any text content yet.
    // If it only has tool calls / data parts but no text, the LLM is still
    // generating the analysis — show "Thinking..." so the user knows.
    if (lastMsg?.role === 'assistant' && lastMsg.parts) {
      const hasText = lastMsg.parts.some(
        (p: any) => p.type === 'text' && p.text && p.text.trim().length > 0
      );
      if (!hasText) return true;
    }

    return false;
  }, [isSending, sessionMessages]);

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

          {/* Session messages — grouped so consecutive assistant msgs share one avatar */}
          {sessionGroups.map((group, idx) => {
            if (group.type === 'user') {
              return (
                <ChatMessage
                  key={`sg-${idx}-${group.message.id}`}
                  sessionMessage={group.message}
                  onEmployeeClick={onEmployeeClick}
                />
              );
            }
            // Assistant group — all consecutive assistant messages as one visual unit
            return (
              <ChatMessage
                key={`sg-${idx}-${group.messages[0]?.id}`}
                sessionMessages={group.messages}
                onEmployeeClick={onEmployeeClick}
              />
            );
          })}

          {/* Typing indicator */}
          {showTyping && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={sendMessage} disabled={isSending} />
    </div>
  );
}
