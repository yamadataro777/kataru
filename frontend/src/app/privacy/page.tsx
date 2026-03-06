'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white font-mono p-6 max-w-[700px] mx-auto">
      <h1 className="text-2xl font-bold text-[#00D4FF] mb-6">プライバシーポリシー</h1>
      <p className="text-sm text-gray-400 mb-8">最終更新日: 2025年3月5日</p>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">1. はじめに</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Kataru（以下「本アプリ」）は、音声録音とAIによる分析レポートを提供するサービスです。
          本プライバシーポリシーは、本アプリにおける個人情報の取り扱いについて説明します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">2. 収集する情報</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li><strong className="text-white">音声データ:</strong> 録音された音声はAI文字起こし・レポート生成に使用されます。</li>
          <li><strong className="text-white">メールアドレス:</strong> アカウント認証に使用されます。</li>
          <li><strong className="text-white">購入情報:</strong> サブスクリプション管理のためRevenueCatを通じて処理されます。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">3. 情報の利用目的</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li>音声の文字起こしとAIレポートの生成</li>
          <li>アカウントの作成・管理</li>
          <li>サブスクリプションの処理と管理</li>
          <li>サービスの改善</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">4. 第三者への情報提供</h2>
        <p className="text-sm leading-relaxed text-gray-300 mb-3">
          本アプリは以下のサービスにデータを送信します:
        </p>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li><strong className="text-white">OpenAI:</strong> 音声データの文字起こし処理（Whisper API）</li>
          <li><strong className="text-white">Google:</strong> 文字起こしテキストからのレポート生成（Gemini API）</li>
          <li><strong className="text-white">RevenueCat:</strong> サブスクリプション・課金管理</li>
          <li><strong className="text-white">Supabase:</strong> データベース・ファイルストレージ</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">5. データの保持と削除</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          録音データおよびレポートは、ユーザーが削除するまでサーバーに保持されます。
          アカウントを削除した場合、関連する全てのデータ（録音、レポート、アカウント情報）は
          30日以内に完全に削除されます。データの削除をご希望の場合は、アプリ内から
          セッションを個別に削除するか、アカウント削除をリクエストしてください。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">6. データの安全性</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          全ての通信はHTTPSで暗号化されています。データベースへのアクセスは
          認証済みユーザーに限定され、Row Level Security (RLS) により保護されています。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">7. お問い合わせ</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          プライバシーに関するお問い合わせは、以下までご連絡ください:
        </p>
        <p className="text-sm text-[#00D4FF] mt-2">kataru.app@gmail.com</p>
      </section>
    </div>
  );
}
