# Phase 10: 特定領域アダプタ — 実装チェックリスト

## 実装ステップ

- [x] Step 0: 実装前TODO（DEVELOPMENT_HISTORY.md / GIT_WORKTREE_LOG.md / tasks/todo.md）
- [ ] Step 1: アダプタ定義ファイル `backend/src/adapters/registry.ts`
- [ ] Step 2: 自動検出関数 `backend/src/adapters/detect.ts`
- [ ] Step 3: DBマイグレーション `backend/src/migrations/016_domain_adapters.sql`
- [ ] Step 4: プロンプト注入 `backend/src/prompts/thinking-companion-prompt.ts`
- [ ] Step 5: ルート変更 `backend/src/routes/round.ts`
  - [ ] 5a: Feature flag (PHASE10_ADAPTER)
  - [ ] 5b: POST /session — adapter_id 受理
  - [ ] 5c: POST /question — auto-detect + effective adapter + コンテキスト注入
  - [ ] 5d: テレメトリ拡張
- [ ] Step 6: フロントエンド Feature Flag (.env.example)
- [ ] Step 7: ホーム画面ショートカット (StartModeSelector.tsx)
- [ ] Step 8: Record ページ連携 (record/page.tsx + api.ts)
- [ ] Step 9: スモーク検証スクリプト `backend/src/adapters/__tests__/smoke.ts`
- [ ] Step 10: ビルド検証 + スモークテスト実行

## Gate 9 チェックリスト (Phase 10 live化前に必須)

- [ ] 20セッション以上（仕事5/感情5/内省5/雑談5）× 3R止め+延長の両方を含む
- [ ] 3Rで止めたセッションの体験品質が維持されている
- [ ] 5Rまで延長したセッションが「長すぎ」と感じられない（20セッション中18回以上）
- [ ] 延長ラウンドを含むまとめ画面の品質が維持されている
- [ ] フォールバック率 < 5%、P95応答がSLO以内

## 検証レベル1: 実装検証 (dev完了基準)

- [ ] スモーク検証パス
- [ ] Backend flag off → adapter_id無視、auto-detect未実行
- [ ] Frontend flag off → ショートカット非表示
- [ ] 手動選択フロー → adapter_id + source='manual' 保存 → コンテキスト注入確認
- [ ] 自動検出テスト → マーケ用語5語 → adapter_id=marketing, source=auto
- [ ] 自動検出不採用 → gap不足で null 維持
- [ ] manual優先 → marketing選択 + キャリア用語多数 → marketing維持
- [ ] ペア整合 → adapter_id=null + adapter_source='manual' → DB CHECK拒否
- [ ] テレメトリ全フィールド正常記録
- [ ] manual_live flag → ログ残るがDB更新なし・注入なし
