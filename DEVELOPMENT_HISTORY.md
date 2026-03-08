# Kataru 開発の軌跡

> **プロジェクト名:** Kataru（語る）
> **コンセプト:** 声で話すだけで、考えが整理される。音声×AIの思考整理アプリ。
> **開発期間:** 2026年3月1日〜2日（約12時間の集中開発スプリント）
> **開発者:** Haruo Tsuchiya × Claude Code

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [タイムライン](#タイムライン)
3. [各セッション詳細](#各セッション詳細)
4. [技術的な意思決定](#技術的な意思決定)
5. [最終構成](#最終構成)

---

## プロジェクト概要

Kataruは、ひとりで考え込みがちな人のための音声思考整理アプリ。録音した内容をAIが文字起こし・分析し、構造化レポートにまとめる。対話モードでは、AIが質問を返しながら思考を深掘りしていく。

**技術スタック:**
- フロントエンド: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript
- バックエンド: Express + TypeScript
- iOS: Capacitor 8
- DB/ストレージ: Supabase (PostgreSQL + Storage)
- AI: OpenAI Whisper（文字起こし）+ Google Gemini 2.5 Flash（レポート生成）
- ホスティング: Vercel（フロントエンド）+ Render（バックエンド）

---

## タイムライン

| 時刻 (UTC) | 所要時間 | マイルストーン |
|---|---|---|
| 3/1 15:54 | 15分 | プロジェクト構想・アーキテクチャ設計 |
| 3/1 16:09 | 30分 | アプリ全体をゼロから構築（38ファイル、エラー0） |
| 3/1 16:30 | 30分 | Supabase/APIキー設定、初回起動、バグ修正 |
| 3/1 16:42 | 20分 | フルパイプライン動作確認（録音→アップロード→Whisper→Gemini→レポート） |
| 3/1 23:55 | 30分 | Whisperアーティファクト除去、フロー再テスト |
| 3/2 00:00 | 25分 | iOS/Capacitorセットアップ、Xcodeビルド |
| 3/2 00:32 | 10分 | CLAUDE.md ドキュメント作成 |
| 3/2 00:41 | 20分 | 対話エンジン設計（8フェーズ対話システム） |
| 3/2 01:03 | 37分 | 対話エンジン完全実装（バックエンド＋フロントエンド） |
| 3/2 01:40 | 2分 | iOSセーフエリア修正、モードボタン説明追加 |
| 3/2 01:44 | 15分 | ターンサマリー最適化（対話コンテキスト） |
| 3/2 01:59 | 28分 | 8フェーズ・マーケティング戦略策定 |
| 3/2 02:27 | 29分 | マーケティングコピー実装、LP構築、GPTクロスレビュー |
| 3/2 02:56 | 28分 | コピー最終仕上げ（18箇所編集）、ChatGPT比較セクション |
| 3/2 03:24 | 12分 | LP → Vercelデプロイ（公開URL取得） |
| 3/2 03:36 | 19分 | バックエンド → Renderデプロイ、GitHub作成、アプリ完全公開 |

---

## 各セッション詳細

### Session 1: プロジェクト構想（3/1 15:54）

最初のメッセージは一言：「録音からレポートを生成するアプリを作りたい。名前はKataru。」

既存のHTMLプロトタイプ（`06-kairo.html`、サイバーパンク/HUD風デザイン）をビジュアルの方向性として参照。最終ターゲットはiOSだが、開発はWebベースで行う方針を決定。

**決定事項:**
- モノレポ構成（npm workspaces: `frontend/` + `backend/`）
- サイバーパンク/ネオンHUD美学（`#0A0E1A` 背景、`#00D4FF` シアン、`#FF3B7A` マゼンタ、`#A8FF00` ライム）
- Supabase + Whisper + Gemini のバックエンドスタック

---

### Session 2: フルアプリ構築（3/1 16:09〜3/2 01:59）

プロジェクトの核となる最長セッション。空ディレクトリから機能するアプリケーションまで。

#### Phase A: モノレポ基盤＆並列ビルド
- **2つのエージェント（frontend-dev、backend-dev）を並行稼働**させ、フロントエンドとバックエンドを同時構築。
- フロントエンド: 6ページ、11+コンポーネント、カスタムフック、APIクライアント、型定義
- バックエンド: Expressサーバー、ルート（sessions CRUD、transcribe、report、analytics）、サービス層
- **38ソースファイルを約16分で作成。コンパイルエラー0。**

#### Phase B: 環境設定＆Supabase連携
- Supabase URL、各種APIキーを設定
- `sessions`テーブル、`audio`ストレージバケット作成
- dotenvのロード問題を修正

#### Phase C: 初回起動＆バグ修正
- API応答の`snake_case` → フロントエンドの`camelCase`マッピング修正
- Web Speech APIのネットワークエラー対応（フォールバックメッセージ追加）
- **フルパイプライン動作確認完了**: セッション作成→音声アップロード→Whisper文字起こし→Geminiレポート生成

#### Phase D: Whisperクリーンアップ（約7時間の休憩後）
- Whisperが短い/無音の音声に「ご視聴ありがとうございました」等のフレーズを挿入する問題を修正

#### Phase E: iOS / Capacitorセットアップ
- 静的エクスポート設定、Capacitor 8追加
- `Info.plist`にマイク・音声認識のパーミッション追加
- WebViewのローディング、ATS例外、セキュアコンテキスト問題をデバッグ

#### Phase F: 対話エンジン設計
創業者が「CTOとして」対話エンジンの設計・実装を指示。単純な録音→レポートアプリから、多段階AI対話システムへの転換点。

**対話エンジンのコンセプト:**
- 8フェーズの対話（導入→探索→深掘り→感情→パターン→統合→行動→クロージング）
- 3つの質問モダリティ（コーチング、精神分析、アイデンティティ構築）
- 累積コンテキスト追跡、防衛機制検出、変化準備度スコアリング

#### Phase G: ターンサマリー最適化
- 精度/速度/コストのトリレンマを検討
- 10-15ターンの会話には`turn_summaries`（ターンごとの1行要約）が最適と判断
- フルRAGや全履歴インジェクションではなく、軽量アプローチを採用

---

### Session 3: CLAUDE.md作成（3/2 00:32）

将来のClaude Codeセッションのためのプロジェクトドキュメントを作成。コマンド、アーキテクチャ、データフロー、外部サービス、環境変数、デザイン規約を文書化。

---

### Session 4: 対話エンジン完全実装（3/2 01:03）

チーム（backend-dev + frontend-devエージェント）による並列実装。

**バックエンド（新規5ファイル、修正2ファイル）:**
- `conversation.ts` — 会話+ターンのCRUDサービス
- `dialogue.ts` — ターン処理パイプライン（特徴抽出→安全チェック→コンテキスト更新→フェーズ遷移→スコアリング→AI応答）
- `dialogue-prompts.ts` — 3つのプロンプトビルダー
- SQL マイグレーション `001_conversations.sql`

**フロントエンド（新規6+ファイル）:**
- 対話ページ（音声インタラクション）
- `DialogueRecordButton` — 最も複雑なコンポーネント
- 対話結果ページ
- ホーム画面にモード選択ボタン追加

---

### Session 5: iOS修正（3/2 01:40、2分）

- iOSセーフエリアの白背景問題を修正（`LaunchScreen.storyboard`の背景色を`#0A0E1A`に）
- モードボタンに説明文追加:
  - RECORD: 「録音 → AIレポート生成」
  - DIALOGUE: 「AIと対話で思考を深掘り」

---

### Session 6: マーケティング戦略策定（3/2 01:59）

創業者がClaude に **CMO / ポジショニングストラテジスト** の役割を付与。

**8フェーズの戦略ドキュメントを策定:**
1. プロダクト本質定義と競合マッピング
2. 7つの詳細ペルソナ（内面の独白、代替手段の限界まで）
3. 10のポジショニング案（強み/弱み/誤認リスク）
4. トップ3選定 + 0/6/18ヶ月ロードマップ
5. コピーバリエーション（ヘッドライン、サブ、LP、App Store、X/Twitter、Note、CTA）
6. 日/英/中のワード共鳴比較
7. 30以上のNG表現リスト（理由と代替表現付き）
8. LP構造とApp Storeコピー

**核心的な洞察:** Kataruは「ボイスメモアプリ」ではない。「声で考えを構造化するシンキングパートナー」。レコーダーとして認知されるリスクを避け、「声→明晰さ」カテゴリを開拓する。

---

### Session 7: マーケティング実装＆LP構築（3/2 02:27）

マーケティング戦略をコードとして実装。GPTクロスレビューによる反復的な改善。

**重要な方針決定:**
- ターゲットを「一人で判断する人」に絞る
- 「分析」ではなく「整理」を使う（ユーザー視点 vs 作り手視点）
- 臨床的な重い用語（感情分析、精神分析、防衛機制等）をエントリーコピーから除去

**最終選定:**
- LPヘッドライン: 「話すだけで、考えが整理される。」
- コアメッセージ: Voice-to-clarity（声から明晰さへ）
- ChatGPTとの差別化: 「何を聞くか考える必要がない」

---

### Session 8: コピー最終仕上げ（3/2 02:56）

- GPTレビューに基づく5ファイル18箇所の編集
- ChatGPT比較セクションをLPに追加
- 全NG用語がユーザー向けコピーから除去されたことを確認

---

### Session 9: Vercelデプロイ — LP公開（3/2 03:24）

- `frontend/out/` をVercel CLIでデプロイ
- ルーティング問題修正（`.html`拡張子→クリーンURL化の`vercel.json`追加）
- **LP公開URL:** `https://out-eta-ivory.vercel.app/landing`

---

### Session 10: Renderデプロイ — アプリ完全公開（3/2 03:36）

- `backend/src/index.ts` を `0.0.0.0` バインドに変更（クラウドプラットフォーム対応）
- GitHubリポジトリ作成・プッシュ: `https://github.com/yamadataro777/kataru`
- Render上のTypeScriptビルドエラー修正（`npm install --include=dev`）
- フロントエンドの`NEXT_PUBLIC_API_URL`をRenderのURLに更新、再ビルド・再デプロイ
- **Renderスリープ対策**: CTAクリック時にヘルスチェックを行い、サーバー起動中はウェイティングリスト登録モーダルを表示

---

## 技術的な意思決定

| # | 決定 | 理由 |
|---|---|---|
| 1 | モノレポ（npm workspaces） | デプロイ調整がシンプル |
| 2 | 静的エクスポート（`next build` → `/out`） | Capacitorラッピングが可能、静的ホスティングが容易 |
| 3 | Web Speech API + Whisperフォールバック | クライアント側でリアルタイム表示、サーバー側で正確な最終文字起こし |
| 4 | `sessionStorage`によるページ間データ受け渡し | 音声blobとトランスクリプトを`/record`→`/processing`間で転送 |
| 5 | フルRAGではなくターンサマリー | 短いセッション（最大15ターン）にはコスト効率が最適、追加約300-450トークン |
| 6 | 3つの質問モダリティの動的選択 | AIがユーザー応答に基づきコーチング/精神分析/アイデンティティから選択 |
| 7 | 累積コンテキストの加重平均 | 新ターン60%、既存コンテキスト40%で段階的な信念/準備度の進化 |
| 8 | 音声コーデック・フォールバックチェーン | MP4 > WAV > WebM でiOS互換性を確保 |
| 9 | Vercel + Render（両方無料枠） | スマートCTAでRenderの15分スリープに対応 |

---

## 最終構成

### デプロイ先

| サービス | URL |
|---|---|
| フロントエンド (Vercel) | https://out-eta-ivory.vercel.app |
| バックエンド (Render) | https://kataru-api.onrender.com |
| ソースコード (GitHub) | https://github.com/yamadataro777/kataru |

### ファイル構成（主要ファイル）

```
Kataru/
├── CLAUDE.md                           # プロジェクト規約
├── package.json                        # ルート（npm workspaces）
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Expressサーバー
│   │   ├── routes/
│   │   │   ├── sessions.ts             # セッションCRUD
│   │   │   ├── transcribe.ts           # Whisper文字起こし
│   │   │   ├── report.ts               # Geminiレポート生成
│   │   │   ├── analytics.ts            # 分析
│   │   │   └── conversations.ts        # 対話エンジンAPI
│   │   ├── services/
│   │   │   ├── supabase.ts             # DBクライアント
│   │   │   ├── storage.ts              # ファイルアップロード
│   │   │   ├── gemini.ts               # AIクライアント
│   │   │   ├── conversation.ts         # 会話CRUD
│   │   │   └── dialogue.ts             # 対話処理パイプライン
│   │   └── prompts/
│   │       ├── report-prompt.ts        # レポート生成プロンプト
│   │       └── dialogue-prompts.ts     # 対話プロンプト
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                # ホーム（モード選択）
    │   │   ├── record/page.tsx         # 録音画面
    │   │   ├── processing/page.tsx     # 処理画面
    │   │   ├── results/page.tsx        # レポート表示
    │   │   ├── dialogue/page.tsx       # 対話モード
    │   │   ├── history/page.tsx        # 履歴一覧
    │   │   ├── analytics/page.tsx      # アナリティクス
    │   │   ├── landing/page.tsx        # ランディングページ
    │   │   ├── globals.css             # カラーパレット
    │   │   └── animations.css          # アニメーション定義
    │   ├── components/
    │   │   ├── ui/                     # GlassCard, NeonButton, HudCorners, ScanLines
    │   │   ├── recording/              # CircularEqualizer, RecordControls, RecordTimer
    │   │   ├── dialogue/               # ConversationBubble, AIResponseDisplay, etc.
    │   │   ├── report/                 # KeyInsights, ReportSection, SentimentGauge, TopicTags
    │   │   └── dashboard/              # RecentSessions, StartModeSelector, StatsGrid
    │   ├── hooks/
    │   │   ├── useAudioRecorder.ts     # Web Audio API録音
    │   │   ├── useAudioVisualizer.ts   # 周波数データ可視化
    │   │   ├── useTranscription.ts     # Web Speech APIリアルタイム文字起こし
    │   │   └── useDialogue.ts          # 対話状態管理
    │   ├── lib/
    │   │   ├── api.ts                  # バックエンドAPI呼び出し
    │   │   ├── marketing-copy.ts       # マーケティングコピー定数
    │   │   └── supabase.ts             # Supabaseクライアント
    │   └── types/
    │       ├── session.ts              # Session, Report型
    │       └── conversation.ts         # Conversation型
    ├── capacitor.config.ts             # Capacitor設定
    └── ios/                            # iOS Xcodeプロジェクト
```

---

## 振り返り

このプロジェクトは、アイデアから公開デプロイまでを**約12時間**で完了した。Claude Codeの並列エージェント機能を活用し、フロントエンドとバックエンドの同時構築、マーケティング戦略の策定、デプロイまでを一気通貫で行った。

**特筆すべき点:**
- 38ファイルの初回ビルドがコンパイルエラー0で完了
- プロダクト開発とマーケティング戦略策定を同一セッションで実施
- GPTとのクロスレビューによるコピーの反復改善
- 「考えすぎる人のための思考整理ツール」というポジショニングの確立
- 臨床用語を避けつつ、深い機能（8フェーズ対話、防衛機制検出、変化準備度スコアリング）を実装

---

---

## 2026-03-03: Stage 1 質問生成ロジック改善（文脈追従型・スロット充足型）

### 問題
Stage 1 Logical/Emotional でLLMが「具体的にどのような状況ですか？」「詳しく教えてください」のような広すぎる質問に逃げる問題。ユーザーが既に答えた情報を踏まえず、情報利得の低い質問を生成していた。

### 原因
- スロットが `string | null` のバイナリ判定で「部分的に埋まっている」を表現できない
- issue_frame（問題の型分類）がなく、全問題を同じ優先順位で処理
- ユーザー発話の語句を引用（アンカリング）する制約がない
- `current_situation` が粗粒度すぎて「状況全般」を広く聞く質問を誘発

### 変更内容

**型定義** (`backend/src/types/conversation.ts`):
- `IssueFrame` 型追加（7種: decision_conflict, priority_conflict, blocked_action, multi_issue_selection, emotional_overwhelm, ambiguity_resolution, situation_mapping）
- `SlotStatus` 型追加（missing/partial/filled + last_evidence）
- `QuestionCandidate` 型追加（text, target_slot, anchoring_phrase, contextuality, information_gain）
- `UtteranceAnalysis` に issue_frame, slot_statuses, question_candidates, question_selection_rationale, anchoring_phrase, answered_slots, do_not_ask_again を追加
- `CoachingContext` に issue_frame, slot_statuses, do_not_ask_again を追加

**プロンプト** (`backend/src/prompts/coaching-prompts.ts`):
- `UTTERANCE_ANALYSIS_INSTRUCTION` を5ステップの手順に改稿（発話解析→issue_frame判定→slot_statuses判定→候補3つ生成→2軸採点で最良1つ選択）
- `ABSOLUTE_PROHIBITIONS` に Stage 1 質問禁止リスト追加（「具体的にどのような状況ですか？」等7パターン）
- `buildStage1LogicalPrompt()`: issue_frame 別の next_to_clarify 優先順位、current_situation をサブ要素（timing_constraints, decision_options等）に分解して聞く指示、アンカリング必須
- `buildStage1EmotionalPrompt()`: 感情語アンカリング必須、issue_frame 別優先順位、選択肢提示型の質問形式
- `formatRunningContext()`: issue_frame, slot_statuses, do_not_ask_again を表示

**サービス** (`backend/src/services/coaching.ts`):
- `mergeUtteranceAnalysisIntoRc()` に issue_frame, slot_statuses, do_not_ask_again の蓄積ロジック追加
- `extractCoachingContext()` で新フィールドを running_context から読み出し

**バリデーター** (`backend/src/services/sectionValidator.ts`):
- `isFilledMeaningfully()` 関数追加: 文字数下限(5文字) + placeholder パターン検出
- `checkSection1Logical()`: 非null だけでなく isFilledMeaningfully でチェック
- `checkSection1Emotional()`: 曖昧な感情語（「なんとなく」「モヤモヤ」のみ）をブロック
- Section 2-4 も isFilledMeaningfully に統一

### 設計判断
- `Stage1LogicalData` / `Stage1EmotionalData` の型は変更しない（フロントエンド影響ゼロ）
- `current_situation` の分解はプロンプト内指示で対応（型は変えない）
- question_candidates の採点は contextuality + information_gain の2軸（5軸は過剰）
- validator の品質チェックは文字数下限 + placeholder 検出に留める（意味的品質はLLM側で制御）

---

## Session: Section 1 再設計 — Goal-Ready 収束フェーズへの転換（2026-03-03）

### 背景・課題
Section 1（整理）が「情報回収の最大化」で設計されていたため会話が長引く問題。
原因は3層: (1) Validator が AND ゲート6条件で厳格すぎる (2) Prompt が「全スロット filled」を目標 (3) turnCount が収束圧に活用されていない。

### 目標
Section 1 を「Goal-ready state をつくる収束フェーズ」に再設計。7ターン以内で Section 2 に進められるようにする。

### 変更内容

**1. Types（`backend/src/types/conversation.ts`）**
- `QuestionFunction` 型追加: 7種（clarify_detail / narrow_scope / choose_focus / define_term / summarize_confirm / convergence_check / bridge_to_goal）
- `GoalReadiness` 型追加: 3段階（not_ready / approaching / ready）
- `QuestionCandidate` に `stage_transition_value` (0-10) と `question_function` を追加
- `UtteranceAnalysis` に `goal_readiness`, `remaining_gaps_for_stage2`, `stage_transition_bias` を追加
- `CoachingTurnResponse` と `CoachingContext` に `goal_readiness` を追加

**2. Validator（`backend/src/services/sectionValidator.ts`）— Dual Track**
- `ValidationResult` を拡張: `strictComplete` / `goodEnoughForStage2` / `softReasons` 追加
- `checkSection1Logical`: Good-enough トラック新設
  - `current_situation`: partial 以上でOK（緩和）
  - `key_factors OR constraints`: いずれか1つでOK（緩和）
  - `decision_needed`: decision_conflict / priority_conflict のみ必須（緩和）
  - 未解決曖昧語: ブロッカーにしない（削除）
- `checkSection1Emotional`: Good-enough トラック新設
  - triggers / conflicts / needs のいずれか1つで可（緩和）
  - `desired_emotional_state`: 不要（削除）
- Stage 2-4: 後方互換（`complete = strictComplete`, `goodEnoughForStage2 = false`）

**3. coaching.ts — 3パス can_advance**
- Stage 1 専用の判定ロジック:
  - Path A: strictComplete + LLM同意 → 即時遷移
  - Path B: goodEnough + turnCount >= 5 + (LLM同意 or goalReadiness=ready) → 遷移
  - Path C: goodEnough + turnCount >= 7 → 強制収束
- `mergeUtteranceAnalysisIntoRc` に goal_readiness マージ追加
- `extractCoachingContext` に goal_readiness 追加
- `checkSection1Logical` に issue_frame パラメータ追加
- Stage 1 では softReasons を優先表示

**4. Prompts（`backend/src/prompts/coaching-prompts.ts`）— フェーズ制御**
- `UTTERANCE_ANALYSIS_INSTRUCTION`: Step 6（goal_readiness 判定）追加
- question_candidates に `stage_transition_value` と `question_function` 追加
- 選択スコア = contextuality + information_gain + stage_transition_value × phase_weight
  - turn 1-3: phase_weight = 0.2 / turn 4-5: 0.5 / turn 6+: 1.0
- `buildStage1LogicalPrompt`: 3フェーズ（現状把握 → 収束 → Goal-ready）
- `buildStage1EmotionalPrompt`: 3フェーズ（感情識別 → 核心収束 → 橋渡し）
- 完了条件を緩和: confidence >= 0.6（0.7から）, current_situation partial 以上
- 質問スタイルルール追加: 「具体的に」2ターン連続禁止、ターン5以降は選択肢型優先
- `ABSOLUTE_PROHIBITIONS` にターン6以降の bridge_to_goal 例外追加
- `formatRunningContext` に goal_readiness 表示追加

**5. demo-dialogue.html — デバッグUI**
- goal_readiness バッジ（not_ready=magenta / approaching=amber / ready=lime）
- remaining_gaps_for_stage2 表示
- question_function ラベル各候補に表示
- stage_transition_value スコア表示
- 分析バーに Goal Readiness チップ追加

**6. Frontend Types（`frontend/src/types/coaching.ts`）**
- バックエンドと同じフィールドを追加（QuestionFunction, GoalReadiness, QuestionCandidate, UtteranceAnalysis拡張, CoachingTurnResponse拡張）

### 設計判断
- `section1_completion_mode` の判定は Validator 側のみで行い、LLM は `goal_readiness` を出力するだけ
- `Stage1LogicalData` / `Stage1EmotionalData` の型は変更しない（下流影響ゼロ）
- 強制収束は7ターンで発動するが、goodEnough 条件を満たしていることが前提
- ターン数は `turn_count_per_stage` ベース（Stage 1 でのターン数のみカウント）

---

## 2026-03-04: Section 1 仮説確認型への全面再設計

### 背景
Section 1 が「理解の完全性」を目指しすぎて7ターン以上かかるケースが多発。
Goal-ready state を短いターン数で作ることに目的を再定義。

### 変更内容

#### 1. 仮説確認型（hypothesis_check）の導入
- `QuestionFunction` 型に `hypothesis_check` を追加（backend/frontend 両方）
- `QuestionCandidate` に `interrogation_risk` フィールドを追加
- `UtteranceAnalysis` に `hypothesis_statement` フィールドを追加
- Stage 1 では hypothesis_check を最優先。clarify_detail は最後の手段
- 返答フォーマット: 反映（1文）→ 暫定仮説（1文）→ 修正を促す1問（1文）

#### 2. ターン別フェーズ戦略
- Turn 1-3: 輪郭把握（hypothesis_check 中心）
- Turn 4-5: 本丸の絞り込み（収束3質問: 今いちばんの論点/何が変われば前進/目標を置くなら何を決めるべきか）
- Turn 6+: Goal-ready化（深掘り禁止、bridge_to_goal 優先）

#### 3. 質問品質ルール
- `interrogation_risk >= 7` の候補は選択禁止
- `summarize_confirm` の連続使用禁止（Turn >= 4）
- 「具体的に」「どのような」「詳しく」の連続使用禁止
- broad clarification（「具体的にどのような状況ですか？」等）の全面禁止

#### 4. 曖昧語の扱い緩和
- Section 2 に進むのを妨げる曖昧さだけ解消。些末な曖昧語は放置
- 定義を直接聞かず、仮説提示で確認

#### 5. decision_conflict 損失仮説
- decision_conflict の場合、Section 1 終了前に最低1回、ユーザーが最も恐れている損失の仮説を返す
- 例: 失敗の怖さ / 挑戦しない後悔 / 安定喪失 / 年齢的な取り返しのつかなさ

#### 6. decision_needed の optional 化
- issue_frame が decision_conflict / priority_conflict の場合のみ必要
- blocked_action / situation_mapping 等では不要

### 変更ファイル
- `backend/src/types/conversation.ts` — QuestionFunction, QuestionCandidate, UtteranceAnalysis 拡張
- `frontend/src/types/coaching.ts` — 同上（ミラー）
- `backend/src/prompts/coaching-prompts.ts` — UTTERANCE_ANALYSIS_INSTRUCTION, buildStage1LogicalPrompt, buildStage1EmotionalPrompt 全面書き換え
- `backend/src/services/sectionValidator.ts` — 変更なし（既存の dual track が要件を満たす）

### 設計原則
Section 1 は「理解の完全性」を目指す場ではない。
Section 2 で目標設定できるだけの Goal-ready state を、だいたい7ターン以内に作る場。

---

## 2026-03-04: Stage 4 Adaptive Branching 再設計

### 背景・課題
Stage 4（確定の調整/コミットメント）に以下の弱点があった:
- ケースによって長すぎる（高 efficacy ユーザーに不要な深掘り）
- self_efficacy の再測定がない（commitment 前後で変化を検証できない）
- review_axes（振り返り軸）がない（次回セッションで検証不可能）
- identity 質問が抽象的（「どんな自分でありたいですか？」は機能しない）
- summary が長くなりがち

### 目標
感動的な締めではなく、**実行抵抗を減らし、commitment を本人の言葉にし、次回レビューで検証可能な形に固定する**。

### 変更内容

#### 1. 型定義の拡張（`backend/src/types/conversation.ts` + `frontend/src/types/coaching.ts`）
- `Stage4Path` 型追加: `'fast' | 'standard' | 'recovery'`
- `Stage4Data` 拡張:
  - `stage4_path`: パス判定結果
  - `self_efficacy_level_initial` / `self_efficacy_level_final` / `self_efficacy_delta`: efficacy の変化追跡
  - `resistance_reframe`: 抵抗の読み替え文
  - `identity_prompt_type`: 使用した identity 質問タイプ（clarity/relationship_integrity/pride/escape_pattern）
  - `review_axes`: 振り返り軸（2-3個）
  - `should_return_to_stage3`: recovery regression フラグ
  - `self_efficacy_level`: 後方互換（= initial）

#### 2. buildStage4Prompt 全面改稿（`backend/src/prompts/coaching-prompts.ts`）
- 関数シグネチャに `stage2Data?: Stage2Data` を追加
- 3パス分岐:
  - **Fast パス** (efficacy >= 8, resistance 低): 2-3ターン、resistance 深掘り不要
  - **Standard パス** (efficacy 6-7 or resistance あり): 3-5ターン、1つの resistance を摩擦 reframe
  - **Recovery パス** (efficacy <= 5): 行動を小さくするか Stage 3 に戻す
- Identity 質問4タイプ（clarity/relationship_integrity/pride/escape_pattern）から文脈選択
- review_axes: Stage 2 の goal_statement + Stage 3 の selected_action に接続
- self_efficacy 再測定: commitment 後に必ず再計測、delta 算出
- 最終 summary 4行制限
- 応答ルール: 「頑張ってください」禁止、AI が commitment 代筆しない
- 初期メッセージ JSON を新スキーマに更新

#### 3. Validator 書き換え（`backend/src/services/sectionValidator.ts`）
- `checkSection4` 完了条件:
  - `should_return_to_stage3 === true` → 即 complete（regression 用）
  - `commitment_statement` が meaningful
  - `self_efficacy_level_final >= 6`（recovery パスは >= 4）
  - `next_check_in_point` が埋まっている
  - `review_axes.length >= 2`

#### 4. Handler 更新
- `Stage4Handler.interface.ts`: `buildPrompt` に `stage2Data?: Stage2Data` 追加
- `DefaultStage4Handler.ts`: 引数更新 + `validateCompletion` を新スキーマに対応（recovery shortcut, review_axes, next_check_in_point チェック）

#### 5. coaching.ts の配線
- Stage 4 のプロンプト構築時に `stage2Data` も渡す
- Stage 4 post-processing: 後方互換（self_efficacy_level ↔ initial 同期）、delta 計算、review_axes 配列保証
- Recovery regression: `should_return_to_stage3` → `should_regress_stage: true` + `regress_to_stage: 3` + running_context の current_stage を 3 に戻す

### 設計判断
- パス判定は Turn 2（efficacy 回答後）に LLM 側で確定し、一度確定したら変更しない
- recovery で efficacy <= 3 は即 regression。4-5 は行動縮小を試みる
- identity 質問は4タイプに限定し、抽象的質問を禁止
- delta が負の場合（commitment 後に自信低下）は追加ケアを促す
- 後方互換: `self_efficacy_level` フィールドを維持し、`self_efficacy_level_initial` と同期

---

## 2026-03-04: Stage 4 Adaptive Branching v2 — 行動変容の再現性向上

### 背景
v1 の50回シミュレーションから6つの構造的欠陥を発見:
1. review_axes が曖昧軸に逃げる（50回中35回）
2. identity_prompt_type が clarity に偏る（50回中28回）
3. negative delta 対処が「行動量を減らす」一辺倒
4. recovery regression 時に Stage 3 への情報パスがない
5. fast パスで self_efficacy_level_final が欠損
6. closing summary が5行以上になる

### 変更内容

#### 1. 型定義（`backend/src/types/conversation.ts` + `frontend/src/types/coaching.ts`）
- `IdentityPromptType` 型追加: `'clarity' | 'relationship_integrity' | 'pride' | 'escape_pattern'`
- `NegativeDeltaCause` 型追加: `'action_too_large' | 'commitment_too_heavy' | 'timeline_pressure' | 'reality_shock' | null`
- `Stage4Data` に `stage3_resize_hint: string | null` と `negative_delta_cause: NegativeDeltaCause` を追加

#### 2. Prompt 改稿（`backend/src/prompts/coaching-prompts.ts`）
- review_axes を3系統に標準化（実行チェック / 目標接近感 / 障害再発チェック）
- identity_prompt_type の選択ルールを issue_frame / obstacles 駆動に変更
- negative delta の3+1パターン分類と原因別処方を追加
- recovery regression 時の stage3_resize_hint 必須化（具体的縮小案）
- fast パスでも self_efficacy_level_final の再測定を必須に
- closing summary の4行制限を強制

#### 3. Validator（`backend/src/services/sectionValidator.ts`）
- `checkSection4`: regression 時に `stage3_resize_hint` が必須条件に

#### 4. Handler（`backend/src/stage-handlers/DefaultStage4Handler.ts`）
- `validateCompletion`: regression 時の resize_hint チェック追加

#### 5. coaching.ts
- 新フィールド（stage3_resize_hint, negative_delta_cause）のデフォルト値処理
- regression 時に stage3_resize_hint を running_context に格納

### 設計判断
- 全改善を「1週間後にユーザー自身で検証できるか」で統一
- identity_prompt_type を4値の union 型に限定（clarity 偏り防止）
- negative delta の原因分類は LLM に判定させ、原因別の処方をプロンプトで指示
- stage3_resize_hint は具体的な縮小案（頻度・時間・対象・場面）を含むこと

### 出力物
- `stage4-improvement-analysis.md` — 問題診断 / 改善方針 / revised schema / prompt改稿版 / validator修正案 / サンプル会話4件 / 互換性注意点

---

## Session: Stage 1 対話の自然化 — 会話テンポ改善（2026-03-04）

### 背景・問題
Stage 1 の対話が「AIっぽい」3つの問題:
1. 相槌/要約が毎ターン（「〜なのですね」「ありがとうございます」）→ テンポが悪い
2. 二択仮説チェック（「AですかBですか？」）が毎回 → 不自然
3. ユーザーの否定（「いや違う」）への反射が遅い → 聞いてない感

### 変更内容

**`backend/src/prompts/coaching-prompts.ts`（主変更）:**
- UTTERANCE_ANALYSIS_INSTRUCTION: Step 3.5 仮説をカジュアル単発アサーションにデフォルト変更。二択は3場面限定
- Step 3.6 新設: `user_denied_previous` 判定ステップ（否定シグナル検出）
- Step 4: hypothesis_check 必須→優先に変更。denial 時は修正志向質問を含める
- Step 5: denial 時はスコア無関係に修正志向候補を選択。直前仮説参照禁止
- JSON_SCHEMA_INSTRUCTION: `user_denied_previous` フィールド追加
- ABSOLUTE_PROHIBITIONS: 相槌テンプレ禁止（節目ターンのみ許可）、二択デフォルト禁止を追加
- buildStage1LogicalPrompt: 応答フォーマットを自然会話調に全面書き換え（デフォルト/節目/否定時/二択限定の4パターン）
- 質問スタイル: 「ターン5以降は選択肢型優先」を削除、要約頻度制御・denialルール追加
- 良い例をカジュアルな会話調に更新
- buildStage1EmotionalPrompt: 同様のミラー改修

**`backend/src/types/conversation.ts`:**
- `UtteranceAnalysis` に `user_denied_previous?: boolean` 追加

**`frontend/src/types/coaching.ts`:**
- 同上ミラー

### 設計判断
- 変更なしのファイル: `coaching.ts`（3パス can_advance ロジック維持）、`sectionValidator.ts`（完了条件維持）
- 相槌は完全禁止ではなく「節目ターン（3の倍数）のみ許可」で自然さを保持
- 二択仮説は「損失仮説」「decision_conflict収束」「抽象停滞」の3場面に限定
- 否定対応は型追加（optional boolean）のみで破壊的変更なし

---

## Session: Stage 4 改善 — 行動実行率とレビュー質の向上（2026-03-04）

### 背景
Stage 4 シミュレーション10セッションのレビューで9つの問題パターンを検出。adaptive branching の方向性を維持しつつ、行動実行率を上げ、次回レビューで検証可能な形に固定することが目的。

### 変更ファイル（6ファイル）

**`backend/src/types/conversation.ts` + `frontend/src/types/coaching.ts`:**
- `NegativeDeltaResponseType` 型追加（`'quantity_reduce' | 'wording_lighten' | 'timeframe_extend_or_environment_shift' | null`）
- `Stage4Data` に `negative_delta_response_type` と `medical_safety_note` フィールド追加

**`backend/src/services/sectionValidator.ts`:**
- `checkSection4` に3条件追加: 初期/最終 efficacy の null チェック、delta < 0 時の原因未記録チェック

**`backend/src/stage-handlers/DefaultStage4Handler.ts`:**
- `validateCompletion` に同じ3条件を追加して validator と一致させた

**`backend/src/services/coaching.ts`:**
- Stage 4 後処理に `negative_delta_response_type` / `medical_safety_note` のデフォルト設定
- 整合性チェック: delta < 0 で cause あり response_type なし → `quantity_reduce` フォールバック

**`backend/src/prompts/coaching-prompts.ts`:**
- 1ターン1質問ルールを Stage 4 冒頭に明示（問題 #1）
- Fast/Standard/Recovery のターン順序を明示化（問題 #1, #2）
- `identity_prompt_type` の clarity デフォルト禁止、文脈連動選択ルール（問題 #5）
- `review_axes` を3系統（実行チェック/目標接近感/障害再発）に標準化（問題 #4）
- Negative Delta の cause→response_type ペア記録を強制（問題 #6）
- 医療的安全弁セクション追加（問題 #8）
- reframe バリエーション指示追加（問題 #7）
- Stage 4 固有禁止ルール6項目追加
- 完了条件に initial/final null 不可、delta < 0 → cause 必須を追加
- `buildInitialMessagePrompt` Stage 4 に新フィールド追加

### 設計判断
- 全変更は optional/nullable で後方互換を維持（既存データに破壊的変更なし）
- `negative_delta_response_type` は cause と1:1ペアで記録し、原因診断なしの量削減を防止
- 医療的安全弁は1セッション最大1回、assistant_message 末尾に添える形で流れを壊さない設計
- identity_prompt_type は上から順の if-else 判定で clarity が最後の手段になるよう順序付け

---

## 音声入力ストレステスト シミュレーション（2026-03-04）

### 背景
Stage 4 改善（9問題パターン修正）の実装完了後、**現実的な音声入力**でのAI返答精度を検証する必要があった。既存 `simulation-10-sessions.md` は整ったテキスト入力のみで、音声認識特有の問題（誤変換、長文ランブリング、話題ジャンプ等）をカバーしていなかった。

### 成果物
`simulation-voice-stress-test.md` — 6セッション × Section 1-4 全フローのシミュレーション

### セッション一覧
1. **哲学 — 人生の意味の喪失感** (emotional/standard) — 超長文ランブリング・自己矛盾・フィラー多用
2. **ビジネス — スタートアップの方向性麻痺** (logical/fast) — 誤変換多発（EdTech→絵でテック、AI→愛、SaaS→差す）
3. **学校生活 — 高校生の複合プレッシャー** (logical/recovery) — 話題ジャンプ4方向・医療安全弁（不眠+食欲低下）
4. **恋愛 — 失恋後の自己否定** (emotional/standard) — 感情的長文・同音異義語（魅力→実力、未練→見れん）
5. **夫婦関係のヒビ — 居場所の喪失** (logical→mode switch提案/recovery) — 誤変換（居場所→入場書、離婚→理混）・医療安全弁（酒量増加）
6. **心理学/学問 — インポスター症候群の院生** (emotional/standard+neg-δ) — 学術用語誤変換（バンデューラ→番手裏）・パニック発作+食欲低下

### 検証結果
全9パターン（P1〜P9）× 各2-3セッションでカバー。**全項目 PASS。**
- Stage 4 の3パス（fast/standard/recovery）+ negative delta すべて網羅
- identity_prompt_type: 4タイプ中4タイプ使用（clarity はS1のみ正当使用）
- reframe: 3バリエーション使用（義務→実験、恐怖→検証、完璧→70%）
- 医療安全弁: S3(必須), S5(ボーダーライン→安全優先), S6(必須) すべてトリガー
- 誤変換: 11パターンすべて文脈から正しく解釈

---

## Stage 4 対話エンジン改善（2026年3月4日）

音声入力ストレステストの結果を踏まえ、Stage 4 の境界条件を改善。

### 変更内容

1. **型定義拡張** (`conversation.ts`, `coaching.ts`)
   - `NegativeDeltaCause` に 3 原因追加: `comparison_spiral`, `plan_too_large`, `social_risk_spike`
   - 新 union types: `RecoverySubpath`, `MedicalSafetySeverity`, `ReviewAxisType`, `ClosingSummaryStyle`, `NormalizedTermEntry`
   - `Stage4Data` に 14 新フィールド追加（transcript normalization, recovery subpath, negative delta strengthening, medical safety severity, review axes standardization, path-specific closing）
   - `UtteranceAnalysis` に transcript normalization フィールド追加

2. **Validator 更新** (`sectionValidator.ts`)
   - `soft_complete` パス追加（efficacy 閾値不要、`requires_priority_followup` 必須）
   - `recovery_subpath === 'light_commit'` → efficacy >= 4 で完了可
   - `review_axis_types` の有効値検証

3. **DefaultStage4Handler 同期** (`DefaultStage4Handler.ts`)
   - `validateCompletion()` に `soft_complete` パスと `recovery_subpath` 分岐追加

4. **Coaching Service 後処理** (`coaching.ts`)
   - 全14新フィールドのデフォルト初期化
   - `recovery_subpath` 自動導出（final efficacy ≤3 → regress, 4-5 → light_commit, ≥6 → commit）
   - `negative_delta` 追跡（発生・回復・未回復時の soft_complete 自動設定）
   - `medical_safety_severity` 自動判定（正規表現による severe 組み合わせ検出）
   - `closing_summary_style` 自動選択
   - `mergeUtteranceAnalysisIntoRc` に `normalized_terms` 蓄積ロジック追加

5. **プロンプト改稿** (`coaching-prompts.ts`)
   - Transcript Normalization ポリシー追加
   - Recovery Light Commit フロー明文化
   - Negative Delta 完了強化（新原因 3 種 + soft_complete ルール）
   - Medical Safety Severity 判定基準追加
   - Review Axes 標準化 + 品質スコア（review_axis_quality_score）
   - パス別 Closing Summary（fast/standard/recovery_light_commit/safety_shortened）
   - JSON スキーマに全14新フィールド追記
   - 完了条件サマリー更新
   - Stage 4 初期メッセージの extracted_data にデフォルト値追加

### v2 ストレステスト改善（堅牢化パッチ）

v2 ストレステスト（10セッション + 音声入力ストレス）は全体合格。ただし境界条件の扱いに甘さがあったため、以下のガードレール追加を実施:

1. **Schema 拡張**
   - `NegativeDeltaResponseType` に `'comparison_reframe'` を追加（他者比較→自己比較への専用リフレーム）
   - `UtteranceAnalysis` に `theory_drift_guard_triggered` フィールドを追加

2. **Validator 強化（sectionValidator.ts）**
   - G4: `negative_delta_occurred + delta < 0` で `soft_complete` 未設定時のセーフティネット追加
   - G5: `recovery_light_commit` 時の短い check-in（24-72h）検証追加

3. **Theory Drift Guard（coaching-prompts.ts）**
   - 全ステージ共通の `ABSOLUTE_PROHIBITIONS` に理論逃避防止ルールを追加
   - 哲学・心理学・社会学等の学術領域での理論議論をAIに禁止
   - ユーザーが理論語を使った場合は感情・選択・行動に接続する質問に限定

4. **Negative Delta 6c セクション更新**
   - `comparison_spiral` の対応 response_type を `wording_lighten` → `comparison_reframe` に変更

5. **Coaching Service（coaching.ts）**
   - `mergeUtteranceAnalysisIntoRc` に `theory_drift_guard_triggered` のマージ処理追加

6. **仕様書出力**
   - `v2-improvement-spec.md` を新規作成（問題診断、全ポリシー、サンプル会話、差分メモ）

---

### セッション7: Theory Discussion Mode（理論ディスカッションモード）実装
**日時:** 2026年3月4日

**方針転換:** Theory Drift Guard（理論議論禁止）を撤廃し、逆方向の Theory Discussion Mode を実装。ユーザーが理論語を使ったら、ゴール設定を忘れて最大10ターン議論に集中 → その後、概念をゴールに活かす議論へ移行。

**変更内容:**

1. **Schema 変更（conversation.ts / frontend coaching.ts）**
   - `UtteranceAnalysis.theory_drift_guard_triggered` → `theory_topic_detected: string | null` に置換
   - `CoachingContext` に `theory_mode_active`, `theory_mode_turn_count`, `theory_mode_concept` 追加

2. **Prompt 変更（coaching-prompts.ts）**
   - `ABSOLUTE_PROHIBITIONS` から Theory Drift Guard セクション全削除
   - `UTTERANCE_ANALYSIS_INSTRUCTION` に Step 6.5（theory_topic_detected 判定）追加
   - JSON スキーマに `theory_topic_detected` 追加
   - `buildTheoryModeInstruction` ヘルパー関数新設（pure discussion / bridge phase の2段階指示）
   - `buildStage1LogicalPrompt` / `buildStage1EmotionalPrompt` で theory mode 中は phaseInstruction を上書き
   - `formatRunningContext` に theory mode 表示追加

3. **Service ロジック変更（coaching.ts）**
   - `mergeUtteranceAnalysisIntoRc`: `theory_drift_guard_triggered` → `theory_topic_detected` に変更
   - `extractCoachingContext`: theory mode フィールド追加
   - `processCoachingTurn`: Theory Discussion Mode ライフサイクル追加
     - Entry: 理論語検出 → mode 発動
     - Increment: ターンカウント +1
     - Exit: 10ターン到達 → mode 終了
     - Effective turn count: theory turns を除外（7ターン強制収束を回避）
     - can_advance: theory mode 中は強制 false

4. **ドキュメント更新**
   - `v2-improvement-spec.md`: Theory Drift Guard → Theory Discussion Mode に書換
   - `DEVELOPMENT_HISTORY.md`: 変更ログ追記

---

## 2026年3月5日: マネタイズ基盤・認証・課金システム導入

### Phase 1: ローンチ基盤

1. **Supabase Auth 導入**
   - `profiles` テーブル新設（plan, session_count, free_sessions_used, stripe_customer_id）
   - `sessions`, `coaching_conversations`, `feedback` テーブルに `user_id` カラム追加
   - RLS ポリシー: ユーザーは自分のデータのみアクセス可能
   - バックエンド認証ミドルウェア (`requireAuth`, `optionalAuth`) で JWT 検証
   - フロントエンド `AuthContext` + `AuthGuard` コンポーネント
   - ログイン/サインアップページ (`/login`)
   - 全 API リクエストに自動で auth token 付与

2. **セッション管理の DB 移行**
   - `session-tracker.ts` を localStorage → Supabase クエリベースに書き換え
   - `FREE_SESSION_LIMIT = 5`（2 → 5 に緩和）
   - `UserPlan = 'free' | 'lite' | 'standard'` に拡張
   - バックエンドで `canCreateSession()` による制限チェック
   - レポートプラン決定もバックエンドで（フロントエンドからの改ざん防止）

3. **Render コールドスタート対策**
   - ランディングページ読み込み時に `/health` に事前 ping

### Phase 2: 課金基盤

4. **Stripe 連携**
   - Checkout セッション作成（`/api/stripe/checkout`）
   - Customer Portal（`/api/stripe/portal`）
   - Webhook でプラン変更を DB に自動反映
   - `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` イベント処理

5. **3段階プラン設計**
   - Free: ¥0 / 月5回 / 要約レポート / 保存7日
   - Lite: ¥580/月 / 月15回 / 詳細レポート / 永久保存
   - Standard: ¥1,480/月 / 無制限 / 詳細レポート / 対話モード / 月次分析 / 永久保存
   - プライシングページ (`/pricing`) 新設

### Phase 3: 体験最適化

6. **段階的アンロック**
   - Session 1: Free レポート（intro）
   - Session 2: Free レポート + 有料機能ティーザー（teaser）
   - Session 3: 有料レポートフル表示（full_preview）— 1回限定
   - Session 4: 対話モードプレビュー Stage 1-2（dialogue_preview）— 1回限定
   - Session 5+: ペイウォール（exhausted）
   - `getSessionPhase()` 関数で段階を管理

7. **テキスト入力モード追加**
   - `/record` ページに VOICE / TEXT 切り替えタブ追加
   - テキスト入力 → 同じ Gemini パイプラインでレポート生成
   - 声を出せない環境でも Kataru を使用可能に
   - 50文字以上のバリデーション

### 技術的変更点

- **新規ファイル:**
  - `backend/src/middleware/auth.ts` — JWT 認証ミドルウェア
  - `backend/src/services/profile.ts` — ユーザープロファイル管理
  - `backend/src/services/stripe.ts` — Stripe クライアント
  - `backend/src/routes/auth.ts` — プロファイル取得 API
  - `backend/src/routes/stripe.ts` — Checkout/Portal/Webhook API
  - `backend/src/migrations/003_auth_and_plans.sql` — DB マイグレーション
  - `frontend/src/contexts/AuthContext.tsx` — 認証コンテキスト
  - `frontend/src/components/auth/AuthGuard.tsx` — 認証ガード
  - `frontend/src/app/login/page.tsx` — ログインページ
  - `frontend/src/app/pricing/page.tsx` — プライシングページ

- **変更ファイル:**
  - 全バックエンドルートに `requireAuth` ミドルウェア追加
  - `session-tracker.ts` 完全書き換え（localStorage → DB ベース）
  - `api.ts` に auth header 自動付与
  - `layout.tsx` に `AuthProvider` ラッパー追加
  - `FeedbackClient.tsx` に 3 段階プラン表示

---

## 2026-03-05: Stripe → RevenueCat (Apple IAP) 差し替え

### 背景
iOSアプリとして配布する場合、Apple規約によりアプリ内デジタルコンテンツの販売はApp Store IAP必須。Stripe は使用不可。

### 変更内容

1. **Stripe コード全削除**
   - `backend/src/services/stripe.ts` 削除
   - `backend/src/routes/stripe.ts` 削除
   - `backend/package.json` から `stripe` 依存削除
   - `profiles` テーブルから `stripe_customer_id`, `stripe_subscription_id` カラム削除
   - `frontend/src/lib/api.ts` から `createCheckoutSession`, `createPortalSession` 削除

2. **RevenueCat Webhook 実装** (`backend/src/routes/revenuecat.ts`)
   - Bearer token 認証（`REVENUECAT_WEBHOOK_AUTH_TOKEN`）
   - `app_user_id` = Supabase user UUID
   - イベント処理: INITIAL_PURCHASE / RENEWAL / UNCANCELLATION → plan 更新, PRODUCT_CHANGE → 新 plan 更新, EXPIRATION / BILLING_ISSUE → free に戻す, CANCELLATION → 何もしない
   - Product ID マッピング: `kataru_lite_monthly` → `lite`, `kataru_standard_monthly` → `standard`

3. **RevenueCat SDK ラッパー** (`frontend/src/lib/revenuecat.ts`)
   - `@revenuecat/purchases-capacitor` を使用
   - `initRevenueCat(userId)` — ネイティブ環境でのみ初期化
   - `getOfferings()` / `purchasePackage()` / `restorePurchases()`
   - `isNativePlatform()` — Web/ネイティブ判定

4. **Pricing ページリライト** (`frontend/src/app/pricing/page.tsx`)
   - ネイティブ: RevenueCat offerings → 購入ボタン → purchasePackage → refreshProfile
   - Web: 「iOSアプリからご購入ください」メッセージ
   - 「購入を復元」ボタン追加
   - 「サブスクリプション管理」→ Apple サブスクリプション管理ページを開く

5. **AuthContext に RevenueCat 初期化追加**
   - セッション取得後・認証状態変更時に `initRevenueCat(user.id)` 呼び出し

6. **DB マイグレーション** (`backend/src/migrations/004_revenuecat_migration.sql`)
   - `stripe_customer_id`, `stripe_subscription_id` カラム削除
   - `idx_profiles_stripe_customer_id` インデックス削除

### 環境変数
- **削除**: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_LITE`, `STRIPE_PRICE_STANDARD`, `STRIPE_WEBHOOK_SECRET`
- **追加**: `REVENUECAT_WEBHOOK_AUTH_TOKEN` (backend), `NEXT_PUBLIC_REVENUECAT_IOS_KEY` (frontend)

---

## P0: Vessel思想統合 — 「育てる」構造の導入 (2026-03-08)

### 背景
INTP_Youtube_Videoプロジェクトで定義された「思考整理アプリ Vessel」の設計思想から、Kataruの既存アーキテクチャに適合する要素を統合。ワンショット分析ツールから「思考を育てる」ツールへの転換の第一歩。

### 変更内容

#### 1. 「あなたの結論」フィールド追加
- **DB**: `sessions`テーブルに`user_conclusion`カラム追加（migration 005）
- **Backend**: `PATCH /api/sessions/:id`エンドポイント追加（user_conclusion更新用）
- **Frontend API**: `updateSession()`関数追加
- **ResultsClient**: レポート末尾に結論入力フィールド（GlassCard lime variant）
- ユーザーがAIレポートを読んだ後、自分の言葉で「結局どう思う？」を記録できる場所を提供

#### 2. レポートラベルのリフレーミング
- 「ANALYSIS REPORT」→「AIの見立て」に変更
- AIの出力を「答え」から「思考の叩き台」に位置づけ転換
- 機能変更なし、フレーミングのみ

#### 3. 「未回答」バッジ（History画面）
- 結論未記入のcompletedセッションに「未回答」バッジを表示
- ユーザーが再訪・結論記入すべきセッションを視覚的に識別可能に

### 設計判断
- Vesselの「プロセス」ではなく「原理」を取り込む方針
- AIレポートの質は維持しつつ、ラベルとレイアウトで「叩き台」化
- 結論記入は強制しない（存在するだけで意味がある設計）
- サイバーパンクHUD美学は変更なし

---

## Step 3（時間的隔離）+ Step 4（批判的再訪）実装 — 2026-03-08

YouTube台本で提示した5ステップ思考フレームワークのうち、Step 3（寝かせる）とStep 4（批判的再訪）を実装。

### 実装内容

#### Step 3: 時間的隔離（Incubation）
- **Results画面: 熟成メッセージ** — セッション経過時間に応じた3段階のメッセージ表示（<24h / 1-3日 / 3日+）。結論未記入時のみ表示
- **History画面: 熟成バッジ** — 「未回答」バッジを時間認識型に拡張（寝かせ中 / 再考の時）
- **Home画面: 再考プロンプト** — 3日以上経過・結論未記入のセッションを最大3件表示

#### Step 4: 批判的再訪（Critical Revisit）
- **Results画面: 前回の思考** — 同一トピックの過去セッションで書かれた結論を表示し、思考の変化を促す
- **トピッククリッカブル化** — TopicTags・RecurringThemesのタグをタップ→`/history?topic=X`に遷移
- **History: トピックフィルタ** — `/history?topic=キャリア`でフィルタ表示、結論プレビュー付き
- **Backend: topicクエリパラメータ** — `GET /api/sessions?topic=X` でJS側フィルタ

### 変更ファイル
- `frontend/src/app/results/ResultsClient.tsx` — 熟成メッセージ + 前回の思考
- `frontend/src/app/history/page.tsx` → Suspenseラッパーに分離
- `frontend/src/app/history/HistoryClient.tsx` — 熟成バッジ + トピックフィルタ + 結論プレビュー（新規）
- `frontend/src/app/page.tsx` — 再考プロンプトセクション
- `frontend/src/components/report/TopicTags.tsx` — クリッカブル化
- `frontend/src/components/analytics/RecurringThemes.tsx` — クリッカブル化
- `backend/src/routes/sessions.ts` — topicクエリパラメータ追加

### 設計判断
- プッシュ通知は入れない（APNs + バックエンドスケジューラ工数が大きい。アプリ内UIで十分）
- 新規DBテーブルなし（既存の`report->'topics'` JSONBをJS側でフィルタ）
- History画面をpage.tsx + HistoryClient.tsxに分離（Next.js Suspense要件）

*このドキュメントは2026年3月8日時点の開発状況を記録したものです。*
