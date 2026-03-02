import {
  RunningContext,
  ConversationPhase,
  QuestionType,
  ConversationTurn,
  ExtractedFeatures,
} from '../types/conversation';

export function buildExtractionPrompt(transcript: string, runningContext: RunningContext): string {
  return `あなたは対話分析の専門家です。ユーザーの発話を分析し、以下の特徴を抽出してください。

## これまでの対話コンテキスト:
- 目標: ${runningContext.goal || '未検出'}
- 痛み/悩み: ${runningContext.pain || '未検出'}
- 葛藤: ${runningContext.conflict || '未検出'}
- 信念: ${runningContext.belief || '未検出'}
- これまでのトピック: ${runningContext.topics.join('、') || 'なし'}
- 感情の推移: ${runningContext.emotional_tones.join('→') || 'なし'}
- 変化への準備度: ${runningContext.readiness_for_change}
- 自己認識の深さ: ${runningContext.self_awareness_depth}

## ユーザーの発話:
${transcript}

## 出力形式 (JSON):
{
  "goal": "ユーザーが達成したいこと（検出された場合のみ）",
  "pain": "ユーザーの痛みや悩み（検出された場合のみ）",
  "conflict": "内面の葛藤（検出された場合のみ）",
  "belief": "根底にある信念や価値観（検出された場合のみ）",
  "emotional_tone": "この発話の感情トーン",
  "defense_mechanisms": ["検出された防衛機制"],
  "abstraction_level": "abstract/concrete/mixed",
  "topics": ["この発話で言及されたトピック"],
  "readiness_for_change": 0.0から1.0の数値,
  "self_awareness_depth": 0.0から1.0の数値,
  "crisis_signals": ["危機的なシグナルがあれば"],
  "key_phrases": ["重要なフレーズ"],
  "turn_summary": "このターンの内容を1文（30字以内）で要約"
}

前回のコンテキストと比較して、変化や新しい要素に注目してください。
turn_summaryは「〜について話した」「〜を感じていると述べた」のような客観的な要約にしてください。
JSONのみを出力してください。マークダウンのコードブロックは使わないでください。`;
}

const PHASE_INSTRUCTIONS: Record<ConversationPhase, string> = {
  intake: '自由に話してもらう導入フェーズです。「何について話したいですか？」のようなオープンな問いかけをしてください。',
  clarify: '具体的な内容を掘り下げるフェーズです。相手の言葉を反映しながら、詳細を引き出してください。',
  explore: '仮説ベースの探索フェーズです。「もしかして〜ということでしょうか？」のように前提を検証してください。',
  deepen: 'パターンや矛盾を指摘し、より深い層に触れるフェーズです。防衛機制や無意識のパターンに注目してください。',
  identity_design: '自己物語の構築フェーズです。価値観の明確化や「自分はどういう人間か」を一緒に探ってください。',
  synthesis: 'これまでの対話を統合するフェーズです。全体を通じたテーマや気づきを織り合わせてください。',
  action_plan: '具体的な次のステップを一緒に考えるフェーズです。実行可能なアクションプランを提案してください。',
  close: '対話を肯定的に締めくくるフェーズです。相手の勇気や洞察を認め、温かく終了してください。',
};

const QUESTION_TYPE_MODIFIERS: Record<QuestionType, string> = {
  coaching: '直接的でゴール志向のアプローチを使ってください。「成功したらどんな状態ですか？」「何が最初の一歩になりそうですか？」のような問いかけを。',
  psychoanalytic: '内省的でパターン探索のアプローチを使ってください。「〜に気づきましたが…」「それは以前のお話とどうつながりますか？」のような問いかけを。',
  identity: '価値観や自己物語に焦点を当てたアプローチを使ってください。「それはあなたにとって何を意味しますか？」「それはあなたがどんな人かを物語っていますね」のような問いかけを。',
};

export function buildResponsePrompt(params: {
  phase: ConversationPhase;
  questionType: QuestionType;
  runningContext: RunningContext;
  extracted: ExtractedFeatures;
  turnHistory: string[];
}): string {
  const { phase, questionType, runningContext, extracted, turnHistory } = params;

  return `あなたは洞察力のある対話パートナーです。以下の情報をもとに、ユーザーへの次の応答を生成してください。

## 現在のフェーズ: ${phase}
${PHASE_INSTRUCTIONS[phase]}

## 質問タイプ: ${questionType}
${QUESTION_TYPE_MODIFIERS[questionType]}

## 対話のコンテキスト:
- 目標: ${runningContext.goal || '未検出'}
- 痛み/悩み: ${runningContext.pain || '未検出'}
- 葛藤: ${runningContext.conflict || '未検出'}
- 信念: ${runningContext.belief || '未検出'}
- これまでのトピック: ${runningContext.topics.join('、') || 'なし'}

## ユーザーの最新発話から抽出された特徴:
- 感情トーン: ${extracted.emotional_tone}
- 抽象度: ${extracted.abstraction_level}
- トピック: ${extracted.topics.join('、')}
- 変化への準備度: ${extracted.readiness_for_change}
- 自己認識の深さ: ${extracted.self_awareness_depth}
${extracted.defense_mechanisms.length > 0 ? `- 防衛機制: ${extracted.defense_mechanisms.join('、')}` : ''}
${extracted.key_phrases.length > 0 ? `- キーフレーズ: ${extracted.key_phrases.join('、')}` : ''}

## 対話の流れ（ターン要約）:
${runningContext.turn_summaries.length > 0 ? runningContext.turn_summaries.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'なし（最初のやりとり）'}

## 直近の対話:
${turnHistory.length > 0 ? turnHistory.join('\n') : 'なし'}

## 応答のルール:
- 会話的な日本語で、2〜4文で応答してください
- ${phase === 'close' ? '質問で終わらず、温かい締めくくりにしてください' : '最後は質問で終えてください'}
- 相手の言葉を尊重し、共感を示してください
- プレーンテキストで出力してください（JSONではありません）`;
}

export function buildFinalReportPrompt(
  runningContext: RunningContext,
  turns: ConversationTurn[]
): string {
  const turnsSummary = turns
    .map((t) => {
      const speaker = t.user_transcript ? 'ユーザー' : 'AI';
      const content = t.user_transcript || t.ai_response;
      return `[ターン${t.turn_number} / ${t.phase}] ${speaker}: ${content}`;
    })
    .join('\n');

  return `あなたは対話分析の専門家です。以下の対話全体を分析し、包括的なレポートをJSON形式で生成してください。

## 対話の蓄積コンテキスト:
- 目標: ${runningContext.goal || '未検出'}
- 痛み/悩み: ${runningContext.pain || '未検出'}
- 葛藤: ${runningContext.conflict || '未検出'}
- 信念: ${runningContext.belief || '未検出'}
- トピック: ${runningContext.topics.join('、') || 'なし'}
- 感情の推移: ${runningContext.emotional_tones.join('→') || 'なし'}
- 防衛機制: ${runningContext.defense_mechanisms.join('、') || 'なし'}
- キーフレーズ: ${runningContext.key_phrases.join('、') || 'なし'}
- 変化への準備度: ${runningContext.readiness_for_change}
- 自己認識の深さ: ${runningContext.self_awareness_depth}

## 対話全文:
${turnsSummary}

## 出力形式 (JSON):
{
  "title": "この対話を端的に表すタイトル",
  "summary": "対話全体の要約（3-5文）",
  "key_insights": ["対話から得られた重要な洞察を3-5個"],
  "topics": ["議論されたトピック"],
  "emotional_journey": "感情の変遷についての記述",
  "patterns_discovered": ["発見されたパターンや傾向"],
  "identity_narrative": "浮かび上がった自己物語・アイデンティティの記述",
  "action_items": ["具体的なアクションアイテム"],
  "growth_areas": ["成長の可能性がある領域"],
  "structure": {
    "sections": [
      { "heading": "セクション見出し", "content": "セクション内容の詳細" }
    ]
  }
}

JSONのみを出力してください。マークダウンのコードブロックは使わないでください。`;
}
