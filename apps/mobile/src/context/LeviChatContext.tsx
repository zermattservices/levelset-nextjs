/**
 * LeviChatContext
 * Manages chat messages, sending, and conversation state for Levi AI.
 *
 * Architecture:
 *   - historyMessages: loaded from server (paginated, scroll-up to load more)
 *   - sessionMessages: sent/received this session (appended at bottom)
 *   - messages = [...history, ...session] — combined for display
 *
 * On mount the ChatScreen shows the empty state. History loads in the
 * background and is accessible by scrolling up. When the user scrolls
 * to the top, `loadMoreHistory()` fetches the next page.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { useLocation } from "./LocationContext";

export interface ToolCallEvent {
  id: string;
  name: string;
  label: string;
  status: "calling" | "done";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  toolCalls?: ToolCallEvent[];
  isStreaming?: boolean;
}

interface LeviChatContextType {
  /** All messages: history + current session */
  messages: ChatMessage[];
  /** Whether user has sent a message this session */
  hasNewMessages: boolean;
  /** Whether the initial history page has loaded */
  historyLoaded: boolean;
  /** Whether an older page is being fetched */
  isLoadingMore: boolean;
  /** Whether there are more history pages to fetch */
  hasMoreHistory: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  clearHistory: () => void;
}

const LeviChatContext = createContext<LeviChatContextType | undefined>(
  undefined
);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const HISTORY_PAGE_SIZE = 10;

function getAgentUrl(): string {
  return process.env.EXPO_PUBLIC_AGENT_URL || "https://levelset-agent.fly.dev";
}

interface LeviChatProviderProps {
  children: React.ReactNode;
}

export function LeviChatProvider({ children }: LeviChatProviderProps) {
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const { selectedLocation } = useLocation();
  const streamingIdRef = useRef<string | null>(null);
  const lastLoadedLocationRef = useRef<string | null>(null);

  // Combined messages: history first, then current session
  const messages = useMemo(
    () => [...historyMessages, ...sessionMessages],
    [historyMessages, sessionMessages]
  );

  const hasNewMessages = sessionMessages.length > 0;

  // Load initial page of history when location changes
  useEffect(() => {
    const orgId = selectedLocation?.org_id;
    const locationId = selectedLocation?.id;
    if (!orgId || !locationId || !session?.access_token) return;
    if (lastLoadedLocationRef.current === locationId) return;

    const loadInitialHistory = async () => {
      try {
        const res = await fetch(
          `${getAgentUrl()}/api/ai/chat/history?org_id=${orgId}&location_id=${locationId}&limit=${HISTORY_PAGE_SIZE}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setHistoryMessages(data.messages ?? []);
          setHasMoreHistory(data.hasMore ?? false);
        }
      } catch (err) {
        console.warn("[LeviChat] Failed to load history:", err);
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
  }, [selectedLocation?.id, session?.access_token]);

  // Load older messages (triggered by scrolling to top)
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory) return;
    const orgId = selectedLocation?.org_id;
    const locationId = selectedLocation?.id;
    if (!orgId || !locationId || !session?.access_token) return;

    // Use the oldest history message's created_at as cursor
    const oldest = historyMessages[0];
    if (!oldest) return;

    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `${getAgentUrl()}/api/ai/chat/history?org_id=${orgId}&location_id=${locationId}&limit=${HISTORY_PAGE_SIZE}&before=${encodeURIComponent(oldest.created_at)}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const olderMessages: ChatMessage[] = data.messages ?? [];
        if (olderMessages.length > 0) {
          // Prepend older messages before existing history
          setHistoryMessages((prev) => [...olderMessages, ...prev]);
        }
        setHasMoreHistory(data.hasMore ?? false);
      }
    } catch (err) {
      console.warn("[LeviChat] Failed to load more history:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreHistory, historyMessages, selectedLocation?.id, session?.access_token]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setSessionMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(`${getAgentUrl()}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            message: trimmed,
            org_id: selectedLocation?.org_id,
            location_id: selectedLocation?.id,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          console.error("[LeviChat] API error:", response.status, errorBody);
          const errorMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: response.status === 501
              ? "I'm still being set up. Check back soon!"
              : "I'm having trouble right now. Please try again.",
            created_at: new Date().toISOString(),
          };
          setSessionMessages((prev) => [...prev, errorMessage]);
          return;
        }

        // React Native's fetch doesn't support ReadableStream, so we
        // read the full response as text and parse SSE lines from it.
        const rawText = await response.text();
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream")) {
          const assistantId = generateId();
          streamingIdRef.current = assistantId;

          // Parse all SSE events from the response body
          let finalContent = "";
          const toolCalls: ToolCallEvent[] = [];

          const lines = rawText.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.event === "tool_call") {
                toolCalls.push({
                  id: parsed.id,
                  name: parsed.name,
                  label: parsed.label,
                  status: "calling",
                });
              } else if (parsed.event === "tool_result") {
                const tc = toolCalls.find((t) => t.id === parsed.id);
                if (tc) {
                  tc.status = "done";
                  tc.label = parsed.label;
                }
              } else if (parsed.event === "delta") {
                finalContent += parsed.text;
              } else if (parsed.event === "error") {
                finalContent = parsed.message || "Something went wrong.";
              }
            } catch {
              // Skip malformed SSE data
            }
          }

          // Mark all tool calls as done (response is complete)
          for (const tc of toolCalls) {
            tc.status = "done";
          }

          const assistantMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: finalContent || "...",
            created_at: new Date().toISOString(),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            isStreaming: false,
          };
          setSessionMessages((prev) => [...prev, assistantMessage]);
          streamingIdRef.current = null;
        } else {
          // Non-SSE JSON response
          let data;
          try {
            data = JSON.parse(rawText);
          } catch {
            data = { message: rawText || "..." };
          }
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: data.message || data.content || "...",
            created_at: new Date().toISOString(),
          };
          setSessionMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        console.error("[LeviChat] Network error:", err);
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "I couldn't reach the server. Please check your connection.",
          created_at: new Date().toISOString(),
        };
        setSessionMessages((prev) => [...prev, errorMessage]);
        setError(
          err instanceof Error ? err.message : "Failed to send message"
        );
      } finally {
        setIsSending(false);
        streamingIdRef.current = null;
      }
    },
    [selectedLocation?.id, session?.access_token]
  );

  const clearHistory = useCallback(() => {
    setHistoryMessages([]);
    setSessionMessages([]);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      hasNewMessages,
      historyLoaded,
      isLoadingMore,
      hasMoreHistory,
      isSending,
      error,
      sendMessage,
      loadMoreHistory,
      clearHistory,
    }),
    [messages, hasNewMessages, historyLoaded, isLoadingMore, hasMoreHistory, isSending, error, sendMessage, loadMoreHistory, clearHistory]
  );

  return (
    <LeviChatContext.Provider value={value}>
      {children}
    </LeviChatContext.Provider>
  );
}

export function useLeviChat() {
  const context = useContext(LeviChatContext);
  if (context === undefined) {
    throw new Error("useLeviChat must be used within a LeviChatProvider");
  }
  return context;
}

export default LeviChatContext;
