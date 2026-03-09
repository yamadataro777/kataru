export function buildBrainDumpQuestionPrompt(
  transcript: string,
  previousQuestions: string[],
  elapsedSeconds: number,
): string {
  const phase =
    elapsedSeconds < 120
      ? '拡張フェーズ（まだ序盤）: ユーザーがまだ触れていない関連トピックや具体例を引き出す質問'
      : elapsedSeconds < 240
        ? '接続・感情フェーズ（中盤）: 発言同士の関係性、感情の深掘り、「なぜそう思うか」を問う質問'
        : '矛盾・盲点フェーズ（後半）: 発言内の矛盾、避けている話題、メタ認知を促す質問';

  const prevList =
    previousQuestions.length > 0
      ? `\n既に出した質問（重複禁止）:\n${previousQuestions.map((q) => `- ${q}`).join('\n')}`
      : '';

  return `あなたはbrain dumpセッションのAIファシリテーターです。
ユーザーが沈黙しています。以下の文字起こしに基づき、思考を再開させる質問を1つだけ生成してください。

## ルール
- 15〜25文字の日本語で、質問文のみを出力（説明・前置き不要）
- ユーザーが実際に話した内容を参照すること（「他には？」「どう思う？」等の汎用質問は禁止）
- 現在のフェーズ: ${phase}
- 「あ、確かに」とユーザーが思わず声に出すような、鋭い問いを目指す${prevList}

## 文字起こし
${transcript}

質問:`;
}

export function buildIntegrationQuestionPrompt(transcript: string): string {
  return `あなたはbrain dumpセッションのAIファシリテーターです。
ユーザーが録音を終了しようとしています。セッション全体を統合する締めの質問を1つだけ生成してください。

## ルール
- 15〜25文字の日本語で、質問文のみを出力（説明・前置き不要）
- セッション全体の核心を突く統合的な質問にすること
- ユーザーの発言内容を踏まえたパーソナライズされた問い

## 文字起こし
${transcript}

質問:`;
}
