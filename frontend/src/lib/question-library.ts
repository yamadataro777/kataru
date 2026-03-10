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
];

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

export function selectQuestion(ctx: SelectContext): Question | null {
  const timing = getTimingBand(ctx.durationSec);
  const targetDepth = getTargetDepth(ctx.interventionCount);

  // Step 1: Exclude already used
  let pool = questions.filter((q) => !ctx.usedIds.has(q.id));
  if (pool.length === 0) return null;

  // Step 2: Filter by timing (match or 'any')
  const timingPool = pool.filter((q) => q.timing === timing || q.timing === 'any');
  if (timingPool.length > 0) pool = timingPool;

  // Step 3: Avoid recently used categories (last 2)
  const recentCategories = ctx.usedCategories.slice(-2);
  const categoryPool = pool.filter((q) => !recentCategories.includes(q.category));
  if (categoryPool.length > 0) pool = categoryPool;

  // Step 4: Prefer target depth, but allow ±1
  const exactDepth = pool.filter((q) => q.depth === targetDepth);
  if (exactDepth.length > 0) {
    pool = exactDepth;
  } else {
    const nearDepth = pool.filter((q) => Math.abs(q.depth - targetDepth) <= 1);
    if (nearDepth.length > 0) pool = nearDepth;
  }

  // Step 5: Random pick
  return pool[Math.floor(Math.random() * pool.length)];
}
