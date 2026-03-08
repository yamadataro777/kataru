# Git Worktree Log

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
