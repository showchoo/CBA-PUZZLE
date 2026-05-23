import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  calcTower, getEffTier, capLinePx, CONTAINER_H,
  genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, calcStretch, validateTrade,
  getFALimit, calcGMScore,
  genTradeMarketPlayers, genTradeMarketPicks,
  validateStepienRule, validateHardCap, validatePickBalance, getPickValue,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
} from '../../waterTowerEngine';

/* ═══ Toast ═══ */
function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none" style={{ maxWidth: 500 }}>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto" style={{ animation: 'twToastIn 0.4s ease forwards' }}>
          <div className={
            'border rounded-xl px-5 py-4 shadow-2xl backdrop-blur-sm ' +
            (t.type === 'success' ? 'bg-emerald-950/90 border-emerald-600/50' :
             t.type === 'warning' ? 'bg-red-950/90 border-red-600/50' :
             t.type === 'info' ? 'bg-cyan-950/90 border-cyan-600/50' :
             'bg-stone-900/90 border-stone-600/50')
          }>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className={
                  'text-base font-mono font-black ' +
                  (t.type === 'success' ? 'text-emerald-400' : t.type === 'warning' ? 'text-red-400' : 'text-cyan-400')
                }>{t.title}</div>
                {t.msg && <div className="text-sm text-stone-300 mt-0.5">{t.msg}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ SignModal ═══ */
function SignModal({ player, totalCapHit, faSigned, faLimit, mleUsed, mleAmount, hardCapped, onConfirm, onCancel }) {
  const [years, setYears] = useState(2);
  const [useMLE, setUseMLE] = useState(false);
  const salary = adjustSalaryForYears(player.salary, years);
  const capAfter = totalCapHit + salary;
  const canSign = faSigned < faLimit && capAfter <= DYN_APRON2 && (!hardCapped || capAfter <= DYN_APRON1);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9998]" onClick={onCancel}>
      <div className="bg-[#0e1218] border border-stone-700 rounded-2xl p-8 w-full max-w-md space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <h3 className="text-2xl font-black text-white">{player.name}</h3>
          <div className="text-lg text-stone-400 font-mono mt-1">{player.position} · R{player.rating} · Age {player.age}</div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-mono font-black text-stone-500 uppercase">契約年数</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(y => (
              <button key={y} onClick={() => setYears(y)}
                className={'py-3 rounded-lg border font-mono font-black text-lg transition-all ' +
                  (years === y ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800')}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {mleAmount > 0 && !mleUsed && (
          <label className="flex items-center gap-3 text-base text-cyan-400 font-mono">
            <input type="checkbox" checked={useMLE} onChange={e => setUseMLE(e.target.checked)} className="accent-cyan-500 w-5 h-5" />
            MLE使用 (${(Math.min(salary, mleAmount) / 1e6).toFixed(1)}M)
          </label>
        )}
        <div className="bg-stone-950 rounded-xl p-4 text-base font-mono space-y-2">
          <div className="flex justify-between"><span className="text-stone-500">年俸</span><span className="text-white font-black">${(salary / 1e6).toFixed(1)}M</span></div>
          <div className="flex justify-between"><span className="text-stone-500">総額</span><span className="text-white font-black">${(salary * years / 1e6).toFixed(1)}M</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Cap後</span><span className={capAfter <= DYN_CAP ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>${(capAfter / 1e6).toFixed(1)}M</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 font-mono font-black py-3 rounded-xl text-lg">キャンセル</button>
          <button onClick={() => onConfirm(years, useMLE)} disabled={!canSign}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-mono font-black py-3 rounded-xl text-lg">
            契約
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Wave SVG ═══ */
function WaterWave({ bottom }) {
  return (
    <div className="absolute left-0 right-0 pointer-events-none overflow-hidden" style={{ bottom: bottom - 8, height: 16 }}>
      <svg className="tw-wave" style={{ width: '200%', height: '100%' }} viewBox="0 0 200 16" preserveAspectRatio="none">
        <path d="M0,8 Q10,0 20,8 T40,8 T60,8 T80,8 T100,8 T120,8 T140,8 T160,8 T180,8 T200,8 V16 H0 Z" fill="rgba(6,182,212,0.25)" />
      </svg>
    </div>
  );
}

/* ═══ Cap Marker ═══ */
function CapMarker({ label, value, dashColor }) {
  return (
    <div className="absolute left-0 right-0 border-t border-dashed opacity-30" style={{ bottom: capLinePx(value), borderColor: dashColor }}>
      <span className="absolute left-3 -top-5 text-sm font-mono text-stone-500 bg-[#0c0f16]/80 px-1 rounded">{label} ${(value / 1e6).toFixed(0)}M</span>
    </div>
  );
}

/* ═══ Season Summary Modal ═══ */
function SeasonSummary({ season, record, summaries, onContinue }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9998]">
      <div className="bg-[#0e1218] border border-stone-700 rounded-2xl p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <span className="text-base font-mono font-black text-cyan-400 uppercase tracking-widest">SEASON {season} REPORT</span>
          {record && (
            <div className="space-y-1">
              <div className="text-3xl font-mono font-black text-white">{record.wins}勝 {record.losses}敗</div>
              <div className={'text-xl font-mono font-black ' + (record.gmBonus > 0 ? 'text-emerald-400' : 'text-stone-500')}>
                {record.result} {record.gmBonus > 0 && `+${record.gmBonus} GM SCORE`}
              </div>
            </div>
          )}
        </div>
        <div className="bg-stone-950 rounded-xl p-5 space-y-2 max-h-60 overflow-y-auto">
          <h3 className="text-base font-mono font-black text-stone-400 uppercase mb-2">選手変化</h3>
          {summaries.map((s, i) => (
            <div key={i} className="flex justify-between items-center text-lg py-1.5">
              <span className="text-white">{s.name}</span>
              <span className="font-mono">
                <span className="text-stone-400">{s.oldRating}</span>
                <span className="text-stone-600 mx-1">→</span>
                <span className={s.change === 'RETIRE' ? 'text-yellow-400 font-black' : s.change <= -3 ? 'text-red-400 font-black' : 'text-amber-400 font-black'}>
                  {s.newRating === 0 ? 'RETIRE' : s.newRating}
                </span>
                {s.change !== 'RETIRE' && <span className="text-red-500 ml-2 text-base">({s.change})</span>}
              </span>
            </div>
          ))}
        </div>
        <button onClick={onContinue} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black py-4 rounded-xl text-lg">
          ドラフトへ →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* ═══ MAIN COMPONENT ═══                  */
/* ═══════════════════════════════════════ */
export default function WaterTowerView({ onBack, gmName, playClickSound, isBgmOn, toggleBGM }) {
  const [phase, setPhase] = useState('reroll');
  const [season, setSeason] = useState(1);
  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [deadCapDetails, setDeadCapDetails] = useState([]);
  const [draftPicks, setDraftPicks] = useState([]);
  const [draftProspects, setDraftProspects] = useState([]);
  const [picksLeft, setPicksLeft] = useState(0);
  const [signingPlayer, setSigningPlayer] = useState(null);
  const [mleUsed, setMleUsed] = useState(false);
  const [faSignedThisSeason, setFaSignedThisSeason] = useState(0);
  const [taxHistory, setTaxHistory] = useState([]);
  const [hardCapped, setHardCapped] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [seasonRecord, setSeasonRecord] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const toastId = useRef(0);

  const [tradeMode, setTradeMode] = useState(false);
  const [tradeOffer, setTradeOffer] = useState({ players: [], picks: [] });
  const [tradeTarget, setTradeTarget] = useState({ players: [], picks: [] });
  const [tradeMarket, setTradeMarket] = useState({ players: [], picks: [] });
  const [tradesUsedThisSeason, setTradesUsedThisSeason] = useState(0);
  const TRADE_LIMIT = 3;

  const dc = deadCapDetails.reduce((s, d) => s + d.amount, 0);
  const totalCapHit = calcCapHit(roster, dc);
  const totalRating = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
  const faLimit = getFALimit(totalCapHit);
  const mleAmount = getMLEAmount(totalCapHit);
  const gmScore = calcGMScore(season, totalRating, totalCapHit, roster);
  const tower = calcTower(roster, deadCapDetails, season);

  const addToast = useCallback((type, icon, title, msg, dur = 3000) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, icon, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), dur);
  }, []);

  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };
  const playTone = (freq, dur = 0.12, type = 'sine', vol = 0.06) => {
    try {
      const c = getCtx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur + 0.01);
    } catch (e) {}
  };
  const playSuccess = () => { playTone(523); setTimeout(() => playTone(659), 100); setTimeout(() => playTone(784), 200); };
  const playEpic = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.05), i * 100)); };
  const playError = () => { playTone(200, 0.15, 'square', 0.05); setTimeout(() => playTone(180, 0.2, 'square', 0.05), 100); };

  useEffect(() => { doReroll(); }, []);

  /* ═══ GAME ACTIONS ═══ */

  function doReroll() {
    playClickSound();
    setRoster(genRoster());
    setFreeAgents(genFA(8));
    setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]); setMleUsed(false); setFaSignedThisSeason(0);
    setHardCapped(false); setSelectedBlockId(null);
    setTradesUsedThisSeason(0);
    setTradeOffer({ players: [], picks: [] });
    setTradeTarget({ players: [], picks: [] });
    setTradeMarket({ players: [], picks: [] });
    setTradeMode(false);
    setSeason(1); setPhase('reroll');
  }

  function refreshFA() {
    playClickSound();
    const space = Math.max(0, DYN_CAP - totalCapHit);
    const count = space > 20e6 ? 12 : space > 10e6 ? 10 : space > 5e6 ? 8 : 6;
    setFreeAgents(genFA(count));
    addToast('info', '🏪', 'FA市場更新', `${count}人の選手`, 2000);
  }

  function handleSignRequest(player) { playClickSound(); setSigningPlayer(player); }

  function handleConfirmSign(years, useMLE) {
    const p = signingPlayer;
    const check = canSignFA(p, years, totalCapHit, faSignedThisSeason);
    if (!check.allowed) { playError(); addToast('warning', '❌', '契約不可', check.reason); return; }
    let salary = adjustSalaryForYears(p.salary, years);
    if (useMLE && mleAmount > 0 && !mleUsed) salary = Math.min(salary, mleAmount);
    if (totalCapHit + salary > DYN_APRON2) { playError(); addToast('warning', '❌', '第2エプロン超過'); return; }
    if (hardCapped && totalCapHit + salary > DYN_APRON1) { playError(); addToast('warning', '🔒', 'ハードキャップ中'); return; }
    const signed = { ...p, salary, contractYears: years, faStatus: 'None', source: 'fa', hasOption: false, optionType: null, supermaxEligible: false };
    setFreeAgents(fa => fa.filter(x => x.id !== p.id));
    setRoster(r => [...r, signed]);
    setFaSignedThisSeason(c => c + 1);
    if (useMLE) { setMleUsed(true); if (totalCapHit > DYN_CAP) setHardCapped(true); }
    playSuccess();
    addToast('success', '✍️', `${p.name} 契約`, `R${p.rating} · $${(salary / 1e6).toFixed(1)}M/yr`, 3000);
    setSigningPlayer(null);
  }

  function handleWaive(player) {
    playClickSound();
    if (player.salary > 0 && player.contractYears > 0) {
      setDeadCapDetails(nd => [...nd, { name: player.name, amount: player.salary, yearsLeft: player.contractYears, type: 'Waive' }]);
    }
    setRoster(r => r.filter(p => p.id !== player.id));
    setSelectedBlockId(null);
    playTone(300, 0.3, 'sawtooth', 0.04);
    addToast('warning', '💀', `ウェイブ: {player.name}`, `$$$${(player.salary / 1e6).toFixed(1)}M × ${player.contractYears}yr デッドキャップ`, 3500);
    refreshFA();
  }

  function handleBuyout(player) {
    playClickSound();
    const chance = Math.max(5, 100 - player.rating);
    if (Math.random() * 100 < chance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const dead = Math.floor(player.salary * pct / 100);
      setDeadCapDetails(nd => [...nd, { name: player.name + ' (B/O)', amount: dead, yearsLeft: player.contractYears, type: 'Buyout' }]);
      setRoster(r => r.filter(p => p.id !== player.id));
      setSelectedBlockId(null);
      playTone(494, 0.4, 'sine', 0.05);
      addToast('success', '🤝', `バイアウト: ${player.name}`, `${pct}%に軽減`, 3500);
    } else { playError(); addToast('warning', '❌', `バイアウト拒否`, `${player.name} (確率${chance}%)`, 3000); }
  }

  function handleStretch(player) {
    playClickSound();
    const stretchYears = player.contractYears * 2 + 1;
    const annual = Math.floor(player.salary / stretchYears);
    setDeadCapDetails(nd => [...nd, { name: player.name + ' (ST)', amount: annual, yearsLeft: stretchYears, type: 'Stretch' }]);
    setRoster(r => r.filter(p => p.id !== player.id));
    setSelectedBlockId(null);
    playTone(350, 0.4, 'sine', 0.04);
    addToast('info', '⏳', `ストレッチ: ${player.name}`, `$${(annual / 1e6).toFixed(1)}M × {stretchYears}yr`, 3500);
    refreshFA();
  }

  /* ═══ TRADE ═══ */

  function handleOpenTrade() {
    playClickSound();
    if (tradesUsedThisSeason >= TRADE_LIMIT) { playError(); addToast('warning', '❌', 'トレード上限', `今シーズン${TRADE_LIMIT}回まで`, 3000); return; }
    if (tradeMarket.players.length === 0) setTradeMarket({ players: genTradeMarketPlayers(4), picks: genTradeMarketPicks() });
    setTradeOffer({ players: [], picks: [] }); setTradeTarget({ players: [], picks: [] }); setTradeMode(true);
  }

  function toggleTradeOut(player) {
    playClickSound();
    setTradeOffer(prev => ({ ...prev, players: prev.players.find(p => p.id === player.id) ? prev.players.filter(p => p.id !== player.id) : [...prev.players, player] }));
  }
  function toggleTradeOutPick(pick) {
    playClickSound();
    setTradeOffer(prev => ({ ...prev, picks: prev.picks.find(p => p.id === pick.id) ? prev.picks.filter(p => p.id !== pick.id) : [...prev.picks, pick] }));
  }
  function toggleTradeIn(player) {
    playClickSound();
    setTradeTarget(prev => ({ ...prev, players: prev.players.find(p => p.id === player.id) ? prev.players.filter(p => p.id !== player.id) : [...prev.players, player] }));
  }
  function toggleTradeInPick(pick) {
    playClickSound();
    setTradeTarget(prev => ({ ...prev, picks: prev.picks.find(p => p.id === pick.id) ? prev.picks.filter(p => p.id !== pick.id) : [...prev.picks, pick] }));
  }

  function handleExecuteTrade() {
    playClickSound();
    const outP = tradeOffer.players, outK = tradeOffer.picks;
    const inP = tradeTarget.players, inK = tradeTarget.picks;
    if (inK.length > 0) { const pv = validatePickBalance(outK, inK); if (!pv.valid) { playError(); addToast('warning', '❌', 'ピック価値不均衡', pv.reason, 4000); return; } }
    if (outP.length > 0 && inP.length > 0) { const v = validateTrade(outP.map(p => p.salary), inP.map(p => p.salary)); if (!v.allowed) { playError(); addToast('warning', '❌', '給与マッチング失敗', v.reason, 4000); return; } }
    if (outK.filter(p => p.round === 1).length > 0 || inK.filter(p => p.round === 1).length > 0) { const sv = validateStepienRule(draftPicks, outK, inK); if (!sv.valid) { playError(); addToast('warning', '❌', 'ステピアンルール', sv.reason, 4000); return; } }
    if (hardCapped) { const outSal = outP.reduce((s, p) => s + p.salary, 0); const inSal = inP.reduce((s, p) => s + p.salary, 0); if (totalCapHit - outSal + inSal > DYN_APRON1) { playError(); addToast('warning', '🔒', 'ハードキャップ超過'); return; } }
    const tradedIn = inP.map(p => ({ ...p, source: 'trade' }));
    setRoster(r => [...r.filter(p => !outP.find(o => o.id === p.id)), ...tradedIn]);
    if (outK.length > 0) setDraftPicks(dp => dp.filter(p => !outK.find(o => o.id === p.id)));
    if (inK.length > 0) setDraftPicks(dp => [...dp, ...inK.map(p => ({ id: p.id, year: p.year, round: p.round, own: true, from: p.from }))]);
    setTradeOffer({ players: [], picks: [] }); setTradeTarget({ players: [], picks: [] }); setTradeMode(false);
    setTradesUsedThisSeason(prev => prev + 1);
    playSuccess();
    addToast('success', '🤝', 'トレード成立!', `${outP.map(p => p.name).join(',')} → ${inP.map(p => p.name).join(',')}`, 4000);
  }

  /* ═══ SEASON / DRAFT ═══ */

  function handleNextSeason() {
    playClickSound();
    const record = calcSeasonRecord(totalRating, 380 + (season - 1) * 8);
    setSeasonRecord(record);
    const result = advanceSeason(roster, []);
    const deadResult = advanceDeadCap(deadCapDetails);
    setSummaries(result.summaries);
    setRoster(result.surviving);
    setDeadCapDetails(deadResult.details);
    setTaxHistory([...taxHistory, totalCapHit > DYN_TAX]);
    setMleUsed(false); setFaSignedThisSeason(0); setHardCapped(false); setSelectedBlockId(null);
    setTradesUsedThisSeason(0); setTradeMarket({ players: [], picks: [] });
    if (record.gmBonus > 0) addToast('success', '🏀', `${record.wins}勝${record.losses}敗`, `${record.result} +${record.gmBonus}`, 4000);
    else addToast('info', '🏀', `${record.wins}勝${record.losses}敗`, record.result, 3000);
    setShowSummary(true); setPhase('seasonEnd');
  }

  function handleToDraft() {
    playClickSound(); setShowSummary(false);
    const year1 = draftPicks.filter(pk => pk.year === 1).length;
    setDraftProspects(genDraft(Math.max(year1, 5))); setPicksLeft(year1); setPhase('draft');
  }

  function handleDraft(prospect) {
    playClickSound(); playSuccess();
    addToast('success', '🏀', `ドラフト: ${prospect.name}`, `R${prospect.rating} · $$$${(prospect.salary / 1e6).toFixed(1)}M`, 3000);
    setRoster(r => [...r, { ...prospect, faStatus: 'None', hasOption: false, optionType: null, supermaxEligible: false, source: 'draft' }]);
    setDraftProspects(dp => dp.filter(p => p.id !== prospect.id));
    setPicksLeft(p => p - 1);
    setDraftPicks(picks => { const idx = picks.findIndex(pk => pk.year === 1); return idx >= 0 ? picks.filter((_, i) => i !== idx) : picks; });
  }

  function handleDraftComplete() {
    playClickSound();
    const newSeason = season + 1;
    const survival = checkSurvival(roster, newSeason, []);
    if (!survival.alive) { playError(); setPhase('gameOver'); return; }
    playEpic();
    addToast('success', '➡️', `SEASON ${newSeason}`, '新シーズン開始！', 3000);
    setDraftPicks(picks => {
      const updated = picks.map(pk => ({ ...pk, year: pk.year - 1 })).filter(pk => pk.year >= 1);
      const maxY = updated.length > 0 ? Math.max(...updated.map(pk => pk.year)) : 0;
      updated.push({ id: 'np_' + Date.now(), year: maxY + 1, round: 1, own: true });
      if (Math.random() > 0.5) updated.push({ id: 'np2_' + Date.now(), year: maxY + 1, round: 2, own: true });
      return updated;
    });
    const space = Math.max(0, DYN_CAP - totalCapHit);
    setFreeAgents(genFA(space > 20e6 ? 12 : space > 10e6 ? 10 : 8));
    setTradesUsedThisSeason(0); setTradeMarket({ players: [], picks: [] });
    setSeason(newSeason); setPhase('manage');
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER ═══                          */
  /* ═══════════════════════════════════════ */

  const CSS = (
    <style>{`
      @keyframes twToastIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes twWave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes twPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      @keyframes twBlockIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      .tw-wave { animation: twWave 4s linear infinite; }
      .tw-pulse { animation: twPulse 2.5s ease-in-out infinite; }
      .tw-block-in { animation: twBlockIn 0.35s ease-out; }
    `}</style>
  );

  const Header = () => (
    <header className="px-6 py-4 flex justify-between items-center border-b border-stone-800/50 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={() => { playClickSound(); onBack(); }} className="text-stone-500 hover:text-stone-300 font-mono text-lg px-3 py-1">🏠</button>
        <h1 className="text-2xl font-black font-mono text-cyan-400 tracking-wider">💧 WATER TOWER</h1>
        <span className="text-lg font-mono text-stone-500">SEASON {season}</span>
      </div>
      <div className="flex items-center gap-5">
        <button onClick={() => { playClickSound(); toggleBGM(); }}
          className={'px-3 py-1 rounded text-lg ' + (isBgmOn ? 'text-emerald-400' : 'text-stone-500')}>{isBgmOn ? '🔊' : '🔇'}</button>
        <span className="text-sm font-mono text-stone-600">GM SCORE</span>
        <span className="text-2xl font-mono font-black text-amber-400">{gmScore}</span>
      </div>
    </header>
  );

  function Block({ block, isSelected, isSubmerged, onClick }) {
    return (
      <div onClick={onClick}
        className="absolute left-8 right-8 rounded-lg cursor-pointer transition-all duration-200 tw-block-in group"
        style={{
          bottom: block.yBottom, height: block.height,
          borderLeft: `5px solid ${block.tier.color}`,
          backgroundColor: isSelected ? `${block.tier.color}30` : `${block.tier.color}12`,
          boxShadow: isSelected ? block.tier.glow : 'none',
          opacity: isSubmerged ? 0.4 : 1,
          transform: isSelected ? 'translateX(8px)' : 'translateX(0)',
          zIndex: isSelected ? 10 : 1,
        }}>
        <div className="flex items-center justify-between px-5 h-full overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white font-bold text-xl truncate">{block.player.name}</span>
            <span className="text-base bg-stone-800/80 text-stone-400 px-1.5 py-0.5 rounded font-mono shrink-0">{block.player.position}</span>
            {block.player.contractType === 'rookie' && <span className="text-sm bg-emerald-950 text-emerald-400 px-1.5 rounded font-mono shrink-0">RK</span>}
            {block.player.birdRights === 'Full' && <span className="text-sm bg-blue-950 text-blue-300 px-1.5 rounded shrink-0">🐦</span>}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-mono font-black text-2xl" style={{ color: block.tier.color }}>{block.player.rating}</span>
            <div className="text-right">
              <div className="text-stone-300 font-mono text-base">${(block.player.salary / 1e6).toFixed(1)}M</div>
              <div className="text-stone-600 font-mono text-sm">{block.player.contractYears}yr · {block.tier.label}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ActionBar({ player }) {
    if (!player) return null;
    return (
      <div className="flex gap-2 items-center bg-stone-950/90 border border-stone-800 rounded-lg px-4 py-2 shrink-0">
        <span className="text-white font-bold text-lg mr-3">{player.name}</span>
        <button onClick={() => handleWaive(player)}
          className="text-sm bg-amber-950/80 border border-amber-700 text-amber-300 px-3 py-1.5 rounded font-mono hover:bg-amber-900">💀 ウェイブ</button>
        {player.contractYears > 1 && (
          <button onClick={() => handleBuyout(player)}
            className="text-sm bg-purple-950/80 border border-purple-700 text-purple-300 px-3 py-1.5 rounded font-mono hover:bg-purple-900">🤝 B/O</button>
        )}
        {player.contractYears > 1 && (
          <button onClick={() => handleStretch(player)}
            className="text-sm bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-3 py-1.5 rounded font-mono hover:bg-emerald-900">⏳ ST</button>
        )}
        <button onClick={() => setSelectedBlockId(null)} className="text-stone-500 hover:text-white text-base ml-2">✕</button>
      </div>
    );
  }

  /* ═══ REROLL ═══ */
  if (phase === 'reroll') {
    return (
      <div className="min-h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black">
        {CSS} <ToastContainer toasts={toasts} /> {Header()}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 gap-6">
          <div className="text-center space-y-2 mb-2">
            <h2 className="text-5xl font-black text-white">水位を管理せよ</h2>
            <p className="text-xl text-stone-400">Cap（水面）を超えず、Rating ラインを維持しろ</p>
          </div>
          <div className="bg-[#0c0f16] border border-stone-800/50 rounded-xl p-5" style={{ width: 420, height: 360 }}>
            <div className="relative w-full h-full overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 bg-cyan-950/20 transition-all" style={{ height: tower.waterPx * 0.5 }} />
              <WaterWave bottom={tower.waterPx * 0.5} />
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/40 tw-pulse" style={{ bottom: tower.ratingLinePx * 0.5 }}>
                <span className="absolute right-2 -top-6 text-sm font-mono text-amber-400">Rating {tower.ratingLine}</span>
              </div>
              {tower.blocks.map((b, i) => (
                <div key={b.id} className="absolute left-4 right-4 rounded-sm tw-block-in"
                  style={{ bottom: b.yBottom * 0.5, height: Math.max(8, b.height * 0.5), borderLeft: `3px solid ${b.tier.color}`, backgroundColor: `${b.tier.color}18`, animationDelay: `${i * 30}ms` }} />
              ))}
            </div>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl px-8 py-4 font-mono text-xl text-stone-400 flex gap-8">
            <span>Total: <span className="text-white font-black text-3xl">{tower.totalRating}</span></span>
            <span>Cap: <span className={tower.isUnderCap ? 'text-cyan-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>${(tower.totalCapHit / 1e6).toFixed(1)}M</span></span>
            <span>Players: <span className="text-white font-black">{roster.length}</span></span>
          </div>
          <div className="flex gap-4">
            <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-8 py-3 rounded-xl text-lg hover:bg-stone-800 transition-all">🔄 REROLL</button>
            <button onClick={() => { playClickSound(); setPhase('manage'); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black px-10 py-3 rounded-xl text-lg transition-all">START 💧</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black px-6 py-3 rounded-xl text-lg hover:text-stone-300">← 戻る</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ MANAGE ═══ */
  if (phase === 'manage') {
    const selectedPlayer = selectedBlockId ? roster.find(p => p.id === selectedBlockId) : null;

    /* ═══ TRADE MODE ═══ */
    if (tradeMode) {
      const outP = tradeOffer.players, outK = tradeOffer.picks;
      const inP = tradeTarget.players, inK = tradeTarget.picks;
      const hasOut = outP.length > 0 || outK.length > 0;
      const hasIn = inP.length > 0 || inK.length > 0;

      let salaryValid = null;
      if (outP.length > 0 || inP.length > 0) salaryValid = validateTrade(outP.map(p => p.salary), inP.map(p => p.salary));
      let stepienValid = { valid: true };
      if (outK.filter(p => p.round === 1).length > 0 || inK.filter(p => p.round === 1).length > 0) stepienValid = validateStepienRule(draftPicks, outK, inK);
      let pickBalanceValid = { valid: true };
      if (inK.length > 0) pickBalanceValid = validatePickBalance(outK, inK);
      const tradeAllowed = hasOut && hasIn && (!salaryValid || salaryValid.allowed) && stepienValid.valid && pickBalanceValid.valid;

      return (
        <div className="h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col overflow-hidden">
          {CSS} <ToastContainer toasts={toasts} /> {Header()}
          <main className="flex-1 flex flex-col overflow-auto px-5 py-4 gap-4">
            <div className="flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black font-mono text-purple-400">⚖️ TRADE MACHINE</h2>
              <div className="flex items-center gap-4">
                <span className="text-base font-mono text-stone-500">残り: {TRADE_LIMIT - tradesUsedThisSeason}/{TRADE_LIMIT}</span>
                <button onClick={() => { playClickSound(); setTradeMode(false); }} className="text-stone-400 hover:text-white font-mono text-base">← 戻る</button>
              </div>
            </div>
            <div className="bg-[#0e1218] border border-stone-800/50 rounded-xl p-4 text-sm font-mono text-stone-500 space-y-1 shrink-0">
              <p>• 給与マッチング: 送出額の75%〜125%+$100K（両側に選手がいる場合のみ）</p>
              <p>• ステピアンルール: 連続2年の1巡目ピックが両方空いてはならない</p>
              <p>• ピック価値バランス: 合計値が送出×1.5+15ptを超えると拒否</p>
            </div>
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <h3 className="text-base font-mono font-black text-red-400 shrink-0">📤 送出資産を選択</h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                  <div className="text-sm font-mono text-stone-600 uppercase tracking-wider mb-1">選手</div>
                  {roster.map(p => {
                    const selected = outP.find(x => x.id === p.id);
                    const tier = getEffTier(p.rating, p.salary);
                    return (
                      <button key={p.id} onClick={() => toggleTradeOut(p)}
                        className={'w-full text-left text-base py-2 px-3 rounded flex justify-between items-center transition-all ' +
                          (selected ? 'bg-red-950/50 border border-red-700' : 'bg-stone-950/30 border border-transparent hover:bg-stone-900/50')}>
                        <span className="text-white truncate">{p.name} <span className="text-stone-500">{p.position}</span></span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-black" style={{ color: tier.color }}>{p.rating}</span>
                          <span className="text-stone-400 font-mono">${(p.salary / 1e6).toFixed(1)}M</span>
                        </div>
                      </button>
                    );
                  })}
                  <div className="text-sm font-mono text-stone-600 uppercase tracking-wider mt-3 mb-1">ピック</div>
                  {draftPicks.length === 0 ? <p className="text-stone-700 text-base">ピックなし</p> : draftPicks.map(pk => {
                    const selected = outK.find(x => x.id === pk.id);
                    return (
                      <button key={pk.id} onClick={() => toggleTradeOutPick(pk)}
                        className={'w-full text-left text-base py-2 px-3 rounded flex justify-between items-center transition-all ' +
                          (selected ? 'bg-red-950/50 border border-red-700' : 'bg-stone-950/30 border border-transparent hover:bg-stone-900/50')}>
                        <span className="text-cyan-400 font-mono">Y{pk.year} R{pk.round}</span>
                        <span className="text-stone-600 font-mono">[{getPickValue(pk)}pt]</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="w-64 flex flex-col gap-3 shrink-0">
                <h3 className="text-base font-mono font-black text-amber-400 shrink-0">📋 判定</h3>
                <div className="flex-1 bg-[#0e1218] border border-stone-800/50 rounded-xl p-4 space-y-3 text-base overflow-y-auto">
                  {hasOut && hasIn ? (
                    <>
                      <div>
                        <div className="text-stone-600 font-mono text-sm uppercase">送出</div>
                        {outP.map(p => <div key={p.id} className="text-red-400 font-mono truncate">- {p.name} (${(p.salary / 1e6).toFixed(1)}M)</div>)}
                        {outK.map(p => <div key={p.id} className="text-red-400 font-mono">- Y{p.year}R{p.round} [{getPickValue(p)}]</div>)}
                      </div>
                      <div>
                        <div className="text-stone-600 font-mono text-sm uppercase">獲得</div>
                        {inP.map(p => <div key={p.id} className="text-cyan-400 font-mono truncate">+ {p.name} (${(p.salary / 1e6).toFixed(1)}M)</div>)}
                        {inK.map(p => <div key={p.id} className="text-cyan-400 font-mono">+ Y{p.year}R{p.round} [{getPickValue(p)}]</div>)}
                      </div>
                      <div className="border-t border-stone-800 pt-3 space-y-2">
                        {salaryValid && (
                          <div>
                            <div className="text-stone-500 font-mono text-sm">給与マッチング</div>
                            <div className={salaryValid.allowed ? 'text-emerald-400 font-mono font-black' : 'text-red-400 font-mono font-black'}>{salaryValid.allowed ? '✓ OK' : '✗ ' + salaryValid.reason}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-stone-500 font-mono text-sm">ステピアンルール</div>
                          <div className={stepienValid.valid ? 'text-emerald-400 font-mono font-black' : 'text-red-400 font-mono font-black'}>{stepienValid.valid ? '✓ OK' : '✗ ' + stepienValid.reason}</div>
                        </div>
                        {inK.length > 0 && (
                          <div>
                            <div className="text-stone-500 font-mono text-sm">ピックバランス</div>
                            <div className={pickBalanceValid.valid ? 'text-emerald-400 font-mono font-black' : 'text-red-400 font-mono font-black'}>{pickBalanceValid.valid ? '✓ OK' : '✗ ' + pickBalanceValid.reason}</div>
                          </div>
                        )}
                      </div>
                      {tradeAllowed && inP.length > 0 && (() => {
                        const capAfter = totalCapHit - outP.reduce((s, p) => s + p.salary, 0) + inP.reduce((s, p) => s + p.salary, 0);
                        const rtgAfter = totalRating - outP.reduce((s, p) => s + p.rating, 0) + inP.reduce((s, p) => s + p.rating, 0);
                        return (
                          <div className="bg-stone-950 rounded-lg p-3 space-y-1 border border-stone-800">
                            <div className="text-sm text-stone-600 font-mono uppercase">プレビュー</div>
                            <div className="flex justify-between"><span className="text-stone-500">Cap</span><span className={capAfter <= DYN_CAP ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>${(capAfter / 1e6).toFixed(1)}M</span></div>
                            <div className="flex justify-between"><span className="text-stone-500">Rating</span><span className={rtgAfter >= tower.ratingLine ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>{rtgAfter}</span></div>
                          </div>
                        );
                      })()}
                      <div className={'text-xl font-black font-mono pt-2 text-center ' + (tradeAllowed ? 'text-emerald-400' : 'text-red-400')}>{tradeAllowed ? '✓ 成立' : '✗ 不可'}</div>
                      <button onClick={handleExecuteTrade} disabled={!tradeAllowed}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-mono font-black py-3 rounded-lg text-base">トレード実行</button>
                    </>
                  ) : <p className="text-stone-600 text-base text-center py-8">左右から送出・獲得を選択</p>}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <h3 className="text-base font-mono font-black text-emerald-400 shrink-0">📥 獲得資産を選択</h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                  <div className="text-sm font-mono text-stone-600 uppercase tracking-wider mb-1">市場選手</div>
                  {tradeMarket.players.map(p => {
                    const selected = inP.find(x => x.id === p.id);
                    const tier = getEffTier(p.rating, p.salary);
                    return (
                      <button key={p.id} onClick={() => toggleTradeIn(p)}
                        className={'w-full text-left text-base py-2 px-3 rounded flex justify-between items-center transition-all ' +
                          (selected ? 'bg-cyan-950/50 border border-cyan-700' : 'bg-stone-950/30 border border-transparent hover:bg-stone-900/50')}>
                        <span className="text-white truncate">{p.name} <span className="text-stone-500">{p.position}</span></span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-black" style={{ color: tier.color }}>{p.rating}</span>
                          <span className="text-stone-400 font-mono">${(p.salary / 1e6).toFixed(1)}M</span>
                        </div>
                      </button>
                    );
                  })}
                  <div className="text-sm font-mono text-stone-600 uppercase tracking-wider mt-3 mb-1">市場ピック</div>
                  {tradeMarket.picks.length === 0 ? <p className="text-stone-700 text-base">ピックなし</p> : tradeMarket.picks.map(pk => {
                    const selected = inK.find(x => x.id === pk.id);
                    return (
                      <button key={pk.id} onClick={() => toggleTradeInPick(pk)}
                        className={'w-full text-left text-base py-2 px-3 rounded flex justify-between items-center transition-all ' +
                          (selected ? 'bg-cyan-950/50 border border-cyan-700' : 'bg-stone-950/30 border border-transparent hover:bg-stone-900/50')}>
                        <span className="text-cyan-400 font-mono">Y{pk.year} R{pk.round} <span className="text-stone-600">({pk.from})</span></span>
                        <span className="text-stone-600 font-mono">[{getPickValue(pk)}pt]</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    /* ═══ NORMAL MANAGE ═══ */
    return (
      <div className="h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col overflow-hidden">
        {CSS}
        <ToastContainer toasts={toasts} />
        {signingPlayer && (
          <SignModal player={signingPlayer} totalCapHit={totalCapHit} faSigned={faSignedThisSeason} faLimit={faLimit}
            mleUsed={mleUsed} mleAmount={mleAmount} hardCapped={hardCapped}
            onConfirm={handleConfirmSign} onCancel={() => { playClickSound(); setSigningPlayer(null); }} />
        )}
        {Header()}
        <main className="flex-1 flex overflow-hidden px-5 py-4 gap-4 min-h-0">
          {/* ══ Tower Area ══ */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            <div className="flex-1 relative rounded-xl border border-stone-800/50 bg-[#0c0f16] overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(6,182,212,0.4) 49px,rgba(6,182,212,0.4) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(6,182,212,0.4) 49px,rgba(6,182,212,0.4) 50px)',
              }} />
              <div className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                style={{ height: tower.waterPx, background: 'linear-gradient(to top, rgba(6,80,130,0.35), rgba(6,120,180,0.06))' }} />
              <WaterWave bottom={tower.waterPx} />
              <CapMarker label="CAP" value={DYN_CAP} dashColor="#6b7280" />
              <CapMarker label="TAX" value={DYN_TAX} dashColor="#b45309" />
              <CapMarker label="APRON1" value={DYN_APRON1} dashColor="#c2410c" />
              <CapMarker label="APRON2" value={DYN_APRON2} dashColor="#dc2626" />
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/50 tw-pulse" style={{ bottom: tower.ratingLinePx }}>
                <span className="absolute right-3 -top-7 text-base font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded">
                  ★ Rating {tower.ratingLine}
                </span>
              </div>
              {tower.blocks.map(b => (
                <Block key={b.id} block={b} isSelected={selectedBlockId === b.id}
                  isSubmerged={tower.waterPx > b.yTop}
                  onClick={() => setSelectedBlockId(selectedBlockId === b.id ? null : b.id)} />
              ))}
              {tower.blocks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-stone-600 font-mono text-xl">選手がいません</div>
              )}
            </div>
            {/* ★ Status bar - tower外に移動 */}
            <div className="flex items-center gap-8 px-5 py-3 bg-[#0e1218] border border-stone-800/50 rounded-xl text-lg font-mono shrink-0">
              <span>Rating: <span className={tower.isAboveLine ? 'text-emerald-400 font-black text-2xl' : 'text-red-400 font-black text-2xl'}>{tower.totalRating}</span><span className="text-stone-700">/{tower.ratingLine}</span></span>
              <span>Cap: <span className={tower.isUnderCap ? 'text-cyan-400 font-black text-2xl' : 'text-amber-400 font-black text-2xl'}>${(tower.totalCapHit / 1e6).toFixed(1)}M</span></span>
              <span>Players: <span className="text-white font-black text-2xl">{roster.length}</span></span>
            </div>
            <div className="h-12 flex items-center shrink-0">
              {selectedPlayer ? (
                <ActionBar player={selectedPlayer} />
              ) : (
                <span className="text-stone-600 font-mono text-base">← ブロックをクリックして放出操作</span>
              )}
            </div>
          </div>

          {/* ══ Side Panel ══ */}
          <div className="w-96 flex flex-col gap-3 shrink-0 overflow-hidden">
            {/* Warning */}
            {!tower.isAboveLine && (
              <div className="bg-red-950/40 border border-red-700 rounded-xl p-4 animate-pulse shrink-0">
                <div className="text-red-400 font-mono font-black text-lg">🚨 Rating ライン下回り！</div>
                <div className="text-base text-red-300 mt-1">不足: {tower.ratingLine - tower.totalRating}pt</div>
              </div>
            )}
            {/* Status */}
            <div className="bg-[#0e1218] border border-stone-800/50 rounded-xl p-4 space-y-2 text-base font-mono shrink-0">
              <div className="flex justify-between"><span className="text-stone-500">Rating</span><span className={tower.isAboveLine ? 'text-emerald-400 font-black text-xl' : 'text-red-400 font-black text-xl'}>{tower.totalRating} <span className="text-stone-700">/ {tower.ratingLine}</span></span></div>
              <div className="flex justify-between"><span className="text-stone-500">Cap Hit</span><span className={tower.isUnderCap ? 'text-cyan-400 font-black text-xl' : 'text-amber-400 font-black text-xl'}>${(tower.totalCapHit / 1e6).toFixed(1)}M <span className="text-stone-700">/ ${(DYN_CAP / 1e6).toFixed(0)}M</span></span></div>
              {dc > 0 && <div className="flex justify-between"><span className="text-red-500">Dead Cap</span><span className="text-red-400 font-black">${(dc / 1e6).toFixed(1)}M</span></div>}
              <div className="flex justify-between"><span className="text-stone-500">FA残り</span><span className="text-white font-black">{faLimit - faSignedThisSeason}/{faLimit}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">トレード</span><span className={tradesUsedThisSeason >= TRADE_LIMIT ? 'text-red-400 font-black' : 'text-white font-black'}>{TRADE_LIMIT - tradesUsedThisSeason}/{TRADE_LIMIT}</span></div>
              {mleAmount > 0 && <div className="flex justify-between"><span className="text-cyan-600">MLE</span><span className={mleUsed ? 'text-stone-600' : 'text-cyan-400 font-black'}>{mleUsed ? '使用済' : `$${(mleAmount / 1e6).toFixed(1)}M`}</span></div>}
            </div>
            {/* FA Market */}
            <div className="bg-[#0e1218] border border-stone-800/50 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center px-4 pt-4 pb-2 shrink-0">
                <h3 className="text-sm font-mono font-black text-cyan-400 uppercase tracking-wider">🏪 FA市場</h3>
                <button onClick={refreshFA} className="text-sm font-mono text-stone-600 hover:text-stone-300 bg-stone-900 px-2 py-1 rounded">🔄</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {freeAgents.map(p => {
                  const tier = getEffTier(p.rating, p.salary);
                  return (
                    <div key={p.id} className="bg-stone-950/50 border border-stone-800/40 rounded-lg p-3 hover:border-stone-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-base font-bold truncate">{p.name}</span>
                        <span className="font-mono font-black text-lg shrink-0 ml-3" style={{ color: tier.color }}>{p.rating}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-stone-500 font-mono text-sm">{p.position} · ${(p.salary / 1e6).toFixed(1)}M · {p.contractYears}yr · {tier.label}</span>
                        <button onClick={() => handleSignRequest(p)} disabled={faSignedThisSeason >= faLimit}
                          className="text-sm bg-cyan-950/60 border border-cyan-800 text-cyan-300 px-2 py-1 rounded font-mono hover:bg-cyan-900 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ml-2">
                          ＋
                        </button>
                      </div>
                    </div>
                  );
                })}
                {freeAgents.length === 0 && <p className="text-stone-700 text-base text-center py-8 font-mono">FA選手なし</p>}
              </div>
            </div>
            {/* ★ Bottom buttons - shrink-0で常に表示 */}
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={handleOpenTrade}
                disabled={tradesUsedThisSeason >= TRADE_LIMIT}
                className={'w-full font-mono font-black py-3 rounded-xl text-base tracking-widest transition-all ' +
                  (tradesUsedThisSeason >= TRADE_LIMIT
                    ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white')}>
                ⚖️ TRADE {tradesUsedThisSeason >= TRADE_LIMIT ? '(上限)' : `(${TRADE_LIMIT - tradesUsedThisSeason}回)`}
              </button>
              <button onClick={handleNextSeason}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-4 rounded-xl text-lg tracking-widest transition-all">
                NEXT SEASON ➡️
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ═══ SEASON END ═══ */
  if (phase === 'seasonEnd') {
    return (
      <div className="min-h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col items-center justify-center">
        {CSS} <ToastContainer toasts={toasts} />
        {showSummary && <SeasonSummary season={season} record={seasonRecord} summaries={summaries} onContinue={handleToDraft} />}
        {!showSummary && (
          <button onClick={handleToDraft} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black py-4 px-10 rounded-xl text-xl">ドラフトへ →</button>
        )}
      </div>
    );
  }

  /* ═══ DRAFT ═══ */
  if (phase === 'draft') {
    return (
      <div className="min-h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col items-center justify-center px-6">
        {CSS} <ToastContainer toasts={toasts} />
        <div className="w-full max-w-3xl space-y-5 bg-[#0e1218] border border-stone-800 rounded-2xl p-10">
          <div className="text-center space-y-3">
            <span className="text-base font-mono font-black text-cyan-400 uppercase tracking-widest">💧 DRAFT</span>
            <h2 className="text-4xl font-black">新人ドラフト</h2>
            <p className="text-stone-400 font-mono text-lg">残りピック: <span className="text-cyan-400 font-black">{picksLeft}</span></p>
          </div>
          {picksLeft > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {draftProspects.map((p, i) => {
                const tier = getEffTier(p.rating, p.salary);
                return (
                  <div key={p.id} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center justify-between hover:border-cyan-800 transition-colors">
                    <div>
                      <span className="text-stone-600 font-mono text-base mr-2">#{i + 1}</span>
                      <span className="text-white font-bold text-xl">{p.name}</span>
                      <span className="text-stone-500 font-mono text-base ml-3">{p.position} · R{p.rating}{p.pot > p.rating ? ` Pot${p.pot}` : ''} · Age {p.age}</span>
                      <span className="font-mono text-base ml-3" style={{ color: tier.color }}>${(p.salary / 1e6).toFixed(1)}M · {tier.label}</span>
                    </div>
                    <button onClick={() => handleDraft(p)} className="bg-cyan-950 border border-cyan-700 text-cyan-400 hover:bg-cyan-900 font-mono font-black px-6 py-2 rounded-lg text-lg">DRAFT</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-4">
              <div className="text-emerald-400 font-mono font-black text-2xl">✓ ドラフト完了</div>
              <div className="text-stone-400 text-lg">Rating: {totalRating} · Cap: ${(totalCapHit / 1e6).toFixed(1)}M</div>
              <button onClick={handleDraftComplete} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black py-4 rounded-xl text-lg">新シーズン開始 💧</button>
            </div>
          )}
          {picksLeft > 0 && (
            <button onClick={handleDraftComplete} className="w-full bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black py-3 rounded-xl text-lg hover:text-stone-300">スキップ →</button>
          )}
        </div>
      </div>
    );
  }

  /* ═══ GAME OVER ═══ */
  if (phase === 'gameOver') {
    return (
      <div className="min-h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col items-center justify-center px-6">
        {CSS}
        <div className="w-full max-w-xl space-y-6 bg-[#0e1218] border border-red-900 rounded-2xl p-10 text-center">
          <div className="space-y-2">
            <span className="text-base font-mono font-black text-red-400 uppercase tracking-widest">TOWER COLLAPSED</span>
            <h2 className="text-4xl font-black">タワー崩壊</h2>
          </div>
          <div className="bg-stone-950 rounded-xl p-6 space-y-3">
            <div className="text-lg text-stone-500 font-mono">存続期間</div>
            <div className="text-6xl font-black text-cyan-400 font-mono">{Math.max(0, season - 1)}</div>
            <div className="text-lg text-stone-500">シーズン</div>
            <div className="text-red-400 text-base font-mono mt-3">Rating {tower.totalRating} {'<'} Rating Line {tower.ratingLine}</div>
          </div>
          <div className="bg-stone-950 rounded-xl p-5">
            <div className="text-sm text-stone-600 font-mono">GM SCORE</div>
            <div className="text-5xl font-black text-amber-400 font-mono">{gmScore}<span className="text-2xl text-stone-600 ml-2">pts</span></div>
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { doReroll(); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black px-8 py-4 rounded-xl text-lg">TRY AGAIN 🔄</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-400 font-mono font-black px-6 py-4 rounded-xl text-lg hover:text-white">タイトルへ</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
