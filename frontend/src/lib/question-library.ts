export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
  trigger_types: Array<'silence' | 'stagnation' | 'long_talk' | 'topic_jump'>;
  depth_level: 1 | 2 | 3;
  timing: 'early' | 'mid' | 'late' | 'any';
  interruptiveness: 'low' | 'medium' | 'high';
  suitable_context?: string[];
  incompatible_context?: string[];
}

export type QuestionCategory =
  | 'restart'
  | 'expand'
  | 'compress'
  | 'shift'
  | 'deepen'
  | 'land';

export type Phase = 'expansion' | 'connection' | 'confrontation';

const questions: Question[] = [
  // === restart（再始動）===
  { id: 'rt1', category: 'restart', text: '他には？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'rt2', category: 'restart', text: '続けて', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'rt3', category: 'restart', text: 'で？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'rt4', category: 'restart', text: '一番気になるのは？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'rt5', category: 'restart', text: '何が引っかかってる？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'rt6', category: 'restart', text: '違う話でもいいよ', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },

  // === expand（拡張）===
  { id: 'ex1', category: 'expand', text: 'もう少し続けると？', trigger_types: ['silence'], depth_level: 1, timing: 'early', interruptiveness: 'low' },
  { id: 'ex2', category: 'expand', text: 'まだ言ってないことは？', trigger_types: ['silence'], depth_level: 1, timing: 'early', interruptiveness: 'low' },
  { id: 'ex3', category: 'expand', text: '他に関係してることは？', trigger_types: ['silence'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'ex4', category: 'expand', text: '具体的には？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'ex5', category: 'expand', text: '例えば？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },

  // === compress（圧縮）===
  { id: 'cm1', category: 'compress', text: '一言で言うと？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },
  { id: 'cm2', category: 'compress', text: '一番大事なのは？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },
  { id: 'cm3', category: 'compress', text: '要するに？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },
  { id: 'cm4', category: 'compress', text: '3つに絞ると？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'cm5', category: 'compress', text: '結局どうしたい？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
  { id: 'cm6', category: 'compress', text: '今日の結論は？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
  { id: 'cm7', category: 'compress', text: '問題は1つ？複数？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },

  // === shift（転換）===
  { id: 'sh1', category: 'shift', text: '逆に言うと？', trigger_types: ['stagnation', 'topic_jump'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'sh2', category: 'shift', text: '別の見方をすると？', trigger_types: ['stagnation', 'topic_jump'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'sh3', category: 'shift', text: '誰の目線で話してる？', trigger_types: ['stagnation', 'topic_jump'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'sh4', category: 'shift', text: '本当にそう？', trigger_types: ['stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'sh5', category: 'shift', text: '避けてることは？', trigger_types: ['stagnation'], depth_level: 3, timing: 'late', interruptiveness: 'high' },
  { id: 'sh6', category: 'shift', text: 'さっきの話と繋がる？', trigger_types: ['topic_jump'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },

  // === deepen（深掘り）===
  { id: 'dp1', category: 'deepen', text: 'なんでそう思う？', trigger_types: ['stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'dp2', category: 'deepen', text: 'それって前提は何？', trigger_types: ['stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'dp3', category: 'deepen', text: '事実？解釈？', trigger_types: ['stagnation'], depth_level: 2, timing: 'any', interruptiveness: 'medium' },
  { id: 'dp4', category: 'deepen', text: '本当の問題は？', trigger_types: ['stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'dp5', category: 'deepen', text: 'その原因だけ？', trigger_types: ['stagnation'], depth_level: 3, timing: 'late', interruptiveness: 'high' },

  // === land（着地）===
  { id: 'ln1', category: 'land', text: 'で、どうする？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'late', interruptiveness: 'low' },
  { id: 'ln2', category: 'land', text: '明日何する？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'late', interruptiveness: 'low' },
  { id: 'ln3', category: 'land', text: '最初の一手は？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
  { id: 'ln4', category: 'land', text: '何があれば動ける？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
  { id: 'ln5', category: 'land', text: '誰に相談する？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
];

// === Emotional acceptance nudges ===
const emotionalNudges = [
  'そうだよね',
  'それ、大事な話だね',
  'もう少し聞かせて',
  'うん、続けて',
  'それで？',
];

// === Emotion word dictionary for frontend-only detection ===
const emotionWords: Record<string, 'positive' | 'negative' | 'strong'> = {
  '辛い': 'strong', 'つらい': 'strong', 'しんどい': 'strong',
  '悔しい': 'strong', 'くやしい': 'strong',
  '怖い': 'strong', 'こわい': 'strong',
  '不安': 'strong', '苦しい': 'strong', 'くるしい': 'strong',
  '泣き': 'strong', '涙': 'strong',
  '怒り': 'strong', '腹が立つ': 'strong', 'むかつく': 'strong',
  '悲しい': 'strong', 'かなしい': 'strong',
  '嫌い': 'strong', 'きらい': 'strong',
  '死にたい': 'strong', '消えたい': 'strong',
  '許せない': 'strong', 'ゆるせない': 'strong',
  '嬉しい': 'positive', 'うれしい': 'positive',
  '楽しい': 'positive', 'たのしい': 'positive',
  '感動': 'positive', '感謝': 'positive',
};

export function selectEmotionalNudge(): string {
  return emotionalNudges[Math.floor(Math.random() * emotionalNudges.length)];
}

/**
 * Detect strong emotion in the latest transcript segment.
 * Returns true if 2+ strong emotion words are found in the last 200 chars.
 */
export function detectStrongEmotion(transcript: string): boolean {
  const last200 = transcript.slice(-200);
  let count = 0;
  for (const word of Object.keys(emotionWords)) {
    if (emotionWords[word] === 'strong' && last200.includes(word)) {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
}

/**
 * Detect stagnation in the latest transcript segment.
 * Returns true if filler words appear 3+ times in last 200 chars,
 * or same 10+ char phrase repeats within 500 chars.
 */
export function detectStagnation(transcript: string): boolean {
  const last200 = transcript.slice(-200);
  const fillerWords = ['うーん', 'なんか', 'えっと', 'つまり', 'どうしよう'];
  let fillerCount = 0;
  for (const filler of fillerWords) {
    const matches = last200.split(filler).length - 1;
    fillerCount += matches;
  }
  if (fillerCount >= 3) return true;

  // Check for repeated phrases (10+ chars) within last 500 chars
  const last500 = transcript.slice(-500);
  for (let len = 10; len <= 30; len++) {
    for (let i = 0; i <= last500.length - len; i++) {
      const phrase = last500.substring(i, i + len);
      const firstIndex = last500.indexOf(phrase);
      const secondIndex = last500.indexOf(phrase, firstIndex + len);
      if (secondIndex !== -1) return true;
    }
  }

  return false;
}

/**
 * Lightweight frontend-only context extraction.
 */
export function extractLightContext(transcript: string): {
  informationDensity: 'high' | 'medium' | 'low';
  topicCount: number;
} {
  const last500 = transcript.slice(-500);
  const density = last500.length > 300 ? 'high' : last500.length > 100 ? 'medium' : 'low';

  const sentences = last500.split(/[。！？\n]/).filter(s => s.length > 5);
  const topicCount = Math.min(sentences.length, 10);

  return { informationDensity: density, topicCount };
}

export function getPhase(durationSec: number): Phase {
  if (durationSec < 180) return 'expansion';
  if (durationSec < 420) return 'connection';
  return 'confrontation';
}

/**
 * Score categories based on phase, context, and recent usage.
 */
export function scoreCategories(
  phase: Phase,
  informationDensity: 'high' | 'medium' | 'low',
  topicCount: number,
  recentCategories: string[],
): Record<QuestionCategory, number> {
  const scores: Record<QuestionCategory, number> = {
    restart: 30,
    expand: 30,
    compress: 15,
    shift: 15,
    deepen: 15,
    land: 10,
  };

  if (phase === 'expansion') {
    scores.restart += 20;
    scores.expand += 30;
  } else if (phase === 'connection') {
    scores.compress += 30;
    scores.shift += 20;
    scores.deepen += 15;
  } else {
    scores.compress += 20;
    scores.land += 30;
    scores.shift += 10;
  }

  if (informationDensity === 'low') {
    scores.restart += 20;
    scores.expand += 10;
  }
  if (informationDensity === 'high') {
    scores.compress += 20;
    scores.land += 10;
  }
  if (topicCount >= 3) {
    scores.shift += 15;
  }

  const recent = recentCategories.slice(-2);
  for (const cat of recent) {
    if (cat in scores) {
      scores[cat as QuestionCategory] -= 30;
    }
  }

  return scores;
}

interface SelectContext {
  durationSec: number;
  usedIds: Set<string>;
  usedCategories: string[];
  interventionCount: number;
}

function getTimingBand(durationSec: number): 'early' | 'mid' | 'late' {
  if (durationSec < 120) return 'early';
  if (durationSec < 300) return 'mid';
  return 'late';
}

function getTargetDepth(interventionCount: number): 1 | 2 | 3 {
  if (interventionCount < 2) return 1;
  if (interventionCount < 5) return 2;
  return 3;
}

/** Original selection function (Level 1 — random from library). */
export function selectQuestion(ctx: SelectContext): Question | null {
  const timing = getTimingBand(ctx.durationSec);
  const targetDepth = getTargetDepth(ctx.interventionCount);

  let pool = questions.filter((q) => !ctx.usedIds.has(q.id));
  if (pool.length === 0) return null;

  const timingPool = pool.filter((q) => q.timing === timing || q.timing === 'any');
  if (timingPool.length > 0) pool = timingPool;

  const recentCategories = ctx.usedCategories.slice(-2);
  const categoryPool = pool.filter((q) => !recentCategories.includes(q.category));
  if (categoryPool.length > 0) pool = categoryPool;

  const exactDepth = pool.filter((q) => q.depth_level === targetDepth);
  if (exactDepth.length > 0) {
    pool = exactDepth;
  } else {
    const nearDepth = pool.filter((q) => Math.abs(q.depth_level - targetDepth) <= 1);
    if (nearDepth.length > 0) pool = nearDepth;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Select a question matching a specific trigger type.
 */
export function selectQuestionByTrigger(
  ctx: SelectContext,
  triggerType: 'silence' | 'stagnation' | 'long_talk' | 'topic_jump',
): Question | null {
  const timing = getTimingBand(ctx.durationSec);
  const targetDepth = getTargetDepth(ctx.interventionCount);

  let pool = questions.filter((q) => !ctx.usedIds.has(q.id) && q.trigger_types.includes(triggerType));
  if (pool.length === 0) return null;

  const timingPool = pool.filter((q) => q.timing === timing || q.timing === 'any');
  if (timingPool.length > 0) pool = timingPool;

  const recentCategories = ctx.usedCategories.slice(-2);
  const categoryPool = pool.filter((q) => !recentCategories.includes(q.category));
  if (categoryPool.length > 0) pool = categoryPool;

  const exactDepth = pool.filter((q) => q.depth_level === targetDepth);
  if (exactDepth.length > 0) {
    pool = exactDepth;
  } else {
    const nearDepth = pool.filter((q) => Math.abs(q.depth_level - targetDepth) <= 1);
    if (nearDepth.length > 0) pool = nearDepth;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Select a question from a different category than the current one.
 */
export function selectDifferentQuestion(
  ctx: SelectContext,
  excludeCategory: QuestionCategory,
): Question | null {
  const pool = questions.filter((q) => !ctx.usedIds.has(q.id) && q.category !== excludeCategory);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Level 2 — adaptive selection using category scoring.
 */
export function selectAdaptiveQuestion(ctx: SelectContext & {
  phase: Phase;
  informationDensity: 'high' | 'medium' | 'low';
  topicCount: number;
  isStuck?: boolean;
}): Question | null {
  const targetDepth = ctx.isStuck ? 1 : getTargetDepth(ctx.interventionCount);

  let pool = questions.filter((q) => !ctx.usedIds.has(q.id));
  if (pool.length === 0) return null;

  if (ctx.isStuck) {
    const easyPool = pool.filter(q => q.depth_level === 1);
    if (easyPool.length > 0) pool = easyPool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const scores = scoreCategories(ctx.phase, ctx.informationDensity, ctx.topicCount, ctx.usedCategories);
  const sorted = (Object.entries(scores) as [QuestionCategory, number][])
    .sort((a, b) => b[1] - a[1]);

  for (const [category] of sorted) {
    const catPool = pool.filter(q => q.category === category);
    if (catPool.length === 0) continue;

    const exactDepth = catPool.filter(q => q.depth_level === targetDepth);
    if (exactDepth.length > 0) {
      return exactDepth[Math.floor(Math.random() * exactDepth.length)];
    }
    const nearDepth = catPool.filter(q => Math.abs(q.depth_level - targetDepth) <= 1);
    if (nearDepth.length > 0) {
      return nearDepth[Math.floor(Math.random() * nearDepth.length)];
    }
    return catPool[Math.floor(Math.random() * catPool.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
