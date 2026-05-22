// ═══════════════════════════════════════════════════════════
// ═══ EVENT ENGINE — 1000+ ユニークイベント生成システム ═══
// ═══════════════════════════════════════════════════════════

// ═══ 変数プール（テンプレート内のプレースホルダーを置換） ═══
const PERSONALITY = ['熱血漢', '冷静沈着', 'ムードメーカー', 'サイレントリーダー', '陽気な性格', 'ストイック', 'カリスマ的', '謙虚な人柄', '情熱的', '知的'];
const CITY = ['東海岸', '西海岸', '中西部', '南部', '北東部', '南西部', '太平洋沿岸', '大西洋沿岸', '山岳地帯', '砂漠地帯'];
const FOOD BBQ = ['バーベキュー', '寿司', 'ピザ', 'ステーキ', 'タコス', 'ラーメン', 'パスタ', 'バーガー', 'フィッシュ&チップス', '中華料理'];
const MUSIC = ['ヒップホップ', 'ロック', 'ジャズ', 'クラシック', 'K-POP', 'R&B', 'カントリー', 'ポップス', 'レゲエ', 'EDM'];
const BRAND = ['Nike', 'Adidas', 'Puma', 'New Balance', 'Under Armour', 'Jordan Brand', 'Reebok', 'Converse', 'ANTA', 'Li-Ning'];
const ANIMAL = ['ワシ', 'ライオン', 'オオカミ', 'クマ', 'トラ', 'パンサー', 'ドラゴン', 'シャーク', 'ホーク', 'ブル'];
const INJURY_LOC = ['右足首', '左膝', '右肩', '腰', '左手首', '右アキレス腱', '左ハムストリング', '背中', '右ふくらはぎ', '首'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function roll(pct) { return Math.random() * 100 < pct; }

// ═══ テンプレート登録システム ═══
let _templateId = 0;
const _templates = [];

function reg(category, conditionFn, generateFn) {
  _templates.push({ id: ++_templateId, category, conditionFn, generateFn });
}

// ═══════════════════════════════════════════════
// ═══ PLAYER TEMPLATES — 選手個人イベント ═══
// ═══════════════════════════════════════════════

// ── 成長系 ──
reg('player', s => s.roster.some(p => p.rating < p.pot && p.age <= 25), s => {
  const p = pick(s.roster.filter(x => x.rating < x.pot && x.age <= 25));
  const v = pick(PERSONALITY);
  return {
    title: `${p.name}の成長`,
    text: `若手の${p.name}(${p.position})がオフシーズンに驚異的な成長を見せた。チームスタッフは「あの${v}さが成長の鍵だった」と語っている。練習態度も評価され、チームメイトからの信頼も厚い。`,
    choices: [
      { text: '🏀 さらなる成長を期待', effects: { playerTarget: p.id, rating: randInt(2, 5), pot: randInt(3, 8) } },
      { text: '📋 特別トレーニングを組む', effects: { playerTarget: p.id, rating: randInt(3, 6), pot: randInt(1, 3) } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.rating >= 80 && p.age <= 23), s => {
  const p = pick(s.roster.filter(x => x.rating >= 80 && x.age <= 23));
  return {
    title: `⭐ ${p.name}が注目を集める`,
    text: `${p.name}(${p.position})がリーグ全体から注目を集めている。複数のメディアが「次世代のフランチャイズプレイヤー」と称賛し、ソーシャルメディアでは彼のプレー動画が数百万回再生されている。`,
    choices: [
      { text: '🌟 チャラにする（ムードUP）', effects: { playerTarget: p.id, rating: 1, gmscore: 20 } },
      { text: '🧘 集中を維持させたい', effects: { playerTarget: p.id, rating: 2, pot: 2 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.pot && p.rating >= p.pot - 3 && p.age <= 26), s => {
  const p = pick(s.roster.filter(x => x.pot && x.rating >= x.pot - 3 && x.age <= 26));
  return {
    title: `📈 ${p.name}の限界突破`,
    text: `${p.name}が予想されていた能力の上限に到達しつつある。しかし練習で新しいプレーを習得しようとしており、もしかしたら限界を超えるかもしれない。リスクはあるが可能性も大きい。`,
    choices: [
      { text: '🎯 新プレー習得を支援', effects: { playerTarget: p.id, rating: roll(60) ? randInt(1, 3) : randInt(-2, -1), pot: randInt(3, 8) } },
      { text: '✋ 無理は禁物', effects: { playerTarget: p.id, rating: 1, pot: 0 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.age >= 30 && p.rating >= 75), s => {
  const p = pick(s.roster.filter(x => x.age >= 30 && x.rating >= 75));
  return {
    title: `🧓 ${p.name}の知恵`,
    text: `ベテランの${p.name}(${p.age}歳)が若手選手たちに技術を伝授し始めている。彼の存在はチーム全体の成長に貢献しており、コーチ陣も「彼は生きた教科書だ」と評価している。`,
    choices: [
      { text: '👨‍🏫 若手育成役に任命', effects: { teamRating: randInt(1, 3), gmscore: 15 } },
      { text: '🏋️ 自身のコンディション優先', effects: { playerTarget: p.id, rating: 1 } },
    ]
  };
});

// ── モチベーション系 ──
reg('player', s => s.roster.some(p => p.rating >= 70 && p.rating < 85 && p.age <= 27), s => {
  const p = pick(s.roster.filter(x => x.rating >= 70 && x.rating < 85 && x.age <= 27));
  const city = pick(CITY);
  return {
    title: `💪 ${p.name}が奮起`,
    text: `${p.name}がオフシーズンに${city}で個人トレーニングに励んでいたことが明らかになった。独自のトレーニングプログラムを組み、体重管理も徹底。「来シーズンは違う自分を見せる」と宣言している。`,
    choices: [
      { text: '🔥 その意気を支援', effects: { playerTarget: p.id, rating: randInt(2, 4), pot: randInt(1, 5) } },
      { text: '📊 冷静に分析', effects: { playerTarget: p.id, rating: randInt(1, 2) } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.rating < 65 && p.age <= 24), s => {
  const p = pick(s.roster.filter(x => x.rating < 65 && x.age <= 24));
  return {
    title: `😤 ${p.name}が不満を漏らす`,
    text: `${p.name}がプレータイムの少なさに不満を持っている。代理人を通じて「機会を与えられないなら、トレードを希望する」というメッセージが届いた。若手の扱いはチームの評判に影響する。`,
    choices: [
      { text: '⏱ プレータイムを約束', effects: { playerTarget: p.id, rating: randInt(1, 3), pot: randInt(2, 5) } },
      { text: '🔄 様子を見る', effects: { playerTarget: p.id, rating: randInt(-2, -1) } },
    ]
  };
});

// ── 怪我関連 ──
reg('player', s => s.roster.some(p => p.age >= 28), s => {
  const p = pick(s.roster.filter(x => x.age >= 28));
  const loc = pick(INJURY_LOC);
  return {
    title: `🏥 ${p.name}の${loc}違和感`,
    text: `${p.name}(${p.age}歳)が練習中に${loc}に違和感を訴えた。MRI検査の結果、軽度の炎症が見つかった。今後の対応を検討する必要がある。`,
    choices: [
      { text: '🛏 完全休養させる', effects: { playerTarget: p.id, rating: 0, gmscore: -5 } },
      { text: '💊 治療しながら続行', effects: { playerTarget: p.id, rating: roll(40) ? randInt(-3, -1) : 0 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.rating >= 80), s => {
  const p = pick(s.roster.filter(x => x.rating >= 80));
  const loc = pick(INJURY_LOC);
  return {
    title: `⚡ ${p.name}が${loc}を痛める`,
    text: `チームの柱である${p.name}が練習中に${loc}を痛め、数週間の離脱が見込まれる。チームスタッフは全員でリハビリに取り組んでいる。`,
    choices: [
      { text: '🏥 最善の医療チームを投入', effects: { playerTarget: p.id, rating: randInt(-1, 0), capHit: -500000 } },
      { text: '⏱ 自然治癒を待つ', effects: { playerTarget: p.id, rating: randInt(-3, -1) } },
    ]
  };
});

// ── チームケミストリー ──
reg('player', s => s.roster.length >= 2, s => {
  const [p1, p2] = (() => { const r = [...s.roster].sort(() => Math.random() - 0.5); return [r[0], r[1]]; })();
  const food = pick(FOOD_BBQ);
  return {
    title: `🤝 ${p1.name}と${p2.name}の親交`,
    text: `${p1.name}と${p2.name}がオフシーズンに一緒に${food}を食べに行った写真がSNSで話題に。二人の良い関係がチームの雰囲気向上に繋がりそうだ。`,
    choices: [
      { text: '😊 いい雰囲気だ', effects: { teamRating: randInt(1, 2), gmscore: 5 } },
      { text: '📋 コンビ練習を提案', effects: { teamRating: randInt(1, 3) } },
    ]
  };
});

reg('player', s => s.roster.length >= 3, s => {
  const ps = [...s.roster].sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    title: `🔥 ロッカールームの緊張`,
    text: `${ps[0].name}と${ps[1].name}の間でロッカールームのמוסיקהの再生権をめぐって口論があった。${ps[2].name}が仲裁に入ったが、チームの空気は微妙だ。`,
    choices: [
      { text: '🧑‍⚖️ GMが直接仲裁', effects: { teamRating: randInt(1, 2), gmscore: 10 } },
      { text: '🤷 選手に任せる', effects: { teamRating: randInt(-1, 1) } },
    ]
  };
});

reg('player', s => s.roster.length >= 2, s => {
  const ps = [...s.roster].sort(() => Math.random() - 0.5).slice(0, 2);
  const music = pick(MUSIC);
  return {
    title: `🎵 ${ps[0].name}の新しい趣味`,
    text: `${ps[0].name}が${music}のレッスンを始めたらしい。チームメイトの${ps[1].name}も誘われたようで、二人の間で新しい話題が生まれている。チームの雰囲気は良好のようだ。`,
    choices: [
      { text: '🎶 いい交流だ', effects: { teamRating: 1 } },
      { text: '🏀 練習に集中させたい', effects: { playerTarget: ps[0].id, rating: 1 } },
    ]
  };
});

// ── 契約・キャリア ──
reg('player', s => s.roster.some(p => p.contractYears <= 1 && p.rating >= 70), s => {
  const p = pick(s.roster.filter(x => x.contractYears <= 1 && x.rating >= 70));
  return {
    title: `📝 ${p.name}の代理人が動く`,
    text: `${p.name}の代理人から「契約延長の交渉を開始したい」という連絡が来た。現在の給与は$${(p.salary / 1000000).toFixed(1)}M。相場より高く要求してくるかもしれないが、早めの交渉でプレミアムを抑えられる可能性もある。`,
    choices: [
      { text: '📞 交渉開始', effects: { playerTarget: p.id, capHit: randInt(500, 2000) * 100000, gmscore: 10 } },
      { text: '⏳ まだ様子を見る', effects: { playerTarget: p.id, rating: roll(30) ? randInt(-1, 0) : 0 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.salary > 25000000 && p.rating < 75), s => {
  const p = pick(s.roster.filter(x => x.salary > 25000000 && x.rating < 75));
  return {
    title: `💸 {p.name}の契約が重荷に`,
    text: `${p.name}の給与$$$${(p.salary / 1000000).toFixed(1)}Mがチームのキャップを圧迫している。成績は期待外れで、ファンやメディアからの批判が強まっている。`,
    choices: [
      { text: '🔄 トレード市場に出す', effects: { gmscore: 5 } },
      { text: '🤝 まだ信じる', effects: { playerTarget: p.id, rating: roll(40) ? randInt(1, 3) : 0, gmscore: -5 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.birdRights === 'Full'), s => {
  const p = pick(s.roster.filter(x => x.birdRights === 'Full'));
  return {
    title: `🐦 ${p.name}が忠誠心を示す`,
    text: `${p.name}がメディアに対して「このチームが好きだし、長く在这里いたい」とコメントした。バード権を持つ彼の発言は、将来の再契約交渉においてプラスに働く可能性がある。`,
    choices: [
      { text: '❤️ 温かい関係を維持', effects: { playerTarget: p.id, rating: 1, gmscore: 10 } },
      { text: '📋 早めの交渉を検討', effects: { gmscore: 5 } },
    ]
  };
});

// ── 選手のプライベート ──
reg('player', s => s.roster.some(p => p.age <= 25), s => {
  const p = pick(s.roster.filter(x => x.age <= 25));
  const brand = pick(BRAND);
  return {
    title: `👟 ${p.name}にスポンサー契約`,
    text: `${p.name}に${brand}からスポンサー契約のオファーが来た。本人のモチベーション向上につながるが、プレッシャーになる可能性もある。`,
    choices: [
      { text: '✅ 快諾させる', effects: { playerTarget: p.id, rating: randInt(0, 2), gmscore: 15 } },
      { text: '🏀 バスケに集中させたい', effects: { playerTarget: p.id, rating: randInt(1, 2) } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.rating >= 75), s => {
  const p = pick(s.roster.filter(x => x.rating >= 75));
  const city = pick(CITY);
  return {
    title: `🏖 ${p.name}のプライベート旅行`,
    text: `${p.name}がオフシーズンに${city}へ旅行に行っていたことが判明。SNSではリラックスした様子が話題だが、コンディションへの影響が心配されている。`,
    choices: [
      { text: '🧘 リフレッシュは大切', effects: { playerTarget: p.id, rating: randInt(-1, 2) } },
      { text: '📋 コンディションチェック', effects: { playerTarget: p.id, rating: randInt(0, 1) } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.age <= 22), s => {
  const p = pick(s.roster.filter(x => x.age <= 22));
  return {
    title: `📱 ${p.name}のSNS炎上`,
    text: `若手の${p.name}がSNSで不用意な発言をし、メディアで取り上げられた。チームイメージへの影響が懸念されている。`,
    choices: [
      { text: '📢 公式声明を出す', effects: { gmscore: 10 } },
      { text: '🤫 じっとしていろ', effects: { playerTarget: p.id, rating: -1, gmscore: -5 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.age >= 35), s => {
  const p = pick(s.roster.filter(x => x.age >= 35));
  return {
    title: `🏆 ${p.name}の功績が称えられる`,
    text: `${p.name}(${p.age}歳)の長年の功績がリーグから表彰された。殿堂入り候補との声もあり、若い選手たちのロールモデルとして大きな存在感を示している。`,
    choices: [
      { text: '🎉 素晴らしい', effects: { teamRating: 1, gmscore: 20 } },
      { text: '📋 引退後の役職を検討', effects: { gmscore: 30 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.rating >= 85), s => {
  const p = pick(s.roster.filter(x => x.rating >= 85));
  return {
    title: `📺 ${p.name}のドキュメンタリー制作`,
    text: `大手メディアが${p.name}のドキュメンタリー制作を打診してきた。チームの露出が増えるが、撮影によるプレイヤーへの負担も懸念される。`,
    choices: [
      { text: '🎬 許可する', effects: { playerTarget: p.id, rating: -1, gmscore: 25 } },
      { text: '🚫 撮影は控えてほしい', effects: { gmscore: 5 } },
    ]
  };
});

// ── トレーニング・スキル ──
reg('player', s => s.roster.some(p => p.position === 'PG' && p.rating >= 65), s => {
  const p = pick(s.roster.filter(x => x.position === 'PG' && x.rating >= 65));
  return {
    title: `🎯 ${p.name}のシュート練習`,
    text: `${p.name}が3ポイントシュートの練習に集中している。最近の練習では成功率が大幅に向上しており、コーチ陣も期待を寄せている。`,
    choices: [
      { text: '📈 3P特訓を継続', effects: { playerTarget: p.id, rating: randInt(1, 3) } },
      { text: '🏀 オールラウンドに', effects: { playerTarget: p.id, rating: randInt(1, 2), pot: randInt(1, 3) } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.position === 'C' && p.rating >= 65), s => {
  const p = pick(s.roster.filter(x => x.position === 'C' && x.rating >= 65));
  return {
    title: `🏋️ ${p.name}の体重管理`,
    text: `ビッグマンの${p.name}が新しい栄養士と契約し、体重管理に取り組み始めた。フィジカル面の改善が期待されるが、短期的にプレーに影響する可能性もある。`,
    choices: [
      { text: '🥗 新プログラムを支援', effects: { playerTarget: p.id, rating: randInt(-1, 2), pot: randInt(2, 5) } },
      { text: '📊 様子を見よう', effects: { playerTarget: p.id, rating: 0 } },
    ]
  };
});

reg('player', s => s.roster.some(p => p.position === 'SF' && p.rating >= 65), s => {
  const p = pick(s.roster.filter(x => x.position === 'SF' && x.rating >= 65));
  return {
    title: `🛡 ${p.name}のディフェンス強化`,
    text: `${p.name}がディフェンスの専門コーチを雇い、個人レッスンを受けている。守備面での成長が見込めれば、チーム全体のディフェンス力が向上する。`,
    choices: [
      { text: '💰 コーチ費用を負担', effects: { playerTarget: p.id, rating: randInt(2, 4), capHit: -200000 } },
      { text: '👍 自分の費用で頑張って', effects: { playerTarget: p.id, rating: randInt(0, 2) } },
    ]
  };
});

// ═══════════════════════════════════════════════════
// ═══ TEAM TEMPLATES — チーム全体イベント ═══
// ═══════════════════════════════════════════════════

// ── 施設・スタッフトレーニング ──
reg('team', s => s.capHit < 145000000, s => ({
  title: '🏟️ 練習施設のアップグレード提案',
  text: '施設管理部門から「練習施設の改修提案」が上がった。最新のトレーニング機器の導入とリカバリールームの拡張。投資にはなるが、選手のパフォーマンス向上が見込める。',
  choices: [
    { text: '🏗️ 改修を承認（$2M投資）', effects: { capHit: -2000000, teamRating: randInt(2, 4), gmscore: 15 } },
    { text: '💰 現状維持', effects: { gmscore: 0 } },
  ]
}));

reg('team', () => true, s => ({
  title: '👨‍⚕️ スタッフのモチベーション',
  text: 'トレーニングスタッフから「チームの士気が高い。この調子でいきたい」という報告が上がった。チーム全体の雰囲気が良好なことは、パフォーマンスに直結する。',
  choices: [
    { text: '🎉 チームディナーを開催', effects: { teamRating: randInt(1, 2), capHit: -100000, gmscore: 10 } },
    { text: '📋 今の流れを維持', effects: { teamRating: 1 } },
  ]
}));

reg('team', s => s.roster.length >= 8, s => ({
  title: '🔬 スポーツ科学チームの導入',
  text: '最先端のスポーツ科学チームを外部から招く提案が出された。データ分析に基づくトレーニングや怪我予防プログラムを構築できるという。',
  choices: [
    { text: '📊 導入する（$1.5M）', effects: { capHit: -1500000, teamRating: randInt(2, 5), gmscore: 20 } },
    { text: '⏳ 来シーズンに', effects: {} },
  ]
}));

reg('team', () => true, s => {
  const music = pick(MUSIC);
  return {
    title: '🎵 チームの練習環境',
    text: `練習場の音楽がチームの雰囲気に大きな影響を与えていることが判明。選手たちは${music}を好んでいるようだ。小さな変化だが、日常の満足度はパフォーマンスに直結する。`,
    choices: [
      { text: '🎶 選手の希望を採用', effects: { teamRating: 1 } },
      { text: '📋 コーチに任せる', effects: {} },
    ]
  };
});

// ── チーム文化 ──
reg('team', s => s.roster.length >= 6, s => ({
  title: '🏆 チームビルディングの提案',
  text: 'アシスタントコーチからチームビルディングイベントの開催を提案された。ロッカールームの結束が深まれば、コートでの連携にも好影響があるはずだ。',
  choices: [
    { text: '🎳 ボウリング大会を開催', effects: { teamRating: randInt(1, 3), capHit: -50000, gmscore: 10 } },
    { text: '🏕️ 合宿トレーニング', effects: { teamRating: randInt(2, 4), capHit: -200000 } },
    { text: '❌ 今は不要', effects: {} },
  ]
}));

reg('team', s => s.roster.some(p => p.rating >= 85), s => ({
  title: '📢 チームリーダーの任命',
  text: 'コーチ陣から「公式のチームキャプテンを任命すべき」という提案があった。明確なリーダーシップ構造は、試合中の意思決定にもプラスに働く。',
  choices: [
    { text: '👑 キャプテンを任命', effects: { teamRating: randInt(1, 3), gmscore: 15 } },
    { text: '🤲 リーダーシップは分散', effects: { teamRating: randInt(0, 1) } },
  ]
}));

reg('team', () => true, s => ({
  title: '📹 ビデオ分析室の新設',
  text: '他チームが次々とビデオ分析室を整備している。自チームも導入すれば、戦術面での改善が見込めるが、追加コストが発生する。',
  choices: [
    { text: '🖥️ 導入する（$800K）', effects: { capHit: -800000, teamRating: randInt(1, 3), gmscore: 10 } },
    { text: '⏳ 来年度予算で', effects: {} },
  ]
}));

// ── ファン・メディア ──
reg('team', s => s.effectiveOvr >= 400, s => ({
  title: '📺 テレビ放映権の増額',
  text: '地元テレビ局から放映権契約の増額オファーが来た。チームの人気が上昇している証拠だが、放映スケジュールの制約も付いてくる。',
  choices: [
    { text: '📺 契約を受ける', effects: { gmscore: 30 } },
    { text: '🗓️ スケジュール優先', effects: { gmscore: 10 } },
  ]
}));

reg('team', () => true, s => ({
  title: '🎨 新ユニフォームデザイン',
  text: 'マーケティング部門から「新ユニフォームのデザイン提案」が上がった。ファンの反応次第でグッズ売上が変わる可能性がある。',
  choices: [
    { text: '🎨 大胆なデザイン', effects: { gmscore: roll(60) ? 20 : -10 } },
    { text: '👕 クラシック路線', effects: { gmscore: 10 } },
  ]
}));

reg('team', () => true, s => {
  const animal = pick(ANIMAL);
  return {
    title: `🦁 チームマスコットの話題`,
    text: `チームのマスコットが${animal}の衣装で話題になっている。SNSでの反応は上々で、ファン層の拡大に貢献しているらしい。`,
    choices: [
      { text: '🎉 マスコット活動を強化', effects: { gmscore: 15 } },
      { text: '🏀 バスケに集中', effects: {} },
    ]
  };
});

reg('team', s => s.effectiveOvr >= 420, s => ({
  title: '🏟️ ホームゲームの満員御礼',
  text: 'ホームゲームが5試合連続満員になった。チケット収入の増加だけでなく、選手たちもホームコートの熱気に後押しされている。',
  choices: [
    { text: '🔥 ファン感謝イベント', effects: { teamRating: 1, gmscore: 20 } },
    { text: '📊 チケット値上げを検討', effects: { gmscore: 25 } },
  ]
}));

// ═══════════════════════════════════════════════════
// ═══ LEAGUE TEMPLATES — リーグ全体イベント ═══
// ═══════════════════════════════════════════════════

reg('league', () => true, s => ({
  title: '📋 リーグルールの変更案',
  text: 'リーグの理事会で新しいルール変更案が提案された。ディフェンス3秒違反の厳格化と、フリースローのルール改正が議題に上がっている。',
  choices: [
    { text: '📢 積極的に賛成を表明', effects: { gmscore: 15 } },
    { text: '🤫 中立を保つ', effects: {} },
  ]
}));

reg('league', () => true, s => {
  const team = pick(['Metro Vipers', 'Bay City Sharks', 'Capital Eagles', 'Desert Foxes', 'Lake City Wolves', 'Pacific Titans', 'Mountain Hawks', 'Coastal Dragons']);
  return {
    title: `🔄 ${team}の大型トレード`,
    text: `${team}が大型トレードを実行し、リーグ全体に衝波が走った。パワーバランスが大きく変わる可能性があり、他チームも対応を迫られている。`,
    choices: [
      { text: '🔍 市場の動向を分析', effects: { gmscore: 10 } },
      { text: '📱 スカウトに指示', effects: {} },
    ]
  };
});

reg('league', () => true, s => {
  const city = pick(CITY);
  return {
    title: `🏙️ 新チーム参入の噂`,
    text: `${city}へのNBA新チーム参入の噂が立っている。ドラフトやフリーエージェント市場に影響が出る可能性がある。リーグの拡大は長期的にキャップにも影響する。`,
    choices: [
      { text: '📊 戦略を練る', effects: { gmscore: 10 } },
      { text: '🤷 関係ない', effects: {} },
    ]
  };
});

reg('league', () => true, s => ({
  title: '💰 キャップの見直し提案',
  text: 'リーグ事務局から来季のキャップ見直しが提案されている。テレビ放映権契約の更新により、キャップが$5M程度上昇する見込み。',
  choices: [
    { text: '📈 増額を歓迎', effects: { gmscore: 10 } },
    { text: '📋 詳細を確認', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '🏟️ オールスターゲームの話題',
  text: '今年のオールスターゲームの開催地が発表された。自チームの選手が出場すれば、チームのブランド価値が上がる。',
  choices: [
    { text: '🗳️ 選手の出場をアピール', effects: { gmscore: 15 } },
    { text: '🏀 通常運営', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '📊 リーグ全体のトレンド分析',
  text: 'スポーツ分析会社から「現在のNBAトレンドレポート」が届いた。3ポイント重視とスモールボールのトレンドが加速しているという。',
  choices: [
    { text: '📋 戦術に反映', effects: { teamRating: randInt(1, 2) } },
    { text: '🔍 詳細を分析', effects: { gmscore: 5 } },
  ]
}));

reg('league', () => true, s => ({
  title: '🧑‍⚖️ 審判の判定基準変更',
  text: 'リーグが審判の判定基準を変更すると発表。特にフロア上の接触プレーに対する判定が厳格化される見込み。',
  choices: [
    { text: '📊 選手に周知', effects: { teamRating: 1 } },
    { text: '🤷 様子を見る', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '💊 ドーピング検査の強化',
  text: 'リーグが薬物検査の頻度を増やすと発表。全選手への影響があるが、コンプライアンスを徹底しているチームにとってはプラスに働く。',
  choices: [
    { text: '✅ 対応を強化', effects: { gmscore: 15 } },
    { text: '📋 通常対応', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '🌍 海外マーケット拡大',
  text: 'リーグがアジア市場の開拓に本腰を入れ始めた。国際的なファン層を持つ選手の価値が上がる可能性がある。',
  choices: [
    { text: '🌏 海外マーケティング強化', effects: { gmscore: 20 } },
    { text: '🏀 バスケに集中', effects: {} },
  ]
}));

reg('league', () => true, s => ({
  title: '📺 新メディア契約の影響',
  text: 'リーグと新メディア企業の大型契約が成立。ストリーミング配信が本格化し、選手個人の露出が増える見込み。',
  choices: [
    { text: '📱 SNS戦略を強化', effects: { gmscore: 15 } },
    { text: '📋 後回し', effects: {} },
  ]
}));

// ═══════════════════════════════════════════════
// ═══ GM TEMPLATES — GM個人のイベント ═══
// ═══════════════════════════════════════════════

reg('gm', () => true, s => ({
  title: '📰 記者からの質問',
  text: '記者会見で「チームの再建計画について教えてください」と質問された。回答次第でファンやオーナーの印象が変わる。',
  choices: [
    { text: '💬 「長期的な成功を目指す」', effects: { gmscore: 10 } },
    { text: '🔥 「今すぐ勝つ」', effects: { gmscore: roll(50) ? 20 : -10 } },
    { text: '🤫 「コメントを控える」', effects: { gmscore: 5 } },
  ]
}));

reg('gm', () => true, s => ({
  title: '🤝 他チームGMとの交流',
  text: 'リーグのGMミーティングで他チームのGMと情報交換の機会があった。今後のトレード交渉にプラスに働くかもしれない。',
  choices: [
    { text: '🍻 積極的に交流', effects: { gmscore: 15 } },
    { text: '🤫 情報は守る', effects: { gmscore: 5 } },
  ]
}));

reg('gm', () => true, s => ({
  title: '📊 スカウティングレポート',
  text: 'スカウト部門から詳細なレポートが届いた。来年のドラフトで有望な選手が複数いるという情報だが、正確性は保証されていない。',
  choices: [
    { text: '📋 ドラフト戦略に反映', effects: { gmscore: 10 } },
    { text: '🔍 独自に調査', effects: { gmscore: 5, capHit: -100000 } },
  ]
}));

reg('gm', () => true, s => ({
  title: '💼 GMの交渉術向上',
  text: 'ビジネス書籍を読み、交渉術を磨いた。次のFA交渉やトレードで有利に働くかもしれない。',
  choices: [
    { text: '📚 学びを活かす', effects: { gmscore: 10 } },
    { text: '🙏 経験が全て', effects: {} },
  ]
}));

reg('gm', s => s.season >= 3, s => ({
  title: '🏢 フロントオフィスの拡張提案',
  text: 'アシスタントGMから「アナリストをもう1人雇いたい」という提案があった。データ分析の強化は長期的にチームに貢献する。',
  choices: [
    { text: '📊 雇用する（$500K）', effects: { capHit: -500000, gmscore: 20 } },
    { text: '⏳ 今は予算がない', effects: {} },
  ]
}));

// ═══════════════════════════════════════════════════
// ═══ SCENARIO TEMPLATES — 状況依存イベント ═══
// ═══════════════════════════════════════════════════

reg('scenario', s => s.capHit > 165000000, s => ({
  title: '💸 タックス超過のプレッシャー',
  text: 'チームがラグジュアリータックスラインを超過している。オーナーから「支出を抑えろ」と圧力がかかっている。このまま超過を続けると、将来的な補強手段が失われていく。',
  choices: [
    { text: '📉 コスト削減に取り組む', effects: { gmscore: 15 } },
    { text: '🔥 今のまま勝負', effects: { gmscore: -5 } },
  ]
}));

reg('scenario', s => s.capHit < 136000000, s => ({
  title: '💰 キャップに余裕あり',
  text: 'チームのCap Hitはキャップラインを大幅に下回っている。追加補強の余地があるが、賢く使わないと無駄遣いになる。',
  choices: [
    { text: '🔍 FA市場を探索', effects: { gmscore: 10 } },
    { text: '🏦 余裕を維持', effects: { gmscore: 5 } },
  ]
}));

reg('scenario', s => s.effectiveOvr < s.minOvr + 15, s => ({
  title: '⚠️ 生存ラインギリギリ',
  text: 'チームのRatingが生存ラインをギリギリでクリアしている。このままでは来シーズンの崩壊リスクが高い。',
  choices: [
    { text: '🚨 緊急補強を検討', effects: { gmscore: 5 } },
    { text: '🙏 祈る', effects: {} },
  ]
}));

reg('scenario', s => s.effectiveOvr >= s.minOvr + 80, s => ({
  title: '🏆 優勝候補の座',
  text: 'チームが優勝候補としてメディアに名前が挙がっている。期待に応えられるか、プレッシャーとの戦いが始まる。',
  choices: [
    { text: '🎯 チャンピオンシップに集中', effects: { teamRating: 1, gmscore: 15 } },
    { text: '🧘 一試合ずつ', effects: { gmscore: 10 } },
  ]
}));

reg('scenario', s => s.injuredList.length >= 2, s => ({
  title: '🏥 怪我人の対応',
  text: `現在${s.injuredList.length}人が負傷リストに載っている。トレーニングスタッフから「リカバリー体制の強化が必要」という報告が上がった。`,
  choices: [
    { text: '💊 専門医を招集', effects: { capHit: -300000, gmscore: 10 } },
    { text: '⏳ 既存体制で対応', effects: {} },
  ]
}));

reg('scenario', s => s.deadCap > 5000000, s => ({
  title: '💀 デッドキャップ問題',
  text: `デッドキャップが$${(s.deadCap / 1000000).toFixed(1)}Mに達している。放出した選手の契約がチームのキャップを圧迫し続けている。`,
  choices: [
    { text: '📊 財務計画を見直す', effects: { gmscore: 10 } },
    { text: '⏳ 消滅を待つ', effects: {} },
  ]
}));

reg('scenario', s => s.roster.length < 10, s => ({
  title: '👥 ロスター不足',
  text: `現在ロスターは{s.roster.length}人しかいない。最低限の人数を確保する必要がある。`,
  choices: [
    { text: '🔍 FA市場から補強', effects: { gmscore: 5 } },
    { text: '📋 ドラフトで補填', effects: {} },
  ]
}));

reg('scenario', s => s.draftPicks.length >= 6, s => ({
  title: '🏀 ドラフトピックの山',
  text: `現在${s.draftPicks.length}枚のドラフトピックを保有している。全て使うか、トレードに使うか、戦略的な判断が求められる。`,
  choices: [
    { text: '🔄 一部をトレード資産に', effects: { gmscore: 10 } },
    { text: '📋 全て大切に使う', effects: { gmscore: 5 } },
  ]
}));

// ═══════════════════════════════════════════════════════════
// ═══ イベント生成エンジン ═══
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

// ═══ イベント効果の適用 ═══
export function applyEventEffects(effects, { roster, setRoster, setDeadCap, setDeadCapDetails, deadCapDetails, deadCap, gmscoreAdjust }) {
  if (!effects) return;

  if (effects.playerTarget && roster) {
    setRoster(prev => prev.map(p => {
      if (p.id !== effects.playerTarget) return p;
      const updated = { ...p };
      if (effects.rating) updated.rating = Math.max(20, Math.min(99, updated.rating + effects.rating));
      if (effects.pot) updated.pot = Math.max(updated.rating, Math.min(99, (updated.pot || updated.rating) + effects.pot));
      return updated;
    }));
  }

  if (effects.teamRating && roster) {
    const targets = roster.filter(p => p.rating < 99).sort(() => Math.random() - 0.5).slice(0, 3);
    setRoster(prev => prev.map(p => {
      if (!targets.find(t => t.id === p.id)) return p;
      return { ...p, rating: Math.min(99, p.rating + Math.ceil(effects.teamRating / targets.length)) };
    }));
  }

  if (effects.capHit && effects.capHit < 0 && setDeadCap) {
    const amount = Math.abs(effects.capHit);
    const nd = [...deadCapDetails, { name: 'イベント経費', amount, yearsLeft: 1, type: 'Event' }];
    setDeadCapDetails(nd);
    setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
  }

  if (effects.gmscore && gmscoreAdjust) {
    gmscoreAdjust(effects.gmscore);
  }
}

// ═══ カテゴリアイコン ═══
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

// ═══ 効果の説明テキスト生成 ═══
export function getEffectPreviewText(effects) {
  if (!effects) return '';
  const parts = [];
  if (effects.rating > 0) parts.push(`Rating +${effects.rating}`);
  if (effects.rating < 0) parts.push(`Rating ${effects.rating}`);
  if (effects.pot > 0) parts.push(`Pot +${effects.pot}`);
  if (effects.teamRating > 0) parts.push(`チーム全体 +${effects.teamRating}`);
  if (effects.gmscore > 0) parts.push(`GM SCORE +${effects.gmscore}`);
  if (effects.gmscore < 0) parts.push(`GM SCORE ${effects.gmscore}`);
  if (effects.capHit > 0) parts.push(`Cap +$$$${(effects.capHit / 1000000).toFixed(1)}M`);
  if (effects.capHit < 0) parts.push(`Cap -$${(Math.abs(effects.capHit) / 1000000).toFixed(1)}M`);
  return parts.join(' / ') || '影響なし';
}
