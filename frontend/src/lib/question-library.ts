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
  | 'diverge_converge'
  | 'emotion'
  | 'priority'
  | 'summary'
  | 'root_cause'
  | 'next_step'
  | 'contradiction'
  | 'topic_connect';

export type Phase = 'expansion' | 'connection' | 'confrontation';

const questions: Question[] = [
  // === diverge_converge (旧 deepening) ===
  { id: 'd1', category: 'diverge_converge', text: '他には？', trigger_types: ['silence', 'stagnation'], depth_level: 1, timing: 'early', interruptiveness: 'low' },
  { id: 'd2', category: 'diverge_converge', text: 'もう少し続けると？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'd3', category: 'diverge_converge', text: 'それって、いつから感じてる？', trigger_types: ['silence', 'stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'd4', category: 'diverge_converge', text: '今、頭の中でいちばん輪郭がないものは？', trigger_types: ['silence'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },

  // === emotion ===
  { id: 'e1', category: 'emotion', text: 'その話、体のどこで感じてる？', trigger_types: ['silence'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'e2', category: 'emotion', text: 'いま話していて、意外だったことは？', trigger_types: ['silence', 'stagnation'], depth_level: 1, timing: 'early', interruptiveness: 'low' },
  { id: 'e3', category: 'emotion', text: 'その感情に名前をつけるとしたら？', trigger_types: ['silence'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'e4', category: 'emotion', text: '今の気持ちを色で表すと？', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'e5', category: 'emotion', text: 'いま一番強い感情は何？', trigger_types: ['silence', 'stagnation'], depth_level: 1, timing: 'any', interruptiveness: 'low' },

  // === priority ===
  { id: 'p1', category: 'priority', text: '一番大事なのはどれ？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },
  { id: 'p2', category: 'priority', text: 'それを決めなくていいとしたら、どうする？', trigger_types: ['silence'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'p3', category: 'priority', text: '今日の話で、一つだけ残すとしたら？', trigger_types: ['silence', 'long_talk'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
  { id: 'p4', category: 'priority', text: '明日の自分に伝えたいことは？', trigger_types: ['silence'], depth_level: 1, timing: 'late', interruptiveness: 'low' },
  { id: 'p5', category: 'priority', text: 'いま一番重いのは、優先順位？それとも不安？', trigger_types: ['silence', 'stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'p6', category: 'priority', text: '問題を1つに絞るならどれ？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },

  // === summary ===
  { id: 's1', category: 'summary', text: 'ここまでを一言で言うと？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'mid', interruptiveness: 'medium' },
  { id: 's2', category: 'summary', text: '今の自分を一文で表すと？', trigger_types: ['silence'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },
  { id: 's3', category: 'summary', text: '今日のテーマは何だった？', trigger_types: ['silence'], depth_level: 1, timing: 'late', interruptiveness: 'low' },
  { id: 's4', category: 'summary', text: 'この話のタイトルをつけるなら？', trigger_types: ['silence'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },

  // === root_cause (旧 causality) ===
  { id: 'c1', category: 'root_cause', text: 'それは事実・解釈・感情のどれに近い？', trigger_types: ['silence', 'stagnation'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'c2', category: 'root_cause', text: 'その原因って、本当にそれだけ？', trigger_types: ['silence'], depth_level: 3, timing: 'mid', interruptiveness: 'high' },
  { id: 'c3', category: 'root_cause', text: 'もしそれがなかったら、何が変わってた？', trigger_types: ['silence'], depth_level: 2, timing: 'any', interruptiveness: 'medium' },
  { id: 'c4', category: 'root_cause', text: 'この話を誰にもしなかったら、何が変わる？', trigger_types: ['silence'], depth_level: 3, timing: 'late', interruptiveness: 'high' },

  // === next_step (旧 action) ===
  { id: 'a1', category: 'next_step', text: '次にできる小さな一歩は？', trigger_types: ['silence', 'long_talk'], depth_level: 1, timing: 'late', interruptiveness: 'low' },
  { id: 'a2', category: 'next_step', text: '理想の状態を10点としたら、今は何点？', trigger_types: ['silence'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'a3', category: 'next_step', text: '何があれば前に進める？', trigger_types: ['silence', 'stagnation'], depth_level: 1, timing: 'late', interruptiveness: 'low' },
  { id: 'a4', category: 'next_step', text: '1週間後、どうなっていたい？', trigger_types: ['silence'], depth_level: 2, timing: 'late', interruptiveness: 'medium' },

  // === contradiction (旧 perspective) ===
  { id: 'v1', category: 'contradiction', text: '反対のことを言うなら？', trigger_types: ['silence', 'stagnation'], depth_level: 3, timing: 'mid', interruptiveness: 'high' },
  { id: 'v2', category: 'contradiction', text: '本音と建前で分けると？', trigger_types: ['silence'], depth_level: 3, timing: 'mid', interruptiveness: 'high' },
  { id: 'v3', category: 'contradiction', text: 'その声は誰の価値観っぽい？', trigger_types: ['silence'], depth_level: 3, timing: 'late', interruptiveness: 'high' },
  { id: 'v4', category: 'contradiction', text: '今の自分に、半年前の自分は何て言う？', trigger_types: ['silence'], depth_level: 3, timing: 'late', interruptiveness: 'high' },

  // === topic_connect (旧 structure) ===
  { id: 'r1', category: 'topic_connect', text: '比喩で言うとどんな感じ？', trigger_types: ['silence'], depth_level: 2, timing: 'any', interruptiveness: 'medium' },
  { id: 'r2', category: 'topic_connect', text: 'いま少し避けた話題は？', trigger_types: ['silence'], depth_level: 3, timing: 'mid', interruptiveness: 'high' },
  { id: 'r3', category: 'topic_connect', text: '今の話と最初の話、繋がってる？', trigger_types: ['silence', 'topic_jump'], depth_level: 2, timing: 'mid', interruptiveness: 'medium' },
  { id: 'r4', category: 'topic_connect', text: 'もう一つの視点から見ると？', trigger_types: ['silence', 'topic_jump'], depth_level: 2, timing: 'any', interruptiveness: 'medium' },

  // === stuck (depth:1, for long silence) ===
  { id: 'st1', category: 'diverge_converge', text: '今、頭に浮かんでいることをそのまま', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
  { id: 'st2', category: 'diverge_converge', text: '違う話題でもいいよ', trigger_types: ['silence'], depth_level: 1, timing: 'any', interruptiveness: 'low' },
];

// === Emotional acceptance nudges ===
const emotionalNudges = [
  'そうだよね',
  'それ、大事な話だね',
  'もう少し聞かせて',
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
    diverge_converge: 40,
    emotion: 20,
    priority: 15,
    summary: 10,
    root_cause: 15,
    next_step: 10,
    contradiction: 15,
    topic_connect: 15,
  };

  if (phase === 'expansion') {
    scores.diverge_converge += 30;
    scores.emotion += 10;
  } else if (phase === 'connection') {
    scores.topic_connect += 30;
    scores.root_cause += 20;
    scores.contradiction += 10;
  } else {
    scores.contradiction += 30;
    scores.root_cause += 20;
    scores.priority += 20;
    scores.summary += 15;
  }

  if (informationDensity === 'low') {
    scores.diverge_converge += 20;
  }
  if (informationDensity === 'high') {
    scores.summary += 20;
    scores.priority += 15;
  }
  if (topicCount >= 3) {
    scores.topic_connect += 15;
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
  let pool = questions.filter((q) => !ctx.usedIds.has(q.id) && q.category !== excludeCategory);
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
