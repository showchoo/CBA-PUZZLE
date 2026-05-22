// ═══════════════════════════════════════════════════════════
// ═══ EVENT ENGINE v2 — 全選択肢にトレードオフ ═══
// ═══════════════════════════════════════════════════════════

const PERSONALITY = ['熱血漢', '冷静沈着', 'ムードメーカー', 'サイレントリーダー', '陽気な性格', 'ストイック', 'カリスマ的', '謙虚な人柄', '情熱的', '知的'];
const CITY = ['東海岸', '西海岸', '中西部', '南部', '北東部', '南西部', '太平洋沿岸', '大西洋沿岸', '山岳地帯', '砂漠地帯'];
const FOOD = ['バーベキュー', '寿司', 'ピザ', 'ステーキ', 'タコス', 'ラーメン', 'パスタ', 'バーガー', 'フィッシュ&チップス', '中華料理'];
const MUSIC = ['ヒップホップ', 'ロック', 'ジャズ', 'クラシック', 'K-POP', 'R&B', 'カントリー', 'ポップス', 'レゲエ', 'EDM'];
const BRAND = ['Nike', 'Adidas', 'Puma', 'New Balance', 'Under Armour', 'Jordan Brand', 'Reebok', 'Converse', 'ANTA', 'Li-Ning'];
const ANIMAL = ['ワシ', 'ライオン', 'オオカミ', 'クマ', 'トラ', 'パンサー', 'ドラゴン', 'シャーク', 'ホーク', 'ブル'];
const INJURY_LOC = ['右足首', '左膝', '右肩', '腰', '左手首', '右アキレス腱', '左ハムストリング', '背中', '右ふくらはぎ', '首'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function roll(pct) { return Math.random() * 100 < pct; }

let _templateId = 0;
const _templates = [];

function reg(category, conditionFn, generateFn) {
  _templates.push({ id: ++_templateId, category, conditionFn, generateFn });
}

// ═══════════════════════════════════════════════════════════
// ═══ PLAYER EVENTS — 選手個人 ═══
// ═══════════════════════════════════════════════════════════

// ── 若手の成長投資 ──
reg('player', s => s.roster.some(p => p.rating < p.pot && p.age <= 25), s => {
  const p = pick(s.roster.filter(x => x.rating < x.pot && x.age <= 25));
  const v = pick(PERSONALITY);
  return {
    title: `${p.name}の成長投資`,
    text: `若手の${p.name}(${p.position})がオフシーズンに成長の兆しを見せている。スタッフは「あの${v}さが成長の鍵」と評価。ただし、特別なトレーニングプログラムには高額な専属コーチの費用がかかる。`,
    choices: [
      { text: '💰 高額コーチを雇う（即効性あり）', effects: { playerTarget: p.id, rating: randInt(3, 6), capHit: -2000000 } },
      { text: '📋 既存スタッフで対応（長期育成）', effects: { playerTarget: p.id, rating: randInt(0, 2), pot: randInt(3, 7) } },
    ]
  };
});

// ── スター選手のメディア露出 ──
reg('player', s => s.roster.some(p => p.rating >= 80 && p.age <= 26), s => {
  const p = pick(s.roster.filter(x => x.rating >= 80 && x.age <= 26));
  const brand = pick(BRAND);
  return {
    title: `${p.name}に${brand}の大型オファー`,
    text: `${p.name}に${brand}から年俸$3M相当のスポンサー契約オファーが来た。本人は乗り気だが、メディア露出が増えることで練習時間が減ることも懸念される。`,
    choices: [
      { text: '📺 契約を承認（知名度UPだが練習減）', effects: { playerTarget: p.id, rating: randInt(-2, 0), gmscore: 30 } },
      { text: '🏀 バスケに集中してもらう', effects: { playerTarget: p.id, rating: randInt(1, 3), gmscore: -10 } },
    ]
  };
});

// ── ベテランの役割 ──
reg('player', s => s.roster.some(p => p.age >= 33 && p.rating >= 70), s => {
  const p = pick(s.roster.filter(x => x.age >= 33 && x.rating >= 70));
  return {
    title: `🧓 ${p.name}の今後`,
    text: `ベテランの${p.name}(${p.age}歳)が「来シーズンは引退を考えている」と漏らした。まだ戦力にはなるが、若手の成長機会を奪っている面もある。`,
    choices: [
      { text: '🤝 引き留める（戦力維持、若手我慢）', effects: { playerTarget: p.id, rating: randInt(-2, 1), gmscore: 5 } },
      { text: '👋 引退を尊重する（デッドキャップ覚悟）', effects: { playerTarget: p.id, rating: -99, capHit: -1000000 } },
    ]
  };
});

// ── 若手の不満 ──
reg('player', s => s.roster.some(p => p.rating < 70 && p.age <= 24 && p.pot >= 80), s => {
  const p = pick(s.roster.filter(x => x.rating < 70 && x.age <= 24 && x.pot >= 80));
  return {
    title: `😤 ${p.name}の不満爆発`,
    text: `有望株の${p.name}がプレータイムの少なさに不満を募らせている。代理人を通じて「トレードを希望」と通告。放出すれば将来のスターを失うが、チームの空気は改善する。`,
    choices: [
      { text: '⏱ プレータイムを約束（空気は改善、実力未満の選手を起用）', effects: { playerTarget: p.id, rating: randInt(1, 4), pot: randInt(2, 6), teamRating: randInt(-2, -1) } },
      { text: '🔄 トレード市場に出す（空気改善、将来性を手放す）', effects: { gmscore: 5, teamRating: 1 } },
    ]
  };
});

// ── 怪我の選択肢 ──
reg('player', s => s.roster.some(p => p.rating >= 75 && p.age >= 28), s => {
  const p = pick(s.roster.filter(x => x.rating >= 75 && x.age >= 28));
  const loc = pick(INJURY_LOC);
  return {
    title: `🏥 ${p.name}の${loc}問題`,
    text: `${p.name}(${p.age}歳)の${loc}に慢性的な問題が見つかった。手術をすれば完治する可能性が高いが、長期離脱は避けられない。痛み止めで続行も可能だが、悪化リスクがある。`,
    choices: [
      { text: '🔪 手術を選択（長期離脱、将来的に回復）', effects: { playerTarget: p.id, rating: randInt(-6, -3), capHit: -1500000, pot: randInt(2, 5) } },
      { text: '💊 疼痛管理で続行（今使えるが悪化リスク）', effects: { playerTarget: p.id, rating: roll(35) ? randInt(-8, -4) : randInt(-1, 0) } },
    ]
  };
});

// ── 星級選手のトレード要求 ──
reg('player', s => s.roster.some(p => p.rating >= 85), s => {
  const p = pick(s.roster.filter(x => x.rating >= 85));
  return {
    title: `⚡ ${p.name}がトレード要求`,
    text: `チームの柱${p.name}が「新しい環境でプレーしたい」と代理人を通じて要望。断ればロッカールームの雰囲気は悪化するが、放出すれば戦力が激減する。`,
    choices: [
      { text: '🤝 丁寧に説得（関係修復を試みる）', effects: { playerTarget: p.id, rating: roll(40) ? randInt(-3, -1) : randInt(0, 2), teamRating: roll(40) ? randInt(-3, -1) : 0 } },
      { text: '📊 トレードの準備（大型放出、キャップ柔軟性）', effects: { gmscore: -15, capHit: 20000000 } },
    ]
  };
});

// ── 契約交渉 ──
reg('player', s => s.roster.some(p => p.contractYears <= 1 && p.rating >= 72), s => {
  const p = pick(s.roster.filter(x => x.contractYears <= 1 && x.rating >= 72));
  const premium = Math.floor(p.rating * 100000);
  return {
    title: `📝 ${p.name}の契約交渉`,
    text: `${p.name}の代理人から契約延長の打診。本人は残留を希望しているが、プレミアム（年+$${(premium / 1000000).toFixed(1)}M）を要求。早期契約で長期安定を取るか、様子を見るか。`,
    choices: [
      { text: '✍️ 早期延長を受け入れる（高額だが確実に残留）', effects: { playerTarget: p.id, capHit: -premium, gmscore: 10 } },
      { text: '⏳ 契約切れまで待つ（FAで安くなる可能性or逃すリスク）', effects: { playerTarget: p.id, rating: roll(25) ? randInt(-2, -1) : 0 } },
    ]
  };
});

// ── ドラフト選手の適応問題 ──
reg('player', s => s.roster.some(p => p.source === 'draft' && p.age <= 22), s => {
  const p = pick(s.roster.filter(x => x.source === 'draft' && x.age <= 22));
  const city = pick(CITY);
  return {
    title: `🏠 {p.name}のホームシック`,
    text: `ルーキーの${p.name}が新しい環境に馴染めずにいる。${city}の出身で家族が遠い。このままではパフォーマンスに影響するが、過度に甘やかすのは問題。`,
    choices: [
      { text: '👨‍👩‍👦 家族の移住費用を負担（安心だが費用+$500K）', effects: { playerTarget: p.id, rating: randInt(2, 4), capHit: -500000 } },
      { text: '💪 ベテランにメンターを頼む（費用なし、効果は不確実）', effects: { playerTarget: p.id, rating: roll(50) ? randInt(1, 3) : randInt(-1, 0) } },
    ]
  };
});

// ── スター級の健康管理 ──
reg('player', s => s.roster.some(p => p.rating >= 82), s => {
  const p = pick(s.roster.filter(x => x.rating >= 82));
  return {
    title: `🏥 ${p.name}の健康管理`,
    text: `${p.name}の個人トレーナーから「オフシーズンに להיテックリカバリー施設での集中ケアを勧める」という連絡。高額だが怪我予防効果は高い。`,
    choices: [
      { text: '💸 チーム負担でケア（$800K、怪我リスク軽減）', effects: { playerTarget: p.id, capHit: -800000, rating: randInt(1, 2) } },
      { text: '📋 自腹で頼んでもらう（費用なし、怪我リスクそのまま）', effects: { playerTarget: p.id, rating: roll(20) ? randInt(-4, -2) : 0 } },
    ]
  };
});

// ── 複数選手間の対立 ──
reg('player', s => s.roster.length >= 3, s => {
  const ps = [...s.roster].sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    title: `🔥 ロッカールームの対立`,
    text: `${ps[0].name}と${ps[1].name}が戦術方針を巡って激しく対立。${ps[2].name}が仲裁に入ったが解決せず。GMの判断が問われている。`,
    choices: [
      { text: `📣 ${ps[0].name}を支持（${ps[1].name}の不満リスク）`, effects: { playerTarget: ps[0].id, rating: randInt(1, 3), playerTarget2: ps[1].id, rating2: randInt(-3, -1) } },
      { text: `📣 ${ps[1].name}を支持（${ps[0].name}の不満リスク）`, effects: { playerTarget: ps[1].id, rating: randInt(1, 3), playerTarget2: ps[0].id, rating2: randInt(-3, -1) } },
      { text: '⚖️ 中立を保つ（両者やや不満、チームバランス維持）', effects: { teamRating: randInt(-1, 0) } },
    ]
  };
});

// ── 親交のある2選手 ──
reg('player', s => s.roster.length >= 2, s => {
  const ps = [...s.roster].sort(() => Math.random() - 0.5).slice(0, 2);
  const food = pick(FOOD);
  return {
    title: `🤝 ${ps[0].name}と${ps[1].name}の親交`,
    text: `${ps[0].name}と${ps[1].name}がオフシーズンに一緒に${food}を食べに行っていた写真がSNSで話題。いいチームケミストリーだが、この2人をペアでトレードに出す価値も上がる。`,
    choices: [
      { text: '😊 ケミストリーを活かす（両者+1〜2 Rating）', effects: { playerTarget: ps[0].id, rating: randInt(1, 2), playerTarget2: ps[1].id, rating2: randInt(1, 2) } },
      { text: '📋 ペアトレード資産として温存', effects: { gmscore: 10 } },
    ]
  };
});

// ── SNS炎上 ──
reg('player', s => s.roster.some(p => p.age <= 24), s => {
  const p = pick(s.roster.filter(x => x.age <= 24));
  return {
    title: `📱 ${p.name}のSNS炎上`,
    text: `若手の${p.name}がSNSで不用意な発言をし、メディアで大きく取り上げられた。スポンサーからの苦情も来ている。厳しく対応すればスポンサーは守れるが、選手のやる気を損なう恐れがある。`,
    choices: [
      { text: '📢 厳重注意＆謝罪声明（スポンサー維持、選手の士気ダウン）', effects: { playerTarget: p.id, rating: randInt(-3, -1), gmscore: 15 } },
      { text: '🤫 内々に注意（スポンサーリスク、選手の関係維持）', effects: { playerTarget: p.id, rating: randInt(-1, 0), gmscore: -10 } },
    ]
  };
});

// ── 引退間近のベテラン ──
reg('player', s => s.roster.some(p => p.age >= 36), s => {
  const p = pick(s.roster.filter(x => x.age >= 36));
  return {
    title: `🏆 ${p.name}の殿堂入り候補`,
    text: `${p.name}(${p.age}歳)が殿堂入り候補として名前が挙がっている。引退セレモニーを盛大にやればファンの好感度は上がるが、シーズン中の集中力を削ぐ恐れもある。`,
    choices: [
      { text: '🎉 盛大なセレモニー（GM+30、チーム集中力-1）', effects: { gmscore: 30, teamRating: randInt(-2, -1) } },
      { text: '🤫 静かにプレーに集中（Rating+1、話題性なし）', effects: { playerTarget: p.id, rating: 1, gmscore: -5 } },
    ]
  };
});

// ── ポジション特化トレーニング ──
reg('player', s => s.roster.some(p => p.position === 'PG' && p.rating >= 65 && p.rating < 85), s => {
  const p = pick(s.roster.filter(x => x.position === 'PG' && x.rating >= 65 && x.rating < 85));
  return {
    title: `🎯 ${p.name}の3P特訓`,
    text: `${p.name}のシュートフォームを根本から見直す提案があった。習得すれば大幅なスキルアップが見込めるが、習得期間中はプレーに混乱をきたす可能性がある。`,
    choices: [
      { text: '🔄 フォーム改造に挑戦（成功時+5、失敗時-3）', effects: { playerTarget: p.id, rating: roll(45) ? randInt(3, 6) : randInt(-4, -2) } },
      { text: '📈 既存フォームの精度UP（確実に+1〜2）', effects: { playerTarget: p.id, rating: randInt(1, 2) } },
    ]
  };
});

// ── ビッグマンの体格管理 ──
reg('player', s => s.roster.some(p => (p.position === 'C' || p.position === 'PF') && p.rating >= 65), s => {
  const p = pick(s.roster.filter(x => (x.position === 'C' || x.position === 'PF') && x.rating >= 65));
  return {
    title: `🏋️ ${p.name}の体格変更提案`,
    text: `スポーツ科学チームが${p.name}に「体重を10kg減量すれば機動力が上がる」と提案。減量すればディフェンス範囲は広がるが、バスクラでの優位性は失われる。`,
    choices: [
      { text: '⚖️ 減量プログラム（機動力UP、フィジカルDOWN）', effects: { playerTarget: p.id, rating: roll(55) ? randInt(2, 4) : randInt(-2, 0), pot: randInt(1, 4) } },
      { text: '💪 現状維持（安定したプレー、成長余地少なめ）', effects: { playerTarget: p.id, rating: randInt(0, 1) } },
    ]
  };
});

// ── ドキュメンタリー ──
reg('player', s => s.roster.some(p => p.rating >= 85), s => {
  const p = pick(s.roster.filter(x => x.rating >= 85));
  return {
    title: `📺 ${p.name}のドキュメンタリー`,
    text: `大手メディアが${p.name}のドキュメンタリー制作を打診。放映されればチームの知名度は飛躍的に上がるが、撮影は練習中も含まれ、プライバシーと集中力の問題がある。`,
    choices: [
      { text: '🎬 許可する（知名度大幅UP、集中力リスク）', effects: { playerTarget: p.id, rating: randInt(-3, -1), gmscore: 35 } },
      { text: '🚫 撮影を断る（集中力維持、知名度の機会損失）', effects: { playerTarget: p.id, rating: randInt(0, 1), gmscore: -10 } },
    ]
  };
});

// ── 代理人の圧力 ──
reg('player', s => s.roster.some(p => p.rating >= 78 && p.contractYears >= 2), s => {
  const p = pick(s.roster.filter(x => x.rating >= 78 && x.contractYears >= 2));
  return {
    title: `💼 ${p.name}の代理人が動く`,
    text: `${p.name}の代理人が「契約の見直しを要求」と通告してきた。現在$$$${(p.salary / 1000000).toFixed(1)}Mだが、市場価値はそれ以上とのこと。プレイヤーオプションの早期行使をちらつかせている。`,
    choices: [
      { text: '💰 追加ボーナスで黙らせる（$1.5M、関係維持）', effects: { playerTarget: p.id, capHit: -1500000, rating: randInt(0, 2) } },
      { text: '✋ 契約を守ってもらう（$0、不満リスク）', effects: { playerTarget: p.id, rating: roll(30) ? randInt(-3, -1) : 0 } },
    ]
  };
});

// ── コーチとの不和 ──
reg('player', s => s.roster.some(p => p.rating >= 70 && p.age <= 28), s => {
  const p = pick(s.roster.filter(x => x.rating >= 70 && x.age <= 28));
  return {
    title: `😤 ${p.name}とアシスタントコーチの確執`,
    text: `${p.name}がアシスタントコーチの指導方針に反発。ロッカールームでは選手が二分されている。コーチを代えるか、選手に我慢させるか。`,
    choices: [
      { text: '👨‍🏫 コーチを更迭（選手優先、コーチスキル損失）', effects: { playerTarget: p.id, rating: randInt(1, 3), teamRating: randInt(-2, -1) } },
      { text: '📋 選手に適応を求める（コーチ維持、選手不満）', effects: { playerTarget: p.id, rating: randInt(-3, -1), teamRating: randInt(0, 1) } },
    ]
  };
});

// ═══════════════════════════════════════════════════════════
// ═══ TEAM EVENTS — チーム全体 ═══
// ═══════════════════════════════════════════════════════════

// ── 施設投資 ──
reg('team', s => s.capHit < 150000000, s => ({
  title: '🏟️ 練習施設の大型改修',
  text: '練習施設の全面改修提案。最新機器とリカバリールームの導入で選手のパフォーマンスが上がるが、投資額は$3M。その分、FA市場での資金が減る。',
  choices: [
    { text: '🏗️ $3M投資（チーム全体+3〜5、キャップ圧迫）', effects: { capHit: -3000000, teamRating: randInt(3, 5), gmscore: 10 } },
    { text: '🔧 最小限の修繕（$500K、チーム+1）', effects: { capHit: -500000, teamRating: 1 } },
  ]
}));

// ── スタッフの提案 ──
reg('team', () => true, s => ({
  title: '👨‍⚕️ スポーツ科学者の雇用',
  text: '外部のスポーツ科学者から「あなたのチームで働きたい」とオファー。データ分析と怪我予防の専門家だが、高額なサラリーと、既存スタッフとの摩擦が懸念される。',
  choices: [
    { text: '📊 雇用する（$1.5M/年、怪我リスク軽減、既存スタッフ不満）', effects: { capHit: -1500000, teamRating: randInt(2, 4), gmscore: 10 } },
    { text: '📋 断る（既存体制維持、費用なし）', effects: { gmscore: -5 } },
  ]
}));

// ── チームビルディング ──
reg('team', s => s.roster.length >= 6, s => ({
  title: '🏕️ チーム合宿の提案',
  text: 'コーチ陣から「シーズン前に mountain retreat での合宿」を提案された。結束は深まるが、高額でオフシーズンの個人トレーニング時間を奪う。',
  choices: [
    { text: '🏕️ 合宿実施（$400K、チーム+3、個別成長の機会損失）', effects: { capHit: -400000, teamRating: randInt(2, 4), gmscore: 10 } },
    { text: '🏋️ 個人トレーニング優先（費用なし、チーム結束は据え置き）', effects: {} },
  ]
}));

// ── キャプテン任命 ──
reg('team', s => s.roster.filter(p => p.rating >= 75).length >= 2, s => {
  const stars = s.roster.filter(p => p.rating >= 75).sort((a, b) => b.rating - a.rating);
  const p1 = stars[0];
  const p2 = stars[1];
  return {
    title: '👑 キャプテンの選定',
    text: `公式キャプテンを任命すべきという声が上がっている。候補は${p1.name}(R${p1.rating})と${p2.name}(R${p2.rating})。片方を立てればもう片方の不満リスクがある。`,
    choices: [
      { text: `👑 ${p1.name}をキャプテンに`, effects: { playerTarget: p1.id, rating: randInt(1, 3), playerTarget2: p2.id, rating2: randInt(-2, -1) } },
      { text: `👑 ${p2.name}をキャプテンに`, effects: { playerTarget: p2.id, rating: randInt(1, 3), playerTarget2: p1.id, rating2: randInt(-2, -1) } },
      { text: '🤝 キャプテン制なし（平等、リーディング希薄）', effects: { teamRating: randInt(-1, 0) } },
    ]
  };
});

// ── ビデオ分析室 ──
reg('team', () => true, s => ({
  title: '📹 ビデオ分析室の新設',
  text: '他チームがビデオ分析室を次々整備している。導入すれば戦術面で優位に立てるが、$1.2Mの投資が必要。さらに分析スタッフの人件費が毎年発生する。',
  choices: [
    { text: '🖥️ 導入（$1.2M、チーム+2〜4、長期コスト発生）', effects: { capHit: -1200000, teamRating: randInt(2, 4), gmscore: 10 } },
    { text: '⏳ 様子見（$0、他チームに差をつけられるリスク）', effects: { teamRating: roll(30) ? randInt(-2, -1) : 0 } },
  ]
}));

// ── ユニフォーム変更 ──
reg('team', () => true, s => ({
  title: '🎨 新ユニフォーム発表',
  text: 'マーケティング部門から新ユニフォームのデザイン2案。大胆なカラー変更は話題になるがファンの反発リスク。クラシックは安全だが注目度は低い。',
  choices: [
    { text: '🔥 大胆なカラー変更（60%で話題、40%で反発）', effects: { gmscore: roll(60) ? 25 : -15 } },
    { text: '👕 クラシック改良（安定、少しだけ話題）', effects: { gmscore: 8 } },
  ]
}));

// ── マスコット ──
reg('team', () => true, s => {
  const animal = pick(ANIMAL);
  return {
    title: `🦁 新マスコット「${animal}」の提案`,
    text: `マーケティング部門が新マスコット「${animal}」を提案。制作費用$200K。SNS映えする可能性もあるが、滑るリスクもある。`,
    choices: [
      { text: '🎉 制作決定（$200K、50%で話題に、50%で無視）', effects: { capHit: -200000, gmscore: roll(50) ? 25 : -5 } },
      { text: '❌ 見送り（$0、安全だが機会損失）', effects: { gmscore: 0 } },
    ]
  };
});

// ── 満員御礼 ──
reg('team', s => s.effectiveOvr >= 400, s => ({
  title: '🏟️ ホームゲーム連続満員',
  text: 'ホームゲームが5試合連続満員。追加収入があるが、ファンサービスの強化も求められている。収入を施設に投資するか、チケット値上げで利益を取るか。',
  choices: [
    { text: '🎪 ファン感謝イベント（収入を還元、チーム+1、GM+15）', effects: { teamRating: 1, gmscore: 15 } },
    { text: '💴 チケット値上げ（収入最大化、GM+25、ファン不満リスク）', effects: { gmscore: roll(40) ? 25 : -10 } },
  ]
}));

// ── 放映権交渉 ──
reg('team', s => s.effectiveOvr >= 380, s => ({
  title: '📺 放映権契約の交渉',
  text: '地元テレビ局から放映権契約のオファー。金額は大きいが、放送スケジュールに合わせた試合運営を求められる。選手の疲労管理に影響する可能性。',
  choices: [
    { text: '📺 高額契約を受ける（GM+30、スケジュール制約リスク）', effects: { gmscore: 30, teamRating: roll(30) ? randInt(-2, -1) : 0 } },
    { text: '📻 低額で自由度を確保（GM+10、運営の自由度維持）', effects: { gmscore: 10 } },
  ]
}));

// ═══════════════════════════════════════════════════════════
// ═══ LEAGUE EVENTS — リーグ全体 ═══
// ═══════════════════════════════════════════════════════════

reg('league', () => true, s => ({
  title: '📋 リーグルール変更の投票',
  text: 'リーグの理事会でフリースロールルールの改正案が投票にかけられる。賛成すればルール変更の恩恵を受ける可能性があるが、反対すれば他チームとの関係悪化リスク。',
  choices: [
    { text: '👍 賛成票を投じる（ルール適応力UP、関係構築）', effects: { gmscore: 15, teamRating: 1 } },
    { text: '👎 反対票を投じる（自チームに有利なルール維持の可能性、関係悪化リスク）', effects: { gmscore: roll(40) ? 20 : -15 } },
    { text: '🗳️ 棄権（安全だが影響力なし）', effects: {} },
  ]
}));

reg('league', () => true, s => {
  const team = pick(['Metro Vipers', 'Bay Sharks', 'Capital Eagles', 'Desert Foxes', 'Lake Wolves', 'Pacific Titans', 'Mountain Hawks', 'Coastal Dragons']);
  return {
    title: `🔄 ${team}が大物放出`,
    text: `${team}が財政難でスター選手を放出すると噂されている。獲得すれば戦力UPだが、キャップへの影響は大きい。動かない手もある。`,
    choices: [
      { text: '📱 積極的にアプローチ（大型獲得、キャップ大幅圧迫）', effects: { gmscore: 10, capHit: -5000000 } },
      { text: '🧘 様子を見守る（安全、他チームに取られるリスク）', effects: {} },
    ]
  };
});

reg('league', () => true, s => ({
  title: '💰 キャップ上昇の確定',
  text: '来季のキャップが$5M上昇すると確定。全チームに恩恵があるが、自チームが最も有利に使うには計画的な補強が必要。',
  choices: [
    { text: '📊 今から補強計画を立てる（GM+15、来季の自由度UP）', effects: { gmscore: 15 } },
    { text: '⏳ 来季になってから考える（GM+0、柔軟性維持）', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '🏟️ オールスター出場の打診',
  text: '自チームの選手がオールスター候補に挙がっている。積極的にキャンペーンすれば出場確率が上がるが、選手のシーズン中の集中力に影響する。',
  choices: [
    { text: '🗳️ キャンペーン実施（出場でGM+20、選手疲労リスク）', effects: { gmscore: roll(60) ? 20 : 0, playerTarget: s.roster.length > 0 ? s.roster.reduce((a, b) => a.rating > b.rating ? a : b).id : null, rating: roll(40) ? -1 : 0 } },
    { text: '🏀 通常運営（リスクなし、機会損失）', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '🧑‍⚖️ 審判基準の厳格化',
  text: 'リーグが接触プレーの判定を厳格化すると発表。フィジカルチームには不利、シューティングチームには有利。自チームのスタイルに合わせた対応が必要。',
  choices: [
    { text: '📋 スタイルを変更する（投資必要だが新ルールに適応）', effects: { capHit: -500000, teamRating: randInt(1, 3) } },
    { text: '💪 従来のスタイルを貫く（投資なし、不慣れなルールでの戦い）', effects: { teamRating: randInt(-2, 0) } },
  ]
}));

reg('league', () => true, s => ({
  title: '💊 ドーピング検査の強化',
  text: 'リーグが薬物検査を大幅に強化。全選手が対象。コンプライアンスを徹底していれば問題ないが、一部サプリメントの規制が変わり、対応コストが発生する。',
  choices: [
    { text: '✅ 専門チームを雇って完全対応（$300K、安心だが費用）', effects: { capHit: -300000, gmscore: 15 } },
    { text: '📋 最小限の対応（$0、リスクは自己責任）', effects: { gmscore: roll(20) ? -20 : 0 } },
  ]
}));

reg('league', () => true, s => ({
  title: '🌍 海外遠征のオファー',
  text: 'リーグから日本でのプレシーズンゲーム出場を打診。チームの国際的知名度は上がるが、長距離移動で選手のコンディションに影響する。',
  choices: [
    { text: '✈️ 参加する（知名度UP、コンディションリスク）', effects: { gmscore: 25, teamRating: randInt(-3, -1) } },
    { text: '🏠 国内に留まる（コンディション維持、機会損失）', effects: { gmscore: -5 } },
  ]
}));

// ═══════════════════════════════════════════════════════════
// ═══ GM EVENTS — GM個人 ═══
// ═══════════════════════════════════════════════════════════

reg('gm', () => true, s => ({
  title: '📰 記者会見の質問',
  text: '記者会見で「優勝を目指していますか？再建ですか？」と鋭い質問された。答えないわけにはいかない。',
  choices: [
    { text: '🔥 「今すぐ優勝を目指す」（期待UP、プレッシャー+、失敗時の批判大）', effects: { gmscore: roll(50) ? 25 : -15 } },
    { text: '📚 「長期的な成功を築く」（プレッシャー軽減、ファンの短期的不満リスク）', effects: { gmscore: roll(60) ? 10 : -5 } },
  ]
}));

reg('gm', () => true, s => ({
  title: '🤝 他チームGMとの情報交換',
  text: 'リーグのGMミーティングで他チームのGMと食事する機会。情報は得られるが、自チームの情報も漏れるリスクがある。',
  choices: [
    { text: '🍻 積極的に交流（情報入手、自チーム情報漏洩リスク）', effects: { gmscore: roll(60) ? 20 : -10 } },
    { text: '🤫 慎重に距離を取る（情報漏洩なし、有益な情報も逃す）', effects: { gmscore: 5 } },
  ]
}));

reg('gm', () => true, s => ({
  title: '📊 スカウト部門の拡張',
  text: 'スカウト部長が「海外スカウトを増員したい」と要望。有望な国際選手を発見できる可能性が上がるが、年間$800Kの追加コスト。',
  choices: [
    { text: '🌍 増員を承認（$800K、ドラフト候補の質UPの可能性）', effects: { capHit: -800000, gmscore: 15 } },
    { text: '📋 現体制維持（$0、見落としリスク）', effects: {} },
  ]
}));

reg('gm', s => s.season >= 3, s => ({
  title: '💼 GMの評判',
  text: 'ESPNの「最も優秀なGMランキング」で上位にランクインするか注目されている。ランキングが高ければフリーエージェントの説得力が上がる。',
  choices: [
    { text: '📊 データ公開してアピール（説得力UP、戦略公開リスク）', effects: { gmscore: roll(50) ? 25 : -10 } },
    { text: '🤫 地味に実績を積む（安全、目立たない）', effects: { gmscore: 8 } },
  ]
}));

// ═══════════════════════════════════════════════════════════
// ═══ SCENARIO EVENTS — 状況依存 ═══
// ═══════════════════════════════════════════════════════════

reg('scenario', s => s.capHit > 165000000, s => ({
  title: '💸 タックス超過のジレンマ',
  text: 'ラグジュアリータックス超過中。オーナーが「支出を削減しろ」と圧力をかけている。従えばチーム力は下がるが経営は安定。逆らえば短期的に強いが将来的な制約が増える。',
  choices: [
    { text: '📉 高額選手を放出して削減（チーム力DOWN、キャップ柔軟性UP）', effects: { capHit: 5000000, teamRating: randInt(-5, -3), gmscore: 15 } },
    { text: '🔥 現状維持で勝負（チーム力維持、経営リスク+）', effects: { gmscore: -10 } },
  ]
}));

reg('scenario', s => s.capHit < 130000000, s => ({
  title: '💰 大きなキャップ余裕',
  text: 'キャップに$6M以上の余裕がある。FA市場で大型補強できるが、使い切れば来季の柔軟性がなくなる。温存すれば来季のドラフトやトレードで有利に使える。',
  choices: [
    { text: '🎯 今季FAで大型補強（即戦力UP、来季の柔軟性DOWN）', effects: { capHit: -5000000, teamRating: randInt(4, 8), gmscore: 10 } },
    { text: '🏦 キャップを温存（来季の選択肢維持、今季は据え置き）', effects: { gmscore: 5 } },
  ]
}));

reg('scenario', s => s.effectiveOvr < s.minOvr + 15, s => ({
  title: '⚠️ 生存ラインの危機',
  text: `Ratingが生存ラインをわずか${s.effectiveOvr - s.minOvr}ポイントでクリアしている。来季も生き残るには大胆な補強が必要だが、そのためにはリスクを取る必要がある。`,
  choices: [
    { text: '🚨 リスク覚悟の大型トレード（成功率55%、失敗で崩壊リスク）', effects: { teamRating: roll(55) ? randInt(5, 10) : randInt(-5, -3), gmscore: roll(55) ? 20 : -20 } },
    { text: '🤲 確実に+1〜2できる小補強（安全だが不十分な可能性）', effects: { teamRating: randInt(1, 2), capHit: -1000000 } },
    { text: '🙏 ドラフトで若手を増やす（低コスト、即戦力にならない）', effects: { gmscore: 5 } },
  ]
}));

reg('scenario', s => s.effectiveOvr >= s.minOvr + 80, s => ({
  title: '🏆 優勝候補の重圧',
  text: 'メディアが「今年の優勝候補No.1」として名前を挙げている。期待に応えられなければ批判は大きい。スタンスの選択を迫られている。',
  choices: [
    { text: '🔥 「優勝が我々のゴール」と宣言（プレッシャー覚悟、達成でGM+50）', effects: { gmscore: roll(40) ? 50 : -20 } },
    { text: '🧘 「一試合ずつ」宣言（プレッシャー軽減、控えめな評価）', effects: { gmscore: 10 } },
  ]
}));

reg('scenario', s => s.injuredList.length >= 2, s => ({
  title: '🏥 怪我人の緊急対応',
  text: `現在${s.injuredList.length}人が負傷リスト。代替選手をFA市場から緊急補強するか、既存メンバーで凌ぐか。急ぐと質の低い選手を高額で掴むリスクがある。`,
  choices: [
    { text: '🚑 緊急FA補強（$2M、即戦力だが質の保証なし）', effects: { capHit: -2000000, teamRating: roll(50) ? randInt(2, 4) : randInt(-1, 0) } },
    { text: '🤲 既存メンバーで凌ぐ（$0、過密日程リスク）', effects: { teamRating: randInt(-2, 0) } },
  ]
}));

reg('scenario', s => s.deadCap > 8000000, s => ({
  title: '💀 デッドキャップの重荷',
  text: `デッドキャップが$${(s.deadCap / 1000000).toFixed(1)}M。過去の放出判断が今なおキャップを圧迫している。この問題を加速的に解決する方法があるが、さらなる犠牲が必要。`,
  choices: [
    { text: '🔄 追加放出で将来のキャップを空ける（今が苦しいが来季以降が楽）', effects: { capHit: 3000000, teamRating: randInt(-3, -1) } },
    { text: '⏳ 消滅まで待つ（このまま苦しいが追加犠牲なし）', effects: {} },
  ]
}));

reg('scenario', s => s.draftPicks.length >= 5, s => ({
  title: '🏀 ドラフトピックの山',
  text: `{s.draftPicks.length}枚のドラフトピックを保有。全て使えば若手が増えるが、経験不足で即戦力にはならない。一部をトレードすれば即戦力が手に入るが、将来性を手放す。`,
  choices: [
    { text: '🔄 半分をトレード資産に（即戦力UP、将来のドラフト枠DOWN）', effects: { gmscore: 10, teamRating: randInt(2, 4) } },
    { text: '📋 全て温存して若手を増やす（将来性UP、今季の戦力DOWN）', effects: { gmscore: 5 } },
  ]
}));

reg('scenario', s => s.roster.length <= 10, s => ({
  title: '👥 ロスター不足の深刻化',
  text: `ロスターが${s.roster.length}人しかいない。最低でも12人は必要。FAで補強できるが、選手の質は期待薄。ドラフトなら質は高いが時間がかかる。`,
  choices: [
    { text: '✍️ FAで人数を揃える（即座に補充、質は低い）', effects: { teamRating: randInt(0, 1), gmscore: -5 } },
    { text: '🏀 ドラフトで質を重視（人数は不足、質は高い）', effects: { gmscore: 10 } },
  ]
}));

reg('scenario', s => s.season >= 4 && s.effectiveOvr >= s.minOvr + 30, s => ({
  title: '🔄 タイムリミットの選択',
  text: '王朝の黄金期を迎えている。今こそ全ресурсを注いで優勝を狙うか、持続可能な体制を維持するか。全投入すれば今季は強いが、来季以降の崩壊リスクがある。',
  choices: [
    { text: '🎰 全投入（今季のRating大幅UP、来季の崩壊リスク大）', effects: { teamRating: randInt(5, 10), capHit: -8000000 } },
    { text: '📐 持続可能な戦略（緩やかな強化、長期安定）', effects: { teamRating: randInt(1, 3), gmscore: 10 } },
  ]
}));

// ═══════════════════════════════════════════════════════════
// ═══ ENGINE ═══
// ═══════════════════════════════════════════════════════════

const _recentEvents = [];
const MAX_RECENT = 20;

export function generateEvents(gameState, count = 3) {
  const eligible = _templates.filter(t => {
    if (_recentEvents.includes(t.id)) return false;
    try { return t.conditionFn(gameState); } catch (e) { return false; }
  });

  if (eligible.length === 0) return [];

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const events = selected.map(template => {
    try {
      const ev = template.generateFn(gameState);
      return { ...ev, templateId: template.id, category: template.category };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  events.forEach(ev => {
    _recentEvents.push(ev.templateId);
    if (_recentEvents.length > MAX_RECENT) _recentEvents.shift();
  });

  return events;
}

export function applyEventEffects(effects, { roster, setRoster, setDeadCap, setDeadCapDetails, deadCapDetails, deadCap, gmscoreAdjust }) {
  if (!effects) return;

  // playerTarget の効果
  if (effects.playerTarget && roster) {
    setRoster(prev => prev.map(p => {
      if (p.id !== effects.playerTarget) return p;
      const updated = { ...p };
      if (effects.rating && effects.rating !== -99) {
        updated.rating = Math.max(20, Math.min(99, updated.rating + effects.rating));
      }
      if (effects.rating === -99) {
        updated.rating = 0; // 引退
      }
      if (effects.pot) {
        updated.pot = Math.max(updated.rating, Math.min(99, (updated.pot || updated.rating) + effects.pot));
      }
      return updated;
    }));
  }

  // playerTarget2 の効果（2人目の選手）
  if (effects.playerTarget2 && roster) {
    setRoster(prev => prev.map(p => {
      if (p.id !== effects.playerTarget2) return p;
      const updated = { ...p };
      if (effects.rating2) {
        updated.rating = Math.max(20, Math.min(99, updated.rating + effects.rating2));
      }
      return updated;
    }));
  }

  // チーム全体の効果
  if (effects.teamRating && roster) {
    const targets = roster.filter(p => p.rating < 99 && p.rating > 0).sort(() => Math.random() - 0.5).slice(0, 3);
    setRoster(prev => prev.map(p => {
      if (!targets.find(t => t.id === p.id)) return p;
      return { ...p, rating: Math.min(99, Math.max(20, p.rating + Math.ceil(effects.teamRating / targets.length))) };
    }));
  }

  // キャップへの影響（マイナスは費用発生＝デッドキャップ化、プラスはキャップ解放）
  if (effects.capHit && effects.capHit < 0 && setDeadCap) {
    const amount = Math.abs(effects.capHit);
    const nd = [...deadCapDetails, { name: 'イベント経費', amount, yearsLeft: 1, type: 'Event' }];
    setDeadCapDetails(nd);
    setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
  }

  // GM SCORE
  if (effects.gmscore && gmscoreAdjust) {
    gmscoreAdjust(effects.gmscore);
  }
}

export function getEventCategoryInfo(category) {
  const map = {
    player: { icon: '👤', color: 'cyan', label: '選手' },
    team: { icon: '🏟️', color: 'emerald', label: 'チーム' },
    league: { icon: '📋', color: 'amber', label: 'リーグ' },
    gm: { icon: '💼', color: 'purple', label: 'GM' },
    scenario: { icon: '⚡', color: 'orange', label: '状況' },
  };
  return map[category] || { icon: '📢', color: 'stone', label: 'イベント' };
}

export function getEffectPreviewText(effects) {
  if (!effects) return '';
  const parts = [];
  if (effects.rating > 0 && effects.rating !== -99) parts.push(`Rating +${effects.rating}`);
  if (effects.rating < 0 && effects.rating !== -99) parts.push(`Rating ${effects.rating}`);
  if (effects.rating === -99) parts.push('引退');
  if (effects.pot > 0) parts.push(`Pot +${effects.pot}`);
  if (effects.pot < 0) parts.push(`Pot ${effects.pot}`);
  if (effects.teamRating > 0) parts.push(`チーム +${effects.teamRating}`);
  if (effects.teamRating < 0) parts.push(`チーム ${effects.teamRating}`);
  if (effects.gmscore > 0) parts.push(`GM +${effects.gmscore}`);
  if (effects.gmscore < 0) parts.push(`GM ${effects.gmscore}`);
  if (effects.capHit > 0) parts.push(`Cap解放 +$$$${(effects.capHit / 1000000).toFixed(1)}M`);
  if (effects.capHit < 0) parts.push(`Cap -$${(Math.abs(effects.capHit) / 1000000).toFixed(1)}M`);
  return parts.join(' / ') || '影響なし';
}
