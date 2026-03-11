import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI, { toFile } from 'openai';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateContent } from '../services/gemini';
import { cleanTranscript } from '../utils/clean-transcript';
import {
  SessionMemory,
  buildContext,
  buildRoundQuestionPrompt,
  parseRoundResponse,
  generateFallbackResponse,
  buildSummaryPrompt,
  parseSummaryResponse,
} from '../prompts/round-question-prompt';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_TIMEOUT_MS = 12000;

// POST /session — Create round session
router.post('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { selected_duration } = req.body;

    if (![60, 90, 120].includes(selected_duration)) {
      res.status(400).json({ error: 'selected_duration must be 60, 90, or 120' });
      return;
    }

    const { data, error } = await supabase
      .from('round_sessions')
      .insert({
        user_id: authReq.userId,
        selected_duration,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('round_events').insert({
      session_id: data.id,
      event_type: 'session_started',
      data: { selected_duration },
    });

    res.json({ id: data.id, created_at: data.created_at });
  } catch (err) {
    console.error('Create round session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// POST /question — Round analysis (multipart/form-data)
router.post('/question', requireAuth, upload.single('audio'), async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const {
      transcript: clientTranscript,
      round_number,
      previous_questions,
      session_memory,
      session_id,
      duration_sec,
    } = req.body;
    const audioFile = req.file;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const roundNum = parseInt(round_number) || 1;
    const prevQuestions: string[] = previous_questions ? JSON.parse(previous_questions) : [];
    const memory: SessionMemory | null = session_memory ? JSON.parse(session_memory) : null;
    const durationSec = parseInt(duration_sec) || 0;

    // --- Transcription ---
    let finalTranscript = clientTranscript || '';
    let usedWhisper = false;

    // Fallback: Whisper transcription when no client transcript
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
        console.error('Round Whisper transcription failed:', whisperErr);
        res.status(500).json({ error: '文字起こしに失敗しました' });
        return;
      }
    }

    // Clean transcript (filler words)
    finalTranscript = cleanTranscript(finalTranscript);

    if (!finalTranscript || finalTranscript.length < 5) {
      res.status(422).json({ error: '音声を認識できませんでした。もう一度お試しください。' });
      return;
    }

    // --- Gemini Analysis ---
    const context = buildContext(finalTranscript, memory, roundNum, prevQuestions);
    const prompt = buildRoundQuestionPrompt(context, roundNum);

    let response;
    let usedFallback = false;

    try {
      const geminiResult = await Promise.race([
        generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
        ),
      ]);

      response = parseRoundResponse(geminiResult);

      if (!response) {
        console.error('Failed to parse round response:', geminiResult.substring(0, 300));
        response = generateFallbackResponse(finalTranscript, roundNum);
        usedFallback = true;
      }
    } catch (geminiErr) {
      console.error('Gemini round analysis failed:', geminiErr);
      response = generateFallbackResponse(finalTranscript, roundNum);
      usedFallback = true;
    }

    const latencyMs = Date.now() - startTime;

    // --- Persist ---
    const { data: roundData, error: roundError } = await supabase
      .from('round_rounds')
      .insert({
        session_id,
        round_number: roundNum,
        duration_sec: durationSec,
        transcript: finalTranscript,
        transcript_length: finalTranscript.length,
        mirror: response.mirror,
        question: response.question,
        latency_ms: latencyMs,
        used_fallback: usedFallback,
        memory: response.memory,
      })
      .select()
      .single();

    if (roundError) throw roundError;

    // Update session
    await supabase
      .from('round_sessions')
      .update({
        total_rounds: roundNum,
        session_memory: response.memory,
      })
      .eq('id', session_id);

    // Log event
    await supabase.from('round_events').insert({
      session_id,
      event_type: 'round_completed',
      round_number: roundNum,
      data: {
        latency_ms: latencyMs,
        used_fallback: usedFallback,
        used_whisper: usedWhisper,
        transcript_length: finalTranscript.length,
      },
    });

    res.json({
      round_id: roundData.id,
      transcript: finalTranscript,
      mirror: response.mirror,
      question: response.question,
      memory: response.memory,
      latency_ms: latencyMs,
      used_fallback: usedFallback,
    });
  } catch (err) {
    console.error('Round question error:', err);
    res.status(500).json({ error: '分析に失敗しました' });
  }
});

// POST /summary — Session summary
router.post('/summary', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { session_id, round3_transcript, mirrors, questions, session_memory } = req.body;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const prompt = buildSummaryPrompt(
      mirrors || [],
      questions || [],
      session_memory || null,
      round3_transcript || '',
    );

    let summary;

    try {
      const geminiResult = await Promise.race([
        generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
        ),
      ]);

      summary = parseSummaryResponse(geminiResult);

      if (!summary) {
        console.error('Failed to parse summary response:', geminiResult.substring(0, 300));
        summary = {
          blockage: '分析結果を生成できませんでした',
          key_points: ['セッションデータを確認してください'],
          next_step: 'もう一度セッションを試してみてください',
        };
      }
    } catch (summaryErr) {
      console.error('Summary generation failed:', summaryErr);
      summary = {
        blockage: '分析結果を生成できませんでした',
        key_points: ['セッションデータを確認してください'],
        next_step: 'もう一度セッションを試してみてください',
      };
    }

    const latencyMs = Date.now() - startTime;

    // Update session
    await supabase
      .from('round_sessions')
      .update({
        summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    // Log event
    await supabase.from('round_events').insert({
      session_id,
      event_type: 'session_completed',
      data: { latency_ms: latencyMs },
    });

    res.json({ ...summary, latency_ms: latencyMs });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'まとめ生成に失敗しました' });
  }
});

// PATCH /session/:id — Update session
router.patch('/session/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { session_rating, status } = req.body;
    const updates: Record<string, unknown> = {};

    if (session_rating !== undefined) updates.session_rating = session_rating;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('round_sessions')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (session_rating !== undefined) {
      await supabase.from('round_events').insert({
        session_id: req.params.id,
        event_type: 'session_rated',
        data: { session_rating },
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Update round session error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// PATCH /round/:id — Update round (question rating)
router.patch('/round/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { question_rating } = req.body;

    if (!['forward', 'neutral', 'off'].includes(question_rating)) {
      res.status(400).json({ error: 'question_rating must be forward, neutral, or off' });
      return;
    }

    const { data, error } = await supabase
      .from('round_rounds')
      .update({ question_rating })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('round_events').insert({
      session_id: data.session_id,
      event_type: 'question_rated',
      round_number: data.round_number,
      data: { question_rating },
    });

    res.json(data);
  } catch (err) {
    console.error('Update round error:', err);
    res.status(500).json({ error: 'Failed to update round' });
  }
});

export default router;
