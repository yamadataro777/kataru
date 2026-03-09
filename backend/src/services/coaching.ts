import OpenAI, { toFile } from 'openai';
import {
  createConversation,
  updateConversation,
  createTurn,
  getConversationWithTurns,
  getConversations,
} from './conversation';
import { generateContent } from './gemini';
import { uploadAudio } from './storage';
import {
  buildStage1LogicalPrompt,
  buildStage1EmotionalPrompt,
  buildStage2Prompt,
  buildStage3Prompt,
  buildInitialMessagePrompt,
  buildCoachingReportPrompt,
} from '../prompts/coaching-prompts';
import {
  checkSection1Logical,
  checkSection1Emotional,
  checkSection2,
  checkSection3,
  checkSection4,
} from './sectionValidator';
import { DefaultStage4Handler } from '../stage-handlers/DefaultStage4Handler';
import type { Stage4Handler } from '../stage-handlers/Stage4Handler.interface';
import type {
  CoachingStage,
  StageMode,
  CoachingTurnResponse,
  CoachingContext,
  CoachingConversation,
  CoachingTurn,
  Stage1LogicalData,
  Stage1EmotionalData,
  Stage2Data,
  Stage3Data,
  Stage4Data,
  StageExtractedData,
  UtteranceAnalysis,
  IssueItem,
  AmbiguousTerm,
  EmotionalSignals,
  GoalHierarchy,
  IssueFrame,
  SlotStatus,
  QuestionCandidate,
  GoalReadiness,
  RecoverySubpath,
  MedicalSafetySeverity,
  ClosingSummaryStyle,
  NormalizedTermEntry,
} from '../types/conversation';

const HALLUCINATION_PATTERNS = [
  'ご視聴ありがとうございました', 'チャンネル登録', 'いいねボタン',
  'Subscribe', 'ありがとうございました。', '字幕',
];

function filterHallucinations(text: string): string {
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (text.includes(pattern)) return '';
  }
  return text;
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

const DEFAULT_FALLBACK: CoachingTurnResponse = {
  current_stage: 1,
  current_stage_mode: null,
  assistant_message: 'なるほど、もう少し教えていただけますか？',
  can_advance: false,
  advance_reason: null,
  missing_requirements: [],
  stage_summary: '',
  extracted_data: {
    central_problem: null,
    current_situation: null,
    key_factors: [],
    constraints: [],
    uncertainty_points: [],
    decision_needed: null,
    priority_candidates: [],
  } as Stage1LogicalData,
  confidence: 0,
  should_regress_stage: false,
  regress_to_stage: null,
  regress_reason: null,
  should_suggest_mode_switch: false,
  suggested_mode: null,
  mode_switch_reason: null,
};

function parseLLMResponse(
  raw: string,
  stage: CoachingStage,
  mode: StageMode | null
): CoachingTurnResponse {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr.trim()) as Record<string, unknown>;

    // Basic validation
    if (typeof parsed.assistant_message !== 'string') throw new Error('invalid: missing assistant_message');
    if (typeof parsed.can_advance !== 'boolean') throw new Error('invalid: missing can_advance');

    return {
      current_stage: (parsed.current_stage as CoachingStage) ?? stage,
      current_stage_mode: (parsed.current_stage_mode as StageMode | null) ?? mode,
      assistant_message: parsed.assistant_message,
      can_advance: parsed.can_advance,
      advance_reason: (parsed.advance_reason as string | null) ?? null,
      missing_requirements: Array.isArray(parsed.missing_requirements) ? (parsed.missing_requirements as string[]) : [],
      stage_summary: typeof parsed.stage_summary === 'string' ? parsed.stage_summary : '',
      extracted_data: (parsed.extracted_data as StageExtractedData) ?? {},
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      should_regress_stage: (parsed.should_regress_stage as boolean) ?? false,
      regress_to_stage: (parsed.regress_to_stage as 1 | 2 | 3 | null) ?? null,
      regress_reason: (parsed.regress_reason as string | null) ?? null,
      should_suggest_mode_switch: (parsed.should_suggest_mode_switch as boolean) ?? false,
      suggested_mode: (parsed.suggested_mode as StageMode | null) ?? null,
      mode_switch_reason: (parsed.mode_switch_reason as string | null) ?? null,
      utterance_analysis: (parsed.utterance_analysis as UtteranceAnalysis | undefined) ?? undefined,
      goal_readiness: (parsed.goal_readiness as GoalReadiness | undefined) ?? undefined,
    };
  } catch {
    console.error('Failed to parse LLM response:', raw.substring(0, 200));
    return { ...DEFAULT_FALLBACK, current_stage: stage, current_stage_mode: mode };
  }
}

// Merge utterance_analysis into running context
function mergeUtteranceAnalysisIntoRc(
  rc: Record<string, unknown>,
  ua: UtteranceAnalysis
): void {
  // Merge issues_detected into all_issues (deduplicate by id)
  const existing = (rc['all_issues'] as IssueItem[] | undefined) ?? [];
  const existingIds = new Set(existing.map((i) => i.id));
  for (const issue of ua.issues_detected) {
    if (!existingIds.has(issue.id)) {
      existing.push(issue);
      existingIds.add(issue.id);
    } else {
      // Update active status if it changed
      const idx = existing.findIndex((i) => i.id === issue.id);
      if (idx >= 0) existing[idx] = { ...existing[idx], ...issue };
    }
  }
  rc['all_issues'] = existing;

  // Set active_issue_id from the first active issue
  const activeIssue = existing.find((i) => i.active);
  if (activeIssue) {
    rc['active_issue_id'] = activeIssue.id;
  }

  // Merge ambiguous_terms (deduplicate by term; update resolved_as)
  const existingTerms = (rc['ambiguous_terms'] as AmbiguousTerm[] | undefined) ?? [];
  const termMap = new Map<string, AmbiguousTerm>(existingTerms.map((t) => [t.term, t]));
  for (const term of ua.ambiguous_terms) {
    const existing_ = termMap.get(term.term);
    if (existing_) {
      // Update resolved status if resolved_as was provided
      if (term.resolved_as) {
        termMap.set(term.term, { ...existing_, resolved: true, resolved_as: term.resolved_as });
      }
    } else {
      termMap.set(term.term, term);
    }
  }
  rc['ambiguous_terms'] = Array.from(termMap.values());

  // Update emotional_signals (overwrite with latest)
  rc['emotional_signals'] = ua.emotional_signals as unknown as EmotionalSignals;

  // Merge goals_mentioned into goal_hierarchy
  const gh = (rc['goal_hierarchy'] as GoalHierarchy | undefined) ?? {
    ultimate: null,
    intermediate: [],
    means_only: [],
  };
  for (const goal of ua.goals_mentioned) {
    if (goal.is_means_not_goal) {
      if (!gh.means_only.includes(goal.content)) {
        gh.means_only.push(goal.content);
      }
    } else {
      if (!gh.intermediate.includes(goal.content)) {
        gh.intermediate.push(goal.content);
      }
    }
  }
  rc['goal_hierarchy'] = gh;

  // Set issues_prioritized
  if (ua.priority_clarified) {
    rc['issues_prioritized'] = true;
  }

  // Stage 1 enhanced fields
  if (ua.issue_frame) {
    rc['issue_frame'] = ua.issue_frame;
  }

  if (ua.slot_statuses) {
    const existing = (rc['slot_statuses'] as Record<string, SlotStatus> | undefined) ?? {};
    // Merge: update existing slots, keep slots not mentioned in this turn
    for (const [key, val] of Object.entries(ua.slot_statuses)) {
      if (val && val.status) {
        existing[key] = val;
      }
    }
    rc['slot_statuses'] = existing;
  }

  // Merge goal_readiness (latest wins)
  if (ua.goal_readiness) {
    rc['goal_readiness'] = ua.goal_readiness;
  }

  // Accumulate do_not_ask_again (union of all turns)
  if (ua.do_not_ask_again && ua.do_not_ask_again.length > 0) {
    const existing = (rc['do_not_ask_again'] as string[] | undefined) ?? [];
    const set = new Set([...existing, ...ua.do_not_ask_again]);
    rc['do_not_ask_again'] = Array.from(set);
  }

  // Theory discussion mode
  if (ua.theory_topic_detected) {
    rc['theory_topic_detected'] = ua.theory_topic_detected;
  }

  // Accumulate normalized_terms from transcript normalization
  if (ua.normalized_terms && ua.normalized_terms.length > 0) {
    const existing = (rc['normalized_terms'] as NormalizedTermEntry[] | undefined) ?? [];
    const existingOriginals = new Set(existing.map(t => t.original));
    for (const term of ua.normalized_terms) {
      if (!existingOriginals.has(term.original)) {
        existing.push(term);
        existingOriginals.add(term.original);
      }
    }
    rc['normalized_terms'] = existing;
  }
}

// Re-export getConversations for use in routes
export { getConversations };

export class CoachingService {
  private stage4Handler: Stage4Handler;

  constructor(handler: Stage4Handler = new DefaultStage4Handler()) {
    this.stage4Handler = handler;
  }

  async createSession(userId?: string): Promise<CoachingConversation> {
    // Don't pass userId to createConversation — conversations table has no user_id column.
    // Instead, link via coaching_conversations table.
    const conv = await createConversation();
    const initialRc = {
      current_stage: 1,
      stage_mode: null,
      stage_summaries: {},
      stage_extracted_data: { '1': null, '2': null, '3': null, '4': null },
      can_advance: false,
      turn_count_per_stage: { '1': 0, '2': 0, '3': 0, '4': 0 },
      // New utterance analysis fields
      all_issues: [],
      ambiguous_terms: [],
      emotional_signals: { explicit: [], implicit: [], intensity: 'low' as const, acknowledged: false },
      goal_hierarchy: { ultimate: null, intermediate: [], means_only: [] },
      issues_prioritized: false,
    };
    await updateConversation(conv.id, { running_context: initialRc as unknown as Record<string, unknown> });

    // Link user to coaching session via coaching_conversations table
    if (userId && userId !== 'dev-user') {
      const { supabase } = await import('./supabase');
      await supabase.from('coaching_conversations').insert({
        id: conv.id,
        user_id: userId,
      });
    }

    return this.toCoachingConversation(conv, initialRc as Record<string, unknown>);
  }

  async getInitialMessage(
    _conversationId: string,
    stage: CoachingStage,
    mode: StageMode | null
  ): Promise<CoachingTurnResponse> {
    const prompt = buildInitialMessagePrompt(stage, mode);

    if (!prompt) {
      return { ...DEFAULT_FALLBACK, current_stage: stage, current_stage_mode: mode };
    }

    // buildInitialMessagePrompt returns pure JSON strings — parse directly without LLM call
    try {
      return JSON.parse(prompt) as CoachingTurnResponse;
    } catch {
      // If somehow not valid JSON, call LLM
      const raw = await generateContent(prompt);
      return parseLLMResponse(raw, stage, mode);
    }
  }

  async processCoachingTurn(
    conversationId: string,
    stage: CoachingStage,
    stageMode: StageMode | null,
    audioBuffer?: Buffer,
    mimeType?: string,
    clientTranscript?: string
  ): Promise<{ turn: CoachingTurn; response: CoachingTurnResponse }> {
    const conversationWithTurns = await getConversationWithTurns(conversationId);
    if (!conversationWithTurns) throw new Error('Conversation not found');

    const { conversation_turns: turns, ...conversation } = conversationWithTurns;
    const coachingTurns = turns as unknown as CoachingTurn[];
    const coachingContext = this.extractCoachingContext(conversation, coachingTurns, stage, stageMode);

    // Transcribe audio if provided
    let transcript = clientTranscript || '';
    let audioUrl: string | undefined;

    if (audioBuffer && mimeType) {
      // Upload audio using sessionId path convention
      const ext = getFileExtension(mimeType);
      const sessionPath = `conversations/${conversationId}/${turns.length}`;
      try {
        const uploadResult = await uploadAudio(sessionPath, audioBuffer, mimeType);
        audioUrl = uploadResult.publicUrl;
      } catch (err) {
        console.error('Audio upload failed:', err);
      }

      // Transcribe with Whisper
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      try {
        const file = await toFile(audioBuffer, `recording.${ext}`, { type: mimeType });
        const whisperRes = await openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language: 'ja',
        });
        const filtered = filterHallucinations(whisperRes.text.trim());
        if (filtered) transcript = filtered;
      } catch (err) {
        console.error('Whisper transcription failed:', err);
      }
    }

    if (!transcript) {
      transcript = clientTranscript || '';
    }

    // Build prompt based on stage and mode
    let prompt: string;
    const rc = (conversation.running_context as unknown as Record<string, unknown>) || {};
    const stageExtractedData = (rc['stage_extracted_data'] || {}) as Record<string, StageExtractedData | null>;
    const currentExtracted = stageExtractedData[String(stage)];

    if (stage === 1 && stageMode === 'logical') {
      prompt = buildStage1LogicalPrompt(
        transcript,
        coachingContext,
        (currentExtracted as Stage1LogicalData) || {
          central_problem: null,
          current_situation: null,
          key_factors: [],
          constraints: [],
          uncertainty_points: [],
          decision_needed: null,
          priority_candidates: [],
        }
      );
    } else if (stage === 1 && stageMode === 'emotional') {
      prompt = buildStage1EmotionalPrompt(
        transcript,
        coachingContext,
        (currentExtracted as Stage1EmotionalData) || {
          primary_emotions: [],
          emotional_triggers: [],
          inner_conflicts: [],
          unmet_needs: [],
          desired_emotional_state: null,
          resistance_points: [],
        }
      );
    } else if (stage === 2) {
      const stage1Data = stageExtractedData['1'] || {};
      const prevMode = (rc['stage_mode'] as StageMode) || 'logical';
      prompt = buildStage2Prompt(
        transcript,
        coachingContext,
        stage1Data as Stage1LogicalData | Stage1EmotionalData,
        prevMode
      );
    } else if (stage === 3) {
      const stage2Data = (stageExtractedData['2'] || {}) as Stage2Data;
      prompt = buildStage3Prompt(transcript, coachingContext, stage2Data);
    } else if (stage === 4) {
      const stage3Data = (stageExtractedData['3'] || {}) as Stage3Data;
      const stage2Data = (stageExtractedData['2'] || undefined) as Stage2Data | undefined;
      prompt = this.stage4Handler.buildPrompt(transcript, coachingContext, stage3Data, stage2Data);
    } else {
      prompt = buildStage1LogicalPrompt(transcript, coachingContext, (currentExtracted as Stage1LogicalData) || {
        central_problem: null,
        current_situation: null,
        key_factors: [],
        constraints: [],
        uncertainty_points: [],
        decision_needed: null,
        priority_candidates: [],
      });
    }

    // Call Gemini
    const raw = await generateContent(prompt);
    const response = parseLLMResponse(raw, stage, stageMode);

    // Post-processing: 「具体的」連続使用の強制除去
    if (stage === 1) {
      const lastAiResponse = coachingContext.recentTurns.slice(-1)[0]?.ai_response ?? '';
      const prevHasGutaiteki = /具体的[にな]/.test(lastAiResponse);
      const currHasGutaiteki = /具体的[にな]/.test(response.assistant_message);
      if (prevHasGutaiteki && currHasGutaiteki) {
        console.log('[coaching] 「具体的」連続検出 → 置換');
        response.assistant_message = response.assistant_message
          .replace(/具体的[にな]/g, '')
          .replace(/、、/g, '、')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
    }

    // STEP 4.5: Merge utterance_analysis into running_context
    const updatedRc = { ...(rc as Record<string, unknown>) };
    if (response.utterance_analysis) {
      mergeUtteranceAnalysisIntoRc(updatedRc, response.utterance_analysis);
    }

    // === Theory Discussion Mode lifecycle ===
    if (stage === 1) {
      const theoryActive = updatedRc['theory_mode_active'] as boolean | undefined;
      const theoryCompleted = updatedRc['theory_mode_completed'] as boolean | undefined;

      // Entry: 理論語が検出され、まだ theory mode に入っていない
      if (!theoryActive && !theoryCompleted) {
        const topicDetected = response.utterance_analysis?.theory_topic_detected;
        if (topicDetected) {
          updatedRc['theory_mode_active'] = true;
          updatedRc['theory_mode_turn_count'] = 1;
          updatedRc['theory_mode_concept'] = topicDetected;
          console.log(`[coaching] Theory discussion mode activated: ${topicDetected}`);
        }
      }

      // Increment: active 中はターンカウント +1
      if (updatedRc['theory_mode_active'] as boolean) {
        const count = ((updatedRc['theory_mode_turn_count'] as number) || 0) + 1;
        updatedRc['theory_mode_turn_count'] = count;

        // Exit: 10ターン到達
        if (count >= 10) {
          updatedRc['theory_mode_active'] = false;
          updatedRc['theory_mode_completed'] = true;
          console.log('[coaching] Theory discussion mode ended after 10 turns');
        }
      }
    }

    // Theory mode 中の effective turn count: theory turns を除外
    if (stage === 1 && (updatedRc['theory_mode_active'] as boolean)) {
      const theoryTurns = (updatedRc['theory_mode_turn_count'] as number) || 0;
      coachingContext.turnCount = Math.max(0, coachingContext.turnCount - theoryTurns);
    }

    // STEP 5: Code-side validator overrides LLM can_advance
    const stageKey = String(stage);
    const updatedExtractedData = (updatedRc['stage_extracted_data'] || {}) as Record<string, StageExtractedData | null>;
    updatedExtractedData[stageKey] = response.extracted_data;

    const rcForValidation = {
      ambiguous_terms: (updatedRc['ambiguous_terms'] as AmbiguousTerm[] | undefined) ?? [],
      all_issues: (updatedRc['all_issues'] as IssueItem[] | undefined) ?? [],
      issues_prioritized: (updatedRc['issues_prioritized'] as boolean | undefined) ?? false,
      goal_hierarchy: (updatedRc['goal_hierarchy'] as GoalHierarchy | undefined),
      issue_frame: (updatedRc['issue_frame'] as IssueFrame | undefined) ?? null,
    };

    let validation = { complete: false, strictComplete: false, goodEnoughForStage2: false, reasons: [] as string[], softReasons: [] as string[] };
    if (stage === 1 && stageMode === 'logical') {
      validation = checkSection1Logical(response.extracted_data as Stage1LogicalData, rcForValidation);
    } else if (stage === 1 && stageMode === 'emotional') {
      validation = checkSection1Emotional(response.extracted_data as Stage1EmotionalData, rcForValidation);
    } else if (stage === 2) {
      validation = checkSection2(response.extracted_data as Stage2Data, rcForValidation);
    } else if (stage === 3) {
      validation = checkSection3(response.extracted_data as Stage3Data);
    } else if (stage === 4) {
      // Stage 4 post-processing: backward compat + delta calculation
      const s4Data = response.extracted_data as Stage4Data;

      // Sync self_efficacy_level with initial (backward compat)
      if (s4Data.self_efficacy_level_initial != null && s4Data.self_efficacy_level == null) {
        s4Data.self_efficacy_level = s4Data.self_efficacy_level_initial;
      } else if (s4Data.self_efficacy_level != null && s4Data.self_efficacy_level_initial == null) {
        s4Data.self_efficacy_level_initial = s4Data.self_efficacy_level;
      }

      // Calculate delta if both initial and final exist
      if (s4Data.self_efficacy_level_initial != null && s4Data.self_efficacy_level_final != null) {
        s4Data.self_efficacy_delta = s4Data.self_efficacy_level_final - s4Data.self_efficacy_level_initial;
      }

      // Ensure review_axes is always an array
      if (!Array.isArray(s4Data.review_axes)) {
        s4Data.review_axes = [];
      }

      // --- 5a. デフォルト初期化（全新フィールド）---
      if (s4Data.should_return_to_stage3 == null) {
        s4Data.should_return_to_stage3 = false;
      }
      if (s4Data.stage3_resize_hint === undefined) {
        s4Data.stage3_resize_hint = null;
      }
      if (s4Data.negative_delta_cause === undefined) {
        s4Data.negative_delta_cause = null;
      }
      if (s4Data.negative_delta_response_type === undefined) {
        s4Data.negative_delta_response_type = null;
      }
      if (s4Data.medical_safety_note === undefined) {
        s4Data.medical_safety_note = null;
      }
      if (s4Data.transcript_normalization_confidence == null) {
        s4Data.transcript_normalization_confidence = null;
      }
      if (!Array.isArray(s4Data.normalized_terms)) {
        s4Data.normalized_terms = [];
      }
      if (s4Data.needs_user_confirmation_for_term === undefined) {
        s4Data.needs_user_confirmation_for_term = null;
      }
      if (s4Data.recovery_subpath === undefined) {
        (s4Data as unknown as Record<string, unknown>).recovery_subpath = null;
      }
      if (s4Data.negative_delta_occurred == null) {
        s4Data.negative_delta_occurred = false;
      }
      if (s4Data.delta_recovered_to_nonnegative == null) {
        s4Data.delta_recovered_to_nonnegative = false;
      }
      if (s4Data.requires_priority_followup == null) {
        s4Data.requires_priority_followup = false;
      }
      if (s4Data.soft_complete == null) {
        s4Data.soft_complete = false;
      }
      if (s4Data.medical_safety_severity === undefined) {
        (s4Data as unknown as Record<string, unknown>).medical_safety_severity = null;
      }
      if (s4Data.stage4_shortened_for_safety == null) {
        s4Data.stage4_shortened_for_safety = false;
      }
      if (!Array.isArray(s4Data.review_axis_types)) {
        s4Data.review_axis_types = [];
      }
      if (s4Data.review_axis_quality_score == null) {
        s4Data.review_axis_quality_score = null;
      }
      if (s4Data.closing_summary_style === undefined) {
        (s4Data as unknown as Record<string, unknown>).closing_summary_style = null;
      }

      // 整合性チェック: delta < 0 で cause あり response_type なし → フォールバック
      if (
        s4Data.self_efficacy_delta != null &&
        s4Data.self_efficacy_delta < 0 &&
        s4Data.negative_delta_cause &&
        !s4Data.negative_delta_response_type
      ) {
        console.warn('[coaching] negative_delta_cause exists but response_type missing, defaulting to quantity_reduce');
        s4Data.negative_delta_response_type = 'quantity_reduce';
      }

      // --- 5b. recovery_subpath 自動導出 ---
      const finalEfficacy = s4Data.self_efficacy_level_final ?? s4Data.self_efficacy_level;
      if (s4Data.stage4_path === 'recovery' && !s4Data.recovery_subpath) {
        if (finalEfficacy != null) {
          if (finalEfficacy <= 3) {
            s4Data.recovery_subpath = 'regress';
          } else if (finalEfficacy <= 5) {
            s4Data.recovery_subpath = 'light_commit';
          } else {
            s4Data.recovery_subpath = 'commit';
          }
        }
      }

      // --- 5c. negative_delta 追跡 ---
      if (s4Data.self_efficacy_delta != null && s4Data.self_efficacy_delta < 0) {
        s4Data.negative_delta_occurred = true;
      }
      if (s4Data.negative_delta_occurred && s4Data.self_efficacy_delta != null && s4Data.self_efficacy_delta >= 0) {
        s4Data.delta_recovered_to_nonnegative = true;
      }
      // 負のまま完了 → soft_complete + requires_priority_followup
      if (
        s4Data.negative_delta_occurred &&
        !s4Data.delta_recovered_to_nonnegative &&
        s4Data.self_efficacy_delta != null &&
        s4Data.self_efficacy_delta < 0
      ) {
        s4Data.soft_complete = true;
        s4Data.requires_priority_followup = true;
        console.log('[coaching] negative delta unresolved → soft_complete + priority_followup');
      }

      // --- 5d. medical_safety_severity 自動判定 ---
      const s3ForSafety = (updatedExtractedData['3'] || {}) as Stage3Data;
      const obstaclesText = (s3ForSafety.obstacles ?? []).join(' ') + ' ' + (s4Data.medical_safety_note ?? '');
      const severeCombinations: RegExp[] = [
        /(?=.*(?:不眠|睡眠))(?=.*(?:食欲|過食|拒食))(?=.*(?:パニック|発作))/,
        /(?=.*(?:アルコール|飲酒|酒))(?=.*(?:身体|体調|吐|頭痛|震え))/,
        /(?=.*(?:絶望|無力|もうだめ|死にたい))(?=.*(?:身体|体調|不眠|食欲))/,
        /自傷/,
      ];
      let detectedSeverity: MedicalSafetySeverity = s4Data.medical_safety_severity ?? null;
      if (!detectedSeverity || detectedSeverity === 'none') {
        const hasMedicalKeywords = /(?:アルコール|飲酒|摂食|過食|拒食|自傷|パニック|不眠|過眠)/.test(obstaclesText);
        if (hasMedicalKeywords) {
          const isSevere = severeCombinations.some(re => re.test(obstaclesText));
          detectedSeverity = isSevere ? 'severe' : 'moderate';
        } else {
          detectedSeverity = 'none';
        }
      }
      s4Data.medical_safety_severity = detectedSeverity;
      if (detectedSeverity === 'severe') {
        s4Data.stage4_shortened_for_safety = true;
        console.log('[coaching] medical_safety_severity=severe → stage4_shortened_for_safety');
      }

      // --- 5e. closing_summary_style 自動選択 ---
      if (!s4Data.closing_summary_style) {
        if (s4Data.stage4_shortened_for_safety) {
          s4Data.closing_summary_style = 'safety_shortened';
        } else if (s4Data.recovery_subpath === 'light_commit') {
          s4Data.closing_summary_style = 'recovery_light_commit';
        } else if (s4Data.stage4_path === 'fast') {
          s4Data.closing_summary_style = 'fast';
        } else {
          s4Data.closing_summary_style = 'standard';
        }
      }

      response.extracted_data = s4Data;
      validation = checkSection4(s4Data);

      // Recovery regression: if should_return_to_stage3, set regress flags
      if (s4Data.should_return_to_stage3) {
        response.should_regress_stage = true;
        response.regress_to_stage = 3;
        response.regress_reason = s4Data.stage3_resize_hint
          ? `Self-efficacy too low. Resize hint: ${s4Data.stage3_resize_hint}`
          : 'Self-efficacy too low, returning to Stage 3 to adjust action plan';
        updatedRc['current_stage'] = 3;
        // Store resize hint in RC so Stage 3 can use it
        if (s4Data.stage3_resize_hint) {
          updatedRc['stage3_resize_hint'] = s4Data.stage3_resize_hint;
        }
        console.log('[coaching] Stage 4 recovery regression → Stage 3', s4Data.stage3_resize_hint);
      }
    }

    // Extract goal_readiness from LLM response or utterance_analysis
    const goalReadiness: GoalReadiness | undefined =
      response.goal_readiness ??
      response.utterance_analysis?.goal_readiness ??
      (updatedRc['goal_readiness'] as GoalReadiness | undefined);

    // Propagate goal_readiness to response for frontend
    if (goalReadiness) {
      response.goal_readiness = goalReadiness;
    }

    // Stage 1: 3-path can_advance logic
    let finalCanAdvance: boolean;
    const turnCount = coachingContext.turnCount;

    if (stage === 1) {
      if (validation.strictComplete && response.can_advance) {
        finalCanAdvance = true;  // Path A: 厳密完了 + LLM同意
      } else if (validation.goodEnoughForStage2 && turnCount >= 5
                 && (response.can_advance || goalReadiness === 'ready')) {
        finalCanAdvance = true;  // Path B: 十分 + 5ターン以上
      } else if (validation.goodEnoughForStage2 && turnCount >= 7) {
        finalCanAdvance = true;  // Path C: 十分 + 7ターン以上 → 強制収束
      } else {
        finalCanAdvance = false;
      }
    } else {
      finalCanAdvance = response.can_advance && validation.complete; // 既存維持
    }

    if (response.can_advance !== finalCanAdvance) {
      console.log(`[coaching] can_advance override: LLM=${response.can_advance} validator strict=${validation.strictComplete} goodEnough=${validation.goodEnoughForStage2} turnCount=${turnCount} goalReadiness=${goalReadiness} -> ${finalCanAdvance}`, validation.reasons);
    }

    // Theory discussion mode: 強制 false
    if (stage === 1 && (updatedRc['theory_mode_active'] as boolean)) {
      finalCanAdvance = false;
      response.missing_requirements = [];
    }

    response.can_advance = finalCanAdvance;
    if (!finalCanAdvance) {
      // Stage 1: softReasons を優先表示
      if (stage === 1 && validation.softReasons.length > 0) {
        response.missing_requirements = validation.softReasons;
      } else if (validation.reasons.length > 0) {
        response.missing_requirements = validation.reasons;
      }
    }

    // Store turn in DB — map coaching fields to ConversationTurn shape
    const turnData = await createTurn({
      conversation_id: conversationId,
      turn_number: turns.length,
      user_transcript: transcript || null,
      audio_url: audioUrl || null,
      extracted: null,
      ai_response: response.assistant_message,
      question_type: 'coaching',
      phase: 'intake',
      metadata: { coaching_response: response as unknown as Record<string, unknown> },
    });

    // Update conversation running_context
    updatedRc['current_stage'] = response.current_stage;
    updatedRc['stage_mode'] = stageMode;
    updatedRc['can_advance'] = response.can_advance;

    const stageSummaries = (updatedRc['stage_summaries'] || {}) as Record<string, string>;
    stageSummaries[stageKey] = response.stage_summary;
    updatedRc['stage_summaries'] = stageSummaries;

    updatedRc['stage_extracted_data'] = updatedExtractedData;

    const turnCountPerStage = (updatedRc['turn_count_per_stage'] || {}) as Record<string, number>;
    turnCountPerStage[stageKey] = (turnCountPerStage[stageKey] || 0) + 1;
    updatedRc['turn_count_per_stage'] = turnCountPerStage;

    await updateConversation(conversationId, {
      turn_count: turns.length + 1,
      running_context: updatedRc as unknown as Record<string, unknown>,
    });

    const coachingTurn: CoachingTurn = {
      id: turnData.id,
      conversation_id: conversationId,
      turn_number: turns.length,
      user_transcript: transcript || null,
      audio_url: audioUrl || null,
      ai_response: response.assistant_message,
      current_stage: stage,
      stage_mode: stageMode,
      coaching_response: response,
      created_at: turnData.created_at,
    };

    return { turn: coachingTurn, response };
  }

  async advanceStage(
    conversationId: string,
    nextStage: CoachingStage,
    _extractedData: StageExtractedData
  ): Promise<CoachingTurnResponse> {
    const conversationWithTurns = await getConversationWithTurns(conversationId);
    if (!conversationWithTurns) throw new Error('Conversation not found');

    const rc = (conversationWithTurns.running_context as unknown as Record<string, unknown>) || {};
    rc['current_stage'] = nextStage;
    rc['can_advance'] = false;
    await updateConversation(conversationId, { running_context: rc });

    // Return initial message for next stage
    return this.getInitialMessage(conversationId, nextStage, null);
  }

  async generateCoachingReport(conversationId: string): Promise<unknown> {
    const conversationWithTurns = await getConversationWithTurns(conversationId);
    if (!conversationWithTurns) throw new Error('Conversation not found');

    const { conversation_turns: turns, ...conversation } = conversationWithTurns;
    const rc = (conversation.running_context as unknown as Record<string, unknown>) || {};

    const context: CoachingContext = {
      conversationId,
      currentStage: (rc['current_stage'] as CoachingStage) || 4,
      stageMode: (rc['stage_mode'] as StageMode | null) || null,
      turnCount: turns.length,
      stageSummaries: (rc['stage_summaries'] as Record<string, string>) || {},
      stageExtractedData: (rc['stage_extracted_data'] as Record<string, StageExtractedData | null>) || {},
      recentTurns: (turns as unknown as CoachingTurn[]).slice(-5),
      all_issues: (rc['all_issues'] as import('../types/conversation').IssueItem[] | undefined) ?? [],
      ambiguous_terms: (rc['ambiguous_terms'] as AmbiguousTerm[] | undefined) ?? [],
      emotional_signals: (rc['emotional_signals'] as import('../types/conversation').EmotionalSignals | undefined),
      goal_hierarchy: (rc['goal_hierarchy'] as import('../types/conversation').GoalHierarchy | undefined),
      issues_prioritized: (rc['issues_prioritized'] as boolean | undefined) ?? false,
    };

    const turnDtos = turns.map(t => ({
      user_transcript: t.user_transcript,
      ai_response: t.ai_response,
    }));

    const prompt = buildCoachingReportPrompt(context, turnDtos);
    const raw = await generateContent(prompt);

    let report: unknown;
    try {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
      report = JSON.parse(jsonMatch ? jsonMatch[1] : raw);
    } catch {
      report = {
        title: 'コーチングセッションレポート',
        summary: (rc['stage_summaries'] as Record<string, string>)?.['4'] || 'セッション完了',
        key_insights: [],
        topics: [],
        emotional_journey: '',
        patterns_discovered: [],
        identity_narrative: '',
        action_items: [],
        growth_areas: [],
        structure: { sections: [] },
      };
    }

    await updateConversation(conversationId, {
      status: 'ended',
      final_report: report as Record<string, unknown>,
    });

    return report;
  }

  private extractCoachingContext(
    conversation: { id: string; running_context: unknown },
    turns: CoachingTurn[],
    stage: CoachingStage,
    stageMode: StageMode | null
  ): CoachingContext {
    const rc = (conversation.running_context || {}) as Record<string, unknown>;
    const turnCountPerStage = (rc['turn_count_per_stage'] || {}) as Record<string, number>;
    return {
      conversationId: conversation.id,
      currentStage: stage,
      stageMode,
      turnCount: turnCountPerStage[String(stage)] || 0,
      stageSummaries: (rc['stage_summaries'] as Record<string, string>) || {},
      stageExtractedData: (rc['stage_extracted_data'] as Record<string, StageExtractedData | null>) || {},
      recentTurns: turns.slice(-5),
      // New fields with defaults for backwards compatibility
      all_issues: (rc['all_issues'] as IssueItem[] | undefined) ?? [],
      ambiguous_terms: (rc['ambiguous_terms'] as AmbiguousTerm[] | undefined) ?? [],
      emotional_signals: (rc['emotional_signals'] as EmotionalSignals | undefined) ?? {
        explicit: [],
        implicit: [],
        intensity: 'low' as const,
        acknowledged: false,
      },
      goal_hierarchy: (rc['goal_hierarchy'] as GoalHierarchy | undefined) ?? {
        ultimate: null,
        intermediate: [],
        means_only: [],
      },
      issues_prioritized: (rc['issues_prioritized'] as boolean | undefined) ?? false,
      // Stage 1 enhanced fields
      issue_frame: (rc['issue_frame'] as IssueFrame | undefined) ?? null,
      slot_statuses: (rc['slot_statuses'] as Record<string, SlotStatus> | undefined) ?? null,
      do_not_ask_again: (rc['do_not_ask_again'] as string[] | undefined) ?? null,
      goal_readiness: (rc['goal_readiness'] as GoalReadiness | undefined) ?? undefined,
      // Theory discussion mode
      theory_mode_active: (rc['theory_mode_active'] as boolean | undefined) ?? false,
      theory_mode_turn_count: (rc['theory_mode_turn_count'] as number | undefined) ?? 0,
      theory_mode_concept: (rc['theory_mode_concept'] as string | undefined) ?? null,
    };
  }

  private toCoachingConversation(conv: { id: string; status: string; turn_count: number; final_report: unknown; created_at: string }, rc: Record<string, unknown>): CoachingConversation {
    return {
      id: conv.id,
      status: conv.status as 'active' | 'ended',
      current_stage: (rc['current_stage'] as CoachingStage) || 1,
      stage_mode: (rc['stage_mode'] as StageMode | null) || null,
      stage_summaries: (rc['stage_summaries'] as Record<string, string>) || {},
      stage_extracted_data: (rc['stage_extracted_data'] as Record<string, StageExtractedData | null>) || {},
      can_advance: (rc['can_advance'] as boolean) || false,
      turn_count: conv.turn_count || 0,
      final_report: conv.final_report as import('../types/conversation').ConversationReport | null,
      created_at: conv.created_at,
      updated_at: conv.created_at, // conversations table may not have updated_at; use created_at as fallback
    };
  }
}

export const coachingService = new CoachingService();
