/**
 * Shared types for the Levi agent service.
 */

/** User context attached by auth middleware via c.set('user', ...) */
export interface UserContext {
  authUserId: string;
  appUserId: string;
  orgId: string;
  role: string;
  name: string;
}

/** Task types for LLM routing */
export type TaskType = 'user_chat' | 'simple_query' | 'tool_orchestration';

/** Parsed LLM response */
export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  finishReason: string;
}

/** OpenAI-compatible tool call from assistant message */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/** OpenAI-compatible tool definition */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/** Result from executing a tool */
export interface ToolResult {
  toolCallId: string;
  content: string; // JSON string
}

/** Chat message for LLM context (OpenAI-compatible shape) */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/** Response configuration per task type */
export interface ResponseConfig {
  maxTokens: number;
  style: 'concise' | 'brief' | 'structured';
}
