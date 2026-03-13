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
  createRoundSession,
  submitRoundQuestion,
  submitRoundSummary,
  updateRoundSession,
  updateRoundRound,
  rerollRoundQuestion,
  deleteRoundRound,
  RoundSessionMemory,
} from '@/lib/api';

// --- Types ---

type Phase = 'idle' | 'recording' | 'analyzing' | 'question' | 'summarizing' | 'summary';
type QuestionRating = 'forward' | 'neutral' | 'off';

interface RoundResult {
  roundId: string;
  transcript: string;
  mirror: string;
  question: string;
  // Thinking Companion fields
  echo?: string;
  sense?: string;
  next?: string;
  isCrisis?: boolean;
  questionRating: QuestionRating | null;
  hasRerolled?: boolean;
}

interface SummaryDataV1 {
  blockage: string;
  key_points: string[];
  next_step: string;
}

interface SummaryDataV2 {
  version: 2;
  journey: {
    start_quote: string;
    shift: string;
    end_quote: string;
  };
  awareness: string;
  next_step: {
    type: 'action' | 'question' | 'invitation';
    content: string;
  };
}

type SummaryData = SummaryDataV1 | SummaryDataV2;

function isSummaryV2(s: SummaryData): s is SummaryDataV2 {
  return 'version' in s && s.version === 2;
}

// --- Constants ---

const ROUND_LABELS = ['外化', '深掘り', '収束'];
const ROUND_DESCRIPTIONS = [
  '自由に話してください。頭の中にあることを声に出しましょう。',
  'AIの問いを受けて、さらに掘り下げてみましょう。',
  '核心に向かって、考えを絞り込みましょう。',
];
const DURATIONS = [60, 90, 120] as const;

// --- Component ---

export default function RecordPage() {
  const router = useRouter();

  // Phase state
  const [phase, setPhase] = useState<Phase>('idle');
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState<number>(90);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Round data
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [sessionMemory, setSessionMemory] = useState<RoundSessionMemory | null>(null);

  // Summary
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [sessionRating, setSessionRating] = useState(0);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isRerolling, setIsRerolling] = useState(false);

  // Hooks
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } =
    useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const {
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
  } = useTranscription();

  // Refs
  const capturedTranscriptRef = useRef('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isAnalyzingRef = useRef(false);

  // Snapshot ref for async operations
  const stateRef = useRef({
    sessionId: null as string | null,
    roundNumber: 1,
    rounds: [] as RoundResult[],
    sessionMemory: null as RoundSessionMemory | null,
    duration: 0,
  });
  useEffect(() => {
    stateRef.current = { sessionId, roundNumber, rounds, sessionMemory, duration };
  }, [sessionId, roundNumber, rounds, sessionMemory, duration]);

  // Computed
  const energyLevel = useMemo(() => {
    if (frequencyData.length === 0) return 0;
    const activeBins = frequencyData.slice(0, 40);
    const avg = activeBins.reduce((sum, v) => sum + v, 0) / activeBins.length;
    return Math.min(1, avg * 2.25);
  }, [frequencyData]);

  const remaining = Math.max(0, selectedDuration - duration);
  const countdownMins = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const countdownSecs = (remaining % 60).toString().padStart(2, '0');
  const progress = Math.min(duration / selectedDuration, 1);
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const previousRound = roundNumber > 1 && rounds.length >= roundNumber - 1
    ? rounds[roundNumber - 2]
    : null;

  // --- Effects ---

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript]);

  // Start transcription when recording
  useEffect(() => {
    if (isRecording && isSupported) {
      startListening();
    }
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Auto-stop when countdown reaches 0
  useEffect(() => {
    if (isRecording && duration >= selectedDuration) {
      capturedTranscriptRef.current = transcript;
      stopRecording();
      stopListening();
      triggerHaptic('heavy');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, duration, selectedDuration]);

  // Detect recording stopped → analyze
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
          formData.append('round_number', String(snap.roundNumber));
          formData.append('duration_sec', String(snap.duration));
          formData.append(
            'previous_questions',
            JSON.stringify(snap.rounds.map((r) => r.question)),
          );
          formData.append('session_memory', JSON.stringify(snap.sessionMemory || {}));
          formData.append(
            'previous_ratings',
            JSON.stringify(snap.rounds.map((r) => r.questionRating)),
          );

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

          const result = await submitRoundQuestion(formData);

          setRounds((prev) => [
            ...prev,
            {
              roundId: result.round_id,
              transcript: result.transcript,
              mirror: result.mirror,
              question: result.question,
              echo: result.echo,
              sense: result.sense,
              next: result.next,
              isCrisis: result.is_crisis,
              questionRating: null,
            },
          ]);
          setSessionMemory(result.memory);
          setPhase('question');
          triggerHaptic('medium');
        } catch (err) {
          setError(err instanceof Error ? err.message : '分析に失敗しました');
          setPhase('idle');
          isAnalyzingRef.current = false;
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording, phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Actions ---

  const handleStartRound = useCallback(async () => {
    setError(null);

    try {
      let sid = sessionId;
      if (roundNumber === 1) {
        const session = await createRoundSession(selectedDuration);
        sid = session.id;
        setSessionId(sid);
        // Update ref immediately for async use
        stateRef.current.sessionId = sid;
      }

      isAnalyzingRef.current = false;
      setPhase('recording');
      await startRecording();
      triggerHaptic('medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セッション作成に失敗しました');
    }
  }, [sessionId, roundNumber, selectedDuration, startRecording]);

  const handleStopRecording = useCallback(() => {
    capturedTranscriptRef.current = transcript;
    stopRecording();
    stopListening();
    triggerHaptic('heavy');
  }, [transcript, stopRecording, stopListening]);

  const handleRateQuestion = useCallback(
    (rating: QuestionRating) => {
      setRounds((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], questionRating: rating };
        return updated;
      });

      const round = rounds[rounds.length - 1];
      if (round) {
        updateRoundRound(round.roundId, rating).catch(console.error);
      }
    },
    [rounds],
  );

  const handleReroll = useCallback(async () => {
    const round = rounds[rounds.length - 1];
    if (!round || round.isCrisis || round.hasRerolled) return;

    setIsRerolling(true);
    setPhase('analyzing');
    setError(null);

    try {
      const result = await rerollRoundQuestion(round.roundId);

      setRounds(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          roundId: result.round_id,
          transcript: result.transcript,
          mirror: result.mirror,
          question: result.question,
          echo: result.echo,
          sense: result.sense,
          next: result.next,
          isCrisis: result.is_crisis,
          questionRating: null,
          hasRerolled: true,
        };
        return updated;
      });
      setSessionMemory(result.memory);
      setPhase('question');
      triggerHaptic('medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リロールに失敗しました');
      setPhase('question');
    } finally {
      setIsRerolling(false);
    }
  }, [rounds]);

  const handleReset = useCallback(async () => {
    const round = rounds[rounds.length - 1];
    if (!round || round.isCrisis) return;

    setError(null);

    try {
      const result = await deleteRoundRound(round.roundId);

      setRounds(prev => prev.slice(0, -1));
      setSessionMemory(result.memory);
      setPhase('idle');
      isAnalyzingRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : '取り消しに失敗しました');
    }
  }, [rounds]);

  const handleNextRound = useCallback(() => {
    if (roundNumber >= 3) {
      handleGenerateSummary();
    } else {
      setRoundNumber((prev) => prev + 1);
      setPhase('idle');
      isAnalyzingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundNumber]);

  const handleGenerateSummary = useCallback(async () => {
    setPhase('summarizing');
    setError(null);

    try {
      const snap = stateRef.current;
      const result = await submitRoundSummary(snap.sessionId!);

      // V2/V1 判定
      if ('version' in result && result.version === 2) {
        setSummary(result as unknown as SummaryDataV2);
      } else {
        const v1 = result as { blockage: string; key_points: string[]; next_step: string };
        setSummary({
          blockage: v1.blockage,
          key_points: v1.key_points,
          next_step: v1.next_step,
        });
      }
      setPhase('summary');
      triggerHaptic('heavy');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'まとめ生成に失敗しました');
      setPhase('summary');
    }
  }, []);

  const handleRateSession = useCallback(
    (rating: number) => {
      setSessionRating(rating);
      if (sessionId) {
        updateRoundSession(sessionId, { session_rating: rating }).catch(console.error);
      }
    },
    [sessionId],
  );

  // --- Render helpers ---

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
              {phase === 'recording' && (
                <>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'var(--neon-magenta)',
                      boxShadow: '0 0 8px var(--neon-magenta)',
                      animation: 'rec-pulse 1.5s ease infinite',
                    }}
                  />
                  <span
                    className="text-[10px] tracking-[2px] uppercase"
                    style={{ color: 'var(--neon-magenta)' }}
                  >
                    REC
                  </span>
                </>
              )}
              <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-75">
                ROUND {roundNumber} / 3 — {ROUND_LABELS[roundNumber - 1]}
              </span>
            </div>
            {(phase === 'idle' || phase === 'summary') && (
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
        <div className="flex justify-center gap-2 pb-2 relative z-10">
          {[1, 2, 3].map((r) => (
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

        {/* Main content */}
        <div className="flex-1 flex flex-col relative z-10 px-5">
          {/* ========== IDLE PHASE ========== */}
          {phase === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {/* Previous round question context */}
              {previousRound && (
                <GlassCard variant="cyan" className="w-full p-4">
                  <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                    ROUND {roundNumber - 1} の問い
                  </p>
                  <p className="text-sm text-hud-white leading-relaxed">
                    {previousRound.question}
                  </p>
                </GlassCard>
              )}

              {/* Round description */}
              <div className="text-center">
                <h2
                  className="text-lg font-bold text-neon-cyan tracking-wider mb-2"
                  style={{ textShadow: '0 0 14px rgba(0, 212, 255, 0.45)' }}
                >
                  Round {roundNumber}: {ROUND_LABELS[roundNumber - 1]}
                </h2>
                <p className="text-xs text-hud-white opacity-60 leading-relaxed">
                  {ROUND_DESCRIPTIONS[roundNumber - 1]}
                </p>
              </div>

              {/* Duration selector (R1 only) */}
              {roundNumber === 1 && (
                <div className="flex gap-3">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDuration(d)}
                      className={`
                        px-4 py-2 rounded-lg border font-mono text-sm tracking-wider
                        transition-all duration-200 cursor-pointer
                        ${
                          selectedDuration === d
                            ? 'border-neon-cyan text-neon-cyan bg-[rgba(0,212,255,0.12)]'
                            : 'border-[rgba(255,255,255,0.1)] text-hud-white-dim bg-transparent'
                        }
                      `}
                      style={
                        selectedDuration === d
                          ? { boxShadow: '0 0 12px rgba(0,212,255,0.3)' }
                          : undefined
                      }
                    >
                      {d}秒
                    </button>
                  ))}
                </div>
              )}

              {/* Start button */}
              <NeonButton onClick={handleStartRound} variant="cyan">
                {roundNumber === 1 ? '始める' : '次のラウンドを始める'}
              </NeonButton>

              {/* Error */}
              {error && (
                <p className="text-xs text-neon-magenta text-center">{error}</p>
              )}
            </div>
          )}

          {/* ========== RECORDING PHASE ========== */}
          {phase === 'recording' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {/* Equalizer */}
              <div className="relative" style={{ width: 240, height: 240 }}>
                <CircularEqualizer
                  frequencyData={frequencyData}
                  size={240}
                  rotationDeg={duration * 0.65}
                  energy={energyLevel}
                />
              </div>

              {/* Countdown timer */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="text-[28px] font-bold tracking-[6px] font-mono"
                  style={{
                    color:
                      remaining <= 10
                        ? 'var(--neon-magenta)'
                        : 'var(--neon-cyan)',
                    textShadow:
                      remaining <= 10
                        ? '0 0 14px rgba(255,59,122,0.5)'
                        : '0 0 14px rgba(0,212,255,0.45)',
                  }}
                >
                  {countdownMins}:{countdownSecs}
                </div>
                {/* Progress bar */}
                <div className="w-48 h-[2px] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${progress * 100}%`,
                      background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))',
                    }}
                  />
                </div>
              </div>

              {/* Transcript */}
              <div
                className="w-full max-h-28 overflow-y-auto mt-2"
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
                    {isSupported ? 'Listening...' : '文字起こしは自動で行います'}
                  </p>
                )}
              </div>

              {/* Stop button */}
              <div className="flex flex-col items-center gap-2 mt-2">
                <div
                  className="w-[80px] h-[80px] rounded-full p-[2px]"
                  style={{
                    background: `conic-gradient(rgba(0,212,255,0.95) ${progress * 360}deg, rgba(255,59,122,0.25) ${progress * 360}deg 360deg)`,
                    boxShadow:
                      '0 0 18px rgba(0,212,255,0.3), 0 0 36px rgba(255,59,122,0.2)',
                  }}
                >
                  <button
                    onClick={handleStopRecording}
                    className="w-full h-full rounded-full border border-neon-magenta/60 bg-[rgba(12,16,34,0.96)] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95"
                    style={{
                      boxShadow: 'inset 0 0 18px rgba(255,59,122,0.3)',
                      animation: 'pulse 1.2s ease infinite',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="var(--neon-magenta)"
                    >
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] tracking-[1.8px] text-hud-white-dim">
                  タップで早期終了
                </p>
              </div>
            </div>
          )}

          {/* ========== ANALYZING PHASE (Active Wait) ========== */}
          {phase === 'analyzing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              {/* Pulsing equalizer — slow breathing animation */}
              <div className="relative" style={{ width: 180, height: 180 }}>
                <CircularEqualizer
                  frequencyData={new Array(64).fill(0).map((_, i) => 0.08 + Math.sin(Date.now() / 1200 + i * 0.3) * 0.06)}
                  size={180}
                  rotationDeg={(Date.now() / 60) % 360}
                  energy={0.15}
                />
              </div>

              <p className="text-sm text-neon-cyan tracking-[3px]">
                {isRerolling ? '別の切り口を探しています' : 'あなたの言葉を読んでいます'}
              </p>

              {/* Captured transcript scroll-in */}
              {capturedTranscriptRef.current && (
                <div
                  className="w-full max-h-24 overflow-y-auto"
                  style={{
                    maskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
                    animation: 'fadeIn 1.2s ease-out',
                  }}
                >
                  <p className="text-xs leading-6 text-hud-white opacity-50 tracking-wide text-center">
                    {capturedTranscriptRef.current}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========== QUESTION PHASE ========== */}
          {phase === 'question' && currentRound && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {/* Echo — most important, always first */}
              <GlassCard variant="cyan" className="w-full p-4">
                <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                  ECHO
                </p>
                <p className="text-sm text-hud-white leading-relaxed">
                  {currentRound.echo || currentRound.mirror}
                </p>
              </GlassCard>

              {/* Sense */}
              {(currentRound.sense || !currentRound.echo) && (
                <GlassCard variant="cyan" className="w-full p-4 opacity-90">
                  <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-40 mb-2">
                    SENSE
                  </p>
                  <p className="text-sm text-hud-white opacity-90 leading-relaxed">
                    {currentRound.sense || ''}
                  </p>
                </GlassCard>
              )}

              {/* Next — the question */}
              <GlassCard variant="magenta" className="w-full p-4">
                <p className="text-[10px] tracking-[2px] text-neon-magenta opacity-60 mb-2">
                  NEXT
                </p>
                <p
                  className="text-base text-hud-white leading-relaxed font-medium"
                  style={{ textShadow: '0 0 20px rgba(255,59,122,0.15)' }}
                >
                  {currentRound.next || currentRound.question}
                </p>
              </GlassCard>

              {/* Crisis notice */}
              {currentRound.isCrisis && (
                <div className="w-full p-3 rounded-lg border border-[rgba(255,59,122,0.3)] bg-[rgba(255,59,122,0.08)]">
                  <p className="text-xs text-hud-white opacity-80 leading-relaxed text-center">
                    つらい時は一人で抱え込まないでください
                  </p>
                </div>
              )}

              {/* Reroll link */}
              {!currentRound.isCrisis && !currentRound.hasRerolled && (
                <button
                  onClick={handleReroll}
                  disabled={isRerolling}
                  className="text-xs text-neon-cyan/50 hover:text-neon-cyan/80 tracking-wider transition-opacity bg-transparent border-0 cursor-pointer"
                >
                  別の問いを見る
                </button>
              )}
              {currentRound.hasRerolled && (
                <span className="text-[10px] text-hud-white/40 tracking-wider">
                  リロール済み
                </span>
              )}

              {/* Next button — always visible, rating is optional */}
              <NeonButton
                onClick={handleNextRound}
                variant={roundNumber >= 3 ? 'lime' : 'cyan'}
              >
                {roundNumber >= 3 ? 'セッションをまとめる' : '次のラウンドへ'}
              </NeonButton>

              {/* Rating buttons — optional feedback */}
              <div className="w-full opacity-70">
                <p className="text-[10px] tracking-[2px] text-hud-white-dim text-center mb-3">
                  この問いはどうでしたか？（任意）
                </p>
                <div className="flex gap-2">
                  {([
                    { key: 'forward' as QuestionRating, label: '話しやすくなった', variant: 'lime' },
                    { key: 'neutral' as QuestionRating, label: 'どちらでもない', variant: 'cyan' },
                    { key: 'off' as QuestionRating, label: 'ズレていた', variant: 'magenta' },
                  ] as const).map(({ key, label, variant }) => (
                    <button
                      key={key}
                      onClick={() => handleRateQuestion(key)}
                      className={`
                        flex-1 py-3 rounded-lg border text-[11px] tracking-wider
                        transition-all duration-200 cursor-pointer
                        ${
                          currentRound.questionRating === key
                            ? `border-neon-${variant} text-neon-${variant} bg-[rgba(${variant === 'lime' ? '168,255,0' : variant === 'cyan' ? '0,212,255' : '255,59,122'},0.15)]`
                            : 'border-[rgba(255,255,255,0.1)] text-hud-white-dim bg-transparent'
                        }
                      `}
                      style={
                        currentRound.questionRating === key
                          ? {
                              boxShadow: `0 0 10px rgba(${variant === 'lime' ? '168,255,0' : variant === 'cyan' ? '0,212,255' : '255,59,122'},0.3)`,
                            }
                          : undefined
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset link */}
              {!currentRound.isCrisis && (
                <button
                  onClick={handleReset}
                  className="text-[10px] text-hud-white/30 hover:text-hud-white/50 tracking-wider transition-opacity bg-transparent border-0 cursor-pointer mt-2"
                >
                  この回答を取り消す
                </button>
              )}
            </div>
          )}

          {/* ========== SUMMARIZING PHASE ========== */}
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
              <p className="text-sm text-neon-lime tracking-[3px]">
                セッションまとめを生成中...
              </p>
            </div>
          )}

          {/* ========== SUMMARY PHASE ========== */}
          {phase === 'summary' && (
            <div className="flex-1 flex flex-col gap-5 py-4 overflow-y-auto">
              <h2
                className="text-center text-lg font-bold text-neon-lime tracking-[4px]"
                style={{ textShadow: '0 0 14px rgba(168,255,0,0.45)' }}
              >
                SESSION COMPLETE
              </h2>

              {summary ? (
                isSummaryV2(summary) ? (
                  <>
                    {/* Card 1: 思考の軌跡 */}
                    <GlassCard variant="cyan" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-3">
                        思考の軌跡
                      </p>
                      <p className="text-sm text-hud-white leading-relaxed italic opacity-90 mb-2">
                        &ldquo;{summary.journey.start_quote}&rdquo;
                      </p>
                      <p className="text-xs text-neon-cyan opacity-50 mb-2 text-center">
                        {summary.journey.shift}
                      </p>
                      <p className="text-sm text-hud-white leading-relaxed italic opacity-90">
                        &ldquo;{summary.journey.end_quote}&rdquo;
                      </p>
                    </GlassCard>

                    {/* Card 2: 気づき */}
                    <GlassCard variant="lime" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-lime opacity-60 mb-3">
                        気づき
                      </p>
                      <p className="text-base text-hud-white leading-relaxed font-medium">
                        {summary.awareness}
                      </p>
                    </GlassCard>

                    {/* Card 3: 次の一歩 */}
                    <GlassCard variant="magenta" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-magenta opacity-60 mb-3">
                        次の一歩
                      </p>
                      <p
                        className="text-sm text-hud-white leading-relaxed font-medium"
                        style={{
                          opacity: summary.next_step.type === 'action' ? 1
                            : summary.next_step.type === 'question' ? 0.85
                            : 0.75,
                        }}
                      >
                        {summary.next_step.content}
                      </p>
                    </GlassCard>
                  </>
                ) : (
                  <>
                    {/* V1 Legacy display */}
                    <GlassCard variant="magenta" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-magenta opacity-60 mb-2">
                        今回の詰まり
                      </p>
                      <p className="text-sm text-hud-white leading-relaxed">
                        {summary.blockage}
                      </p>
                    </GlassCard>

                    <GlassCard variant="cyan" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-60 mb-2">
                        重要論点
                      </p>
                      <ul className="space-y-2">
                        {summary.key_points.map((point, i) => (
                          <li
                            key={i}
                            className="text-sm text-hud-white leading-relaxed flex items-start gap-2"
                          >
                            <span className="text-neon-cyan opacity-50 mt-0.5">
                              {i + 1}.
                            </span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>

                    <GlassCard variant="lime" className="p-4">
                      <p className="text-[10px] tracking-[2px] text-neon-lime opacity-60 mb-2">
                        次の一歩
                      </p>
                      <p className="text-sm text-hud-white leading-relaxed font-medium">
                        {summary.next_step}
                      </p>
                    </GlassCard>
                  </>
                )
              ) : (
                error && (
                  <GlassCard variant="magenta" className="p-4">
                    <p className="text-sm text-neon-magenta">{error}</p>
                  </GlassCard>
                )
              )}

              {/* Session rating */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] tracking-[2px] text-hud-white-dim">
                  このセッションの評価
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRateSession(star)}
                      className="text-2xl cursor-pointer bg-transparent border-0 transition-transform duration-150 active:scale-110"
                      style={{
                        color:
                          star <= sessionRating
                            ? 'var(--neon-lime)'
                            : 'rgba(255,255,255,0.15)',
                        textShadow:
                          star <= sessionRating
                            ? '0 0 10px rgba(168,255,0,0.5)'
                            : 'none',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Back to home */}
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

// Haptic feedback (iOS only)
async function triggerHaptic(style: 'light' | 'medium' | 'heavy') {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const impactMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: impactMap[style] });
  } catch {
    // Haptics not available
  }
}
