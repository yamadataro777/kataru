export type BrainDumpPhase = 'expansion' | 'connection' | 'confrontation';

export function buildBrainDumpQuestionPrompt(
  transcript: string,
  phase: BrainDumpPhase,
  questionsShown: string[],
): string {
  const last500 = transcript.slice(-500);
  const shownList = questionsShown.length > 0 ? questionsShown.join('、') : 'なし';

  return `あなたは内省を深める問いの専門家です。
ユーザーが声で自分の考えを話しています。リアルタイムの文字起こしを見て、一つだけ問いを返してください。

## 制約:
- 日本語で、15-30文字の問い
- 「はい/いいえ」で答えられる問いは禁止
- 情報を求める問いは禁止（「それはいつですか？」等）
- 思考の運動を促す問いであること
- 褒め言葉禁止
- 前に出した問い: ${shownList} とは異なる問い

## 現在のフェーズ: ${phase}
- expansion: 話を広げる。まだ言っていないことを引き出す
- connection: 話同士のつながりを見つけさせる。パターンを問う
- confrontation: 矛盾や前提を揺さぶる。避けていることを問う

## 文字起こし（最新500文字）:
${last500}

問いだけを出力してください。説明不要。`;
}

export function buildIntegrationQuestionPrompt(transcript: string): string {
  const last1000 = transcript.slice(-1000);

  return `あなたは内省を深める問いの専門家です。
ユーザーが自分の考えを長く話した後、最後にセッション全体を統合する一つの問いを出してください。

## 制約:
- 日本語で、15-35文字の問い
- セッション全体を振り返らせる問い
- 「はい/いいえ」で答えられる問いは禁止
- 褒め言葉禁止

## 文字起こし（最新1000文字）:
${last1000}

問いだけを出力してください。説明不要。`;
}
