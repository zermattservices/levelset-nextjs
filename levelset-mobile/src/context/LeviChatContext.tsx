/**
 * LeviChatContext
 * Manages chat messages, sending, and conversation state for Levi AI.
 * Supports SSE streaming for real-time token display.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { useLocation } from "./LocationContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface LeviChatContextType {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
}

const LeviChatContext = createContext<LeviChatContextType | undefined>(
  undefined
);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface LeviChatProviderProps {
  children: React.ReactNode;
}

export function LeviChatProvider({ children }: LeviChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const { selectedLocation } = useLocation();
  const streamingIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      // Append user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const agentUrl =
          process.env.EXPO_PUBLIC_AGENT_URL || "https://levelset-agent.fly.dev";

        const response = await fetch(`${agentUrl}/api/ai/chat`, {
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
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") && response.body) {
          // SSE streaming response
          const assistantId = generateId();
          streamingIdRef.current = assistantId;

          // Add empty assistant message that we'll update
          const streamingMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, streamingMessage]);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.done) continue;
                if (parsed.delta) {
                  accumulated += parsed.delta;
                  // Update the streaming message in place
                  const currentContent = accumulated;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: currentContent }
                        : m
                    )
                  );
                }
              } catch {
                // Skip malformed SSE data
              }
            }
          }

          streamingIdRef.current = null;
        } else {
          // JSON response (non-streaming fallback)
          const data = await response.json();
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: data.message || data.content || "...",
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        console.error("[LeviChat] Network error:", err);
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "I couldn't reach the server. Please check your connection.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setError(
          err instanceof Error ? err.message : "Failed to send message"
        );
      } finally {
        setIsSending(false);
        streamingIdRef.current = null;
      }
    },
    [selectedLocation?.org_id, session?.access_token]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      isSending,
      error,
      sendMessage,
      clearHistory,
    }),
    [messages, isSending, error, sendMessage, clearHistory]
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
