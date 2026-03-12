import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI, { toFile } from 'openai';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateMarketingContent, generateContent } from '../services/gemini';
import { cleanTranscript } from '../utils/clean-transcript';
import {
  MarketingCanvasState,
  MktQuestionRating,
  createEmptyCanvas,
  buildMarketingContext,
  buildMarketingQuestionPrompt,
  parseMarketingResponse,
  generateMarketingFallback,
  mergeCanvasUpdates,
  inferCanvasUpdate,
  suggestTargetField,
  buildMarketingSummaryPrompt,
  parseMarketingSummaryResponse,
} from '../prompts/marketing-prompt';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_TIMEOUT_MS = 25000;
const MAX_ROUNDS = 5;

// POST /session — Create marketing session
router.post('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { goal } = req.body;

    const canvas = createEmptyCanvas(goal || undefined);

    const { data, error } = await supabase
      .from('marketing_sessions')
      .insert({
        user_id: authReq.userId === 'dev-user' ? null : authReq.userId,
        goal: goal || null,
        canvas,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ id: data.id, canvas: data.canvas });
  } catch (err) {
    console.error('Create marketing session error:', err);
    res.status(500).json({ error: 'セッション作成に失敗しました' });
  }
});

// POST /question — Submit transcript/audio, get question back
router.post('/question', requireAuth, upload.single('audio'), async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { session_id, transcript: clientTranscript, duration_sec, input_type } = req.body;
    const audioFile = req.file;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    // --- DB: Fetch session ---
    const { data: session, error: sessionError } = await supabase
      .from('marketing_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: 'セッションが見つかりません' });
      return;
    }

    if (session.status !== 'active') {
      res.status(400).json({ error: 'セッションは既に終了しています' });
      return;
    }

    // --- DB: Fetch previous rounds ---
    const { data: prevRounds, error: roundsError } = await supabase
      .from('marketing_rounds')
      .select('question, question_rating, question_target_field, round_number')
      .eq('session_id', session_id)
      .order('round_number', { ascending: true });

    if (roundsError) throw roundsError;

    const roundNum = (prevRounds?.length || 0) + 1;

    if (roundNum > MAX_ROUNDS) {
      res.status(400).json({ error: `最大${MAX_ROUNDS}ラウンドです` });
      return;
    }

    const canvas: MarketingCanvasState = session.canvas;
    const prevQuestions = (prevRounds || []).map((r: { question: string }) => r.question || '');
    const prevRatings = (prevRounds || []).map(
      (r: { question_rating: string | null }) => r.question_rating as MktQuestionRating | null,
    );
    const prevTargetFields = (prevRounds || []).map(
      (r: { question_target_field: string | null }) => r.question_target_field || '',
    );
    const durationSec = parseInt(duration_sec) || 0;

    // --- Transcription ---
    let finalTranscript = clientTranscript || '';
    let usedWhisper = false;

    if (!finalTranscript && audioFile) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const ext = audioFile.originalname?.match(/\.(mp4|wav|webm|m4a)$/)?.[1] || 'webm';
        const mime = audioFile.mimetype || 'audio/webm';
        const file = await toFile(audioFile.buffer, `recording.${ext}`, { type: mime });

        const whisperResponse = await openai.audio.transcriptions.create({
          model: 'gpt-4o-transcribe',
          file,
          language: 'ja',
        });
        finalTranscript = whisperResponse.text;
        usedWhisper = true;
      } catch (whisperErr) {
        console.error('Marketing Whisper transcription failed:', whisperErr);
        res.status(500).json({ error: '文字起こしに失敗しました' });
        return;
      }
    }

    finalTranscript = cleanTranscript(finalTranscript);

    if (!finalTranscript || finalTranscript.length < 3) {
      res.status(422).json({ error: '音声を認識できませんでした。もう一度お試しください。' });
      return;
    }

    // --- Gemini Analysis ---
    const t0 = startTime;
    const tWhisperStart = usedWhisper ? t0 : null; // approximate; actual whisper timing is above
    const transcriptionMs = usedWhisper ? (Date.now() - t0) : null;

    const t1 = Date.now();
    const suggestedField = suggestTargetField(canvas, prevTargetFields, roundNum);
    const { context, compactCanvasChars } = buildMarketingContext(
      finalTranscript, canvas, roundNum, prevQuestions, prevRatings, suggestedField,
    );
    const prompt = buildMarketingQuestionPrompt(context, roundNum, MAX_ROUNDS);
    const promptPrepMs = Date.now() - t1;

    let response;
    let usedFallback = false;
    let fallbackReason: string | null = null;
    let geminiMs = 0;
    let geminiResult: { text: string; usage?: { promptTokens: number; outputTokens: number; totalTokens: number } } = { text: '' };

    try {
      const geminiStart = Date.now();
      geminiResult = await Promise.race([
        generateMarketingContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
        ),
      ]);
      geminiMs = Date.now() - geminiStart;

      const t2 = Date.now();
      response = parseMarketingResponse(geminiResult.text);
      const parseMs = Date.now() - t2;

      if (!response) {
        console.error(`[Marketing R${roundNum}] PARSE FAILED. Full response:\n${geminiResult.text}`);
        response = generateMarketingFallback(finalTranscript, canvas, prevTargetFields, roundNum);
        usedFallback = true;
        fallbackReason = 'parse_failed';
      }

      // --- Canvas merge (server-side) ---
      const t3 = Date.now();
      const serverUpdates = inferCanvasUpdate(response.question_target_field);
      const updatedCanvas = mergeCanvasUpdates(canvas, serverUpdates);
      const mergeMs = Date.now() - t3;

      const latencyMs = Date.now() - startTime;

      // --- METRICS ---
      console.log(`[Marketing R${roundNum}] METRICS`, JSON.stringify({
        mode: input_type || (usedWhisper ? 'voice' : 'text'),
        session_id,
        round_num: roundNum,
        transcript_chars: finalTranscript.length,
        compact_canvas_chars: compactCanvasChars,
        prompt_chars: prompt.length,
        response_chars: geminiResult.text.length,
        prompt_tokens: geminiResult.usage?.promptTokens ?? null,
        output_tokens: geminiResult.usage?.outputTokens ?? null,
        transcription_ms: transcriptionMs,
        prompt_prep_ms: promptPrepMs,
        gemini_ms: geminiMs,
        parse_ms: parseMs,
        merge_ms: mergeMs,
        total_ms: latencyMs,
        used_fallback: usedFallback,
        fallback_reason: fallbackReason,
        suggested_target_field: suggestedField.field,
        actual_question_target_field: response.question_target_field,
        override: suggestedField.field !== response.question_target_field,
        question_type: response.question_type,
      }));

      // --- Persist round ---
      const { data: roundData, error: roundError } = await supabase
        .from('marketing_rounds')
        .insert({
          session_id,
          round_number: roundNum,
          transcript: finalTranscript,
          transcript_length: finalTranscript.length,
          duration_sec: durationSec,
          input_type: input_type || (usedWhisper ? 'voice' : (audioFile ? 'voice' : 'text')),
          question_type: response.question_type,
          question: response.question,
          mirror: response.mirror,
          canvas_updates: serverUpdates,
          question_target_field: response.question_target_field,
          latency_ms: latencyMs,
          used_fallback: usedFallback,
        })
        .select()
        .single();

      if (roundError) throw roundError;

      // --- Update session ---
      await supabase
        .from('marketing_sessions')
        .update({
          canvas: updatedCanvas,
          total_rounds: roundNum,
        })
        .eq('id', session_id);

      res.json({
        round_id: roundData.id,
        transcript: finalTranscript,
        mirror: response.mirror,
        question: response.question,
        question_type: response.question_type,
        question_target_field: response.question_target_field,
        canvas: updatedCanvas,
        round_number: roundNum,
        latency_ms: latencyMs,
        used_fallback: usedFallback,
      });
      return;
    } catch (geminiErr) {
      const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      console.error(`[Marketing R${roundNum}] Gemini FAILED: ${errMsg}`);
      response = generateMarketingFallback(finalTranscript, canvas, prevTargetFields, roundNum);
      usedFallback = true;
      fallbackReason = errMsg === 'gemini_timeout' ? 'timeout' : 'gemini_error';
    }

    // --- Fallback path: Canvas merge (server-side) ---
    const serverUpdates = inferCanvasUpdate(response.question_target_field);
    const updatedCanvas = mergeCanvasUpdates(canvas, serverUpdates);
    const latencyMs = Date.now() - startTime;

    // --- METRICS (fallback) ---
    console.log(`[Marketing R${roundNum}] METRICS`, JSON.stringify({
      mode: input_type || (usedWhisper ? 'voice' : 'text'),
      session_id,
      round_num: roundNum,
      transcript_chars: finalTranscript.length,
      compact_canvas_chars: compactCanvasChars,
      prompt_chars: prompt.length,
      response_chars: geminiResult.text.length,
      prompt_tokens: geminiResult.usage?.promptTokens ?? null,
      output_tokens: geminiResult.usage?.outputTokens ?? null,
      transcription_ms: transcriptionMs,
      prompt_prep_ms: promptPrepMs,
      gemini_ms: geminiMs,
      parse_ms: null,
      merge_ms: null,
      total_ms: latencyMs,
      used_fallback: usedFallback,
      fallback_reason: fallbackReason,
      suggested_target_field: suggestedField.field,
      actual_question_target_field: response.question_target_field,
      override: suggestedField.field !== response.question_target_field,
      question_type: response.question_type,
    }));

    // --- Persist round (fallback path) ---
    const { data: roundData, error: roundError } = await supabase
      .from('marketing_rounds')
      .insert({
        session_id,
        round_number: roundNum,
        transcript: finalTranscript,
        transcript_length: finalTranscript.length,
        duration_sec: durationSec,
        input_type: input_type || (usedWhisper ? 'voice' : (audioFile ? 'voice' : 'text')),
        question_type: response.question_type,
        question: response.question,
        mirror: response.mirror,
        canvas_updates: serverUpdates,
        question_target_field: response.question_target_field,
        latency_ms: latencyMs,
        used_fallback: usedFallback,
      })
      .select()
      .single();

    if (roundError) throw roundError;

    // --- Update session (fallback path) ---
    await supabase
      .from('marketing_sessions')
      .update({
        canvas: updatedCanvas,
        total_rounds: roundNum,
      })
      .eq('id', session_id);

    res.json({
      round_id: roundData.id,
      transcript: finalTranscript,
      mirror: response.mirror,
      question: response.question,
      question_type: response.question_type,
      question_target_field: response.question_target_field,
      canvas: updatedCanvas,
      round_number: roundNum,
      latency_ms: latencyMs,
      used_fallback: usedFallback,
    });
  } catch (err) {
    console.error('Marketing question error:', err);
    res.status(500).json({ error: '分析に失敗しました' });
  }
});

// POST /summary — Generate final summary from canvas
router.post('/summary', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { session_id } = req.body;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const { data: session, error: sessionError } = await supabase
      .from('marketing_sessions')
      .select('canvas')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: 'セッションが見つかりません' });
      return;
    }

    const prompt = buildMarketingSummaryPrompt(session.canvas);

    let summary;
    try {
      const geminiResult = await Promise.race([
        generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
        ),
      ]);

      summary = parseMarketingSummaryResponse(geminiResult);

      if (!summary) {
        console.error('Failed to parse marketing summary:', geminiResult.substring(0, 300));
        summary = {
          marketing_hypothesis: '要約を生成できませんでした',
          target_hypothesis: '',
          pain_hypothesis: '',
          promised_value: '',
          appeal_angles: [],
          next_experiment: 'もう一度セッションを試してください',
        };
      }
    } catch (summaryErr) {
      console.error('Marketing summary generation failed:', summaryErr);
      summary = {
        marketing_hypothesis: '要約を生成できませんでした',
        target_hypothesis: '',
        pain_hypothesis: '',
        promised_value: '',
        appeal_angles: [],
        next_experiment: 'もう一度セッションを試してください',
      };
    }

    const latencyMs = Date.now() - startTime;

    // Update session
    await supabase
      .from('marketing_sessions')
      .update({
        summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    res.json({ ...summary, latency_ms: latencyMs });
  } catch (err) {
    console.error('Marketing summary error:', err);
    res.status(500).json({ error: '要約生成に失敗しました' });
  }
});

// PATCH /session/:id — Update session status
router.patch('/session/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updates: Record<string, unknown> = {};

    if (status) {
      if (!['active', 'completed', 'abandoned'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      updates.status = status;
      if (status === 'completed' || status === 'abandoned') {
        updates.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('marketing_sessions')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update marketing session error:', err);
    res.status(500).json({ error: 'セッション更新に失敗しました' });
  }
});

// PATCH /round/:id — Update round (question rating)
router.patch('/round/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { question_rating } = req.body;

    if (!['hit', 'neutral', 'off'].includes(question_rating)) {
      res.status(400).json({ error: 'question_rating must be hit, neutral, or off' });
      return;
    }

    const { data, error } = await supabase
      .from('marketing_rounds')
      .update({ question_rating })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update marketing round error:', err);
    res.status(500).json({ error: 'ラウンド更新に失敗しました' });
  }
});

export default router;
