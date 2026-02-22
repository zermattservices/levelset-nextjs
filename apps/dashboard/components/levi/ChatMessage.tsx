/**
 * ChatMessage — renders a single user or assistant message.
 *
 * Handles two formats:
 *   1. HistoryMessage — from the agent history API (normalized parts)
 *   2. UIMessage — from @ai-sdk/react useChat (session messages with parts[])
 *
 * Assistant messages render markdown via react-markdown and interleave
 * text with UI block cards and tool call summaries.
 */

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { UIBlockRenderer } from './cards/UIBlockRenderer';
import { ToolCallSummary } from './ToolCallSummary';
import type {
  HistoryMessage,
  HistoryMessagePart,
  ToolCallInfo,
  UIBlock,
} from '@/lib/hooks/useLeviChat';
import styles from './ChatMessage.module.css';

// ---------------------------------------------------------------------------
// Helpers for tool label resolution
// ---------------------------------------------------------------------------

function getToolLabel(toolName: string): string {
  switch (toolName) {
    case 'lookup_employee':
      return 'Looking up employee';
    case 'list_employees':
      return 'Listing employees';
    case 'get_employee_ratings':
      return 'Checking employee ratings';
    case 'get_employee_infractions':
      return 'Checking employee infractions';
    case 'get_employee_profile':
      return 'Loading employee profile';
    case 'get_team_overview':
      return 'Loading team overview';
    case 'get_discipline_summary':
      return 'Loading discipline overview';
    case 'get_position_rankings':
      return 'Ranking by position';
    default:
      return `Running ${toolName.replace(/_/g, ' ')}`;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  /** History message from the API */
  historyMessage?: HistoryMessage;
  /** Session message from useChat (AI SDK UIMessage) */
  sessionMessage?: any; // UIMessage from @ai-sdk/react
  onEmployeeClick?: (employeeId: string) => void;
}

// ---------------------------------------------------------------------------
// User bubble
// ---------------------------------------------------------------------------

function UserBubble({ text }: { text: string }) {
  return (
    <div className={styles.userRow}>
      <div className={styles.userBubble}>{text}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assistant message (history)
// ---------------------------------------------------------------------------

function AssistantHistoryMessage({
  message,
  onEmployeeClick,
}: {
  message: HistoryMessage;
  onEmployeeClick?: (id: string) => void;
}) {
  return (
    <div className={styles.assistantRow}>
      <div className={styles.avatar}>
        <SmartToyOutlinedIcon
          style={{ fontSize: 18, color: 'var(--ls-color-brand)' }}
        />
      </div>
      <div className={styles.content}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallSummary toolCalls={message.toolCalls} />
        )}
        {message.parts && message.parts.length > 0
          ? message.parts.map((part: HistoryMessagePart, i: number) => {
              if (part.type === 'text') {
                return (
                  <div key={i} className={styles.prose}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {part.text}
                    </ReactMarkdown>
                  </div>
                );
              }
              if (part.type === 'ui-block') {
                return (
                  <div key={i} className={styles.uiBlockWrap}>
                    <UIBlockRenderer
                      block={part.block}
                      onEmployeeClick={onEmployeeClick}
                    />
                  </div>
                );
              }
              return null;
            })
          : message.content && (
              <div className={styles.prose}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assistant message (session / AI SDK UIMessage)
// ---------------------------------------------------------------------------

function AssistantSessionMessage({
  message,
  onEmployeeClick,
}: {
  message: any;
  onEmployeeClick?: (id: string) => void;
}) {
  // Collect tool calls from parts
  const toolCalls: ToolCallInfo[] = [];
  const seenToolIds = new Set<string>();

  if (message.parts) {
    for (const part of message.parts) {
      if (
        (part.type === 'tool-invocation' || part.type === 'tool-call') &&
        part.toolInvocation
      ) {
        const inv = part.toolInvocation;
        if (!seenToolIds.has(inv.toolCallId)) {
          seenToolIds.add(inv.toolCallId);
          toolCalls.push({
            id: inv.toolCallId,
            name: inv.toolName,
            label: getToolLabel(inv.toolName),
            status: inv.state === 'result' ? 'done' : 'calling',
          });
        }
      }
    }
  }

  // Render parts in order: text, tool summaries, data-ui-block
  const renderedParts: React.ReactNode[] = [];
  let toolSummaryAdded = false;

  if (message.parts) {
    for (let i = 0; i < message.parts.length; i++) {
      const part = message.parts[i];

      if (part.type === 'text' && part.text) {
        renderedParts.push(
          <div key={`text-${i}`} className={styles.prose}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {part.text}
            </ReactMarkdown>
          </div>
        );
      } else if (
        (part.type === 'tool-invocation' || part.type === 'tool-call') &&
        !toolSummaryAdded
      ) {
        // Show tool summary once (before the first tool call part)
        if (toolCalls.length > 0) {
          renderedParts.push(
            <ToolCallSummary key="tools" toolCalls={toolCalls} />
          );
          toolSummaryAdded = true;
        }
      } else if (part.type === 'data' && part.data) {
        // Custom data events from agent (data-ui-block, data-tool-status)
        const data = Array.isArray(part.data) ? part.data : [part.data];
        for (let j = 0; j < data.length; j++) {
          const item = data[j];
          if (item && item.blockType && item.blockId) {
            renderedParts.push(
              <div key={`block-${i}-${j}`} className={styles.uiBlockWrap}>
                <UIBlockRenderer
                  block={item as UIBlock}
                  onEmployeeClick={onEmployeeClick}
                />
              </div>
            );
          }
        }
      }
    }
  }

  // Fallback to content string if no parts rendered
  if (renderedParts.length === 0 && message.content) {
    const contentText =
      typeof message.content === 'string'
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('')
          : '';
    if (contentText) {
      renderedParts.push(
        <div key="fallback" className={styles.prose}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {contentText}
          </ReactMarkdown>
        </div>
      );
    }
  }

  return (
    <div className={styles.assistantRow}>
      <div className={styles.avatar}>
        <SmartToyOutlinedIcon
          style={{ fontSize: 18, color: 'var(--ls-color-brand)' }}
        />
      </div>
      <div className={styles.content}>{renderedParts}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatMessage({
  historyMessage,
  sessionMessage,
  onEmployeeClick,
}: ChatMessageProps) {
  // History message rendering
  if (historyMessage) {
    if (historyMessage.role === 'user') {
      return <UserBubble text={historyMessage.content} />;
    }
    return (
      <AssistantHistoryMessage
        message={historyMessage}
        onEmployeeClick={onEmployeeClick}
      />
    );
  }

  // Session message rendering (AI SDK UIMessage)
  if (sessionMessage) {
    if (sessionMessage.role === 'user') {
      // Extract text from session message
      const text =
        sessionMessage.parts?.find((p: any) => p.type === 'text')?.text ||
        (typeof sessionMessage.content === 'string'
          ? sessionMessage.content
          : '');
      return <UserBubble text={text} />;
    }
    return (
      <AssistantSessionMessage
        message={sessionMessage}
        onEmployeeClick={onEmployeeClick}
      />
    );
  }

  return null;
}
