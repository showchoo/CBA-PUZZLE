// ═══════════════════════════════════════
// DYNASTY ENGINE - FULL CBA IMPLEMENTATION
// ═══════════════════════════════════════

export const DYN_CAP = 140000000;
export const DYN_TAX = 170000000;
export const DYN_APRON1 = 178000000;
export const DYN_APRON2 = 189000000;
export const PICKS_PER_DRAFT = 2;
export const MLE_FULL = 12400000;
export const MLE_MINI = 5000000;
export const SUPERMAX_PCT = 0.35;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

const DESC = ["高給","若手有望","中堅","ベテラン","控え","コスパ抜群","怪我明け","伸びしろ大","即戦力","ルーキー","エース級","MVP候補","守備職人","3&D","スラッシャー","ビッグマン","司令塔","フランチャイズ","シックスマン","ハッスル系","シューター","鉄壁","オールラウンド","クラッチ","エナジザー","スペースメーカー","ロールプレイヤー","ジャンクション"];
const POS = ["ガード","フォワード","センター","ウイング","ビッグ","ポイント","シューター","タレント"];

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
  const hasOption = cy >= 3 && Math.random() < 0.3;
  const optionType = hasOption ? (Math.random() < 0.6 ? 'player' : 'team') : null;
  const supermax = rating >= 90 && by >= 4;
  return {
    id: genId(), name: genName(), rating, age, experience: exp,
    salary: sal, contractYears: cy, contractType: cType || 'regular',
    birdRights: by >= 3 ? 'Full' : by >= 2 ? 'Early' : 'None',
    faStatus: 'None', teamYears: by,
    hasOption: hasOption, optionType: optionType, supermaxEligible: supermax
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
      birdRights: 'None', faStatus: 'UFA', hasOption: false, optionType: null, supermaxEligible: false
    };
  });
}

export function genDraftPicks() {
  return [
    { id: 'pick_' + genId(), year: 1, round: 1, own: true },
    { id: 'pick_' + genId(), year: 1, round: 2, own: true },
  ];
}

export function canSignFA(player, years) {
  if (player.rating >= 85 && years === 1) {
    return { allowed: false, reason: `${player.name}（Rating ${player.rating}）は1年契約を拒否しました。スター級選手は最低2年の契約を求めます。` };
  }
  return { allowed: true };
}

export function adjustSalaryForYears(baseSalary, years) {
  const multipliers = { 1: 0.95, 2: 1.0, 3: 1.05, 4: 1.10, 5: 1.15 };
  return Math.floor(baseSalary * (multipliers[years] || 1.0));
}

export function getMLEAmount(capHit) {
  if (capHit >= DYN_APRON2) return 0;
  if (capHit >= DYN_APRON1) return MLE_MINI;
  return MLE_FULL;
}

export function isSupermaxEligible(player) {
  return player.rating >= 90 && player.teamYears >= 4 && player.birdRights === 'Full';
}

export function calcSupermaxSalary(capHit) {
  return Math.floor(capHit * SUPERMAX_PCT);
}

export function calcStretch(player) {
  const totalRemaining = player.salary * player.contractYears;
  const stretchYears = player.contractYears * 2 + 1;
  const annualAmount = Math.floor(totalRemaining / stretchYears);
  return { annualAmount, stretchYears, total: totalRemaining };
}

export function calcRepeaterTax(overAmount, repeaterSeasons) {
  if (overAmount <= 0) return 0;
  const isRepeater = repeaterSeasons >= 3;
  const brackets = [
    { min: 0, max: 5000000, normal: 1.5, repeat: 2.5 },
    { min: 5000000, max: 10000000, normal: 1.75, repeat: 2.75 },
    { min: 10000000, max: 15000000, normal: 2.5, repeat: 3.5 },
    { min: 15000000, max: 20000000, normal: 3.25, repeat: 4.25 },
    { min: 20000000, max: Infinity, normal: 3.75, repeat: 4.75 },
  ];
  let tax = 0, remaining = overAmount;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, (b.max === Infinity ? 999999999 : b.max) - b.min);
    tax += Math.floor(taxable * (isRepeater ? b.repeat : b.normal));
    remaining -= taxable;
  }
  return tax;
}

export function validateTrade(outgoingSalaries, incomingSalaries) {
  const out = outgoingSalaries.reduce((s, v) => s + v, 0);
  const inc = incomingSalaries.reduce((s, v) => s + v, 0);
  const maxInc = out * 1.25 + 100000;
  return { allowed: inc <= maxInc, outgoing: out, incoming: inc, maxIncoming: maxInc };
}

export function isGilbertArenasRestricted(player) {
  return player.experience <= 2 && player.faStatus === 'RFA';
}

export function advanceSeason(roster) {
  const expired = [];
  const surviving = [];
  const optionPlayers = [];
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
    } else if (p.contractYears === 1 && p.hasOption) {
      optionPlayers.push({ ...p });
      surviving.push(p);
    } else {
      if (p.teamYears !== undefined) { p.teamYears += 1; p.birdRights = p.teamYears >= 3 ? 'Full' : 'Early'; }
      surviving.push(p);
    }
  });
  return { surviving, expired, summaries, optionPlayers };
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
  const totalOvr = roster.reduce((s, p) => s + p.rating, 0);
  const minOvr = 380 + (season - 1) * 8;
  if (roster.length < 8) return { alive: false, reason: `ロースターが少なすぎます（${roster.length}人 / 最低8人必要）` };
  if (totalOvr < minOvr) return { alive: false, reason: `戦力が低下しました（Total Rating: ${totalOvr} / 最低: ${minOvr}）` };
  return { alive: true };
}

export function calcCapHit(roster, deadCap = 0) {
  return roster.reduce((s, p) => s + p.salary, 0) + deadCap;
}
