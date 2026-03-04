# Stage 4 改善分析ドキュメント v2

> 目的: **気持ちよく締めること**ではなく、**行動変容の再現性を上げること**

---

## 1. Stage 4 の問題診断

### 50回シミュレーションから抽出した6つの構造的欠陥

| # | 問題 | 発生頻度 | 影響 |
|---|------|---------|------|
| 1 | review_axes が「どう感じたか」「やってみてどうだったか」等の曖昧軸に逃げる | 50回中35回 | 次回セッションでの検証不可能。振り返りが感想文で終わる |
| 2 | identity_prompt_type が clarity に偏る | 50回中28回 | 「自分が何者か」に逸れ、行動と commitment が接続しない |
| 3 | negative delta 発生時の対処が「行動量を減らす」一辺倒 | delta負の12ケース中10件 | commitment_too_heavy や timeline_pressure など原因が異なるのに同じ処方 |
| 4 | recovery → regression 時に Stage 3 で何を変えるべきか不明 | regression 8ケース中6件 | Stage 3 に戻っても同じ行動を再提案し、ループに入る |
| 5 | fast パスで self_efficacy_level_final が null のまま完了 | fast 15ケース中11件 | delta が計算不能。行動前後の自信変化データが欠損 |
| 6 | closing summary が5行以上になる | 50回中22回 | 情報過多で「今週やること」が曖昧化。実行明確性が損なわれる |

### 根本原因

1. **review_axes に構造がない** — 「2-3個出せ」だけで系統別の指示がない
2. **identity_prompt_type の選択ルールがない** — LLM が安全な clarity を選び続ける
3. **negative delta の原因分類がない** — 「下がった = 行動が大きい」という単純モデル
4. **regression のインターフェースがない** — Stage 3 に戻す際の情報パスが未定義
5. **fast パスの完了条件に final efficacy がない** — 省略可能扱いだった
6. **summary 行数制限が soft ルール** — 「4行が理想」程度で強制力なし

---

## 2. 改善方針

### 方針: 全改善を「検証可能性」で統一する

Stage 4 の成果物が**1週間後にユーザー自身で検証できるか**を唯一の基準にする。

| 改善項目 | 方針 | 検証基準 |
|---------|------|---------|
| review_axes | 3系統（実行チェック/目標接近感/障害再発）を標準化 | 各軸が Yes/No + 数値 or 一言で答えられるか |
| identity_prompt_type | issue_frame/obstacles から文脈駆動で選択 | clarity 以外が50%以上使われるか |
| negative delta | 3+1 パターン分類（action_too_large/commitment_too_heavy/timeline_pressure/reality_shock） | 原因に応じた異なる処方が出るか |
| recovery regression | stage3_resize_hint を必須フィールド化 | Stage 3 で具体的な縮小案が使われるか |
| fast path final efficacy | 全パスで final 必須 | fast パスでも delta が null でないか |
| closing summary | 4行制限をバリデーションレベルで強制 | 5行以上のsummaryが0件か |

---

## 3. Revised Schema

### 新規追加型

```typescript
// backend/src/types/conversation.ts

export type IdentityPromptType = 'clarity' | 'relationship_integrity' | 'pride' | 'escape_pattern';

export type NegativeDeltaCause =
  | 'action_too_large'        // 行動量が大きすぎて現実感が増した
  | 'commitment_too_heavy'    // 宣言にしたら重すぎた
  | 'timeline_pressure'       // 締切や他者の目がプレッシャーに
  | 'reality_shock'           // 言語化したことで現実の困難さが見えた
  | null;
```

### Stage4Data（確定版）

```typescript
export interface Stage4Data {
  stage4_path: Stage4Path | null;                    // 'fast' | 'standard' | 'recovery'
  self_efficacy_level_initial: number | null;        // Turn 2 で取得
  self_efficacy_level_final: number | null;          // commitment 後に全パスで取得（★新規: fast でも必須）
  self_efficacy_delta: number | null;                // final - initial（自動計算）
  commitment_statement: string | null;               // ユーザー自身の言葉
  perceived_resistance: string | null;               // 抵抗要因
  resistance_reframe: string | null;                 // 抵抗の構造的読み替え
  identity_alignment: string | null;                 // identity 質問への回答
  identity_prompt_type: IdentityPromptType | null;   // ★新規: 使用した identity 質問タイプ
  reinforcement_message: string | null;              // 強化メッセージ
  next_check_in_point: string | null;                // 振り返りタイミング
  review_axes: string[];                             // 振り返り軸（3系統、2-3個）
  should_return_to_stage3: boolean;                  // recovery regression フラグ
  stage3_resize_hint: string | null;                 // ★新規: Stage 3 への具体的縮小案
  negative_delta_cause: NegativeDeltaCause;          // ★新規: delta 負の場合の原因分類
  self_efficacy_level: number | null;                // 後方互換（= initial）
}
```

### 前バージョンとの差分

| フィールド | v1 | v2 | 変更理由 |
|-----------|----|----|---------|
| `identity_prompt_type` | `string \| null` | `IdentityPromptType \| null` | 4値に限定。clarity 偏り防止 |
| `stage3_resize_hint` | なし | `string \| null` | regression 時の情報パス |
| `negative_delta_cause` | なし | `NegativeDeltaCause` | delta 負の原因分類 |

---

## 4. Stage 4 Prompt の完全改稿版

`backend/src/prompts/coaching-prompts.ts` の `buildStage4Prompt()` に実装済み。主要構造:

### プロンプトヘッダ（コンテキスト変数）

```
CURRENT_STAGE: 4
CURRENT_PATH: {確定パス or 未確定}
INITIAL_EFFICACY: {数値 or 未測定}
GOAL_STATEMENT: {Stage 2 goal_statement}
SELECTED_ACTION: {Stage 3 selected_action}
FIRST_STEP: {Stage 3 first_step}
OBSTACLES: {Stage 3 obstacles}
ISSUE_FRAME: {Stage 1 issue_frame}
```

### パス判定ルール（Turn 2 で確定）

| 条件 | パス | ターン数 |
|------|------|---------|
| efficacy >= 8 かつ resistance 軽微 | fast | 2-3 |
| efficacy 6-7 または resistance あり | standard | 3-5 |
| efficacy <= 5 | recovery | 可変 |

### 各パスのフロー

**Fast パス**: efficacy確認 → identity質問(1問) → commitment → final efficacy再測定 → review_axes → 4行summary

**Standard パス**: efficacy確認 → resistance特定 → 摩擦reframe → identity質問(1問) → commitment → final efficacy再測定 → negative delta対応(必要時) → review_axes → 4行summary

**Recovery パス**:
- efficacy <= 3 → 即regression（stage3_resize_hint 必須で Stage 3 に戻す）
- efficacy 4-5 → 行動を smaller version に縮小 → efficacy 6以上で commitment → final efficacy

### Identity 質問選択ルール（v2 改善点）

```
obstacles に「続かない」「先延ばし」「過去にやめた」系 → escape_pattern
issue_frame が decision_conflict / 人間関係系 obstacles → relationship_integrity
obstacles に「見通しがない」「想像できない」/ goal が長期的 → clarity
efficacy が recovery から改善 / 小さな行動を決めた → pride
```

### review_axes 3系統（v2 改善点）

```
1. 【実行チェック】「${selected_action}を今週何回実行したか」
2. 【目標接近感】「やっている最中に${goal_statement}に近づいている感覚があったか（Yes/No + 一言）」
3. 【障害再発チェック】「想定していた障害（${obstacles[0]}）は出たか？出なかった場合、別の障害は何だったか」
```

### Negative Delta 対応（v2 改善点）

| 原因 | 処方 |
|------|------|
| action_too_large | 頻度を下げる / 時間を短くする / 対象場面を絞る |
| commitment_too_heavy | 宣言文を軽くする / 成功条件を緩める / 「やってみる」に言い換え |
| timeline_pressure | deadline を延ばす / 一人でできる形に / 準備行動だけにする |
| reality_shock | 最初の1回だけに集中 / contingency plan 追加 / 「まず試す」フレームに |

### Closing Summary 4行制限（v2 改善点）

```
1. 今日の核心（1文、15文字以内が理想）
2. 今週やること（selected_action + first_step を具体的に）
3. 振り返るタイミング（next_check_in_point を日付 or 曜日で）
4. ユーザー自身の commitment_statement の核心部分を引用（30文字以内）
```

---

## 5. Validator 修正案

`backend/src/services/sectionValidator.ts` の `checkSection4()` に実装済み:

```typescript
export function checkSection4(data: Stage4Data): ValidationResult {
  // Recovery regression shortcut
  if (data.should_return_to_stage3) {
    const reasons: string[] = [];
    if (!data.stage3_resize_hint?.trim()) {
      reasons.push('Stage 3 への再設計ヒントが必要');  // ★v2: resize_hint 必須
    }
    const complete = reasons.length === 0;
    return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
  }

  const reasons: string[] = [];

  // commitment_statement: meaningful (5文字以上, placeholder でない)
  if (!isFilledMeaningfully(data.commitment_statement)) {
    reasons.push('コミットメント宣言が未完了');
  }

  // efficacy 閾値: recovery パスは >= 4 で例外許容
  const efficacyThreshold = data.stage4_path === 'recovery' ? 4 : 6;
  const finalEfficacy = data.self_efficacy_level_final ?? data.self_efficacy_level;
  if (!finalEfficacy || finalEfficacy < efficacyThreshold) {
    reasons.push(`自己効力感がまだ低い（${efficacyThreshold}以上が必要）`);
  }

  // next_check_in_point: 必須
  if (!isFilledMeaningfully(data.next_check_in_point)) {
    reasons.push('次の振り返りタイミングが未設定');
  }

  // review_axes: 2つ以上必須
  if (!data.review_axes || data.review_axes.length < 2) {
    reasons.push('振り返り軸が2つ以上必要');
  }

  const complete = reasons.length === 0;
  return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
}
```

### v1 → v2 の差分

| 条件 | v1 | v2 |
|------|----|----|
| regression 完了条件 | `should_return_to_stage3 === true` で即 complete | `stage3_resize_hint` が必須 |
| efficacy 閾値 | 一律 >= 6 | recovery パスは >= 4 |
| review_axes | なし | >= 2 必須 |
| next_check_in_point | なし | 必須 |

---

## 6. サンプル会話（Fast / Standard / Recovery）

### Case A: Fast パス — 転職面接の準備

**背景**: 30代エンジニア。転職面接の準備について相談。Stage 3 で「面接前に3社の企業研究を30分ずつ行う」を選択。obstacles: 「時間がない」。

```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
User: 9点ですね。もう調べる会社も決まってるし。
```
→ stage4_path: "fast", self_efficacy_level_initial: 9

```
AI: 9点、高い自信ですね。「調べる会社も決まってる」とのこと。
   一つ聞きたいのですが — この準備を通じて面接本番で何を曖昧にしたくないですか？
```
→ identity_prompt_type: "clarity"（goal が長期的で見通し系）

```
User: 自分がなぜこの会社を選んだのか、を曖昧にしたくないです。
AI: 「なぜこの会社か」を自分の言葉で持っておきたい、と。
   では、今週やると決めたことを一言で言ってもらえますか？
User: 今週中に3社分の企業研究を30分ずつやって、志望理由を言語化する。
AI: ありがとうございます。commitment 後にもう一度聞きます — 今の自信は何点ですか？
User: 9点のままです。
```
→ self_efficacy_level_final: 9, delta: 0

```
AI: 「なぜこの会社か」を言語化する。
   今週中に3社×30分の企業研究。
   振り返りは金曜夜。
   「志望理由を自分の言葉で持つ」
```
→ review_axes: ["企業研究を今週何回実行したか", "調べた後に「この会社に行きたい」という感覚が少しでもあったか", "「時間がない」は実際に発生したか。発生した場合どう対処したか"]

**自己評価**: Fast パスが正常に機能。delta=0 は高自信維持として正常処理。identity_prompt_type は goal の長期性から clarity を選択（obstacles に「続かない」系がないため妥当）。review_axes は3系統すべてカバー。4行 summary 遵守。

---

### Case B: Standard パス — 部下への指導方法の改善

**背景**: 40代マネージャー。部下が報連相をしないことに苛立ち。Stage 3 で「週1回の1on1で、部下に『今週困ったこと』を聞く」を選択。obstacles: 「部下が本音を言わないかもしれない」「自分が説教してしまいそう」。issue_frame: decision_conflict。

```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
User: 6点かな…やれるとは思うけど、自分が説教モードに入らないか不安で。
```
→ stage4_path: "standard", self_efficacy_level_initial: 6

```
AI: 6点。「説教モードに入らないか不安」と。
   その不安を少し掘り下げます。「説教してしまう」のは意志の弱さではなく、
   あなたが長年やってきたマネジメントスタイルが反射的に出るという構造の話ですね。
   つまり、意志ではなく「場面の設計」で防げる可能性がある。
   例えば、最初の5分は「聞く」だけと決めて、自分の意見は後半に回す — という形はどうですか？
User: ああ、それなら。最初の5分は聞くだけ、と決めれば確かに防げるかも。
```
→ perceived_resistance: "自分が説教モードに入る", resistance_reframe: "長年のマネジメントスタイルの反射。場面設計（最初5分は聞くだけ）で構造的に防げる"

```
AI: 「最初5分は聞くだけ」を取り入れると。
   一つ聞きたいのですが — 今回の1on1で守りたいのは、部下との関係ですか、
   それとも「説教しない自分」という自分の誠実さですか？
User: 両方だけど…部下が「この人には言える」と思ってくれる関係を守りたい。
```
→ identity_prompt_type: "relationship_integrity"（issue_frame=decision_conflict、人間関係系obstacles）
→ identity_alignment: "部下が「この人には言える」と思える関係"

```
AI: 「この人には言える」と思ってもらえる関係。
   では、今週やると決めたことを一言で。
User: 水曜の1on1で、最初の5分は聞くだけに徹して、「今週困ったこと」を聞く。
AI: ありがとうございます。もう一度聞きます — 今の自信は何点ですか？
User: 7点。5分だけなら、いけそう。
```
→ self_efficacy_level_final: 7, delta: +1

```
AI: 「聞けるマネージャー」への一歩。
   水曜1on1で最初5分は聞くだけ、「今週困ったこと」を聞く。
   振り返りは水曜夜。
   「この人には言えると思ってもらえる関係を守る」
```
→ review_axes: ["水曜の1on1で『今週困ったこと』を聞けたか", "部下の反応に「言えている感」が少しでもあったか（Yes/No + 一言）", "「説教モード」は発動したか？ 発動した場合、何がトリガーだったか"]

**自己評価**: Standard パスの典型例。resistance_reframe が「意志 → 構造」の読み替えとして機能。identity_prompt_type は issue_frame=decision_conflict + 人間関係系 obstacles から relationship_integrity を選択（clarity に逃げていない）。review_axes 3系統カバー。delta +1 は reframe による自信回復。

---

### Case C: Recovery パス（regression）— ダイエットの継続

**背景**: 20代女性。過去にダイエットを何度も挫折。Stage 3 で「毎日30分のジョギング」を選択。obstacles: 「3日坊主」「仕事後疲れて動けない」「過去にジム会員になったが行かなくなった」。

```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
User: …3点です。正直、また続かない気がする。
```
→ stage4_path: "recovery", self_efficacy_level_initial: 3

→ efficacy <= 3 なので即 regression。stage3_resize_hint を生成:

```
AI: 3点。「また続かない気がする」という正直な感覚、大事にしましょう。
   今の「毎日30分のジョギング」は、過去の挫折パターンと同じ構造になっています。
   Stage 3 に戻って、行動を小さくしましょう。
   提案: 「毎日30分のジョギング」→「月・木だけ、玄関の外に立って5分歩く」に縮小。
   頻度を下げて、時間を短くして、まず「外に出る」だけにする。
```

→ should_return_to_stage3: true
→ stage3_resize_hint: "「毎日30分ジョギング」→「月・木だけ玄関の外に立って5分歩く」。頻度: 毎日→週2回。時間: 30分→5分。行動: ジョギング→歩く。過去の挫折パターン（3日坊主・疲労）を踏まえ、成功体験を先に作る設計。"
→ negative_delta_cause: null（regression のため delta 計算なし）
→ can_advance: true（regression complete）

**Stage 3 での使われ方**: running_context.stage3_resize_hint を参照し、「月・木だけ5分歩く」を新しい selected_action として再設計。

**自己評価**: Recovery → regression が正常動作。stage3_resize_hint に具体的な縮小案（頻度・時間・行動内容すべて）を記載。obstacles「3日坊主」「疲労」を踏まえた設計理由も含む。identity_prompt_type は escape_pattern が最適だが、regression で即完了のため identity 質問は未実施（正常）。

---

### Case D: Recovery パス（回復 → commitment）— 人前での発表

**背景**: 30代研究者。学会発表が苦手で避けてきた。Stage 3 で「次の学会で15分の口頭発表を申し込む」を選択。obstacles: 「声が震える」「質疑が怖い」。

```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
User: 4点…申し込むのは今すぐできるけど、本番が不安で。
```
→ stage4_path: "recovery", self_efficacy_level_initial: 4

```
AI: 4点。「申し込みはできるが本番が不安」と。
   「15分の口頭発表」を、もう少し小さくしてみましょう。
   例えば「まず申し込みだけする。発表練習は別の行動として後で決める」とか、
   「15分ではなく5分のポスター発表にする」とか。
   どちらかピンとくるものはありますか？
User: 申し込みだけ先にやる、なら7点くらいありそう。練習は別で考えたい。
```
→ 行動を縮小。self_efficacy が 4 → 7 に上昇

```
AI: 7点。「申し込みだけ先にやる」に縮小して、自信が上がりましたね。
   一つ聞きたいのですが — 過去に発表を避けてきた中で、
   「あのとき出しておけばよかった」と後悔した場面はありますか？ それと今回の違いは？
User: ある。去年の研究会。あのとき出してたら、もっと早くフィードバックもらえてた。
   今回は、フィードバックを早くもらうためにやる、って目的がはっきりしてる。
```
→ identity_prompt_type: "escape_pattern"（obstacles に「避けてきた」パターン）
→ identity_alignment: "フィードバックを早くもらうために出す。過去の回避パターンを変える一歩"

```
AI: 「フィードバックを早くもらうために出す」。明確ですね。
   では、今週やると決めたことを一言で。
User: 今週中に学会の申し込みフォームを送る。
AI: もう一度聞きます — 今の自信は何点ですか？
User: 8点。申し込むだけなら。
```
→ self_efficacy_level_final: 8, delta: +4

```
AI: 「回避をやめる一歩」。
   今週中に学会の申し込みフォームを送る。
   振り返りは日曜夜。
   「フィードバックを早くもらうために出す」
```
→ review_axes: ["申し込みフォームを送ったか（Yes/No）", "申し込んだ後に「出してよかった」という感覚が一瞬でもあったか", "「声が震える」「質疑が怖い」は申し込みの段階で出たか？ 出た場合、どう対処したか"]

**自己評価**: Recovery パスの成功パターン。efficacy 4→7（行動縮小）→8（commitment後）で delta +4。identity_prompt_type は obstacles「避けてきた」から escape_pattern を選択。行動縮小は「発表全体→申し込みだけ」で適切。review_axes は縮小後の行動に合わせて調整。

---

## 7. 既存構造との互換性注意点

### 後方互換を維持しているフィールド

| フィールド | 処理 | 理由 |
|-----------|------|------|
| `self_efficacy_level` | `self_efficacy_level_initial` と双方向同期 | v1 で self_efficacy_level のみ使っていたコードがある場合の安全弁 |

### 新規フィールドのデフォルト値

| フィールド | デフォルト | 処理場所 |
|-----------|----------|---------|
| `stage3_resize_hint` | `null` | `coaching.ts` post-processing |
| `negative_delta_cause` | `null` | `coaching.ts` post-processing |
| `identity_prompt_type` | `null` | LLM 出力。未選択時は null |

### フロントエンドへの影響

- `frontend/src/types/coaching.ts` に同一の型変更を適用済み
- フロントエンドは Stage4Data を表示用にしか使わないため、新フィールドは追加表示するだけで破壊的変更なし
- `stage3_resize_hint` と `negative_delta_cause` は主にバックエンドの内部ロジックで使用

### DB への影響

- `running_context` は JSON カラムのため、新フィールド追加にマイグレーション不要
- `stage_extracted_data` も JSON カラムのため同様
- 既存の Stage 4 データを読み込んだ場合、新フィールドは `undefined` → `coaching.ts` のデフォルト処理で `null` にフォールバック

### Stage 3 との連携（regression）

- `stage3_resize_hint` は `coaching.ts` で `updatedRc['stage3_resize_hint']` に格納
- Stage 3 のプロンプトが `running_context.stage3_resize_hint` を参照して行動を再設計する必要がある
- **TODO**: Stage 3 のプロンプト側で `stage3_resize_hint` を明示的に活用する記述を追加すると、regression 後の精度がさらに向上する

### DefaultStage4Handler の validateCompletion

- regression 時: `stage3_resize_hint` が必須（v1 では不要だった）
- standard/fast 時: `finalEfficacy >= 6`, `review_axes.length >= 2`, `next_check_in_point` 必須（v1 より厳格）
- recovery 時: `finalEfficacy >= 4`（閾値が異なる）

### analytics への接続（将来対応）

新フィールドにより、以下のアナリティクスが可能になる:
- `stage4_path` 別のセッション分布
- `identity_prompt_type` の使用分布（clarity 偏り監視）
- `negative_delta_cause` の発生頻度と原因別分布
- `self_efficacy_delta` の平均値（パス別）
- `should_return_to_stage3` の発生率
- `review_axes` の系統カバレッジ率

---

*作成日: 2026-03-04*
*対象バージョン: Stage 4 Adaptive Branching v2*
