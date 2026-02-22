/**
 * ChatMessage — renders a single user or assistant message.
 *
 * Handles two formats:
 *   1. HistoryMessage — from the agent history API (normalized parts)
 *   2. UIMessage — from @ai-sdk/react useChat (session messages with parts[])
 *
 * Assistant messages render markdown via react-markdown and interleave
 * text with UI block cards and tool call summaries.
 *
 * For session messages, consecutive assistant messages from the AI SDK are
 * grouped into a single visual message via the `sessionMessages` array prop.
 */

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LeviIcon } from './LeviIcon';
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
  /** Single session message from useChat (user messages) */
  sessionMessage?: any;
  /** Grouped assistant session messages (consecutive assistant msgs merged) */
  sessionMessages?: any[];
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
        <LeviIcon size={16} color="var(--ls-color-brand)" />
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
// Helpers for session message part detection
// ---------------------------------------------------------------------------

function isToolPart(part: any): boolean {
  // AI SDK v6: tool parts are 'dynamic-tool' or 'tool-<name>'
  return (
    part.type === 'dynamic-tool' ||
    (typeof part.type === 'string' && part.type.startsWith('tool-'))
  );
}

function isDataPart(part: any): boolean {
  // AI SDK v6: custom data events are 'data-<name>' (e.g. 'data-ui-block')
  return typeof part.type === 'string' && part.type.startsWith('data-');
}

// ---------------------------------------------------------------------------
// Render parts from a single AI SDK message
// ---------------------------------------------------------------------------

function renderSessionParts(
  message: any,
  onEmployeeClick?: (id: string) => void,
  keyPrefix: string = '',
): { nodes: React.ReactNode[]; toolCalls: ToolCallInfo[] } {
  const toolCalls: ToolCallInfo[] = [];
  const seenToolIds = new Set<string>();
  const renderedParts: React.ReactNode[] = [];
  let toolSummaryAdded = false;

  // Collect tool calls first
  if (message.parts) {
    for (const part of message.parts) {
      if (isToolPart(part) && part.toolCallId) {
        if (!seenToolIds.has(part.toolCallId)) {
          seenToolIds.add(part.toolCallId);
          toolCalls.push({
            id: part.toolCallId,
            name: part.toolName || part.type.replace('tool-', ''),
            label: getToolLabel(
              part.toolName || part.type.replace('tool-', '')
            ),
            status: part.state === 'output-available' ? 'done' : 'calling',
          });
        }
      }
    }
  }

  // Render parts
  if (message.parts) {
    for (let i = 0; i < message.parts.length; i++) {
      const part = message.parts[i];

      if (part.type === 'text' && part.text) {
        renderedParts.push(
          <div key={`${keyPrefix}text-${i}`} className={styles.prose}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {part.text}
            </ReactMarkdown>
          </div>
        );
      } else if (isToolPart(part) && !toolSummaryAdded) {
        if (toolCalls.length > 0) {
          renderedParts.push(
            <ToolCallSummary
              key={`${keyPrefix}tools`}
              toolCalls={toolCalls}
            />
          );
          toolSummaryAdded = true;
        }
      } else if (isDataPart(part) && part.data) {
        const data = part.data;
        if (data && data.blockType && data.blockId) {
          renderedParts.push(
            <div key={`${keyPrefix}block-${i}`} className={styles.uiBlockWrap}>
              <UIBlockRenderer
                block={data as UIBlock}
                onEmployeeClick={onEmployeeClick}
              />
            </div>
          );
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
        <div key={`${keyPrefix}fallback`} className={styles.prose}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {contentText}
          </ReactMarkdown>
        </div>
      );
    }
  }

  return { nodes: renderedParts, toolCalls };
}

// ---------------------------------------------------------------------------
// Grouped assistant session message (multiple AI SDK messages → one visual)
// ---------------------------------------------------------------------------

function AssistantSessionGroup({
  messages,
  onEmployeeClick,
}: {
  messages: any[];
  onEmployeeClick?: (id: string) => void;
}) {
  // Render parts from ALL messages in the group
  const allNodes: React.ReactNode[] = [];

  for (let m = 0; m < messages.length; m++) {
    const { nodes } = renderSessionParts(
      messages[m],
      onEmployeeClick,
      `m${m}-`
    );
    allNodes.push(...nodes);
  }

  return (
    <div className={styles.assistantRow}>
      <div className={styles.avatar}>
        <LeviIcon size={16} color="var(--ls-color-brand)" />
      </div>
      <div className={styles.content}>{allNodes}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatMessage({
  historyMessage,
  sessionMessage,
  sessionMessages,
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

  // Grouped assistant session messages (consecutive assistant msgs merged)
  if (sessionMessages && sessionMessages.length > 0) {
    return (
      <AssistantSessionGroup
        messages={sessionMessages}
        onEmployeeClick={onEmployeeClick}
      />
    );
  }

  // Single session message (user messages)
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
    // Single assistant message fallback
    return (
      <AssistantSessionGroup
        messages={[sessionMessage]}
        onEmployeeClick={onEmployeeClick}
      />
    );
  }

  return null;
}
