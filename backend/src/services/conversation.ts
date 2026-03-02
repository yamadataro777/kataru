import { supabase } from './supabase';
import {
  Conversation,
  ConversationTurn,
  ConversationWithTurns,
  RunningContext,
} from '../types/conversation';

const DEFAULT_RUNNING_CONTEXT: RunningContext = {
  topics: [],
  emotional_tones: [],
  defense_mechanisms: [],
  key_phrases: [],
  readiness_for_change: 0,
  self_awareness_depth: 0,
  turn_summaries: [],
  phase_turns: {
    intake: 0,
    clarify: 0,
    explore: 0,
    deepen: 0,
    identity_design: 0,
    synthesis: 0,
    action_plan: 0,
    close: 0,
  },
};

export async function createConversation(): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      phase: 'intake',
      turn_count: 0,
      status: 'active',
      running_context: DEFAULT_RUNNING_CONTEXT,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationWithTurns(id: string): Promise<ConversationWithTurns | null> {
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (convError) throw convError;
  if (!conversation) return null;

  const { data: turns, error: turnsError } = await supabase
    .from('conversation_turns')
    .select('*')
    .eq('conversation_id', id)
    .order('turn_number', { ascending: true });

  if (turnsError) throw turnsError;

  return { ...conversation, conversation_turns: turns || [] };
}

export async function updateConversation(
  id: string,
  updates: Record<string, unknown>
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createTurn(
  data: Omit<ConversationTurn, 'id' | 'created_at'>
): Promise<ConversationTurn> {
  const { data: turn, error } = await supabase
    .from('conversation_turns')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return turn;
}

export async function getConversationTurns(conversationId: string): Promise<ConversationTurn[]> {
  const { data, error } = await supabase
    .from('conversation_turns')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('turn_number', { ascending: true });

  if (error) throw error;
  return data || [];
}
