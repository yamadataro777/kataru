'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import AuthGuard from '@/components/auth/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import {
  createMarketingSession,
  submitMarketingQuestion,
  submitMarketingSummary,
  updateMarketingSession,
  updateMarketingRound,
  MarketingCanvasState,
  MarketingSummaryResponse,
} from '@/lib/api';

// --- Types ---

type Phase =
  | 'idle'
  | 'goal_input'
  | 'recording'
  | 'analyzing'
  | 'question'
  | 'summarizing'
  | 'summary';

type MktQuestionRating = 'hit' | 'neutral' | 'off';

interface RoundResult {
  roundId: string;
  transcript: string;
  mirror: string;
  question: string;
  questionType: string;
  questionTargetField: string;
  questionRating: MktQuestionRating | null;
}

// --- Constants ---

const MAX_ROUNDS = 5;
const MAX_RECORDING_SEC = 300; // 5 minutes

const CANVAS_FIELD_LABELS: Record<string, string> = {
  goal: 'ゴール',
  product: 'プロダクト',
  target_customer: 'ターゲット',
  pain: 'ペイン',
  trigger_moment: 'きっかけ',
  promise: '約束',
  differentiation: '差別化',
  proof: '証拠',
  channel: 'チャネル',
  offer: 'オファー',
  next_experiment: '次の実験',
};

const STATUS_COLORS: Record<string, string> = {
  known: 'var(--neon-lime)',
  assumed: 'var(--neon-cyan)',
  missing: 'rgba(255,255,255,0.25)',
  conflicted: 'var(--neon-magenta)',
};

// --- Component ---

export default function MarketingPage() {
  const router = useRouter();

  // Phase
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [roundNumber, setRoundNumber] = useState(0);

  // Canvas
  const [canvas, setCanvas] = useState<MarketingCanvasState | null>(null);

  // Rounds
  const [rounds, setRounds] = useState<RoundResult[]>([]);

  // Summary
  const [summary, setSummary] = useState<MarketingSummaryResponse | null>(null);

  // Text input mode
  const [useTextInput, setUseTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');

  // UI
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } =
    useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, startListening, stopListening } =
    useTranscription();

  // Refs
  const capturedTranscriptRef = useRef('');
  const isAnalyzingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    sessionId: null as string | null,
    roundNumber: 0,
    rounds: [] as RoundResult[],
    duration: 0,
  });
  useEffect(() => {
    stateRef.current = { sessionId, roundNumber, rounds, duration };
  }, [sessionId, roundNumber, rounds, duration]);

  // Computed
  const energyLevel = useMemo(() => {
    if (frequencyData.length === 0) return 0;
    const activeBins = frequencyData.slice(0, 40);
    const avg = activeBins.reduce((sum, v) => sum + v, 0) / activeBins.length;
    return Math.min(1, avg * 2.25);
  }, [frequencyData]);

  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  // --- Effects ---

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (isRecording && isSupported) {
      startListening();
    }
    return () => { stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Auto-stop at 5 min
  useEffect(() => {
    if (isRecording && duration >= MAX_RECORDING_SEC) {
      capturedTranscriptRef.current = transcript;
      stopRecording();
      stopListening();
      triggerHaptic('heavy');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, duration]);

  // Detect recording stop → analyze
  useEffect(() => {
    if (audioBlob && !isRecording && phase === 'recording' && !isAnalyzingRef.current) {
      isAnalyzingRef.current = true;
      setPhase('analyzing');
      const snap = stateRef.current;
      const clientTranscript = capturedTranscriptRef.current;

      (async () => {
        try {
          const formData = new FormData();
          formData.append('session_id', snap.sessionId!);
          formData.append('duration_sec', String(snap.duration));
          formData.append('input_type', 'voice');

          if (clientTranscript && clientTranscript.length > 0) {
            formData.append('transcript', clientTranscript);
          } else {
            const ext = audioBlob.type.includes('mp4')
              ? 'mp4'
              : audioBlob.type.includes('wav')
                ? 'wav'
                : 'webm';
            formData.append('audio', audioBlob, `recording.${ext}`);
          }

          const result = await submitMarketingQuestion(formData);
          handleQuestionResult(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : '分析に失敗しました');
          setPhase('question');
          isAnalyzingRef.current = false;
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording, phase]);

  useEffect(() => {
    return () => { stopRecording(); stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Helpers ---

  function handleQuestionResult(result: {
    round_id: string;
    transcript: string;
    mirror: string;
    question: string;
    question_type: string;
    question_target_field: string;
    canvas: MarketingCanvasState;
    round_number: number;
  }) {
    setRounds((prev) => [
      ...prev,
      {
        roundId: result.round_id,
        transcript: result.transcript,
        mirror: result.mirror,
        question: result.question,
        questionType: result.question_type,
        questionTargetField: result.question_target_field,
        questionRating: null,
      },
    ]);
    setCanvas(result.canvas);
    setRoundNumber(result.round_number);
    setPhase('question');
    isAnalyzingRef.current = false;
    triggerHaptic('medium');
  }

  // --- Actions ---

  const handleStart = useCallback(() => {
    setPhase('goal_input');
  }, []);

  const handleCreateSession = useCallback(async () => {
    setError(null);
    try {
      const result = await createMarketingSession(goal);
      setSessionId(result.id);
      stateRef.current.sessionId = result.id;
      setCanvas(result.canvas);
      setRoundNumber(0);
      setPhase('recording');
      if (!useTextInput) {
        await startRecording();
        triggerHaptic('medium');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セッション作成に失敗しました');
    }
  }, [goal, useTextInput, startRecording]);

  const handleStopRecording = useCallback(() => {
    capturedTranscriptRef.current = transcript;
    stopRecording();
    stopListening();
    triggerHaptic('heavy');
  }, [transcript, stopRecording, stopListening]);

  const handleStartNextRound = useCallback(async () => {
    setError(null);
    setTextInput('');
    isAnalyzingRef.current = false;
    setPhase('recording');
    if (!useTextInput) {
      await startRecording();
      triggerHaptic('medium');
    }
  }, [useTextInput, startRecording]);

  const handleSubmitText = useCallback(async () => {
    if (!textInput.trim() || !sessionId) return;
    setError(null);
    setPhase('analyzing');
    isAnalyzingRef.current = true;

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('transcript', textInput.trim());
      formData.append('input_type', 'text');
      formData.append('duration_sec', '0');

      const result = await submitMarketingQuestion(formData);
      handleQuestionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析に失敗しました');
      setPhase('recording');
      isAnalyzingRef.current = false;
    }
  }, [textInput, sessionId]);

  const handleRateQuestion = useCallback((rating: MktQuestionRating) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], questionRating: rating };
      return updated;
    });
    const round = rounds[rounds.length - 1];
    if (round) {
      updateMarketingRound(round.roundId, rating).catch(console.error);
    }
  }, [rounds]);

  const handleNextOrEnd = useCallback(() => {
    if (roundNumber >= MAX_ROUNDS) {
      handleGenerateSummary();
    } else {
      handleStartNextRound();
    }
  }, [roundNumber, handleStartNextRound]);

  const handleGenerateSummary = useCallback(async () => {
    setPhase('summarizing');
    setError(null);
    try {
      const result = await submitMarketingSummary(sessionId!);
      setSummary(result);
      setPhase('summary');
      triggerHaptic('heavy');
    } catch (err) {
      setError(err instanceof Error ? err.message : '要約生成に失敗しました');
      setPhase('summary');
    }
  }, [sessionId]);

  const handleEndEarly = useCallback(async () => {
    if (sessionId) {
      updateMarketingSession(sessionId, { status: 'completed' }).catch(console.error);
    }
    await handleGenerateSummary();
  }, [sessionId, handleGenerateSummary]);

  // --- Render ---

  const bgCyan = phase === 'recording' ? 0.14 + energyLevel * 0.26 : 0.08;
  const bgMagenta = phase === 'recording' ? 0.11 + energyLevel * 0.2 : 0.06;

  return (
    <AuthGuard>
      <div
        className="flex flex-col min-h-dvh relative overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 50% 38%, rgba(0,212,255,${bgCyan}), transparent 42%),
            radial-gradient(circle at 72% 72%, rgba(255,59,122,${bgMagenta}), transparent 46%),
            linear-gradient(180deg, #050810 0%, #0A1020 100%)
          `,
        }}
      >
        {/* Header */}
        <div className="px-5 py-3 flex-shrink-0 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {phase === 'recording' && !useTextInput && (
                <>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'var(--neon-magenta)',
                      boxShadow: '0 0 8px var(--neon-magenta)',
                      animation: 'rec-pulse 1.5s ease infinite',
                    }}
                  />
                  <span className="text-[10px] tracking-[2px] uppercase" style={{ color: 'var(--neon-magenta)' }}>
                    REC
                  </span>
                </>
              )}
              <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-75">
                MARKETING — R{roundNumber} / {MAX_ROUNDS}
              </span>
            </div>
            {(phase === 'idle' || phase === 'summary' || phase === 'goal_input') && (
              <button
                onClick={() => router.push('/')}
                className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer flex items-center gap-1"
              >
                <span>&larr;</span> BACK
              </button>
            )}
          </div>
        </div>

        {/* Round progress dots */}
        {roundNumber > 0 && (
          <div className="flex justify-center gap-2 pb-2 relative z-10">
            {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => (
              <div
                key={r}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background:
                    r < roundNumber
                      ? 'var(--neon-lime)'
                      : r === roundNumber
                        ? 'var(--neon-cyan)'
                        : 'rgba(255,255,255,0.15)',
                  boxShadow:
                    r <= roundNumber
                      ? `0 0 6px ${r < roundNumber ? 'var(--neon-lime)' : 'var(--neon-cyan)'}`
                      : 'none',
                }}
              />
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col relative z-10 px-5">
          {/* ========== IDLE ========== */}
          {phase === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <h1
                className="text-xl font-bold tracking-[6px] text-neon-cyan"
                style={{ textShadow: '0 0 20px rgba(0,212,255,0.4)' }}
              >
                MARKETING
              </h1>
              <p className="text-xs text-hud-white-dim text-center leading-relaxed max-w-[280px]">
                マーケティング仮説の欠損を見つけ、<br />
                1問ずつ壁打ちで埋めていきます。<br />
                最大{MAX_ROUNDS}ラウンド。
              </p>
              <NeonButton onClick={handleStart} variant="cyan">
                始める
              </NeonButton>
            </div>
          )}

          {/* ========== GOAL INPUT ========== */}
          {phase === 'goal_input' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <h2
                className="text-lg font-bold text-neon-cyan tracking-wider"
                style={{ textShadow: '0 0 14px rgba(0,212,255,0.45)' }}
              >
                今日決めたいこと
              </h2>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="例: SaaSのLP訴求軸を決めたい"
                className="w-full h-24 p-3 rounded-lg border border-[rgba(0,212,255,0.25)] bg-[rgba(0,0,0,0.3)] text-sm text-hud-white placeholder:text-hud-white-dim/40 resize-none focus:outline-none focus:border-neon-cyan"
                maxLength={200}
              />

              {/* Text input toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTextInput}
                  onChange={(e) => setUseTextInput(e.target.checked)}
                  className="accent-[var(--neon-cyan)]"
                />
                <span className="text-[11px] text-hud-white-dim tracking-wider">
                  テキストで入力する
                </span>
              </label>

              <NeonButton
                onClick={handleCreateSession}
                variant="cyan"
                disabled={!goal.trim()}
              >
                セッション開始
              </NeonButton>

              {error && <p className="text-xs text-neon-magenta text-center">{error}</p>}
            </div>
          )}

          {/* ========== RECORDING (Voice) ========== */}
          {phase === 'recording' && !useTextInput && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative" style={{ width: 200, height: 200 }}>
                <CircularEqualizer
                  frequencyData={frequencyData}
                  size={200}
                  rotationDeg={duration * 0.65}
                  energy={energyLevel}
                />
              </div>

              {/* Transcript */}
              <div
                className="w-full max-h-24 overflow-y-auto mt-2"
                style={{
                  scrollBehavior: 'smooth',
                  maskImage: 'linear-gradient(to top, black 72%, transparent 100%)',
                }}
              >
                {transcript || interimTranscript ? (
                  <p className="text-xs leading-6 text-hud-white opacity-80 tracking-wide">
                    {transcript}
                    {interimTranscript && (
                      <span className="text-neon-cyan opacity-60">{interimTranscript}</span>
                    )}
                    <span ref={transcriptEndRef} />
                  </p>
                ) : (
                  <p className="text-xs text-hud-white-dim tracking-[2px] text-center">
                    {isSupported ? 'Listening...' : '音声を録音中...'}
                  </p>
                )}
              </div>

              {/* Stop button */}
              <div className="flex flex-col items-center gap-2 mt-2">
                <button
                  onClick={handleStopRecording}
                  className="w-[72px] h-[72px] rounded-full border border-neon-magenta/60 bg-[rgba(12,16,34,0.96)] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95"
                  style={{
                    boxShadow: '0 0 18px rgba(255,59,122,0.3), inset 0 0 18px rgba(255,59,122,0.3)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--neon-magenta)">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
                <p className="text-[10px] tracking-[1.8px] text-hud-white-dim">
                  タップで停止
                </p>
              </div>
            </div>
          )}

          {/* ========== RECORDING (Text) ========== */}
          {phase === 'recording' && useTextInput && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {/* Show previous question as context */}
              {currentRound && (
                <GlassCard variant="magenta" className="w-full p-3">
                  <p className="text-[10px] tracking-[2px] text-neon-magenta opacity-60 mb-1">前回の問い</p>
                  <p className="text-sm text-hud-white leading-relaxed">{currentRound.question}</p>
                </GlassCard>
              )}

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="考えを入力してください..."
                className="w-full h-32 p-3 rounded-lg border border-[rgba(0,212,255,0.25)] bg-[rgba(0,0,0,0.3)] text-sm text-hud-white placeholder:text-hud-white-dim/40 resize-none focus:outline-none focus:border-neon-cyan"
                autoFocus
              />

              <NeonButton
                onClick={handleSubmitText}
                variant="cyan"
                disabled={!textInput.trim()}
              >
                送信
              </NeonButton>
            </div>
          )}

          {/* ========== ANALYZING ========== */}
          {phase === 'analyzing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div
                className="w-16 h-16 rounded-full border-2 border-neon-cyan"
                style={{
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                  boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                }}
              />
              <p className="text-sm text-neon-cyan tracking-[3px]">AI分析中...</p>
              <p className="text-[10px] text-hud-white-dim tracking-wide">
                仮説の欠損を探しています
              </p>
            </div>
          )}

          {/* ========== QUESTION ========== */}
          {phase === 'question' && currentRound && (
            <div className="flex-1 flex flex-col gap-4 py-4 overflow-y-auto">
              {/* Mirror */}
              <GlassCard variant="cyan" className="w-full p-4">
                <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                  理解ミラー
                </p>
                <p className="text-sm text-hud-white leading-relaxed">
                  {currentRound.mirror}
                </p>
              </GlassCard>

              {/* Question */}
              <GlassCard variant="magenta" className="w-full p-4">
                <p className="text-[10px] tracking-[2px] text-neon-magenta opacity-60 mb-2">
                  問い — {currentRound.questionType === 'gap_fill' ? '欠損埋め' : currentRound.questionType === 'hypothesis_compress' ? '仮説圧縮' : '検証設計'}
                </p>
                <p
                  className="text-base text-hud-white leading-relaxed font-medium"
                  style={{ textShadow: '0 0 20px rgba(255,59,122,0.15)' }}
                >
                  {currentRound.question}
                </p>
              </GlassCard>

              {/* Canvas status */}
              {canvas && <CanvasStatus canvas={canvas} targetField={currentRound.questionTargetField} />}

              {/* Rating */}
              <div className="w-full">
                <p className="text-[10px] tracking-[2px] text-hud-white-dim text-center mb-3">
                  この問いはどうでしたか？
                </p>
                <div className="flex gap-2">
                  {([
                    { key: 'hit' as MktQuestionRating, label: '刺さった', color: '168,255,0', cssVar: 'lime' },
                    { key: 'neutral' as MktQuestionRating, label: '微妙', color: '0,212,255', cssVar: 'cyan' },
                    { key: 'off' as MktQuestionRating, label: 'ズレた', color: '255,59,122', cssVar: 'magenta' },
                  ]).map(({ key, label, color, cssVar }) => (
                    <button
                      key={key}
                      onClick={() => handleRateQuestion(key)}
                      className="flex-1 py-3 rounded-lg border text-[11px] tracking-wider transition-all duration-200 cursor-pointer"
                      style={{
                        borderColor: currentRound.questionRating === key
                          ? `var(--neon-${cssVar})`
                          : 'rgba(255,255,255,0.1)',
                        color: currentRound.questionRating === key
                          ? `var(--neon-${cssVar})`
                          : 'rgba(255,255,255,0.4)',
                        background: currentRound.questionRating === key
                          ? `rgba(${color},0.15)`
                          : 'transparent',
                        boxShadow: currentRound.questionRating === key
                          ? `0 0 10px rgba(${color},0.3)`
                          : 'none',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next / End buttons */}
              {currentRound.questionRating && (
                <div className="flex flex-col gap-2 mt-2">
                  <NeonButton
                    onClick={handleNextOrEnd}
                    variant={roundNumber >= MAX_ROUNDS ? 'lime' : 'cyan'}
                  >
                    {roundNumber >= MAX_ROUNDS ? 'まとめる' : '続ける'}
                  </NeonButton>
                  {roundNumber < MAX_ROUNDS && roundNumber >= 1 && (
                    <button
                      onClick={handleEndEarly}
                      className="text-[11px] tracking-wider text-hud-white-dim py-2 bg-transparent border-0 cursor-pointer"
                    >
                      終了してまとめる
                    </button>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-neon-magenta text-center">{error}</p>}
            </div>
          )}

          {/* ========== SUMMARIZING ========== */}
          {phase === 'summarizing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div
                className="w-16 h-16 rounded-full border-2 border-neon-lime"
                style={{
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                  boxShadow: '0 0 20px rgba(168,255,0,0.3)',
                }}
              />
              <p className="text-sm text-neon-lime tracking-[3px]">要約を生成中...</p>
            </div>
          )}

          {/* ========== SUMMARY ========== */}
          {phase === 'summary' && (
            <div className="flex-1 flex flex-col gap-4 py-4 overflow-y-auto">
              <h2
                className="text-center text-lg font-bold text-neon-lime tracking-[4px]"
                style={{ textShadow: '0 0 14px rgba(168,255,0,0.45)' }}
              >
                SESSION COMPLETE
              </h2>

              {summary ? (
                <>
                  <GlassCard variant="cyan" className="p-4">
                    <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                      マーケティング仮説
                    </p>
                    <p className="text-sm text-hud-white leading-relaxed font-medium">
                      {summary.marketing_hypothesis}
                    </p>
                  </GlassCard>

                  <GlassCard variant="default" className="p-4">
                    <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                      ターゲット仮説
                    </p>
                    <p className="text-sm text-hud-white leading-relaxed">
                      {summary.target_hypothesis}
                    </p>
                  </GlassCard>

                  <GlassCard variant="default" className="p-4">
                    <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                      ペイン仮説
                    </p>
                    <p className="text-sm text-hud-white leading-relaxed">
                      {summary.pain_hypothesis}
                    </p>
                  </GlassCard>

                  <GlassCard variant="default" className="p-4">
                    <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                      約束する価値
                    </p>
                    <p className="text-sm text-hud-white leading-relaxed">
                      {summary.promised_value}
                    </p>
                  </GlassCard>

                  {summary.appeal_angles.length > 0 && (
                    <GlassCard variant="magenta" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-magenta opacity-60 mb-2">
                        訴求軸
                      </p>
                      <ul className="space-y-1">
                        {summary.appeal_angles.map((angle, i) => (
                          <li key={i} className="text-sm text-hud-white leading-relaxed flex items-start gap-2">
                            <span className="text-neon-magenta opacity-50 mt-0.5">{i + 1}.</span>
                            {angle}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  )}

                  <GlassCard variant="lime" className="p-4">
                    <p className="text-[10px] tracking-[2px] text-neon-lime opacity-60 mb-2">
                      次の実験
                    </p>
                    <p className="text-sm text-hud-white leading-relaxed font-medium">
                      {summary.next_experiment}
                    </p>
                  </GlassCard>
                </>
              ) : (
                error && (
                  <GlassCard variant="magenta" className="p-4">
                    <p className="text-sm text-neon-magenta">{error}</p>
                  </GlassCard>
                )
              )}

              <div className="pb-4">
                <NeonButton onClick={() => router.push('/')} variant="cyan" className="w-full">
                  ホームへ
                </NeonButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

// --- Canvas Status Inline Component ---

function CanvasStatus({
  canvas,
  targetField,
}: {
  canvas: MarketingCanvasState;
  targetField: string;
}) {
  const fields = Object.entries(CANVAS_FIELD_LABELS);

  return (
    <div className="w-full">
      <p className="text-[10px] tracking-[2px] text-hud-white-dim mb-2">CANVAS</p>
      <div className="flex flex-wrap gap-1.5">
        {fields.map(([key, label]) => {
          const field = canvas[key as keyof MarketingCanvasState];
          if (!field || typeof field !== 'object' || !('status' in field)) return null;
          const status = field.status as string;
          const isTarget = key === targetField;

          return (
            <span
              key={key}
              className="text-[10px] px-2 py-0.5 rounded-full border tracking-wider"
              style={{
                color: STATUS_COLORS[status] || STATUS_COLORS.missing,
                borderColor: isTarget
                  ? STATUS_COLORS[status] || STATUS_COLORS.missing
                  : 'rgba(255,255,255,0.08)',
                background: isTarget
                  ? `${STATUS_COLORS[status]}15`
                  : 'transparent',
                boxShadow: isTarget ? `0 0 6px ${STATUS_COLORS[status]}40` : 'none',
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Haptic feedback (iOS)
async function triggerHaptic(style: 'light' | 'medium' | 'heavy') {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const impactMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: impactMap[style] });
  } catch {
    // Haptics not available
  }
}
