/**
 * useLeviChat — wraps @ai-sdk/react useChat for the Levi AI chat experience.
 *
 * Architecture:
 *   - historyMessages: loaded from agent history API (paginated, scroll-up for more)
 *   - sessionMessages: managed by useChat (current session's send/receive)
 *   - allMessages: [...history, ...session] combined for display
 *
 * The agent uses Vercel AI SDK's createUIMessageStream, so useChat consumes
 * it natively. Custom events (data-tool-status, data-ui-block) appear as
 * message parts and are rendered inline.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { createSupabaseClient } from '@/util/supabase/component';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Tool call info extracted from history messages */
export interface ToolCallInfo {
  id: string;
  name: string;
  label: string;
  status: 'calling' | 'done';
}

/** UI block data from the agent */
export interface UIBlock {
  blockType:
    | 'employee-card'
    | 'employee-list'
    | 'rating-summary'
    | 'infraction-card'
    | 'disc-action-card';
  blockId: string;
  payload: Record<string, any>;
}

/** A message part in our normalized format (for history rendering) */
export type HistoryMessagePart =
  | { type: 'text'; text: string }
  | { type: 'ui-block'; block: UIBlock };

/** A message from conversation history */
export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  toolCalls?: ToolCallInfo[];
  parts?: HistoryMessagePart[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || 'https://levelset-agent.fly.dev';

const HISTORY_PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
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

function parseHistoryToolCalls(
  toolCalls: unknown
): ToolCallInfo[] | undefined {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined;
  return toolCalls
    .filter((tc: any) => tc?.function?.name)
    .map((tc: any) => ({
      id: tc.id ?? tc.toolCallId ?? '',
      name: tc.function.name,
      label: getToolLabel(tc.function.name),
      status: 'done' as const,
    }));
}

function mapHistoryMessage(msg: any): HistoryMessage {
  const base: HistoryMessage = {
    id: msg.id,
    role: msg.role,
    content: msg.content ?? '',
    created_at: msg.created_at,
  };

  if (msg.role === 'assistant') {
    if (msg.tool_calls) {
      const toolCalls = parseHistoryToolCalls(msg.tool_calls);
      if (toolCalls && toolCalls.length > 0) {
        base.toolCalls = toolCalls;
      }
    }

    const parts: HistoryMessagePart[] = [];
    if (base.content) {
      parts.push({ type: 'text', text: base.content });
    }
    if (
      msg.ui_blocks &&
      Array.isArray(msg.ui_blocks) &&
      msg.ui_blocks.length > 0
    ) {
      const seen = new Set<string>();
      for (const b of msg.ui_blocks as UIBlock[]) {
        if (seen.has(b.blockId)) continue;
        seen.add(b.blockId);
        parts.push({ type: 'ui-block', block: b });
      }
    }
    if (parts.length > 0) {
      base.parts = parts;
    }
  }
  return base;
}

/**
 * Consolidate consecutive assistant history messages into a single message.
 *
 * During streaming the agent persists separate DB rows for each tool-call step
 * and then a final row with the text + UI blocks. When loaded from history these
 * appear as separate HistoryMessages, but they should render as one visual unit
 * (just like session messages are grouped via groupSessionMessages).
 *
 * Merges: toolCalls, parts (text before ui-blocks), and content.
 */
function consolidateHistoryMessages(
  messages: HistoryMessage[]
): HistoryMessage[] {
  const result: HistoryMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push(msg);
      continue;
    }

    // Assistant message — try to merge with previous if also assistant
    const prev = result[result.length - 1];
    if (prev && prev.role === 'assistant') {
      // Merge tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        prev.toolCalls = [...(prev.toolCalls || []), ...msg.toolCalls];
      }

      // Merge parts: collect text parts first, then ui-block parts
      if (msg.parts && msg.parts.length > 0) {
        const existingParts = prev.parts || [];
        const existingText = existingParts.filter((p) => p.type === 'text');
        const existingBlocks = existingParts.filter(
          (p) => p.type === 'ui-block'
        );
        const newText = msg.parts.filter((p) => p.type === 'text');
        const newBlocks = msg.parts.filter((p) => p.type === 'ui-block');

        prev.parts = [
          ...existingText,
          ...newText,
          ...existingBlocks,
          ...newBlocks,
        ];
      }

      // Merge content (for fallback rendering)
      if (msg.content) {
        prev.content = prev.content
          ? prev.content + '\n' + msg.content
          : msg.content;
      }
    } else {
      // Start a new group — shallow-copy so we can safely mutate during merge
      result.push({
        ...msg,
        toolCalls: msg.toolCalls ? [...msg.toolCalls] : undefined,
        parts: msg.parts ? [...msg.parts] : undefined,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLeviChat() {
  const auth = useAuth();
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();

  // History state
  const [historyMessages, setHistoryMessages] = useState<HistoryMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const lastLoadedLocationRef = useRef<string | null>(null);

  // Refs for transport closure (avoids recreating transport on every render)
  const tokenRef = useRef<string | null>(null);
  const orgIdRef = useRef<string | null>(selectedLocationOrgId);
  const locationIdRef = useRef<string | null>(selectedLocationId);

  // Keep refs in sync
  useEffect(() => {
    orgIdRef.current = selectedLocationOrgId;
  }, [selectedLocationOrgId]);
  useEffect(() => {
    locationIdRef.current = selectedLocationId;
  }, [selectedLocationId]);

  // Get auth token
  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token ?? null;
    });
  }, [auth.id]);

  // Transport — created once, reads current values from refs
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${AGENT_URL}/api/ai/chat`,
        headers: () => {
          const token = tokenRef.current;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        prepareSendMessagesRequest: ({ messages, headers, credentials }) => {
          // Extract the last user message text
          const lastUserMsg = [...messages]
            .reverse()
            .find((m) => m.role === 'user');
          const textPart = lastUserMsg?.parts?.find(
            (p): p is { type: 'text'; text: string } => p.type === 'text'
          );
          const text = textPart?.text || '';
          return {
            body: {
              message: text,
              org_id: orgIdRef.current,
              location_id: locationIdRef.current,
              stream: true,
            },
            headers,
            credentials,
          };
        },
      }),
    []
  );

  // AI SDK useChat — handles streaming, tool calls, custom data events
  const {
    messages: sessionMessages,
    sendMessage: sdkSendMessage,
    status,
    error: chatError,
    setMessages: setSessionMessages,
  } = useChat({ transport });

  // Combined messages for display
  const allMessages = useMemo(
    () => ({ history: historyMessages, session: sessionMessages }),
    [historyMessages, sessionMessages]
  );

  // ---------------------------------------------------------------------------
  // History loading
  // ---------------------------------------------------------------------------

  const getToken = useCallback(async () => {
    if (tokenRef.current) return tokenRef.current;
    const supabase = createSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    tokenRef.current = token;
    return token;
  }, []);

  // Load initial history when location changes
  useEffect(() => {
    const orgId = selectedLocationOrgId;
    const locationId = selectedLocationId;
    if (!orgId || !locationId) return;
    if (lastLoadedLocationRef.current === locationId) return;

    const loadInitialHistory = async () => {
      const token = await getToken();
      if (!token) return;

      try {
        const res = await fetch(
          `${AGENT_URL}/api/ai/chat/history?org_id=${orgId}&location_id=${locationId}&limit=${HISTORY_PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.messages ?? []).map(mapHistoryMessage);
          setHistoryMessages(consolidateHistoryMessages(mapped));
          setHasMoreHistory(data.hasMore ?? false);
        }
      } catch (err) {
        console.warn('[LeviChat] Failed to load history:', err);
      } finally {
        lastLoadedLocationRef.current = locationId;
        setHistoryLoaded(true);
      }
    };

    setHistoryMessages([]);
    setSessionMessages([]);
    setHistoryLoaded(false);
    setHasMoreHistory(false);
    loadInitialHistory();
  }, [selectedLocationId, selectedLocationOrgId, getToken, setSessionMessages]);

  // Load older messages (scroll-up pagination)
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory) return;
    const orgId = selectedLocationOrgId;
    const locationId = selectedLocationId;
    if (!orgId || !locationId) return;

    const oldest = historyMessages[0];
    if (!oldest) return;

    setIsLoadingMore(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `${AGENT_URL}/api/ai/chat/history?org_id=${orgId}&location_id=${locationId}&limit=${HISTORY_PAGE_SIZE}&before=${encodeURIComponent(oldest.created_at)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const olderMessages: HistoryMessage[] = (data.messages ?? []).map(
          mapHistoryMessage
        );
        if (olderMessages.length > 0) {
          setHistoryMessages((prev) =>
            consolidateHistoryMessages([...olderMessages, ...prev])
          );
        }
        setHasMoreHistory(data.hasMore ?? false);
      }
    } catch (err) {
      console.warn('[LeviChat] Failed to load more history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMoreHistory,
    historyMessages,
    selectedLocationId,
    selectedLocationOrgId,
    getToken,
  ]);

  // ---------------------------------------------------------------------------
  // Send message wrapper
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      sdkSendMessage({ text: trimmed });
    },
    [sdkSendMessage]
  );

  return {
    historyMessages: allMessages.history,
    sessionMessages: allMessages.session,
    historyLoaded,
    isLoadingMore,
    hasMoreHistory,
    loadMoreHistory,
    sendMessage,
    status,
    error: chatError,
  };
}
