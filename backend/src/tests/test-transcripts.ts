/**
 * Fixed test transcripts for marketing brainstorming simulation.
 * Used for golden-case comparison (Plan Section F) and manual testing.
 *
 * 3 cases × 5 rounds each.
 * Each round's transcript simulates what a user would say in response
 * to the previous round's question.
 */

export interface TestCase {
  name: string;
  description: string;
  goal: string;
  /** Expected target fields (loose — any of these is acceptable) */
  expectedTargets: string[][];
  rounds: string[];
}

export const TEST_CASES: TestCase[] = [
  // ① 初回・ゼロから始めるSaaS LP
  {
    name: 'SaaS LP from scratch',
    description: '初回・目標のみ。canvas全空からスタート',
    goal: 'SaaS LP訴求軸を決めたい',
    expectedTargets: [
      ['product', 'target_customer'],           // R1: 最初の欠損
      ['target_customer', 'pain', 'product'],    // R2: 基本情報の続き
      ['pain', 'trigger_moment', 'promise'],     // R3: 中盤の掘り下げ
      ['promise', 'differentiation', 'channel'], // R4: 仮説の絞り込み
      ['next_experiment', 'offer', 'channel'],   // R5: 検証設計
    ],
    rounds: [
      // R1: 最初の自己紹介的な発言
      'BtoB向けのプロジェクト管理SaaSを開発中です。エンジニアチーム向けで、今はスプレッドシートで管理してる会社がターゲットです。まだLPがなくて、どう訴求すればいいか迷ってます。',

      // R2: ターゲットと課題を掘り下げ
      '一番使ってほしいのは、5〜20人くらいの開発チームのリーダーですね。彼らは毎週月曜にスプレッドシートでタスク一覧を更新してて、それが30分くらいかかってます。抜け漏れも多い。',

      // R3: ペインと購買きっかけ
      'お金よりも時間の無駄が大きいです。特にリリース前の2週間は毎日状況確認に1時間使ってて、コード書く時間が減るのが一番つらいみたいです。あと、進捗会議で「あれどうなった？」って聞かれて即答できないのが地味にストレスらしいです。',

      // R4: 約束する価値と差別化
      '使った後に変わるのは「進捗会議が5分で終わる」ことですね。ダッシュボード開くだけで全部見える。競合のJiraやAsanaは多機能すぎて、うちの客は設定だけで挫折してる。うちは GitHub連携だけに絞って、コミットしたら自動でタスクが動く。設定ゼロ。',

      // R5: チャネルと検証
      'エンジニアが一番いる場所は Twitter と Qiita ですね。あとは技術カンファレンスのスポンサーLT。最初の100人は、知り合いのCTOに直接声かけて、無料トライアルで使ってもらうのが現実的かなと。来週、3社に声かけてみます。',
    ],
  },

  // ② 中盤スタート・canvas半埋め状態から
  {
    name: 'Mid-session with half-filled canvas',
    description: '中盤・product+target_customer既知。painから掘る',
    goal: 'オンライン英会話の広告コピーを決めたい',
    expectedTargets: [
      ['pain', 'trigger_moment'],                        // R1: 欠損を埋める
      ['trigger_moment', 'pain', 'promise'],             // R2: きっかけ or 深掘り
      ['promise', 'differentiation'],                    // R3: 価値を絞る
      ['differentiation', 'proof', 'channel'],           // R4: 差別化と証拠
      ['next_experiment', 'offer', 'channel'],           // R5: 検証へ
    ],
    rounds: [
      // R1: ペインについて語る
      'ターゲットは30代の会社員で、昇進にTOEIC 800が必要な人です。ペインは、英会話スクールに通う時間がないのと、オンラインだと続かないこと。特に夜22時以降しか時間がなくて、その時間帯は講師が少ない。',

      // R2: 購買のきっかけ
      '「やばい」と思う瞬間は、人事面談で「来期までにTOEIC 800取ってね」と言われた時ですね。あとは海外出張が決まった時。検索ワードは「オンライン英会話 夜遅い」とか「TOEIC 800 最短」とかです。',

      // R3: 約束する価値
      'うちのサービスは24時間対応なので「夜23時でもネイティブと話せる」が一番の売り。あと、TOEIC特化のカリキュラムがあるから「3ヶ月でTOEIC 150点アップ」も言えます。どちらを前面に出すか迷ってます。うーん、時間の自由さかな。TOEIC点数はあとからついてくる感じ。',

      // R4: 差別化と信頼の証拠
      'DMM英会話とかレアジョブと比べて、うちはTOEIC特化と深夜帯の講師数が強みです。実績としては、ベータユーザー50人の平均で3ヶ月で120点アップしてます。ただ母数が少ないので統計的に強いとは言い切れない。あとはユーザーの声が3件あります。',

      // R5: チャネルとオファー
      'まずはGoogle広告で「TOEIC 800 最短」のキーワードで試してみたい。LPは「夜23時からでも始められる、TOEIC特化のオンライン英会話」みたいな感じ。無料体験は1回じゃなくて1週間にして、習慣化を体感してもらう。来週、LP作ってGoogle広告を1万円で回してみます。',
    ],
  },

  // ③ 終盤・ほぼ埋まっているが矛盾あり
  {
    name: 'Late-stage with conflicted pain',
    description: '終盤・大半assumed。painがconflicted',
    goal: 'D2Cブランドの初回購入率を上げたい',
    expectedTargets: [
      ['pain'],                                          // R1: conflicted解消
      ['pain', 'promise', 'trigger_moment'],             // R2: 解消の続き or 次へ
      ['differentiation', 'proof', 'promise'],           // R3: 絞り込み
      ['offer', 'channel', 'next_experiment'],           // R4: 検証へ向かう
      ['next_experiment'],                               // R5: 最終検証設計
    ],
    rounds: [
      // R1: 矛盾を認めて方向を選ぶ
      'やっぱり、ペインが2方向に割れてるんですよね。「市販品の成分が信用できない」と「オーガニック製品は高すぎる」の両方を拾おうとしてた。でも改めて考えると、うちの客は成分にこだわる人で、価格で迷う人はそもそもターゲットじゃない。成分の不信感一本で行きます。',

      // R2: ペインの具体化
      '具体的に言うと、裏面の成分表見ても何が入ってるかわからないのが不安なんです。「パラベンフリー」とか書いてあっても、代わりに何使ってるの？って。うちは全成分の由来と役割をLPに載せてます。製造工程の動画も公開してる。',

      // R3: 約束する価値と差別化の絞り込み
      '約束するのは「成分を全部理解した上で選べる」という安心感。他のオーガニックブランドとの違いは、成分の透明性。他社は「オーガニック」としか言わないけど、うちは原料の産地から加工方法まで全部開示してる。正直ここまでやってるブランドは国内にない。',

      // R4: オファーとチャネル
      '初回購入のハードルを下げるために、トライアルキット1,980円を考えてます。原価割れだけど、リピート率65%あるから回収できる計算。チャネルはInstagram。成分解説のカルーセル投稿が一番エンゲージメント高い。あとYouTubeで成分比較動画を出したい。',

      // R5: 検証設計
      '来週やれることとしては、Instagramで成分比較のカルーセルを3本出して、そこからLPへの遷移率を見たい。LPのファーストビューは「全成分の由来、公開してます」にする。トライアルキットのCVRが3%以上なら、この訴求軸で本格的に広告予算つけます。ダメなら「製造工程の透明性」軸に切り替え。',
    ],
  },
];
