# Git Worktree Log

## 2026-03-14 (Phase 10)
- **Branch**: main
- **Action**: commit
- **Commit**: (pending)
- **Changes**: Phase 10 特定領域アダプタ — registry.ts/detect.ts/016_domain_adapters.sql (新規)、thinking-companion-prompt.ts adapterContext注入、round.ts 4段階flag+session/question拡張、StartModeSelector ショートカット、record adapter param、api.ts createRoundSession拡張、smoke.ts検証スクリプト

## 2026-03-13 (Phase 9)
- **Branch**: main
- **Action**: commit + push
- **Commit**: 630b3a6 — feat: Phase 9 ユーザー選択式延長 — R3後に最大5Rまでユーザー主導で延長
- **Changes**: 015_session_extension.sql（max_rounds_allowed + CHECK + トリガー + extend_session RPC）、round.ts extend/extension-event エンドポイント + feature flag + 409 handling + telemetry、thinking-companion-prompt.ts R4/R5 scopeGuide + buildContextV2 動的化、record/page.tsx extending Phase + 5ドット + handleExtend/handleEndSession、api.ts extendRoundSession/submitExtensionEvent

## 2026-03-13 (Phase 8)
- **Branch**: main
- **Action**: commit + push
- **Commit**: 7a3e717 — feat: Phase 8 Trust Memory — shadow mode蓄積・Gate 8 A/B基盤
- **Changes**: 014_trust_memory.sql、trust-memory.ts（テーマ抽出/decay/CAS）、round.ts R1 preload+snapshot+summary更新+gate8-evaluation、prompt trustMemoryHint注入、auth.ts GET/DELETE trust-memory、api.ts Trust Memory API、Settings MEMORY UI、record Gate8評価UI

## 2026-03-13 (Phase 7)
- **Branch**: main
- **Action**: commit + push
- **Commit**: e6f7d91 — feat: Phase 7 Maybe（仮説スロット）— R3限定の控えめな仮説提示
- **Changes**: sanitizeMaybe/clampMaybe、プロンプトMaybeセクション、round.ts clampMaybe統合（Reroll depth 2系統分離）、013_maybe_slot.sql、フロントlime色Maybeカード

## 2026-03-13 (Phase 5)
- **Branch**: main
- **Action**: commit + push
- **Commit**: 7f14ae5 — feat: Phase 5 軽量なモード方向感 — プロンプト中心の分化
- **Changes**: mode判定precedence + mode別ルール/禁止/Few-shot置換、mode×ラウンド補足、生成手順追加、summary timeout分離

## 2026-03-13 (Phase 4)
- **Branch**: main
- **Action**: commit + push
- **Commit**: 6d3e297 — feat: Phase 4 まとめ画面V2 — 思考の軌跡フォーマット
- **Changes**: SummaryV2(journey/awareness/next_step)、DB読み取り正規経路、extractive fallback、V1/V2分岐UI

## 2026-03-13
- **Branch**: main
- **Action**: commit + push
- **Commit**: 3646a3a — feat: Phase 3 失敗回復UX — リロール・リセット機能
- **Changes**: POST reroll/DELETE round エンドポイント、buildRerollConstraint、フロントUI（別の問いを見る/取り消し）、Gemini maxOutputTokens修正

## 2026-03-12
- **Branch**: main
- **Action**: commit + push
- **Commit**: 1df815b — feat: Thinking Companion + Marketing壁打ち + Echo/Sense/Next汎用化
- **Changes**: TC統合(Echo/Sense/Next対話・危機検知・フォールバック)、Marketing壁打ちモード、Echo/Sense/Nextスタブ除去+汎用化、Round analyticsマイグレーション、フロントエンドTC/Marketing UI

## 2026-03-10 (思考の交通整理アプリへの変革)
- **Branch**: intp-record-specification
- **Action**: 実装完了（未コミット）
- **Changes**: Report型3カード構造、質問ライブラリ改修、介入ロジック4トリガー化、QuestionTray、Results 3カード化、Home巨大CTA、Archive新規作成、BottomNav ARCHIVE化

## 2026-03-10 (dead code evacuation + silence fix)
- **Branch**: simple-record
- **Action**: commit + push
- **Commit**: 3871b7d — Evacuate 15 dead code files + fix silence intervention animation
- **Changes**: 15ファイルを~/Desktop/kataru-evacuated/に避難、api.tsから3関数削除、沈黙介入の初回遅延バグ修正、質問クリア機能追加

## 2026-03-10 (silence gauge)
- **Branch**: simple-record
- **Action**: commit + push
- **Commit**: d055387 Add silence gauge ring around CircularEqualizer for visual intervention feedback
- **Changes**: SilenceGauge.tsx新規、useAdaptiveInterventionにsilenceProgress追加、record/pageに統合

## 2026-03-10
- **Branch**: simple-record
- **Action**: commit + push
- **Commit**: 73dca12 Adaptive question generation: context-aware 3-tier intervention system
- **Changes**: useAdaptiveIntervention.ts新規作成、question-library.ts拡張（ナッジ・感情検知・スコアリング）、StimulusPrompt.tsxナッジ表示対応、旧useQuestionIntervention.ts削除

## 2026-03-09 (brain dump AI questions)
- **Branch**: main
- **Action**: commit + push
- **Commit**: 547bb41 — Add AI-powered brain dump questions using Gemini Flash
- **Changes**: 静的質問→Gemini Flash AIリアルタイム質問生成。backend prompt/route/gemini追加、frontend hook/API/UI更新

## 2026-03-09 (dev features)
- **Branch**: main
- **Action**: commit + push
- **Commit**: 9eac3eb — Re-implement dev features guarded by NEXT_PUBLIC_DEV_AUTH_BYPASS env var
- **Changes**: 7ファイルにdev bypass/DEV MODE/overridePlan/dev-userを再実装。全てenv varガード付き

## 2026-03-09
- **Branch**: kaizen-hypothesis
- **Action**: commit + push
- **Commit**: 7b6c54a — Remove all dev bypass and DEV MODE features for App Store submission
- **Changes**: 7ファイルから111行削除。DEV MODE 5タップ、overridePlan、devBypass、X-Dev-Bypassヘッダー、dev-userフェイクプロファイルを全削除

## 2026-03-09
- **Branch**: main
- **Action**: merge (fast-forward) + push
- **Commit**: 7b6c54a — kaizen-hypothesis → main マージ
- **Changes**: App Store提出用のdev bypass全削除をmainに統合

## 2026-03-08
- **Branch**: kaizen-hypothesis
- **Action**: commit + push
- **Commit**: Fix iOS dialogue transcription: remove timeslice and upgrade Whisper model
- **Changes**: useAudioRecorder start(250)→start()でiOS MP4チャンク破損を解消。coaching transcribeをgpt-4o-transcribeに統一、ハルシネーション除去追加。

## 2026-03-08
- **Branch**: kaizen-hypothesis
- **Action**: commit + push
- **Commit**: c9fc3b3 Split dialogue transcription and AI analysis into separate requests for iOS
- **Changes**: iOS WKWebView対応 — Whisper文字起こしとGemini分析を2リクエストに分割してRenderタイムアウト回避。TRANSCRIBING UIステート追加。

## 2026-03-06 (session start)
- **Branch**: Record-exp-improve
- **Action**: commit + push
- **Commit**: a1c7f97 — Add silence-triggered stimulus questions during recording
- **Changes**: 無音検知→刺激質問表示システム。useSilenceDetector hook、StimulusPromptコンポーネント、質問プールデータ、record/page.tsx統合オーバーレイ追加

## 2026-03-06
- **Branch**: Record-exp-improve
- **Action**: commit + push
- **Commit**: d5279c3 — Add git worktree logging rule to CLAUDE.md and initialize log
- **Changes**: CLAUDE.mdにgit worktree記録ルール追加、GIT_WORKTREE_LOG.md新規作成

## 2026-03-06
- **Branch**: main
- **Action**: merge (fast-forward) + push
- **Commit**: d5279c3 — Record-exp-improve → main マージ
- **Changes**: 刺激質問システム + worktreeログルールをmainに統合

## 2026-03-06
- **Branch**: main
- **Action**: commit + push
- **Commit**: f363f45 — Add hidden dev mode: 5-tap version label unlocks standard plan
- **Changes**: 設定画面にバージョン表示追加、5回タップでstandard plan切替。AuthContextにoverridePlanメソッド追加

## 2026-03-08
- **Branch**: main
- **Action**: commit + push
- **Commit**: d0c06cf — Improve App Store submission readiness
- **Changes**: RevenueCatテストキー警告、Error Boundary追加、PrivacyInfo.xcprivacy API宣言追加、LaunchScreen AutoLayout化、オフラインバナー追加

## 2026-03-09
- **Branch**: question-generation-brain-dump
- **Action**: commit + push
- **Commit**: 23c879c Remove text input mode and simplify record page UI
- **Changes**: Record画面からテキスト入力モード・ガイダンスボックス削除、ヘッダー簡素化、質問表示をdissolveせず残す

## 2026-03-10
- **Branch**: question-generation-brain-dump
- **Action**: commit + push
- **Commit**: 4a10e7e Hide dialogue feature from UI while preserving code
- **Changes**: Dialogue機能をUI非表示化（SHOW_DIALOGUEフラグ制御）、pricing/feedbackに近日公開表記追加

## 2026-03-10
- **Branch**: simple-record
- **Action**: commit + push
- **Commit**: 5e9e8b4 Replace API-based question generation with silence-triggered local library
- **Changes**: useBrainDumpQuestions(API方式)→useQuestionIntervention(沈黙検知+ローカル32問ライブラリ)に完全置換。useSilenceDetectorをref方式に書き換え。

## 2026-03-10
- **Branch**: simple-record
- **Action**: commit + push
- **Commit**: 9240da1 Fix silence detection: use transcript updates instead of audio levels
- **Changes**: 沈黙検知をAnalyserNode音声レベル→Web Speech API transcript更新停止ベースに変更。雑音環境でも正しく発話停止を検知。

## 2026-03-10
- **Branch**: simple-record
- **Action**: commit + push
- **Commit**: 7f3d8e9 Handle aborted speech recognition error gracefully on iOS
- **Changes**: iOS WKWebViewのWeb Speech API `aborted`エラーを静かに処理。エラー表示せず録音継続、再起動ループ防止。
