/**
 * Phase 8: Trust Memory Service
 *
 * ユーザーの傾向記憶を管理する。
 * - テーマ抽出はルールベース（LLMコール不使用）
 * - 減衰係数0.8で約10セッション未登場で自然消滅
 * - version による CAS で stale write を防止
 */

import { createHash } from 'crypto';
import { supabase } from './supabase';

// --- Types (soft schema, all fields optional) ---

export interface RecurringTheme {
  label: string;
  count: number;
  last_seen: string;  // ISO date
  decay_weight: number;  // 0.0-1.0
}

export interface ToneSignals {
  prefers_structure?: boolean;
  avoids_depth_push?: boolean;
  last_updated: string;
}

export interface SessionHistoryEntry {
  date: string;
  primary_mode: string;
  max_depth: number;
  structure_helped: boolean;
  depth_felt_pushy: boolean;
}

export interface TrustMemory {
  recurring_themes?: RecurringTheme[];
  tone_signals?: ToneSignals;
  session_history?: SessionHistoryEntry[];
  version: number;
  last_updated?: string;
}

// --- Theme extraction (rule-based, user utterance only) ---

const THEME_KEYWORDS: { keywords: string[]; label: string }[] = [
  { keywords: ['仕事', '会社', '上司', '部下', 'チーム', 'プロジェクト'], label: '仕事' },
  { keywords: ['転職', 'キャリア', '将来', 'やりたいこと'], label: 'キャリア' },
  { keywords: ['家族', '友人', '恋人', '関係', '距離感'], label: '人間関係' },
  { keywords: ['不安', '怒り', '悲しい', 'モヤモヤ', 'ストレス'], label: '感情' },
  { keywords: ['自分', '性格', 'パターン', 'いつも', '本当は'], label: '自己理解' },
  { keywords: ['選択', '迷い', '決められない', 'どうすれば'], label: '決断' },
];

export function extractThemeLabels(transcripts: string[]): string[] {
  const combined = transcripts.join(' ');
  const counts = new Map<string, number>();

  for (const { keywords, label } of THEME_KEYWORDS) {
    let matchCount = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, 'g');
      const matches = combined.match(regex);
      if (matches) matchCount += matches.length;
    }
    if (matchCount > 0) {
      counts.set(label, matchCount);
    }
  }

  // Sort by frequency, return top 2
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);
}

// --- Topic bucket mapping (for Gate 8 evaluation) ---

const THEME_TO_BUCKET: Record<string, string> = {
  '仕事': 'work',
  'キャリア': 'work',
  '感情': 'emotion',
  '人間関係': 'emotion',
  '自己理解': 'introspection',
  '決断': 'introspection',
};

export function themeToTopicBucket(themes: string[]): 'work' | 'emotion' | 'introspection' | 'casual' {
  if (themes.length === 0) return 'casual';
  const bucket = THEME_TO_BUCKET[themes[0]];
  return (bucket as 'work' | 'emotion' | 'introspection') || 'casual';
}

// --- Tone signals recalculation ---

function recalcToneSignals(history: SessionHistoryEntry[]): ToneSignals | undefined {
  if (history.length < 3) return undefined;
  const structureHelpedCount = history.filter(h => h.structure_helped).length;
  const depthPushyCount = history.filter(h => h.depth_felt_pushy).length;
  return {
    prefers_structure: structureHelpedCount >= 2 ? true : undefined,
    avoids_depth_push: depthPushyCount >= 2 ? true : undefined,
    last_updated: new Date().toISOString(),
  };
}

// --- Core functions ---

export async function loadTrustMemory(userId: string): Promise<TrustMemory | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('trust_memory')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data?.trust_memory || null;
}

export function buildTrustMemoryHint(tm: TrustMemory | null): string | undefined {
  if (!tm) return undefined;

  const parts: string[] = [];

  // Tone signals
  if (tm.tone_signals?.prefers_structure) {
    parts.push('このユーザーは構造的に整理するトーンを好む傾向があります。');
  }
  if (tm.tone_signals?.avoids_depth_push) {
    parts.push('深掘りを押しすぎると引く傾向があります。');
  }

  // Recurring themes (top 2 by decay_weight * count)
  const themes = (tm.recurring_themes || [])
    .filter(t => t.decay_weight >= 0.1)
    .sort((a, b) => (b.decay_weight * b.count) - (a.decay_weight * a.count))
    .slice(0, 2);

  if (themes.length > 0) {
    const themeStr = themes.map(t => `「${t.label}」`).join('');
    parts.push(`最近${themeStr}について考えています。`);
  }

  if (parts.length === 0) return undefined;

  const hint = parts.join('\n');
  // 200字制限
  return hint.length > 200 ? hint.slice(0, 200) : hint;
}

interface DbRound {
  round_number: number;
  transcript: string;
  question_rating?: string | null;
  mode_primary?: string | null;
  depth_used?: number | null;
}

export function updateTrustMemory(
  existingTm: TrustMemory | null,
  dbRounds: DbRound[],
): TrustMemory {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // Extract transcripts from rounds
  const transcripts = dbRounds
    .filter(r => r.transcript)
    .map(r => r.transcript);

  // Theme extraction
  const sessionThemes = extractThemeLabels(transcripts);

  // Build recurring themes
  const existingThemes = [...(existingTm?.recurring_themes || [])];
  const reinforcedLabels = new Set<string>();

  for (const label of sessionThemes) {
    const existing = existingThemes.find(t => t.label === label);
    if (existing) {
      existing.count++;
      existing.last_seen = today;
      existing.decay_weight = Math.min(1.0, existing.decay_weight + 0.2);
      reinforcedLabels.add(label);
    } else {
      existingThemes.push({
        label,
        count: 1,
        last_seen: today,
        decay_weight: 0.5,
      });
      reinforcedLabels.add(label);
    }
  }

  // Decay non-reinforced themes
  for (const theme of existingThemes) {
    if (!reinforcedLabels.has(theme.label)) {
      theme.decay_weight *= 0.8;
    }
  }

  // Remove decayed themes, keep max 5
  const activeThemes = existingThemes
    .filter(t => t.decay_weight >= 0.1)
    .sort((a, b) => (b.decay_weight * b.count) - (a.decay_weight * a.count))
    .slice(0, 5);

  // Build session history entry
  const maxDepth = Math.max(1, ...dbRounds.map(r => r.depth_used || 1));
  const primaryModes = dbRounds.map(r => r.mode_primary).filter(Boolean);
  const primaryMode = primaryModes[0] || 'structure';

  // structure_helped: mode_primary === 'structure' のラウンドに question_rating === 'forward' が1件以上
  const structureHelped = dbRounds.some(
    r => r.mode_primary === 'structure' && r.question_rating === 'forward'
  );

  // depth_felt_pushy: depth_used >= 2 のラウンドに question_rating === 'off' が1件以上
  const depthFeltPushy = dbRounds.some(
    r => (r.depth_used || 1) >= 2 && r.question_rating === 'off'
  );

  const sessionEntry: SessionHistoryEntry = {
    date: today,
    primary_mode: primaryMode,
    max_depth: maxDepth,
    structure_helped: structureHelped,
    depth_felt_pushy: depthFeltPushy,
  };

  // FIFO: max 5 entries
  const history = [...(existingTm?.session_history || []), sessionEntry].slice(-5);

  // Recalc tone signals from full history
  const toneSignals = recalcToneSignals(history);

  const newVersion = (existingTm?.version ?? 0) + 1;

  return {
    recurring_themes: activeThemes.length > 0 ? activeThemes : undefined,
    tone_signals: toneSignals,
    session_history: history,
    version: newVersion,
    last_updated: now,
  };
}

export async function saveTrustMemory(
  userId: string,
  newTm: TrustMemory,
  snapshotVersion: number,
): Promise<boolean> {
  const { data: succeeded, error } = await supabase.rpc('save_trust_memory_cas', {
    p_user_id: userId,
    p_new_tm: newTm,
    p_expected_version: snapshotVersion,
  });

  if (error) throw error;
  if (!succeeded) {
    console.log(`Trust memory stale write prevented: snapshot version=${snapshotVersion}`);
  }
  return succeeded;
}

export async function clearTrustMemory(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ trust_memory: null })
    .eq('id', userId);

  if (error) throw error;
}

// --- Experiment variant (deterministic, no DB storage) ---

export function getInjectVariant(userId: string): 'inject' | 'control' {
  const salt = process.env.EXPERIMENT_SALT || 'kataru-gate8-v1';
  const hash = createHash('sha256').update(userId + salt).digest();
  return hash[0] % 2 === 0 ? 'inject' : 'control';
}
