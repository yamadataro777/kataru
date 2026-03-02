import OpenAI, { toFile } from 'openai';
import {
  Conversation,
  ConversationPhase,
  ConversationTurn,
  ExtractedFeatures,
  QuestionType,
  QuestionScores,
  RunningContext,
  PHASE_CONFIG,
  CRISIS_KEYWORDS,
  SendTurnResponse,
  EndConversationResponse,
  ConversationReport,
} from '../types/conversation';
import {
  getConversation,
  getConversationWithTurns,
  getConversationTurns,
  createTurn,
  updateConversation,
} from './conversation';
import { uploadAudio } from './storage';
import { generateContent } from './gemini';
import {
  buildExtractionPrompt,
  buildResponsePrompt,
  buildFinalReportPrompt,
} from '../prompts/dialogue-prompts';

const HALLUCINATION_PATTERNS = [
  /ご視聴ありがとうございました。?/g,
  /ご視聴いただきありがとうございました。?/g,
  /ご視聴ありがとうございます。?/g,
  /ご視聴いただきありがとうございます。?/g,
  /チャンネル登録お願いします。?/g,
  /チャンネル登録よろしくお願いします。?/g,
  /高評価お願いします。?/g,
  /いいねとチャンネル登録をお願いします。?/g,
  /ありがとうございました。?$/g,
];

const DEFAULT_EXTRACTED: ExtractedFeatures = {
  emotional_tone: '不明',
  defense_mechanisms: [],
  abstraction_level: 'mixed',
  topics: [],
  readiness_for_change: 0.3,
  self_awareness_depth: 0.3,
  crisis_signals: [],
  key_phrases: [],
  turn_summary: '',
};

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

async function whisperTranscribe(audioUrl: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const audioResponse = await fetch(audioUrl);
  const arrayBuffer = await audioResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const file = await toFile(buffer, 'recording.webm', { type: 'audio/webm' });

  const whisperResponse = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'ja',
  });

  let transcript = whisperResponse.text;

  for (const pattern of HALLUCINATION_PATTERNS) {
    transcript = transcript.replace(pattern, '');
  }

  return transcript.trim();
}

function mergeContext(
  existing: RunningContext,
  extracted: ExtractedFeatures,
  currentPhase: ConversationPhase
): RunningContext {
  const newWeight = 0.6;
  const oldWeight = 1 - newWeight;

  return {
    goal: extracted.goal || existing.goal,
    pain: extracted.pain || existing.pain,
    conflict: extracted.conflict || existing.conflict,
    belief: extracted.belief || existing.belief,
    topics: [...new Set([...existing.topics, ...extracted.topics])],
    emotional_tones: [...existing.emotional_tones, extracted.emotional_tone],
    defense_mechanisms: [...new Set([...existing.defense_mechanisms, ...extracted.defense_mechanisms])],
    key_phrases: [...new Set([...existing.key_phrases, ...extracted.key_phrases])],
    turn_summaries: extracted.turn_summary
      ? [...existing.turn_summaries, extracted.turn_summary]
      : existing.turn_summaries,
    readiness_for_change:
      existing.readiness_for_change * oldWeight + extracted.readiness_for_change * newWeight,
    self_awareness_depth:
      existing.self_awareness_depth * oldWeight + extracted.self_awareness_depth * newWeight,
    phase_turns: {
      ...existing.phase_turns,
      [currentPhase]: (existing.phase_turns[currentPhase] || 0) + 1,
    },
  };
}

function checkPhaseTransition(
  phase: ConversationPhase,
  context: RunningContext,
  extracted: ExtractedFeatures
): ConversationPhase {
  const config = PHASE_CONFIG[phase];
  const phaseTurns = context.phase_turns[phase] || 0;

  if (phaseTurns >= config.maxTurns && config.next) {
    return config.next;
  }

  if (phaseTurns >= config.minTurns && config.next) {
    switch (phase) {
      case 'clarify':
        if (context.goal || context.pain) return config.next;
        break;
      case 'explore':
        if (context.conflict || context.topics.length >= 3) return config.next;
        break;
      case 'deepen':
        if (context.self_awareness_depth > 0.5 || context.defense_mechanisms.length > 0)
          return config.next;
        break;
      case 'identity_design':
        if (context.readiness_for_change > 0.6) return config.next;
        break;
      default:
        return config.next;
    }
  }

  return phase;
}

function scoreQuestionTypes(
  context: RunningContext,
  extracted: ExtractedFeatures,
  phase: ConversationPhase
): QuestionType {
  const scores: QuestionScores = {
    coaching: 40,
    psychoanalytic: 30,
    identity: 20,
  };

  // Coaching modifiers
  if (!context.goal) scores.coaching += 30;
  if (extracted.abstraction_level === 'abstract') scores.coaching += 20;
  if (phase === 'clarify') scores.coaching += 10;

  // Psychoanalytic modifiers
  if (context.conflict) scores.psychoanalytic += 30;
  if (extracted.defense_mechanisms.length > 0) scores.psychoanalytic += 20;
  if (extracted.self_awareness_depth < 0.4) scores.psychoanalytic += 20;

  // Identity modifiers
  if (extracted.readiness_for_change > 0.5) scores.identity += 30;
  if (context.goal) scores.identity += 20;
  if (phase === 'identity_design') scores.identity += 20;
  if (context.belief) scores.identity += 10;

  const entries = Object.entries(scores) as [QuestionType, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function buildTurnHistory(turns: ConversationTurn[]): string[] {
  const recent = turns.slice(-3);
  return recent.map((t) => {
    if (t.user_transcript) {
      return `ユーザー: ${t.user_transcript.substring(0, 100)}`;
    }
    return `AI: ${t.ai_response.substring(0, 100)}`;
  });
}

export async function processTurn(
  conversationId: string,
  audioBuffer?: Buffer,
  mimeType?: string,
  clientTranscript?: string
): Promise<SendTurnResponse> {
  // 1. Get conversation
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  if (conversation.status === 'ended') throw new Error('Conversation has ended');

  const turnNumber = conversation.turn_count + 1;
  let audioUrl: string | null = null;
  let transcript: string | null = null;

  // 2. Handle audio upload
  if (audioBuffer && mimeType) {
    const ext = getFileExtension(mimeType);
    const filePath = `conversations/${conversationId}/${turnNumber}/audio.${ext}`;
    const { publicUrl } = await uploadAudio(filePath, audioBuffer, mimeType);
    audioUrl = publicUrl;
  }

  // 3. Handle transcription
  if (clientTranscript) {
    transcript = clientTranscript;
  } else if (audioUrl) {
    transcript = await whisperTranscribe(audioUrl);
  }

  if (!transcript) {
    throw new Error('No transcript available');
  }

  // 4. Gemini Call 1: Extract features
  let extracted: ExtractedFeatures;
  try {
    const extractionResult = await generateContent(
      buildExtractionPrompt(transcript, conversation.running_context)
    );
    extracted = JSON.parse(extractionResult);
  } catch {
    extracted = { ...DEFAULT_EXTRACTED };
  }

  // 5. Safety check for crisis keywords
  const metadata: Record<string, unknown> = {};
  const hasCrisis = CRISIS_KEYWORDS.some((kw) => transcript!.includes(kw));
  if (hasCrisis) {
    metadata.crisis_detected = true;
    metadata.crisis_keywords = CRISIS_KEYWORDS.filter((kw) => transcript!.includes(kw));
  }

  // 6. Update running context
  const updatedContext = mergeContext(
    conversation.running_context,
    extracted,
    conversation.phase
  );

  // 7. Phase transition
  const newPhase = checkPhaseTransition(conversation.phase, updatedContext, extracted);

  // 8. Question type scoring
  const questionType = scoreQuestionTypes(updatedContext, extracted, newPhase);

  // 9. Gemini Call 2: Generate AI response
  const existingTurns = await getConversationTurns(conversationId);
  const turnHistory = buildTurnHistory(existingTurns);

  const aiResponse = await generateContent(
    buildResponsePrompt({
      phase: newPhase,
      questionType,
      runningContext: updatedContext,
      extracted,
      turnHistory,
    })
  );

  // 10. Create turn in DB
  const turn = await createTurn({
    conversation_id: conversationId,
    turn_number: turnNumber,
    user_transcript: transcript,
    audio_url: audioUrl,
    extracted,
    ai_response: aiResponse,
    question_type: questionType,
    phase: newPhase,
    metadata,
  });

  // 11. Update conversation
  const updatedConversation = await updateConversation(conversationId, {
    turn_count: turnNumber,
    phase: newPhase,
    running_context: updatedContext,
  });

  return { turn, conversation: updatedConversation };
}

export async function generateFinalReport(
  conversationId: string
): Promise<EndConversationResponse> {
  // 1. Get conversation with turns
  const conversationWithTurns = await getConversationWithTurns(conversationId);
  if (!conversationWithTurns) throw new Error('Conversation not found');

  // 2. Build and call final report prompt
  const reportPrompt = buildFinalReportPrompt(
    conversationWithTurns.running_context,
    conversationWithTurns.conversation_turns
  );
  const reportText = await generateContent(reportPrompt);

  // 3. Parse report JSON
  let report: ConversationReport;
  try {
    report = JSON.parse(reportText);
  } catch {
    report = {
      title: '対話レポート',
      summary: '対話の分析中にエラーが発生しました。',
      key_insights: [],
      topics: conversationWithTurns.running_context.topics,
      emotional_journey: conversationWithTurns.running_context.emotional_tones.join('→'),
      patterns_discovered: [],
      identity_narrative: '',
      action_items: [],
      growth_areas: [],
      structure: { sections: [] },
    };
  }

  // 4. Update conversation
  const conversation = await updateConversation(conversationId, {
    status: 'ended',
    ended_at: new Date().toISOString(),
    final_report: report,
  });

  return { conversation, report };
}

export async function createInitialTurn(
  conversationId: string
): Promise<SendTurnResponse> {
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('Conversation not found');

  const aiResponse =
    'こんにちは。今日はどんなことについて話しましょうか？何か気になっていること、考えていること、なんでも自由にお話しください。';

  const turn = await createTurn({
    conversation_id: conversationId,
    turn_number: 0,
    user_transcript: null,
    audio_url: null,
    extracted: null,
    ai_response: aiResponse,
    question_type: 'coaching',
    phase: 'intake',
    metadata: {},
  });

  return { turn, conversation };
}
