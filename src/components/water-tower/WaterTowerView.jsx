import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getEffTier, genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, getFALimit, calcGMScore, calcSeasonRecord,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
} from '../../waterTowerEngine';

const MAX_PX_PER_M = 2.5;
const MIN_H_BASE = 14;
const SEC_PER_SEASON = 30;
const TICK = 50;
const LABEL_COL_W = 36;
const SIDEBAR_W = 160;

const CSS_BLOCK = (
  <style>{`
    @keyframes twIn { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes twWave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes twPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes twGlow { 0%, 100% { box-shadow: 0 0 6px rgba(34,211,238,0.3); } 50% { box-shadow: 0 0 16px rgba(34,211,238,0.6); } }
    @keyframes stripBorn { 0% { opacity: 0; transform: scaleY(0); filter: brightness(2); } 60% { opacity: 1; transform: scaleY(1.1); filter: brightness(1.4); } 100% { opacity: 1; transform: scaleY(1); filter: brightness(1); } }
    @keyframes stripDissolve { 0% { opacity: 1; } 30% { filter: brightness(2); } 100% { opacity: 0; transform: scaleY(0.3) translateX(30px); filter: brightness(3); } }
    @keyframes stripStretch { 0% { filter: brightness(1); } 20% { filter: brightness(2) hue-rotate(40deg); transform: scaleX(1.2); } 100% { filter: brightness(1); transform: scaleX(1); } }
    @keyframes stripShrink { 0% { filter: brightness(1); } 30% { filter: brightness(2.5); transform: scaleX(0.7); } 100% { filter: brightness(1); transform: scaleX(1); } }
    .tw-wave { animation: twWave 4s linear infinite; }
    .tw-pulse { animation: twPulse 2s ease-in-out infinite; }
    .tw-glow { animation: twGlow 2s ease-in-out infinite; }
    .strip-born { animation: stripBorn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .strip-dissolve { animation: stripDissolve 0.8s ease-in forwards; pointer-events: none; }
    .strip-stretch { animation: stripStretch 1s ease-out; }
    .strip-shrink { animation: stripShrink 0.7s ease-out; }
    .wt-grain::after { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 9999; opacity: 0.3; }
    .wt-scroll::-webkit-scrollbar { display: none; }
    .wt-scroll { scrollbar-width: none; }
    .wt-sl { font-size: 0.45rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #525c6e; }
    .wt-dv { width: 1px; height: 12px; background: rgba(255,255,255,0.06); flex-shrink: 0; }
  `}</style>
);

function Toast({ toasts }) {
  return (
    <div className="fixed top-2 left-2 z-[100] space-y-1 pointer-events-none" style={{ maxWidth: 300 }}>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto" style={{ animation: 'twIn 0.4s ease forwards' }}>
          <div className={'border rounded-lg px-2.5 py-1.5 shadow-2xl backdrop-blur-md ' +
            (t.type === 'success' ? 'bg-emerald-950/90 border-emerald-600/40' :
             t.type === 'warning' ? 'bg-red-950/90 border-red-600/40' :
             'bg-cyan-950/90 border-cyan-600/40')}>
            <div className="flex items-center gap-1.5">
              <span className="text-[0.6rem]">{t.icon}</span>
              <div>
                <div className={'text-[0.6rem] font-bold ' + (t.type === 'success' ? 'text-emerald-400' : t.type === 'warning' ? 'text-red-400' : 'text-cyan-400')} style={{ fontFamily: "'Syne'" }}>{t.title}</div>
                {t.msg && <div className="text-[0.5rem] text-stone-400" style={{ fontFamily: "'DM Mono'" }}>{t.msg}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignModal({ player, totalCapHit, faSigned, faLimit, mleUsed, mleAmount, hardCapped, onConfirm, onCancel }) {
  const [years, setYears] = useState(2);
  const [useMLE, setUseMLE] = useState(false);
  const sal = adjustSalaryForYears(player.salary, years);
  const after = totalCapHit + sal;
  const ok = faSigned < faLimit && after <= DYN_APRON2 && (!hardCapped || after <= DYN_APRON1);
  const tier = getEffTier(player.rating, player.salary);
  const mono = { fontFamily: "'DM Mono'" };
  const display = { fontFamily: "'Syne'" };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9998]" onClick={onCancel}>
      <div className="bg-[#0e1218] border border-stone-700/50 rounded-xl p-4 w-full max-w-[280px] space-y-2.5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <h3 className="text-sm font-bold" style={{ ...display, color: tier.color }}>{player.name}</h3>
          <div className="text-[0.55rem] text-stone-400" style={mono}>{player.position} · <span style={{ color: tier.color }}>R{player.rating}</span> · Age {player.age}</div>
        </div>
        <div>
          <label className="wt-sl block mb-0.5">契約年数</label>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map(y => (
              <button key={y} onClick={() => setYears(y)}
                className={'py-1 rounded border text-[0.55rem] font-bold transition-all ' + (years === y ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-stone-900 border-stone-800 text-stone-500 hover:bg-stone-800')}
                style={mono}>{y}</button>
            ))}
          </div>
        </div>
        {mleAmount > 0 && !mleUsed && (
          <label className="flex items-center gap-1 text-[0.55rem] text-cyan-400 cursor-pointer" style={mono}>
            <input type="checkbox" checked={useMLE} onChange={e => setUseMLE(e.target.checked)} className="accent-cyan-500 w-3 h-3" />
            MLE (${(Math.min(sal, mleAmount) / 1e6).toFixed(1)}M)
          </label>
        )}
        <div className="rounded-lg p-2 text-[0.55rem] space-y-0.5" style={{ background: '#080b10', border: '1px solid rgba(255,255,255,0.04)', ...mono }}>
          <div className="flex justify-between"><span className="text-stone-600">年俸</span><span className="text-white font-bold">${(sal / 1e6).toFixed(1)}M</span></div>
          <div className="flex justify-between"><span className="text-stone-600">Cap後</span><span className={'font-bold ' + (after <= DYN_CAP ? 'text-emerald-400' : 'text-red-400')}>${(after / 1e6).toFixed(1)}M</span></div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 font-bold py-1 rounded text-[0.55rem]" style={mono}>キャンセル</button>
          <button onClick={() => onConfirm(years, useMLE)} disabled={!ok} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-stone-800 disabled:text-stone-600 text-stone-950 font-bold py-1 rounded text-[0.55rem]" style={mono}>契約</button>
        </div>
      </div>
    </div>
  );
}

function WaterWave({ bottom }) {
  return (
    <div className="absolute left-0 right-0 pointer-events-none overflow-hidden" style={{ bottom: bottom - 6, height: 12 }}>
      <svg className="tw-wave" style={{ width: '200%', height: '100%' }} viewBox="0 0 200 16" preserveAspectRatio="none">
        <path d="M0,8 Q10,0 20,8 T40,8 T60,8 T80,8 T100,8 T120,8 T140,8 T160,8 T180,8 T200,8 V16 H0 Z" fill="rgba(6,182,212,0.2)" />
      </svg>
    </div>
  );
}

function DraftOverlay({ prospects, picksLeft, onDraft, onSkip, onContinue, season }) {
  const mono = { fontFamily: "'DM Mono'" };
  const display = { fontFamily: "'Syne'" };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0e1218] border border-cyan-800/40 rounded-xl p-4 w-full max-w-md max-h-[70vh] overflow-y-auto shadow-2xl space-y-2.5">
        <div className="text-center">
          <span className="text-[0.55rem] font-bold text-cyan-400 uppercase tracking-[0.15em]" style={display}>💧 SEASON {season} DRAFT</span>
          <p className="text-[0.55rem] text-stone-400 mt-0.5" style={mono}>残り: <span className="text-cyan-400 font-bold">{picksLeft}</span></p>
        </div>
        {picksLeft > 0 ? (
          <div className="space-y-1">
            {prospects.map((p, i) => {
              const tier = getEffTier(p.rating, p.salary);
              return (
                <div key={p.id} className="bg-stone-950 border border-stone-800/60 rounded-lg p-1.5 flex items-center justify-between hover:border-cyan-800/60 transition-colors">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-stone-700 text-[0.5rem] w-4 text-center shrink-0" style={mono}>#{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-[0.6rem] truncate">{p.name}</div>
                      <div className="flex items-center gap-1 mt-px">
                        <span className="text-[0.45rem] bg-stone-800/80 text-stone-400 px-0.5 rounded" style={mono}>{p.position}</span>
                        <span className="text-[0.45rem] font-bold" style={{ ...mono, color: tier.color }}>R{p.rating}</span>
                        <span className="text-[0.45rem] text-stone-600">A{p.age}</span>
                        <span className="text-[0.45rem] font-bold" style={{ ...mono, color: tier.color }}>${(p.salary / 1e6).toFixed(1)}M</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDraft(p)} className="bg-cyan-950 border border-cyan-700 text-cyan-400 hover:bg-cyan-900 font-bold px-2 py-0.5 rounded text-[0.55rem] shrink-0 ml-2" style={mono}>DRAFT</button>
                </div>
              );
            })}
            <button onClick={onSkip} className="w-full bg-stone-900 border border-stone-800 text-stone-600 font-bold py-1 rounded text-[0.55rem] hover:text-stone-300" style={mono}>スキップ →</button>
          </div>
        ) : (
          <div className="text-center py-3 space-y-2">
            <div className="text-emerald-400 font-bold text-xs" style={display}>✓ ドラフト完了</div>
            <button onClick={onContinue} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-bold py-1.5 rounded text-[0.6rem]" style={mono}>シーズン再開 ▶</button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [contextMenu, setContextMenu] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [seasonRecord, setSeasonRecord] = useState(null);
  const [showDraft, setShowDraft] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [mleUsed, setMleUsed] = useState(false);
  const [faSignedThisSeason, setFaSignedThisSeason] = useState(0);
  const [taxHistory, setTaxHistory] = useState([]);
  const [hardCapped, setHardCapped] = useState(false);
  const [userScrolling, setUserScrolling] = useState(false);
  const [animatingStrips, setAnimatingStrips] = useState({});
  const [viewportH, setViewportH] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [viewportW, setViewportW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const toastId = useRef(0);
  const timerRef = useRef(null);
  const lastBRef = useRef(1);
  const contRef = useRef(null);
  const csRef = useRef(1.0);
  const spRef = useRef(0);
  const rRef = useRef([]);
  const dcRef = useRef([]);
  const dpRef = useRef([]);
  const scrollTimeoutRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, scrollStart: 0 });

  const mono = { fontFamily: "'DM Mono'" };
  const display = { fontFamily: "'Syne'" };
  const seasonW = Math.max(350, Math.floor((viewportW - SIDEBAR_W - LABEL_COL_W) / 2));

  useEffect(() => {
    ['font-syne', 'font-dmmono'].forEach((id, i) => {
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet';
        link.href = ['https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap', 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap'][i];
        document.head.appendChild(link);
      }
    });
  }, []);

  useEffect(() => {
    const onResize = () => { setViewportH(window.innerHeight); setViewportW(window.innerWidth); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const dc = deadCapDetails.reduce((s, d) => s + d.amount, 0);
  const totalCapHit = calcCapHit(roster, dc);
  const totalRating = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
  const faLimit = getFALimit(totalCapHit);
  const mleAmount = getMLEAmount(totalCapHit);
  const sn = Math.floor(currentSeason);
  const ratingLine = 380 + (sn - 1) * 8;
  const gmScore = calcGMScore(sn, totalRating, totalCapHit, roster);

  const canvasH = Math.max(180, viewportH - 24);
  const dynamicPxPerM = Math.max(0.4, Math.min(MAX_PX_PER_M, (canvasH - 40) / Math.max(1, DYN_APRON2 / 1e6)));
  const dynamicMinH = Math.max(5, Math.min(MIN_H_BASE, canvasH / 30));

  const allItems = [
    ...roster.map(p => ({ ...p, isDC: false, effSal: p.salary })),
    ...deadCapDetails.map(d => ({
      id: d.id || ('dc_' + Date.now() + '_' + Math.random()),
      name: d.name, salary: d.amount, effSal: d.amount, isDC: true,
      rating: 0, position: '', contractYears: d.contractYears || d.yearsLeft || 1,
      yearsLeft: d.yearsLeft || d.contractYears || 1, signedSeason: d.signedSeason || 1,
      contractEndSeason: d.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1),
      tier: { color: '#ef4444', label: 'DC' },
    })),
  ].sort((a, b) => b.effSal - a.effSal);

  let cumH = 0;
  const stacked = allItems.map(item => {
    const h = Math.max(dynamicMinH, (item.effSal / 1e6) * dynamicPxPerM);
    const b = cumH; cumH += h + 1;
    return { ...item, sBot: b, sH: h };
  });

  const maxSn = Math.max(
    ...roster.map(p => (p.signedSeason || 1) + p.contractYears + 1),
    ...deadCapDetails.map(d => (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1) + 1),
    sn + 2
  );
  const tlWidth = maxSn * seasonW;
  const waterH = Math.min(canvasH - 6, (totalCapHit / 1e6) * dynamicPxPerM);
  const capLineY = (DYN_CAP / 1e6) * dynamicPxPerM;

  useEffect(() => { rRef.current = roster; }, [roster]);
  useEffect(() => { dcRef.current = deadCapDetails; }, [deadCapDetails]);
  useEffect(() => { spRef.current = speed; }, [speed]);
  useEffect(() => { csRef.current = currentSeason; }, [currentSeason]);
  useEffect(() => { dpRef.current = draftPicks; }, [draftPicks]);

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
    try { const c = getCtx(); const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, c.currentTime); g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur + 0.01); } catch (e) {}
  };
  const playSuccess = () => { playTone(523); setTimeout(() => playTone(659), 100); setTimeout(() => playTone(784), 200); };
  const playEpic = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.05), i * 100)); };
  const playError = () => { playTone(200, 0.15, 'square', 0.05); setTimeout(() => playTone(180, 0.2, 'square', 0.05), 100); };
  const playRelease = () => { playTone(600, 0.15, 'sine', 0.05); setTimeout(() => playTone(400, 0.15, 'sine', 0.04), 100); setTimeout(() => playTone(250, 0.3, 'sine', 0.03), 200); };
  const playBuyout = () => { playTone(330, 0.6, 'sine', 0.05); setTimeout(() => playTone(494, 0.8, 'sine', 0.07), 40); };
  const playInflate = () => { playTone(400, 0.15, 'triangle', 0.05); setTimeout(() => playTone(600, 0.2, 'triangle', 0.06), 100); setTimeout(() => playTone(800, 0.25, 'triangle', 0.07), 200); };

  useEffect(() => {
    if (phase !== 'manage' || speed === 0 || showDraft || showSummary) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } return; }
    timerRef.current = setInterval(() => { setCurrentSeason(prev => { const next = prev + (TICK / 1000) / SEC_PER_SEASON * spRef.current; csRef.current = next; return next; }); }, TICK);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase, speed, showDraft, showSummary]);

  useEffect(() => {
    const fl = Math.floor(currentSeason);
    if (fl > lastBRef.current && phase === 'manage' && speed > 0 && !showDraft && !showSummary) { lastBRef.current = fl; handleSeasonBoundary(fl); }
  }, [currentSeason, phase, speed, showDraft, showSummary]);

  useEffect(() => {
    if (contRef.current && phase === 'manage' && !userScrolling) {
      isProgrammaticScroll.current = true;
      contRef.current.scrollLeft = Math.max(0, (sn - 1) * seasonW);
      requestAnimationFrame(() => { isProgrammaticScroll.current = false; });
    }
  }, [sn, phase, userScrolling, seasonW]);

  const handleUserInteract = useCallback(() => { if (isProgrammaticScroll.current) return; setUserScrolling(true); if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); }, []);
  const handleUserRelease = useCallback(() => { if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); scrollTimeoutRef.current = setTimeout(() => { setUserScrolling(false); }, 3000); }, []);
  const handleDragStart = useCallback((e) => { if (e.button !== 0 || !contRef.current) return; dragRef.current = { active: true, startX: e.clientX, scrollStart: contRef.current.scrollLeft }; handleUserInteract(); }, [handleUserInteract]);
  const handleDragMove = useCallback((e) => { if (!dragRef.current.active || !contRef.current) return; contRef.current.scrollLeft = dragRef.current.scrollStart - (e.clientX - dragRef.current.startX); }, []);
  const handleDragEnd = useCallback(() => { if (!dragRef.current.active) return; dragRef.current.active = false; handleUserRelease(); }, [handleUserRelease]);

  useEffect(() => {
    const move = (e) => handleDragMove(e); const up = () => handleDragEnd();
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [handleDragMove, handleDragEnd]);

  useEffect(() => {
    const handler = (e) => { if (e.code === 'Space' && phase === 'manage' && !showDraft && !signingPlayer && !contextMenu) { e.preventDefault(); setSpeed(s => s === 0 ? 1 : 0); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [phase, showDraft, signingPlayer, contextMenu]);

  function doReroll() {
    playClickSound();
    const newRoster = genRoster().map(p => ({ ...p, signedSeason: 1, contractEndSeason: 1 + p.contractYears, originalContractYears: p.contractYears }));
    setRoster(newRoster); setFreeAgents(genFA(8)); setDeadCapDetails([]); setDraftPicks(genDraftPicks());
    setTaxHistory([]); setMleUsed(false); setFaSignedThisSeason(0); setHardCapped(false); setContextMenu(null); setAnimatingStrips({});
    setCurrentSeason(1.0); csRef.current = 1.0; lastBRef.current = 1; setSpeed(0); setPhase('reroll');
  }
  function startGame() { playClickSound(); setSpeed(1); setPhase('manage'); }

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
      const orig = curDC.find(o =>
        o.name === d.name ||
        o.name?.replace(' (B/O)', '') === d.name?.replace(' (B/O)', '')
      );
      return {
        ...d,
        id: d.id || orig?.id || ('dc_' + Date.now() + '_' + Math.random()),
        signedSeason: d.signedSeason || orig?.signedSeason || 1,
        contractEndSeason: d.contractEndSeason || orig?.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || 1),
      };
    });
    setDeadCapDetails(preservedDC);
    setTaxHistory(prev => [...prev, curCapHit > DYN_TAX]);
    setMleUsed(false); setFaSignedThisSeason(0); setHardCapped(false); setContextMenu(null);
    const survival = checkSurvival(result.surviving, newSn + 1, []);
    if (!survival.alive) { playError(); setPhase('gameOver'); return; }
    if (record.gmBonus > 0) addToast('success', '🏀', `S${newSn - 1}: ${record.wins}W-${record.losses}L`, `${record.result} +${record.gmBonus}`, 4000);
    else addToast('info', '🏀', `S${newSn - 1}: ${record.wins}W-${record.losses}L`, record.result, 3000);
    setShowSummary(true);
  }

  function handleSummaryContinue() {
    setShowSummary(false);
    const year1 = dpRef.current.filter(pk => pk.year === 1).length;
    setDraftProspects(genDraft(Math.max(year1, 5))); setPicksLeft(year1);
    if (year1 > 0) setShowDraft(true); else { setSpeed(1); refreshFAInternal(); }
  }
  function refreshFAInternal() { const space = Math.max(0, DYN_CAP - calcCapHit(rRef.current, dcRef.current.reduce((s, d) => s + d.amount, 0))); setFreeAgents(genFA(space > 20e6 ? 12 : space > 10e6 ? 10 : 8)); }

  function handleDraft(prospect) {
    playClickSound(); playSuccess(); const s = Math.floor(currentSeason);
    const signed = { ...prospect, signedSeason: s, contractEndSeason: s + prospect.contractYears, originalContractYears: prospect.contractYears, faStatus: 'None', source: 'draft' };
    setRoster(r => [...r, signed]); setDraftProspects(dp => dp.filter(p => p.id !== prospect.id)); setPicksLeft(p => p - 1);
    setAnimatingStrips(prev => ({ ...prev, [prospect.id]: 'born' }));
    setTimeout(() => { setAnimatingStrips(prev => { const n = { ...prev }; delete n[prospect.id]; return n; }); }, 800);
    addToast('success', '🏀', `Draft: ${prospect.name}`, `R${prospect.rating} · $${(prospect.salary / 1e6).toFixed(1)}M`, 3000);
  }
  function handleDraftSkip() { playClickSound(); setPicksLeft(0); setDraftProspects([]); }
  function handleDraftComplete() {
    playClickSound(); setShowDraft(false);
    setDraftPicks(picks => { const u = picks.map(pk => ({ ...pk, year: pk.year - 1 })).filter(pk => pk.year >= 1); const my = u.length > 0 ? Math.max(...u.map(pk => pk.year)) : 0; u.push({ id: 'np_' + Date.now(), year: my + 1, round: 1, own: true }); if (Math.random() > 0.5) u.push({ id: 'np2_' + Date.now(), year: my + 1, round: 2, own: true }); return u; });
    refreshFAInternal(); setSpeed(1); playEpic(); addToast('success', '➡️', `SEASON {Math.floor(currentSeason)}`, '新シーズン開始！', 3000);
  }

  function handleStripContextMenu(e, player) { e.preventDefault(); e.stopPropagation(); playClickSound(); setSpeed(0); setContextMenu({ x: e.clientX, y: e.clientY, player }); }
  function closeContextMenu() { setContextMenu(null); setSpeed(1); }
  function handleWaive(player) {
    playClickSound(); setAnimatingStrips(prev => ({ ...prev, [player.id]: 'dissolve' }));
    setTimeout(() => {
      setDeadCapDetails(prev => [...prev, { id: 'dc_' + player.id + '_' + Date.now(), name: player.name, amount: player.salary, yearsLeft: player.contractYears, contractYears: player.contractYears, signedSeason: player.signedSeason, contractEndSeason: player.contractEndSeason, type: 'Waive' }]);
      setRoster(r => r.filter(p => p.id !== player.id)); setContextMenu(null); playRelease();
      addToast('warning', '💀', `Waive: ${player.name}`, `$$$${(player.salary / 1e6).toFixed(1)}M × ${player.contractYears}yr DC`, 3500);
      setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
    }, 900);
  }
  function handleBuyout(player) {
    playClickSound(); const chance = Math.max(5, 100 - player.rating);
    if (Math.random() * 100 < chance) {
      const pct = 50 + Math.floor(Math.random() * 21); const dead = Math.floor(player.salary * pct / 100);
      setAnimatingStrips(prev => ({ ...prev, [player.id]: 'shrink' }));
      setDeadCapDetails(prev => [...prev, { id: 'dc_' + player.id + '_' + Date.now(), name: player.name + ' (B/O)', amount: dead, yearsLeft: player.contractYears, contractYears: player.contractYears, signedSeason: player.signedSeason, contractEndSeason: player.contractEndSeason, type: 'Buyout' }]);
      setRoster(r => r.filter(p => p.id !== player.id)); setContextMenu(null); playBuyout();
      addToast('success', '🤝', `Buyout: ${player.name}`, `${pct}%に軽減`, 3500);
      setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
    } else { playError(); addToast('warning', '❌', 'Buyout拒否', `${player.name} (${chance}%)`, 3000); }
  }
  function handleStretch(player) {
    playClickSound(); setAnimatingStrips(prev => ({ ...prev, [player.id]: 'stretch' }));
    setTimeout(() => {
      const curS = Math.floor(currentSeason); const newYears = player.contractYears * 2 + 1; const newSal = Math.floor(player.salary * player.contractYears / newYears);
      setRoster(r => r.map(p => p.id !== player.id ? p : { ...p, salary: newSal, contractYears: newYears, contractEndSeason: curS + newYears }));
      setContextMenu(null); playInflate();
      addToast('info', '⏳', `Stretch: ${player.name}`, `${newYears}yr @ $${(newSal / 1e6).toFixed(1)}M`, 3500);
      setTimeout(() => setSpeed(1), 500);
    }, 1200);
  }
  function handleSignRequest(player) { playClickSound(); setSpeed(0); setSigningPlayer(player); }
  function handleConfirmSign(years, useMLE) {
    const p = signingPlayer; const check = canSignFA(p, years, totalCapHit, faSignedThisSeason);
    if (!check.allowed) { playError(); addToast('warning', '❌', '契約不可', check.reason); return; }
    let sal = adjustSalaryForYears(p.salary, years);
    if (useMLE && mleAmount > 0 && !mleUsed) sal = Math.min(sal, mleAmount);
    if (totalCapHit + sal > DYN_APRON2) { playError(); addToast('warning', '❌', '第2エプロン超過'); return; }
    const s = Math.floor(currentSeason);
    const signed = { ...p, salary: sal, contractYears: years, signedSeason: s, contractEndSeason: s + years, originalContractYears: years, faStatus: 'None', source: 'fa', hasOption: false, optionType: null };
    setFreeAgents(fa => fa.filter(x => x.id !== p.id)); setRoster(r => [...r, signed]); setFaSignedThisSeason(c => c + 1);
    if (useMLE) { setMleUsed(true); if (totalCapHit > DYN_CAP) setHardCapped(true); }
    setAnimatingStrips(prev => ({ ...prev, [p.id]: 'born' }));
    setTimeout(() => { setAnimatingStrips(prev => { const n = { ...prev }; delete n[p.id]; return n; }); }, 800);
    playSuccess(); addToast('success', '✍️', `{p.name} 契約`, `R${p.rating} · $$$${(sal / 1e6).toFixed(1)}M/yr`, 3000);
    setSigningPlayer(null); setSpeed(1);
  }

  const SpeedBtn = ({ v, label }) => (
    <button onClick={() => { playClickSound(); setSpeed(v); }}
      className={'px-1.5 py-px rounded text-[0.5rem] font-bold transition-all border ' +
        (speed === v ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-stone-900/80 border-stone-800 text-stone-500 hover:text-stone-300')}
      style={mono}>{label}</button>
  );

  /* ═══ REROLL ═══ */
  if (phase === 'reroll') {
    const rr = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
    const rc = calcCapHit(roster, 0);
    const mps = Math.min(0.5, 300 / canvasH);
    return (
      <div className="wt-grain min-h-screen bg-[#060910] text-white antialiased flex flex-col" style={mono}>
        {CSS_BLOCK}<Toast toasts={toasts} />
        <div className="px-4 py-2 flex items-center gap-3 shrink-0 border-b border-white/[0.04]">
          <button onClick={() => { playClickSound(); onBack(); }} className="text-stone-600 hover:text-stone-300 text-sm px-1.5 py-0.5 rounded hover:bg-stone-800/50">🏠</button>
          <h1 className="text-lg font-extrabold tracking-wider text-cyan-400" style={display}>WATER TOWER</h1>
        </div>
        <div className="flex-1 flex flex-col items-center px-4 py-4 gap-4 overflow-y-auto">
          <div className="text-center"><h2 className="text-xl font-extrabold text-white" style={display}>チームを選択</h2><p className="text-[0.6rem] text-stone-500 mt-0.5">気に入るロスターをリロール</p></div>
          <div className="flex items-center gap-5 bg-[#0c1018] border border-white/[0.04] rounded-lg px-5 py-2 text-[0.65rem]" style={mono}>
            <span>Rating <span className="text-white font-bold text-base">{rr}</span></span>
            <span className="wt-dv" />
            <span>Cap <span className={'font-bold text-base ' + (rc <= DYN_CAP ? 'text-cyan-400' : 'text-red-400')}>${(rc / 1e6).toFixed(1)}M</span></span>
            <span className="wt-dv" />
            <span>{roster.length}人</span>
            <span className="wt-dv" />
            <span>Line <span className="text-amber-400 font-bold">380</span></span>
          </div>
          <div className="flex gap-3 w-full max-w-5xl">
            <div className="flex-1 bg-[#0c1018] border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="px-3 py-1 border-b border-white/[0.04]"><h3 className="wt-sl">ロスター</h3></div>
              <div className="max-h-[400px] overflow-y-auto wt-scroll">
                <table className="w-full" style={mono}>
                  <thead className="sticky top-0 bg-[#0c1018]"><tr className="text-stone-600 text-[0.55rem]"><th className="text-left px-3 py-1.5">Player</th><th className="text-center px-1.5 py-1.5">Pos</th><th className="text-center px-1.5 py-1.5">Rtg</th><th className="text-center px-1.5 py-1.5">Age</th><th className="text-right px-3 py-1.5">Salary</th><th className="text-right px-3 py-1.5">Ctr</th></tr></thead>
                  <tbody>{roster.map((p, i) => { const tier = getEffTier(p.rating, p.salary); return (
                    <tr key={p.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]" style={{ animation: `twIn 0.3s ease ${i * 40}ms both` }}>
                      <td className="px-3 py-1.5"><span className="text-white font-semibold text-[0.65rem]">{p.name}</span></td>
                      <td className="text-center px-1.5 py-1.5"><span className="text-[0.5rem] bg-stone-800/80 text-stone-400 px-0.5 rounded">{p.position}</span></td>
                      <td className="text-center px-1.5 py-1.5"><span className="font-bold text-[0.65rem]" style={{ color: tier.color }}>{p.rating}</span></td>
                      <td className="text-center px-1.5 py-1.5 text-stone-500 text-[0.6rem]">{p.age}</td>
                      <td className="text-right px-3 py-1.5 text-stone-300 text-[0.6rem]">${(p.salary / 1e6).toFixed(1)}M</td>
                      <td className="text-right px-3 py-1.5 text-stone-600 text-[0.6rem]">{p.contractYears}yr</td>
                    </tr>); })}</tbody>
                </table>
              </div>
            </div>
            <div className="w-44 shrink-0 space-y-2">
              <div className="bg-[#0a0e16] border border-white/[0.04] rounded-lg p-2.5 h-[260px]">
                <div className="wt-sl mb-1">プレビュー</div>
                <div className="relative w-full overflow-hidden rounded" style={{ height: 'calc(100% - 14px)' }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-cyan-950/20 transition-all" style={{ height: waterH * mps }} />
                  <WaterWave bottom={waterH * mps} />
                  <div className="absolute left-0 right-0 border-t border-dashed border-amber-500/30 tw-pulse" style={{ bottom: 380 * dynamicPxPerM * mps }}>
                    <span className="absolute right-0.5 -top-3 text-[0.45rem] text-amber-400" style={mono}>R380</span>
                  </div>
                  {stacked.filter(s => !s.isDC).map((item, i) => { const tier = item.tier || getEffTier(item.rating, item.salary); return <div key={item.id} className="absolute rounded-sm" style={{ left: 8 + i * 36, width: 30, bottom: item.sBot * mps, height: Math.max(4, item.sH * mps), borderLeft: `2px solid ${tier.color}`, backgroundColor: `${tier.color}18`, animation: `twIn 0.3s ease ${i * 40}ms both` }} />; })}
                </div>
              </div>
              <div className="bg-[#0a0e16] border border-white/[0.04] rounded-lg p-2.5 space-y-1.5">
                <h4 className="wt-sl">Tier</h4>
                {['S', 'A', 'B', 'C', 'D'].map(t => { const count = roster.filter(p => getEffTier(p.rating, p.salary).label === t).length; const colors = { S: '#facc15', A: '#22d3ee', B: '#34d399', C: '#fb923c', D: '#ef4444' }; return (
                  <div key={t} className="flex items-center gap-1.5">
                    <span className="font-bold text-[0.55rem] w-2.5 shrink-0" style={{ color: colors[t] }}>{t}</span>
                    <div className="flex-1 bg-stone-900 rounded-full h-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${roster.length > 0 ? Math.min(100, count / roster.length * 100) : 0}%`, background: colors[t] }} /></div>
                    <span className="text-[0.5rem] text-stone-600 w-2.5 text-right" style={mono}>{count}</span>
                  </div>); })}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-bold px-6 py-2 rounded-lg text-[0.65rem] hover:bg-stone-800" style={mono}>🔄 REROLL</button>
            <button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-bold px-8 py-2 rounded-lg text-[0.65rem] shadow-lg shadow-cyan-900/20" style={mono}>START ▶</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-600 font-bold px-4 py-2 rounded-lg text-[0.65rem] hover:text-stone-300" style={mono}>← 戻る</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ MANAGE ═══ */
  if (phase === 'manage') {
    return (
      <div className="wt-grain h-screen bg-[#060910] text-white antialiased flex flex-col overflow-hidden select-none" style={mono}>
        {CSS_BLOCK}<Toast toasts={toasts} />

        {signingPlayer && <SignModal player={signingPlayer} totalCapHit={totalCapHit} faSigned={faSignedThisSeason} faLimit={faLimit} mleUsed={mleUsed} mleAmount={mleAmount} hardCapped={hardCapped} onConfirm={handleConfirmSign} onCancel={() => { setSigningPlayer(null); setSpeed(1); }} />}

        {contextMenu && (<>
          <div className="fixed inset-0 z-[200]" onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} />
          <div className="fixed z-[201] bg-[#0e1218] border border-stone-700/60 rounded-lg shadow-2xl py-0.5 min-w-[130px]"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 150), top: Math.min(contextMenu.y, window.innerHeight - 150), fontSize: '0.55rem' }}>
            <div className="px-2 py-1 border-b border-white/[0.04]">
              <div className="text-white font-semibold">{contextMenu.player.name}</div>
              <div className="text-stone-500 text-[0.45rem]" style={mono}>{contextMenu.player.position} · R{contextMenu.player.rating} · ${(contextMenu.player.salary / 1e6).toFixed(1)}M</div>
            </div>
            <button onClick={() => handleWaive(contextMenu.player)} className="w-full text-left px-2 py-1 text-amber-300 hover:bg-amber-950/40 flex items-center gap-1">💀 Waive</button>
            {contextMenu.player.contractYears > 1 && <button onClick={() => handleBuyout(contextMenu.player)} className="w-full text-left px-2 py-1 text-purple-300 hover:bg-purple-950/40 flex items-center gap-1">🤝 Buyout</button>}
            {contextMenu.player.contractYears > 1 && <button onClick={() => handleStretch(contextMenu.player)} className="w-full text-left px-2 py-1 text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1">⏳ Stretch</button>}
          </div>
        </>)}

        {showSummary && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#0e1218] border border-stone-700/50 rounded-xl p-4 w-full max-w-[280px] shadow-2xl space-y-2.5">
              <div className="text-center">
                <span className="text-[0.5rem] font-bold text-cyan-400 uppercase tracking-[0.15em]" style={display}>Season {sn - 1} Report</span>
                {seasonRecord && <div><div className="text-xl font-extrabold" style={display}>{seasonRecord.wins}W-{seasonRecord.losses}L</div><div className={'text-xs font-bold ' + (seasonRecord.gmBonus > 0 ? 'text-emerald-400' : 'text-stone-500')} style={mono}>{seasonRecord.result} {seasonRecord.gmBonus > 0 && `+${seasonRecord.gmBonus}`}</div></div>}
              </div>
              <div className="rounded-lg p-2 max-h-32 overflow-y-auto wt-scroll space-y-px" style={{ background: '#080b10' }}>
                {summaries.map((s, i) => (
                  <div key={i} className="flex justify-between text-[0.55rem] py-0.5 border-b border-white/[0.03] last:border-0">
                    <span className="text-white">{s.name}</span>
                    <span style={mono}><span className="text-stone-500">{s.oldRating}</span><span className="text-stone-700 mx-0.5">→</span><span className={s.change <= -3 ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>{s.newRating || 'RET'}</span>{s.change !== 'RETIRE' && <span className="text-red-500 ml-0.5 text-[0.45rem]">({s.change})</span>}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleSummaryContinue} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-bold py-1.5 rounded-lg text-[0.55rem]" style={mono}>Continue ▶</button>
            </div>
          </div>
        )}

        {showDraft && <DraftOverlay prospects={draftProspects} picksLeft={picksLeft} onDraft={handleDraft} onSkip={handleDraftSkip} onContinue={handleDraftComplete} season={sn} />}

        {/* ═══ SINGLE HEADER LINE — everything merged ═══ */}
        <header className="px-2 flex items-center gap-2 border-b border-white/[0.04] shrink-0 bg-[#080b12]/80" style={{ height: 20 }}>
          <button onClick={() => { playClickSound(); setSpeed(0); onBack(); }} className="text-stone-600 hover:text-stone-300 text-[0.55rem] px-0.5">🏠</button>
          <span className="text-[0.55rem] font-extrabold tracking-wider text-cyan-400" style={display}>WATER TOWER</span>
          <div className="wt-dv" />
          <span className="text-[0.6rem] font-bold text-white" style={mono}>S{sn}</span>
          <span className="text-[0.45rem] text-stone-600" style={mono}>({(currentSeason % 1 * 100).toFixed(0)}%)</span>
          <div className="wt-dv" />
          <div className="flex items-center gap-px"><SpeedBtn v={0} label="⏸" /><SpeedBtn v={1} label="1x" /><SpeedBtn v={2} label="2x" /><SpeedBtn v={3} label="3x" /></div>
          <div className="wt-dv" />
          <span className="wt-sl">GM</span>
          <span className="text-[0.55rem] font-bold text-amber-400" style={mono}>{gmScore}</span>
          <div className="wt-dv" />
          <span className="wt-sl">★</span>
          <span className={'text-[0.55rem] font-bold ' + (totalRating >= ratingLine ? 'text-emerald-400' : 'text-red-400')} style={mono}>{totalRating}<span className="text-stone-700">/{ratingLine}</span></span>
          <div className="wt-dv" />
          <span className="wt-sl">$</span>
          <span className={'text-[0.55rem] font-bold ' + (totalCapHit <= DYN_CAP ? 'text-cyan-400' : 'text-amber-400')} style={mono}>${(totalCapHit / 1e6).toFixed(1)}M<span className="text-stone-700">/${(DYN_CAP / 1e6).toFixed(0)}M</span></span>
          <div className="wt-dv" />
          <span className="text-white font-bold text-[0.55rem]" style={mono}>{roster.length}人</span>
          <div className="wt-dv" />
          <span className="wt-sl">FA</span>
          <span className="text-white font-bold text-[0.55rem]" style={mono}>{faLimit - faSignedThisSeason}/{faLimit}</span>
          {dc > 0 && <><div className="wt-dv" /><span className="text-red-400 font-bold text-[0.5rem]" style={mono}>DC ${(dc / 1e6).toFixed(1)}M</span></>}
          <div className="ml-auto" />
          <span className="text-stone-700 text-[0.35rem]" style={mono}>Space:停止 右Click:操作</span>
          <button onClick={() => { playClickSound(); toggleBGM(); }} className={'text-[0.55rem] px-0.5 ' + (isBgmOn ? 'text-emerald-400' : 'text-stone-600')}>{isBgmOn ? '🔊' : '🔇'}</button>
        </header>

        {/* ═══ MAIN — canvas + sidebar ═══ */}
        <main className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex min-h-0">
            {/* Label col */}
            <div style={{ width: LABEL_COL_W }} className="shrink-0 relative bg-[#0a0e16] border-r border-white/[0.03] overflow-hidden">
              <div className="absolute left-0 right-0" style={{ bottom: ratingLine * dynamicPxPerM }}>
                <div className="border-t border-dashed border-amber-500/25 tw-pulse" />
                <span className="absolute left-0.5 -top-2.5 text-[0.4rem] font-bold text-amber-400 bg-amber-950/50 px-0.5 rounded whitespace-nowrap" style={mono}>★{ratingLine}</span>
              </div>
              <div className="absolute left-0 right-0" style={{ bottom: capLineY }}>
                <div className="border-t border-dashed opacity-20" style={{ borderColor: '#dc2626' }} />
                <span className="absolute left-0.5 -top-2.5 text-[0.4rem] text-red-400 bg-[#0a0e16]/80 px-0.5 rounded whitespace-nowrap" style={mono}>${(DYN_CAP / 1e6).toFixed(0)}M</span>
              </div>
            </div>

            {/* Canvas */}
            <div ref={contRef} className="flex-1 overflow-x-auto overflow-y-hidden wt-scroll"
              style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
              onWheel={handleUserInteract} onMouseDown={handleDragStart} onTouchStart={handleUserInteract} onTouchEnd={handleUserRelease} onContextMenu={e => e.preventDefault()}>
              <div style={{ width: tlWidth, height: canvasH, position: 'relative', background: '#0a0e16', userSelect: 'none', paddingLeft: 4, paddingRight: 4, overflow: 'hidden' }}>

                {/* Season dividers + labels (drawn on canvas) */}
                {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                  <React.Fragment key={s}>
                    <div className="absolute top-0 bottom-0" style={{ left: (s - 1) * seasonW, width: 1, background: 'rgba(255,255,255,0.02)' }} />
                    <div className="absolute pointer-events-none" style={{ left: (s - 1) * seasonW, top: 1, width: seasonW, textAlign: 'center', fontSize: '0.45rem', color: s === sn ? '#22d3ee' : '#22262e', fontWeight: s === sn ? 800 : 400, ...mono }}>S{s}</div>
                  </React.Fragment>
                ))}

                {/* Past overlay */}
                <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 0, width: Math.max(0, (currentSeason - 1) * seasonW), background: 'rgba(0,0,0,0.15)', zIndex: 4 }} />

                {/* Water */}
                <div className="absolute bottom-0 left-0 right-0 transition-all" style={{ height: waterH, background: 'linear-gradient(to top, rgba(6,80,130,0.22), rgba(6,120,180,0.02))', zIndex: 1 }} />
                <WaterWave bottom={waterH} />

                {/* Cap line */}
                <div className="absolute left-0 right-0 border-t border-dashed opacity-20 pointer-events-none" style={{ bottom: capLineY, borderColor: '#dc2626', zIndex: 3 }} />
                {/* Rating line */}
                <div className="absolute left-0 right-0 border-t border-dashed border-amber-500/20 tw-pulse pointer-events-none" style={{ bottom: ratingLine * dynamicPxPerM, zIndex: 3 }} />

                {/* Strips */}
                {stacked.map(item => {
                  const endSn = item.contractEndSeason || (item.signedSeason || 1) + (item.contractYears || item.yearsLeft || 1);
                  const startSn = Math.max(currentSeason, item.signedSeason || 1);
                  const left = (startSn - 1) * seasonW + 6;
                  const w = Math.max(0, (endSn - startSn) * seasonW - 6);
                  const tier = item.tier || getEffTier(item.rating, item.salary);
                  const isCtxTarget = contextMenu && contextMenu.player.id === item.id;
                  const animClass = animatingStrips[item.id] === 'dissolve' ? ' strip-dissolve' : animatingStrips[item.id] === 'stretch' ? ' strip-stretch' : animatingStrips[item.id] === 'shrink' ? ' strip-shrink' : animatingStrips[item.id] === 'born' ? ' strip-born' : '';
                  if (w <= 0) return null;
                  return (
                    <div key={item.id} onContextMenu={e => { if (!item.isDC) handleStripContextMenu(e, item); }}
                      className={'absolute transition-all duration-500' + (item.isDC ? '' : ' cursor-pointer') + (isCtxTarget ? ' tw-glow' : '') + animClass}
                      style={{
                        left, width: w, bottom: item.sBot, height: item.sH, borderRadius: 2,
                        borderLeft: `3px solid ${item.isDC ? '#ef4444' : tier.color}`,
                        backgroundColor: isCtxTarget ? `${tier.color}25` : item.isDC ? 'rgba(239,68,68,0.1)' : `${tier.color}0d`,
                        opacity: item.isDC ? 0.6 : 1,
                        backgroundImage: item.isDC ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(239,68,68,0.06) 5px, rgba(239,68,68,0.06) 10px)' : 'none',
                        zIndex: isCtxTarget ? 10 : item.isDC ? 1 : 2, userSelect: 'none',
                      }}>
                      <div className="flex items-center justify-between px-1.5 h-full overflow-hidden">
                        <div className="flex items-center gap-0.5 min-w-0">
                          <span className="text-white font-semibold truncate" style={{ fontSize: item.sH < 10 ? '0.35rem' : item.sH < 16 ? '0.4rem' : '0.5rem' }}>{item.name}</span>
                          {!item.isDC && <span className="text-[0.35rem] bg-stone-800/80 text-stone-400 px-0.5 rounded shrink-0" style={mono}>{item.position}</span>}
                          {item.isDC && <span className="text-[0.35rem] bg-red-950/80 text-red-400 px-0.5 rounded shrink-0" style={mono}>DC</span>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {!item.isDC && <span className="font-bold" style={{ color: tier.color, fontSize: item.sH < 10 ? '0.35rem' : '0.45rem', ...mono }}>{item.rating}</span>}
                          <span className="text-stone-500" style={{ fontSize: '0.35rem', ...mono }}>${(item.effSal / 1e6).toFixed(1)}M</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Cursor */}
                <div className="absolute top-0 bottom-0 tw-glow pointer-events-none" style={{ left: (currentSeason - 1) * seasonW - 1, width: 3, background: 'linear-gradient(to bottom, #22d3ee, #0891b2)', zIndex: 8 }} />
              </div>
            </div>
          </div>

          {/* ═══ SIDEBAR — compact ═══ */}
          <div style={{ width: SIDEBAR_W }} className="shrink-0 flex flex-col border-l border-white/[0.04] bg-[#080b12] overflow-hidden">
            {totalRating < ratingLine && (
              <div className="bg-red-950/30 border-b border-red-900/30 px-1.5 py-0.5 animate-pulse shrink-0">
                <div className="text-red-400 font-bold text-[0.45rem]" style={mono}>🚨 不足 {ratingLine - totalRating}pt</div>
              </div>
            )}

            <div className="px-1.5 py-1 space-y-0.5 border-b border-white/[0.03] shrink-0 text-[0.5rem]" style={mono}>
              <div className="flex justify-between"><span className="wt-sl">★ Rating</span><span className={'font-bold ' + (totalRating >= ratingLine ? 'text-emerald-400' : 'text-red-400')}>{totalRating}<span className="text-stone-700">/{ratingLine}</span></span></div>
              <div className="flex justify-between"><span className="wt-sl">$ Cap</span><span className={'font-bold ' + (totalCapHit <= DYN_CAP ? 'text-cyan-400' : 'text-red-400')}>${(totalCapHit / 1e6).toFixed(1)}M</span></div>
              {dc > 0 && <div className="flex justify-between"><span className="wt-sl text-red-500">DC</span><span className="text-red-400 font-bold">${(dc / 1e6).toFixed(1)}M</span></div>}
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center px-1.5 pt-1 pb-0.5 shrink-0">
                <h3 className="wt-sl text-cyan-400">🏪 FA市場</h3>
                <button onClick={() => { playClickSound(); refreshFAInternal(); }} className="text-[0.4rem] text-stone-600 hover:text-stone-300 bg-stone-900 px-1 rounded" style={mono}>🔄</button>
              </div>
              <div className="flex-1 overflow-y-auto wt-scroll px-1.5 pb-1 space-y-0.5">
                {freeAgents.map(p => {
                  const tier = getEffTier(p.rating, p.salary);
                  return (
                    <div key={p.id} className="bg-[#0c1018] border border-white/[0.04] rounded p-1 hover:border-white/[0.08] transition-colors">
                      <div className="flex items-center justify-between gap-0.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-semibold text-[0.5rem] truncate">{p.name}</div>
                          <div className="text-stone-500 text-[0.4rem]" style={mono}>{p.position} · ${(p.salary / 1e6).toFixed(1)}M · {p.contractYears}yr</div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className="font-bold text-[0.5rem]" style={{ color: tier.color, ...mono }}>{p.rating}</span>
                          <button onClick={() => handleSignRequest(p)} disabled={faSignedThisSeason >= faLimit}
                            className="text-[0.5rem] bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 px-1 py-px rounded font-bold hover:bg-cyan-900/60 disabled:opacity-25 disabled:cursor-not-allowed" style={mono}>＋</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {freeAgents.length === 0 && <p className="text-stone-700 text-[0.45rem] text-center py-3" style={mono}>FAなし</p>}
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
      <div className="wt-grain min-h-screen bg-[#060910] text-white antialiased flex flex-col items-center justify-center px-6" style={mono}>
        {CSS_BLOCK}
        <div className="w-full max-w-sm space-y-4 bg-[#0e1218] border border-red-900/40 rounded-xl p-6 text-center">
          <div><span className="text-[0.55rem] font-bold text-red-400 uppercase tracking-[0.15em]" style={display}>TOWER COLLAPSED</span><h2 className="text-xl font-extrabold" style={display}>タワー崩壊</h2></div>
          <div className="rounded-lg p-4" style={{ background: '#080b10' }}>
            <div className="text-[0.5rem] text-stone-600 uppercase">存続期間</div>
            <div className="text-4xl font-extrabold text-cyan-400" style={display}>{Math.max(0, sn - 1)}</div>
            <div className="text-[0.6rem] text-stone-500">シーズン</div>
            <div className="text-red-400 text-[0.5rem] mt-1.5" style={mono}>Rating {totalRating} {'<'} Required {ratingLine}</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: '#080b10' }}>
            <div className="text-[0.5rem] text-stone-600 uppercase mb-0.5">GM SCORE</div>
            <span className="text-3xl font-extrabold text-amber-400" style={display}>{gmScore}</span>
            <span className="text-xs text-stone-600 ml-1">pts</span>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={doReroll} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-bold px-5 py-2 rounded-lg text-[0.6rem]" style={mono}>TRY AGAIN 🔄</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-400 font-bold px-4 py-2 rounded-lg text-[0.6rem] hover:text-white" style={mono}>タイトルへ</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
