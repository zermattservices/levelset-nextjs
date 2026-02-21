/**
 * Conversation manager — handles conversation lifecycle and message persistence.
 *
 * Uses one active conversation per user per org per location. Conversations
 * are archived after 24 hours of inactivity and a new one is created.
 */

import { getServiceClient } from '@levelset/supabase-client';
import type { ChatMessage } from './types.js';

const MAX_HISTORY_MESSAGES = 20;
const DEFAULT_PAGE_SIZE = 10;
const CONVERSATION_TTL_HOURS = 24;

/**
 * Get an existing active conversation or create a new one.
 * Archives stale conversations (>24h old) automatically.
 */
export async function getOrCreateConversation(
  userId: string,
  orgId: string,
  locationId?: string,
): Promise<string> {
  const supabase = getServiceClient();
  const cutoff = new Date(
    Date.now() - CONVERSATION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  // Find active conversation for this user+org+location
  let findQuery = supabase
    .from('ai_conversations')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (locationId) {
    findQuery = findQuery.eq('location_id', locationId);
  } else {
    findQuery = findQuery.is('location_id', null);
  }

  const { data: existing } = await findQuery.maybeSingle();

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
    .insert({
      user_id: userId,
      org_id: orgId,
      location_id: locationId ?? null,
      status: 'active',
    })
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
  const supabase = getServiceClient();

  const { data: messages, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, tool_calls, tool_call_id, created_at')
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
    ...(m.id ? { id: m.id as string } : {}),
    ...(m.created_at ? { created_at: m.created_at as string } : {}),
  }));
}

/**
 * Load a page of user+assistant messages for mobile display.
 * Supports cursor pagination via `before` (ISO timestamp).
 * Returns messages in chronological order (oldest first).
 */
export async function loadHistoryPage(
  conversationId: string,
  options: { limit?: number; before?: string } = {}
): Promise<{
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
    tool_calls?: unknown;
    ui_blocks?: unknown;
    metadata?: Record<string, unknown>;
  }>;
  hasMore: boolean;
}> {
  const supabase = getServiceClient();
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from('ai_messages')
    .select('id, role, content, tool_calls, ui_blocks, metadata, created_at')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there are more

  if (options.before) {
    query = query.lt('created_at', options.before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load history page:', error);
    return { messages: [], hasMore: false };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // Reverse to chronological order
  return {
    messages: page.reverse().map((m) => ({
      id: m.id as string,
      role: m.role as string,
      content: m.content as string,
      created_at: m.created_at as string,
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...((m as any).ui_blocks ? { ui_blocks: (m as any).ui_blocks } : {}),
      ...(m.metadata ? { metadata: m.metadata as Record<string, unknown> } : {}),
    })),
    hasMore,
  };
}

/**
 * Find active conversation ID without creating one.
 * Returns null if no active conversation exists.
 */
export async function findActiveConversation(
  userId: string,
  orgId: string,
  locationId?: string,
): Promise<string | null> {
  const supabase = getServiceClient();
  const cutoff = new Date(
    Date.now() - CONVERSATION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  let findQuery = supabase
    .from('ai_conversations')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (locationId) {
    findQuery = findQuery.eq('location_id', locationId);
  } else {
    findQuery = findQuery.is('location_id', null);
  }

  const { data: existing } = await findQuery.maybeSingle();

  if (existing && existing.created_at > cutoff) {
    return existing.id as string;
  }

  return null;
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
    uiBlocks?: unknown;
  }
): Promise<string> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      tool_calls: message.toolCalls ?? null,
      tool_call_id: message.toolCallId ?? null,
      metadata: message.metadata ?? {},
      ui_blocks: message.uiBlocks ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist message: ${error?.message ?? 'unknown'}`);
  }

  return data.id as string;
}
