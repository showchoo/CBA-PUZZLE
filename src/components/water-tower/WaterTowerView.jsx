import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getEffTier, genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, getFALimit, calcGMScore, calcSeasonRecord,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
} from '../../waterTowerEngine';

/* ═══ Constants ═══ */
const SEASON_W = 280;
const PX_PER_M = 2.5;
const MIN_H = 28;
const SEC_PER_SEASON = 30;
const TICK = 50;

/* ═══ Toast ═══ */
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 left-4 z-[100] space-y-3 pointer-events-none" style={{ maxWidth: 480 }}>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto" style={{ animation: 'twIn 0.4s ease forwards' }}>
          <div className={'border rounded-xl px-5 py-4 shadow-2xl backdrop-blur-sm ' +
            (t.type === 'success' ? 'bg-emerald-950/90 border-emerald-600/50' :
             t.type === 'warning' ? 'bg-red-950/90 border-red-600/50' :
             'bg-cyan-950/90 border-cyan-600/50')}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className={'text-base font-mono font-black ' +
                  (t.type === 'success' ? 'text-emerald-400' : t.type === 'warning' ? 'text-red-400' : 'text-cyan-400')}>{t.title}</div>
                {t.msg && <div className="text-sm text-stone-300 mt-0.5">{t.msg}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Sign Modal ═══ */
function SignModal({ player, totalCapHit, faSigned, faLimit, mleUsed, mleAmount, hardCapped, onConfirm, onCancel }) {
  const [years, setYears] = useState(2);
  const [useMLE, setUseMLE] = useState(false);
  const sal = adjustSalaryForYears(player.salary, years);
  const after = totalCapHit + sal;
  const ok = faSigned < faLimit && after <= DYN_APRON2 && (!hardCapped || after <= DYN_APRON1);
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
                  (years === y ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800')}>{y}</button>
            ))}
          </div>
        </div>
        {mleAmount > 0 && !mleUsed && (
          <label className="flex items-center gap-3 text-base text-cyan-400 font-mono">
            <input type="checkbox" checked={useMLE} onChange={e => setUseMLE(e.target.checked)} className="accent-cyan-500 w-5 h-5" />
            MLE使用 (${(Math.min(sal, mleAmount) / 1e6).toFixed(1)}M)
          </label>
        )}
        <div className="bg-stone-950 rounded-xl p-4 text-base font-mono space-y-2">
          <div className="flex justify-between"><span className="text-stone-500">年俸</span><span className="text-white font-black">${(sal / 1e6).toFixed(1)}M</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Cap後</span><span className={after <= DYN_CAP ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>${(after / 1e6).toFixed(1)}M</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 font-mono font-black py-3 rounded-xl text-lg">キャンセル</button>
          <button onClick={() => onConfirm(years, useMLE)} disabled={!ok}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-stone-800 disabled:text-stone-600 text-stone-950 font-mono font-black py-3 rounded-xl text-lg">契約</button>
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

/* ═══ Draft Overlay ═══ */
function DraftOverlay({ prospects, picksLeft, onDraft, onSkip, onContinue, season }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#0e1218] border border-cyan-800/50 rounded-2xl p-8 w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <span className="text-base font-mono font-black text-cyan-400 uppercase tracking-widest">💧 SEASON {season} DRAFT</span>
          <p className="text-stone-400 font-mono text-lg">残りピック: <span className="text-cyan-400 font-black">{picksLeft}</span></p>
        </div>
        {picksLeft > 0 ? (
          <div className="space-y-3">
            {prospects.map((p, i) => {
              const tier = getEffTier(p.rating, p.salary);
              return (
                <div key={p.id} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center justify-between hover:border-cyan-800 transition-colors">
                  <div>
                    <span className="text-stone-600 font-mono text-base mr-2">#{i + 1}</span>
                    <span className="text-white font-bold text-xl">{p.name}</span>
                    <span className="text-stone-500 font-mono text-base ml-3">{p.position} · R{p.rating} · Age {p.age}</span>
                    <span className="font-mono text-base ml-3" style={{ color: tier.color }}>${(p.salary / 1e6).toFixed(1)}M · {tier.label}</span>
                  </div>
                  <button onClick={() => onDraft(p)} className="bg-cyan-950 border border-cyan-700 text-cyan-400 hover:bg-cyan-900 font-mono font-black px-6 py-2 rounded-lg text-lg">DRAFT</button>
                </div>
              );
            })}
            <button onClick={onSkip} className="w-full bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black py-3 rounded-xl text-lg hover:text-stone-300">スキップ →</button>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-emerald-400 font-mono font-black text-2xl">✓ ドラフト完了</div>
            <button onClick={onContinue} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black py-4 rounded-xl text-lg">シーズン再開 ▶</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* ═══ MAIN COMPONENT ═══                  */
/* ═══════════════════════════════════════ */
export default function WaterTowerView({ onBack, gmName, playClickSound, isBgmOn, toggleBGM }) {
  const [phase, setPhase] = useState('reroll');
  const [currentSeason, setCurrentSeason] = useState(1.0);
  const [speed, setSpeed] = useState(0);
  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [deadCapDetails, setDeadCapDetails] = useState([]);
  const [draftPicks, setDraftPicks] = useState([]);
  const [draftProspects, setDraftProspects] = useState([]);
  const [picksLeft, setPicksLeft] = useState(0);
  const [signingPlayer, setSigningPlayer] = useState(null);
  const [actionPlayer, setActionPlayer] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [seasonRecord, setSeasonRecord] = useState(null);
  const [showDraft, setShowDraft] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [mleUsed, setMleUsed] = useState(false);
  const [faSignedThisSeason, setFaSignedThisSeason] = useState(0);
  const [tradesUsed, setTradesUsed] = useState(0);
  const [taxHistory, setTaxHistory] = useState([]);
  const [hardCapped, setHardCapped] = useState(false);
  const toastId = useRef(0);
  const timerRef = useRef(null);
  const lastBRef = useRef(1);
  const contRef = useRef(null);
  const csRef = useRef(1.0);
  const spRef = useRef(0);
  const rRef = useRef([]);
  const dcRef = useRef([]);
  const dpRef = useRef([]);

  /* ── Derived ── */
  const dc = deadCapDetails.reduce((s, d) => s + d.amount, 0);
  const totalCapHit = calcCapHit(roster, dc);
  const totalRating = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
  const faLimit = getFALimit(totalCapHit);
  const mleAmount = getMLEAmount(totalCapHit);
  const sn = Math.floor(currentSeason);
  const ratingLine = 380 + (sn - 1) * 8;
  const gmScore = calcGMScore(sn, totalRating, totalCapHit, roster);
  const canvasH = Math.max(450, (DYN_APRON2 / 1e6) * PX_PER_M + 80);
  const waterH = Math.min(canvasH - 10, (totalCapHit / 1e6) * PX_PER_M);
  const capLineY = (DYN_CAP / 1e6) * PX_PER_M;

  /* ── Stacking ── */
  const allItems = [
    ...roster.map(p => ({ ...p, isDC: false, effSal: p.salary })),
    ...deadCapDetails.map(d => ({
      id: d.id || ('dc_' + Date.now() + '_' + Math.random()),
      name: d.name,
      salary: d.amount,
      effSal: d.amount,
      isDC: true,
      rating: 0,
      position: '',
      contractYears: d.contractYears || d.yearsLeft || 1,
      yearsLeft: d.yearsLeft || d.contractYears || 1,
      signedSeason: d.signedSeason || 1,
      contractEndSeason: d.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1),
      tier: { color: '#ef4444', label: 'DC' },
    })),
  ].sort((a, b) => b.effSal - a.effSal);

  let cumH = 0;
  const stacked = allItems.map(item => {
    const h = Math.max(MIN_H, (item.effSal / 1e6) * PX_PER_M);
    const b = cumH;
    cumH += h + 2;
    return { ...item, sBot: b, sH: h };
  });

  const maxSn = Math.max(
    ...roster.map(p => p.contractEndSeason || (p.signedSeason || 1) + p.contractYears),
    ...deadCapDetails.map(d => (d.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1))),
    sn + 7
  );
  const tlWidth = maxSn * SEASON_W;

  /* ── Ref sync ── */
  useEffect(() => { rRef.current = roster; }, [roster]);
  useEffect(() => { dcRef.current = deadCapDetails; }, [deadCapDetails]);
  useEffect(() => { spRef.current = speed; }, [speed]);
  useEffect(() => { csRef.current = currentSeason; }, [currentSeason]);
  useEffect(() => { dpRef.current = draftPicks; }, [draftPicks]);

  /* ── Toast ── */
  const addToast = useCallback((type, icon, title, msg, dur = 3000) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, icon, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), dur);
  }, []);

  /* ── Sound ── */
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
  const playRelease = () => { playTone(600, 0.15, 'sine', 0.05); setTimeout(() => playTone(400, 0.15, 'sine', 0.04), 100); setTimeout(() => playTone(250, 0.3, 'sine', 0.03), 200); };
  const playBuyout = () => { playTone(330, 0.6, 'sine', 0.05); setTimeout(() => playTone(494, 0.8, 'sine', 0.07), 40); };
  const playInflate = () => { playTone(400, 0.15, 'triangle', 0.05); setTimeout(() => playTone(600, 0.2, 'triangle', 0.06), 100); setTimeout(() => playTone(800, 0.25, 'triangle', 0.07), 200); };

  /* ═══ Timer ═══ */
  useEffect(() => {
    if (phase !== 'manage' || speed === 0 || showDraft || showSummary) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setCurrentSeason(prev => {
        const delta = (TICK / 1000) / SEC_PER_SEASON * spRef.current;
        const next = prev + delta;
        csRef.current = next;
        return next;
      });
    }, TICK);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase, speed, showDraft, showSummary]);

  /* ═══ Season Boundary ═══ */
  useEffect(() => {
    const fl = Math.floor(currentSeason);
    if (fl > lastBRef.current && phase === 'manage' && speed > 0 && !showDraft && !showSummary) {
      lastBRef.current = fl;
      handleSeasonBoundary(fl);
    }
  }, [currentSeason, phase, speed, showDraft, showSummary]);

  /* ═══ Camera ═══ */
  useEffect(() => {
    if (contRef.current && phase === 'manage') {
      const t = (currentSeason - 1) * SEASON_W - contRef.current.clientWidth / 2 + SEASON_W / 2;
      contRef.current.scrollLeft = Math.max(0, t);
    }
  }, [currentSeason, phase]);

  /* ═══ Keyboard ═══ */
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && phase === 'manage' && !showDraft && !signingPlayer && !actionPlayer) {
        e.preventDefault();
        setSpeed(s => s === 0 ? 1 : 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, showDraft, signingPlayer, actionPlayer]);

  /* ═══ Actions ═══ */

  function doReroll() {
    playClickSound();
    const newRoster = genRoster().map(p => ({ ...p, signedSeason: 1, contractEndSeason: 1 + p.contractYears, originalContractYears: p.contractYears }));
    setRoster(newRoster);
    setFreeAgents(genFA(8));
    setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]); setMleUsed(false); setFaSignedThisSeason(0); setTradesUsed(0);
    setHardCapped(false); setActionPlayer(null);
    setCurrentSeason(1.0); csRef.current = 1.0; lastBRef.current = 1;
    setSpeed(0); setPhase('reroll');
  }

  function startGame() {
    playClickSound();
    setSpeed(1);
    setPhase('manage');
  }

  function handleSeasonBoundary(newSn) {
    setSpeed(0);
    const curRoster = rRef.current;
    const curDC = dcRef.current;
    const curRating = curRoster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
    const curCapHit = calcCapHit(curRoster, curDC.reduce((s, d) => s + d.amount, 0));
    const prevRL = 380 + (newSn - 2) * 8;

    const record = calcSeasonRecord(curRating, prevRL);
    setSeasonRecord(record);

    const result = advanceSeason(curRoster, []);
    const deadResult = advanceDeadCap(curDC);
    setSummaries(result.summaries);
    setRoster(result.surviving);

    /* デッドキャップのID・signedSeason・contractEndSeasonを保持 */
    const preservedDC = deadResult.details.map(d => {
      const orig = curDC.find(o => o.name === d.name || o.name?.replace(' (B/O)', '') === d.name?.replace(' (B/O)', ''));
      return {
        ...d,
        id: d.id || orig?.id || ('dc_lost_' + Date.now() + '_' + Math.random()),
        signedSeason: d.signedSeason || orig?.signedSeason || 1,
        contractEndSeason: d.contractEndSeason || orig?.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || 1),
      };
    });
    setDeadCapDetails(preservedDC);

    setTaxHistory(prev => [...prev, curCapHit > DYN_TAX]);
    setMleUsed(false); setFaSignedThisSeason(0); setTradesUsed(0); setHardCapped(false); setActionPlayer(null);

    const survival = checkSurvival(result.surviving, newSn + 1, []);
    if (!survival.alive) { playError(); setPhase('gameOver'); return; }

    if (record.gmBonus > 0) addToast('success', '🏀', `S${newSn - 1}: ${record.wins}W-${record.losses}L`, `${record.result} +${record.gmBonus}`, 4000);
    else addToast('info', '🏀', `S${newSn - 1}: ${record.wins}W-${record.losses}L`, record.result, 3000);

    setShowSummary(true);
  }

  function handleSummaryContinue() {
    setShowSummary(false);
    const year1 = dpRef.current.filter(pk => pk.year === 1).length;
    setDraftProspects(genDraft(Math.max(year1, 5)));
    setPicksLeft(year1);
    if (year1 > 0) setShowDraft(true);
    else { setSpeed(1); refreshFAInternal(); }
  }

  function refreshFAInternal() {
    const space = Math.max(0, DYN_CAP - calcCapHit(rRef.current, dcRef.current.reduce((s, d) => s + d.amount, 0)));
    setFreeAgents(genFA(space > 20e6 ? 12 : space > 10e6 ? 10 : 8));
  }

  function handleDraft(prospect) {
    playClickSound(); playSuccess();
    const s = Math.floor(currentSeason);
    const signed = { ...prospect, signedSeason: s, contractEndSeason: s + prospect.contractYears, originalContractYears: prospect.contractYears, faStatus: 'None', source: 'draft' };
    setRoster(r => [...r, signed]);
    setDraftProspects(dp => dp.filter(p => p.id !== prospect.id));
    setPicksLeft(p => p - 1);
    addToast('success', '🏀', `Draft: ${prospect.name}`, `R${prospect.rating} · $${(prospect.salary / 1e6).toFixed(1)}M`, 3000);
  }

  function handleDraftSkip() {
    playClickSound();
    setPicksLeft(0);
    setDraftProspects([]);
  }

  function handleDraftComplete() {
    playClickSound();
    setShowDraft(false);
    setDraftPicks(picks => {
      const u = picks.map(pk => ({ ...pk, year: pk.year - 1 })).filter(pk => pk.year >= 1);
      const my = u.length > 0 ? Math.max(...u.map(pk => pk.year)) : 0;
      u.push({ id: 'np_' + Date.now(), year: my + 1, round: 1, own: true });
      if (Math.random() > 0.5) u.push({ id: 'np2_' + Date.now(), year: my + 1, round: 2, own: true });
      return u;
    });
    refreshFAInternal();
    setSpeed(1);
    playEpic();
    addToast('success', '➡️', `SEASON {Math.floor(currentSeason)}`, '新シーズン開始！', 3000);
  }

  function handleStripClick(player) {
    playClickSound();
    setSpeed(0);
    setActionPlayer(player);
  }

  function handleWaive(player) {
    playClickSound();
    const dcEntry = {
      id: 'dc_' + player.id + '_' + Date.now(),
      name: player.name,
      amount: player.salary,
      yearsLeft: player.contractYears,
      contractYears: player.contractYears,
      signedSeason: player.signedSeason,
      contractEndSeason: player.contractEndSeason,
      type: 'Waive'
    };
    setDeadCapDetails(prev => [...prev, dcEntry]);
    setRoster(r => r.filter(p => p.id !== player.id));
    setActionPlayer(null);
    playRelease();
    addToast('warning', '💀', `Waive: ${player.name}`, `$$$${(player.salary / 1e6).toFixed(1)}M × ${player.contractYears}yr Dead Cap`, 3500);
    setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
  }

  function handleBuyout(player) {
    playClickSound();
    const chance = Math.max(5, 100 - player.rating);
    if (Math.random() * 100 < chance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const dead = Math.floor(player.salary * pct / 100);
      setDeadCapDetails(prev => [...prev, {
        id: 'dc_' + player.id + '_' + Date.now(),
        name: player.name + ' (B/O)',
        amount: dead,
        yearsLeft: player.contractYears,
        contractYears: player.contractYears,
        signedSeason: player.signedSeason,
        contractEndSeason: player.contractEndSeason,
        type: 'Buyout'
      }]);
      setRoster(r => r.filter(p => p.id !== player.id));
      setActionPlayer(null);
      playBuyout();
      addToast('success', '🤝', `Buyout: ${player.name}`, `${pct}%に軽減`, 3500);
      setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
    } else {
      playError();
      addToast('warning', '❌', 'Buyout拒否', `${player.name} (${chance}%)`, 3000);
    }
  }

  function handleStretch(player) {
    playClickSound();
    const curS = Math.floor(currentSeason);
    const newYears = player.contractYears * 2 + 1;
    const newSal = Math.floor(player.salary * player.contractYears / newYears);
    setRoster(r => r.map(p => p.id !== player.id ? p : { ...p, salary: newSal, contractYears: newYears, contractEndSeason: curS + newYears }));
    setActionPlayer(null);
    playInflate();
    addToast('info', '⏳', `Stretch: ${player.name}`, `${newYears}yr @ $${(newSal / 1e6).toFixed(1)}M`, 3500);
    setTimeout(() => setSpeed(1), 500);
  }

  function handleSignRequest(player) { playClickSound(); setSpeed(0); setSigningPlayer(player); }

  function handleConfirmSign(years, useMLE) {
    const p = signingPlayer;
    const check = canSignFA(p, years, totalCapHit, faSignedThisSeason);
    if (!check.allowed) { playError(); addToast('warning', '❌', '契約不可', check.reason); return; }
    let sal = adjustSalaryForYears(p.salary, years);
    if (useMLE && mleAmount > 0 && !mleUsed) sal = Math.min(sal, mleAmount);
    if (totalCapHit + sal > DYN_APRON2) { playError(); addToast('warning', '❌', '第2エプロン超過'); return; }
    const s = Math.floor(currentSeason);
    const signed = { ...p, salary: sal, contractYears: years, signedSeason: s, contractEndSeason: s + years, originalContractYears: years, faStatus: 'None', source: 'fa', hasOption: false, optionType: null };
    setFreeAgents(fa => fa.filter(x => x.id !== p.id));
    setRoster(r => [...r, signed]);
    setFaSignedThisSeason(c => c + 1);
    if (useMLE) { setMleUsed(true); if (totalCapHit > DYN_CAP) setHardCapped(true); }
    playSuccess();
    addToast('success', '✍️', `{p.name} 契約`, `R${p.rating} · $$$${(sal / 1e6).toFixed(1)}M/yr`, 3000);
    setSigningPlayer(null);
    setSpeed(1);
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER ═══                          */
  /* ═══════════════════════════════════════ */
  const CSS = (
    <style>{`
      @keyframes twIn { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes twWave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes twPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      @keyframes twGlow { 0%, 100% { box-shadow: 0 0 8px rgba(34,211,238,0.3); } 50% { box-shadow: 0 0 20px rgba(34,211,238,0.6); } }
      .tw-wave { animation: twWave 4s linear infinite; }
      .tw-pulse { animation: twPulse 2s ease-in-out infinite; }
      .tw-glow { animation: twGlow 2s ease-in-out infinite; }
    `}</style>
  );

  const SpeedBtn = ({ v, label }) => (
    <button onClick={() => { playClickSound(); setSpeed(v); }}
      className={'px-3 py-1.5 rounded-lg font-mono font-black text-sm transition-all border ' +
        (speed === v ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300')}>
      {label}
    </button>
  );

  /* ═══ REROLL ═══ */
  if (phase === 'reroll') {
    return (
      <div className="min-h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col items-center justify-center px-6 gap-6">
        {CSS}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-white">💧 WATER TOWER</h1>
          <p className="text-xl text-stone-400">Cap（水面）を超えず、Rating を維持せよ。<br/>時間は自動で流れる。帯を操れ。</p>
        </div>
        <div className="bg-[#0c0f16] border border-stone-800/50 rounded-xl p-4 w-full max-w-2xl" style={{ height: 300 }}>
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            <div className="absolute bottom-0 left-0 right-0 bg-cyan-950/20" style={{ height: waterH * 0.5 }} />
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/40 tw-pulse" style={{ bottom: canvasH * 0.25 }}>
              <span className="absolute right-2 -top-6 text-sm font-mono text-amber-400">Rating Line {ratingLine}</span>
            </div>
            {stacked.filter(s => !s.isDC).map((item, i) => {
              const tier = item.tier || getEffTier(item.rating, item.salary);
              return (
                <div key={item.id} className="absolute rounded-md" style={{
                  left: 20 + i * 60, width: 50, bottom: item.sBot * 0.4, height: Math.max(8, item.sH * 0.4),
                  borderLeft: `3px solid ${tier.color}`, backgroundColor: `${tier.color}18`, animation: `twIn 0.3s ease ${i * 50}ms both`
                }} />
              );
            })}
          </div>
        </div>
        <div className="bg-stone-950 border border-stone-800 rounded-xl px-8 py-4 font-mono text-xl text-stone-400 flex gap-8">
          <span>Total: <span className="text-white font-black text-3xl">{totalRating}</span></span>
          <span>Cap: <span className={totalCapHit <= DYN_CAP ? 'text-cyan-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>${(totalCapHit / 1e6).toFixed(1)}M</span></span>
          <span>Players: <span className="text-white font-black">{roster.length}</span></span>
        </div>
        <div className="flex gap-4">
          <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-8 py-3 rounded-xl text-lg hover:bg-stone-800 transition-all">🔄 REROLL</button>
          <button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black px-10 py-3 rounded-xl text-lg transition-all">START ▶</button>
          <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black px-6 py-3 rounded-xl text-lg hover:text-stone-300">← 戻る</button>
        </div>
      </div>
    );
  }

  /* ═══ MANAGE ═══ */
  if (phase === 'manage') {
    return (
      <div className="h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col overflow-hidden">
        {CSS}
        <Toast toasts={toasts} />
        {signingPlayer && <SignModal player={signingPlayer} totalCapHit={totalCapHit} faSigned={faSignedThisSeason} faLimit={faLimit} mleUsed={mleUsed} mleAmount={mleAmount} hardCapped={hardCapped} onConfirm={handleConfirmSign} onCancel={() => { setSigningPlayer(null); setSpeed(1); }} />}
        {showSummary && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#0e1218] border border-stone-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-4">
              <div className="text-center space-y-2">
                <span className="text-base font-mono font-black text-cyan-400 uppercase">SEASON {sn - 1} REPORT</span>
                {seasonRecord && <div className="space-y-1"><div className="text-3xl font-mono font-black">{seasonRecord.wins}W-{seasonRecord.losses}L</div><div className={'text-xl font-mono font-black ' + (seasonRecord.gmBonus > 0 ? 'text-emerald-400' : 'text-stone-500')}>{seasonRecord.result} {seasonRecord.gmBonus > 0 && `+${seasonRecord.gmBonus}`}</div></div>}
              </div>
              <div className="bg-stone-950 rounded-xl p-4 max-h-48 overflow-y-auto space-y-1">
                {summaries.map((s, i) => (
                  <div key={i} className="flex justify-between text-base py-1"><span className="text-white">{s.name}</span><span className="font-mono"><span className="text-stone-400">{s.oldRating}</span><span className="text-stone-600 mx-1">→</span><span className={s.change <= -3 ? 'text-red-400 font-black' : 'text-amber-400 font-black'}>{s.newRating || 'RET'}</span>{s.change !== 'RETIRE' && <span className="text-red-500 ml-1">({s.change})</span>}</span></div>
                ))}
              </div>
              <button onClick={handleSummaryContinue} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black py-4 rounded-xl text-lg">Continue ▶</button>
            </div>
          </div>
        )}
        {showDraft && <DraftOverlay prospects={draftProspects} picksLeft={picksLeft} onDraft={handleDraft} onSkip={handleDraftSkip} onContinue={handleDraftComplete} season={sn} />}

        {/* Header */}
        <header className="px-5 py-3 flex justify-between items-center border-b border-stone-800/50 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => { playClickSound(); setSpeed(0); onBack(); }} className="text-stone-500 hover:text-stone-300 font-mono text-lg px-2">🏠</button>
            <h1 className="text-2xl font-black font-mono text-cyan-400 tracking-wider">💧 WATER TOWER</h1>
            <span className="text-lg font-mono text-stone-500">S{sn}</span>
            <span className="text-sm font-mono text-stone-600">({(currentSeason % 1 * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-3">
            <SpeedBtn v={0} label="⏸" />
            <SpeedBtn v={1} label="1x" />
            <SpeedBtn v={2} label="2x" />
            <SpeedBtn v={3} label="3x" />
            <span className="text-sm font-mono text-stone-600 ml-3">GM</span>
            <span className="text-xl font-mono font-black text-amber-400">{gmScore}</span>
            <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-2 py-1 rounded text-lg ' + (isBgmOn ? 'text-emerald-400' : 'text-stone-500')}>{isBgmOn ? '🔊' : '🔇'}</button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden min-h-0">
          {/* Timeline */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Season labels */}
            <div className="h-8 flex shrink-0 border-b border-stone-900 overflow-hidden" ref={el => {
              if (el && contRef.current) el.scrollLeft = contRef.current.scrollLeft;
            }}>
              <div style={{ width: tlWidth, position: 'relative' }}>
                {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                  <div key={s} className="absolute top-0 h-full flex items-center justify-center font-mono text-sm" style={{
                    left: (s - 1) * SEASON_W, width: SEASON_W,
                    color: s === sn ? '#22d3ee' : '#57534e', fontWeight: s === sn ? 900 : 400,
                    borderRight: '1px solid #1c1917',
                  }}>S{s}</div>
                ))}
              </div>
            </div>
            {/* Canvas */}
            <div ref={contRef} className="flex-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none' }}>
              <div style={{ width: tlWidth, height: canvasH, position: 'relative', background: '#0c0f16' }}>
                {/* Grid */}
                {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                  <div key={s} className="absolute top-0 bottom-0" style={{ left: (s - 1) * SEASON_W, width: 1, background: 'rgba(255,255,255,0.03)' }} />
                ))}
                {/* Past overlay */}
                <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 0, width: Math.max(0, (currentSeason - 1) * SEASON_W), background: 'rgba(0,0,0,0.25)', zIndex: 4 }} />
                {/* Water */}
                <div className="absolute bottom-0 left-0 right-0 transition-all" style={{ height: waterH, background: 'linear-gradient(to top, rgba(6,80,130,0.35), rgba(6,120,180,0.06))', zIndex: 1 }} />
                <WaterWave bottom={waterH} />
                {/* Cap line */}
                <div className="absolute left-0 right-0 border-t-2 border-dashed opacity-40" style={{ bottom: capLineY, borderColor: '#dc2626', zIndex: 3 }}>
                  <span className="absolute left-3 -top-6 text-sm font-mono text-red-400 bg-[#0c0f16]/80 px-1.5 rounded">CAP ${(DYN_CAP / 1e6).toFixed(0)}M</span>
                </div>
                {/* Rating line label */}
                <div className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/40 tw-pulse" style={{ bottom: canvasH * 0.65, zIndex: 3 }}>
                  <span className="absolute left-3 -top-6 text-sm font-mono text-amber-400 bg-[#0c0f16]/80 px-1.5 rounded">★ Rating {ratingLine}</span>
                </div>
                {/* Strips */}
                {stacked.map(item => {
                  const startSn = (item.contractEndSeason || (item.signedSeason || 1) + (item.contractYears || 1)) - (item.isDC ? (item.yearsLeft || 1) : (item.contractYears || 1));
                  const left = (startSn - 1) * SEASON_W + 4;
                  const w = Math.max(0, ((item.isDC ? item.yearsLeft : item.contractYears) || 0) * SEASON_W - 8);
                  const tier = item.tier || getEffTier(item.rating, item.salary);
                  const isSelected = actionPlayer && actionPlayer.id === item.id;
                  if (w <= 0) return null;
                  return (
                    <div key={item.id} onClick={() => !item.isDC && handleStripClick(item)}
                      className={'absolute rounded-lg cursor-pointer transition-all duration-500 ' + (isSelected ? 'tw-glow' : '')}
                      style={{
                        left, width: w, bottom: item.sBot, height: item.sH,
                        borderLeft: `5px solid ${item.isDC ? '#ef4444' : tier.color}`,
                        backgroundColor: isSelected ? `${tier.color}30` : item.isDC ? 'rgba(239,68,68,0.15)' : `${tier.color}12`,
                        opacity: item.isDC ? 0.7 : 1,
                        backgroundImage: item.isDC ? 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(239,68,68,0.1) 8px, rgba(239,68,68,0.1) 16px)' : 'none',
                        zIndex: isSelected ? 10 : item.isDC ? 1 : 2,
                        transform: isSelected ? 'translateX(6px)' : 'translateX(0)',
                      }}>
                      <div className="flex items-center justify-between px-4 h-full overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white font-bold text-base truncate">{item.name}</span>
                          {!item.isDC && <span className="text-xs bg-stone-800/80 text-stone-400 px-1 rounded font-mono shrink-0">{item.position}</span>}
                          {item.isDC && <span className="text-xs bg-red-950/80 text-red-400 px-1 rounded font-mono shrink-0">DC</span>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {!item.isDC && <span className="font-mono font-black text-lg" style={{ color: tier.color }}>{item.rating}</span>}
                          <div className="text-right">
                            <div className="text-stone-300 font-mono text-sm">${(item.effSal / 1e6).toFixed(1)}M</div>
                            <div className="text-stone-600 font-mono text-xs">{item.isDC ? item.yearsLeft : item.contractYears}yr · {tier.label}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Current season marker */}
                <div className="absolute top-0 bottom-0 tw-glow" style={{ left: (currentSeason - 1) * SEASON_W - 1, width: 3, background: 'linear-gradient(to bottom, #22d3ee, #0891b2)', zIndex: 8 }} />
              </div>
            </div>
            {/* Bottom status */}
            <div className="flex items-center gap-8 px-5 py-2.5 bg-[#0e1218] border-t border-stone-800/50 text-lg font-mono shrink-0">
              <span>Rating: <span className={totalRating >= ratingLine ? 'text-emerald-400 font-black text-2xl' : 'text-red-400 font-black text-2xl'}>{totalRating}</span><span className="text-stone-700">/{ratingLine}</span></span>
              <span>Cap: <span className={totalCapHit <= DYN_CAP ? 'text-cyan-400 font-black text-2xl' : 'text-amber-400 font-black text-2xl'}>${(totalCapHit / 1e6).toFixed(1)}M</span><span className="text-stone-700">/${(DYN_CAP / 1e6).toFixed(0)}M</span></span>
              <span>{roster.length}人</span>
              <span className="text-stone-600">|</span>
              <span>FA残り: <span className="text-white font-black">{faLimit - faSignedThisSeason}/{faLimit}</span></span>
              {dc > 0 && <span>DC: <span className="text-red-400 font-black">${(dc / 1e6).toFixed(1)}M</span></span>}
              <span className="text-stone-600 text-sm ml-auto">Space: 一時停止</span>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 flex flex-col gap-2 shrink-0 border-l border-stone-800/50 bg-[#0a0d12] overflow-hidden">
            {/* Warning */}
            {totalRating < ratingLine && (
              <div className="bg-red-950/40 border-b border-red-900/50 p-3 animate-pulse shrink-0">
                <div className="text-red-400 font-mono font-black text-base">🚨 Rating不足: {ratingLine - totalRating}pt</div>
              </div>
            )}
            {/* Status */}
            <div className="p-3 space-y-1.5 text-base font-mono shrink-0">
              <div className="flex justify-between"><span className="text-stone-500">Rating</span><span className={totalRating >= ratingLine ? 'text-emerald-400 font-black text-xl' : 'text-red-400 font-black text-xl'}>{totalRating} <span className="text-stone-700">/{ratingLine}</span></span></div>
              <div className="flex justify-between"><span className="text-stone-500">Cap</span><span className={totalCapHit <= DYN_CAP ? 'text-cyan-400 font-black text-xl' : 'text-red-400 font-black text-xl'}>${(totalCapHit / 1e6).toFixed(1)}M</span></div>
              {dc > 0 && <div className="flex justify-between"><span className="text-red-500">Dead Cap</span><span className="text-red-400 font-black">${(dc / 1e6).toFixed(1)}M</span></div>}
            </div>

            {/* Action */}
            <div className="px-3 shrink-0">
              {actionPlayer ? (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 space-y-2">
                  <div className="text-white font-bold text-lg">{actionPlayer.name}</div>
                  <div className="text-stone-400 font-mono text-sm">{actionPlayer.position} · R{actionPlayer.rating} · ${(actionPlayer.salary / 1e6).toFixed(1)}M · {actionPlayer.contractYears}yr</div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => handleWaive(actionPlayer)} className="text-sm bg-amber-950/80 border border-amber-700 text-amber-300 px-3 py-1.5 rounded font-mono hover:bg-amber-900">💀 Waive</button>
                    {actionPlayer.contractYears > 1 && <button onClick={() => handleBuyout(actionPlayer)} className="text-sm bg-purple-950/80 border border-purple-700 text-purple-300 px-3 py-1.5 rounded font-mono hover:bg-purple-900">🤝 B/O</button>}
                    {actionPlayer.contractYears > 1 && <button onClick={() => handleStretch(actionPlayer)} className="text-sm bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-3 py-1.5 rounded font-mono hover:bg-emerald-900">⏳ Stretch</button>}
                    <button onClick={() => { setActionPlayer(null); setSpeed(1); }} className="text-sm text-stone-500 hover:text-white px-2 py-1.5">✕</button>
                  </div>
                </div>
              ) : (
                <div className="text-stone-600 font-mono text-sm py-2">← タイムラインのブロックをクリック</div>
              )}
            </div>

            {/* FA Market */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center px-3 pt-2 pb-1 shrink-0">
                <h3 className="text-sm font-mono font-black text-cyan-400 uppercase">🏪 FA市場</h3>
                <button onClick={() => { playClickSound(); refreshFAInternal(); }} className="text-sm font-mono text-stone-600 hover:text-stone-300 bg-stone-900 px-2 py-0.5 rounded">🔄</button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                {freeAgents.map(p => {
                  const tier = getEffTier(p.rating, p.salary);
                  return (
                    <div key={p.id} className="bg-stone-950/50 border border-stone-800/40 rounded-lg p-2.5 hover:border-stone-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-base font-bold truncate">{p.name}</span>
                        <span className="font-mono font-black text-lg shrink-0 ml-2" style={{ color: tier.color }}>{p.rating}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-stone-500 font-mono text-sm">{p.position} · ${(p.salary / 1e6).toFixed(1)}M · {p.contractYears}yr</span>
                        <button onClick={() => handleSignRequest(p)} disabled={faSignedThisSeason >= faLimit}
                          className="text-sm bg-cyan-950/60 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded font-mono hover:bg-cyan-900 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ml-2">＋</button>
                      </div>
                    </div>
                  );
                })}
                {freeAgents.length === 0 && <p className="text-stone-700 text-base text-center py-6 font-mono">FA選手なし</p>}
              </div>
            </div>
          </div>
        </main>
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
            <div className="text-6xl font-black text-cyan-400 font-mono">{Math.max(0, sn - 1)}</div>
            <div className="text-lg text-stone-500">シーズン</div>
            <div className="text-red-400 text-base font-mono mt-3">Rating {totalRating} {'<'} Required {ratingLine}</div>
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
