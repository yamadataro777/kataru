# v2 ストレステスト改善仕様書

## 1. 問題診断: 既存実装の棚卸し

### 実装済み（変更不要）

以下はすべて `conversation.ts`, `coaching.ts`, `sectionValidator.ts`, `coaching-prompts.ts` に実装済み:

- `transcript_normalization_confidence`, `normalized_terms`, `needs_user_confirmation_for_term`
- `recovery_subpath` ('regress' | 'light_commit' | 'commit')
- `negative_delta_occurred`, `delta_recovered_to_nonnegative`, `soft_complete`, `requires_priority_followup`
- `medical_safety_severity`, `stage4_shortened_for_safety`
- `review_axis_types`, `review_axis_quality_score`
- `closing_summary_style` ('fast' | 'standard' | 'recovery_light_commit' | 'safety_shortened')
- Recovery subpath 自動導出ロジック
- Negative delta 追跡・soft_complete 強制
- Medical safety severity 検出
- Review axes 検証
- Stage 4 prompt に 6a〜6f セクション全て実装済み

### 今回の変更（ギャップ修正）

| # | ギャップ | 修正内容 |
|---|---------|---------|
| G1 | `theory_drift_guard_triggered` フィールドが未定義 | `UtteranceAnalysis` に追加 |
| G2 | `comparison_reframe` が NegativeDeltaResponseType にない | 型に追加 |
| G3 | Theory drift guard 指示が全プロンプトに未搭載 | `ABSOLUTE_PROHIBITIONS` に追加 |
| G4 | Validator: negative_delta + delta < 0 で soft_complete 未設定時のセーフティネットなし | `checkSection4` に追加 |
| G5 | Validator: recovery_light_commit 時の short check-in 検証なし | `checkSection4` に追加 |
| G6 | Session-specific 学びがプロンプトに未反映 | **既に実装済み** (6e セクション) |
| G7 | Transcript normalization の 1-question-per-turn ガード | **既に実装済み** (6a セクション) |

---

## 2. Revised Schema（差分）

### `NegativeDeltaResponseType`（conversation.ts / coaching.ts）

```typescript
// Before:
export type NegativeDeltaResponseType = 'quantity_reduce' | 'wording_lighten' | 'timeframe_extend_or_environment_shift' | null;

// After:
export type NegativeDeltaResponseType = 'quantity_reduce' | 'wording_lighten' | 'timeframe_extend_or_environment_shift' | 'comparison_reframe' | null;
```

### `UtteranceAnalysis`（conversation.ts）

```typescript
// 追加フィールド:
theory_drift_guard_triggered?: boolean;
```

---

## 3. Revised Validator Rules（差分）

### `checkSection4` — sectionValidator.ts

#### G4: Negative Delta セーフティネット

`soft_complete === true` の早期リターン後、通常パスに到達した場合:

```typescript
if (
  data.negative_delta_occurred === true &&
  data.self_efficacy_delta != null &&
  data.self_efficacy_delta < 0
) {
  reasons.push('negative_delta が未回復のまま soft_complete が設定されていない');
}
```

**目的**: coaching.ts の 5c で soft_complete を自動設定する処理があるが、LLM が `negative_delta_occurred: true` を返しつつ coaching.ts の自動処理をすり抜けた場合のセーフティネット。

#### G5: Recovery Light Commit の Short Check-in 検証

```typescript
if (data.recovery_subpath === 'light_commit' && data.next_check_in_point) {
  const hasShortCheckIn = /(?:24|48|72|明日|明後日|\dh)/.test(data.next_check_in_point);
  if (!hasShortCheckIn) {
    reasons.push('recovery_light_commit 時は 24-72h の短い check-in が必要');
  }
}
```

**目的**: `recovery_light_commit` パスでは 24-72h の短い check-in が必須。「来週」「1ヶ月後」などの長い check-in を防止。

---

## 4. Transcript Normalization Policy（全文）

> ※ 既に 6a セクションに実装済み。以下は参照用。

```
===== 6a. Transcript Normalization ポリシー =====
音声認識の誤変換を検出・正規化する:
- ユーザー発話に音声認識誤りの疑いがある語がある場合、
  normalized_terms に { original, normalized, confidence } を出力
- confidence 0.8 以上の場合は自動正規化（ユーザー確認不要）
- confidence 0.5-0.8 かつ安全/行動/目標に影響する語 →
  needs_user_confirmation_for_term に格納
- confidence 0.5 未満は無視
- transcript_normalization_confidence: 発話全体の正規化信頼度（0-1）
- 1-question-per-turn ルール遵守: 確認が必要な場合も、
  その確認を質問としてカウントする
- 些末な誤変換（意味に影響しない）は無視してよい
```

---

## 5. Theory Discussion Mode（理論ディスカッションモード）

> **方針転換**: Theory Drift Guard（理論議論禁止）を撤廃し、逆方向の Theory Discussion Mode に変更。
> ユーザーが理論語を使ったら、ゴール設定を忘れて最大10ターン議論に集中 → その後、概念をゴールに活かす議論へ移行。

### 発動条件
- **Stage 1 のみ**で発動
- LLM が `utterance_analysis.theory_topic_detected` に概念名を出力した時点でアクティブ化
- 一度完了（10ターン）した後は再発動しない

### ライフサイクル
1. **Entry**: `theory_topic_detected` が非null → `theory_mode_active = true`, `theory_mode_turn_count = 1`
2. **Pure discussion phase** (ターン 1-8): 理論議論に集中。`can_advance = false` 強制
3. **Bridge phase** (ターン 9-10): 「この概念をあなたの状況にどう活かすか」に移行
4. **Exit**: 10ターン到達 → `theory_mode_active = false`, `theory_mode_completed = true`

### Effective turn count
- Theory mode 中のターンは Stage 1 の通常ターンカウントから除外
- 7ターン強制収束がtheory mode中に発動しないようにする

### ランタイム動作

`coaching.ts` の `mergeUtteranceAnalysisIntoRc` で `theory_topic_detected` を running_context に伝播:

```typescript
if (ua.theory_topic_detected) {
  rc['theory_topic_detected'] = ua.theory_topic_detected;
}
```

---

## 6. Stage 4 Prompt 6c セクション改稿（差分ハイライト）

変更箇所のみ:

```diff
 原因分類 → 対応する response_type:
 ...
-5. "comparison_spiral"（他者比較で自信喪失）→ "wording_lighten"
+5. "comparison_spiral"（他者比較で自信喪失）→ "comparison_reframe"
    → 「あの人と同じ」ではなく「昨日の自分より」のフレームへ
```

JSON スキーマも更新:

```diff
-"negative_delta_response_type": <"quantity_reduce"|"wording_lighten"|"timeframe_extend_or_environment_shift"|null>,
+"negative_delta_response_type": <"quantity_reduce"|"wording_lighten"|"timeframe_extend_or_environment_shift"|"comparison_reframe"|null>,
```

---

## 7. パス別サンプル会話

### Fast パス（efficacy 9, resistance 低）

```
[Turn 1] AI: 「週3回のランニング」に自信を10点満点で言うと？
[Turn 2] User: 9ですね。天気次第かなくらい。
         AI: 高い自信ですね。唯一、気がかりなことがあるとすれば？
[Turn 3] User: 雨の日くらいかな。
         AI: 雨の日は室内ストレッチに切り替えるのも手ですね。「週3回走る」を
             やり切れたら、自分の中で何に対して胸を張れますか？
[Turn 4] User: 体力に自信が持てること。やると決めたことをやれる自分。
         AI: commitment: 「週3回走る。雨なら室内ストレッチ」
             最終 efficacy は？
         User: 9。
         AI: 【Closing】
             今週やること: 月・水・金にランニング。雨天→室内ストレッチ
             振り返り: 日曜夜に「何回走れたか」チェック
             review_axes: [execution_check, goal_approach]
             closing_summary_style: "fast"
```

### Standard パス（efficacy 6, resistance あり）

```
[Turn 1] AI: 「毎朝30分の英語学習」に自信を10点満点で？
[Turn 2] User: 6かな。朝が弱くて。
         AI: 朝が苦手なんですね。一番ネックになりそうな場面は？
[Turn 3] User: 目覚ましが鳴っても起きれない日がある。
         AI: 「起きれない」のは意志の弱さじゃなく、睡眠負債かもしれませんね。
             「毎朝」→「週3回、起きれた朝だけ」に緩めてみるのはどうですか？
             （resistance_reframe: 完璧主義→70%でOK）
[Turn 4] AI: この英語学習を続けた先で、自分の中で何が変わると思いますか？
         User: 海外の記事を辞書なしで読める自分になれる。
              （identity_prompt_type: "clarity"）
[Turn 5] AI: 「週3回、起きれた朝に30分英語をやる」——これを自分の言葉で宣言すると？
         User: 起きれた朝に、コーヒー飲みながら30分英語やる。
[Turn 6] AI: 今の自信を10点満点で？
         User: 7。
         AI: 【Closing】
             今日の核心: 「毎朝」→「起きれた朝だけ」
             今週やること: 起きれた朝にコーヒー+英語30分
             振り返り: 金曜夜に「今週何回やれたか」チェック
             commitment: 「起きれた朝に、コーヒー飲みながら30分英語やる」
             closing_summary_style: "standard"
```

### Recovery Light Commit パス（efficacy 4, 行動縮小）

```
[Turn 1] AI: 「毎日の家計簿記録」に自信を10点満点で？
[Turn 2] User: 4。面倒で続かない気がする。
         AI: 「面倒」の正体、何に一番面倒さを感じますか？
             （recovery_subpath: "light_commit" 暫定）
[Turn 3] AI: レシートを写真に撮るだけ → 週末にまとめて入力、にしたらどうですか？
         User: それならまだマシかも。
[Turn 4] AI: 今の自信は？
         User: 5。
         AI: 【Closing — recovery_light_commit】
             まずレシートを撮るだけ、週末にまとめて入力
             明後日の夜に「レシート何枚溜まったか」だけチェック
             うまくいかなくても、それも情報です
             next_check_in_point: "48h後"
             closing_summary_style: "recovery_light_commit"
```

### Safety Shortened パス（severe — アルコール+身体症状）

```
[Turn 1] AI: 「週2回の断酒日」に自信を10点満点で？
[Turn 2] User: 3。飲まないと手が震えるし頭痛もひどい。
         AI: 身体症状が出ているんですね。まず今週、1日だけ「飲む量を半分にする」日を
             作るのはどうですか？
             （medical_safety_severity: "severe", stage4_shortened_for_safety: true）
[Turn 3] User: 半分なら...木曜日ならできるかも。
         AI: 【Closing — safety_shortened】
             今週やること: 木曜日だけ、飲む量を半分に
             アルコールと身体症状については、内科や依存症外来への相談も選択肢です
             48h後に「木曜日どうだったか」だけ振り返り
             closing_summary_style: "safety_shortened"
```

---

## 8. 既存実装への差分メモ

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/types/conversation.ts` | `NegativeDeltaResponseType` に `'comparison_reframe'` 追加、`UtteranceAnalysis` に `theory_topic_detected` 追加、`CoachingContext` に theory mode フィールド追加 |
| `frontend/src/types/coaching.ts` | バックエンド型のミラー（同上） |
| `backend/src/services/sectionValidator.ts` | `checkSection4` に G4（negative delta safety net）+ G5（light_commit check-in 検証）追加 |
| `backend/src/prompts/coaching-prompts.ts` | Theory Drift Guard 撤廃 → Theory Discussion Mode 指示追加、`theory_topic_detected` を utterance analysis に追加、`buildTheoryModeInstruction` ヘルパー新設 |
| `backend/src/services/coaching.ts` | Theory Discussion Mode ライフサイクル追加（検出・ターンカウント・effective turn count・can_advance override） |

### 変更の規模

- コード変更: 5ファイル、約50行の追加/修正（小規模）
- 新規ドキュメント: 本ファイル（`v2-improvement-spec.md`）
- 破壊的変更: なし（全てオプショナルフィールドの追加 or 列挙型の拡張）

### 既存テスト・動作への影響

- `comparison_reframe` 追加: 既存の `wording_lighten` を使うケースはそのまま動作。`comparison_spiral` 原因の場合のみ新しい response_type が使われる
- `theory_drift_guard_triggered`: オプショナルフィールド。LLM が返さなければ無視される
- G4 safety net: 既に coaching.ts の 5c で自動処理されるため、通常は validator まで到達しない。LLM が不整合なデータを返した場合のフォールバック
- G5 check-in 検証: `recovery_light_commit` パスのみ発動。正規表現 `/(?:24|48|72|明日|明後日|\dh)/` でマッチ
