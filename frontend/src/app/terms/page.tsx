'use client';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white font-mono p-6 max-w-[700px] mx-auto">
      <h1 className="text-2xl font-bold text-[#00D4FF] mb-6">利用規約</h1>
      <p className="text-sm text-gray-400 mb-8">最終更新日: 2025年3月5日</p>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">1. サービスの概要</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Kataru（以下「本サービス」）は、音声録音とAIによる分析レポートを提供するアプリケーションです。
          本利用規約は、本サービスの利用に関する条件を定めるものです。本サービスを利用することにより、
          本規約に同意したものとみなします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">2. アカウント</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li>利用にはアカウント登録が必要です。</li>
          <li>アカウント情報の正確性と安全性は、ユーザーの責任で管理してください。</li>
          <li>アカウントの不正利用が判明した場合、サービスを停止する場合があります。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">3. サブスクリプション</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li>有料プラン（Lite、Standard）は月額サブスクリプションとして提供されます。</li>
          <li>支払いはAppleのApp Store決済を通じて処理されます。</li>
          <li>サブスクリプションは現在の期間終了の少なくとも24時間前にキャンセルしない限り、自動更新されます。</li>
          <li>無料トライアル期間中にキャンセルしない場合、自動的に有料プランに移行します。</li>
          <li>サブスクリプションの管理・キャンセルは、iOSの「設定」→「サブスクリプション」から行えます。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">4. コンテンツと知的財産</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li>ユーザーが録音した音声データおよびそれに基づくレポートの権利はユーザーに帰属します。</li>
          <li>本サービスのデザイン、ロゴ、ソフトウェアの権利は当社に帰属します。</li>
          <li>AIが生成したレポートは参考情報であり、その正確性を保証するものではありません。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">5. 禁止事項</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li>違法な目的での利用</li>
          <li>他のユーザーへの嫌がらせや迷惑行為</li>
          <li>サービスのリバースエンジニアリングや不正アクセス</li>
          <li>サービスの運営を妨害する行為</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">6. 免責事項</h2>
        <ul className="text-sm leading-relaxed text-gray-300 list-disc pl-5 space-y-2">
          <li>本サービスは「現状のまま」提供されます。</li>
          <li>AIによる分析結果の正確性、完全性、有用性について保証しません。</li>
          <li>サービスの中断、停止、変更により生じた損害について責任を負いません。</li>
          <li>第三者サービス（OpenAI、Google、RevenueCat）に起因する問題について責任を負いません。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">7. アカウントの削除</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          ユーザーはいつでもアカウントを削除できます。アカウント削除時には、関連する全てのデータ
          （録音データ、レポート、個人情報）が削除されます。有料サブスクリプションをご利用の場合は、
          アカウント削除前にサブスクリプションをキャンセルしてください。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">8. 規約の変更</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          本規約は予告なく変更される場合があります。重要な変更がある場合は、アプリ内またはメールで通知します。
          変更後も本サービスを利用し続けた場合、変更後の規約に同意したものとみなします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">9. 準拠法と管轄</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          本規約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#00D4FF] mb-3">10. お問い合わせ</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          本規約に関するお問い合わせは、以下までご連絡ください:
        </p>
        <p className="text-sm text-[#00D4FF] mt-2">kataru.app@gmail.com</p>
      </section>
    </div>
  );
}
