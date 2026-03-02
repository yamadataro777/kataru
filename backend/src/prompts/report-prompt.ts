export function buildReportPrompt(transcript: string): string {
  return `あなたは音声トランスクリプトを分析する専門家です。
以下の音声文字起こしを分析し、構造化されたレポートをJSON形式で生成してください。

## トランスクリプト:
${transcript}

## 出力形式 (JSON):
{
  "title": "セッションの内容を端的に表すタイトル（日本語）",
  "summary": "2-3文の要約（日本語）",
  "key_insights": ["重要な洞察や気づきを3-5個（日本語）"],
  "topics": ["議論されたトピックを2-5個（日本語）"],
  "sentiment": {
    "overall": "positive/neutral/negative",
    "score": 0.0-1.0の数値,
    "details": "感情分析の詳細説明（日本語）"
  },
  "action_items": ["具体的なアクションアイテムがあれば（日本語）"],
  "structure": {
    "sections": [
      { "heading": "セクション見出し", "content": "セクション内容の詳細" }
    ]
  }
}

JSONのみを出力してください。マークダウンのコードブロックは使わないでください。`;
}
