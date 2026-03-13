import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI, { toFile } from 'openai';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateContent, generateRoundContent, generateRoundContentWithUsage } from '../services/gemini';
import { cleanTranscript } from '../utils/clean-transcript';
import {
  SessionMemory,
  QuestionRating,
  buildContext,
  buildRoundQuestionPrompt,
  buildRoundQuestionPromptV2,
  parseRoundResponse,
  generateFallbackResponse,
  buildSummaryPrompt,
  parseSummaryResponse,
} from '../prompts/round-question-prompt';
import {
  buildContextV2,
  buildThinkingCompanionPrompt,
  buildRerollConstraint,
  parseTurnResponseV2,
  generateFallbackEchoSenseNext,
  detectCrisisRegex,
  generateCrisisResponse,
  detectSensitiveTopic,
  detectPullBack,
  resolveGuardrail,
  TurnResponseV2,
  SensitiveTopicResult,
  PullBackSignal,
  GuardrailMode,
  GuardrailModeLog,
  RoundData,
  SummaryResponseV2,
  buildSummaryPromptV2,
  parseSummaryResponseV2,
  normalizeQuote,
  buildExtractiveFallback,
} from '../prompts/thinking-companion-prompt';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_TIMEOUT_MS = 12000;
const SUMMARY_TIMEOUT_MS = 15000;

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
        user_id: authReq.userId === 'dev-user' ? null : authReq.userId,
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
      previous_ratings: previousRatingsRaw,
      session_memory,
      session_id,
      duration_sec,
    } = req.body;
    const audioFile = req.file;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const useTC = process.env.THINKING_COMPANION !== 'false'; // TC on by default
    const useV2 = process.env.ROUND_PROMPT_V2 !== 'false';
    const usePrevRatings = process.env.ROUND_USE_PREVIOUS_RATINGS !== 'false';

    const roundNum = parseInt(round_number) || 1;
    const prevQuestions: string[] = previous_questions ? JSON.parse(previous_questions) : [];
    const prevRatings: (QuestionRating | null)[] = previousRatingsRaw
      ? JSON.parse(previousRatingsRaw)
      : [];
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

    // --- Thinking Companion path ---
    if (useTC) {
      // Phase 2: All variables initialized outside if for telemetry resilience
      let tcResponse: TurnResponseV2;
      let usedFallback = false;
      let geminiLatencyMs = 0;
      let promptTokens: number | undefined;
      let outputTokens: number | undefined;
      let guardrailLog: GuardrailModeLog = 'standard';
      let crisisSource: 'regex_high' | 'llm_only' | 'llm_with_regex_low' | null = null;
      let failureReason: 'parse_failed' | 'timeout' | 'gemini_error' | null = null;
      let llmIsCrisis = false;

      // Crisis detection: 2-tier regex safety net
      const crisisSignal = detectCrisisRegex(finalTranscript);

      // Sensitive/pullback computed before LLM call (telemetry survives exceptions)
      const sensitiveTopic: SensitiveTopicResult = detectSensitiveTopic(finalTranscript);
      const pullBack: PullBackSignal = detectPullBack(finalTranscript, roundNum, prevRatings);

      if (crisisSignal.highConfidence) {
        // High-confidence regex → fixed crisis response, no LLM call
        tcResponse = generateCrisisResponse(finalTranscript);
        guardrailLog = 'crisis_fixed';
        crisisSource = 'regex_high';
      } else {
        const guardrail: GuardrailMode = resolveGuardrail(sensitiveTopic, pullBack);

        const context = buildContextV2(
          finalTranscript,
          memory,
          roundNum,
          prevQuestions,
          usePrevRatings ? prevRatings : undefined,
        );
        const prompt = buildThinkingCompanionPrompt(context, roundNum, guardrail, sensitiveTopic.topicLabel);

        try {
          const geminiStart = Date.now();
          const geminiResult = await Promise.race([
            generateRoundContentWithUsage(prompt),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
            ),
          ]);
          geminiLatencyMs = Date.now() - geminiStart;
          promptTokens = geminiResult.usage?.promptTokens;
          outputTokens = geminiResult.usage?.outputTokens;

          const parsed = parseTurnResponseV2(geminiResult.text);

          if (parsed) {
            llmIsCrisis = parsed.is_crisis;
            if (parsed.is_crisis) {
              tcResponse = generateCrisisResponse(finalTranscript);
              guardrailLog = 'crisis_fixed';
              crisisSource = crisisSignal.lowConfidence ? 'llm_with_regex_low' : 'llm_only';
            } else {
              tcResponse = parsed;
              guardrailLog = guardrail;
            }
          } else {
            console.error('Failed to parse TC response:', geminiResult.text.substring(0, 300));
            tcResponse = generateFallbackEchoSenseNext(finalTranscript, roundNum, memory);
            usedFallback = true;
            failureReason = 'parse_failed';
            guardrailLog = guardrail;
          }
        } catch (geminiErr) {
          geminiLatencyMs = Date.now() - startTime; // approximate
          console.error('Gemini TC analysis failed:', geminiErr);
          tcResponse = generateFallbackEchoSenseNext(finalTranscript, roundNum, memory);
          usedFallback = true;
          failureReason = (geminiErr as Error).message === 'gemini_timeout' ? 'timeout' : 'gemini_error';
          guardrailLog = guardrail;
        }
      }

      const latencyMs = Date.now() - startTime;

      // Persist — round insert first (need roundData.id for response), then parallelize the rest
      // SLO targets (see IMPLEMENTATION_PLAYBOOK.md):
      //   P95 round response (client transcript): < 5s
      //   P95 round response (Whisper): < 10s
      //   Fallback rate: < 5%
      const dbStart = Date.now();
      const { data: roundData, error: roundError } = await supabase
        .from('round_rounds')
        .insert({
          session_id,
          round_number: roundNum,
          duration_sec: durationSec,
          transcript: finalTranscript,
          transcript_length: finalTranscript.length,
          mirror: tcResponse.echo,
          question: tcResponse.next,
          latency_ms: latencyMs,
          used_fallback: usedFallback,
          memory: tcResponse.memory,
          question_angle: tcResponse.memory.recent_question_angle,
          prompt_version: 'tc-v1',
          used_previous_ratings: usePrevRatings && prevRatings.length > 0,
          response_v2: {
            echo: tcResponse.echo,
            sense: tcResponse.sense,
            next: tcResponse.next,
            mode: tcResponse.mode,
            is_crisis: tcResponse.is_crisis,
          },
          // TODO(Phase2): Remove temporary mode observability after Phase 2 evaluation
          mode_primary: tcResponse.mode.primary,
          mode_secondary: tcResponse.mode.secondary || null,
        })
        .select()
        .single();

      if (roundError) throw roundError;

      // Session update + event insert — parallelized (results not needed for API response)
      await Promise.all([
        supabase
          .from('round_sessions')
          .update({
            total_rounds: roundNum,
            session_memory: tcResponse.memory,
          })
          .eq('id', session_id),
        supabase.from('round_events').insert({
          session_id,
          event_type: 'round_completed',
          round_number: roundNum,
          data: {
            latency_ms: latencyMs,
            gemini_latency_ms: geminiLatencyMs,
            db_latency_ms: Date.now() - dbStart,
            used_fallback: usedFallback,
            used_whisper: usedWhisper,
            transcript_length: finalTranscript.length,
            prompt_version: 'tc-v1',
            mode_primary: tcResponse.mode.primary,
            is_crisis: tcResponse.is_crisis,
            prompt_tokens: promptTokens,
            output_tokens: outputTokens,
            // Phase 2 telemetry
            regex_high: crisisSignal.highConfidence,
            regex_low: crisisSignal.lowConfidence,
            matched_patterns: crisisSignal.matchedPatterns,
            llm_is_crisis: llmIsCrisis,
            crisis_source: crisisSource,
            guardrail_mode: guardrailLog,
            sensitive_topic: sensitiveTopic.topicLabel,
            pull_back_detected: pullBack.detected,
            pull_back_signals: pullBack.signals,
            short_response_threshold: 30,
            failure_reason: failureReason,
          },
        }),
      ]);

      // Response: includes both TC fields and backward-compatible mirror/question
      res.json({
        round_id: roundData.id,
        transcript: finalTranscript,
        mirror: tcResponse.echo,
        question: tcResponse.next,
        echo: tcResponse.echo,
        sense: tcResponse.sense,
        next: tcResponse.next,
        is_crisis: tcResponse.is_crisis,
        memory: tcResponse.memory,
        latency_ms: latencyMs,
        used_fallback: usedFallback,
      });
      return;
    }

    // --- Legacy V1/V2 path ---
    const context = buildContext(
      finalTranscript,
      memory,
      roundNum,
      prevQuestions,
      usePrevRatings ? prevRatings : undefined,
    );
    const prompt = useV2
      ? buildRoundQuestionPromptV2(context, roundNum)
      : buildRoundQuestionPrompt(context, roundNum);

    let response;
    let usedFallback = false;

    try {
      const geminiCall = useV2 ? generateRoundContent(prompt) : generateContent(prompt);
      const geminiResult = await Promise.race([
        geminiCall,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
        ),
      ]);

      response = parseRoundResponse(geminiResult);

      if (!response) {
        console.error('Failed to parse round response:', geminiResult.substring(0, 300));
        response = generateFallbackResponse(finalTranscript, roundNum, memory);
        usedFallback = true;
      }
    } catch (geminiErr) {
      console.error('Gemini round analysis failed:', geminiErr);
      response = generateFallbackResponse(finalTranscript, roundNum, memory);
      usedFallback = true;
    }

    const latencyMs = Date.now() - startTime;

    // --- Persist (round insert first, then parallelize session update + event) ---
    const dbStart = Date.now();
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
        question_angle: response.memory.recent_question_angle,
        prompt_version: useV2 ? 'v2' : 'v1',
        used_previous_ratings: usePrevRatings && prevRatings.length > 0,
      })
      .select()
      .single();

    if (roundError) throw roundError;

    // Session update + event insert — parallelized (results not needed for API response)
    await Promise.all([
      supabase
        .from('round_sessions')
        .update({
          total_rounds: roundNum,
          session_memory: response.memory,
        })
        .eq('id', session_id),
      supabase.from('round_events').insert({
        session_id,
        event_type: 'round_completed',
        round_number: roundNum,
        data: {
          latency_ms: latencyMs,
          db_latency_ms: Date.now() - dbStart,
          used_fallback: usedFallback,
          used_whisper: usedWhisper,
          transcript_length: finalTranscript.length,
        },
      }),
    ]);

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
    const authReq = req as AuthenticatedRequest;
    const { session_id, round3_transcript, mirrors, questions, session_memory } = req.body;

    // 1. session_id 必須
    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    // 2. Ownership チェック
    const { data: session, error: sessionError } = await supabase
      .from('round_sessions')
      .select('user_id, session_memory')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: 'セッションが見つかりません' });
      return;
    }

    if (session.user_id !== null && authReq.userId !== session.user_id) {
      res.status(403).json({ error: '権限がありません' });
      return;
    }
    if (session.user_id === null && authReq.userId !== 'dev-user') {
      res.status(403).json({ error: '権限がありません' });
      return;
    }

    // 3. V1 fallback: 旧パラメータが来た場合
    const hasLegacyParams = mirrors || questions || round3_transcript;
    if (hasLegacyParams) {
      // TODO(post-gate4): V1 summary 生成経路を削除
      const prompt = buildSummaryPrompt(
        mirrors || [],
        questions || [],
        session_memory || null,
        round3_transcript || '',
      );

      let summary;
      let parseFailed = false;

      try {
        const geminiResult = await Promise.race([
          generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('gemini_timeout')), SUMMARY_TIMEOUT_MS),
          ),
        ]);

        summary = parseSummaryResponse(geminiResult);

        if (!summary) {
          parseFailed = true;
          console.error('Failed to parse summary response:', geminiResult.substring(0, 300));
          summary = {
            blockage: '分析結果を生成できませんでした',
            key_points: ['セッションデータを確認してください'],
            next_step: 'もう一度セッションを試してみてください',
          };
        }
      } catch (summaryErr) {
        parseFailed = true;
        console.error('Summary generation failed:', summaryErr);
        summary = {
          blockage: '分析結果を生成できませんでした',
          key_points: ['セッションデータを確認してください'],
          next_step: 'もう一度セッションを試してみてください',
        };
      }

      const latencyMs = Date.now() - startTime;

      await supabase
        .from('round_sessions')
        .update({ summary, status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', session_id);

      await supabase.from('round_events').insert({
        session_id,
        event_type: 'summary_generated',
        data: {
          summary_version: 1,
          summary_path: 'v1_fallback',
          round_count_used: 0,
          used_extractive_fallback: false,
          parse_failed: parseFailed,
          latency_ms: latencyMs,
          next_step_type: null,
          quote_source_mode: null,
        },
      });

      res.json({ ...summary, latency_ms: latencyMs });
      return;
    }

    // 4. V2 正規経路: DB からラウンドデータ読み取り
    const { data: dbRounds, error: roundsError } = await supabase
      .from('round_rounds')
      .select('round_number, transcript, mirror, question, response_v2')
      .eq('session_id', session_id)
      .order('round_number', { ascending: true });

    if (roundsError) throw roundsError;

    // 0ラウンドガード（第一段）
    if (!dbRounds || dbRounds.length === 0) {
      res.status(400).json({ error: 'ラウンドが存在しません' });
      return;
    }

    // legacy round データの抽出
    const rounds: RoundData[] = [];
    for (const r of dbRounds) {
      const transcript = r.transcript;
      // transcript が空の round は除外
      if (!transcript || transcript.trim().length === 0) continue;

      // echo/sense/next 抽出: response_v2 > legacy (mirror/question)
      const echo = r.response_v2?.echo || r.mirror || '';
      const sense = r.response_v2?.sense || '';
      const next = r.response_v2?.next || r.question || '';

      rounds.push({
        round_number: r.round_number,
        transcript,
        echo,
        sense,
        next,
      });
    }

    // 0ラウンドガード（第二段: 有効round 0件）
    if (rounds.length === 0) {
      res.status(400).json({ error: '有効なラウンドデータがありません' });
      return;
    }

    // session_memory 取得
    const memory: SessionMemory | null = session.session_memory || null;

    // V2 プロンプト生成 → Gemini → パース → normalize
    const prompt = buildSummaryPromptV2(rounds, memory);
    let summary: SummaryResponseV2;
    let parseFailed = false;
    let usedExtractiveFallback = false;
    let quoteSourceMode: 'llm' | 'extractive_fallback' = 'llm';

    try {
      const geminiResult = await Promise.race([
        generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), SUMMARY_TIMEOUT_MS),
        ),
      ]);

      const parsed = parseSummaryResponseV2(geminiResult);

      if (parsed) {
        // normalize
        parsed.journey.start_quote = normalizeQuote(parsed.journey.start_quote);
        parsed.journey.end_quote = normalizeQuote(parsed.journey.end_quote);
        parsed.journey.shift = normalizeQuote(parsed.journey.shift);

        // 空防止 fallback
        if (!parsed.journey.start_quote) parsed.journey.start_quote = 'ここから始まりました';
        if (!parsed.journey.end_quote) parsed.journey.end_quote = 'ここまで話しました';

        // version 強制セット
        parsed.version = 2;

        // 妥当性判定: 全フィールド非空
        if (
          parsed.journey.start_quote &&
          parsed.journey.shift &&
          parsed.journey.end_quote &&
          parsed.awareness &&
          parsed.next_step.content
        ) {
          summary = parsed;
        } else {
          summary = buildExtractiveFallback(rounds);
          usedExtractiveFallback = true;
          quoteSourceMode = 'extractive_fallback';
        }
      } else {
        parseFailed = true;
        console.error('Failed to parse V2 summary:', geminiResult.substring(0, 300));
        summary = buildExtractiveFallback(rounds);
        usedExtractiveFallback = true;
        quoteSourceMode = 'extractive_fallback';
      }
    } catch (summaryErr) {
      parseFailed = true;
      console.error('V2 summary generation failed:', summaryErr);
      summary = buildExtractiveFallback(rounds);
      usedExtractiveFallback = true;
      quoteSourceMode = 'extractive_fallback';
    }

    const latencyMs = Date.now() - startTime;

    // 保存
    await supabase
      .from('round_sessions')
      .update({ summary, status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session_id);

    // テレメトリ
    await supabase.from('round_events').insert({
      session_id,
      event_type: 'summary_generated',
      data: {
        summary_version: 2,
        summary_path: 'v2',
        round_count_used: rounds.length,
        used_extractive_fallback: usedExtractiveFallback,
        parse_failed: parseFailed,
        latency_ms: latencyMs,
        next_step_type: summary.next_step.type,
        quote_source_mode: quoteSourceMode,
      },
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

// POST /round/:id/reroll — Reroll question for a round
router.post('/round/:id/reroll', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const authReq = req as AuthenticatedRequest;
    const roundId = req.params.id;

    // 1. Fetch existing round
    const { data: round, error: roundFetchError } = await supabase
      .from('round_rounds')
      .select('id, session_id, round_number, transcript, mirror, question, question_angle, reroll_count, response_v2, memory')
      .eq('id', roundId)
      .single();

    if (roundFetchError || !round) {
      res.status(404).json({ error: 'ラウンドが見つかりません' });
      return;
    }

    // 2. Ownership check
    const { data: session } = await supabase
      .from('round_sessions')
      .select('user_id')
      .eq('id', round.session_id)
      .single();

    if (!session) {
      res.status(404).json({ error: 'セッションが見つかりません' });
      return;
    }

    if (session.user_id !== null && authReq.userId !== session.user_id) {
      res.status(403).json({ error: '権限がありません' });
      return;
    }
    if (session.user_id === null && authReq.userId !== 'dev-user') {
      res.status(403).json({ error: '権限がありません' });
      return;
    }

    // 3. Guards
    // Latest round only
    const { data: maxRoundRow } = await supabase
      .from('round_rounds')
      .select('round_number')
      .eq('session_id', round.session_id)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (maxRoundRow && maxRoundRow.round_number !== round.round_number) {
      res.status(409).json({ error: '最新ラウンドのみリロール可能' });
      return;
    }

    // Reroll limit
    if (round.reroll_count >= 1) {
      res.status(409).json({ error: 'リロールは1回まで' });
      return;
    }

    // Crisis guard
    if (round.response_v2?.is_crisis === true) {
      res.status(403).json({ error: 'Crisis応答はリロール不可' });
      return;
    }

    // 4. Get base memory (one-before)
    let baseMemory: SessionMemory | null = null;
    if (round.round_number >= 2) {
      const { data: prevRound } = await supabase
        .from('round_rounds')
        .select('memory')
        .eq('session_id', round.session_id)
        .eq('round_number', round.round_number - 1)
        .single();
      baseMemory = prevRound?.memory || null;
    }

    // 5. Sibling rounds for context
    const { data: siblings } = await supabase
      .from('round_rounds')
      .select('question, question_rating')
      .eq('session_id', round.session_id)
      .lt('round_number', round.round_number)
      .order('round_number', { ascending: true });

    const previousQuestions = (siblings || []).map((s: { question: string }) => s.question);
    const previousRatings = (siblings || []).map((s: { question_rating: QuestionRating | null }) => s.question_rating);

    // Save original values for event (echo/sense/next live in response_v2 JSONB, not top-level columns)
    const originalEcho = round.response_v2?.echo || round.mirror;
    const originalSense = round.response_v2?.sense || '';
    const originalNext = round.response_v2?.next || round.question;
    const originalQuestion = round.question;
    const originalAngle = round.question_angle;

    // Helper to build reroll update fields
    // Note: echo/sense/next are NOT top-level DB columns — they live in response_v2 JSONB
    // Top-level backward-compat columns are mirror (= echo) and question (= next)
    function buildRerollUpdateFields(
      response: TurnResponseV2,
      opts: { usedFallback: boolean; latencyMs: number; questionAngle: string },
    ) {
      return {
        mirror: response.echo,
        question: response.next,
        response_v2: {
          echo: response.echo,
          sense: response.sense,
          next: response.next,
          mode: response.mode,
          is_crisis: response.is_crisis,
        },
        question_angle: opts.questionAngle,
        memory: response.memory,
        question_rating: null,
        used_fallback: opts.usedFallback,
        latency_ms: opts.latencyMs,
      };
    }

    // Helper for conditional UPDATE with race protection
    async function applyRerollUpdate(fields: Record<string, unknown>) {
      const { data: updated, error: updateError } = await supabase
        .from('round_rounds')
        .update({
          ...fields,
          reroll_count: (round!.reroll_count || 0) + 1,
        })
        .eq('id', roundId)
        .eq('reroll_count', 0)
        .select()
        .single();

      if (updateError || !updated) {
        return null; // race condition
      }
      return updated;
    }

    // 6. Crisis detection
    const crisisSignal = detectCrisisRegex(round.transcript);
    const sensitiveTopic: SensitiveTopicResult = detectSensitiveTopic(round.transcript);
    const pullBack: PullBackSignal = detectPullBack(round.transcript, round.round_number, previousRatings);

    if (crisisSignal.highConfidence) {
      // High-conf regex crisis redirect
      const crisisResponse = generateCrisisResponse(round.transcript);
      const fields = buildRerollUpdateFields(crisisResponse, {
        usedFallback: false,
        latencyMs: Date.now() - startTime,
        questionAngle: 'crisis_fixed',
      });
      // Override memory to baseMemory for crisis
      fields.memory = baseMemory as unknown as TurnResponseV2['memory'];

      const updated = await applyRerollUpdate(fields);
      if (!updated) {
        res.status(409).json({ error: 'リロールの競合が発生しました' });
        return;
      }

      // Update session memory
      await supabase
        .from('round_sessions')
        .update({ session_memory: baseMemory })
        .eq('id', round.session_id);

      // Event
      await supabase.from('round_events').insert({
        session_id: round.session_id,
        event_type: 'round_rerolled',
        round_number: round.round_number,
        data: {
          original_echo: originalEcho,
          original_sense: originalSense,
          original_next: originalNext,
          original_question: originalQuestion,
          original_angle: originalAngle,
          new_angle: 'crisis_fixed',
          new_question: crisisResponse.next,
          latency_ms: Date.now() - startTime,
          used_fallback: false,
          crisis_redirected: true,
          crisis_source: 'regex_high',
        },
      });

      res.json({
        round_id: updated.id,
        transcript: round.transcript,
        mirror: crisisResponse.echo,
        question: crisisResponse.next,
        echo: crisisResponse.echo,
        sense: crisisResponse.sense,
        next: crisisResponse.next,
        is_crisis: true,
        memory: baseMemory,
        latency_ms: Date.now() - startTime,
        used_fallback: false,
      });
      return;
    }

    // 7. Normal reroll path
    const guardrail: GuardrailMode = resolveGuardrail(sensitiveTopic, pullBack);
    const context = buildContextV2(
      round.transcript,
      baseMemory,
      round.round_number,
      previousQuestions,
      previousRatings,
    );
    const rerollConstraint = buildRerollConstraint(
      originalNext || originalQuestion,
      originalAngle || 'blindspot',
    );
    const prompt = buildThinkingCompanionPrompt(
      context,
      round.round_number,
      guardrail,
      sensitiveTopic.topicLabel,
      rerollConstraint,
    );

    // 8. Gemini call
    let tcResponse: TurnResponseV2;
    let usedFallback = false;
    let geminiLatencyMs = 0;
    let failureReason: string | null = null;

    try {
      const geminiStart = Date.now();
      const geminiResult = await Promise.race([
        generateRoundContentWithUsage(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('gemini_timeout')), GEMINI_TIMEOUT_MS),
        ),
      ]);
      geminiLatencyMs = Date.now() - geminiStart;

      const parsed = parseTurnResponseV2(geminiResult.text);

      if (parsed) {
        // 9a. LLM crisis
        if (parsed.is_crisis) {
          const crisisResponse = generateCrisisResponse(round.transcript);
          const fields = buildRerollUpdateFields(crisisResponse, {
            usedFallback: false,
            latencyMs: Date.now() - startTime,
            questionAngle: 'crisis_fixed',
          });
          fields.memory = baseMemory as unknown as TurnResponseV2['memory'];

          const updated = await applyRerollUpdate(fields);
          if (!updated) {
            res.status(409).json({ error: 'リロールの競合が発生しました' });
            return;
          }

          await supabase
            .from('round_sessions')
            .update({ session_memory: baseMemory })
            .eq('id', round.session_id);

          await supabase.from('round_events').insert({
            session_id: round.session_id,
            event_type: 'round_rerolled',
            round_number: round.round_number,
            data: {
              original_echo: originalEcho,
              original_sense: originalSense,
              original_next: originalNext,
              original_question: originalQuestion,
              original_angle: originalAngle,
              new_angle: 'crisis_fixed',
              new_question: crisisResponse.next,
              latency_ms: Date.now() - startTime,
              used_fallback: false,
              crisis_redirected: true,
              crisis_source: 'llm',
            },
          });

          res.json({
            round_id: updated.id,
            transcript: round.transcript,
            mirror: crisisResponse.echo,
            question: crisisResponse.next,
            echo: crisisResponse.echo,
            sense: crisisResponse.sense,
            next: crisisResponse.next,
            is_crisis: true,
            memory: baseMemory,
            latency_ms: Date.now() - startTime,
            used_fallback: false,
          });
          return;
        }

        // 9c. Normal reroll success
        tcResponse = parsed;
      } else {
        // 9b. Parse failure → fallback
        console.error('Failed to parse TC reroll response:', geminiResult.text.substring(0, 500));
        tcResponse = generateFallbackEchoSenseNext(round.transcript, round.round_number, baseMemory);
        usedFallback = true;
        failureReason = 'parse_failed';
      }
    } catch (geminiErr) {
      // 9b. Gemini error → fallback
      geminiLatencyMs = Date.now() - startTime;
      console.error('Gemini TC reroll failed:', geminiErr);
      tcResponse = generateFallbackEchoSenseNext(round.transcript, round.round_number, baseMemory);
      usedFallback = true;
      failureReason = (geminiErr as Error).message === 'gemini_timeout' ? 'timeout' : 'gemini_error';
    }

    const latencyMs = Date.now() - startTime;

    // For fallback: don't advance session memory
    const newMemory = usedFallback ? baseMemory : tcResponse.memory;

    const fields = buildRerollUpdateFields(tcResponse, {
      usedFallback,
      latencyMs,
      questionAngle: tcResponse.memory.recent_question_angle,
    });
    if (usedFallback) {
      fields.memory = baseMemory as unknown as TurnResponseV2['memory'];
    }

    const updated = await applyRerollUpdate(fields);
    if (!updated) {
      res.status(409).json({ error: 'リロールの競合が発生しました' });
      return;
    }

    // 10. Update session memory
    await supabase
      .from('round_sessions')
      .update({ session_memory: newMemory })
      .eq('id', round.session_id);

    // 11. Event
    await supabase.from('round_events').insert({
      session_id: round.session_id,
      event_type: 'round_rerolled',
      round_number: round.round_number,
      data: {
        original_echo: originalEcho,
        original_sense: originalSense,
        original_next: originalNext,
        original_question: originalQuestion,
        original_angle: originalAngle,
        new_angle: tcResponse.memory.recent_question_angle,
        new_question: tcResponse.next,
        latency_ms: latencyMs,
        gemini_latency_ms: geminiLatencyMs,
        used_fallback: usedFallback,
        failure_reason: failureReason,
        guardrail_mode: guardrail,
        sensitive_topic: sensitiveTopic.topicLabel,
        pull_back_detected: pullBack.detected,
        crisis_redirected: false,
      },
    });

    // 12. Response
    res.json({
      round_id: updated.id,
      transcript: round.transcript,
      mirror: tcResponse.echo,
      question: tcResponse.next,
      echo: tcResponse.echo,
      sense: tcResponse.sense,
      next: tcResponse.next,
      is_crisis: tcResponse.is_crisis,
      memory: usedFallback ? baseMemory : tcResponse.memory,
      latency_ms: latencyMs,
      used_fallback: usedFallback,
    });
  } catch (err) {
    console.error('Reroll error:', err);
    res.status(500).json({ error: 'リロールに失敗しました' });
  }
});

// DELETE /round/:id — Delete (reset) a round
router.delete('/round/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const roundId = req.params.id;

    // 1. Fetch round
    const { data: round, error: roundFetchError } = await supabase
      .from('round_rounds')
      .select('id, session_id, round_number, transcript_length, response_v2')
      .eq('id', roundId)
      .single();

    if (roundFetchError || !round) {
      res.status(404).json({ error: 'ラウンドが見つかりません' });
      return;
    }

    // 2. Ownership check
    const { data: session } = await supabase
      .from('round_sessions')
      .select('user_id')
      .eq('id', round.session_id)
      .single();

    if (!session) {
      res.status(404).json({ error: 'セッションが見つかりません' });
      return;
    }

    if (session.user_id !== null && authReq.userId !== session.user_id) {
      res.status(403).json({ error: '権限がありません' });
      return;
    }
    if (session.user_id === null && authReq.userId !== 'dev-user') {
      res.status(403).json({ error: '権限がありません' });
      return;
    }

    // 3. Guards
    if (round.response_v2?.is_crisis === true) {
      res.status(403).json({ error: 'Crisis応答は取り消し不可' });
      return;
    }

    // Latest round only
    const { data: maxRoundRow } = await supabase
      .from('round_rounds')
      .select('round_number')
      .eq('session_id', round.session_id)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (maxRoundRow && maxRoundRow.round_number !== round.round_number) {
      res.status(409).json({ error: '最新ラウンドのみ取り消し可能' });
      return;
    }

    // 4. Memory rollback
    let previousMemory: SessionMemory | null = null;
    if (round.round_number >= 2) {
      const { data: prevRound } = await supabase
        .from('round_rounds')
        .select('memory')
        .eq('session_id', round.session_id)
        .eq('round_number', round.round_number - 1)
        .single();
      previousMemory = prevRound?.memory || null;
    }

    // 5. Delete with race protection
    const { data: deleted, error: deleteError } = await supabase
      .from('round_rounds')
      .delete()
      .eq('id', roundId)
      .select('id')
      .single();

    if (deleteError || !deleted) {
      res.status(409).json({ error: '取り消しの競合が発生しました' });
      return;
    }

    // 6. Update session
    await supabase
      .from('round_sessions')
      .update({
        session_memory: previousMemory,
        total_rounds: round.round_number - 1,
      })
      .eq('id', round.session_id);

    // 7. Event
    await supabase.from('round_events').insert({
      session_id: round.session_id,
      event_type: 'round_reset',
      round_number: round.round_number,
      data: {
        round_id: roundId,
        session_id: round.session_id,
        round_number: round.round_number,
        transcript_length: round.transcript_length,
      },
    });

    // 8. Response
    res.json({ memory: previousMemory });
  } catch (err) {
    console.error('Delete round error:', err);
    res.status(500).json({ error: '取り消しに失敗しました' });
  }
});

export default router;
