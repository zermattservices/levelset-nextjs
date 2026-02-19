/**
 * Conversation manager — handles conversation lifecycle and message persistence.
 *
 * Uses one active conversation per user per org. Conversations are archived
 * after 24 hours of inactivity and a new one is created.
 */

import { createServiceClient } from '@levelset/supabase-client';
import type { ChatMessage } from './types.js';

const MAX_HISTORY_MESSAGES = 20;
const CONVERSATION_TTL_HOURS = 24;

/**
 * Get an existing active conversation or create a new one.
 * Archives stale conversations (>24h old) automatically.
 */
export async function getOrCreateConversation(
  userId: string,
  orgId: string
): Promise<string> {
  const supabase = createServiceClient();
  const cutoff = new Date(
    Date.now() - CONVERSATION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  // Find active conversation for this user+org
  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.created_at > cutoff) {
    return existing.id as string;
  }

  // Archive stale conversation
  if (existing) {
    await supabase
      .from('ai_conversations')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, org_id: orgId, status: 'active' })
    .select('id')
    .single();

  if (error || !newConv) {
    throw new Error(`Failed to create conversation: ${error?.message ?? 'unknown'}`);
  }

  return newConv.id as string;
}

/**
 * Load the most recent messages from a conversation for LLM context.
 * Returns at most MAX_HISTORY_MESSAGES messages in chronological order.
 */
export async function loadConversationHistory(
  conversationId: string
): Promise<ChatMessage[]> {
  const supabase = createServiceClient();

  const { data: messages, error } = await supabase
    .from('ai_messages')
    .select('role, content, tool_calls, tool_call_id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  if (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }

  // Reverse to get chronological order (we fetched newest-first for the LIMIT)
  return (messages ?? []).reverse().map((m) => ({
    role: m.role as ChatMessage['role'],
    content: m.content as string,
    ...(m.tool_calls ? { tool_calls: m.tool_calls as ChatMessage['tool_calls'] } : {}),
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id as string } : {}),
  }));
}

/**
 * Persist a message to the database.
 */
export async function persistMessage(
  conversationId: string,
  message: {
    role: string;
    content: string;
    toolCalls?: unknown;
    toolCallId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      tool_calls: message.toolCalls ?? null,
      tool_call_id: message.toolCallId ?? null,
      metadata: message.metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist message: ${error?.message ?? 'unknown'}`);
  }

  return data.id as string;
}
