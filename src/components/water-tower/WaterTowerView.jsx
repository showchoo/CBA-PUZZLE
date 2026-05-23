import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getEffTier, genRoster, genFA, genDraft, genDraftPicks,
  advanceSeason, advanceDeadCap, checkSurvival,
  calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, getFALimit, calcGMScore, calcSeasonRecord,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2,
} from '../../waterTowerEngine';

/* ═══ Constants ═══ */
const SEASON_W = 600;
const MAX_PX_PER_M = 2.5;
const MIN_H_BASE = 28;
const SEC_PER_SEASON = 30;
const TICK = 50;

/* ═══ Shared Style Block ═══ */
const CSS_BLOCK = (
  <style>{`
    :root {
      --bg-deep: #060910;
      --bg-surface: #0c1018;
      --bg-card: #101520;
      --bg-elevated: #161c28;
      --border-subtle: rgba(255,255,255,0.04);
      --border-dim: rgba(255,255,255,0.07);
      --accent: #22d3ee;
      --accent-dim: rgba(34,211,238,0.12);
      --gold: #f0c040;
      --danger: #ef4444;
    }

    @keyframes twIn { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes twWave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes twPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes twGlow { 0%, 100% { box-shadow: 0 0 8px rgba(34,211,238,0.3); } 50% { box-shadow: 0 0 20px rgba(34,211,238,0.6); } }
    @keyframes stripBorn { 0% { opacity: 0; transform: scaleY(0) translateY(20px); filter: brightness(2); } 60% { opacity: 1; transform: scaleY(1.15) translateY(-4px); filter: brightness(1.5); } 80% { transform: scaleY(0.95) translateY(2px); } 100% { opacity: 1; transform: scaleY(1) translateY(0); filter: brightness(1); } }
    @keyframes stripDissolve { 0% { opacity: 1; transform: scaleY(1); filter: brightness(1); } 30% { filter: brightness(2) saturate(0.3); transform: scaleY(1.1); } 100% { opacity: 0; transform: scaleY(0.3) translateX(40px); filter: brightness(3) saturate(0); } }
    @keyframes stripStretch { 0% { filter: brightness(1); } 20% { filter: brightness(2) hue-rotate(40deg); transform: scaleX(1.3); } 50% { filter: brightness(1.8) hue-rotate(20deg); } 100% { filter: brightness(1) hue-rotate(0deg); transform: scaleX(1); } }
    @keyframes stripShrink { 0% { filter: brightness(1); } 30% { filter: brightness(2.5) saturate(0.2); transform: scaleX(0.7); } 60% { filter: brightness(2); } 100% { filter: brightness(1); transform: scaleX(1); } }

    .tw-wave { animation: twWave 4s linear infinite; }
    .tw-pulse { animation: twPulse 2s ease-in-out infinite; }
    .tw-glow { animation: twGlow 2s ease-in-out infinite; }
    .strip-born { animation: stripBorn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .strip-dissolve { animation: stripDissolve 0.9s ease-in forwards; pointer-events: none; }
    .strip-stretch { animation: stripStretch 1.2s ease-out; }
    .strip-shrink { animation: stripShrink 0.8s ease-out; }

    .wt-grain::after {
      content: '';
      position: fixed; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
      opacity: 0.35;
    }

    .wt-scroll::-webkit-scrollbar { display: none; }
    .wt-scroll { scrollbar-width: none; }

    .wt-section-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #525c6e;
    }

    .wt-divider {
      width: 1px;
      height: 24px;
      background: rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .wt-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
    }
  `}</style>
);

/* ═══ Toast ═══ */
function Toast({ toasts }) {
  return (
    <div className="fixed top-5 left-5 z-[100] space-y-3 pointer-events-none" style={{ maxWidth: 460 }}>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto" style={{ animation: 'twIn 0.4s ease forwards' }}>
          <div className={'border rounded-xl px-5 py-3.5 shadow-2xl backdrop-blur-md ' +
            (t.type === 'success' ? 'bg-emerald-950/90 border-emerald-600/40' :
             t.type === 'warning' ? 'bg-red-950/90 border-red-600/40' :
             'bg-cyan-950/90 border-cyan-600/40')}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{t.icon}</span>
              <div>
                <div className={'text-sm font-bold ' +
                  (t.type === 'success' ? 'text-emerald-400' : t.type === 'warning' ? 'text-red-400' : 'text-cyan-400')}
                  style={{ fontFamily: "'Syne', sans-serif" }}>
                  {t.title}
                </div>
                {t.msg && <div className="text-xs text-stone-400 mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{t.msg}</div>}
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
  const tier = getEffTier(player.rating, player.salary);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9998]" onClick={onCancel}>
      <div className="bg-[#0e1218] border border-stone-700/50 rounded-2xl p-8 w-full max-w-md space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: tier.color }}>{player.name}</h3>
          <div className="text-sm text-stone-400" style={{ fontFamily: "'DM Mono', monospace" }}>
            {player.position} · <span className="font-bold" style={{ color: tier.color }}>R{player.rating}</span> · Age {player.age}
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="wt-section-label block">契約年数</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(y => (
              <button key={y} onClick={() => setYears(y)}
                className={'py-2.5 rounded-lg border text-sm font-bold transition-all ' +
                  (years === y
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-900/30'
                    : 'bg-stone-900 border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-stone-300')}
                style={{ fontFamily: "'DM Mono', monospace" }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {mleAmount > 0 && !mleUsed && (
          <label className="flex items-center gap-3 text-sm text-cyan-400 cursor-pointer" style={{ fontFamily: "'DM Mono', monospace" }}>
            <input type="checkbox" checked={useMLE} onChange={e => setUseMLE(e.target.checked)} className="accent-cyan-500 w-4 h-4" />
            MLE使用 (${(Math.min(sal, mleAmount) / 1e6).toFixed(1)}M)
          </label>
        )}

        <div className="wt-card p-4 space-y-2.5" style={{ background: '#080b10' }}>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-stone-600 uppercase tracking-wider">年俸</span>
            <span className="text-white font-bold text-lg" style={{ fontFamily: "'DM Mono', monospace" }}>${(sal / 1e6).toFixed(1)}M</span>
          </div>
          <div className="h-px bg-stone-800/50" />
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-stone-600 uppercase tracking-wider">Cap後</span>
            <span className={'font-bold text-lg ' + (after <= DYN_CAP ? 'text-emerald-400' : 'text-red-400')}
              style={{ fontFamily: "'DM Mono', monospace" }}>
              ${(after / 1e6).toFixed(1)}M
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 font-bold py-3 rounded-xl text-sm hover:bg-stone-800 transition-colors"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            キャンセル
          </button>
          <button onClick={() => onConfirm(years, useMLE)} disabled={!ok}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-stone-800 disabled:text-stone-600 text-stone-950 font-bold py-3 rounded-xl text-sm transition-all"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            契約する
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

/* ═══ Draft Overlay ═══ */
function DraftOverlay({ prospects, picksLeft, onDraft, onSkip, onContinue, season }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0e1218] border border-cyan-800/40 rounded-2xl p-8 w-full max-w-2xl max-h-[75vh] overflow-y-auto shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <span className="text-sm font-bold text-cyan-400 uppercase tracking-[0.2em]"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            💧 SEASON {season} DRAFT
          </span>
          <p className="text-stone-400 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
            残りピック: <span className="text-cyan-400 font-bold">{picksLeft}</span>
          </p>
        </div>
        {picksLeft > 0 ? (
          <div className="space-y-2">
            {prospects.map((p, i) => {
              const tier = getEffTier(p.rating, p.salary);
              return (
                <div key={p.id}
                  className="bg-stone-950 border border-stone-800/60 rounded-xl p-4 flex items-center justify-between hover:border-cyan-800/60 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-stone-700 text-sm w-6 text-center shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>#{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-base truncate">{p.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-stone-800/80 text-stone-400 px-1.5 py-0.5 rounded" style={{ fontFamily: "'DM Mono', monospace" }}>{p.position}</span>
                        <span className="text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace", color: tier.color }}>R{p.rating}</span>
                        <span className="text-xs text-stone-600">Age {p.age}</span>
                        <span className="text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace", color: tier.color }}>${(p.salary / 1e6).toFixed(1)}M</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDraft(p)}
                    className="bg-cyan-950 border border-cyan-700 text-cyan-400 hover:bg-cyan-900 font-bold px-5 py-2 rounded-lg text-sm shrink-0 ml-4 transition-colors"
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    DRAFT
                  </button>
                </div>
              );
            })}
            <button onClick={onSkip}
              className="w-full bg-stone-900 border border-stone-800 text-stone-600 font-bold py-3 rounded-xl text-sm hover:text-stone-300 transition-colors mt-2"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              スキップ →
            </button>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-emerald-400 font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>✓ ドラフト完了</div>
            <button onClick={onContinue}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-bold py-4 rounded-xl text-base transition-all"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              シーズン再開 ▶
            </button>
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

  /* ▼ Font Loading */
  useEffect(() => {
    const ids = ['font-syne', 'font-dmmono'];
    const hrefs = [
      'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap',
      'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap',
    ];
    hrefs.forEach((href, i) => {
      if (!document.getElementById(ids[i])) {
        const link = document.createElement('link');
        link.id = ids[i];
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });
  }, []);

  /* ▼ Viewport tracking */
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Derived ── */
  const dc = deadCapDetails.reduce((s, d) => s + d.amount, 0);
  const totalCapHit = calcCapHit(roster, dc);
  const totalRating = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
  const faLimit = getFALimit(totalCapHit);
  const mleAmount = getMLEAmount(totalCapHit);
  const sn = Math.floor(currentSeason);
  const ratingLine = 380 + (sn - 1) * 8;
  const gmScore = calcGMScore(sn, totalRating, totalCapHit, roster);

  const availableH = viewportH - 130;
  const canvasH = Math.max(300, availableH);
  const dynamicPxPerM = Math.max(0.8, Math.min(MAX_PX_PER_M, (canvasH - 80) / Math.max(1, DYN_APRON2 / 1e6)));
  const dynamicMinH = Math.max(16, Math.min(MIN_H_BASE, canvasH / 25));

  /* ── Stacking ── */
  const allItems = [
    ...roster.map(p => ({ ...p, isDC: false, effSal: p.salary })),
    ...deadCapDetails.map(d => ({
      id: d.id || ('dc_' + Date.now() + '_' + Math.random()),
      name: d.name, salary: d.amount, effSal: d.amount, isDC: true,
      rating: 0, position: '', contractYears: d.contractYears || d.yearsLeft || 1,
      yearsLeft: d.yearsLeft || d.contractYears || 1,
      signedSeason: d.signedSeason || 1,
      contractEndSeason: d.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1),
      tier: { color: '#ef4444', label: 'DC' },
    })),
  ].sort((a, b) => b.effSal - a.effSal);

  let cumH = 0;
  const stacked = allItems.map(item => {
    const h = Math.max(dynamicMinH, (item.effSal / 1e6) * dynamicPxPerM);
    const b = cumH;
    cumH += h + 2;
    return { ...item, sBot: b, sH: h };
  });

  const maxSn = Math.max(
    ...roster.map(p => (p.signedSeason || 1) + p.contractYears + 1),
    ...deadCapDetails.map(d => (d.signedSeason || 1) + (d.yearsLeft || d.contractYears || 1) + 1),
    sn + 2
  );
  const tlWidth = maxSn * SEASON_W;
  const waterH = Math.min(canvasH - 10, (totalCapHit / 1e6) * dynamicPxPerM);
  const capLineY = (DYN_CAP / 1e6) * dynamicPxPerM;

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
    if (contRef.current && phase === 'manage' && !userScrolling) {
      isProgrammaticScroll.current = true;
      const t = (currentSeason - 1) * SEASON_W - contRef.current.clientWidth / 2 + SEASON_W / 2;
      contRef.current.scrollLeft = Math.max(0, t);
      requestAnimationFrame(() => { isProgrammaticScroll.current = false; });
    }
  }, [currentSeason, phase, userScrolling]);

  /* ═══ Scroll / Drag ═══ */
  const handleUserInteract = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    setUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  }, []);

  const handleUserRelease = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { setUserScrolling(false); }, 3000);
  }, []);

  const handleDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    if (!contRef.current) return;
    dragRef.current = { active: true, startX: e.clientX, scrollStart: contRef.current.scrollLeft };
    handleUserInteract();
  }, [handleUserInteract]);

  const handleDragMove = useCallback((e) => {
    if (!dragRef.current.active || !contRef.current) return;
    contRef.current.scrollLeft = dragRef.current.scrollStart - (e.clientX - dragRef.current.startX);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    handleUserRelease();
  }, [handleUserRelease]);

  useEffect(() => {
    const move = (e) => handleDragMove(e);
    const up = () => handleDragEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [handleDragMove, handleDragEnd]);

  /* ═══ Keyboard ═══ */
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && phase === 'manage' && !showDraft && !signingPlayer && !contextMenu) {
        e.preventDefault();
        setSpeed(s => s === 0 ? 1 : 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, showDraft, signingPlayer, contextMenu]);

  /* ═══ Actions ═══ */
  function doReroll() {
    playClickSound();
    const newRoster = genRoster().map(p => ({ ...p, signedSeason: 1, contractEndSeason: 1 + p.contractYears, originalContractYears: p.contractYears }));
    setRoster(newRoster);
    setFreeAgents(genFA(8));
    setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]); setMleUsed(false); setFaSignedThisSeason(0);
    setHardCapped(false); setContextMenu(null); setAnimatingStrips({});
    setCurrentSeason(1.0); csRef.current = 1.0; lastBRef.current = 1;
    setSpeed(0); setPhase('reroll');
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
      const orig = curDC.find(o => o.name === d.name || o.name?.replace(' (B/O)', '') === d.name?.replace(' (B/O)', ''));
      return { ...d, id: d.id || orig?.id || ('dc_lost_' + Date.now() + '_' + Math.random()), signedSeason: d.signedSeason || orig?.signedSeason || 1, contractEndSeason: d.contractEndSeason || orig?.contractEndSeason || (d.signedSeason || 1) + (d.yearsLeft || 1) };
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
    setAnimatingStrips(prev => ({ ...prev, [prospect.id]: 'born' }));
    setTimeout(() => { setAnimatingStrips(prev => { const next = { ...prev }; delete next[prospect.id]; return next; }); }, 800);
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

  /* ═══ Context Menu ═══ */
  function handleStripContextMenu(e, player) {
    e.preventDefault(); e.stopPropagation(); playClickSound(); setSpeed(0);
    setContextMenu({ x: e.clientX, y: e.clientY, player });
  }

  function closeContextMenu() { setContextMenu(null); setSpeed(1); }

  function handleWaive(player) {
    playClickSound();
    setAnimatingStrips(prev => ({ ...prev, [player.id]: 'dissolve' }));
    setTimeout(() => {
      setDeadCapDetails(prev => [...prev, { id: 'dc_' + player.id + '_' + Date.now(), name: player.name, amount: player.salary, yearsLeft: player.contractYears, contractYears: player.contractYears, signedSeason: player.signedSeason, contractEndSeason: player.contractEndSeason, type: 'Waive' }]);
      setRoster(r => r.filter(p => p.id !== player.id));
      setContextMenu(null);
      playRelease();
      addToast('warning', '💀', `Waive: ${player.name}`, `$$$${(player.salary / 1e6).toFixed(1)}M × ${player.contractYears}yr Dead Cap`, 3500);
      setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
    }, 900);
  }

  function handleBuyout(player) {
    playClickSound();
    const chance = Math.max(5, 100 - player.rating);
    if (Math.random() * 100 < chance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const dead = Math.floor(player.salary * pct / 100);
      setAnimatingStrips(prev => ({ ...prev, [player.id]: 'shrink' }));
      setDeadCapDetails(prev => [...prev, { id: 'dc_' + player.id + '_' + Date.now(), name: player.name + ' (B/O)', amount: dead, yearsLeft: player.contractYears, contractYears: player.contractYears, signedSeason: player.signedSeason, contractEndSeason: player.contractEndSeason, type: 'Buyout' }]);
      setRoster(r => r.filter(p => p.id !== player.id));
      setContextMenu(null); playBuyout();
      addToast('success', '🤝', `Buyout: ${player.name}`, `${pct}%に軽減`, 3500);
      setTimeout(() => { refreshFAInternal(); setSpeed(1); }, 500);
    } else { playError(); addToast('warning', '❌', 'Buyout拒否', `${player.name} (${chance}%)`, 3000); }
  }

  function handleStretch(player) {
    playClickSound();
    setAnimatingStrips(prev => ({ ...prev, [player.id]: 'stretch' }));
    setTimeout(() => {
      const curS = Math.floor(currentSeason);
      const newYears = player.contractYears * 2 + 1;
      const newSal = Math.floor(player.salary * player.contractYears / newYears);
      setRoster(r => r.map(p => p.id !== player.id ? p : { ...p, salary: newSal, contractYears: newYears, contractEndSeason: curS + newYears }));
      setContextMenu(null); playInflate();
      addToast('info', '⏳', `Stretch: ${player.name}`, `${newYears}yr @ $${(newSal / 1e6).toFixed(1)}M`, 3500);
      setTimeout(() => setSpeed(1), 500);
    }, 1200);
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
    setAnimatingStrips(prev => ({ ...prev, [p.id]: 'born' }));
    setTimeout(() => { setAnimatingStrips(prev => { const next = { ...prev }; delete next[p.id]; return next; }); }, 800);
    playSuccess(); addToast('success', '✍️', `{p.name} 契約`, `R${p.rating} · $$$${(sal / 1e6).toFixed(1)}M/yr`, 3000);
    setSigningPlayer(null); setSpeed(1);
  }

  /* ═══ Shared UI helpers ═══ */
  const mono = { fontFamily: "'DM Mono', monospace" };
  const display = { fontFamily: "'Syne', sans-serif" };

  const SpeedBtn = ({ v, label }) => (
    <button onClick={() => { playClickSound(); setSpeed(v); }}
      className={'px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ' +
        (speed === v
          ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-950/30'
          : 'bg-stone-900/80 border-stone-800 text-stone-500 hover:text-stone-300 hover:bg-stone-800')}
      style={mono}>
      {label}
    </button>
  );

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER ═══                          */
  /* ═══════════════════════════════════════ */

  /* ═══ REROLL ═══ */
  if (phase === 'reroll') {
    const rerollRating = roster.reduce((s, p) => s + (Number(p.rating) || 0), 0);
    const rerollCapHit = calcCapHit(roster, 0);
    const miniPreviewScale = Math.min(0.5, 300 / canvasH);

    return (
      <div className="wt-grain min-h-screen bg-[#060910] text-white antialiased flex flex-col" style={{ ...mono, fontFamily: "'DM Mono', monospace" }}>
        {CSS_BLOCK}
        <Toast toasts={toasts} />

        {/* ── Header ── */}
        <div className="px-6 py-4 flex items-center gap-4 shrink-0 border-b border-white/[0.04]">
          <button onClick={() => { playClickSound(); onBack(); }}
            className="text-stone-600 hover:text-stone-300 text-base px-2.5 py-1 rounded-lg hover:bg-stone-800/50 transition-colors">
            🏠
          </button>
          <h1 className="text-2xl font-extrabold tracking-wider text-cyan-400" style={display}>
            WATER TOWER
          </h1>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 flex flex-col items-center px-6 py-6 gap-6 overflow-y-auto">
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-white" style={display}>チームを選択</h2>
            <p className="text-sm text-stone-500">気に入るロスターが出るまでリロール</p>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-8 bg-[#0c1018] border border-white/[0.04] rounded-xl px-8 py-3.5" style={mono}>
            <div className="text-center">
              <div className="text-[0.6rem] text-stone-600 uppercase tracking-wider mb-0.5">Total Rating</div>
              <div className="text-white font-bold text-xl">{rerollRating}</div>
            </div>
            <div className="wt-divider" />
            <div className="text-center">
              <div className="text-[0.6rem] text-stone-600 uppercase tracking-wider mb-0.5">Cap Hit</div>
              <div className={'font-bold text-xl ' + (rerollCapHit <= DYN_CAP ? 'text-cyan-400' : 'text-red-400')}>
                ${(rerollCapHit / 1e6).toFixed(1)}M
              </div>
            </div>
            <div className="wt-divider" />
            <div className="text-center">
              <div className="text-[0.6rem] text-stone-600 uppercase tracking-wider mb-0.5">Players</div>
              <div className="text-white font-bold text-xl">{roster.length}</div>
            </div>
            <div className="wt-divider" />
            <div className="text-center">
              <div className="text-[0.6rem] text-stone-600 uppercase tracking-wider mb-0.5">Rating Line</div>
              <div className="text-amber-400 font-bold text-xl">380</div>
            </div>
          </div>

          {/* Main Grid: Table + Preview */}
          <div className="flex gap-5 w-full max-w-6xl">
            {/* Roster Table */}
            <div className="flex-1 bg-[#0c1018] border border-white/[0.04] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.04]">
                <h3 className="wt-section-label">ロスター</h3>
              </div>
              <div className="max-h-[440px] overflow-y-auto wt-scroll">
                <table className="w-full" style={mono}>
                  <thead className="sticky top-0 bg-[#0c1018] z-10">
                    <tr className="text-stone-600 text-xs">
                      <th className="text-left px-5 py-2.5 font-medium">Player</th>
                      <th className="text-center px-3 py-2.5 font-medium">Pos</th>
                      <th className="text-center px-3 py-2.5 font-medium">Rtg</th>
                      <th className="text-center px-3 py-2.5 font-medium">Age</th>
                      <th className="text-right px-5 py-2.5 font-medium">Salary</th>
                      <th className="text-right px-5 py-2.5 font-medium">Contract</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((p, i) => {
                      const tier = getEffTier(p.rating, p.salary);
                      return (
                        <tr key={p.id}
                          className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                          style={{ animation: `twIn 0.3s ease ${i * 40}ms both` }}>
                          <td className="px-5 py-3">
                            <span className="text-white font-semibold text-sm">{p.name}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="text-[0.65rem] bg-stone-800/80 text-stone-400 px-1.5 py-0.5 rounded">{p.position}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="font-bold text-sm" style={{ color: tier.color }}>{p.rating}</span>
                          </td>
                          <td className="text-center px-3 py-3 text-stone-500 text-sm">{p.age}</td>
                          <td className="text-right px-5 py-3 text-stone-300 text-sm">${(p.salary / 1e6).toFixed(1)}M</td>
                          <td className="text-right px-5 py-3 text-stone-600 text-sm">{p.contractYears}yr</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="w-60 shrink-0 space-y-4">
              {/* Mini Tower */}
              <div className="bg-[#0a0e16] border border-white/[0.04] rounded-xl p-4 h-[320px]">
                <div className="wt-section-label mb-2">プレビュー</div>
                <div className="relative w-full overflow-hidden rounded-lg" style={{ height: 'calc(100% - 20px)' }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-cyan-950/20 transition-all" style={{ height: waterH * miniPreviewScale }} />
                  <WaterWave bottom={waterH * miniPreviewScale} />
                  <div className="absolute left-0 right-0 border-t border-dashed border-amber-500/30 tw-pulse"
                    style={{ bottom: 380 * dynamicPxPerM * miniPreviewScale }}>
                    <span className="absolute right-1.5 -top-4 text-[0.6rem] text-amber-400" style={mono}>R380</span>
                  </div>
                  {stacked.filter(s => !s.isDC).map((item, i) => {
                    const tier = item.tier || getEffTier(item.rating, item.salary);
                    return (
                      <div key={item.id} className="absolute rounded-sm"
                        style={{
                          left: 12 + i * 48, width: 40,
                          bottom: item.sBot * miniPreviewScale,
                          height: Math.max(6, item.sH * miniPreviewScale),
                          borderLeft: `3px solid ${tier.color}`,
                          backgroundColor: `${tier.color}18`,
                          animation: `twIn 0.3s ease ${i * 40}ms both`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Tier Distribution */}
              <div className="bg-[#0a0e16] border border-white/[0.04] rounded-xl p-4 space-y-2.5">
                <h4 className="wt-section-label">Tier分布</h4>
                {['S', 'A', 'B', 'C', 'D'].map(t => {
                  const count = roster.filter(p => getEffTier(p.rating, p.salary).label === t).length;
                  const colors = { S: '#facc15', A: '#22d3ee', B: '#34d399', C: '#fb923c', D: '#ef4444' };
                  return (
                    <div key={t} className="flex items-center gap-2.5">
                      <span className="font-bold text-xs w-4 shrink-0" style={{ color: colors[t] }}>{t}</span>
                      <div className="flex-1 bg-stone-900 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${roster.length > 0 ? Math.min(100, count / roster.length * 100) : 0}%`, background: colors[t] }} />
                      </div>
                      <span className="text-xs text-stone-600 w-4 text-right shrink-0" style={mono}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2 pb-2">
            <button onClick={doReroll}
              className="bg-stone-900 border border-stone-800 text-stone-300 font-bold px-8 py-3 rounded-xl text-sm hover:bg-stone-800 transition-all"
              style={mono}>
              🔄 REROLL
            </button>
            <button onClick={startGame}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-bold px-10 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-900/20"
              style={mono}>
              START ▶
            </button>
            <button onClick={() => { playClickSound(); onBack(); }}
              className="bg-stone-900 border border-stone-800 text-stone-600 font-bold px-6 py-3 rounded-xl text-sm hover:text-stone-300 transition-colors"
              style={mono}>
              ← 戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ MANAGE ═══ */
  if (phase === 'manage') {
    return (
      <div className="wt-grain h-screen bg-[#060910] text-white antialiased flex flex-col overflow-hidden select-none"
        style={{ ...mono, fontFamily: "'DM Mono', monospace" }}>
        {CSS_BLOCK}
        <Toast toasts={toasts} />

        {/* ── Sign Modal ── */}
        {signingPlayer && (
          <SignModal player={signingPlayer} totalCapHit={totalCapHit} faSigned={faSignedThisSeason}
            faLimit={faLimit} mleUsed={mleUsed} mleAmount={mleAmount} hardCapped={hardCapped}
            onConfirm={handleConfirmSign} onCancel={() => { setSigningPlayer(null); setSpeed(1); }} />
        )}

        {/* ── Context Menu ── */}
        {contextMenu && (<>
          <div className="fixed inset-0 z-[200]" onClick={closeContextMenu}
            onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} />
          <div className="fixed z-[201] bg-[#0e1218] border border-stone-700/60 rounded-xl shadow-2xl py-1.5 min-w-[190px]"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 230) }}>
            <div className="px-4 py-2.5 border-b border-white/[0.04]">
              <div className="text-white font-semibold text-sm">{contextMenu.player.name}</div>
              <div className="text-stone-500 text-xs mt-0.5" style={mono}>
                {contextMenu.player.position} · R{contextMenu.player.rating} · ${(contextMenu.player.salary / 1e6).toFixed(1)}M
              </div>
            </div>
            <button onClick={() => handleWaive(contextMenu.player)}
              className="w-full text-left px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-950/40 flex items-center gap-3 transition-colors">
              <span>💀</span> Waive
            </button>
            {contextMenu.player.contractYears > 1 && (
              <button onClick={() => handleBuyout(contextMenu.player)}
                className="w-full text-left px-4 py-2.5 text-sm text-purple-300 hover:bg-purple-950/40 flex items-center gap-3 transition-colors">
                <span>🤝</span> Buyout
              </button>
            )}
            {contextMenu.player.contractYears > 1 && (
              <button onClick={() => handleStretch(contextMenu.player)}
                className="w-full text-left px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-3 transition-colors">
                <span>⏳</span> Stretch
              </button>
            )}
          </div>
        </>)}

        {/* ── Summary Modal ── */}
        {showSummary && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#0e1218] border border-stone-700/50 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-5">
              <div className="text-center space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em]" style={display}>
                  Season {sn - 1} Report
                </span>
                {seasonRecord && (
                  <div className="space-y-1">
                    <div className="text-4xl font-extrabold" style={display}>{seasonRecord.wins}W-{seasonRecord.losses}L</div>
                    <div className={'text-lg font-bold ' + (seasonRecord.gmBonus > 0 ? 'text-emerald-400' : 'text-stone-500')} style={mono}>
                      {seasonRecord.result} {seasonRecord.gmBonus > 0 && `+${seasonRecord.gmBonus}`}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-[#080b10] rounded-xl p-4 max-h-48 overflow-y-auto wt-scroll space-y-1">
                {summaries.map((s, i) => (
                  <div key={i} className="flex justify-between items-baseline text-sm py-1.5 border-b border-white/[0.03] last:border-0">
                    <span className="text-white font-medium">{s.name}</span>
                    <span style={mono}>
                      <span className="text-stone-500">{s.oldRating}</span>
                      <span className="text-stone-700 mx-1.5">→</span>
                      <span className={s.change <= -3 ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>{s.newRating || 'RET'}</span>
                      {s.change !== 'RETIRE' && <span className="text-red-500 ml-1.5 text-xs">({s.change})</span>}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={handleSummaryContinue}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-bold py-3.5 rounded-xl text-sm transition-all"
                style={mono}>
                Continue ▶
              </button>
            </div>
          </div>
        )}

        {/* ── Draft Overlay ── */}
        {showDraft && (
          <DraftOverlay prospects={draftProspects} picksLeft={picksLeft} onDraft={handleDraft}
            onSkip={handleDraftSkip} onContinue={handleDraftComplete} season={sn} />
        )}

        {/* ════════════════════════════════════════ */}
        {/* ═══ HEADER ═══                            */}
        {/* ════════════════════════════════════════ */}
        <header className="px-6 py-3 flex items-center justify-between border-b border-white/[0.04] shrink-0 bg-[#080b12]/80 backdrop-blur-sm">
          {/* Left: Navigation */}
          <div className="flex items-center gap-4">
            <button onClick={() => { playClickSound(); setSpeed(0); onBack(); }}
              className="text-stone-600 hover:text-stone-300 text-base px-2 py-1 rounded-lg hover:bg-stone-800/50 transition-colors">
              🏠
            </button>
            <h1 className="text-lg font-extrabold tracking-wider text-cyan-400" style={display}>WATER TOWER</h1>
            <div className="wt-divider" />
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white" style={mono}>S{sn}</span>
              <span className="text-xs text-stone-600" style={mono}>({(currentSeason % 1 * 100).toFixed(0)}%)</span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-stone-900/60 rounded-lg p-0.5">
              <SpeedBtn v={0} label="⏸" />
              <SpeedBtn v={1} label="1x" />
              <SpeedBtn v={2} label="2x" />
              <SpeedBtn v={3} label="3x" />
            </div>
            <div className="wt-divider" />
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] text-stone-600 uppercase tracking-wider">GM</span>
              <span className="text-lg font-bold text-amber-400" style={mono}>{gmScore}</span>
            </div>
            <button onClick={() => { playClickSound(); toggleBGM(); }}
              className={'px-2 py-1 rounded-lg text-base transition-colors ' + (isBgmOn ? 'text-emerald-400 hover:bg-emerald-950/30' : 'text-stone-600 hover:bg-stone-800/50')}>
              {isBgmOn ? '🔊' : '🔇'}
            </button>
          </div>
        </header>

        {/* ════════════════════════════════════════ */}
        {/* ═══ MAIN CONTENT ═══                      */}
        {/* ════════════════════════════════════════ */}
        <main className="flex-1 flex overflow-hidden min-h-0">

          {/* ── Timeline Area ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Season bar */}
            <div className="h-7 flex shrink-0 border-b border-white/[0.03] overflow-hidden"
              ref={el => {
                if (el && contRef.current) {
                  const sync = () => { el.scrollLeft = contRef.current?.scrollLeft || 0; };
                  contRef.current.addEventListener('scroll', sync);
                }
              }}>
              <div className="w-24 shrink-0" />
              <div style={{ width: tlWidth, position: 'relative' }}>
                {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                  <div key={s}
                    className="absolute top-0 h-full flex items-center justify-center text-xs font-bold"
                    style={{
                      left: (s - 1) * SEASON_W, width: SEASON_W,
                      color: s === sn ? '#22d3ee' : '#3a3f4a',
                      fontWeight: s === sn ? 800 : 400,
                      borderRight: '1px solid rgba(255,255,255,0.03)',
                      ...mono,
                    }}>
                    S{s}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline canvas */}
            <div className="flex-1 flex min-h-0">
              {/* Label column */}
              <div className="w-24 shrink-0 relative bg-[#0a0e16] border-r border-white/[0.03] overflow-hidden">
                {/* Rating line label */}
                <div className="absolute left-0 right-0" style={{ bottom: ratingLine * dynamicPxPerM }}>
                  <div className="border-t border-dashed border-amber-500/30 tw-pulse" />
                  <span className="absolute left-2 -top-5 text-[0.6rem] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded whitespace-nowrap" style={mono}>
                    ★ {ratingLine}
                  </span>
                </div>
                {/* Cap line label */}
                <div className="absolute left-0 right-0" style={{ bottom: capLineY }}>
                  <div className="border-t border-dashed opacity-30" style={{ borderColor: '#dc2626' }} />
                  <span className="absolute left-2 -top-5 text-[0.6rem] text-red-400 bg-[#0a0e16]/80 px-1.5 py-0.5 rounded whitespace-nowrap" style={mono}>
                    CAP ${(DYN_CAP / 1e6).toFixed(0)}M
                  </span>
                </div>
              </div>

              {/* Scrollable timeline */}
              <div ref={contRef}
                className="flex-1 overflow-x-auto overflow-y-hidden wt-scroll"
                style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
                onWheel={handleUserInteract} onMouseDown={handleDragStart}
                onTouchStart={handleUserInteract} onTouchEnd={handleUserRelease}
                onContextMenu={(e) => e.preventDefault()}>
                <div style={{
                  width: tlWidth, height: canvasH, position: 'relative',
                  background: '#0a0e16', userSelect: 'none',
                  paddingLeft: 4, paddingRight: 4, overflow: 'hidden',
                }}>
                  {/* Season dividers */}
                  {Array.from({ length: maxSn }, (_, i) => i + 1).map(s => (
                    <div key={s} className="absolute top-0 bottom-0"
                      style={{ left: (s - 1) * SEASON_W, width: 1, background: 'rgba(255,255,255,0.025)' }} />
                  ))}

                  {/* Past overlay */}
                  <div className="absolute top-0 bottom-0 pointer-events-none"
                    style={{ left: 0, width: Math.max(0, (currentSeason - 1) * SEASON_W), background: 'rgba(0,0,0,0.2)', zIndex: 4 }} />

                  {/* Water fill */}
                  <div className="absolute bottom-0 left-0 right-0 transition-all"
                    style={{ height: waterH, background: 'linear-gradient(to top, rgba(6,80,130,0.3), rgba(6,120,180,0.04))', zIndex: 1 }} />

                  <WaterWave bottom={waterH} />

                  {/* Cap line */}
                  <div className="absolute left-0 right-0 border-t border-dashed opacity-30 pointer-events-none"
                    style={{ bottom: capLineY, borderColor: '#dc2626', zIndex: 3 }} />

                  {/* Rating line */}
                  <div className="absolute left-0 right-0 border-t border-dashed border-amber-500/30 tw-pulse pointer-events-none"
                    style={{ bottom: ratingLine * dynamicPxPerM, zIndex: 3 }} />

                  {/* Strips */}
                  {stacked.map(item => {
                    const endSn = item.contractEndSeason || (item.signedSeason || 1) + (item.contractYears || item.yearsLeft || 1);
                    const startSn = Math.max(currentSeason, item.signedSeason || 1);
                    const left = (startSn - 1) * SEASON_W + 8;
                    const w = Math.max(0, (endSn - startSn) * SEASON_W - 8);
                    const tier = item.tier || getEffTier(item.rating, item.salary);
                    const isCtxTarget = contextMenu && contextMenu.player.id === item.id;
                    const animClass = animatingStrips[item.id] === 'dissolve' ? ' strip-dissolve' :
                      animatingStrips[item.id] === 'stretch' ? ' strip-stretch' :
                      animatingStrips[item.id] === 'shrink' ? ' strip-shrink' :
                      animatingStrips[item.id] === 'born' ? ' strip-born' : '';
                    if (w <= 0) return null;
                    return (
                      <div key={item.id}
                        onContextMenu={(e) => { if (!item.isDC) handleStripContextMenu(e, item); }}
                        className={'absolute rounded-lg transition-all duration-500' +
                          (item.isDC ? '' : ' cursor-pointer') +
                          (isCtxTarget ? ' tw-glow' : '') +
                          animClass}
                        style={{
                          left, width: w, bottom: item.sBot, height: item.sH,
                          borderLeft: `4px solid ${item.isDC ? '#ef4444' : tier.color}`,
                          backgroundColor: isCtxTarget ? `${tier.color}28` : item.isDC ? 'rgba(239,68,68,0.12)' : `${tier.color}0d`,
                          opacity: item.isDC ? 0.65 : 1,
                          backgroundImage: item.isDC ? 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(239,68,68,0.08) 8px, rgba(239,68,68,0.08) 16px)' : 'none',
                          zIndex: isCtxTarget ? 10 : item.isDC ? 1 : 2,
                          userSelect: 'none',
                        }}>
                        <div className="flex items-center justify-between px-3 h-full overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-white font-semibold text-xs truncate">{item.name}</span>
                            {!item.isDC && (
                              <span className="text-[0.6rem] bg-stone-800/80 text-stone-400 px-1 py-px rounded shrink-0" style={mono}>
                                {item.position}
                              </span>
                            )}
                            {item.isDC && (
                              <span className="text-[0.6rem] bg-red-950/80 text-red-400 px-1 py-px rounded shrink-0" style={mono}>DC</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!item.isDC && (
                              <span className="font-bold text-sm" style={{ color: tier.color, ...mono }}>{item.rating}</span>
                            )}
                            <div className="text-right">
                              <div className="text-stone-400 text-xs" style={mono}>${(item.effSal / 1e6).toFixed(1)}M</div>
                              <div className="text-stone-700 text-[0.6rem]" style={mono}>{tier.label}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Current season cursor */}
                  <div className="absolute top-0 bottom-0 tw-glow pointer-events-none"
                    style={{ left: (currentSeason - 1) * SEASON_W - 1, width: 3, background: 'linear-gradient(to bottom, #22d3ee, #0891b2)', zIndex: 8 }} />
                </div>
              </div>
            </div>

            {/* ═══ Status Bar ═══ */}
            <div className="flex items-center gap-5 px-6 py-2.5 bg-[#0a0e16] border-t border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2">
                <span className="wt-section-label">RATING</span>
                <span className={'font-bold text-lg ' + (totalRating >= ratingLine ? 'text-emerald-400' : 'text-red-400')} style={mono}>
                  {totalRating}
                </span>
                <span className="text-stone-700 text-xs" style={mono}>/{ratingLine}</span>
              </div>
              <div className="wt-divider" />
              <div className="flex items-center gap-2">
                <span className="wt-section-label">CAP</span>
                <span className={'font-bold text-lg ' + (totalCapHit <= DYN_CAP ? 'text-cyan-400' : 'text-amber-400')} style={mono}>
                  ${(totalCapHit / 1e6).toFixed(1)}M
                </span>
                <span className="text-stone-700 text-xs" style={mono}>/${(DYN_CAP / 1e6).toFixed(0)}M</span>
              </div>
              <div className="wt-divider" />
              <div className="flex items-center gap-2">
                <span className="wt-section-label">ROSTER</span>
                <span className="text-white font-bold" style={mono}>{roster.length}人</span>
              </div>
              <div className="wt-divider" />
              <div className="flex items-center gap-2">
                <span className="wt-section-label">FA</span>
                <span className="text-white font-bold" style={mono}>{faLimit - faSignedThisSeason}/{faLimit}</span>
              </div>
              {dc > 0 && (
                <>
                  <div className="wt-divider" />
                  <div className="flex items-center gap-2">
                    <span className="wt-section-label text-red-500">DC</span>
                    <span className="text-red-400 font-bold" style={mono}>${(dc / 1e6).toFixed(1)}M</span>
                  </div>
                </>
              )}
              <span className="text-stone-700 text-[0.6rem] ml-auto" style={mono}>Space: 一時停止 · 右クリック: 操作</span>
            </div>
          </div>

          {/* ════════════════════════════════════════ */}
          {/* ═══ SIDEBAR ═══                          */}
          {/* ════════════════════════════════════════ */}
          <div className="w-80 flex flex-col shrink-0 border-l border-white/[0.04] bg-[#080b12] overflow-hidden">

            {/* Warning */}
            {totalRating < ratingLine && (
              <div className="bg-red-950/30 border-b border-red-900/30 px-4 py-3 animate-pulse shrink-0">
                <div className="text-red-400 font-bold text-xs" style={mono}>
                  🚨 Rating不足: {ratingLine - totalRating}pt
                </div>
              </div>
            )}

            {/* Status Summary */}
            <div className="p-4 space-y-3 border-b border-white/[0.03] shrink-0">
              <div className="wt-section-label">ステータス</div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-stone-500">Rating</span>
                  <div style={mono}>
                    <span className={'font-bold text-lg ' + (totalRating >= ratingLine ? 'text-emerald-400' : 'text-red-400')}>
                      {totalRating}
                    </span>
                    <span className="text-stone-700 text-xs ml-1">/{ratingLine}</span>
                  </div>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-stone-500">Cap</span>
                  <span className={'font-bold text-lg ' + (totalCapHit <= DYN_CAP ? 'text-cyan-400' : 'text-red-400')} style={mono}>
                    ${(totalCapHit / 1e6).toFixed(1)}M
                  </span>
                </div>
                {dc > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-red-500">Dead Cap</span>
                    <span className="text-red-400 font-bold text-sm" style={mono}>${(dc / 1e6).toFixed(1)}M</span>
                  </div>
                )}
              </div>
            </div>

            {/* FA Market */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center px-4 pt-3 pb-2 shrink-0">
                <h3 className="wt-section-label text-cyan-400">🏪 FA市場</h3>
                <button onClick={() => { playClickSound(); refreshFAInternal(); }}
                  className="text-[0.65rem] text-stone-600 hover:text-stone-300 bg-stone-900 px-2 py-0.5 rounded transition-colors"
                  style={mono}>
                  🔄 更新
                </button>
              </div>
              <div className="flex-1 overflow-y-auto wt-scroll px-4 pb-4 space-y-2">
                {freeAgents.map(p => {
                  const tier = getEffTier(p.rating, p.salary);
                  return (
                    <div key={p.id}
                      className="bg-[#0c1018] border border-white/[0.04] rounded-lg p-3 hover:border-white/[0.08] transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-white font-semibold text-sm truncate">{p.name}</div>
                          <div className="text-stone-500 text-xs mt-1" style={mono}>
                            {p.position} · ${(p.salary / 1e6).toFixed(1)}M · {p.contractYears}yr
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-base" style={{ color: tier.color, ...mono }}>{p.rating}</span>
                          <button onClick={() => handleSignRequest(p)}
                            disabled={faSignedThisSeason >= faLimit}
                            className="text-xs bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 px-2.5 py-1 rounded-md font-bold hover:bg-cyan-900/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                            style={mono}>
                            ＋
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {freeAgents.length === 0 && (
                  <p className="text-stone-700 text-xs text-center py-8" style={mono}>FA選手なし</p>
                )}
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
      <div className="wt-grain min-h-screen bg-[#060910] text-white antialiased flex flex-col items-center justify-center px-6"
        style={{ ...mono, fontFamily: "'DM Mono', monospace" }}>
        {CSS_BLOCK}
        <div className="w-full max-w-xl space-y-6 bg-[#0e1218] border border-red-900/40 rounded-2xl p-10 text-center">
          <div className="space-y-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-[0.2em]" style={display}>TOWER COLLAPSED</span>
            <h2 className="text-3xl font-extrabold" style={display}>タワー崩壊</h2>
          </div>

          <div className="bg-[#080b10] rounded-xl p-6 space-y-2">
            <div className="text-xs text-stone-600 uppercase tracking-wider">存続期間</div>
            <div className="text-6xl font-extrabold text-cyan-400" style={display}>{Math.max(0, sn - 1)}</div>
            <div className="text-sm text-stone-500">シーズン</div>
            <div className="text-red-400 text-xs mt-3" style={mono}>
              Rating {totalRating} {'<'} Required {ratingLine}
            </div>
          </div>

          <div className="bg-[#080b10] rounded-xl p-5">
            <div className="text-[0.6rem] text-stone-600 uppercase tracking-wider mb-1">GM SCORE</div>
            <div style={display}>
              <span className="text-5xl font-extrabold text-amber-400">{gmScore}</span>
              <span className="text-lg text-stone-600 ml-2">pts</span>
            </div>
          </div>

          <div className="flex gap-4 justify-center pt-2">
            <button onClick={() => { doReroll(); }}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-bold px-8 py-3.5 rounded-xl text-sm transition-all"
              style={mono}>
              TRY AGAIN 🔄
            </button>
            <button onClick={() => { playClickSound(); onBack(); }}
              className="bg-stone-900 border border-stone-800 text-stone-400 font-bold px-6 py-3.5 rounded-xl text-sm hover:text-white transition-colors"
              style={mono}>
              タイトルへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
