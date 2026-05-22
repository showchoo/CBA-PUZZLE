// ═══ 定数 ═══
export const DYN_CAP = 136000000;
export const DYN_TAX = 165000000;
export const DYN_APRON1 = 178100000;
export const DYN_APRON2 = 188900000;
export const PICKS_PER_DRAFT = 2;

export const FA_BASE_LIMIT = 2;
export const FA_APRON1_LIMIT = 1;
export const BONUS_STAR_GROWTH_MULT = 1.3;
export const BONUS_RATING80_GM_SCORE = 40;
export const BONUS_SEASON_50 = 150;
export const BONUS_SEASON_100 = 300;

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

// ═══ 怪我テーブル ═══
const INJURY_TABLE = {
  minor: {
    weight: 55,
    injuries: [
      { name: '足首捻挫', minLoss: 1, maxLoss: 2, minOut: 0, maxOut: 0 },
      { name: '膝打撲', minLoss: 1, maxLoss: 1, minOut: 0, maxOut: 0 },
      { name: '肉離れ', minLoss: 1, maxLoss: 2, minOut: 0, maxOut: 0 },
      { name: '指骨折', minLoss: 1, maxLoss: 2, minOut: 0, maxOut: 0 },
    ]
  },
  moderate: {
    weight: 25,
    injuries: [
      { name: 'ハムストリング断裂', minLoss: 2, maxLoss: 4, minOut: 1, maxOut: 1 },
      { name: '半月板損傷', minLoss: 3, maxLoss: 5, minOut: 1, maxOut: 1 },
      { name: '肩脱臼', minLoss: 2, maxLoss: 3, minOut: 1, maxOut: 1 },
      { name: '腰椎ヘルニア', minLoss: 3, maxLoss: 5, minOut: 1, maxOut: 1 },
    ]
  },
  severe: {
    weight: 15,
    injuries: [
      { name: 'ACL断裂', minLoss: 5, maxLoss: 10, minOut: 1, maxOut: 2 },
      { name: 'アキレス腱断裂', minLoss: 8, maxLoss: 15, minOut: 1, maxOut: 2 },
      { name: '足骨折', minLoss: 4, maxLoss: 8, minOut: 1, maxOut: 2 },
    ]
  },
  critical: {
    weight: 5,
    injuries: [
      { name: '重度脳震盪', minLoss: 5, maxLoss: 10, minOut: 1, maxOut: 2, retireChance: 0.3 },
      { name: '脊椎損傷', minLoss: 15, maxLoss: 25, minOut: 3, maxOut: 5, retireChance: 0.8 },
    ]
  }
};

function rollInjury() {
  const roll = Math.random() * 100;
  let severity;
  if (roll < 55) severity = 'minor';
  else if (roll < 80) severity = 'moderate';
  else if (roll < 95) severity = 'severe';
  else severity = 'critical';

  const category = INJURY_TABLE[severity];
  const injury = category.injuries[Math.floor(Math.random() * category.injuries.length)];
  const ratingLoss = injury.minLoss + Math.floor(Math.random() * (injury.maxLoss - injury.minLoss + 1));
  const seasonsOut = injury.minOut + Math.floor(Math.random() * (injury.maxOut - injury.minOut + 1));

  return {
    name: injury.name,
    severity,
    ratingLoss,
    seasonsOut,
    retireChance: injury.retireChance || 0,
  };
}

// ═══ ユーティリティ ═══
function randomName() {
  const first = ['James', 'Marcus', 'Kevin', 'DeAndre', 'Jaylen', 'Trae', 'Anthony', 'Darius', 'Zion', 'Luka', 'Ja', 'Shai', 'Kyrie', 'Victor', 'Chet', 'Lauri', 'Tyler', 'Jalen', 'Brandon', 'Donovan', 'Jayson', 'Kawhi', 'Paul', 'Rudy', 'Nikola', 'Joel', 'Giannis', 'Damian', 'Stephen', 'LeBron', 'Devin', 'Bam', 'Jimmy', 'Pascal', 'Scottie', 'Alperen', 'Keyonte', 'Dyson', 'Alex', 'Cam', 'Jabari', 'Tari', 'Keegan', 'Amen', 'Ausar', 'Jarrett', 'Evan', 'Tyrese', 'Desmond', 'Cade', 'Franz', 'Paolo', 'Walker', 'Dereck', 'Mark', 'Tyson', 'Tre', 'Dejounte', 'Miles', 'Anfernee', 'Herb', 'Trey', 'Aaron', 'Michael', 'Isaiah', 'Donte', 'Julius', 'Mikal', 'Collin', 'Deni', 'Corey', 'Obi', 'Quentin', 'Ayo', 'Andrew', 'Moses', 'Keldon', 'Alec', 'Pat', 'Buddy', 'Harrison', 'Kyle', 'PJ', 'Bones', 'Christian', 'Nassir', 'Coby', 'Patrick', 'Daniel', 'Jordan', 'Grant', 'Austin', 'Max', 'Rui', 'Josh', 'Caleb', 'Drew', 'Kris', 'Jett', 'Matas', 'Zaccharie', 'Reed', 'Dalton', 'Brandon', 'Jarred', 'Jalen'];
  const last = ['Johnson', 'Williams', 'Brown', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Thompson', 'Young', 'Walker', 'Robinson', 'Clark', 'Allen', 'Wright', 'Mitchell', 'Carter', 'Green', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Howard', 'Ward', 'Peterson', 'Gray', 'James', 'Watson', 'Brooks', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzalez', 'Bryant', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Haliburton', 'Maxey', 'Bane', 'Mobley', 'Sengun', 'George', 'Miller', 'Henderson', 'Wembanyama', 'Holmgren', 'Ivey', 'Murray', 'Mathurin', 'Smith', 'Duren', 'Griffin', 'Sochan', 'Agbaji', 'Eason', 'Dieng', 'Nembhard'];
  return first[Math.floor(Math.random() * first.length)] + ' ' + last[Math.floor(Math.random() * last.length)];
}

function generatePlayer(overrideRating) {
  const rating = overrideRating ?? (40 + Math.floor(Math.random() * 60));
  const age = 19 + Math.floor(Math.random() * 17);
  const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];

  let pot;
  if (age <= 23) {
    pot = Math.min(99, rating + 10 + Math.floor(Math.random() * 21));
  } else if (age <= 28) {
    pot = Math.min(99, rating + Math.floor(Math.random() * 11));
  } else {
    pot = rating;
  }

  const isRookie = age <= 23;
  const baseSalary = isRookie
    ? 500000 + Math.floor(Math.random() * 2500000)
    : 1000000 + Math.floor((rating / 100) * 35000000) + Math.floor(Math.random() * 4000000);
  const roundedSalary = Math.round(baseSalary / 100000) * 100000;
  const years = isRookie ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 5));
  const hasOption = Math.random() < 0.15;
  const optionType = hasOption ? (Math.random() > 0.5 ? 'player' : 'team') : null;
  return {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: randomName(),
    position,
    pot,
    rating,
    age,
    salary: roundedSalary,
    contractYears: years,
    faStatus: 'None',
    birdRights: Math.random() > 0.6 ? (Math.random() > 0.5 ? 'Full' : 'Early') : 'None',
    hasOption,
    optionType,
    supermaxEligible: rating >= 90,
    source: 'roster',
  };
}

// ═══ ロスター生成（キャップ内に収める） ═══
export function genRoster() {
  const players = [];
  for (let i = 0; i < 12; i++) {
    players.push(generatePlayer());
  }

  const currentTotal = players.reduce((s, p) => s + p.salary, 0);
  if (currentTotal === 0) return players;

  const targetTotal = DYN_CAP + Math.floor(Math.random() * 36000000);

  for (let pass = 0; pass < 20; pass++) {
    const total = players.reduce((s, p) => s + p.salary, 0);
    if (total >= DYN_CAP - 5000000 && total <= DYN_APRON2) break;
    const ratio = targetTotal / total;
    for (const p of players) {
      const weighted = p.salary * ratio * (0.92 + Math.random() * 0.16);
      p.salary = Math.max(1000000, Math.round(weighted / 100000) * 100000);
    }
  }

  const finalTotal = players.reduce((s, p) => s + p.salary, 0);
  if (finalTotal > DYN_APRON2) {
    const ratio = (DYN_TAX - 5000000) / finalTotal;
    for (const p of players) {
      p.salary = Math.max(1000000, Math.round((p.salary * ratio) / 100000) * 100000);
    }
  }

  return players;
}

// ═══ FA生成（Rating 40-80） ═══
export function genFA(count) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const rating = 40 + Math.floor(Math.random() * 41);
    const p = generatePlayer(rating);
    p.faStatus = 'UFA';
    p.source = 'fa';
    players.push(p);
  }
  return players;
}

// ═══ ドラフト生成（Rating 50-90、30%高Pot） ═══
export function genDraft(count) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const rating = 50 + Math.floor(Math.random() * 41);
    const p = generatePlayer(rating);
    p.age = 19 + Math.floor(Math.random() * 3);
    p.salary = 1500000 + Math.floor(Math.random() * 2500000);
    p.salary = Math.round(p.salary / 100000) * 100000;
    p.contractYears = 3 + Math.floor(Math.random() * 2);
    if (Math.random() < 0.3) {
      p.pot = Math.min(99, p.rating + 25 + Math.floor(Math.random() * 15));
    }
    p.source = 'draft';
    players.push(p);
  }
  return players.sort((a, b) => b.rating - a.rating);
}

// ═══ ドラフトピック生成 ═══
export function genDraftPicks() {
  const picks = [];
  for (let i = 1; i <= 3; i++) {
    picks.push({ id: 'pick_' + i, year: i, round: 1, own: true, from: null });
  }
  picks.push({ id: 'pick_4', year: 2, round: 2, own: true, from: null });
  return picks;
}

// ═══ キャップ計算 ═══
export function calcCapHit(roster, deadCap) {
  return roster.reduce((sum, p) => sum + p.salary, 0) + (deadCap || 0);
}

// ═══ デッドキャップ進捗 ═══
export function advanceDeadCap(details) {
  const updated = details
    .map(d => ({ ...d, yearsLeft: d.yearsLeft - 1 }))
    .filter(d => d.yearsLeft > 0);
  return { details: updated, total: updated.reduce((s, d) => s + d.amount, 0) };
}

// ═══ シーズン進行（Pot成長 + 怪我対応版） ═══
export function advanceSeason(roster, currentInjuries = []) {
  const summaries = [];
  const surviving = [];
  const expired = [];
  const optionPlayers = [];
  const newInjuries = [];

  const updatedInjuries = currentInjuries
    .map(inj => ({ ...inj, seasonsLeft: inj.seasonsLeft - 1 }))
    .filter(inj => inj.seasonsLeft > 0);

  const existingInjuredIds = new Set(updatedInjuries.map(inj => inj.playerId));

  for (const player of roster) {
    const oldRating = player.rating;
    let change;
    const source = player.source || 'roster';
    const isHighRating = player.rating >= 85;

    if (source === 'fa') {
      change = -(2 + Math.floor(Math.random() * 3));
    } else if (source === 'trade') {
      change = -Math.floor(Math.random() * 3);
    } else {
      const canGrow = player.pot && player.rating < player.pot;
      if (canGrow && Math.random() < 0.25) {
        const maxGrowth = Math.min(5, player.pot - player.rating);
        change = 1 + Math.floor(Math.random() * maxGrowth);
      } else if (Math.random() < 0.1) {
        change = -(3 + Math.floor(Math.random() * 3));
      } else {
        change = -1 - Math.floor(Math.random() * 2);
      }
    }

    if (isHighRating && change < 0) {
      change = Math.ceil(change * 0.7);
      if (change === 0) change = -1;
    }

    const injuryBaseChance = 0.15;
    const ageModifier = player.age >= 30 ? (player.age - 29) * 0.01 : 0;
    const injuryChance = injuryBaseChance + ageModifier;

    let injuryEvent = null;
    if (!existingInjuredIds.has(player.id) && Math.random() < injuryChance) {
      const injury = rollInjury();
      injuryEvent = injury;
      change -= injury.ratingLoss;

      if (injury.retireChance > 0 && Math.random() < injury.retireChance) {
        const newRating = Math.max(20, Math.min(99, oldRating + change));
        summaries.push({
          name: player.name,
          oldRating,
          newRating: 0,
          change: 'RETIRE',
          injury: injury.name,
        });
        continue;
      }

      if (injury.seasonsOut > 0) {
        newInjuries.push({
          id: 'inj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          playerId: player.id,
          playerName: player.name,
          name: injury.name,
          severity: injury.severity,
          ratingLoss: injury.ratingLoss,
          seasonsLeft: injury.seasonsOut,
        });
      }
    }

    const newRating = Math.max(20, Math.min(99, oldRating + change));

    if (player.age >= 38 && Math.random() < 0.3 + (player.age - 38) * 0.15) {
      summaries.push({
        name: player.name, oldRating, newRating: 0, change: 'RETIRE',
        injury: injuryEvent?.name || null,
      });
      continue;
    }

    const summaryEntry = {
      name: player.name, oldRating, newRating, change,
      injury: injuryEvent?.name || null,
    };

    if (player.hasOption) {
      optionPlayers.push({ ...player, rating: newRating, age: player.age + 1 });
      summaries.push(summaryEntry);
    } else {
      const newYears = player.contractYears - 1;
      if (newYears <= 0) {
        player.faStatus = player.birdRights && player.birdRights !== 'None' ? 'RFA' : 'UFA';
        expired.push({ ...player, rating: newRating, age: player.age + 1, contractYears: 0 });
        summaries.push(summaryEntry);
      } else {
        surviving.push({ ...player, rating: newRating, age: player.age + 1, contractYears: newYears });
        summaries.push(summaryEntry);
      }
    }
  }

  const allInjuries = [...updatedInjuries, ...newInjuries];
  const activePlayerIds = new Set([...surviving.map(p => p.id), ...optionPlayers.map(p => p.id)]);
  const finalInjuries = allInjuries.filter(inj => activePlayerIds.has(inj.playerId));

  return { summaries, surviving, expired, optionPlayers, injuries: finalInjuries };
}

// ═══ FA契約制限チェック ═══
export function canSignFA(player, years, totalCapHit = 0, faSignedThisSeason = 0) {
  if (totalCapHit > DYN_APRON1 && years > 3) {
    return { allowed: false, reason: '第1エプロン超過中は最大3年契約のみ' };
  }
  if (player.rating >= 85 && years === 1) {
    return { allowed: false, reason: 'スター級選手（85+）は1年契約を拒否します' };
  }
  const limit = getFALimit(totalCapHit);
  if (faSignedThisSeason >= limit) {
    return { allowed: false, reason: `FA契約上限（${limit}人）に達しました` };
  }
  return { allowed: true };
}

export function getFALimit(totalCapHit) {
  if (totalCapHit > DYN_APRON2) return 0;
  if (totalCapHit > DYN_APRON1) return FA_APRON1_LIMIT;
  return FA_BASE_LIMIT;
}

// ═══ 契約年数に応じた年俸調整 ═══
export function adjustSalaryForYears(baseSalary, years) {
  const multipliers = { 1: 0.85, 2: 1.0, 3: 1.1, 4: 1.15, 5: 1.2 };
  return Math.round((baseSalary * (multipliers[years] || 1.0)) / 100000) * 100000;
}

// ═══ MLE計算 ═══
export function getMLEAmount(totalCapHit) {
  if (totalCapHit <= DYN_CAP) return 12400000;
  if (totalCapHit <= DYN_APRON1) return 5000000;
  return 0;
}

// ═══ Repeater Tax ═══
export function calcRepeaterTax(overTax, repeaterSeasons) {
  if (repeaterSeasons < 2) return 0;
  const baseRate = 2.5;
  const ratePer5M = repeaterSeasons >= 4 ? 1.0 : 0.5;
  const steps = Math.floor(overTax / 5000000);
  let totalTax = 0;
  for (let i = 0; i <= steps; i++) {
    const bracketSize = Math.min(5000000, overTax - i * 5000000);
    if (bracketSize <= 0) break;
    totalTax += bracketSize * (baseRate + i * ratePer5M);
  }
  return Math.round(totalTax);
}

// ═══ ストレッチ ═══
export function calcStretch(player) {
  const stretchYears = player.contractYears * 2 + 1;
  const totalOwed = player.salary * player.contractYears;
  const annualAmount = Math.round(totalOwed / stretchYears / 100000) * 100000;
  return { annualAmount, stretchYears };
}

// ═══ トレードバリデーション ═══
export function validateTrade(outgoing, incoming) {
  const totalOut = outgoing.reduce((s, v) => s + v, 0);
  const totalIn = incoming.reduce((s, v) => s + v, 0);
  const minIn = Math.round(totalOut * 0.75 - 100000);
  const maxIn = Math.round(totalOut * 1.25 + 100000);
  const allowed = totalIn >= minIn && totalIn <= maxIn;
  let reason = '';
  if (totalIn < minIn) reason = '獲得額が送出額の75%-$100Kを下回ります';
  if (totalIn > maxIn) reason = '獲得額が送出額の125%+$100Kを上回ります';
  return { allowed, outgoing: totalOut, incoming: totalIn, minIncoming: minIn, maxIncoming: maxIn, reason };
}

// ═══ スーパーマックス ═══
export function isSupermaxEligible(player) {
  return player.rating >= 90 && player.contractYears >= 4;
}

// ═══ ギルバート・アリーナス条項 ═══
export function isGilbertArenasRestricted(player) {
  return player.contractYears <= 2 && player.rating >= 75;
}

// ═══ 生存判定（怪我対応版） ═══
export function checkSurvival(roster, season, injuredList = []) {
  const injuredIds = new Set(injuredList.map(inj => inj.playerId));
  const effectiveRoster = roster.filter(p => !injuredIds.has(p.id));
  const totalRating = effectiveRoster.reduce((s, p) => s + p.rating, 0);
  const fullRating = roster.reduce((s, p) => s + p.rating, 0);
  const minRequired = 380 + (season - 1) * 8;
  const alive = totalRating >= minRequired;
  const reason = alive ? '' : `実効Rating ${totalRating} < ${minRequired} 必要（シーズン${season}）`;
  return { alive, reason, totalRating, fullRating, minRequired };
}

// ═══ シーズンボーナス計算 ═══
export function calcSeasonBonus(roster, season) {
  const totalRating = roster.reduce((s, p) => s + p.rating, 0);
  const minRequired = 380 + (season - 1) * 8;
  const diff = totalRating - minRequired;
  if (diff >= 100) return BONUS_SEASON_100;
  if (diff >= 50) return BONUS_SEASON_50;
  return 0;
}

// ═══ GM SCORE計算 ═══
export function calcGMScore(season, totalOvr, totalCapHit, roster) {
  const base = Math.max(0, season - 1) * 100;
  const ratingBonus = Math.floor(totalOvr / 10);
  const capRemaining = Math.max(0, DYN_CAP - totalCapHit);
  const capBonus = Math.min(100, Math.floor((capRemaining / 1000000) * 5));
  const starBonus = roster.some(p => p.rating >= 90) ? 50 : 0;
  const rosterBonus = roster.length >= 12 ? 30 : 0;
  const birdBonus = Math.min(60, roster.filter(p => p.birdRights === 'Full').length * 20);
  const rating80Bonus = roster.filter(p => p.rating >= 80).length * BONUS_RATING80_GM_SCORE;
  return base + ratingBonus + capBonus + starBonus + rosterBonus + birdBonus + rating80Bonus;
}

// ═══ シーズン勝敗計算 ═══
export function calcSeasonRecord(totalOvr, minRequired) {
  const diff = Math.max(0, totalOvr - minRequired);
  const baseRate = Math.min(60, 20 + Math.floor(diff / 3));
  const randomOffset = Math.floor(Math.random() * 11) - 5;
  const winRate = Math.max(5, Math.min(65, baseRate + randomOffset));
  const wins = Math.round(82 * winRate / 100);
  const losses = 82 - wins;
  let result, gmBonus;
  if (winRate >= 60)      { result = '🏆 優勝'; gmBonus = 500; }
  else if (winRate >= 50) { result = '🥈 準優勝'; gmBonus = 300; }
  else if (winRate >= 40) { result = '🏀 プレーオフ進出'; gmBonus = 150; }
  else if (winRate >= 30) { result = 'レギュラー終了'; gmBonus = 50; }
  else                    { result = '💀 不振'; gmBonus = 0; }
  return { wins, losses, winRate, result, gmBonus };
}

// ═══ ロスターバランス計算 ═══
export function calcRosterBalance(roster) {
  const filled = {};
  POSITIONS.forEach(pos => { filled[pos] = 0; });
  roster.forEach(p => { if (filled[p.position] !== undefined) filled[p.position]++; });
  const missing = POSITIONS.filter(pos => filled[pos] === 0);
  const penaltyPct = missing.length * 15;
  return { filled, missing, penaltyPct };
}

// ═══ オーナー要請生成 ═══
const MANDATE_POOL = [
  { id: 'win', name: '🏆 優勝せよ', desc: '勝率60%以上で優勝', successBonus: 500, failPenalty: -200 },
  { id: 'playoff', name: '🏀 プレーオフに進め', desc: '勝率40%以上', successBonus: 300, failPenalty: -100 },
  { id: 'cap', name: '💰 キャップ以内に戻せ', desc: 'Cap Hitを$136M以内に', successBonus: 300, failPenalty: 0 },
  { id: 'stars', name: '⭐ スターを3人集めろ', desc: 'Rating 80+を3人以上確保', successBonus: 300, failPenalty: -100 },
  { id: 'balance', name: '⚖️ ロスターを均衡させろ', desc: '全5ポジションに1人以上配置', successBonus: 250, failPenalty: 0 },
];

export function generateMandate() {
  return MANDATE_POOL[Math.floor(Math.random() * MANDATE_POOL.length)];
}

// ═══ トレード市場ピック生成（架空チーム名） ═══
const TRADE_TEAMS = [
  'Metro Vipers', 'Bay City Sharks', 'Capital Eagles', 'Desert Foxes',
  'Lake City Wolves', 'Pacific Titans', 'Mountain Hawks', 'Coastal Dragons',
  'Prairie Knights', 'Harbor Stingrays',
];

export function genTradeMarketPicks() {
  const picks = [];
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const year = 1 + Math.floor(Math.random() * 3);
    const round = Math.random() > 0.35 ? 1 : 2;
    const from = TRADE_TEAMS[Math.floor(Math.random() * TRADE_TEAMS.length)];
    picks.push({
      id: 'mpick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      year,
      round,
      from,
      own: false,
    });
  }
  return picks.sort((a, b) => a.year - b.year || a.round - b.round);
}

// ═══ トレード市場選手生成（55-85） ═══
export function genTradeMarketPlayers(count) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const rating = 55 + Math.floor(Math.random() * 31);
    const p = generatePlayer(rating);
    p.faStatus = 'None';
    p.source = 'trade';
    players.push(p);
  }
  return players.sort((a, b) => b.rating - a.rating);
}

// ═══ ステピアンルール検証（獲得ピック対応版） ═══
export function validateStepienRule(currentPicks, outgoingPicks, incomingPicks = []) {
  const outgoingIds = new Set(outgoingPicks.filter(p => p.round === 1).map(p => p.id));

  // 現有ピックから放出分を除外
  const remainingYears = currentPicks
    .filter(p => p.round === 1 && !outgoingIds.has(p.id))
    .map(p => p.year);

  // 獲得する1巡目ピックの年を追加
  const incomingYears = incomingPicks
    .filter(p => p.round === 1)
    .map(p => p.year);

  const allYears = new Set([...remainingYears, ...incomingYears]);

  const years = [1, 2, 3];
  const hasPick = years.map(y => allYears.has(y));

  const missing = [];
  for (let i = 0; i < years.length - 1; i++) {
    if (!hasPick[i] && !hasPick[i + 1]) {
      missing.push(`Y${years[i]}/Y${years[i + 1]}`);
    }
  }

  if (missing.length > 0) {
    const detail = years.map(y => `Y${y}:${allYears.has(y) ? '✓' : '✗'}`).join(' ');
    return {
      valid: false,
      reason: `${missing.join('・')} の1巡目ピックが両方ありません（${detail}）`,
    };
  }
  return { valid: true };
}

// ═══ ハードキャップ検証 ═══
export function validateHardCap(newCapHit, hardCapped) {
  if (!hardCapped) return { valid: true };
  if (newCapHit > DYN_APRON1) {
    return {
      valid: false,
      reason: `Cap Hit $${(newCapHit / 1000000).toFixed(1)}M > 第1エプロン $${(DYN_APRON1 / 1000000).toFixed(1)}M`,
    };
  }
  return { valid: true };
}

// ═══ ピック価値計算 ═══
export function getPickValue(pick) {
  if (pick.round === 1) {
    switch (pick.year) {
      case 1: return 75;
      case 2: return 55;
      case 3: return 40;
      default: return 30;
    }
  } else {
    switch (pick.year) {
      case 1: return 20;
      case 2: return 15;
      case 3: return 10;
      default: return 8;
    }
  }
}

// ═══ ピック価値バランス検証（3ルール版） ═══
export function validatePickBalance(outPicks, inPicks) {
  if (inPicks.length === 0) return { valid: true };

  const outValue = outPicks.reduce((s, p) => s + getPickValue(p), 0);
  const inValue = inPicks.reduce((s, p) => s + getPickValue(p), 0);

  // ルール1: 価値バランス（送出の1.5倍 + 15pt が上限）
  const maxInValue = outValue * 1.5 + 15;

  // ルール2: 枚数制限（獲得は送出 + 2枚まで）
  const maxPickCount = outPicks.length + 2;

  // ルール3: 1巡目の枚数増加禁止（送出した1巡目以上にはならない）
  const outFirsts = outPicks.filter(p => p.round === 1).length;
  const inFirsts = inPicks.filter(p => p.round === 1).length;

  const reasons = [];

  if (inValue > maxInValue) {
    reasons.push(`価値不均衡（送出:${outValue}pt → 獲得:${inValue}pt、上限:${Math.floor(maxInValue)}pt）`);
  }
  if (inPicks.length > maxPickCount) {
    reasons.push(`枚数過多（送出:${outPicks.length}枚 → 獲得:${inPicks.length}枚、上限:${maxPickCount}枚）`);
  }
  if (inFirsts > outFirsts + 1) {
    reasons.push(`1巡目増加過多（送出:${outFirsts}枚 → 獲得:${inFirsts}枚）`);
  }

  if (reasons.length > 0) {
    return { valid: false, reason: reasons.join(' / '), outValue, inValue };
  }
  return { valid: true, outValue, inValue };
}
