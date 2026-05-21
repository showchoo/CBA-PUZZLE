// ═══════════════════════════════════════
// DYNASTY ENGINE
// ═══════════════════════════════════════

export const DYN_CAP = 140000000;
export const DYN_TAX = 170000000;
export const DYN_APRON1 = 178000000;
export const DYN_APRON2 = 189000000;
export const PICKS_PER_DRAFT = 2;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

const DESC = [
  "高給", "若手有望", "中堅", "ベテラン", "控え", "コスパ抜群",
  "怪我明け", "伸びしろ大", "即戦力", "ルーキー", "エース級",
  "MVP候補", "守備職人", "3&D", "スラッシャー", "ビッグマン",
  "司令塔", "フランチャイズ", "シックスマン", "ハッスル系",
  "シューター", "鉄壁", "オールラウンド", "クラッチ",
  "エナジザー", "スペースメーカー", "ロールプレイヤー", "ジャンクション"
];

const POS = [
  "ガード", "フォワード", "センター", "ウイング", "ビッグ",
  "ポイント", "シューター", "タレント"
];

let _id = 1000;
function genName() { return pick(DESC) + pick(POS) + (rand(0, 2) > 0 ? '' : String.fromCharCode(65 + rand(0, 4))); }
function genId() { return 'dyn_' + (_id++); }

function genSalary(rating, exp) {
  let base;
  if (rating >= 92) base = rand(45, 65);
  else if (rating >= 87) base = rand(30, 48);
  else if (rating >= 82) base = rand(20, 35);
  else if (rating >= 77) base = rand(12, 25);
  else if (rating >= 72) base = rand(6, 15);
  else if (rating >= 67) base = rand(3, 8);
  else base = rand(1, 4);
  if (exp >= 10) base = Math.floor(base * 1.15);
  return base * 1000000;
}

function genContractYears() { return pick([1, 2, 2, 3, 3, 3, 3, 4, 4, 5]); }

export function genPlayer(tier) {
  let rating, age, exp, cType;
  switch (tier) {
    case 'star': rating = rand(88, 97); age = rand(24, 31); exp = rand(5, 12); break;
    case 'starter': rating = rand(78, 87); age = rand(22, 29); exp = rand(3, 8); break;
    case 'role': rating = rand(72, 79); age = rand(22, 30); exp = rand(2, 7); break;
    case 'bench': rating = rand(65, 73); age = rand(21, 28); exp = rand(1, 5); break;
    case 'rookie': rating = rand(65, 77); age = rand(19, 22); exp = 0; cType = 'rookie'; break;
    case 'twoway': rating = rand(62, 72); age = rand(19, 24); exp = rand(0, 2); cType = 'twoway'; break;
    default: rating = rand(70, 80); age = rand(23, 28); exp = rand(2, 5);
  }
  const cy = cType === 'twoway' ? rand(1, 2) : cType === 'rookie' ? rand(2, 4) : genContractYears();
  const sal = cType === 'twoway' ? 0 : genSalary(rating, exp);
  const by = rand(0, Math.max(0, exp));
  return {
    id: genId(), name: genName(), rating, age, experience: exp,
    salary: sal, contractYears: cy, contractType: cType || 'regular',
    birdRights: by >= 3 ? 'Full' : by >= 2 ? 'Early' : 'None',
    faStatus: 'None', teamYears: by
  };
}

export function genRoster() {
  return [
    genPlayer('star'), genPlayer('starter'), genPlayer('starter'),
    genPlayer('role'), genPlayer('role'), genPlayer('role'),
    genPlayer('bench'), genPlayer('bench'), genPlayer('twoway'), genPlayer('twoway')
  ];
}

export function genFA(count = 8) {
  const tiers = ['starter', 'starter', 'role', 'role', 'role', 'bench', 'bench', 'bench'];
  return Array.from({ length: count }, (_, i) => {
    const p = genPlayer(tiers[i] || 'bench');
    p.faStatus = 'UFA';
    return p;
  });
}

// ドラフト: 順位に応じたRating・契約年数・給与
export function genDraft(count = 10) {
  return Array.from({ length: count }, (_, i) => {
    let rating, cy, sal;
    if (i === 0) { rating = rand(72, 80); cy = 4; sal = 4000000; }
    else if (i === 1) { rating = rand(69, 76); cy = 3; sal = 3500000; }
    else if (i === 2) { rating = rand(67, 74); cy = 3; sal = 3000000; }
    else if (i <= 5) { rating = rand(65, 72); cy = 2; sal = 2500000; }
    else { rating = rand(62, 69); cy = 2; sal = 2000000; }
    return {
      id: genId(), name: genName(), rating, age: rand(19, 22), experience: 0,
      salary: sal, contractYears: cy, contractType: 'rookie',
      birdRights: 'None', faStatus: 'UFA'
    };
  });
}

// FA獲得時の契約年数に応じた判定
export function canSignFA(player, years) {
  // スター級（Rating 85+）は1年契約を拒否
  if (player.rating >= 85 && years === 1) {
    return { allowed: false, reason: `${player.name}（Rating ${player.rating}）は1年契約を拒否しました。スター級選手は最低2年の契約を求めます。` };
  }
  return { allowed: true };
}

// 契約年数に応じた給与調整（長い契約ほど割増）
export function adjustSalaryForYears(baseSalary, years) {
  const multipliers = { 1: 0.95, 2: 1.0, 3: 1.05, 4: 1.10, 5: 1.15 };
  return Math.floor(baseSalary * (multipliers[years] || 1.0));
}

export function advanceSeason(roster) {
  const expired = [];
  const surviving = [];
  const summaries = [];

  roster.forEach(p => {
    const oldRating = p.rating;
    p.age += 1;
    p.experience += 1;
    const change = -rand(1, 3);
    p.rating = Math.max(40, p.rating + change);
    p.contractYears -= 1;
    summaries.push({ name: p.name, oldRating, newRating: p.rating, change });
    if (p.contractYears <= 0) {
      p.faStatus = p.birdRights !== 'None' ? 'RFA' : 'UFA';
      expired.push({ ...p });
    } else {
      if (p.teamYears !== undefined) { p.teamYears += 1; p.birdRights = p.teamYears >= 3 ? 'Full' : 'Early'; }
      surviving.push(p);
    }
  });
  return { surviving, expired, summaries };
}

export function advanceDeadCap(details) {
  const remaining = [];
  let total = 0;
  details.forEach(d => {
    d.yearsLeft -= 1;
    if (d.yearsLeft > 0) { remaining.push(d); total += d.amount; }
  });
  return { details: remaining, total };
}

export function checkSurvival(roster, season) {
  const totalRating = roster.reduce((s, p) => s + p.rating, 0);
  const minRating = 380 + (season - 1) * 8;
  if (roster.length < 8) return { alive: false, reason: `ロースターが少なすぎます（${roster.length}人 / 最低8人必要）` };
  if (totalRating < minRating) return { alive: false, reason: `戦力が低下しました（Total Rating: ${totalRating} / 最低: ${minRating}）` };
  return { alive: true };
}

export function calcCapHit(roster, deadCap = 0) {
  return roster.reduce((s, p) => s + p.salary, 0) + deadCap;
}
