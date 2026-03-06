# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principles

- **Simplicity First**: 変更は最小限に。影響するコードを最小にする。
- **No Laziness**: 根本原因を突き止める。一時的な修正は禁止。シニアエンジニア基準。
- **Minimal Impact**: 必要な箇所だけを変更し、バグの導入を避ける。

## Workflow

### Plan → Build → Verify
1. 非自明なタスク（3ステップ以上 or アーキテクチャ判断を伴う場合）は必ず **plan mode** に入る
2. 問題が発生したら即座に止まり、再プランする — 無理に進めない
3. タスク完了前に必ず動作を検証する（テスト実行、ログ確認、差分チェック）
4. 「スタッフエンジニアがこれを承認するか？」を自問する

### Subagent Strategy
- メインコンテキストを汚さないよう、調査・探索・並列分析はサブエージェントに委任する
- 1サブエージェント = 1タスクで集中実行

### Autonomous Bug Fixing
- バグ報告を受けたら、質問せずにまず自分で修正する
- ログ・エラー・失敗テストを確認し、自律的に解決する
- ユーザーにコンテキストスイッチを求めない

### Elegance Check
- 非自明な変更には「もっとエレガントな方法はないか？」と立ち止まる
- ハック的に感じたら、知識を総動員してエレガントな解決策を実装する
- 単純で明白な修正にはこのステップを飛ばす — 過度な設計は避ける

## Task Management

1. **Plan First**: `tasks/todo.md` にチェック可能な項目で計画を書く
2. **Verify Plan**: 実装開始前にユーザーと確認する
3. **Track Progress**: 進捗に応じて項目を完了にする
4. **Explain Changes**: 各ステップでハイレベルなサマリを出す
5. **Document Results**: `tasks/todo.md` にレビューセクションを追記する
6. **Capture Lessons**: ユーザーから修正を受けたら `tasks/lessons.md` にパターンを記録し、同じミスを防ぐルールを書く

## 開発ログ

すべての開発における指示・決定事項・変更内容は `DEVELOPMENT_HISTORY.md` に記録すること。新しい機能追加、設計変更、バグ修正などを行う際は、その内容と理由をログとして追記する。

## Git Worktree 記録

commit・push・branch操作を行うたびに、`GIT_WORKTREE_LOG.md` に以下を追記すること:

```
## YYYY-MM-DD HH:MM
- **Branch**: ブランチ名
- **Action**: commit / push / merge / branch作成 など
- **Commit**: ハッシュ(短縮) + メッセージ
- **Changes**: 変更ファイルの概要（1〜3行）
```

これにより、セッションをまたいでもブランチの変遷と作業履歴を追跡できるようにする。

## Project Overview

Kataru is a voice recording and AI-powered analysis app. Users record audio, which gets transcribed (OpenAI Whisper) and analyzed (Google Gemini 2.5 Flash) into structured Japanese-language reports. It runs as a web app and an iOS app via Capacitor.

## Commands

```bash
# Development (runs both frontend and backend concurrently)
npm run dev

# Run individually
npm run dev:frontend    # Next.js on http://localhost:3000
npm run dev:backend     # Express on http://localhost:3001

# Build
npm run build           # Builds frontend (static export to /out) then backend (tsc to /dist)

# Lint
npm -w frontend run lint
```

No test framework is configured.

## Architecture

**Monorepo** with npm workspaces: `frontend/` and `backend/`.

### Frontend (`frontend/`)
- **Next.js 16** with App Router, React 19, Tailwind CSS 4, TypeScript
- Static export (`output: "export"`) — no SSR, all pages are client components (`'use client'`)
- **Capacitor 8** wraps the static `/out` build for iOS (app ID: `com.kataru.app`)
- Mobile-first layout (max-width 390px)

**Key paths:**
- `src/app/` — Pages: home (`page.tsx`), `/record`, `/processing`, `/results`, `/history`, `/analytics`
- `src/components/` — UI (`GlassCard`, `NeonButton`, `ScanLines`, `HudCorners`), layout, recording, dashboard, report
- `src/hooks/` — `useAudioRecorder` (Web Audio API), `useAudioVisualizer` (frequency data), `useTranscription` (Web Speech API)
- `src/lib/api.ts` — Typed fetch wrappers for all backend endpoints
- `src/types/session.ts` — `Session` and `Report` interfaces (source of truth for data shapes)

### Backend (`backend/`)
- **Express** with TypeScript, runs on port 3001
- Uses `tsx watch` for dev, `tsc` for production build

**Key paths:**
- `src/routes/` — `sessions.ts` (CRUD), `transcribe.ts` (Whisper), `report.ts` (Gemini), `analytics.ts`
- `src/services/` — `supabase.ts` (DB client), `storage.ts` (file uploads), `gemini.ts` (AI client)
- `src/prompts/report-prompt.ts` — Japanese-language prompt template for Gemini report generation

### Data Flow
1. `/record` — captures audio via Web Audio API + live transcript via Web Speech API
2. `/processing` — sequential pipeline: create session → upload audio to Supabase Storage → transcribe via Whisper → generate report via Gemini
3. Audio blob and transcript pass through `sessionStorage` between pages during the browser workflow
4. All persistent data lives in Supabase (PostgreSQL `sessions` table + `audio` storage bucket)

### External Services
- **Supabase**: PostgreSQL database + file storage (bucket: `audio`)
- **OpenAI**: Whisper API for audio transcription (language: `ja`)
- **Google Gemini 2.5 Flash**: Report generation from transcripts

## Environment Variables

Frontend (`.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Backend (`.env`): `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`

## Conventions

- All UI follows a cyberpunk/neon HUD aesthetic — dark background (`#0A0E1A`), neon cyan (`#00D4FF`), magenta (`#FF3B7A`), lime (`#A8FF00`), monospace fonts
- The app is Japanese-language: prompts, reports, and UI text are in Japanese
- CSS custom properties for the color palette are defined in `frontend/src/app/globals.css`
- Word count uses character count (appropriate for Japanese text)
- Audio codec selection handles iOS compatibility (MP4 > WAV > WebM fallback)
