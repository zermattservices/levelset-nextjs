/**
 * LeviChatContext
 * Manages chat messages, sending, and conversation state for Levi AI.
 *
 * Architecture:
 *   - historyMessages: loaded from server (paginated, scroll-up to load more)
 *   - sessionMessages: sent/received this session (appended at bottom)
 *   - messages = [...history, ...session] — combined for display
 *
 * Streaming:
 *   Uses `expo/fetch` which provides ReadableStream support on native.
 *   SSE events (tool_call, tool_result, delta, done) are parsed in real-time
 *   and the assistant message is updated incrementally as tokens arrive.
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
import { fetch as expoFetch } from "expo/fetch";
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

/**
 * Parse a single SSE data line and dispatch to the appropriate handler.
 */
function parseSSELine(
  line: string,
  handlers: {
    onDelta: (text: string) => void;
    onToolCall: (event: ToolCallEvent) => void;
    onToolResult: (event: { id: string; label: string }) => void;
    onDone: () => void;
    onError: (message: string) => void;
  }
): void {
  if (!line.startsWith("data: ")) return;
  const jsonStr = line.slice(6).trim();
  if (!jsonStr) return;

  try {
    const event = JSON.parse(jsonStr);
    switch (event.event) {
      case "delta":
        handlers.onDelta(event.text ?? "");
        break;
      case "tool_call":
        handlers.onToolCall({
          id: event.id,
          name: event.name,
          label: event.label,
          status: "calling",
        });
        break;
      case "tool_result":
        handlers.onToolResult({ id: event.id, label: event.label });
        break;
      case "done":
        handlers.onDone();
        break;
      case "error":
        handlers.onError(event.message || "Something went wrong.");
        break;
    }
  } catch {
    // Skip malformed SSE JSON
  }
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
  const lastLoadedLocationRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setSessionMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      // Create an abort controller for this request
      const abortController = new AbortController();
      abortRef.current = abortController;

      // Create the assistant message ID upfront so we can update it
      const assistantId = generateId();

      try {
        // Use expo/fetch which supports ReadableStream on native
        const response = await expoFetch(`${getAgentUrl()}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
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
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          console.error("[LeviChat] API error:", response.status, errorBody);
          const errorMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content:
              response.status === 501
                ? "I'm still being set up. Check back soon!"
                : response.status === 429
                  ? "I'm getting too many requests right now. Please wait a moment."
                  : "I'm having trouble right now. Please try again.",
            created_at: new Date().toISOString(),
          };
          setSessionMessages((prev) => [...prev, errorMessage]);
          return;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") && response.body) {
          // ── SSE streaming path using ReadableStream ──
          // Create initial empty assistant message (streaming state)
          const initialMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
            toolCalls: [],
            isStreaming: true,
          };
          setSessionMessages((prev) => [...prev, initialMessage]);

          // Mutable accumulators — we update the message in-place via setState
          let streamedContent = "";
          const toolCalls: ToolCallEvent[] = [];
          let streamDone = false;

          // Helper to update the assistant message in the session
          const updateAssistantMessage = (
            contentUpdate: string,
            toolCallsUpdate: ToolCallEvent[],
            isDone: boolean
          ) => {
            setSessionMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: contentUpdate,
                      toolCalls:
                        toolCallsUpdate.length > 0
                          ? [...toolCallsUpdate]
                          : undefined,
                      isStreaming: !isDone,
                    }
                  : m
              )
            );
          };

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              // Split on newlines to find complete SSE lines
              const lines = buffer.split("\n");
              // Keep the last (potentially incomplete) line in the buffer
              buffer = lines.pop() || "";

              for (const line of lines) {
                parseSSELine(line, {
                  onDelta: (text) => {
                    streamedContent += text;
                    updateAssistantMessage(
                      streamedContent,
                      toolCalls,
                      false
                    );
                  },
                  onToolCall: (tc) => {
                    toolCalls.push(tc);
                    updateAssistantMessage(
                      streamedContent,
                      toolCalls,
                      false
                    );
                  },
                  onToolResult: ({ id, label }) => {
                    const tc = toolCalls.find((t) => t.id === id);
                    if (tc) {
                      tc.status = "done";
                      // Keep the descriptive action label (e.g. "Listing employees")
                      // unless the result has a more informative one (e.g. "Found 5 employees")
                      if (label && label !== "Done") {
                        tc.label = label;
                      }
                      updateAssistantMessage(
                        streamedContent,
                        toolCalls,
                        false
                      );
                    }
                  },
                  onDone: () => {
                    streamDone = true;
                  },
                  onError: (message) => {
                    streamedContent = message;
                    streamDone = true;
                  },
                });
              }
            }
          } catch (readError) {
            if ((readError as Error).name !== "AbortError") {
              console.error("[LeviChat] Stream read error:", readError);
            }
          }

          // Process any remaining buffer after the stream ends
          if (buffer.trim()) {
            parseSSELine(buffer, {
              onDelta: (text) => {
                streamedContent += text;
              },
              onToolCall: (tc) => {
                toolCalls.push(tc);
              },
              onToolResult: ({ id, label }) => {
                const tc = toolCalls.find((t) => t.id === id);
                if (tc) {
                  tc.status = "done";
                  if (label && label !== "Done") {
                    tc.label = label;
                  }
                }
              },
              onDone: () => {
                streamDone = true;
              },
              onError: (message) => {
                streamedContent = message;
                streamDone = true;
              },
            });
          }

          // Mark all remaining tool calls as done
          for (const tc of toolCalls) {
            tc.status = "done";
          }

          // Final update — mark streaming as complete
          updateAssistantMessage(
            streamedContent || "...",
            toolCalls,
            true
          );
        } else {
          // ── Non-streaming JSON fallback ──
          let data;
          try {
            const rawText = await response.text();
            data = JSON.parse(rawText);
          } catch {
            data = { message: "..." };
          }
          const assistantMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: data.message || data.content || "...",
            created_at: new Date().toISOString(),
          };
          setSessionMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[LeviChat] Network error:", err);
        const errorMessage: ChatMessage = {
          id: assistantId,
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
        abortRef.current = null;
      }
    },
    [selectedLocation?.id, session?.access_token]
  );

  const clearHistory = useCallback(() => {
    // Abort any in-flight stream
    abortRef.current?.abort();
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
