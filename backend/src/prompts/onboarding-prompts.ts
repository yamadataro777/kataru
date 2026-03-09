export type OnboardingType = 'thinking' | 'goal' | 'emotion';

export function buildOnboardingThinkingPrompt(transcript: string): string {
  return `あなたは思考分析のエキスパートです。ユーザーが「頭の中にあること」を自由に話した音声の文字起こしを分析してください。

## 分析対象の文字起こし:
${transcript}

## 出力ルール:
- JSON形式のみ出力（マークダウン記法は禁止）
- 日本語で出力
- ユーザーの発言を具体的に引用・参照すること
- 一般論や抽象的な表現は禁止
- titleは7文字以内

## 出力JSON:
{
  "title": "7文字以内のタイトル",
  "thinking_map": {
    "surface": "表面的に話していたこと（1文、具体的に）",
    "underlying": "その裏にある本当の関心事（1文、発言から推測）",
    "connection": "本人が気づいていない繋がり（1文、洞察的に）"
  },
  "clarity_score": 0.0から1.0の数値,
  "one_question": "この思考をさらに深める1つの問い"
}`;
}

export function buildOnboardingGoalPrompt(transcript: string): string {
  return `あなたは目標分析のエキスパートです。ユーザーが「叶えたいこと」について話した音声の文字起こしを分析してください。

## 分析対象の文字起こし:
${transcript}

## 出力ルール:
- JSON形式のみ出力（マークダウン記法は禁止）
- 日本語で出力
- ユーザーの発言を具体的に引用・参照すること
- 一般論や抽象的な表現は禁止
- stated_goalはユーザーの言葉をそのまま引用
- first_stepは「明日できる」レベルの具体性
- titleは7文字以内

## 出力JSON:
{
  "title": "7文字以内のタイトル",
  "stated_goal": "ユーザーが言葉にした目標（発言を引用）",
  "real_desire": "その言葉の裏にある本当の欲求（1文）",
  "first_step": "明日できる最初の一歩（具体的に1つ）",
  "hidden_fear": "この目標を阻んでいるかもしれない恐れ（1文）",
  "reframe": "この目標を別の角度から見た言い換え（1文）"
}`;
}

export function buildOnboardingEmotionPrompt(transcript: string): string {
  return `あなたは感情分析のエキスパートです。ユーザーが「最近心が動いた瞬間」について話した音声の文字起こしを分析してください。

## 分析対象の文字起こし:
${transcript}

## 出力ルール:
- JSON形式のみ出力（マークダウン記法は禁止）
- 日本語で出力
- ユーザーの発言を具体的に引用・参照すること
- 一般論や抽象的な表現は禁止
- emotions_detectedは2〜4個
- primary_emotionは1語
- titleは7文字以内

## 出力JSON:
{
  "title": "7文字以内のタイトル",
  "emotions_detected": ["感情を2〜4個"],
  "primary_emotion": "最も強い感情（1語）",
  "emotion_source": "その感情の源（1文、発言を引用）",
  "pattern": "繰り返されている可能性があるパターン（1文）",
  "self_understanding": "この感情が教えてくれること（1文）"
}`;
}
