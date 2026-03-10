export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
  triggerAffinity: 'silence';
  depth: 1 | 2 | 3;
  timing: 'early' | 'mid' | 'late' | 'any';
}

export type QuestionCategory =
  | 'deepening'
  | 'emotion'
  | 'priority'
  | 'summary'
  | 'causality'
  | 'action'
  | 'perspective'
  | 'structure';

export type Phase = 'expansion' | 'connection' | 'confrontation';

const questions: Question[] = [
  // === deepening ===
  { id: 'd1', category: 'deepening', text: '他には？', triggerAffinity: 'silence', depth: 1, timing: 'early' },
  { id: 'd2', category: 'deepening', text: 'もう少し続けると？', triggerAffinity: 'silence', depth: 1, timing: 'any' },
  { id: 'd3', category: 'deepening', text: 'それって、いつから感じてる？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'd4', category: 'deepening', text: '今、頭の中でいちばん輪郭がないものは？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },

  // === emotion ===
  { id: 'e1', category: 'emotion', text: 'その話、体のどこで感じてる？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'e2', category: 'emotion', text: 'いま話していて、意外だったことは？', triggerAffinity: 'silence', depth: 1, timing: 'early' },
  { id: 'e3', category: 'emotion', text: 'その感情に名前をつけるとしたら？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'e4', category: 'emotion', text: '今の気持ちを色で表すと？', triggerAffinity: 'silence', depth: 1, timing: 'any' },

  // === priority ===
  { id: 'p1', category: 'priority', text: '一番大事なのはどれ？', triggerAffinity: 'silence', depth: 1, timing: 'mid' },
  { id: 'p2', category: 'priority', text: 'それを決めなくていいとしたら、どうする？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'p3', category: 'priority', text: '今日の話で、一つだけ残すとしたら？', triggerAffinity: 'silence', depth: 2, timing: 'late' },
  { id: 'p4', category: 'priority', text: '明日の自分に伝えたいことは？', triggerAffinity: 'silence', depth: 1, timing: 'late' },

  // === summary ===
  { id: 's1', category: 'summary', text: 'ここまでを一言でまとめると？', triggerAffinity: 'silence', depth: 1, timing: 'mid' },
  { id: 's2', category: 'summary', text: '今の自分を一文で表すと？', triggerAffinity: 'silence', depth: 2, timing: 'late' },
  { id: 's3', category: 'summary', text: '今日のテーマは何だった？', triggerAffinity: 'silence', depth: 1, timing: 'late' },
  { id: 's4', category: 'summary', text: 'この話のタイトルをつけるなら？', triggerAffinity: 'silence', depth: 2, timing: 'late' },

  // === causality ===
  { id: 'c1', category: 'causality', text: 'それは事実・解釈・感情のどれに近い？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'c2', category: 'causality', text: 'その原因って、本当にそれだけ？', triggerAffinity: 'silence', depth: 3, timing: 'mid' },
  { id: 'c3', category: 'causality', text: 'もしそれがなかったら、何が変わってた？', triggerAffinity: 'silence', depth: 2, timing: 'any' },
  { id: 'c4', category: 'causality', text: 'この話を誰にもしなかったら、何が変わる？', triggerAffinity: 'silence', depth: 3, timing: 'late' },

  // === action ===
  { id: 'a1', category: 'action', text: '次にできる小さな一歩は？', triggerAffinity: 'silence', depth: 1, timing: 'late' },
  { id: 'a2', category: 'action', text: '理想の状態を10点としたら、今は何点？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'a3', category: 'action', text: '何があれば前に進める？', triggerAffinity: 'silence', depth: 1, timing: 'late' },
  { id: 'a4', category: 'action', text: '1週間後、どうなっていたい？', triggerAffinity: 'silence', depth: 2, timing: 'late' },

  // === perspective ===
  { id: 'v1', category: 'perspective', text: '反対のことを言うなら？', triggerAffinity: 'silence', depth: 3, timing: 'mid' },
  { id: 'v2', category: 'perspective', text: '本音と建前で分けると？', triggerAffinity: 'silence', depth: 3, timing: 'mid' },
  { id: 'v3', category: 'perspective', text: 'その声は誰の価値観っぽい？', triggerAffinity: 'silence', depth: 3, timing: 'late' },
  { id: 'v4', category: 'perspective', text: '今の自分に、半年前の自分は何て言う？', triggerAffinity: 'silence', depth: 3, timing: 'late' },

  // === structure ===
  { id: 'r1', category: 'structure', text: '比喩で言うとどんな感じ？', triggerAffinity: 'silence', depth: 2, timing: 'any' },
  { id: 'r2', category: 'structure', text: 'いま少し避けた話題は？', triggerAffinity: 'silence', depth: 3, timing: 'mid' },
  { id: 'r3', category: 'structure', text: 'さっきの話と、今の話はつながってる？', triggerAffinity: 'silence', depth: 2, timing: 'mid' },
  { id: 'r4', category: 'structure', text: 'もう一つの視点から見ると？', triggerAffinity: 'silence', depth: 2, timing: 'any' },

  // === stuck (depth:1, for 15s+ silence) ===
  { id: 'st1', category: 'deepening', text: '今、頭に浮かんでいることをそのまま', triggerAffinity: 'silence', depth: 1, timing: 'any' },
  { id: 'st2', category: 'deepening', text: '違う話題でもいいよ', triggerAffinity: 'silence', depth: 1, timing: 'any' },
];

// === Nudge texts (depth:0 equivalent, 4-7s silence) ===
const nudges = [
  'うんうん',
  'それで？',
  '続けて',
  'ふむふむ',
  'なるほど',
];

// === Emotional acceptance nudges ===
const emotionalNudges = [
  'そうだよね',
  'それ、大事な話だね',
  'もう少し聞かせて',
];

// === Emotion word dictionary for frontend-only detection ===
const emotionWords: Record<string, 'positive' | 'negative' | 'strong'> = {
  // Strong emotions (trigger acceptance nudge)
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

export function selectNudge(): string {
  return nudges[Math.floor(Math.random() * nudges.length)];
}

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
 * Lightweight frontend-only context extraction.
 */
export function extractLightContext(transcript: string): {
  informationDensity: 'high' | 'medium' | 'low';
  topicCount: number;
} {
  const last500 = transcript.slice(-500);
  const density = last500.length > 300 ? 'high' : last500.length > 100 ? 'medium' : 'low';

  // Simple topic counting: count unique sentence-ending patterns as proxy for topic shifts
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
    deepening: 40,
    emotion: 20,
    priority: 15,
    summary: 10,
    causality: 15,
    action: 10,
    perspective: 15,
    structure: 15,
  };

  // Phase boost
  if (phase === 'expansion') {
    scores.deepening += 30;
    scores.emotion += 10;
  } else if (phase === 'connection') {
    scores.structure += 30;
    scores.causality += 20;
    scores.perspective += 10;
  } else {
    scores.perspective += 30;
    scores.causality += 20;
    scores.priority += 20;
    scores.summary += 15;
  }

  // Context adjustments
  if (informationDensity === 'low') {
    scores.deepening += 20;
  }
  if (informationDensity === 'high') {
    scores.summary += 20;
    scores.priority += 15;
  }
  if (topicCount >= 3) {
    scores.structure += 15;
  }

  // Recent category avoidance
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

  const exactDepth = pool.filter((q) => q.depth === targetDepth);
  if (exactDepth.length > 0) {
    pool = exactDepth;
  } else {
    const nearDepth = pool.filter((q) => Math.abs(q.depth - targetDepth) <= 1);
    if (nearDepth.length > 0) pool = nearDepth;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Level 2 — adaptive selection using category scoring.
 * Picks the best category via scoring, then selects a question from that category.
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

  // If stuck (15s+), prefer easy depth:1 questions
  if (ctx.isStuck) {
    const easyPool = pool.filter(q => q.depth === 1);
    if (easyPool.length > 0) pool = easyPool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Score categories and pick top category
  const scores = scoreCategories(ctx.phase, ctx.informationDensity, ctx.topicCount, ctx.usedCategories);
  const sorted = (Object.entries(scores) as [QuestionCategory, number][])
    .sort((a, b) => b[1] - a[1]);

  // Try each category in score order until we find a matching question
  for (const [category] of sorted) {
    const catPool = pool.filter(q => q.category === category);
    if (catPool.length === 0) continue;

    // Depth preference
    const exactDepth = catPool.filter(q => q.depth === targetDepth);
    if (exactDepth.length > 0) {
      return exactDepth[Math.floor(Math.random() * exactDepth.length)];
    }
    const nearDepth = catPool.filter(q => Math.abs(q.depth - targetDepth) <= 1);
    if (nearDepth.length > 0) {
      return nearDepth[Math.floor(Math.random() * nearDepth.length)];
    }
    return catPool[Math.floor(Math.random() * catPool.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
