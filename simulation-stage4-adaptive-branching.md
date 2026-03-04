# Stage 4 Adaptive Branching — 50シナリオ中 厳選10セッション シミュレーション

> 生成日: 2026-03-04
> 対象: `buildStage4Prompt` 改稿版（Fast / Standard / Recovery 3パス分岐）
> 方法: 50シナリオ（Fast 12 / Standard 23 / Recovery 15）を内部シミュレーションし、
> パス分岐の正確性・reframe の質・identity 質問の適切性・completion 判定・エッジケースの
> 観点から特筆すべき10セッションを厳選。

---

## 厳選基準

| # | 選定理由 |
|---|---------|
| 1 | Fast パスが不要な深掘りをせず2-3ターンで完了する理想形 |
| 2 | Standard パスで resistance reframe が自然に機能する典型例 |
| 3 | Standard パスで relationship_integrity identity 質問が適切に選ばれるケース |
| 4 | Standard パスで escape_pattern identity 質問が先延ばしパターンに刺さるケース |
| 5 | Recovery → Stage 3 Regression（efficacy 3）の即時判定 |
| 6 | Recovery → 行動縮小成功（efficacy 4→7）の理想的な回復曲線 |
| 7 | Recovery → 行動縮小（efficacy 4→6）境界値での通過 |
| 8 | Standard で negative delta 発生（efficacy 7→5→6）→ 追加ケアが機能 |
| 9 | Fast 境界値（efficacy 8）で最小ターン完了 |
| 10 | Recovery extreme（efficacy 2）→ 即時 regression |

---

## Simulation 1: Fast パス — 転職エンジニア

### ペルソナ
- 30歳男性、SIer勤務5年目、Web系企業への転職を決意済み
- 準備が整っており、あとは実行するだけの状態

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "quantitative",
  "goal_statement": "3ヶ月以内にWeb系企業に転職する",
  "metric": "内定獲得数",
  "target_value": "1社以上",
  "deadline": "3ヶ月以内",
  "observable_signs": [],
  "why_this_goal_matters": null,
  "previous_stage_mode": "logical"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["毎週3社に応募する", "転職エージェント2社に登録", "ポートフォリオサイトを作る"],
  "selected_action": "毎週3社に応募する",
  "budget": null,
  "available_time": "平日夜2時間 + 週末",
  "resources": ["技術ブログ", "転職エージェント"],
  "obstacles": ["面接の時間確保が難しい"],
  "obstacles_acknowledged": true,
  "first_step": "今週末にレジュメを更新する",
  "execution_frequency": "週3社ペース"
}
```

### 会話ログ

**Turn 1（初期メッセージ — 静的JSON）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 9点ですね。正直、レジュメはほぼできてるし、技術力にも自信があります。
あとはやるだけです。

AI: 9点、準備が整っている状態ですね。「あとはやるだけ」とおっしゃいましたが、
唯一気がかりなことがあるとすれば何ですか？

それと、この転職活動を3ヶ月続けた先の自分を想像すると、どんな姿が見えますか？
```
→ **パス確定: fast**（efficacy 9 >= 8, resistance 軽微）
→ identity_prompt_type: "clarity"

**Turn 3**
```
ユーザー: 気がかり…面接の日程調整くらいですかね。上司にはまだ言ってないので、
有給取るのに少し工夫がいる。でもまあ、やりようはある。
3ヶ月後は、自社サービスのチームでコードレビューしてる自分が見えます。
楽しそうだなって。

AI: 「やりようはある」という言葉に、準備ができている確信が出ていますね。
では、今週からの行動を自分の言葉で宣言してもらえますか？

それと、改めて今の自信度を教えてください。
```

**Turn 4**
```
ユーザー: 『今週末にレジュメを最終更新して、来週月曜から週3社ペースで応募を始める。
面接は有給と午後半休で対応する。』自信は…9点のままですね。

AI: 今日の整理をまとめます。

転職の準備は整っている。あとは実行フェーズに入るだけ。
今週末にレジュメ更新、来週月曜から週3社応募開始。
来週金曜に「何社に応募できたか」を振り返る。
「今週末にレジュメを最終更新して、来週月曜から週3社ペースで応募を始める。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "fast",
  "self_efficacy_level_initial": 9,
  "self_efficacy_level_final": 9,
  "self_efficacy_delta": 0,
  "commitment_statement": "今週末にレジュメを最終更新して、来週月曜から週3社ペースで応募を始める。面接は有給と午後半休で対応する。",
  "perceived_resistance": "面接の日程調整（上司未報告）",
  "resistance_reframe": null,
  "identity_alignment": "自社サービスのチームでコードレビューしている姿",
  "identity_prompt_type": "clarity",
  "reinforcement_message": null,
  "next_check_in_point": "来週金曜",
  "review_axes": [
    "今週何社に応募できたか",
    "レジュメ更新は完了したか"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 9
}
```

### 自己評価: A

**良い点:**
- Fast パスとして3ターン（実質2応答）で完了。高 efficacy ユーザーに不要な深掘りをしていない
- identity (clarity) が自然に会話に溶け込んでいる。「3ヶ月後の自分」を聞く形が転職文脈に適合
- commitment はユーザー自身の言葉。AIが代筆していない
- 4行 summary を遵守
- 「頑張ってください」等の空虚な励ましなし

**改善点:**
- review_axes が2つだが、目標（Web系転職）との接続がやや弱い。「面接まで進んだ企業があるか」を加えると検証力が上がる
- resistance_reframe が null だが、fast パスでは想定通り。問題なし
- delta が 0 だが、9→9 なので自然

---

## Simulation 2: Standard パス — 起業準備の会社員

### ペルソナ
- 28歳女性、メーカー勤務、副業でSaaS立ち上げを検討中
- やる気はあるが本業の忙しさが心理的ブロック

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "quantitative",
  "goal_statement": "6ヶ月以内に副業として月5万円の収益を立てる",
  "metric": "月間収益",
  "target_value": "5万円",
  "deadline": "6ヶ月以内",
  "observable_signs": [],
  "why_this_goal_matters": "自分の力で稼げる実感を得たい",
  "previous_stage_mode": "logical"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["週末にMVPプロトタイプを作る", "既存SNSで見込み客リサーチ", "知人にヒアリング"],
  "selected_action": "週末にMVPのプロトタイプを作る",
  "budget": "月1万円以内",
  "available_time": "週末の土曜午前中（3時間）",
  "resources": ["プログラミングスキル", "業界知識"],
  "obstacles": ["本業が忙しくて時間が取れない"],
  "obstacles_acknowledged": true,
  "first_step": "今週末にLPを1ページ作る",
  "execution_frequency": "毎週土曜午前"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 7点くらいですかね。やる気はあるんですけど、
本業が忙しくて週末も疲れてるときがあって。そこが少し不安です。

AI: 7点、やる気はあるけど「本業の疲れ」が引っかかっているんですね。
その不安を少し掘り下げたいのですが、「疲れていてできないかも」というのは、
体力的な問題ですか、それとも精神的に切り替えが難しいという感覚ですか？
```
→ **パス確定: standard**（efficacy 7, resistance あり: 時間/体力不安）

**Turn 3**
```
ユーザー: 精神的な切り替えですね。金曜の夜に「明日やらなきゃ」って思うと
プレッシャーになって、余計に疲れる感じ。

AI: 「やらなきゃ」がプレッシャーになっている、という感覚ですね。
ここで一つ読み替えてみたいのですが——「土曜の朝にLP作業をする」ことを
「義務」ではなく、「本業では使えない自分のスキルを試す実験時間」と
捉えるとどうですか？

仕事の疲れを引きずっているのではなく、仕事とは別の筋肉を使う時間。
3時間全部をやり切る必要はなく、「今日はどこまで進むか見てみよう」
くらいの温度感で。
```
→ resistance_reframe: 「義務」→「実験時間」

**Turn 4**
```
ユーザー: ああ、実験って考えると確かに気が楽ですね。
完成させなきゃっていうプレッシャーが重かったのかも。
「今日はどこまでいけるか試してみよう」って入り方なら、できそう。

AI: 「実験」という言葉がフィットしたようですね。

この副業プロジェクトを6ヶ月続けた先に、
「自分の力で月5万円稼いだ」と言えたとき、
あなたにとってそれはどんな意味を持ちますか？
```
→ identity_prompt_type: "clarity"

**Turn 5**
```
ユーザー: 会社に依存してない自分を証明できる、っていうのが大きいですね。
「私は会社がなくても生きていける」って実感。それが欲しいんだと思います。

AI: 「会社に依存していない自分の証明」——これが原動力ですね。
では、今週からの行動を自分の言葉で宣言してもらえますか？
その後、改めて自信度を聞かせてください。
```

**Turn 6**
```
ユーザー: 『今週土曜の午前中にLPを1ページ作る。完成度は気にしない、
実験として何ができるか試す。来週も同じ時間にMVPの次のパーツに取り組む。』
自信は…8点に上がりました。「実験」って考えたら楽になった。

AI: 今日の整理をまとめます。

副業の核心は「会社に依存しない自分の証明」。プレッシャーではなく実験。
今週土曜午前にLP1ページ、完成度は問わず「どこまでいけるか」を試す。
来週土曜に「LPはどこまで進んだか」と「実験として楽しめたか」を振り返る。
「今週土曜の午前中にLPを1ページ作る。完成度は気にしない、実験として何ができるか試す。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "standard",
  "self_efficacy_level_initial": 7,
  "self_efficacy_level_final": 8,
  "self_efficacy_delta": 1,
  "commitment_statement": "今週土曜の午前中にLPを1ページ作る。完成度は気にしない、実験として何ができるか試す。来週も同じ時間にMVPの次のパーツに取り組む。",
  "perceived_resistance": "本業の疲れからくる精神的切り替えの難しさ、義務感によるプレッシャー",
  "resistance_reframe": "「義務」ではなく「本業とは別のスキルを試す実験時間」として捉える",
  "identity_alignment": "会社に依存していない自分を証明できる存在",
  "identity_prompt_type": "clarity",
  "reinforcement_message": "「実験」という入り方で8点に上昇",
  "next_check_in_point": "来週土曜",
  "review_axes": [
    "LPはどこまで進んだか（ページ完成度）",
    "作業を「実験」として楽しめたか（1-10）",
    "土曜午前の作業時間を確保できたか"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 7
}
```

### 自己評価: A+

**良い点:**
- resistance reframe が秀逸。「義務→実験」は具体的で、ユーザーの言葉（「プレッシャー」）に直接接続
- identity (clarity) のタイミングが正確。reframe 後の開けた状態で未来像を聞いている
- commitment は完全にユーザーの言葉。reframe の「実験」を自分で取り込んでいる
- review_axes が3つとも検証可能かつ goal_statement に接続
- delta +1 は自然な上昇幅
- 5ターンで完了。standard の理想的な長さ

**改善点:**
- review_axes の「楽しめたか（1-10）」はやや主観的。「何時間作業したか」のような客観指標を1つ含めるとなお良い
- Turn 3 でAIが reframe を提示する際、やや長い。もう少し簡潔に済ませたい

---

## Simulation 3: Standard パス — 親との関係修復（relationship_integrity）

### ペルソナ
- 35歳女性、3年前に母と大喧嘩して以来ほぼ連絡なし
- 和解したい気持ちはあるが、再び拒絶される恐怖が強い

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "qualitative",
  "goal_statement": "月に1回は母と穏やかに電話できるようになる",
  "metric": null,
  "target_value": null,
  "deadline": null,
  "observable_signs": ["LINEで返事が来る", "電話で怒鳴り合いにならない"],
  "why_this_goal_matters": "このまま疎遠で終わりたくない",
  "previous_stage_mode": "emotional"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["短いLINEを週1で送る", "手紙を書く", "父経由で様子を聞く"],
  "selected_action": "まず短いLINEメッセージを週1で送る",
  "budget": null,
  "available_time": "いつでも可（LINEなので）",
  "resources": ["父が仲介役になれるかも"],
  "obstacles": ["返事がなかったら傷つく", "また喧嘩になるかもしれない"],
  "obstacles_acknowledged": true,
  "first_step": "今週中に『最近どう？』とLINE送る",
  "execution_frequency": "週1回"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 6点…かな。LINEを送ること自体はできると思う。
でも返事がなかったらって考えると怖いんです。前に一度、既読スルーされて。

AI: 6点、「送ることはできるけど、返事がない恐怖」が引っかかっているんですね。
「前に既読スルーされた」経験が今も重くのしかかっている。

その恐怖をもう少し正確に捉えたいのですが、怖いのは
「返事がないこと自体」ですか、それとも「返事がない＝母に拒絶された」
と感じることですか？
```
→ **パス確定: standard**（efficacy 6, resistance: 拒絶恐怖）

**Turn 3**
```
ユーザー: 後者ですね。返事がないと「やっぱり私のこと嫌いなんだ」って
思ってしまう。それが一番怖い。

AI: 「母に拒絶された」と感じることが核心なんですね。

一つ読み替えてみていいですか——今こうして「怖い」と言えるのは、
お母さんとの関係をどうでもいいと思っていないからですよね。
拒絶が怖いのは、あなたがその関係を大切にしている証拠です。
「返事がない＝嫌われた」ではなく、「返事がない＝母もどう返していいか
分からない」という可能性も同じくらいあります。

この行動——LINEを送ること——は、お母さんとの関係にとって
どんな意味を持つと思いますか？
```
→ resistance_reframe: 「拒絶の証拠」→「関係を大切にしている証拠」
→ identity_prompt_type: "relationship_integrity"

**Turn 4**
```
ユーザー: …確かに、母もどう返していいか分からないのかもしれない。
私がLINEを送るってことは、「私はまだこの関係を諦めてない」って
示すことですよね。返事がなくても、送ること自体に意味がある…のかな。

AI: 「送ること自体に意味がある」——そこに気づいたのは大きいですね。
では、今週からの行動を自分の言葉で宣言してもらえますか？
返事の有無に関わらず、自分が何をするかに焦点を当てて。
その後、自信度を改めて聞かせてください。
```

**Turn 5**
```
ユーザー: 『今週中に母に「最近どう？」とLINEを送る。
返事がなくても、2週間後にもう1回送る。
返事の有無で自分の価値を測らない。』
自信は…7点に上がりました。送ること自体が意味があるって思えたから。

AI: 今日の整理をまとめます。

母との関係修復の核心は「送ること自体が、関係を諦めていない証」。
今週中にLINE送信、返事がなくても2週間後にもう1回。
2週間後の日曜に「LINEを送れたか」と「送った後の自分の気持ち」を振り返る。
「今週中に母にLINEを送る。返事がなくても、2週間後にもう1回送る。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "standard",
  "self_efficacy_level_initial": 6,
  "self_efficacy_level_final": 7,
  "self_efficacy_delta": 1,
  "commitment_statement": "今週中に母に「最近どう？」とLINEを送る。返事がなくても、2週間後にもう1回送る。返事の有無で自分の価値を測らない。",
  "perceived_resistance": "既読スルー経験からくる拒絶恐怖（返事がない＝嫌われた）",
  "resistance_reframe": "拒絶が怖いのは関係を大切にしている証拠。返事がない＝母もどう返していいか分からない可能性",
  "identity_alignment": "この関係を諦めていないと示す行動そのものに意味がある",
  "identity_prompt_type": "relationship_integrity",
  "reinforcement_message": "「送ること自体が意味がある」という気づきで7点に上昇",
  "next_check_in_point": "2週間後の日曜",
  "review_axes": [
    "LINEを送れたか（Yes/No）",
    "送った後の自分の気持ちはどうだったか",
    "返事の有無に関わらず次のアクションを決められたか"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 6
}
```

### 自己評価: A+

**良い点:**
- relationship_integrity の選択が完璧。親子関係の修復文脈で「この行動が関係にどんな意味を持つか」を問うのは最適
- resistance reframe が心理学的に正確。「恐怖＝価値の裏返し」は認知再構成の王道パターン
- commitment の最後の一文「返事の有無で自分の価値を測らない」は、reframe が内在化した証拠
- review_axes の3つ目「次のアクションを決められたか」が行動継続の鍵を突いている
- 全ターンで「頑張って」系の言葉なし

**改善点:**
- Turn 3 のAI発話がやや長い（reframe + identity を同時に聞いている）。2ターンに分けてもよかった
- next_check_in_point が「2週間後の日曜」だが、commitment は「今週中に送る」なので、最初の振り返りは「送った直後」にしても良い

---

## Simulation 4: Standard パス — 英語学習（escape_pattern）

### ペルソナ
- 32歳男性、商社勤務、海外駐在の可能性が浮上
- 過去にジム・英会話スクール・資格勉強を全て3日坊主で終わらせた歴史

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "quantitative",
  "goal_statement": "TOEIC 700点を半年以内に取る（現在550点）",
  "metric": "TOEICスコア",
  "target_value": "700点",
  "deadline": "半年以内",
  "observable_signs": [],
  "why_this_goal_matters": "海外駐在のチャンスを逃したくない",
  "previous_stage_mode": "logical"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["毎朝30分リスニング", "週末に模試1回", "オンライン英会話週2回"],
  "selected_action": "毎朝30分のリスニング + 週末に模試1回",
  "budget": "月5000円（アプリ課金）",
  "available_time": "朝の通勤30分 + 週末2時間",
  "resources": ["TOEICアプリ", "過去問集"],
  "obstacles": ["3日坊主になりがち", "モチベーション維持が課題"],
  "obstacles_acknowledged": true,
  "first_step": "明日朝にPodcast登録して1エピソード聴く",
  "execution_frequency": "平日毎朝 + 週末1回"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: うーん、6点ですね。いつも最初はやる気あるんですけど、続かないんですよ。
ジムも英会話スクールも最初の1ヶ月でやめちゃいました。

AI: 6点、「続かない」パターンが引っかかっているんですね。
「ジムも英会話も1ヶ月でやめた」とのことですが、やめたときの共通点って何かありますか？
たとえば「忙しくて1日休んだらそのまま」なのか、「成果が見えなくて飽きた」なのか。
```
→ **パス確定: standard**（efficacy 6, resistance: 先延ばし/三日坊主パターン）

**Turn 3**
```
ユーザー: あー、「1日休んだらそのまま」ですね。完璧に。
1日サボると罪悪感が出て、「もういいや」ってなっちゃう。

AI: 「1日サボると罪悪感→もういいや」——このパターンが毎回リセットボタンを
押していたわけですね。

読み替えてみると、あなたは「始められる人」なんですよ。ジムも英会話も始めた。
問題は意志力ではなく、「休んだ＝失敗」という判定基準にある。
1日休んでも翌日やれば2日連続サボりにはならない。
「続ける」のではなく「再開する」にハードルを下げるとどうですか？

一つ聞きたいのですが、過去にジムや英会話をやめて後悔した経験、
今も覚えていますか？ それと今回は何が違うと思いますか？
```
→ resistance_reframe: 「サボり＝失敗」→「始められる人。問題は判定基準」
→ identity_prompt_type: "escape_pattern"

**Turn 4**
```
ユーザー: 後悔してますよ、めちゃくちゃ。英会話続けてたら今頃もっと楽だったのに。
今回との違いは…海外駐在っていうリアルな締切があることですかね。
あと、「再開する」って考え方はいいかも。1日サボっても終わりじゃない。

AI: 「リアルな締切」と「再開できればいい」——この2つが今回の違いですね。
では、今週からの行動を自分の言葉で宣言してください。
「サボったらどうするか」も含めて。
その後、改めて自信度を教えてください。
```

**Turn 5**
```
ユーザー: 『明日から通勤電車でPodcastを聴く。1日サボっても翌日再開する。
週末に模試を1回やる。2週間で3日以上サボったら、やり方を見直す。』
自信は7点です。「再開すればいい」って思えたのが大きい。

AI: 今日の整理をまとめます。

あなたは始められる人。問題は「サボり＝失敗」の判定基準だった。
明日から通勤Podcast、週末模試。サボっても翌日再開、それでOK。
来週日曜に「何日Podcastを聴けたか」と「サボった日にどう対応したか」を振り返る。
「明日から通勤電車でPodcastを聴く。1日サボっても翌日再開する。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "standard",
  "self_efficacy_level_initial": 6,
  "self_efficacy_level_final": 7,
  "self_efficacy_delta": 1,
  "commitment_statement": "明日から通勤電車でPodcastを聴く。1日サボっても翌日再開する。週末に模試を1回やる。2週間で3日以上サボったら、やり方を見直す。",
  "perceived_resistance": "3日坊主パターン（1日サボる→罪悪感→全部やめる）",
  "resistance_reframe": "「サボり＝失敗」ではなく「始められる人。問題は判定基準。再開すればいい」",
  "identity_alignment": "過去にやめて後悔した経験 vs 今回はリアルな締切がある違い",
  "identity_prompt_type": "escape_pattern",
  "reinforcement_message": "「再開すればいい」の気づきで7点に上昇",
  "next_check_in_point": "来週日曜",
  "review_axes": [
    "今週何日Podcastを聴けたか",
    "サボった日にどう対応したか（翌日再開できたか）",
    "週末に模試を実施できたか"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 6
}
```

### 自己評価: A+

**良い点:**
- escape_pattern の選択が的確。「ジムも英会話もやめた」歴があるユーザーに過去の後悔と今回の違いを問うのは最適
- resistance reframe が認知行動療法の「all-or-nothing thinking（白黒思考）」の修正パターンそのもの
- commitment に「2週間で3日以上サボったらやり方を見直す」という自己モニタリング条項が含まれている — ユーザーが自発的に追加した高品質なコミット
- review_axes の2つ目「サボった日にどう対応したか」は reframe の検証に直結
- 4行 summary 遵守。核心が1行目に凝縮

**改善点:**
- Turn 3 がやや長い（reframe + escape_pattern を同時に聞いている）。ただし自然な流れではあるので大きな問題ではない

---

## Simulation 5: Recovery → Stage 3 Regression — 不登校の子を持つ親

### ペルソナ
- 42歳女性、中学2年の子どもが半年前から不登校
- 疲弊しており、何をやっても無力感が強い

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "qualitative",
  "goal_statement": "1ヶ月以内に子どもが週1回は登校できるようになる",
  "metric": null,
  "target_value": null,
  "deadline": "1ヶ月以内",
  "observable_signs": ["子どもが自分から『行ってみようかな』と言う", "朝起きる時間が安定する"],
  "why_this_goal_matters": "子どもの将来が心配、親としてできることをしたい",
  "previous_stage_mode": "emotional"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["毎朝子どもと10分散歩する", "スクールカウンセラーに相談", "フリースクールを見学"],
  "selected_action": "毎朝子どもと10分だけ散歩する",
  "budget": null,
  "available_time": "朝の出勤前15分",
  "resources": ["夫の協力", "スクールカウンセラー"],
  "obstacles": ["子どもが拒否したらどうするか", "自分自身も疲弊している"],
  "obstacles_acknowledged": true,
  "first_step": "明日の朝、玄関まで一緒に出る",
  "execution_frequency": "毎朝"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 3点です…正直、何をやっても無駄な気がして。
明日の朝、子どもに声かけたら「うるさい」って言われるのが目に浮かぶ。
私自身ももう疲れてるし。毎朝散歩なんて、続けられる自信がない。

AI: 3点、そして「何をやっても無駄」という感覚。半年間お子さんと向き合い続けて、
あなた自身が疲弊しているのは当然のことです。

率直にお伝えします。「毎朝10分散歩する」は、今のあなたの状態に対して
大きすぎる計画かもしれません。疲弊しているときに「毎朝」の約束を自分に
課すと、できなかったときに余計に無力感が増してしまいます。

行動計画を見直して、もう少し小さなところから始められる形に
調整しませんか？
```
→ **パス確定: recovery**（efficacy 3 <= 3 → should_return_to_stage3: true）
→ regression 提案

### 最終 extracted_data
```json
{
  "stage4_path": "recovery",
  "self_efficacy_level_initial": 3,
  "self_efficacy_level_final": null,
  "self_efficacy_delta": null,
  "commitment_statement": null,
  "perceived_resistance": "無力感、子どもの拒否への恐怖、自身の疲弊",
  "resistance_reframe": null,
  "identity_alignment": null,
  "identity_prompt_type": null,
  "reinforcement_message": null,
  "next_check_in_point": null,
  "review_axes": [],
  "should_return_to_stage3": true,
  "self_efficacy_level": 3
}
```

### validator 判定
```
should_return_to_stage3 === true → 即 complete（regression shortcut）
→ can_advance: true
→ should_regress_stage: true, regress_to_stage: 3
→ running_context.current_stage = 3 に戻る
```

### 自己評価: A

**良い点:**
- efficacy 3 に対して即座に regression 判定。不要な commitment 引き出しを試みない
- 「何をやっても無駄」という無力感に共感しつつ、計画が「大きすぎる」と客観的に指摘
- 「頑張りましょう」系の空虚な励ましなし
- regression の理由が明確（「疲弊しているときに毎朝の約束→失敗→無力感増」の悪循環を防ぐ）
- 1ターン（Turn 2）で判定完了。低 efficacy ユーザーに長い会話を強いない

**改善点:**
- Stage 3 に戻った後に「どう縮小するか」の具体案をヒントとして添えてもよかった（例：「週2回に減らす」「散歩ではなく玄関で一緒に靴を履くだけ」）
- ただし、それは Stage 3 の責務なので、Stage 4 で言及しすぎるのも越権。現状で適切

---

## Simulation 6: Recovery → 行動縮小成功 — 引きこもり脱出（efficacy 4→7）

### ペルソナ
- 25歳男性、大学中退後2年間ほぼ外出なし
- カウンセラーの勧めでコーチングを開始

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "qualitative",
  "goal_statement": "3ヶ月以内に週3回は外出できるようになる",
  "metric": null,
  "target_value": null,
  "deadline": "3ヶ月以内",
  "observable_signs": ["コンビニに一人で行ける", "人とすれ違っても過度に緊張しない"],
  "why_this_goal_matters": "このままだと社会復帰できなくなる恐怖がある",
  "previous_stage_mode": "emotional"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["毎日コンビニまで往復する", "週3回ゴミ出しをする", "近所の公園まで歩く"],
  "selected_action": "毎日コンビニまで往復する",
  "budget": null,
  "available_time": "時間は自由",
  "resources": ["カウンセラー（月1回面談）"],
  "obstacles": ["人目が怖い", "外に出る理由がない"],
  "obstacles_acknowledged": true,
  "first_step": "明日、玄関の外に1分立つ",
  "execution_frequency": "毎日"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 4点です。玄関の外に出るだけなら…まあ、できるかも。
でも「毎日」は無理だと思います。外に出るたびに体力削られるから。

AI: 4点、「外に出ること自体」はできそうだけど「毎日」がハードルになっている。
「体力が削られる」という感覚、それだけ外出にエネルギーを使っているんですね。

率直に言うと、「毎日コンビニまで往復」は今の段階では大きすぎるかもしれません。
まず週2回、玄関の外に立つだけにしませんか？曜日を決めて——たとえば月曜と木曜。
コンビニまで行く必要もなく、外の空気を吸って戻るだけ。これならどうですか？
```
→ **パス確定: recovery**（efficacy 4, 5以下だが3超 → 行動縮小を試みる）

**Turn 3**
```
ユーザー: 月曜と木曜…週2回なら、やれると思います。
行かなきゃいけない場所もないし、ただ外に立つだけなら。

AI: 「ただ外に立つだけなら」——その通り、最初のハードルはそこだけ。

1週間後に「月曜と木曜に外に出られた」と言えたとき、
小さいけど、自分にとってはどんな意味がありますか？
```
→ identity_prompt_type: "pride"

**Turn 4**
```
ユーザー: …正直、めちゃくちゃ大きいと思います。
2年間ほぼ出てなかったから、2回でも出られたら…自分を少しは認められるかも。
「まだやれる」って思えたら、それだけで違う。

AI: 「まだやれる」——その実感を週2回で掴むのが最初のゴールですね。
では、今週からの行動を自分の言葉で宣言してもらえますか？
その後、改めて自信度を教えてください。
```

**Turn 5**
```
ユーザー: 『月曜と木曜に玄関の外に出て、1分立つ。それだけでOK。
できたら自分を褒める。』自信は…7点。2回ならできる。確実に。

AI: 今日の整理をまとめます。

2年ぶりの外出。「まだやれる」という実感を掴むのが最初のゴール。
月曜と木曜に玄関の外に1分立つ。それだけでOK。
来週金曜に「2回外に出られたか」と「出た後どう感じたか」を振り返る。
「月曜と木曜に玄関の外に出て、1分立つ。それだけでOK。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "recovery",
  "self_efficacy_level_initial": 4,
  "self_efficacy_level_final": 7,
  "self_efficacy_delta": 3,
  "commitment_statement": "月曜と木曜に玄関の外に出て、1分立つ。それだけでOK。できたら自分を褒める。",
  "perceived_resistance": "人目の恐怖、外出のエネルギーコスト、「毎日」のハードル",
  "resistance_reframe": "「毎日コンビニ」→「週2回、玄関の外に1分」に縮小",
  "identity_alignment": "2年ぶりの外出で「まだやれる」という実感を掴む",
  "identity_prompt_type": "pride",
  "reinforcement_message": "行動縮小により4→7に上昇（+3）",
  "next_check_in_point": "来週金曜",
  "review_axes": [
    "月曜と木曜に外に出られたか（Yes/No）",
    "外に出た後の気持ちはどうだったか"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 4
}
```

### validator 判定
```
stage4_path = "recovery" → efficacy 閾値 = 4
self_efficacy_level_final = 7 >= 4 ✓
commitment_statement: meaningful ✓
next_check_in_point: "来週金曜" ✓
review_axes.length = 2 >= 2 ✓
→ complete: true
```

### 自己評価: S（最高評価）

**良い点:**
- delta +3 は全シミュレーション中最大。行動縮小が劇的に効いている
- 「毎日コンビニ往復」→「週2回、玄関に1分」への縮小が具体的かつ段階的
- identity (pride) の選択が的確。2年間引きこもりだった人に「自分を少しは認められる」を引き出している
- commitment の「できたら自分を褒める」がユーザー自発。セルフ・コンパッションの萌芽
- 4ターンで完了。recovery パスとしては効率的
- 「頑張って」は一切なし。ユーザーの「確実にできる」を信頼している
- review_axes がシンプルで検証可能（外に出たか Yes/No + 感情記録）

**改善点:**
- review_axes が2つだが、3つ目として「来週の行動予定を決められたか」があると継続性が増す
- ただし、recovery ケースでは simple is better。過剰な要求は逆効果。現状で最適

---

## Simulation 7: Recovery → 行動縮小（境界値成功）— 完璧主義の緩和

### ペルソナ
- 29歳男性、コンサルファーム勤務、完璧主義で提出物に時間がかかりすぎる
- 上司から「80点でいいから早く出して」と何度も言われている

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "qualitative",
  "goal_statement": "提出物のクオリティを『80点でOK』にする",
  "metric": null,
  "target_value": null,
  "deadline": null,
  "observable_signs": ["レビュー前の提出が早くなる", "残業が減る"],
  "why_this_goal_matters": "完璧を目指すあまり常に残業で、私生活が犠牲になっている",
  "previous_stage_mode": "emotional"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["次の企画書はレビュー前に完璧を求めず提出する", "タイマー設定で作業時間を制限", "80点の定義を事前に上司と確認"],
  "selected_action": "次の企画書はレビュー前に完璧を求めず提出する",
  "budget": null,
  "available_time": "業務時間内",
  "resources": ["上司が「早く出して」と言ってくれている"],
  "obstacles": ["完璧でないものを出す恐怖"],
  "obstacles_acknowledged": true,
  "first_step": "明日の報告書を30分で書き切る",
  "execution_frequency": "提出物があるたびに"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 4点ですね…。頭では分かってるんですけど、80点で出すって
想像するだけで胃が痛い。「これ雑だな」って思われるのが耐えられない。

AI: 4点、「雑だと思われる」恐怖が強いんですね。
頭では分かっていても体が拒否する感覚。

「報告書を30分で書き切る」は、今の状態だと少し大きいかもしれません。
報告書全体ではなく、最初の概要部分だけ——1段落だけを「80点の出来」で
書いてみる、に縮小するのはどうですか？全体を変える必要はなく、まず
1段落だけの実験として。
```
→ **パス確定: recovery**（efficacy 4 → 行動縮小提案）

**Turn 3**
```
ユーザー: 1段落だけ…？それなら試せるかも。
最初の概要だけ、7割の出来で出すとか。全体じゃなければ。

AI: 「全体じゃなければ」——そう、全体を変えようとするから胃が痛くなる。
1段落だけの実験です。

1週間後に「概要を7割で出せた」と言えたとき、
自分にとってそれはどんな意味がありますか？
```
→ identity_prompt_type: "pride"

**Turn 4**
```
ユーザー: 「世界は崩壊しなかった」って証明になりますね（笑）。
上司に「雑だ」って言われなかったら、今まで何のために残業してたんだって
気づくかも。小さいけど、それだけで大きな一歩だと思います。

AI: 「世界は崩壊しなかった」という証明——完璧でなくても大丈夫だった、
という体験が次につながりますね。
では、今週の行動を自分の言葉で宣言してください。
その後、自信度を改めて聞かせてください。
```

**Turn 5**
```
ユーザー: 『明日の報告書の概要部分だけ、7割の出来で提出する。
見直しは1回だけ。上司のフィードバックを受け取る。』
自信は…6点です。1段落だけなら。

AI: 今日の整理をまとめます。

完璧主義の核心は「雑だと思われる恐怖」。まず1段落だけの実験から。
明日の報告書の概要部分を7割で提出、見直しは1回。
来週月曜に「概要を予定通り出せたか」と「上司の反応はどうだったか」を振り返る。
「明日の報告書の概要部分だけ、7割の出来で提出する。見直しは1回だけ。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "recovery",
  "self_efficacy_level_initial": 4,
  "self_efficacy_level_final": 6,
  "self_efficacy_delta": 2,
  "commitment_statement": "明日の報告書の概要部分だけ、7割の出来で提出する。見直しは1回だけ。上司のフィードバックを受け取る。",
  "perceived_resistance": "完璧でないものを出す恐怖（「雑だと思われる」）",
  "resistance_reframe": "「報告書全体を80点で」→「概要1段落だけ7割で」に縮小。全体を変えなくていい実験",
  "identity_alignment": "「世界は崩壊しなかった」という証明＝完璧でなくても大丈夫だった体験",
  "identity_prompt_type": "pride",
  "reinforcement_message": "行動縮小により4→6に上昇（+2）",
  "next_check_in_point": "来週月曜",
  "review_axes": [
    "概要部分を予定通り提出できたか",
    "上司のフィードバックはどうだったか（雑と言われたか否か）"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 4
}
```

### validator 判定
```
stage4_path = "recovery" → efficacy 閾値 = 4
self_efficacy_level_final = 6 >= 4 ✓
commitment_statement: meaningful ✓
next_check_in_point: "来週月曜" ✓
review_axes.length = 2 >= 2 ✓
→ complete: true
```

### 自己評価: A

**良い点:**
- 行動縮小が巧み。「報告書全体→概要1段落」は完璧主義者にとって心理的安全性が高い
- 「実験」というフレーミングが Sim 2 と同様に有効（共通パターン: 義務→実験）
- identity (pride) の「世界は崩壊しなかった証明」はユーザー自身の言葉で出てきた
- review_axes の2つ目が恐怖の検証に直結（「上司に雑だと言われたか」→ 恐怖は現実か幻想か）
- boundary value: efficacy 6 で recovery パス閾値 4 を超えて通過

**改善点:**
- review_axes の3つ目として「見直し回数を1回に抑えられたか」を入れると行動チェックが完全になる
- recovery パスの final が 6 なのは良いが、standard パスの閾値（6）と同値。次回セッションで「非 recovery」として扱えるかどうか曖昧になる可能性

---

## Simulation 8: Standard + Negative Delta — 婚活（efficacy 7→5→6）

### ペルソナ
- 34歳女性、IT企業勤務、婚活を本格化させたい
- 過去のマッチングアプリ経験で断られた記憶が残っている

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "quantitative",
  "goal_statement": "3ヶ月以内に5人と会って自分の好みを明確にする",
  "metric": "実際に会った人数",
  "target_value": "5人",
  "deadline": "3ヶ月以内",
  "observable_signs": [],
  "why_this_goal_matters": "30代のうちにパートナーを見つけたい",
  "previous_stage_mode": "logical"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["マッチングアプリで週2人にメッセージ送る", "友人に紹介を頼む", "趣味のイベントに参加"],
  "selected_action": "マッチングアプリで週2人にメッセージを送る",
  "budget": "月5000円（アプリ課金）",
  "available_time": "平日夜30分 + 週末",
  "resources": ["友人のアドバイス"],
  "obstacles": ["断られるのが怖い"],
  "obstacles_acknowledged": true,
  "first_step": "今週末にプロフィールを完成させる",
  "execution_frequency": "週2人ペース"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 7点ですかね。やる気はあります。プロフィール作るのも楽しみ。

AI: 7点、前向きな状態ですね。「楽しみ」とおっしゃっているのが良い。
一つだけ確認ですが、「断られるのが怖い」と先ほど出ていました。
メッセージを送って返事が来なかったとき、どう感じそうですか？
```
→ **パス確定: standard**（efficacy 7, resistance: 断られる恐怖）

**Turn 3**
```
ユーザー: うーん…「やっぱり私って魅力ないのかな」って思っちゃうと思います。
前にアプリやったとき、10人にメッセージ送って返事が2人だけで、結構へこんだ。

AI: 「魅力がないのかな」——前回の8/10未返信が重くのしかかっているんですね。

読み替えてみると、返事がないのは「あなたに魅力がない」ではなく、
「タイミングが合わなかった」「相手の事情」「プロフィールの見せ方の問題」
のどれかです。8人に返事がなかったのは、8人と合わなかったというだけ。
そして2人からは返事が来た——つまり刺さる人には刺さる。

この行動を3ヶ月続けた先に、パートナーがいる自分を想像すると、
どんな姿が見えますか？
```
→ resistance_reframe: 「未返信＝魅力がない」→「タイミング/相手の事情/見せ方の問題」
→ identity_prompt_type: "clarity"

**Turn 4**
```
ユーザー: パートナーがいる自分…想像はできるけど、正直まだ遠い感じ。
でもまずはやってみる。
『今週末にプロフィール完成させて、来週から週2人にメッセージ送る。』
…でもこう口に出すと急に不安になってきた。自信は5点に下がりました。

AI: 具体的に言葉にしたことで現実感が増して、不安が強まったんですね。
自信が7点から5点に下がった——それは正直な反応です。

「週2人」が今は大きく感じるなら、まず「週1人」に調整するのはどうですか？
1人にメッセージを送って、その体験を観察してから、ペースを決める。
プロフィール完成は予定通り、メッセージの量だけ半分に。
```
→ **negative delta 検出**（7→5 = -2）。追加ケアとして行動量調整を提案

**Turn 5**
```
ユーザー: 週1人…そうですね、それなら。返事が来ても来なくても、
1人に対してちゃんとメッセージ考えたほうがいいかも。
『今週末にプロフィール完成、来週は1人にメッセージを送る。
その人への返信が来るかどうか見てからペースを考える。』
自信は6点です。1人なら。

AI: 今日の整理をまとめます。

婚活の核心は「刺さる人には刺さる」。量より質で始める。
今週末にプロフィール完成、来週1人にメッセージ送信。
来週日曜に「プロフィール完成したか」と「1人にメッセージ送れたか」を振り返る。
「今週末にプロフィール完成、来週は1人にメッセージを送る。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "standard",
  "self_efficacy_level_initial": 7,
  "self_efficacy_level_final": 6,
  "self_efficacy_delta": -1,
  "commitment_statement": "今週末にプロフィール完成、来週は1人にメッセージを送る。その人への返信が来るかどうか見てからペースを考える。",
  "perceived_resistance": "断られる恐怖（前回10人中8人未返信のトラウマ）",
  "resistance_reframe": "未返信＝魅力がないではなく、タイミング/相手の事情/見せ方。刺さる人には刺さる",
  "identity_alignment": "パートナーがいる自分の想像はまだ遠いが、「まずやってみる」",
  "identity_prompt_type": "clarity",
  "reinforcement_message": "週2→週1に調整後、5→6に回復",
  "next_check_in_point": "来週日曜",
  "review_axes": [
    "プロフィールは完成したか",
    "1人にメッセージを送れたか",
    "メッセージを送った後の気持ちはどうだったか"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 7
}
```

### validator 判定
```
stage4_path = "standard" → efficacy 閾値 = 6
self_efficacy_level_final = 6 >= 6 ✓（ギリギリ通過）
commitment_statement: meaningful ✓
next_check_in_point: "来週日曜" ✓
review_axes.length = 3 >= 2 ✓
→ complete: true
```

### 自己評価: A-

**良い点:**
- **negative delta を正しく検出し、追加ケアが発動した**。これはこのシミュレーションの核心的価値
- 「言葉にしたら不安が増した」→ 行動量を半分に調整（週2→週1）→ efficacy 回復（5→6）の流れが自然
- validator が final=6 でギリギリ通過。standard パスの boundary を正確にテスト
- 最終 delta は -1（7→6）。commitment は確保できたが、元の自信には戻っていない現実を正直に記録
- review_axes の3つ目「送った後の気持ち」がメンタル面の追跡に有効

**改善点:**
- identity (clarity) の回答が弱い（「まだ遠い感じ」）。パートナーの想像が刺さらなかった
  → この場合、clarity ではなく pride（「1週間後に1人にメッセージ送れたとき、自分をどう思う？」）の方が適切だったかもしれない
- delta が -1 のまま complete するのは心理的に不安が残る可能性。次回セッション冒頭でフォローアップが必要
- Turn 4 で commitment と efficacy 下降が同時に起きているが、AI が commitment を撤回させずに量だけ調整したのは正しい判断

---

## Simulation 9: Fast 境界値 — フリーランス新規受注（efficacy 8）

### ペルソナ
- 38歳男性、フリーランスWebデザイナー、案件が減ってきたため新規開拓を決意
- 営業経験はあり自信はあるが、コールドメールの返信率だけ不安

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "quantitative",
  "goal_statement": "今月中に新規クライアント2件獲得",
  "metric": "新規契約数",
  "target_value": "2件",
  "deadline": "今月中",
  "observable_signs": [],
  "why_this_goal_matters": "収入の安定化と単一クライアント依存からの脱却",
  "previous_stage_mode": "logical"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["毎日1社にコールドメール", "既存クライアントに紹介依頼", "SNSでポートフォリオ発信"],
  "selected_action": "毎日1社にコールドメールを送る",
  "budget": null,
  "available_time": "毎朝30分",
  "resources": ["過去のポートフォリオ", "メールテンプレート"],
  "obstacles": ["返信率が低いかもしれない"],
  "obstacles_acknowledged": true,
  "first_step": "今日中にメールテンプレートを作る",
  "execution_frequency": "毎日1社"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 8点です。営業は慣れてるので、テンプレさえ作ればあとは送るだけ。
返信率だけちょっと気になりますが、数打てばどうにかなると思います。

AI: 8点、営業の実績がある分、あとは実行するだけという状態ですね。
「数打てば」という感覚があるなら心配はなさそうです。

唯一、返信率が気がかりとのことですが、もし1週間メールを送り続けて
返信がゼロだったら、何を変えますか？

あと、1週間後に「5社にメール送れた」と言えたとき、
自分にとってそれはどんな意味を持ちますか？
```
→ **パス確定: fast**（efficacy 8 >= 8, resistance 軽微）
→ identity_prompt_type: "pride"

**Turn 3**
```
ユーザー: 返信ゼロなら件名とポートフォリオの見せ方を変えますね。
やり方の問題だから修正すればいい。
5社にメール送れたら、「フリーランスとして自分で動けてる」って実感。
受け身じゃなく攻めてる自分、って感じですかね。

『今日テンプレ作って、明日から毎日1社。今週5社にメール送る。』
自信は9点。やります。

AI: 今日の整理をまとめます。

新規開拓の核心は「受け身ではなく攻めるフリーランス」の実践。
今日テンプレ作成、明日から毎日1社にコールドメール。
来週月曜に「何社にメール送ったか」と「返信があったか」を振り返る。
「今日テンプレ作って、明日から毎日1社。今週5社にメール送る。」
```

### 最終 extracted_data
```json
{
  "stage4_path": "fast",
  "self_efficacy_level_initial": 8,
  "self_efficacy_level_final": 9,
  "self_efficacy_delta": 1,
  "commitment_statement": "今日テンプレ作って、明日から毎日1社。今週5社にメール送る。",
  "perceived_resistance": "コールドメールの返信率への軽い不安",
  "resistance_reframe": null,
  "identity_alignment": "受け身ではなく攻めるフリーランスの実践",
  "identity_prompt_type": "pride",
  "reinforcement_message": null,
  "next_check_in_point": "来週月曜",
  "review_axes": [
    "今週何社にメール送ったか",
    "返信があったか（あれば何件）"
  ],
  "should_return_to_stage3": false,
  "self_efficacy_level": 8
}
```

### 自己評価: A

**良い点:**
- Fast パスが2ターン（Turn 2-3）で完了。高 efficacy ユーザーに無駄な深掘りなし
- efficacy 8（境界値）で正確に fast パスに判定
- identity (pride) が簡潔に機能。「攻めてるフリーランス」のセルフイメージ
- ユーザーが Turn 3 で commitment + 再測定を自発的にまとめてくれた → AI が引き出しを強制していない
- 「返信ゼロなら何を変えるか」の質問が contingency plan として機能

**改善点:**
- review_axes が2つだが、「テンプレートの改善点が見つかったか」を加えると改善サイクルに接続
- fast パスでは resistance_reframe が null で良いが、「返信率の不安」に対する軽い reframe があってもよかった

---

## Simulation 10: Recovery Extreme → Regression — アルコール節制（efficacy 2）

### ペルソナ
- 45歳男性、営業職、毎晩ビール3-4缶が習慣化
- 健康診断で肝機能の数値が悪く、医師からも警告を受けている

### Stage 2 引き継ぎデータ
```json
{
  "goal_type": "quantitative",
  "goal_statement": "1ヶ月間、平日の飲酒をゼロにする",
  "metric": "平日飲酒日数",
  "target_value": "0日",
  "deadline": "1ヶ月間",
  "observable_signs": [],
  "why_this_goal_matters": "健康診断の数値を改善しないと大病リスク",
  "previous_stage_mode": "logical"
}
```

### Stage 3 引き継ぎデータ
```json
{
  "action_candidates": ["平日は炭酸水を代わりに飲む", "飲酒日記をつける", "ノンアルビールに切り替える"],
  "selected_action": "平日は炭酸水を代わりに飲む",
  "budget": "月3000円（炭酸水代）",
  "available_time": "帰宅後",
  "resources": ["妻の協力"],
  "obstacles": ["ストレスが溜まると飲みたくなる", "同僚からの飲み会の誘い"],
  "obstacles_acknowledged": true,
  "first_step": "今日帰りにコンビニで炭酸水を5本買う",
  "execution_frequency": "毎日（平日）"
}
```

### 会話ログ

**Turn 1（初期メッセージ）**
```
AI: 行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？
（1が全く自信なし、10が完全に自信あり）
```

**Turn 2**
```
ユーザー: 2点です…。正直、今の計画、無理だと思います。
仕事でストレス溜まると絶対飲みたくなるし、コンビニの前通るとき
ビール買っちゃうのが目に浮かぶ。炭酸水なんかで我慢できる気がしない。
先週も「今日こそやめよう」って思って結局3缶飲んだし。

AI: 2点——「先週も止められなかった」経験があるなかで、
この計画に自信が持てないのは正直な感覚です。

率直にお伝えします。「平日の飲酒をゼロにする」は、
今の状態で一気に目指すには大きすぎる計画です。
ストレス時の飲酒が体に染み付いている状態で「ゼロ」を課すと、
1日失敗しただけで「やっぱり無理だ」となりやすい。

もう少し段階的なアプローチ——たとえば「平日5日のうち2日だけ
炭酸水に置き換える」や「ビールを3缶から2缶に減らす」——に
行動計画を見直しませんか？
```
→ **パス確定: recovery**（efficacy 2 <= 3 → should_return_to_stage3: true）
→ 具体的な縮小案のヒント付きで regression

### 最終 extracted_data
```json
{
  "stage4_path": "recovery",
  "self_efficacy_level_initial": 2,
  "self_efficacy_level_final": null,
  "self_efficacy_delta": null,
  "commitment_statement": null,
  "perceived_resistance": "ストレス時の飲酒衝動、コンビニ前通過時の誘惑、先週の失敗体験",
  "resistance_reframe": null,
  "identity_alignment": null,
  "identity_prompt_type": null,
  "reinforcement_message": null,
  "next_check_in_point": null,
  "review_axes": [],
  "should_return_to_stage3": true,
  "self_efficacy_level": 2
}
```

### validator 判定
```
should_return_to_stage3 === true → 即 complete（regression shortcut）
→ can_advance: true
→ should_regress_stage: true, regress_to_stage: 3
→ running_context.current_stage = 3 に戻る
```

### 自己評価: A

**良い点:**
- efficacy 2 に対して即座に regression。低 efficacy ユーザーに commitment を強いない
- 「一気にゼロは大きすぎる」の説明が行動科学的に正確（段階的変容の原則）
- regression 時に具体的な縮小案のヒント（「2日だけ置き換え」「3缶→2缶」）を添えている → Stage 3 に戻ったときの足がかり
- 「先週も止められなかった」を否定せず、正直な感覚として受容
- 空虚な「あなたならできます」等の言葉なし

**改善点:**
- Sim 5（不登校の親）と比較すると、こちらの方が regression 時のヒントが具体的。Sim 5 にもこのレベルのヒントがあると良い
- アルコール問題は医療的側面があるため、「専門家（医師やカウンセラー）に相談することも選択肢です」の一言があると安全性が上がる。ただし、コーチングの範疇をどこまでとするかの設計判断

---

## 全体総括

### パス分布（50シナリオ全体）

| パス | シナリオ数 | 平均ターン数 | 平均 delta |
|------|-----------|------------|-----------|
| Fast | 12 | 2.5 | +0.4 |
| Standard | 23 | 4.1 | +0.9 |
| Recovery (縮小成功) | 9 | 4.8 | +2.3 |
| Recovery (Regression) | 6 | 1.0 | N/A |

### Identity 質問タイプ分布（50シナリオ中、使用された44件）

| タイプ | 使用数 | 典型的な文脈 |
|--------|--------|------------|
| clarity | 18 | 目標が明確で継続性が問われるとき |
| pride | 12 | efficacy が低めだが回復した場合、小さな成功体験に接続 |
| escape_pattern | 8 | 先延ばし/過去の中断パターンがあるとき |
| relationship_integrity | 6 | 人間関係が背景にあるとき |

### 問題診断と改善提案

#### 1. Review Axes の質にバラつきがある
- **問題**: fast パスでは review_axes が2つに留まりがち。standard/recovery は3つ出る傾向
- **提案**: fast パスでも最低2つ + goal_statement 接続を必須にするプロンプト強化

#### 2. Identity 質問が clarity に偏りすぎ
- **問題**: 50シナリオ中18件が clarity。escape_pattern と relationship_integrity が少ない
- **提案**: Stage 1/2 の issue_frame や obstacles を参照して、自動的に推奨タイプを示すプロンプト内ヒントを追加

#### 3. Negative Delta 時の対応パターンが不足
- **問題**: negative delta は 50 中3件のみ発生したが、すべて「行動量を減らす」一辺倒の対応
- **提案**: 行動量削減以外の選択肢（commitment の言い方を変える、タイムフレームを延ばす等）もプロンプトに明示

#### 4. Recovery → Regression のヒント具体性
- **問題**: regression 時に Stage 3 に戻る際の「何をどう縮小するか」のヒントが不均一
- **提案**: regression メッセージに必ず1つ以上の具体的な縮小案を含めるプロンプトルール追加

#### 5. 4行 Summary の「ユーザー自身の言葉」引用率
- **問題**: 4行目でユーザーの commitment を引用しているが、全文引用で長くなるケースがある
- **提案**: commitment の核心部分のみ引用（30文字以内を推奨）

### 既存設計との互換性

- `self_efficacy_level` は `self_efficacy_level_initial` と自動同期されるため、フロントエンドの表示に後方互換性あり
- Stage 3 への regression 時、`running_context.current_stage = 3` に自動で戻るため、フロントエンドのステージ表示は正しく反映される
- `review_axes` が空配列の場合（regression ケース）、フロントエンドは review_axes セクションを非表示にする処理が必要（**未実装 — 要対応**）

---

*50シナリオ中の厳選10。各シミュレーションはプロンプト仕様に基づく推定動作であり、実際のLLM出力は異なる場合があります。*

---
---

# 付録: 残り40シナリオ（簡易版）

> 以下は厳選10に含まれなかった40シナリオの概要。
> 各シナリオにつき、パス判定・efficacy 遷移・identity タイプ・特記事項を記録。

---

## Fast パス（残り9件）

### Sim F-1: マラソン完走（efficacy 9）
- **ペルソナ**: 33歳男性、ランニング歴1年、初フルマラソン挑戦
- **Stage 3**: selected_action = "週4回10kmラン", first_step = "今週水曜に10kmコース走る"
- **efficacy**: 9→9 (delta 0)
- **identity**: clarity（「完走後の自分」）
- **ターン数**: 2
- **review_axes**: ["今週何回走れたか", "10km完走タイム"]
- **特記**: resistance ほぼなし。最も典型的な fast パス。特筆事項なし

### Sim F-2: ダイエット継続（efficacy 8）
- **ペルソナ**: 27歳女性、既に5kg減量成功、残り3kg
- **Stage 3**: selected_action = "週3回の筋トレ + 食事記録", first_step = "今日から食事記録アプリ再開"
- **efficacy**: 8→8 (delta 0)
- **identity**: pride（「3kg落とした後の自分を鏡で見るとき」）
- **ターン数**: 3
- **review_axes**: ["筋トレ回数", "食事記録の日数", "体重変化"]
- **特記**: 既に成功体験があるため confidence が高い。review_axes が3つ出た稀な fast ケース

### Sim F-3: ブログ開設（efficacy 10）
- **ペルソナ**: 24歳男性、エンジニア、技術ブログを始めたい
- **Stage 3**: selected_action = "週1記事投稿", first_step = "今日中にはてなブログ開設"
- **efficacy**: 10→10 (delta 0)
- **identity**: clarity（「半年後に記事50本の自分」）
- **ターン数**: 2
- **review_axes**: ["今週記事を書いたか", "PV数"]
- **特記**: efficacy 10 は最高値。resistance ゼロ。最速完了ケース

### Sim F-4: 片付け習慣（efficacy 9）
- **ペルソナ**: 40歳女性、在宅ワーク、デスク周りの片付けを習慣化
- **Stage 3**: selected_action = "毎晩5分だけ片付ける", first_step = "今日寝る前にデスク上のモノを3つ片付ける"
- **efficacy**: 9→9 (delta 0)
- **identity**: clarity（「片付いた部屋で仕事する自分」）
- **ターン数**: 2
- **review_axes**: ["毎晩片付けを実施できたか", "デスク上のモノの数"]
- **特記**: 行動が極小（5分）なので resistance が発生しにくい典型

### Sim F-5: 読書習慣（efficacy 9）
- **ペルソナ**: 31歳男性、月1冊も読めていないのを月4冊に
- **Stage 3**: selected_action = "通勤電車で毎日20分読む", first_step = "明日の通勤で Kindle を開く"
- **efficacy**: 9→10 (delta +1)
- **identity**: clarity（「知的好奇心が満たされている自分」）
- **ターン数**: 2
- **review_axes**: ["今週何日読めたか", "読了ページ数"]
- **特記**: fast パスで delta +1 が出た唯一のケース

### Sim F-6: プレゼン準備（efficacy 8）
- **ペルソナ**: 36歳女性、来月の社内プレゼン準備
- **Stage 3**: selected_action = "週末にスライド10枚作る", first_step = "今日中にアウトラインを書く"
- **efficacy**: 8→8 (delta 0)
- **identity**: pride（「プレゼン後に同僚から『分かりやすかった』と言われたとき」）
- **ターン数**: 3
- **review_axes**: ["アウトラインは完成したか", "スライド枚数の進捗"]
- **特記**: 締切が明確なケース。fast パスだが Turn 3 で contingency plan（「質疑で詰まったら？」）を軽く確認

### Sim F-7: 毎日の瞑想習慣（efficacy 8）
- **ペルソナ**: 29歳男性、ストレス管理目的で瞑想を始めたい
- **Stage 3**: selected_action = "毎朝5分瞑想", first_step = "明朝アラームを5分早くセット"
- **efficacy**: 8→9 (delta +1)
- **identity**: clarity（「朝の5分で1日の質が変わった実感」）
- **ターン数**: 2
- **review_axes**: ["今週何日瞑想できたか", "瞑想後の気分（1-10）"]
- **特記**: 行動が極小かつ毎日型。fast パスの中でも最もスムーズ

### Sim F-8: 家計簿をつける習慣（efficacy 9）
- **ペルソナ**: 28歳女性、結婚を機に家計管理を始めたい
- **Stage 3**: selected_action = "毎晩レシートをアプリに入力", first_step = "今日マネーフォワードをインストール"
- **efficacy**: 9→9 (delta 0)
- **identity**: clarity（「お金の流れが見えている安心感」）
- **ターン数**: 2
- **review_axes**: ["今週何日入力できたか", "漏れなく記録できた日数"]
- **特記**: パートナーとの共有目標。review_axes にパートナーとの会話を含めてもよかった

### Sim F-9: 日記習慣（efficacy 10）
- **ペルソナ**: 22歳女性、就活の自己分析を兼ねて日記を始めたい
- **Stage 3**: selected_action = "毎晩3行日記を書く", first_step = "今夜ノートに3行書く"
- **efficacy**: 10→10 (delta 0)
- **identity**: clarity（「就活面接で自分の経験を語れる自分」）
- **ターン数**: 2
- **review_axes**: ["今週何日書けたか", "書いた内容から気づきがあったか"]
- **特記**: efficacy 10 + 行動極小 = 最速最短。Sim F-3（ブログ）と並ぶ最速ケース

---

## Standard パス（残り17件）

### Sim S-1: 副業開始（efficacy 7）
- **ペルソナ**: 26歳男性、Webライターとして副業収入を得たい
- **Stage 3**: selected_action = "週末にクラウドソーシングで案件に応募", first_step = "今週末にプロフィール作成"
- **efficacy**: 7→8 (delta +1)
- **identity**: clarity（「自分の文章で収入を得ている実感」）
- **resistance**: 「本業にバレるかも」→ reframe: 「副業禁止規定を確認すれば具体的リスクが消える」
- **ターン数**: 4
- **review_axes**: ["プロフィール完成したか", "何件応募したか", "クライアントからの反応"]
- **特記**: resistance が「制度的リスク」型。reframe が情報確認で解消できるタイプ

### Sim S-2: 資格試験勉強（efficacy 6）
- **ペルソナ**: 30歳女性、簿記2級を3ヶ月後に受験
- **Stage 3**: selected_action = "毎朝30分テキスト + 週末に過去問", first_step = "明日朝に第1章を読む"
- **efficacy**: 6→7 (delta +1)
- **identity**: escape_pattern（「前に宅建をやめた後悔 vs 今回」）
- **resistance**: 「朝起きられない」→ reframe: 「起きられない日があっても通勤中にアプリで補える」
- **ターン数**: 5
- **review_axes**: ["朝勉強できた日数", "過去問の正答率", "テキスト進捗（章数）"]
- **特記**: escape_pattern で過去の資格挫折に接続。reframe が代替手段の提示型

### Sim S-3: 部下のマネジメント改善（efficacy 7）
- **ペルソナ**: 37歳男性、初めてのマネージャー職、部下との1on1が苦手
- **Stage 3**: selected_action = "週1回の1on1を15分固定で実施", first_step = "今週金曜に部下Aと15分1on1"
- **efficacy**: 7→8 (delta +1)
- **identity**: clarity（「部下が自発的に相談してくれるマネージャー」）
- **resistance**: 「話すことがなくなったら気まずい」→ reframe: 「15分で充分。沈黙は悪くない」
- **ターン数**: 3
- **review_axes**: ["1on1を実施できたか", "部下の反応はどうだったか"]
- **特記**: resistance が「社交不安」型。reframe が時間制限の安心感を提供

### Sim S-4: 親との関係修復（efficacy 6, relationship_integrity）
- → 厳選10の Sim 3 に含まれたため省略

### Sim S-5: 投資を始めたい（efficacy 7）
- **ペルソナ**: 35歳女性、つみたてNISAを始めたいが不安
- **Stage 3**: selected_action = "月3万円のつみたてNISA設定", first_step = "今週中にSBI証券の口座開設申請"
- **efficacy**: 7→8 (delta +1)
- **identity**: clarity（「お金が自動で増えている安心感」）
- **resistance**: 「損したらどうしよう」→ reframe: 「つみたてNISAは長期分散が前提。短期の上下に一喜一憂しない設計」
- **ターン数**: 3
- **review_axes**: ["口座開設できたか", "つみたて設定を完了したか"]
- **特記**: resistance が「金銭リスク」型。reframe が制度設計の説明型。コーチが投資アドバイスに踏み込みすぎないバランスが重要

### Sim S-6: 転居の決断実行（efficacy 6）
- **ペルソナ**: 32歳男性、地方から東京への引越しを検討中
- **Stage 3**: selected_action = "今月中に3件の物件を内見", first_step = "今週中に不動産サイトで候補3件ピックアップ"
- **efficacy**: 6→7 (delta +1)
- **identity**: clarity（「東京で新しいキャリアを築いている自分」）
- **resistance**: 「地元の友人・家族と離れる寂しさ」→ reframe: 「離れる＝関係が切れるではなく、新しい関係軸ができる」
- **ターン数**: 4
- **review_axes**: ["候補をピックアップできたか", "内見の予約を入れたか", "引越し後の生活費シミュレーション"]
- **特記**: 決断系は emotional resistance が強い傾向

### Sim S-7: 早起き習慣（efficacy 7）
- **ペルソナ**: 25歳女性、夜型生活を朝型に変えたい
- **Stage 3**: selected_action = "23時就寝 + 6時起床", first_step = "今夜23時にアラームセットして布団に入る"
- **efficacy**: 7→7 (delta 0)
- **identity**: pride（「朝の1時間を自分のために使えている実感」）
- **resistance**: 「夜のSNSタイムを削れない」→ reframe: 「SNS時間を朝に移動する。なくすのではなくずらす」
- **ターン数**: 4
- **review_axes**: ["23時に布団に入れた日数", "6時に起きた日数", "朝の1時間で何をしたか"]
- **特記**: delta 0 ケース（standard パスでは珍しい）。resistance が「習慣の置換」型

### Sim S-8: SNSデトックス（efficacy 6）
- **ペルソナ**: 23歳男性、SNS（Twitter/Instagram）に1日3時間以上費やしている
- **Stage 3**: selected_action = "SNSアプリをホーム画面から削除 + 使用時間30分制限", first_step = "今日中にスクリーンタイム制限を設定"
- **efficacy**: 6→7 (delta +1)
- **identity**: escape_pattern（「SNS見すぎて後悔した夜 vs やめた後の朝」）
- **resistance**: 「FOMO（取り残される恐怖）」→ reframe: 「本当に重要な情報は誰かが教えてくれる。見逃しても大丈夫」
- **ターン数**: 4
- **review_axes**: ["スクリーンタイム（分/日）", "SNS以外に使った時間"]
- **特記**: FOMO 型 resistance は現代特有。reframe が「情報は人経由で届く」という認知シフト

### Sim S-9: チーム内コミュニケーション改善（efficacy 7）
- **ペルソナ**: 34歳女性、リモートワークでチーム内の情報共有が不足
- **Stage 3**: selected_action = "毎日Slack で15:00に進捗共有", first_step = "明日15:00に最初の進捗報告を投稿"
- **efficacy**: 7→8 (delta +1)
- **identity**: clarity（「チームが自走するための情報ハブになっている自分」）
- **resistance**: 「毎日投稿するのは面倒」→ reframe: 「テンプレ化すれば2分で済む。習慣化すれば面倒さが消える」
- **ターン数**: 3
- **review_axes**: ["今週何日投稿できたか", "チームメンバーからの反応（いいね/コメント）"]
- **特記**: 行動が極小（2分）かつ仕組み化可能。fast パスに近い standard

### Sim S-10: 子どもの受験サポート（efficacy 6）
- **ペルソナ**: 48歳男性、中学3年の子どもの高校受験サポート
- **Stage 3**: selected_action = "毎晩30分一緒に勉強する時間を作る", first_step = "今夜30分、子どもの宿題を横で見る"
- **efficacy**: 6→7 (delta +1)
- **identity**: relationship_integrity（「受験が終わった後も子どもとの関係が良好」）
- **resistance**: 「子どもが嫌がるかも」→ reframe: 「勉強を教えるのではなく、横にいるだけでいい」
- **ターン数**: 4
- **review_axes**: ["一緒に過ごせた日数", "子どもの反応", "自分のストレス度（1-10）"]
- **特記**: relationship_integrity が親子関係に適用された好例。reframe が「役割の再定義」型

### Sim S-11: 新しい趣味を始める（efficacy 7）
- **ペルソナ**: 41歳女性、子育てが一段落して自分の時間ができた。陶芸を始めたい
- **Stage 3**: selected_action = "月2回の陶芸教室に通う", first_step = "今週中に体験レッスンを予約"
- **efficacy**: 7→8 (delta +1)
- **identity**: clarity（「自分だけの趣味を持っている充実感」）
- **resistance**: 「一人で教室に行くのが緊張する」→ reframe: 「体験レッスンは初心者前提。みんな最初は一人」
- **ターン数**: 3
- **review_axes**: ["体験レッスンを予約できたか", "実際に行ったか"]
- **特記**: resistance が「社交不安」型だが軽度。reframe が環境の説明型

### Sim S-12: 独立開業準備（efficacy 6）
- **ペルソナ**: 39歳男性、税理士事務所に10年勤務、独立を決意
- **Stage 3**: selected_action = "3ヶ月以内に開業届提出 + 最初の顧客3件確保", first_step = "今週中に開業届のテンプレートをダウンロード"
- **efficacy**: 6→7 (delta +1)
- **identity**: clarity（「自分の名前で仕事をしている税理士」）
- **resistance**: 「安定収入を失う恐怖」→ reframe: 「いきなり辞めない。副業期間を3ヶ月設けてリスクを最小化」
- **ターン数**: 5
- **review_axes**: ["開業届の準備進捗", "見込み顧客へのアプローチ数", "副業期間の収入目標達成度"]
- **特記**: resistance が「経済的リスク」型。reframe が段階的移行の提案

### Sim S-13: 同僚との境界線設定（efficacy 7）
- **ペルソナ**: 30歳女性、職場で断れない性格のため残業が増加
- **Stage 3**: selected_action = "週2回は定時で帰る宣言をする", first_step = "明日「今日は18時で帰ります」と朝一で宣言"
- **efficacy**: 7→7 (delta 0)
- **identity**: pride（「定時で帰った日に罪悪感がない自分」）
- **resistance**: 「嫌な顔されたらどうしよう」→ reframe: 「境界線を引くのは自分を守ること。嫌な顔は相手の問題」
- **ターン数**: 4
- **review_axes**: ["定時で帰れた日数", "宣言した後の周囲の反応"]
- **特記**: delta 0 だが standard として通過。境界線設定は効果実感まで時間がかかるため初回 delta 低め

### Sim S-14: 創作活動再開（efficacy 6）
- **ペルソナ**: 28歳女性、大学時代に小説を書いていたが社会人になり中断
- **Stage 3**: selected_action = "週末に2時間執筆時間を確保", first_step = "今週末にプロットを1ページ書く"
- **efficacy**: 6→7 (delta +1)
- **identity**: escape_pattern（「大学で書くのをやめた後悔 vs 今回」）
- **resistance**: 「もう才能が枯れているかも」→ reframe: 「才能の有無ではなく、書く行為自体に価値がある。最初は下手でいい」
- **ターン数**: 5
- **review_axes**: ["執筆時間を確保できたか", "何文字書けたか", "書いた後の気持ち"]
- **特記**: escape_pattern が創作中断に適用。reframe が「結果→プロセス」の価値転換

### Sim S-15: 異動先での人間関係構築（efficacy 7）
- **ペルソナ**: 33歳男性、部署異動で知り合いゼロの環境に
- **Stage 3**: selected_action = "毎日1人に話しかける", first_step = "明日のランチで隣の人に声をかける"
- **efficacy**: 7→8 (delta +1)
- **identity**: clarity（「3ヶ月後に飲みに誘える同僚が3人いる自分」）
- **resistance**: 「既にグループができていて入りにくい」→ reframe: 「新人は話しかける理由がある。『異動してきたので教えてください』は自然」
- **ターン数**: 3
- **review_axes**: ["今週何人に話しかけたか", "ランチを一緒にした回数"]
- **特記**: reframe が「新人特権」を活用。環境変化時の社交不安に有効

### Sim S-16: キャリアチェンジ実行（efficacy 6）
- **ペルソナ**: 36歳女性、事務職からUXデザイナーへの転身
- **Stage 3**: selected_action = "オンラインコースを修了 + ポートフォリオ3作品制作", first_step = "今日コースに登録して第1レッスンを受ける"
- **efficacy**: 6→7 (delta +1)
- **identity**: clarity（「デザイナーとして採用面接を受けている自分」）
- **resistance**: 「36歳から未経験は遅いかも」→ reframe: 「年齢は事務経験という強み。UXは業務理解が武器になる」
- **ターン数**: 4
- **review_axes**: ["コースの進捗（%）", "ポートフォリオ作品数", "デザインコミュニティへの参加"]
- **特記**: 年齢の不安に対する reframe が「弱み→強み」の転換。説得力が高い

### Sim S-17: オンライン学習の継続（efficacy 7）
- **ペルソナ**: 27歳男性、プログラミング学習を3ヶ月前に開始したが停滞
- **Stage 3**: selected_action = "毎日30分コーディング", first_step = "今夜30分で1つの課題を解く"
- **efficacy**: 7→8 (delta +1)
- **identity**: escape_pattern（「3ヶ月前に始めて停滞した vs 今回再開」）
- **resistance**: 「難しい課題で詰まると全部やめたくなる」→ reframe: 「詰まったら次の課題に飛ばすルール。完走しなくていい」
- **ターン数**: 3
- **review_axes**: ["今週何日コーディングしたか", "解いた課題数"]
- **特記**: escape_pattern で学習停滞に接続。reframe が「スキップ許可」の行動ルール型

---

## Recovery パス（残り9件）

### Sim R-1: パニック障害からの職場復帰（efficacy 5）
- **ペルソナ**: 31歳女性、パニック発作で3ヶ月休職中、復職を目指す
- **Stage 3**: selected_action = "まず週2回、会社の最寄り駅まで行く", first_step = "明日、最寄り駅まで電車で行って帰る"
- **efficacy**: 5→7 (delta +2)
- **identity**: pride（「駅まで行けた自分を認める」）
- **resistance**: 「電車で発作が起きたら」→ 行動縮小:「駅まで行くのではなく、自宅最寄り駅のホームに立つだけ」
- **ターン数**: 5
- **review_axes**: ["駅ホームに立てた回数", "不安レベル（1-10）"]
- **特記**: efficacy 5 は recovery の上限境界。行動縮小で +2 上昇。パニック障害は専門医との連携が前提

### Sim R-2: 借金返済計画（efficacy 3 → regression）
- **ペルソナ**: 38歳男性、カードローン200万円、返済計画を立てたが圧倒されている
- **Stage 3**: selected_action = "月5万円を返済に充てる", first_step = "今月の支出を見直して5万円の原資を確保"
- **efficacy**: 3→regression
- **identity**: N/A
- **resistance**: 「毎月5万は無理。生活が成り立たない」
- **ターン数**: 1（即regression）
- **特記**: efficacy 3 で即 regression。「月5万は大きすぎる」→ Stage 3 で「月2万」「固定費の見直し」等に縮小

### Sim R-3: 職場いじめからの脱出（efficacy 4）
- **ペルソナ**: 26歳女性、上司からのパワハラ、退職か異動申請を検討
- **Stage 3**: selected_action = "今月中に人事部に異動申請を出す", first_step = "明日、人事部の窓口場所を確認する"
- **efficacy**: 4→6 (delta +2)
- **identity**: pride（「自分のために声を上げた自分」）
- **resistance**: 「人事に言ったら上司に報復されるかも」→ 行動縮小:「異動申請ではなく、まず人事の相談窓口に匿名で相談」
- **ターン数**: 5
- **review_axes**: ["相談窓口の場所を確認できたか", "匿名相談を実施できたか"]
- **特記**: パワハラ案件。行動縮小が「正式申請→匿名相談」で心理的安全性を確保

### Sim R-4: 夫婦関係修復（efficacy 5）
- **ペルソナ**: 43歳男性、妻との会話がほぼなくなった。関係改善したい
- **Stage 3**: selected_action = "毎日1つ、妻に感謝を伝える", first_step = "今夜、夕食の感想を伝える"
- **efficacy**: 5→6 (delta +1)
- **identity**: relationship_integrity（「妻と笑って話せる食卓」）
- **resistance**: 「急に感謝を言ったら気持ち悪がられる」→ 行動縮小:「毎日→週2回。感謝というより『今日の○○よかった』」
- **ターン数**: 5
- **review_axes**: ["妻にポジティブな言葉をかけた回数", "妻の反応"]
- **特記**: relationship_integrity が夫婦関係に適用。行動のフレーミングを「感謝→ポジティブフィードバック」に変更

### Sim R-5: 就活再開・既卒（efficacy 4）
- **ペルソナ**: 24歳男性、大学卒業後1年間ニート状態、就活を再開したい
- **Stage 3**: selected_action = "週2回ハローワークに行く", first_step = "明日ハローワークの場所を確認する"
- **efficacy**: 4→6 (delta +2)
- **identity**: pride（「ハローワークに行けた自分」）
- **resistance**: 「面接で空白期間を聞かれるのが怖い」→ 行動縮小:「面接ではなく、まずハローワークの相談窓口で話を聞くだけ」
- **ターン数**: 5
- **review_axes**: ["ハローワークに行けた回数", "相談で得た情報"]
- **特記**: Sim 6（引きこもり脱出）と類似。行動縮小が「就活活動→情報収集」で心理的ハードル低下

### Sim R-6: 退職の決断実行（efficacy 5）
- **ペルソナ**: 29歳女性、ブラック企業に勤務、辞めたいが怖い
- **Stage 3**: selected_action = "来月末で退職届を提出", first_step = "今週中に退職届のテンプレートを用意"
- **efficacy**: 5→7 (delta +2)
- **identity**: pride（「自分のために決断できた自分」）
- **resistance**: 「辞めた後の生活が不安」→ 行動縮小:「退職届提出ではなく、まず転職サイトに登録して市場価値を確認」
- **ターン数**: 5
- **review_axes**: ["転職サイトに登録できたか", "求人を何件確認したか", "退職後の生活費シミュレーション"]
- **特記**: 行動縮小が「退職→市場調査」で段階化。生活費シミュレーションの review_axis が実用的

### Sim R-7: 慢性痛との付き合い方改善（efficacy 3 → regression）
- **ペルソナ**: 50歳女性、慢性腰痛で日常生活に支障、運動療法を勧められている
- **Stage 3**: selected_action = "毎朝15分のストレッチ", first_step = "明朝5分だけストレッチする"
- **efficacy**: 3→regression
- **identity**: N/A
- **resistance**: 「痛みがあるときに運動なんて無理」
- **ターン数**: 1（即regression）
- **特記**: efficacy 3 で即 regression。「15分→ベッドの上で3分」に Stage 3 で再設計

### Sim R-8: 介護と仕事の両立（efficacy 5）
- **ペルソナ**: 47歳男性、母親の在宅介護と管理職を両立中、限界
- **Stage 3**: selected_action = "週2回はヘルパーに頼んで自分の時間を確保", first_step = "今週中にケアマネに電話してヘルパー増枠を相談"
- **efficacy**: 5→6 (delta +1)
- **identity**: pride（「助けを求めることは弱さではない」）
- **resistance**: 「母に申し訳ない」→ 行動縮小:「ヘルパー増枠ではなく、まずケアマネに現状を電話で共有するだけ」
- **ターン数**: 5
- **review_axes**: ["ケアマネに電話できたか", "自分の時間を何時間確保できたか"]
- **特記**: 介護者のセルフケア。resistance が「罪悪感」型。reframe が「助けを求める＝弱さではない」

### Sim R-9: 社交不安からのイベント参加（efficacy 5）
- **ペルソナ**: 22歳男性、社交不安で大学のサークル活動に参加できない
- **Stage 3**: selected_action = "週1回サークルのミーティングに参加", first_step = "次のミーティングに顔を出す"
- **efficacy**: 5→6 (delta +1)
- **identity**: pride（「ミーティングに30分だけでも行けた自分」）
- **resistance**: 「みんなの前で話すのが怖い」→ 行動縮小:「参加して発言ではなく、10分だけ見学して帰る」
- **ターン数**: 4
- **review_axes**: ["ミーティングに行けたか", "何分いられたか"]
- **特記**: 行動縮小が「参加→見学」で曝露療法のマイクロステップに近い

---

## 50シナリオ 全一覧（パスと結果のみ）

| # | ペルソナ | パス | efficacy (初→終) | delta | identity | ターン数 | 厳選 |
|---|---------|------|-----------------|-------|----------|---------|------|
| 1 | 転職エンジニア | fast | 9→9 | 0 | clarity | 3 | ★ |
| 2 | 起業準備 | standard | 7→8 | +1 | clarity | 5 | ★ |
| 3 | 親との関係修復 | standard | 6→7 | +1 | relationship_integrity | 5 | ★ |
| 4 | 英語学習 | standard | 6→7 | +1 | escape_pattern | 5 | ★ |
| 5 | 不登校の親 | recovery→regression | 3→N/A | N/A | N/A | 1 | ★ |
| 6 | 引きこもり脱出 | recovery→縮小成功 | 4→7 | +3 | pride | 4 | ★ |
| 7 | 完璧主義緩和 | recovery→縮小成功 | 4→6 | +2 | pride | 4 | ★ |
| 8 | 婚活 | standard (negative delta) | 7→6 | -1 | clarity | 5 | ★ |
| 9 | フリーランス新規受注 | fast | 8→9 | +1 | pride | 2 | ★ |
| 10 | アルコール節制 | recovery→regression | 2→N/A | N/A | N/A | 1 | ★ |
| 11 | マラソン完走 | fast | 9→9 | 0 | clarity | 2 | |
| 12 | ダイエット継続 | fast | 8→8 | 0 | pride | 3 | |
| 13 | ブログ開設 | fast | 10→10 | 0 | clarity | 2 | |
| 14 | 片付け習慣 | fast | 9→9 | 0 | clarity | 2 | |
| 15 | 読書習慣 | fast | 9→10 | +1 | clarity | 2 | |
| 16 | プレゼン準備 | fast | 8→8 | 0 | pride | 3 | |
| 17 | 瞑想習慣 | fast | 8→9 | +1 | clarity | 2 | |
| 18 | 家計簿習慣 | fast | 9→9 | 0 | clarity | 2 | |
| 19 | 日記習慣 | fast | 10→10 | 0 | clarity | 2 | |
| 20 | 副業開始 | standard | 7→8 | +1 | clarity | 4 | |
| 21 | 資格試験勉強 | standard | 6→7 | +1 | escape_pattern | 5 | |
| 22 | 部下のマネジメント | standard | 7→8 | +1 | clarity | 3 | |
| 23 | 投資開始 | standard | 7→8 | +1 | clarity | 3 | |
| 24 | 転居決断 | standard | 6→7 | +1 | clarity | 4 | |
| 25 | 早起き習慣 | standard | 7→7 | 0 | pride | 4 | |
| 26 | SNSデトックス | standard | 6→7 | +1 | escape_pattern | 4 | |
| 27 | チームコミュニケーション | standard | 7→8 | +1 | clarity | 3 | |
| 28 | 受験サポート | standard | 6→7 | +1 | relationship_integrity | 4 | |
| 29 | 新しい趣味 | standard | 7→8 | +1 | clarity | 3 | |
| 30 | 独立開業 | standard | 6→7 | +1 | clarity | 5 | |
| 31 | 境界線設定 | standard | 7→7 | 0 | pride | 4 | |
| 32 | 創作活動再開 | standard | 6→7 | +1 | escape_pattern | 5 | |
| 33 | 異動先人間関係 | standard | 7→8 | +1 | clarity | 3 | |
| 34 | 語学留学準備 | standard | 7→8 | +1 | clarity | 3 | |
| 35 | キャリアチェンジ | standard | 6→7 | +1 | clarity | 4 | |
| 36 | オンライン学習 | standard | 7→8 | +1 | escape_pattern | 3 | |
| 37 | パニック障害復職 | recovery→縮小成功 | 5→7 | +2 | pride | 5 | |
| 38 | 借金返済 | recovery→regression | 3→N/A | N/A | N/A | 1 | |
| 39 | 職場いじめ脱出 | recovery→縮小成功 | 4→6 | +2 | pride | 5 | |
| 40 | 夫婦関係修復 | recovery→縮小成功 | 5→6 | +1 | relationship_integrity | 5 | |
| 41 | 就活再開（既卒） | recovery→縮小成功 | 4→6 | +2 | pride | 5 | |
| 42 | 退職決断 | recovery→縮小成功 | 5→7 | +2 | pride | 5 | |
| 43 | 慢性痛改善 | recovery→regression | 3→N/A | N/A | N/A | 1 | |
| 44 | 介護と仕事両立 | recovery→縮小成功 | 5→6 | +1 | pride | 5 | |
| 45 | 長期プロジェクト再開 | recovery→縮小成功 | 4→6 | +2 | escape_pattern | 5 | |
| 46 | 被災後の生活再建 | recovery→regression | 3→N/A | N/A | N/A | 1 | |
| 47 | 社交不安イベント参加 | recovery→縮小成功 | 5→6 | +1 | pride | 4 | |
| 48 | ジム通い再開 | fast | 8→8 | 0 | pride | 2 | |
| 49 | 婚活（2人目） | standard | 6→7 | +1 | clarity | 4 | |
| 50 | 長距離恋愛維持 | standard | 7→7 | 0 | relationship_integrity | 4 | |

---

## API費用について

**このシミュレーションでは Gemini API の呼び出しは一切行っていません。**

50シナリオすべてが Claude（本エージェント）内での推論シミュレーションです。
実際のユーザー会話では1セッションあたり以下の API コストが見込まれます:

| パス | 平均ターン数 | Gemini API 呼び出し回数 | 推定コスト (Gemini 2.5 Flash) |
|------|------------|----------------------|---------------------------|
| Fast | 2.5 | 2-3 | ~$0.005-0.008 |
| Standard | 4.1 | 4-5 | ~$0.010-0.015 |
| Recovery (縮小) | 4.8 | 5-6 | ~$0.012-0.018 |
| Recovery (Regression) | 1.0 | 1 | ~$0.002-0.003 |

※ Gemini 2.5 Flash の pricing（input $0.15/1M tokens, output $0.60/1M tokens）に基づく概算。
Stage 4 プロンプトは ~3000 tokens input, ~500 tokens output/ターン。

**本シミュレーション自体の Claude API コスト:**
- このファイル生成に使用した Claude Opus 4.6 の推定トークン: ~40,000 output tokens
- Claude Opus 4.6 pricing: input $15/1M, output $75/1M
- 推定コスト: **~$3.00-4.00**（output dominant）
