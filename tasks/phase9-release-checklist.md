# Phase 9 リリースチェックリスト

## Status: DEV（未リリース）

---

## 1. ブラウザ手動確認

| # | 項目 | 確認内容 | 結果 |
|---|------|----------|------|
| 1.1 | R3後 extending UI | R3の question 画面で「次へ」→ extending UI が自然に表示されるか | [ ] |
| 1.2 | extending UI テキスト | 「3ラウンド完了」「もう少し話を続けたいですか？」が表示されるか | [ ] |
| 1.3 | 「まとめる」ボタン | extending UI → 「セッションをまとめる」→ 通常 summary 生成 | [ ] |
| 1.4 | 「続ける」ボタン | extending UI → 「もう1ラウンド続ける」→ R4 idle 画面に遷移 | [ ] |
| 1.5 | R4後 extending UI | R4完了後に再度 extending UI、「あと1ラウンドまで延長できます」表示 | [ ] |
| 1.6 | R5後 自動 summary | R5完了 → extending UI なし → 直接 summarizing | [ ] |
| 1.7 | 5ドット表示 | 常に5ドット。R4/R5枠は薄い（opacity 0.05）→ extend 後に浮き上がる | [ ] |
| 1.8 | ドット点灯遷移 | R1完了→ドット1 lime、R4開始→ドット4 cyan、R5完了→全5 lime | [ ] |
| 1.9 | ヘッダー表示 R1-R3 | `ROUND 1 / 3 — 外化` 形式 | [ ] |
| 1.10 | ヘッダー表示 R4 | `ROUND 4 — 展開`（`/ X` なし） | [ ] |
| 1.11 | ヘッダー表示 extending | `3ラウンド完了` / `4ラウンド完了` | [ ] |
| 1.12 | ボタンテキスト R1-R2 | 「次のラウンドへ」 | [ ] |
| 1.13 | ボタンテキスト R3-R4 | 「次へ」 | [ ] |
| 1.14 | ボタンテキスト R5 | 「セッションをまとめる」 | [ ] |
| 1.15 | リロード fail-closed | 録音中 or extending 中にリロード → idle, R1, sessionId=null | [ ] |
| 1.16 | extend エラー表示 | ネットワーク切断時に「延長に失敗しました」表示 | [ ] |
| 1.17 | テレメトリ重複なし | extending UI 表示時に extension_prompt_shown が1回のみ（DevTools Network で確認） | [ ] |

---

## 2. Gate 9 品質評価（最低20セッション）

### 評価基準
- **A**: 自然、ユーザーにとって価値がある
- **B**: 許容範囲、明らかな問題なし
- **C**: 違和感あり、改善が必要
- **F**: 破綻、リリース不可

### 評価記録テンプレート

| # | ラウンド数 | R4品質 | R5品質 | summary品質 | ダレ感 | 備考 |
|---|-----------|--------|--------|-------------|--------|------|
| 1 | 3R | - | - | | | |
| 2 | 4R | | - | | | |
| 3 | 5R | | | | | |
| ... | | | | | | |

### 重点確認
- [ ] 3R止めの品質が Phase 8 以前と同等か（延長機能追加で劣化していないか）
- [ ] R4 が「展開」になっているか（新しい角度、未探索の前提）
- [ ] R5 が「統合」になっているか（全体俯瞰、持ち帰り）
- [ ] 4R/5R で「同じ質問の繰り返し」「ダレ」が発生していないか
- [ ] 5R summary が 3R summary より悪化していないか
- [ ] mode × R4/R5 の組み合わせが自然か（structure+展開、release+展開 など）

---

## 3. Telemetry / DB 実地監査

### イベント存在確認（Supabase ダッシュボード）

| イベント | 確認方法 | 結果 |
|----------|----------|------|
| `extension_prompt_shown` | `SELECT * FROM round_events WHERE event_type = 'extension_prompt_shown'` | [ ] |
| `extension_accepted` | `SELECT * FROM round_events WHERE event_type = 'extension_accepted'` — `data->>'max_rounds_allowed'` が 4 or 5 | [ ] |
| `extension_declined` | `SELECT * FROM round_events WHERE event_type = 'extension_declined'` | [ ] |
| `round_completed` + `is_extended_round` | `SELECT data->>'is_extended_round' FROM round_events WHERE event_type = 'round_completed' AND (data->>'round_number')::int > 3` | [ ] |
| `summary_generated` + 延長テレメトリ | `SELECT data->>'total_rounds_completed', data->>'session_was_extended' FROM round_events WHERE event_type = 'summary_generated'` | [ ] |

### 整合性チェック

| チェック | SQL | 期待 | 結果 |
|----------|-----|------|------|
| prompt_shown >= accepted + declined | セッション単位で `prompt_shown` の数 >= `accepted` + `declined` の数 | 全セッションで成立 | [ ] |
| prompt_shown が1セッションあたり最大2回 | R3後とR4後で各1回 = 最大2 | 3以上なら re-render 重複 | [ ] |
| accepted 回数 = R4/R5 のラウンド数 | extend 1回 = R4あり、2回 = R4+R5あり | 一致 | [ ] |
| max_rounds_allowed の最終値 | `SELECT max_rounds_allowed FROM round_sessions WHERE id = ?` | 3, 4, or 5 のいずれか | [ ] |

---

## 4. リリース判断

### 段階リリース手順

1. [ ] `PHASE9_EXTENSION=dev` で自分だけ確認（上記1-3を完了）
2. [ ] Gate 9 品質評価で C 以下が 20% 未満であること
3. [ ] Telemetry 整合性チェック全パス
4. [ ] 限定ユーザー（2-3名）で `PHASE9_EXTENSION=dev` 試験
5. [ ] フィードバック収集（1週間目安）
6. [ ] 問題なければ `PHASE9_EXTENSION=live` に切り替え
7. [ ] 全体解放後 48h のテレメトリ監視

### リリース判断基準
- Gate 9 品質: A/B が 80% 以上
- テレメトリ異常なし
- 3R止めの品質劣化なし
- ユーザーフィードバックで「ダレる」「意味がない」が出ていない
- R1-R3 のレイテンシ p50/p95 が劣化していない

---

## Backend 自動テスト結果（2026-03-13 実施済み）

全 PASS:
- 3R止め, 4R延長, 5R延長: 全 HTTP 200
- extend未実行でR4: 409 ROUND_EXTENSION_REQUIRED
- 二重タップ: 3→4→5→409（ジャンプなし）
- 並列3発: 200×2 + 409×1（原子性確認）
- flag=off: extend→404, roundNum>3→400
- fail-closed: 新セッションR4→409
- round_number=6: 400
- プロンプト R4/R5 コンテキスト: 正常
- clampMaybe R3限定: R4/R5 → null
