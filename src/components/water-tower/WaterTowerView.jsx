import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getEffTier, genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, getFALimit, calcGMScore, calcSeasonRecord,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
} from '../../waterTowerEngine';


/* ═══ Constants ═══ */
const SEASON_W = 420;
const GUTTER_W = 90;
const MIN_H = 28;
const SEC_PER_SEASON = 30;
const TICK = 50;
const SALARY_BAR_H = 32;

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
  const [sinking, setSinking] = useState(false);
  const canvasAreaRef = useRef(null);
  const scrollRef = useRef(null);
  const labelsRef = useRef(null);
  const contRef = useRef(null);
  const [canvasH, setCanvasH] = useState(500);
  const toastId = useRef(0);
  const timerRef = useRef(null);
  const lastBRef = useRef(1);
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
  const isDrowning = totalRating < ratingLine;
  const ratingAreaH = Math.max(200, Math.min(canvasH - SALARY_BAR_H, 500));
  const maxSalaryM = DYN_APRON2 / 1e6;
  const pxPerM = ratingAreaH / maxSalaryM;

  /* ── Stacking (salary height, Rating ascending) ── */
  const ratingItems = roster
    .map(p => ({ ...p, isDC: false, effSal: p.salary }))
    .sort((a, b) => a.rating - b.rating);

  let cumH = 0;
  const stacked = ratingItems.map(item => {
    const h = Math.max(MIN_H, (item.effSal / 1e6) * pxPerM);
    const b = cumH;
    cumH += h + 2;
    return { ...item, sBot: b, sH: h };
  });

  /* ── Water surface from cumulative Rating ── */
  let cumRating = 0;
  let waterPixelY = ratingAreaH + 50;
  for (const item of stacked) {
    const r = Number(item.rating) || 0;
    if (cumRating + r >= ratingLine) {
      const fraction = r > 0 ? (ratingLine - cumRating) / r : 1;
      waterPixelY = item.sBot + item.sH * Math.min(1, fraction);
      break;
    }
    cumRating += r;
  }

  /* ── Salary markers for gutter ── */
  const salaryMarkers = [20, 40, 60, 80, 100, 120, 140, 160, 180];

  /* ── Timeline ── */
  const maxSn = Math.max(
    ...roster.map(p => p.contractEndSeason || (p.signedSeason || 1) + p.contractYears),
    ...deadCapDetails.map(d => (d.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1))),
    sn + 7
  );
  const tlWidth = maxSn * SEASON_W;

  /* ── Bubbles ── */
  const bubblesRef = useRef(
    Array.from({ length: 14 }).map(() => ({
      left: 8 + Math.random() * 84,
      offset: Math.random() * 40,
      size: 3 + Math.random() * 8,
      dur: 1.5 + Math.random() * 1.5,
      delay: Math.random() * 1.5,
    }))
  );

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
    if (phase !== 'manage' || speed === 0 || showDraft || showSummary || sinking) {
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
  }, [phase, speed, showDraft, showSummary, sinking]);

  /* ═══ Sinking timer ═══ */
  useEffect(() => {
    if (!sinking) return;
    const t = setTimeout(() => { setSinking(false); setPhase('gameOver'); }, 2800);
    return () => clearTimeout(t);
  }, [sinking]);

  /* ═══ Season Boundary ═══ */
  useEffect(() => {
    const fl = Math.floor(currentSeason);
    if (fl > lastBRef.current && phase === 'manage' && speed > 0 && !showDraft && !showSummary && !sinking) {
      lastBRef.current = fl;
      handleSeasonBoundary(fl);
    }
  }, [currentSeason, phase, speed, showDraft, showSummary, sinking]);

  /* ═══ Canvas Measurement ═══ */
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const measure = () => { const h = el.clientHeight; if (h > 0) setCanvasH(h); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [phase]);

  /* ═══ Camera ═══ */
  useEffect(() => {
    if (scrollRef.current && phase === 'manage') {
      const t = (currentSeason - 1) * SEASON_W - scrollRef.current.clientWidth / 2 + SEASON_W / 2;
      scrollRef.current.scrollLeft = Math.max(0, t);
      if (labelsRef.current) labelsRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, [currentSeason, phase]);

  /* ═══ Keyboard ═══ */
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && phase === 'manage' && !showDraft && !signingPlayer && !actionPlayer && !sinking) {
        e.preventDefault();
        setSpeed(s => s === 0 ? 1 : 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, showDraft, signingPlayer, actionPlayer, sinking]);

  /* ═══ Actions ═══ */

  function doReroll() {
    playClickSound();
    const newRoster = genRoster().map(p => ({ ...p, signedSeason: 1, contractEndSeason: 1 + p.contractYears, originalContractYears: p.contractYears }));
    setRoster(newRoster);
    setFreeAgents(genFA(8));
    setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]); setMleUsed(false); setFaSignedThisSeason(0); setTradesUsed(0);
    setHardCapped(false); setActionPlayer(null); setSinking(false);
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
    const preservedDC = deadResult.details.map(d => {
      const orig = curDC.find(o => o.name === d.name || o.name?.replace(' (B/O)', '') === d.name?.replace(' (B/O)', ''));
      return { ...d, id: d.id || orig?.id || ('dc_lost_' + Date.now() + '_' + Math.random()), signedSeason: d.signedSeason || orig?.signedSeason || 1, contractEndSeason: d.contractEndSeason || orig?.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || 1) };
    });
    setDeadCapDetails(preservedDC);
    setTaxHistory(prev => [...prev, curCapHit > DYN_TAX]);
    setMleUsed(false); setFaSignedThisSeason(0); setTradesUsed(0); setHardCapped(false); setActionPlayer(null);
    const survival = checkSurvival(result.surviving, newSn + 1, []);
    if (!survival.alive) { playError(); setSinking(true); return; }
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
    setRoster(r => [...r, signed]); setDraftProspects(dp => dp.filter(p => p.id !== prospect.id)); setPicksLeft(p => p - 1);
    addToast('success', '🏀', `Draft: ${prospect.name}`, `R${prospect.rating} · $${(prospect.salary / 1e6).toFixed(1)}M`, 3000);
  }

  function handleDraftSkip() { playClickSound(); setPicksLeft(0); setDraftProspects([]); }

  function handleDraftComplete() {
    playClickSound(); setShowDraft(false);
    setDraftPicks(picks => {
      const u = picks.map(pk => ({ ...pk, year: pk.year - 1 })).filter(pk => pk.year >= 1);
      const my = u.length > 0 ? Math.max(...u.map(pk => pk.year)) : 0;
      u.push({ id: 'np_' + Date.now(), year: my + 1, round: 1, own: true });
      if (Math.random() > 0.5) u.push({ id: 'np2_' + Date.now(), year: my + 1, round: 2, own: true });
      return u;
    });
    refreshFAInternal(); setSpeed(1); playEpic();
    addToast('success', '➡️', `SEASON {Math.floor(currentSeason)}`, '新シーズン開始！', 3000);
  }

  function handleStripClick(player) { playClickSound(); setSpeed(0); setActionPlayer(player); }

  function handleWaive(player) {
    playClickSound();
    setDeadCapDetails(prev => [...prev, { id: 'dc_' + player.id + '_' + Date.now(), name: player.name, amount: player.salary, yearsLeft: player.contractYears, contractYears: player.contractYears, signedSeason: player.signedSeason, contractEndSeason: player.contractEndSeason, type: 'Waive' }]);
    setRoster(r => r.filter(p => p.id !== player.id)); setActionPlayer(null); playRelease();
    addToast('warning', '💀', `Waive: ${player.name}`, `$$$${(player.salary / 1e6).toFixed(1)}M × ${player.contractYears}yr Dead Cap`, 3500);
    setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
  }

  function handleBuyout(player) {
    playClickSound();
    const chance = Math.max(5, 100 - player.rating);
    if (Math.random() * 100 < chance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const dead = Math.floor(player.salary * pct / 100);
      setDeadCapDetails(prev => [...prev, { id: 'dc_' + player.id + '_' + Date.now(), name: player.name + ' (B/O)', amount: dead, yearsLeft: player.contractYears, contractYears: player.contractYears, signedSeason: player.signedSeason, contractEndSeason: player.contractEndSeason, type: 'Buyout' }]);
      setRoster(r => r.filter(p => p.id !== player.id)); setActionPlayer(null); playBuyout();
      addToast('success', '🤝', `Buyout: ${player.name}`, `${pct}%に軽減`, 3500);
      setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
    } else { playError(); addToast('warning', '❌', 'Buyout拒否', `${player.name} (${chance}%)`, 3000); }
  }

  function handleStretch(player) {
    playClickSound();
    const curS = Math.floor(currentSeason);
    const newYears = player.contractYears * 2 + 1;
    const newSal = Math.floor(player.salary * player.contractYears / newYears);
    setRoster(r => r.map(p => p.id !== player.id ? p : { ...p, salary: newSal, contractYears: newYears, contractEndSeason: curS + newYears }));
    setActionPlayer(null); playInflate();
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
    setFreeAgents(fa => fa.filter(x => x.id !== p.id)); setRoster(r => [...r, signed]); setFaSignedThisSeason(c => c + 1);
    if (useMLE) { setMleUsed(true); if (totalCapHit > DYN_CAP) setHardCapped(true); }
    playSuccess(); addToast('success', '✍️', `{p.name} 契約`, `R${p.rating} · $$$${(sal / 1e6).toFixed(1)}M/yr`, 3000);
    setSigningPlayer(null); setSpeed(1);
  }

  const handleCanvasScroll = useCallback(() => {
    if (scrollRef.current && labelsRef.current) labelsRef.current.scrollLeft = scrollRef.current.scrollLeft;
  }, []);

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER ═══                          */
  /* ═══════════════════════════════════════ */
  const CSS = (
    <style>{`
      @keyframes twIn { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes twWave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes twPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      @keyframes twGlow { 0%, 100% { box-shadow: 0 0 8px rgba(34,211,238,0.3); } 50% { box-shadow: 0 0 20px rgba(34,211,238,0.6); } }
      @keyframes stripSink { 0% { transform: translateY(0); opacity: 1; } 60% { opacity: 0.3; } 100% { transform: translateY(100px); opacity: 0; filter: blur(3px); } }
      @keyframes bubbleFloat { 0% { transform: translateY(0) scale(0.5); opacity: 0.7; } 100% { transform: translateY(-180px) scale(1.4); opacity: 0; } }
      @keyframes drownWarn { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.8; } }
      .tw-wave { animation: twWave 4s linear infinite; }
      .tw-pulse { animation: twPulse 2s ease-in-out infinite; }
      .tw-glow { animation: twGlow 2s ease-in-out infinite; }
      .tw-drown { animation: drownWarn 1.5s ease-in-out infinite; }
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
    const previewH = 230;
    const previewPxPerM = previewH / maxSalaryM;
    const previewItems = ratingItems.slice(0, 8);
    let pCumH = 0;
    const previewStacked = previewItems.map(item => {
      const h = Math.max(12, (item.effSal / 1e6) * previewPxPerM);
      const b = pCumH; pCumH += h + 2;
      return { ...item, sBot: b, sH: h };
    });
    let pCumR = 0; let previewWaterY = previewH + 20;
    for (const item of previewStacked) {
      const r = Number(item.rating) || 0;
      if (pCumR + r >= ratingLine) { previewWaterY = item.sBot + item.sH * Math.min(1, r > 0 ? (ratingLine - pCumR) / r : 1); break; }
      pCumR += r;
    }
    return (
      <div className="min-h-screen bg-[#080b10] text-white font-sans antialiased flex flex-col items-center justify-center px-6 gap-6">
        {CSS}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-white">💧 WATER TOWER</h1>
          <p className="text-xl text-stone-400">水面（Ratingライン）が上昇する。<br/>帯が水面から出ていなければ沈没。</p>
        </div>
        <div className="bg-[#0c0f16] border border-stone-800/50 rounded-xl p-4 w-full max-w-2xl" style={{ height: 300 }}>
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            {previewStacked.map((item, i) => {
              const tier = getEffTier(item.rating, item.salary);
              return (
                <div key={item.id} className="absolute rounded-md" style={{
                  left: 30 + i * 58, width: 48, bottom: 30 + item.sBot, height: item.sH,
                  borderLeft: `3px solid ${tier.color}`, backgroundColor: `${tier.color}18`,
                  animation: `twIn 0.3s ease ${i * 50}ms both`
                }} />
              );
            })}
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-cyan-500/40" style={{ bottom: 30 + previewWaterY }}>
              <span className="absolute right-2 -top-6 text-sm font-mono text-cyan-400">水面 R{ratingLine}</span>
            </div>
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
    const salaryPct = (totalCapHit / DYN_APRON2) * 100;
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
            {isDrowning && <span className="text-sm font-mono font-black text-red-400 animate-pulse ml-2">🚨 沈没危険</span>}
          </div>
          <div className="flex items-center gap-3">
            <SpeedBtn v={0} label="⏸" /><SpeedBtn v={1} label="1x" /><SpeedBtn v={2} label="2x" /><SpeedBtn v={3} label="3x" />
            <span className="text-sm font-mono text-stone-600 ml-3">GM</span>
            <span className="text-xl font-mono font-black text-amber-400">{gmScore}</span>
            <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-2 py-1 rounded text-lg ' + (isBgmOn ? 'text-emerald-400' : 'text-stone-500')}>{isBgmOn ? '🔊' : '🔇'}</button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden min-h-0">
          {/* Timeline */}
          <div className="flex flex-col shrink-0" style={{ width: SEASON_W * 2 + GUTTER_W }}>
            {/* Season labels */}
            <div className="h-10 flex items-center shrink-0 border-b border-stone-900">
              <div style={{ width: GUTTER_W }} className="shrink-0" />
              <div className="flex-1 overflow-hidden h-full" ref={labelsRef}>
                <div style={{ width: tlWidth, height: '100%', position: 'relative' }}>
                  {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                    <div key={s} className="absolute top-0 h-full flex items-center justify-center font-mono text-sm" style={{
                      left: (s - 1) * SEASON_W, width: SEASON_W,
                      color: s === sn ? '#22d3ee' : '#57534e', fontWeight: s === sn ? 900 : 400,
                      borderRight: '1px solid #1c1917',
                    }}>S{s}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden" ref={canvasAreaRef}>
              {/* Rating area */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Gutter */}
                <div className="shrink-0 relative bg-[#0c0f16] border-r border-stone-900 overflow-hidden" style={{ width: GUTTER_W, height: ratingAreaH }}>
                  {salaryMarkers.map(m => (
                    <span key={m} className="absolute left-1 text-[20px] font-mono text-stone-800"
                      style={{ bottom: m * pxPerM, transform: 'translateY(50%)' }}>
                      ${m}M
                    </span>
                  ))}
                  <span className="absolute left-1 text-[24px] font-mono text-red-400 bg-[#0c0f16]/90 px-1 rounded whitespace-nowrap"
                    style={{ bottom: (DYN_CAP / 1e6) * pxPerM, transform: 'translateY(50%)' }}>CAP</span>
                  <span className="absolute left-1 text-[24px] font-mono text-amber-400 bg-[#0c0f16]/90 px-1 rounded whitespace-nowrap"
                    style={{ bottom: (DYN_TAX / 1e6) * pxPerM, transform: 'translateY(50%)' }}>TAX</span>
                  <span className="absolute left-1 text-[24px] font-mono text-purple-400 bg-[#0c0f16]/90 px-1 rounded whitespace-nowrap"
                    style={{ bottom: (DYN_APRON1 / 1e6) * pxPerM, transform: 'translateY(50%)' }}>APR1</span>
                  <span className="absolute left-1 text-[24px] font-mono text-pink-400 bg-[#0c0f16]/90 px-1 rounded whitespace-nowrap"
                    style={{ bottom: (DYN_APRON2 / 1e6) * pxPerM, transform: 'translateY(-100%)' }}>APR2</span>
                  <span className="absolute left-1 text-[24px] font-mono text-cyan-400 bg-[#0c0f16]/90 px-1 rounded whitespace-nowrap"
                    style={{ bottom: waterPixelY, transform: 'translateY(50%)' }}>★ R{ratingLine}</span>
                </div>

                {/* Scrollable canvas */}
                <div ref={scrollRef} className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }} onScroll={handleCanvasScroll}>
                  <div ref={contRef} style={{ width: tlWidth, height: ratingAreaH, position: 'relative', background: '#0c0f16' }}>
                    {/* Grid */}
                    {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                      <div key={s} className="absolute top-0 bottom-0" style={{ left: (s - 1) * SEASON_W, width: 1, background: 'rgba(255,255,255,0.03)' }} />
                    ))}

                    {/* Past overlay */}
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 0, width: Math.max(0, (currentSeason - 1) * SEASON_W), background: 'rgba(0,0,0,0.2)', zIndex: 4 }} />

                    {/* Salary threshold lines */}
                    <div className="absolute left-0 right-0 border-t-2 border-dashed opacity-30" style={{ bottom: (DYN_CAP / 1e6) * pxPerM, borderColor: '#dc2626', zIndex: 3 }} />
                    <div className="absolute left-0 right-0 border-t border-dashed opacity-20" style={{ bottom: (DYN_TAX / 1e6) * pxPerM, borderColor: '#f59e0b', zIndex: 3 }} />
                    <div className="absolute left-0 right-0 border-t border-dashed opacity-20" style={{ bottom: (DYN_APRON1 / 1e6) * pxPerM, borderColor: '#a855f7', zIndex: 3 }} />
                    <div className="absolute left-0 right-0 border-t border-dashed opacity-20" style={{ bottom: (DYN_APRON2 / 1e6) * pxPerM, borderColor: '#ec4899', zIndex: 3 }} />

                    {/* Strips (salary height, Rating order) */}
                    {stacked.map(item => {
                      const startSn = (item.contractEndSeason || (item.signedSeason || 1) + item.contractYears) - item.contractYears;
                      const left = (startSn - 1) * SEASON_W + 4;
                      const w = Math.max(0, item.contractYears * SEASON_W - 8);
                      const tier = getEffTier(item.rating, item.salary);
                      const isSelected = actionPlayer && actionPlayer.id === item.id;
                      const submerged = item.sBot + item.sH <= waterPixelY;
                      if (w <= 0) return null;
                      return (
                        <div key={item.id}
                          onClick={() => !sinking && handleStripClick(item)}
                          className={'absolute rounded-lg cursor-pointer transition-all duration-500 ' + (isSelected ? 'tw-glow' : '')}
                          style={{
                            left, width: w, bottom: item.sBot, height: item.sH,
                            borderLeft: `5px solid ${tier.color}`,
                            backgroundColor: isSelected ? `${tier.color}30` : `${tier.color}${submerged ? '08' : '18'}`,
                            opacity: sinking ? undefined : submerged ? 0.4 : 1,
                            filter: sinking ? undefined : submerged ? 'brightness(0.4) saturate(0.3)' : 'none',
                            zIndex: isSelected ? 10 : 2,
                            transform: isSelected ? 'translateX(6px)' : 'translateX(0)',
                            animation: sinking ? `stripSink ${1.8 + Math.random() * 0.6}s ease-in forwards` : undefined,
                            animationDelay: sinking ? `${(stacked.indexOf(item)) * 0.04}s` : undefined,
                          }}>
                          <div className="flex items-center justify-between px-4 h-full overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-white font-bold text-base truncate">{item.name}</span>
                              <span className="text-xs bg-stone-800/80 text-stone-400 px-1 rounded font-mono shrink-0">{item.position}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-black text-lg" style={{ color: tier.color }}>{item.rating}</span>
                              <div className="text-right">
                                <div className="text-stone-300 font-mono text-sm">${(item.effSal / 1e6).toFixed(1)}M</div>
                                <div className="text-stone-600 font-mono text-xs">{item.contractYears}yr · {tier.label}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Water overlay */}
                    <div className={'absolute left-0 right-0 pointer-events-none ' + (isDrowning && !sinking ? 'tw-drown' : '')}
                      style={{
                        bottom: 0,
                        height: sinking ? '100%' : waterPixelY,
                        background: sinking
                          ? 'linear-gradient(to top, rgba(6,30,60,0.85), rgba(6,60,120,0.5))'
                          : 'linear-gradient(to top, rgba(6,40,80,0.55), rgba(6,80,130,0.08))',
                        transition: sinking ? 'height 2.5s ease-in' : 'height 0.3s ease',
                        zIndex: 5,
                      }} />

                    {/* Water surface wave */}
                    {!sinking && waterPixelY < ratingAreaH && (
                      <div className="absolute left-0 right-0 pointer-events-none overflow-hidden"
                        style={{ bottom: waterPixelY - 8, height: 16, zIndex: 6 }}>
                        <svg className="tw-wave" style={{ width: '200%', height: '100%' }} viewBox="0 0 200 16" preserveAspectRatio="none">
                          <path d="M0,8 Q10,0 20,8 T40,8 T60,8 T80,8 T100,8 T120,8 T140,8 T160,8 T180,8 T200,8 V16 H0 Z" fill="rgba(6,182,212,0.3)" />
                        </svg>
                      </div>
                    )}

                    {/* Bubbles (sinking) */}
                    {sinking && bubblesRef.current.map((b, i) => (
                      <div key={i} className="absolute rounded-full pointer-events-none"
                        style={{
                          left: `${b.left}%`, bottom: waterPixelY + b.offset,
                          width: b.size, height: b.size,
                          background: 'rgba(6,182,212,0.35)', border: '1px solid rgba(6,182,212,0.5)',
                          animation: `bubbleFloat ${b.dur}s ease-out forwards`, animationDelay: `${b.delay}s`, zIndex: 7,
                        }} />
                    ))}

                    {/* Current season marker */}
                    <div className="absolute top-0 bottom-0 tw-glow" style={{ left: (currentSeason - 1) * SEASON_W - 1, width: 3, background: 'linear-gradient(to bottom, #22d3ee, #0891b2)', zIndex: 8 }} />
                  </div>
                </div>
              </div>

              {/* Salary bar */}
              <div className="shrink-0 flex items-center bg-[#0a0d12] border-t border-stone-800/50" style={{ height: SALARY_BAR_H }}>
                <div className="shrink-0 flex items-center justify-center font-mono text-xs text-stone-500 border-r border-stone-900 bg-[#0a0d12]" style={{ width: GUTTER_W }}>
                  ${(totalCapHit / 1e6).toFixed(0)}M
                </div>
                <div className="flex-1 relative mx-2" style={{ height: 16 }}>
                  <div className="absolute inset-0 rounded bg-stone-900" />
                  <div className="absolute top-0 left-0 h-full rounded transition-all duration-300"
                    style={{
                      width: `${Math.min(100, salaryPct)}%`,
                      background: totalCapHit > DYN_APRON2 ? 'linear-gradient(90deg, #ef4444, #991b1b)' :
                                  totalCapHit > DYN_APRON1 ? 'linear-gradient(90deg, #22d3ee, #a855f7)' :
                                  totalCapHit > DYN_TAX ? 'linear-gradient(90deg, #22d3ee, #f59e0b)' : '#22d3ee',
                    }} />
                  {[
                    { val: DYN_CAP, color: '#ef4444', label: 'CAP' },
                    { val: DYN_TAX, color: '#f59e0b', label: 'TAX' },
                    { val: DYN_APRON1, color: '#a855f7', label: 'APR1' },
                    { val: DYN_APRON2, color: '#ec4899', label: 'APR2' },
                  ].map(({ val, color, label }) => (
                    <div key={label} className="absolute top-0 bottom-0" style={{ left: `${(val / DYN_APRON2) * 100}%`, borderLeft: `1px dashed ${color}80` }}>
                      <span className="absolute -top-0.5 left-0.5 text-[7px] font-mono whitespace-nowrap" style={{ color }}>{label}</span>
                    </div>
                  ))}
                </div>
                {dc > 0 && <span className="text-[9px] font-mono text-red-400 shrink-0 pr-2">DC ${(dc / 1e6).toFixed(1)}M</span>}
              </div>
            </div>

            {/* Bottom status (compact) */}
            <div className="flex items-center gap-6 px-5 py-2 bg-[#0e1218] border-t border-stone-800/50 text-sm font-mono shrink-0">
              <span>Rating: <span className={totalRating >= ratingLine ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>{totalRating}</span><span className="text-stone-700">/{ratingLine}</span></span>
              <span>Cap: <span className={totalCapHit <= DYN_CAP ? 'text-cyan-400 font-black' : 'text-amber-400 font-black'}>${(totalCapHit / 1e6).toFixed(1)}M</span><span className="text-stone-700">/${(DYN_CAP / 1e6).toFixed(0)}M</span></span>
              <span>{roster.length}人</span>
              <span className="text-stone-600">|</span>
              <span>FA残り: <span className="text-white font-black">{faLimit - faSignedThisSeason}/{faLimit}</span></span>
              {dc > 0 && <span>DC: <span className="text-red-400 font-black">${(dc / 1e6).toFixed(1)}M</span></span>}
              <span className="text-stone-600 text-xs ml-auto">Space: 一時停止</span>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 flex flex-col gap-2 shrink-0 border-l border-stone-800/50 bg-[#0a0d12] overflow-hidden">
            {isDrowning && (
              <div className="bg-red-950/40 border-b border-red-900/50 p-3 animate-pulse shrink-0">
                <div className="text-red-400 font-mono font-black text-base">🚨 沈没危険: Rating {ratingLine - totalRating}pt不足</div>
              </div>
            )}
            <div className="p-3 space-y-2 font-mono shrink-0">
              <div className="flex justify-between items-center"><span className="text-stone-500 text-xl">Rating</span><span className={totalRating >= ratingLine ? 'text-emerald-400 font-black text-4xl' : 'text-red-400 font-black text-4xl'}>{totalRating} <span className="text-stone-700 text-2xl">/{ratingLine}</span></span></div>
              <div className="flex justify-between items-center"><span className="text-stone-500 text-xl">Cap</span><span className={totalCapHit <= DYN_CAP ? 'text-cyan-400 font-black text-4xl' : 'text-red-400 font-black text-4xl'}>${(totalCapHit / 1e6).toFixed(1)}M</span></div>
              {dc > 0 && <div className="flex justify-between items-center"><span className="text-red-500 text-xl">Dead Cap</span><span className="text-red-400 font-black text-3xl">${(dc / 1e6).toFixed(1)}M</span></div>}
            </div>
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
            <span className="text-base font-mono font-black text-red-400 uppercase tracking-widest">TOWER SUNK</span>
            <h2 className="text-4xl font-black">タワー沈没</h2>
          </div>
          <div className="bg-stone-950 rounded-xl p-6 space-y-3">
            <div className="text-lg text-stone-500 font-mono">存続期間</div>
            <div className="text-6xl font-black text-cyan-400 font-mono">{Math.max(0, sn - 1)}</div>
            <div className="text-lg text-stone-500">シーズン</div>
            <div className="text-red-400 text-base font-mono mt-3">Rating {totalRating} {'<'} 水面 R{ratingLine}</div>
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
