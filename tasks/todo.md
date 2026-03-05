# Kataru マネタイズ改修 TODO

## Phase 1: ローンチ基盤

- [ ] Supabase Auth 導入（メール+パスワード）
  - [ ] DB: users プロファイルテーブル（plan, session_count）
  - [ ] DB: sessions テーブルに user_id カラム追加
  - [ ] Backend: 認証ミドルウェア（JWT 検証）
  - [ ] Backend: 全ルートで user_id 検証
  - [ ] Frontend: AuthContext + useAuth hook
  - [ ] Frontend: ログイン/サインアップページ
  - [ ] Frontend: 認証ガード（未ログインはログインページへ）
- [ ] セッション数カウントの DB 移行
  - [ ] session-tracker.ts を Supabase クエリベースに書き換え
  - [ ] FREE_SESSION_LIMIT = 5
  - [ ] UserPlan = 'free' | 'lite' | 'standard'
  - [ ] getSessionPhase() 追加（段階的アンロック用）
- [ ] 保存期間 3日 → 7日（Free プラン）
- [ ] Render コールドスタート対策（ランディングページで /health ping）

## Phase 2: 課金基盤

- [ ] Stripe 連携
  - [ ] Backend: Stripe Checkout セッション作成エンドポイント
  - [ ] Backend: Webhook でプラン変更を DB 反映
  - [ ] Frontend: 課金ページ UI
- [ ] Lite ¥580 + Standard ¥1,480 の2プラン
- [ ] バックエンドでのプラン検証（user_id → DB プラン参照）
- [ ] ペイウォール UI の3段階化

## Phase 3: 体験最適化

- [ ] 段階的アンロック実装
  - [ ] セッション2: ティーザーUI（ブラー + アンロックCTA）
  - [ ] セッション3: 有料レポートフル表示（1回限定）
  - [ ] セッション4: 対話モードプレビュー（Stage 1-2 のみ）
  - [ ] セッション5以降: ペイウォール
- [ ] テキスト入力モード追加（/record にテキストタブ）
