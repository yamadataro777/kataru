# 4段階コーチングフロー 再設計仕様書

## Context
既存の対話機能（8フェーズ: intake→clarify→explore→deepen→identity_design→synthesis→action_plan→close）を、ユーザーが自律的にセッションを前進させる4段階コーチングフロー（整理→目標設定→行動設定→確定の調整）に全面再設計する。現在のシステムはAIが自動的にフェーズを判定・遷移するが、新システムではLLMが`can_advance: true`を返した場合のみユーザーが手動で次段階へ進める。

---

## 1. 仕様の再定義

### 用語定義
| 用語 | 定義 |
|------|------|
| Stage（段階） | ユーザーが手動で進める4つの大区分 (1-4) |
| Mode（モード） | Stage 1のみの下位区分: `logical`（論理整理）or `emotional`（感情整理） |
| Turn（ターン） | ユーザー1発話 → AI1応答 のサイクル |
| Gate（ゲート） | `can_advance: true`にならないと次Stageへ進めない制約 |
| extracted_data | 各Stageで蓄積される構造化情報（Stage完了後に次Stageへ引き継がれる） |

### Stage 1 論理整理 vs 感情整理の明確な差異
| 項目 | 論理整理 (logical) | 感情整理 (emotional) |
|------|-------------------|---------------------|
| AIが整理するもの | 問題構造・制約・優先順位・論点 | 感情・きっかけ・内的葛藤・欲求 |
| AIがやってはいけないこと | 感情に共感しすぎて構造整理を後回しにする | 問題解決フレームを早期に当てる |
| 完了の証拠 | central_problem + current_situation + decision_needed が明確 | primary_emotions + triggers + desired_state が明確 |
| Stage 2 への引き継ぎ | 問題解決の目標・判断基準・到達状態を定義 | 望む心理状態・観察可能な変化を定義 |

### 各Stageの完了条件（厳密定義）
**Stage 1 Logical**:
- `central_problem` が非null/非空
- `current_situation` が非null/非空
- `key_factors` に1件以上
- `decision_needed` が非null/非空
- `confidence >= 0.7`
- （これらすべてが満たされない限り `can_advance: false`）

**Stage 1 Emotional**:
- `primary_emotions` に1件以上
- `emotional_triggers` に1件以上
- `inner_conflicts` または `unmet_needs` に1件以上
- `desired_emotional_state` が非null/非空
- `confidence >= 0.7`

**Stage 2**:
- `goal_type` が確定している（quantitative or qualitative）
- `goal_statement` が非null/非空
- goal_type が quantitative → `metric` + `target_value` が両方非null、または`deadline`が非null
- goal_type が qualitative → `observable_signs` に1件以上 + `why_this_goal_matters` が非null
- `confidence >= 0.7`

**Stage 3**:
- `action_candidates` に1件以上
- `selected_action` が非null/非空
- `first_step` が非null/非空
- 障害の検討が完了（obstacles が空でも「障害なし」と明示確認済みフラグ）
- `confidence >= 0.7`

**Stage 4**（完了 = セッション終了）:
- `commitment_statement` が非null/非空
- `self_efficacy_level >= 6`（10段階）
- `confidence >= 0.8`

### Stage 1 モード切替条件
**Logical → Emotional を提案する条件**（以下のいずれか2つ以上）:
- 3ターン以上経過し `central_problem` または `current_situation` が空のまま
- ユーザーが感情語を3回以上使用（怖い・悲しい・辛い・モヤモヤ・不安 等）
- 問題構造の質問に対してユーザーが「どう感じるか」で返答している

**Emotional → Logical を提案する条件**（以下のいずれか2つ以上）:
- `desired_emotional_state` が「〇〇したい（行動）」型であり感情ではない
- ユーザーが「じゃあ何をすれば」「具体的に」と聞いてきた
- 3ターン以上経過し `primary_emotions` が「わからない」のまま

---

## 2. 画面/状態遷移設計

### 録音ボタン押下後の画面遷移
```
ホーム画面
  └─ [対話モード]ボタンタップ
       └─ /dialogue/coaching (新画面) に遷移
            ├─ State: MODE_SELECT (モード未選択)
            │    └─ 画面上部: StageProgressBar (Stage1ハイライト)
            │    └─ 中央: ModeSelector (論理/感情ボタン)
            │    └─ 録音ボタン: 非活性
            │
            ├─ [論理] or [感情] タップ
            │    └─ State: STAGE_1_ACTIVE
            │         └─ StageProgressBarラベル: 「整理（論理）」or「整理（感情）」
            │         └─ 録音ボタン: 活性
            │         └─ AIの開始メッセージを表示
            │
            └─ 会話継続中
                 ├─ [次のセクションへ]ボタン: can_advance が false → disabled
                 ├─ [次のセクションへ]ボタン: can_advance が true → enabled (cyan)
                 ├─ ボタンタップ → Stage 2 に遷移 (State: STAGE_2_ACTIVE)
                 └─ Stage 4 完了 → /dialogue/results/:id
```

### Progression Barの表示ルール
| 条件 | 表示 |
|------|------|
| 未到達Stage | グレー、非活性 |
| 現在のStage | シアン、パルスアニメーション |
| Stage 1かつモード選択済み | ラベルを「整理（論理）」or「整理（感情）」に変更 |
| 完了済みStage | ライム色 + チェックマーク |

### 「次のセクションへ」ボタンの活性条件
```typescript
const canAdvanceStage = (
  currentStage: number,
  llmResponse: CoachingTurnResponse
): boolean => {
  // LLMのcan_advanceを信頼しつつ、フロント側でも extracted_data の必須フィールドを検証（二重ゲート）
  if (!llmResponse.can_advance) return false;
  return validateExtractedData(currentStage, llmResponse.extracted_data);
};
```

- 非活性時にタップ → `missing_requirements`をトースト表示
- `「まだ○○が明確でありません」`のメッセージ

### モード切替時の挙動
- AIが`should_suggest_mode_switch: true`を返す → `ModeSwitchSuggestionBanner`を表示
- ユーザーが「切り替える」→ `stage_mode`を更新、Stage 1の会話はリセット**しない**
  - 保持する情報: `conversation_id`、過去のturns（表示上は維持）
  - リセットする情報: `extracted_data`（新モードで再収集）、`can_advance`フラグ
  - AIへのコンテキスト: 「モードを切り替えました。以前の会話を踏まえて{新モード}で改めて整理を進めます」

### 前の段階へ戻る条件
- Stage 3以降でAIが`should_regress_stage: true`を返した場合のみ提案
- ユーザーへの確認ダイアログ必須（自動後退禁止）
- ダイアログ: 「段階を{regress_to_stage}段階目に戻しますか？前の段階で設定した内容を再確認します」
- 後退時: 対象Stageの`extracted_data`を引き継いだまま再開（白紙に戻さない）

---

## 3. 第1段階の詳細設計

### 3-1. 論理整理のLLM設計

**LLMがやること:**
1. ユーザーの発話から問題構造の要素を抽出（central_problem, key_factors等）
2. 1つずつ、具体化させる質問を返す（抽象語を使わせない）
3. `extracted_data`の空欄を優先順位付きで埋めるよう質問を絞る
4. 順序: central_problem → current_situation → key_factors → constraints → decision_needed

**LLMがやってはいけないこと:**
- 感情に過度に共感してセッションが感情整理に流れること
- 「どうお感じですか？」系の質問を3ターン連続で出すこと
- 解決策を提案すること（Stage 3の責務）
- 1回に2つ以上の質問を出すこと（1質問原則）

**代表質問例:**
- 「今、一番頭を占めている問題を一文で言うとしたら何ですか？」
- 「現状はどんな状態ですか？具体的に教えてください」
- 「この問題を難しくしている最大の要因は何だと思いますか？」
- 「この状況で"決めなければいけないこと"は何ですか？」
- 「もし制約がなければ、すでに動けていると思いますか？」

**完了判定の実装:**
```typescript
function validateStage1Logical(data: Stage1LogicalData): boolean {
  return (
    !!data.central_problem?.trim() &&
    !!data.current_situation?.trim() &&
    data.key_factors.length >= 1 &&
    !!data.decision_needed?.trim()
  );
}
```

**抽出すべき構造化データ:**
```typescript
interface Stage1LogicalData {
  central_problem: string | null;      // 中心問題（一文）
  current_situation: string | null;    // 現状認識
  key_factors: string[];               // 主要論点（複数可）
  constraints: string[];               // 制約条件
  uncertainty_points: string[];        // 曖昧なまま残っている点
  decision_needed: string | null;      // 何を決める必要があるか
  priority_candidates: string[];       // 優先順位候補
}
```

### 3-2. 感情整理のLLM設計

**LLMがやること:**
1. 感情のラベリングを手伝う（「〇〇という気持ちですね」）
2. 感情のきっかけを特定する質問を出す
3. 内的葛藤を言語化させる（「〜したいけど〜も怖い」型）
4. 最終的に「本当はどんな状態になりたいか」を引き出す
5. 順序: primary_emotions → triggers → inner_conflicts/unmet_needs → desired_state

**LLMがやってはいけないこと:**
- 問題解決フレームを早期に当てる（「では何をすれば...」は禁止）
- 感情を正当化しすぎて「整理」が進まない状態に留まること
- ラベリングを押し付けること（「〇〇という感情ですよね？」と断定しない）
- 「なぜ」の問いを多用すること（防衛反応を招く）

**代表質問例:**
- 「今の気持ちを色で表すとしたら、どんな色ですか？」
- 「最近、一番モヤモヤした瞬間を思い出せますか？何があったとき？」
- 「その感情が出てくるのは、どんな場面が多いですか？」
- 「〇〇という気持ちと、何か別の気持ちが一緒にありますか？」
- 「今の状態が続いたら、どんな感じがしますか？」
- 「本当はどんな状態でいたいですか？どんな自分でいたい？」

**完了判定の実装:**
```typescript
function validateStage1Emotional(data: Stage1EmotionalData): boolean {
  return (
    data.primary_emotions.length >= 1 &&
    data.emotional_triggers.length >= 1 &&
    (data.inner_conflicts.length >= 1 || data.unmet_needs.length >= 1) &&
    !!data.desired_emotional_state?.trim()
  );
}
```

**抽出すべき構造化データ:**
```typescript
interface Stage1EmotionalData {
  primary_emotions: string[];           // 主要感情（複数可）
  emotional_triggers: string[];         // 感情のきっかけ
  inner_conflicts: string[];            // 内的葛藤
  unmet_needs: string[];               // 満たされていない欲求
  desired_emotional_state: string | null; // 本当はどんな状態になりたいか
  resistance_points: string[];          // 心理的な抵抗の正体
}
```

### 3-3. モード切替の詳細設計

**AIが切替提案を出す条件（LLMがshould_suggest_mode_switch: trueを返す基準）:**
```
Logical → Emotional:
  - 3ターン経過 AND (central_problem が空 OR current_situation が空)
  - AND ユーザー発話に感情語が2回以上含まれる

Emotional → Logical:
  - 3ターン経過 AND desired_emotional_state が「〇〇したい（行動）」パターン
  - OR ユーザーが「何をすれば」「どうすれば」を聞いてきた
```

**切替提案UIの表示:**
```
┌─────────────────────────────────────────┐
│ AIからの提案                              │
│ {mode_switch_reason}                      │
│ 感情整理モードに切り替えませんか？           │
│                                           │
│     [切り替える]    [このまま続ける]        │
└─────────────────────────────────────────┘
```
- バナー形式でConversationThreadの上部に表示
- ユーザーが明示的に選択するまで消えない
- 「このまま続ける」を選択→バナーを閉じ、モード変更なしで続行
- AIはこれ以降同じターンで再度提案しない（スパム防止）

**切替時に保持する情報:**
- conversation_id、過去の全ターンデータ
- stage_summaries（過去の積み上げ）

**切替時に破棄する情報:**
- extracted_data（旧モードで取得したデータをリセット）
- can_advance（falseにリセット）
- 旧モードのmissing_requirements

---

## 4. 各段階のLLM責務

### Stage 1（整理）LLM責務
| 項目 | 内容 |
|------|------|
| やること | モード別の要素を1つずつ引き出す。extracted_dataの空欄を優先順位付きで埋める。confidence を誠実に評価する |
| やってはいけないこと | 解決策の提案。Stage 2の目標を先取りする。2段階以上飛んだ質問 |
| 質問の性質 | 具体化・特定化。1ターン1質問原則。開かれた問い（Why禁止、What/How/When優先） |
| 完了判定 | extracted_dataの必須フィールドが埋まり、confidence >= 0.7 |
| 返すJSON | 基本スキーマ + Stage1LogicalData or Stage1EmotionalData |

### Stage 2（目標設定）LLM責務
| 項目 | 内容 |
|------|------|
| やること | Stage 1のextracted_dataを参照し、goal_typeを確定させる。定量目標なら数値・期限・指標、定性目標なら観察可能なサインを引き出す |
| やってはいけないこと | Stage 1の結論を否定する目標を設定させる。曖昧なままStage 3へ進めようとする |
| 質問の性質 | 「〇〇が達成されたとき、何が変わっていますか？」型。具体性を引き出す |
| 完了判定 | goal_type確定 + goal_statement非空 + goal_type依存の追加条件を満たす + confidence >= 0.7 |
| 返すJSON | 基本スキーマ + Stage2Data |

### Stage 3（行動設定）LLM責務
| 項目 | 内容 |
|------|------|
| やること | Stage 2の目標に対して現実的な行動を設計。制約・リソース・障害を先に確認してから行動を決める |
| やってはいけないこと | リソース確認前に行動を提案する。理想論的な行動を推薦する（「毎日2時間〜」等） |
| 質問の性質 | 「今週、現実的に使える時間は？」「今の手持ちでできることは？」制約ファースト |
| 完了判定 | selected_action + first_step が非空 + confidence >= 0.7 |
| 返すJSON | 基本スキーマ + Stage3Data |

### Stage 4（確定の調整）LLM責務
| 項目 | 内容 |
|------|------|
| やること | セルフ・エフィカシーを高める。「これは自分でもできる」という感覚を引き出す |
| やってはいけないこと | 応援で終わる（「頑張れ！」だけはNG）。現実的でないコミットを引き出す |
| 質問の性質 | 「10段階で自信は何点？」「3点下げているのは何ですか？」自己効力感の数値化と阻害要因の特定 |
| 完了判定 | commitment_statement非空 + self_efficacy_level >= 6 + confidence >= 0.8 |
| 返すJSON | 基本スキーマ + Stage4Data（疎結合: Stage4Handlerインターフェース経由） |
| 疎結合設計 | Stage4Handler interfaceを定義し、現在のロジックはDefaultStage4Handler。Chase Hughesロジックはカスタムハンドラーとして後から差し替え可能 |

---

## 5. JSONスキーマ（完全版）

```typescript
// 基本スキーマ（全ターンで返す）
interface CoachingTurnResponse {
  current_stage: 1 | 2 | 3 | 4;
  current_stage_mode: 'logical' | 'emotional' | null;  // Stage 1のみ非null
  assistant_message: string;                            // 表示テキスト（質問は1-2個まで）

  // ゲート制御
  can_advance: boolean;
  advance_reason: string | null;      // can_advance=trueのとき: 「〇〇が明確になりました」
  missing_requirements: string[];     // can_advance=falseのとき: 「〇〇がまだ不明確です」

  // サマリ（段階の積み上げ）
  stage_summary: string;              // 現在段階の会話サマリ（最新版）

  // 構造化データ（段階別）
  extracted_data:
    | Stage1LogicalData
    | Stage1EmotionalData
    | Stage2Data
    | Stage3Data
    | Stage4Data;

  // 完了度
  confidence: number;                 // 0.0-1.0（現段階の完了度の評価）

  // 後退制御
  should_regress_stage: boolean;
  regress_to_stage: 1 | 2 | 3 | null;
  regress_reason: string | null;

  // モード切替（Stage 1のみ有効）
  should_suggest_mode_switch: boolean;
  suggested_mode: 'logical' | 'emotional' | null;
  mode_switch_reason: string | null;
}

// Stage 1 Logical
interface Stage1LogicalData {
  central_problem: string | null;
  current_situation: string | null;
  key_factors: string[];
  constraints: string[];
  uncertainty_points: string[];
  decision_needed: string | null;
  priority_candidates: string[];
}

// Stage 1 Emotional
interface Stage1EmotionalData {
  primary_emotions: string[];
  emotional_triggers: string[];
  inner_conflicts: string[];
  unmet_needs: string[];
  desired_emotional_state: string | null;
  resistance_points: string[];
}

// Stage 2
interface Stage2Data {
  goal_type: 'quantitative' | 'qualitative' | null;
  goal_statement: string | null;
  metric: string | null;
  target_value: string | null;
  deadline: string | null;
  observable_signs: string[];
  why_this_goal_matters: string | null;
  previous_stage_mode: 'logical' | 'emotional';  // Stage 1から引き継ぎ
}

// Stage 3
interface Stage3Data {
  action_candidates: string[];
  selected_action: string | null;
  budget: string | null;
  available_time: string | null;
  resources: string[];
  obstacles: string[];
  obstacles_acknowledged: boolean;    // 「障害なし」の明示確認フラグ
  first_step: string | null;
  execution_frequency: string | null;
}

// Stage 4（疎結合インターフェース）
interface Stage4Data {
  commitment_statement: string | null;
  self_efficacy_level: number | null;  // 1-10
  perceived_resistance: string | null;
  identity_alignment: string | null;
  reinforcement_message: string | null;
  next_check_in_point: string | null;
}

// Stage4 差し替えインターフェース
interface Stage4Handler {
  buildPrompt(context: CoachingContext): string;
  validateCompletion(data: Stage4Data): boolean;
  getInitialMessage(): string;
}
```

---

## 6. 段階別通過条件（UIゲート判定用）

```typescript
function canAdvanceFromStage(
  stage: number,
  mode: 'logical' | 'emotional' | null,
  extractedData: Stage1LogicalData | Stage1EmotionalData | Stage2Data | Stage3Data | Stage4Data,
  confidence: number
): { canAdvance: boolean; reasons: string[] } {

  if (stage === 1 && mode === 'logical') {
    const d = extractedData as Stage1LogicalData;
    const reasons = [];
    if (!d.central_problem?.trim()) reasons.push('中心となる問題が明確でない');
    if (!d.current_situation?.trim()) reasons.push('現状認識が不明確');
    if (d.key_factors.length < 1) reasons.push('主要な論点が挙がっていない');
    if (!d.decision_needed?.trim()) reasons.push('何を決める必要があるかが不明');
    if (confidence < 0.7) reasons.push('整理の深度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 1 && mode === 'emotional') {
    const d = extractedData as Stage1EmotionalData;
    const reasons = [];
    if (d.primary_emotions.length < 1) reasons.push('主要な感情が特定できていない');
    if (d.emotional_triggers.length < 1) reasons.push('感情のきっかけが不明確');
    if (d.inner_conflicts.length < 1 && d.unmet_needs.length < 1) reasons.push('内的な引っかかりがまだ言語化されていない');
    if (!d.desired_emotional_state?.trim()) reasons.push('どんな状態になりたいかが不明確');
    if (confidence < 0.7) reasons.push('感情整理の深度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 2) {
    const d = extractedData as Stage2Data;
    const reasons = [];
    if (!d.goal_type) reasons.push('目標の種類（定量/定性）が未確定');
    if (!d.goal_statement?.trim()) reasons.push('目標が言語化されていない');
    if (d.goal_type === 'quantitative' && !d.metric && !d.deadline)
      reasons.push('達成指標または期限が必要');
    if (d.goal_type === 'qualitative' && d.observable_signs.length < 1)
      reasons.push('達成を観察できる変化が明確でない');
    if (d.goal_type === 'qualitative' && !d.why_this_goal_matters)
      reasons.push('この目標の意味・理由が不明確');
    if (confidence < 0.7) reasons.push('目標の明確度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 3) {
    const d = extractedData as Stage3Data;
    const reasons = [];
    if (d.action_candidates.length < 1) reasons.push('行動候補が出ていない');
    if (!d.selected_action?.trim()) reasons.push('実行する行動が決まっていない');
    if (!d.first_step?.trim()) reasons.push('最初のアクションが不明確');
    if (!d.obstacles_acknowledged && d.obstacles.length === 0)
      reasons.push('障害の有無を確認していない');
    if (confidence < 0.7) reasons.push('行動設計の具体性が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 4) {
    const d = extractedData as Stage4Data;
    const reasons = [];
    if (!d.commitment_statement?.trim()) reasons.push('コミットメント宣言が未完了');
    if (!d.self_efficacy_level || d.self_efficacy_level < 6)
      reasons.push('自己効力感がまだ低い（6以上が必要）');
    if (confidence < 0.8) reasons.push('確定の深度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  return { canAdvance: false, reasons: ['不明なStage'] };
}
```

---

## 7. 対話設計（代表質問例）

### Stage 1 論理整理の質問（低認知負荷）
```
Turn 1: 「今日、一番頭を占めていることを一言で言うとしたら何ですか？」
Turn 2: 「今、その状況は具体的にどんな状態ですか？」
Turn 3: 「そのことを難しくしている一番大きな要因は何だと思いますか？」
Turn 4: 「今の状況で、あなたが決めなければいけないことは何ですか？」
Turn 5: 「もし時間と制約がなければ、もうすでに動いていると思いますか？」
```

### Stage 1 感情整理の質問（低認知負荷）
```
Turn 1: 「今の気持ちを言葉にするとしたら、どんな感じがありますか？」
Turn 2: 「そのモヤモヤが一番強く出るのは、どんな場面ですか？」
Turn 3: 「〇〇という気持ちの裏に、何か別の気持ちもありそうですか？」
Turn 4: 「今の状態から抜け出したとき、どんな自分でいたいですか？」
Turn 5: 「本当はどうなりたいか、少しイメージできてきましたか？」
```

### Stage 2 質問例
```
Turn 1: 「先ほどの整理を踏まえて、今回のゴールを一文で言うとしたら？」
Turn 2: 「それが達成されたとき、何が変わっていますか？具体的に教えてください」
Turn 3（定量の場合）: 「数字で測れるとしたら、どんな数値が目安になりますか？」
Turn 3（定性の場合）: 「達成されたことを、日常の中でどうやって確認しますか？」
```

### Stage 3 質問例
```
Turn 1: 「今週、現実的に使える時間はどれくらいありますか？」
Turn 2: 「今の手持ちのリソースで、すぐにできることは何ですか？」
Turn 3: 「やろうとしたときに一番邪魔になりそうなことは何ですか？」
Turn 4: 「では、明日から始める具体的な最初の一歩を決めましょう。何をしますか？」
```

### Stage 4 質問例
```
Turn 1: 「今決めた行動、10段階で自信は何点くらいありますか？」
Turn 2: 「3点下げているのは何ですか？何が不安ですか？」
Turn 3: 「過去に似たことを乗り越えたことはありますか？その時あなたはどうしましたか？」
Turn 4: 「では改めて、今回やると決めたことを声に出して言ってみてください」
```

### AIのトーンガイドライン
- 親切だが曖昧ではない: ×「なるほどですね〜」→ ○「つまり〇〇ということですね。それで、〜？」
- 短く、導線が明確: 1文コメント + 1質問が基本形
- 感情整理では共感を先に: 「〇〇という気持ちがあるんですね。（共感）その感情が出てくるのはどんな場面？（質問）」

---

## 8. アプリ実装方針（Next.js + Capacitor / TypeScript）

### 実装基盤
- **フロントエンド**: Next.js App Router、静的エクスポート（`output: "export"`）、全ページ `'use client'`
- **iOS**: Capacitor 8 が静的 `/out` をラップ、MP4音声優先
- **バックエンド**: Express + TypeScript（既存の `/backend` 構成を拡張）

### 画面コンポーネント構成
```
frontend/src/app/dialogue/
  page.tsx                              # 更新: 新コンポーネント群を使用（既存ファイル）
  results/
    DialogueResultsClient.tsx           # 更新: コーチングレポート表示に対応

frontend/src/components/coaching/       # 新規ディレクトリ
  StageProgressBar.tsx                  # 4段階プログレスバー（PhaseIndicator.tsx を置き換え）
  ModeSelector.tsx                      # 論理/感情ボタン（Stage 1のみ表示）
  ModeSwitchSuggestionBanner.tsx        # モード切替提案バナー
  AdvanceStageButton.tsx                # 「次のセクションへ」ボタン（活性/非活性制御）
  CoachingConversationThread.tsx        # 会話スレッド（ConversationThread.tsx ベース）
  CoachingRecordButton.tsx              # 録音ボタン（DialogueRecordButton.tsx ベース）

frontend/src/hooks/
  useCoachingDialogue.ts                # 新規: 状態管理フック（useDialogue.ts を置き換え）

frontend/src/types/
  coaching.ts                           # 新規: 上記JSONスキーマ全定義

frontend/src/lib/
  coachingApi.ts                        # 新規: API呼び出しラッパー

backend/src/stage-handlers/
  Stage4Handler.interface.ts            # 新規: 疎結合インターフェース
  DefaultStage4Handler.ts               # 新規: デフォルト実装
```

### 状態管理（useCoachingDialogue.ts）
```typescript
interface CoachingDialogueState {
  conversationId: string | null;
  currentStage: 1 | 2 | 3 | 4;
  stageMode: 'logical' | 'emotional' | null;
  turns: CoachingTurn[];
  lastLLMResponse: CoachingTurnResponse | null;
  canAdvance: boolean;
  missingRequirements: string[];
  stageSummaries: Record<1 | 2 | 3 | 4, string>;
  extractedData: Record<1 | 2 | 3 | 4, StageExtractedData | null>;
  modeSwitchSuggestion: {
    visible: boolean;
    suggestedMode: 'logical' | 'emotional' | null;
    reason: string | null;
  };
  uiState: 'MODE_SELECT' | 'RECORDING' | 'PROCESSING' | 'STAGE_COMPLETE' | 'SESSION_COMPLETE';
  error: string | null;
}
```

### LLMレスポンスの取り扱い
```typescript
// Zodスキーマによる二重ゲートバリデーション
const CoachingTurnResponseSchema = z.object({
  current_stage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  current_stage_mode: z.enum(['logical', 'emotional']).nullable(),
  assistant_message: z.string(),
  can_advance: z.boolean(),
  advance_reason: z.string().nullable(),
  missing_requirements: z.array(z.string()),
  stage_summary: z.string(),
  extracted_data: z.unknown(),
  confidence: z.number().min(0).max(1),
  should_regress_stage: z.boolean(),
  regress_to_stage: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  regress_reason: z.string().nullable(),
  should_suggest_mode_switch: z.boolean(),
  suggested_mode: z.enum(['logical', 'emotional']).nullable(),
  mode_switch_reason: z.string().nullable(),
});

function parseLLMResponse(raw: string): CoachingTurnResponse {
  try {
    return CoachingTurnResponseSchema.parse(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_FALLBACK_RESPONSE, assistant_message: 'なるほど、もう少し教えていただけますか？' };
  }
}
```

### 「次のセクションへ」ボタン制御ロジック（二重ゲート）
```typescript
function isAdvanceButtonEnabled(state: CoachingDialogueState): boolean {
  if (!state.lastLLMResponse?.can_advance) return false;
  const { canAdvance } = canAdvanceFromStage(
    state.currentStage,
    state.stageMode,
    state.lastLLMResponse.extracted_data,
    state.lastLLMResponse.confidence
  );
  return canAdvance;
}
```

### 第4段階の疎結合設計
```typescript
// backend/src/stage-handlers/Stage4Handler.interface.ts
export interface Stage4Handler {
  buildPrompt(context: CoachingContext): string;
  validateCompletion(data: Stage4Data): boolean;
  getInitialMessage(): string;
  name: string;
}

// 将来の差し替え例:
// new CoachingService(new ChaseHughesStage4Handler())
```

---

## 9. 疑似コード（オーケストレーション）

### 会話開始からモード選択まで
```typescript
async function initializeCoachingSession() {
  const conversation = await coachingApi.createConversation();
  setState({ conversationId: conversation.id, uiState: 'MODE_SELECT' });
}

async function onModeSelected(mode: 'logical' | 'emotional') {
  setState({ stageMode: mode, uiState: 'PROCESSING' });
  const initialResponse = await coachingApi.getInitialMessage(conversationId, 1, mode);
  setState({ turns: [{ ai_response: initialResponse.assistant_message }], uiState: 'RECORDING' });
}
```

### 1ターンのLLM呼び出し処理
```typescript
async function submitTurn(audioBlob: Blob, transcript: string) {
  setState({ uiState: 'PROCESSING' });
  addTurnOptimistic({ user_transcript: transcript });

  try {
    const raw = await coachingApi.sendTurn({
      conversationId, audioBlob, transcript,
      currentStage, stageMode,
      previousExtractedData: extractedData[currentStage],
    });
    const response = parseLLMResponse(raw);
    addTurnFromResponse(response.assistant_message);
    updateStateFromResponse(response);
  } catch {
    removeOptimisticTurn();
    setState({ error: 'メッセージの送信に失敗しました', uiState: 'RECORDING' });
  }
}

function updateStateFromResponse(response: CoachingTurnResponse) {
  const { canAdvance } = canAdvanceFromStage(
    response.current_stage, response.current_stage_mode,
    response.extracted_data, response.confidence
  );
  setState({
    lastLLMResponse: response, canAdvance,
    missingRequirements: response.missing_requirements,
    extractedData: { ...extractedData, [response.current_stage]: response.extracted_data },
    stageSummaries: { ...stageSummaries, [response.current_stage]: response.stage_summary },
    modeSwitchSuggestion: response.should_suggest_mode_switch
      ? { visible: true, suggestedMode: response.suggested_mode, reason: response.mode_switch_reason }
      : { visible: false, suggestedMode: null, reason: null },
    uiState: 'RECORDING',
  });
  if (response.should_regress_stage && response.regress_to_stage) {
    showRegressionConfirmDialog(response.regress_to_stage, response.regress_reason);
  }
}
```

### 段階を進める/戻す処理
```typescript
function advanceStage() {
  const nextStage = (currentStage + 1) as 1 | 2 | 3 | 4;
  if (nextStage > 4) { endSession(); return; }
  setState({ currentStage: nextStage, canAdvance: false, uiState: 'PROCESSING' });
  fetchStageInitialMessage(nextStage, extractedData[currentStage]);
}

function regressStage(targetStage: 1 | 2 | 3) {
  setState({ currentStage: targetStage, canAdvance: false, lastLLMResponse: null, uiState: 'PROCESSING' });
  fetchStageResumeMessage(targetStage, extractedData[targetStage]);
}
```

### モード切替提案を出す処理
```typescript
function acceptModeSwitchSuggestion() {
  const newMode = state.modeSwitchSuggestion.suggestedMode!;
  setState({
    stageMode: newMode,
    extractedData: { ...extractedData, 1: null },
    canAdvance: false,
    modeSwitchSuggestion: { visible: false, suggestedMode: null, reason: null },
    uiState: 'PROCESSING',
  });
  fetchModeSwitchAcknowledgement(newMode);
}
```

---

## 実装に必要なファイル変更

### Backend（変更・新規）
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/types/conversation.ts` | CoachingStage, StageMode, CoachingTurnResponse等の型定義追加 |
| `backend/src/prompts/coaching-prompts.ts` | 新規: 段階×モード別プロンプト（4種類） |
| `backend/src/services/coaching.ts` | 新規: Stage4Handlerインターフェース + メイン処理 |
| `backend/src/stage-handlers/` | 新規ディレクトリ: DefaultStage4Handler.ts |
| `backend/src/routes/coaching.ts` | 新規: /api/coaching エンドポイント群 |
| `backend/src/migrations/002_coaching.sql` | 新規: conversations テーブルに stage, stage_mode 等を追加 |

### Frontend（変更・新規）
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/coaching.ts` | 新規: 全型定義 |
| `frontend/src/hooks/useCoachingDialogue.ts` | 新規: 状態管理フック |
| `frontend/src/lib/coachingApi.ts` | 新規: API呼び出しラッパー |
| `frontend/src/app/dialogue/page.tsx` | 更新: 新コンポーネント群を使用 |
| `frontend/src/components/coaching/*.tsx` | 新規: 上記6コンポーネント |

---

## 実装上の危険ポイントと対策

### 1. LLMのJSON出力不安定性（最高リスク）
**問題**: Geminiが不正なJSONやフィールド欠損のJSONを返す
**対策**:
- Zodスキーマによるパース + フォールバック（デフォルト値で補完）
- LLMプロンプトに「必ずJSONのみを返してください。説明文は一切不要です」を明記
- Geminiの`responseMimeType: 'application/json'`を使用
- フォールバック時は`can_advance: false`、`assistant_message: 固定文`

### 2. モードの一貫性崩壊（高リスク）
**問題**: Stage 1途中でモードが混濁し、LLMが論理質問と感情質問を混ぜる
**対策**:
- プロンプトの先頭に`CURRENT_MODE: logical/emotional`を大文字で明記
- モード別に完全に異なるプロンプト関数を用意（1つのプロンプトにifを書かない）
- フロント側でも`stageMode`をAPIリクエストに毎回含める

### 3. can_advance誤判定による段階スキップ（高リスク）
**問題**: LLMが「整理完了」と誤判定し、必須データが欠けたまま次段階へ
**対策**:
- フロント側で`canAdvanceFromStage()`による二重ゲートを必ず実装
- LLMとフロントの両方がYESの場合のみボタンが活性化

### 4. モード選択なしに会話が始まる（中リスク）
**問題**: `stageMode: null`のまま録音ボタンが押される
**対策**:
- 録音ボタンの`disabled={stageMode === null}`で制御
- APIリクエスト時もサーバー側でstageMode必須バリデーション

### 5. 第4段階の将来差し替え時の破壊（中リスク）
**問題**: Stage4の処理がServicesに直書きされ差し替え不可能になる
**対策**:
- Stage4Handlerインターフェースを最初から定義し、DI経由で注入
- Stage4の処理はif文で分岐させない（多態性で解決）

---

## MVPで削ってよい部分

- **後退（regress）機能**: ユーザーは手動で前段階に戻れなくてよい（AIの判定だけ残す）
- **モード切替提案**: Stage 1完了条件を満たさなければ進めないだけで十分
- **Stage 4の高度なロジック**: 「10段階で自信は？」だけのシンプル実装でよい
- **AIレスポンスのタイプライター効果**: 機能としては二次的
- **段階別スタイルの変化**: 全段階同じデザインでよい（MVP）

## MVPで絶対に削ってはいけない部分

- **ModeSelector UI（論理/感情の選択）**: これがないと設計全体が崩壊
- **can_advanceによるボタン活性制御**: これがないとゲートが機能しない
- **StageProgressBar（4段階）**: ユーザーの現在地の認識に必須
- **LLMの構造化JSON出力**: これなしにはフロントがUIを制御できない
- **Stage 1のモード別プロンプト**: 一つにまとめると混濁が起きる
- **Stage4Handlerインターフェース**: 後から差し替えるなら最初から疎結合に
