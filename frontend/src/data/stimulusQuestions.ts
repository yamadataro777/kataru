type QuestionCategory = 'light' | 'deepening' | 'contradiction' | 'meta';

export interface StimulusQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  depth: number; // 1=軽い連想, 2=深掘り, 3=矛盾・メタ
}

export const stimulusQuestions: StimulusQuestion[] = [
  // depth 1
  { id: 'q1', text: '他には？', category: 'light', depth: 1 },
  { id: 'q2', text: '今、頭の中でいちばん輪郭がないものは？', category: 'light', depth: 1 },
  { id: 'q3', text: 'もう少し続けると？', category: 'light', depth: 1 },
  { id: 'q11', text: 'いま話していて、意外だったことは？', category: 'light', depth: 1 },
  // depth 2
  { id: 'q4', text: 'それは事実・解釈・感情のどれに近い？', category: 'deepening', depth: 2 },
  { id: 'q5', text: '比喩で言うとどんな感じ？', category: 'deepening', depth: 2 },
  { id: 'q6', text: 'それって、いつから感じてる？', category: 'deepening', depth: 2 },
  { id: 'q12', text: 'それを決めなくていいとしたら、どうする？', category: 'deepening', depth: 2 },
  { id: 'q13', text: 'その話、体のどこで感じてる？', category: 'deepening', depth: 2 },
  // depth 3
  { id: 'q7', text: '反対のことを言うなら？', category: 'contradiction', depth: 3 },
  { id: 'q8', text: '本音と建前で分けると？', category: 'contradiction', depth: 3 },
  { id: 'q9', text: 'いま少し避けた話題は？', category: 'meta', depth: 3 },
  { id: 'q10', text: 'その声は誰の価値観っぽい？', category: 'meta', depth: 3 },
  { id: 'q14', text: '今の自分に、半年前の自分は何て言う？', category: 'contradiction', depth: 3 },
  { id: 'q15', text: 'この話を誰にもしなかったら、何が変わる？', category: 'meta', depth: 3 },
];

export const integrationPrompt = '今の自分を一文で表すと？';

/**
 * Select next static question by shown count.
 * First 2 → depth 1, 3-5 → depth 2, 6+ → depth 3.
 */
export function selectNextQuestion(
  shownIds: Set<string>,
  shownCount: number,
): StimulusQuestion | null {
  const targetDepth = shownCount < 2 ? 1 : shownCount < 5 ? 2 : 3;

  const candidates = stimulusQuestions.filter(
    (q) => q.depth === targetDepth && !shownIds.has(q.id),
  );
  if (candidates.length === 0) {
    const fallback = stimulusQuestions.filter((q) => !shownIds.has(q.id));
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
