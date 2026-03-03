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
  StageExtractedData,
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
    };
  } catch {
    console.error('Failed to parse LLM response:', raw.substring(0, 200));
    return { ...DEFAULT_FALLBACK, current_stage: stage, current_stage_mode: mode };
  }
}

// Re-export getConversations for use in routes
export { getConversations };

export class CoachingService {
  private stage4Handler: Stage4Handler;

  constructor(handler: Stage4Handler = new DefaultStage4Handler()) {
    this.stage4Handler = handler;
  }

  async createSession(): Promise<CoachingConversation> {
    const conv = await createConversation();
    const initialRc = {
      current_stage: 1,
      stage_mode: null,
      stage_summaries: {},
      stage_extracted_data: { '1': null, '2': null, '3': null, '4': null },
      can_advance: false,
      turn_count_per_stage: { '1': 0, '2': 0, '3': 0, '4': 0 },
    };
    await updateConversation(conv.id, { running_context: initialRc as unknown as Record<string, unknown> });
    return this.toCoachingConversation(conv, initialRc);
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
      prompt = this.stage4Handler.buildPrompt(transcript, coachingContext, stage3Data);
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
    const updatedRc = { ...(rc as Record<string, unknown>) };
    const stageKey = String(stage);
    updatedRc['current_stage'] = response.current_stage;
    updatedRc['stage_mode'] = stageMode;
    updatedRc['can_advance'] = response.can_advance;

    const stageSummaries = (updatedRc['stage_summaries'] || {}) as Record<string, string>;
    stageSummaries[stageKey] = response.stage_summary;
    updatedRc['stage_summaries'] = stageSummaries;

    const updatedExtractedData = (updatedRc['stage_extracted_data'] || {}) as Record<string, StageExtractedData | null>;
    updatedExtractedData[stageKey] = response.extracted_data;
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
