import {
  genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, calcStretch, validateTrade,
  getFALimit, calcGMScore, calcSeasonRecord, calcRosterBalance,
  generateMandate, genTradeMarketPlayers, genTradeMarketPicks,
  validateStepienRule, validateHardCap, validatePickBalance, getPickValue,
  calcQualifyingOffer, getBirdMaxYears, generateRFAMarketOffers,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
  FA_BASE_LIMIT, FA_APRON1_LIMIT, BONUS_RATING80_GM_SCORE,
} from './dynastyEngine';

/* ═══ Display ═══ */
export const CONTAINER_H = 600;
const WATER_SCALE = 0.70;

/* ═══ Efficiency Tiers ═══ */
const EFF_TIERS = [
  { min: 7,   label: 'S', color: '#10b981', glow: '0 0 14px rgba(16,185,129,0.5)' },
  { min: 4.5, label: 'A', color: '#06b6d4', glow: '0 0 14px rgba(6,182,212,0.5)' },
  { min: 3,   label: 'B', color: '#8b5cf6', glow: '0 0 12px rgba(139,92,246,0.4)' },
  { min: 2,   label: 'C', color: '#eab308', glow: '0 0 10px rgba(234,179,8,0.3)' },
  { min: 1,   label: 'D', color: '#f97316', glow: '0 0 10px rgba(249,115,22,0.3)' },
  { min: 0,   label: 'F', color: '#ef4444', glow: '0 0 10px rgba(239,68,68,0.3)' },
];

export function getEffTier(rating, salary) {
  const eff = salary > 0 ? rating / (salary / 1e6) : 99;
  for (const t of EFF_TIERS) {
    if (eff >= t.min) return { ...t, eff: Math.round(eff * 10) / 10 };
  }
  return { ...EFF_TIERS[EFF_TIERS.length - 1], eff: Math.round(eff * 10) / 10 };
}

/* ═══ Pixel Helpers ═══ */
export function capLinePx(capValue) {
  return (capValue / DYN_APRON2) * CONTAINER_H * WATER_SCALE;
}

/* ═══ Tower Calculation ═══ */
export function calcTower(roster, deadCapDetails = [], season = 1) {
  const totalRating = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
  const dc = deadCapDetails.reduce((s, d) => s + d.amount, 0);
  const totalCapHit = calcCapHit(roster, dc);
  const ratingLine = 380 + (season - 1) * 8;

  const maxH = Math.max(totalRating, ratingLine, 500) * 1.12;
  const pxPerR = CONTAINER_H / maxH;

  const sorted = [...roster].sort((a, b) => b.salary - a.salary);
  let yOff = 0;
  const blocks = sorted.map(p => {
    const h = Math.max(16, (p.rating || 0) * pxPerR);
    const tier = getEffTier(p.rating, p.salary);
    const block = { id: p.id, player: p, height: h, yBottom: yOff, yTop: yOff + h, tier };
    yOff += h + 3;
    return block;
  });

  return {
    blocks, totalRating, totalCapHit, ratingLine, dc,
    waterPx: capLinePx(totalCapHit),
    ratingLinePx: ratingLine * pxPerR,
    pxPerR, maxH,
    isAboveLine: totalRating >= ratingLine,
    isUnderCap: totalCapHit <= DYN_CAP,
    season, towerHeightPx: yOff,
  };
}

/* ═══ Future Projection ═══ */
export function projectFuture(roster, deadCapDetails, season, years = 3) {
  const out = [];
  let r = [...roster], dc = [...deadCapDetails];
  for (let i = 1; i <= years; i++) {
    const res = advanceSeason(r, []);
    const dr = advanceDeadCap(dc);
    r = res.surviving; dc = dr.details;
    out.push({ ...calcTower(r, dc, season + i), summaries: res.summaries, injuries: res.injuries });
  }
  return out;
}

/* ═══ Re-exports ═══ */
export {
  genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, calcStretch, validateTrade,
  getFALimit, calcGMScore, calcSeasonRecord, calcRosterBalance,
  generateMandate, genTradeMarketPlayers, genTradeMarketPicks,
  validateStepienRule, validateHardCap, validatePickBalance, getPickValue,
  calcQualifyingOffer, getBirdMaxYears, generateRFAMarketOffers,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
  FA_BASE_LIMIT, FA_APRON1_LIMIT, BONUS_RATING80_GM_SCORE,
};
