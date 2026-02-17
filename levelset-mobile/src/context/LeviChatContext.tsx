/**
 * LeviChatContext
 * Manages chat messages, sending, and conversation state for Levi AI
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";

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

function createGreetingMessage(): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    content: "Hi, I'm Levi. How can I help?",
    created_at: new Date().toISOString(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface LeviChatProviderProps {
  children: React.ReactNode;
}

export function LeviChatProvider({ children }: LeviChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createGreetingMessage(),
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { orgId, session } = useAuth();

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
            org_id: orgId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: data.message || data.content || "...",
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          // 501 or other error — show friendly placeholder
          const notReadyMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: "I'm still being set up. Check back soon!",
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, notReadyMessage]);
        }
      } catch (err) {
        const notReadyMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "I'm still being set up. Check back soon!",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, notReadyMessage]);
        setError(
          err instanceof Error ? err.message : "Failed to send message"
        );
      } finally {
        setIsSending(false);
      }
    },
    [orgId, session?.access_token]
  );

  const clearHistory = useCallback(() => {
    setMessages([createGreetingMessage()]);
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
