import React, { useState, useEffect, useRef, useCallback } from 'react';
import RosterTable from './RosterTable';
import SalaryMeter from './SalaryMeter';
import {
  genRoster, genFA, genDraft, genDraftPicks, advanceSeason, advanceDeadCap,
  checkSurvival, calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, calcRepeaterTax, calcStretch, validateTrade,
  isSupermaxEligible, isGilbertArenasRestricted,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2, PICKS_PER_DRAFT
} from '../dynastyEngine';

// ★追加: Toast コンポーネント
function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none" style={{ maxWidth: '400px' }}>
      {toasts.map((toast) => (
        <div key={toast.id}
          className="pointer-events-auto"
          style={{
            animation: toast.exiting ? 'dyToastOut 0.4s ease forwards' : 'dyToastIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <div className={
            'border rounded-xl px-5 py-3.5 shadow-2xl backdrop-blur-sm ' +
            (toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/60' :
             toast.type === 'epic' ? 'bg-amber-950/90 border-amber-400/60' :
             toast.type === 'trade' ? 'bg-purple-950/90 border-purple-500/60' :
             toast.type === 'warning' ? 'bg-red-950/90 border-red-500/60' :
             toast.type === 'info' ? 'bg-blue-950/90 border-blue-500/60' :
             'bg-stone-900/90 border-stone-600/60')
          }>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{toast.icon}</span>
              <div>
                <div className={
                  'text-sm font-mono font-black tracking-wide ' +
                  (toast.type === 'success' ? 'text-emerald-400' :
                   toast.type === 'epic' ? 'text-amber-400' :
                   toast.type === 'trade' ? 'text-purple-400' :
                   toast.type === 'warning' ? 'text-red-400' :
                   toast.type === 'info' ? 'text-blue-400' :
                   'text-stone-300')
                }>{toast.title}</div>
                {toast.message && <div className="text-xs text-stone-300 font-bold mt-0.5">{toast.message}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ★追加: 紙吹雪コンポーネント
function ConfettiOverlay({ active }) {
  if (!active) return null;
  const colors = ['#e8c547', '#22d3ee', '#f97316', '#a78bfa', '#34d399', '#fb7185'];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }));
  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          top: '-20px',
          width: p.shape === 'circle' ? `${p.size}px` : `${p.size * 1.5}px`,
          height: `${p.size}px`,
          backgroundColor: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          transform: `rotate(${p.rotation}deg)`,
          animation: `dyConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0.9,
        }} />
      ))}
    </div>
  );
}

// ★追加: GM SCORE カウンターコンポーネント
function AnimatedScore({ target, playClickSound }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    if (start === end) return;
    prevRef.current = end;

    const diff = end - start;
    const steps = Math.min(Math.abs(diff), 40);
    const stepSize = diff / steps;
    let current = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      current++;
      const val = Math.round(start + stepSize * current);
      setDisplay(val);
      try { playClickSound(); } catch (e) {}
      if (current >= steps) {
        clearInterval(timerRef.current);
        setDisplay(end);
      }
    }, 50);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [target]);

  useEffect(() => {
    setDisplay(target);
    prevRef.current = target;
  }, []);

  return <>{display}</>;
}

function HoverTip({ children, text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [align, setAlign] = useState('center');
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const tooltipWidth = 288;
    const halfW = tooltipWidth / 2;
    if (x - halfW < 8) {
      setAlign('left');
    } else {
      setAlign('center');
    }
    setPos({ x, y: rect.top });
    setShow(true);
  };
  const style = align === 'left'
    ? { left: 8, top: pos.y, transform: 'translateY(-110%)' }
    : { left: pos.x, top: pos.y, transform: 'translate(-50%, -110%)' };
  return (
    <span className="relative inline-block cursor-help" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="fixed z-[9999] px-3 py-2.5 bg-stone-950 border border-stone-500 rounded-xl text-sm text-white leading-relaxed shadow-2xl shadow-black/60 w-72 pointer-events-none" style={style}>
          {text}
          <div className={"absolute top-full border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-stone-500 " + (align === 'left' ? 'left-4' : 'left-1/2 -translate-x-1/2')}></div>
        </div>
      )}
    </span>
  );
}

export default function DynastyView({ onBack, gmName, playClickSound, isBgmOn, toggleBGM }) {
  const [phase, setPhase] = useState('reroll');
  const [season, setSeason] = useState(1);
  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [deadCap, setDeadCap] = useState(0);
  const [deadCapDetails, setDeadCapDetails] = useState([]);
  const [draftProspects, setDraftProspects] = useState([]);
  const [picksLeft, setPicksLeft] = useState(0);
  const [draftPicks, setDraftPicks] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [expiredPlayers, setExpiredPlayers] = useState([]);
  const [optionPlayers, setOptionPlayers] = useState([]);
  const [collapseReason, setCollapseReason] = useState('');
  const [signingPlayer, setSigningPlayer] = useState(null);
  const [signingYears, setSigningYears] = useState(2);
  const [useMLE, setUseMLE] = useState(false);
  const [taxHistory, setTaxHistory] = useState([]);
  const [mleUsed, setMleUsed] = useState(false);

  const [tradeMode, setTradeMode] = useState(false);
  const [tradeOffer, setTradeOffer] = useState([]);
  const [tradeTarget, setTradeTarget] = useState(null);
  const [tradeMarket, setTradeMarket] = useState([]);

  const [signTradePlayer, setSignTradePlayer] = useState(null);

  // ★追加: 視覚効果用 state
  const [toasts, setToasts] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const toastCounter = useRef(0);

  const totalCapHit = calcCapHit(roster, deadCap);
  const totalOvr = roster.reduce((s, p) => s + p.rating, 0);
  const minOvr = 380 + (season - 1) * 8;

  function calcGMScore() {
    const base = Math.max(0, season - 1) * 100;
    const ratingBonus = Math.floor(totalOvr / 10);
    const capRemaining = Math.max(0, DYN_CAP - totalCapHit);
    const capBonus = Math.min(100, Math.floor((capRemaining / 1000000) * 5));
    const starBonus = roster.some(p => p.rating >= 90) ? 50 : 0;
    const rosterBonus = roster.length >= 12 ? 30 : 0;
    const birdBonus = Math.min(60, roster.filter(p => p.birdRights === 'Full').length * 20);
    return base + ratingBonus + capBonus + starBonus + rosterBonus + birdBonus;
  }

  const mleAmount = getMLEAmount(totalCapHit);
  const repeaterSeasons = taxHistory.filter(Boolean).length;
  const overTax = Math.max(0, totalCapHit - DYN_TAX);
  const repeaterTax = calcRepeaterTax(overTax, repeaterSeasons);
  const isOnTax = totalCapHit > DYN_TAX;

  // ★追加: Toast 関数
  const addToast = useCallback((type, icon, title, message, duration = 3000) => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, icon, title, message, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, duration);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration + 500);
  }, []);

  // ★追加: エフェクトトリガー
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  }, []);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 600);
  }, []);

  // ★追加: サウンドエフェクト（Web Audio API）
  const ctxRef = useRef(null);
  const getAudioCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const playTone = (freq, duration = 0.15, type = 'sine', vol = 0.08, delay = 0) => {
    try {
      const ctx = getAudioCtx(); const now = ctx.currentTime + delay;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + duration + 0.01);
    } catch (e) {}
  };

  const playSuccessSound = () => {
    playTone(523.25, 0.15, 'sine', 0.07);
    playTone(659.25, 0.15, 'sine', 0.07, 0.1);
    playTone(783.99, 0.25, 'sine', 0.09, 0.2);
  };

  const playEpicSound = () => {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      playTone(f, 0.4, 'sine', 0.06, i * 0.12);
      playTone(f * 1.5, 0.3, 'triangle', 0.03, i * 0.12 + 0.05);
    });
    [1318.51, 1567.98, 2093.00].forEach((f, i) => {
      playTone(f, 0.8, 'sine', 0.02, 0.5 + i * 0.15);
    });
  };

  const playTradeSound = () => {
    playTone(200, 0.3, 'sawtooth', 0.06);
    playTone(150, 0.4, 'sine', 0.08, 0.05);
    playTone(800, 0.08, 'square', 0.04, 0.1);
    playTone(600, 0.15, 'sine', 0.06, 0.15);
    playTone(900, 0.2, 'sine', 0.08, 0.25);
  };

  const playBuyoutSound = () => {
    playTone(329.63, 0.6, 'sine', 0.05);
    playTone(415.30, 0.6, 'sine', 0.05, 0.02);
    playTone(493.88, 0.8, 'sine', 0.07, 0.04);
    playTone(987.77, 1.2, 'sine', 0.02, 0.4);
  };

  const playErrorSound = () => {
    playTone(200, 0.2, 'square', 0.06);
    playTone(190, 0.2, 'square', 0.06, 0.15);
  };

  const playReleaseSound = () => {
    playTone(600, 0.15, 'sine', 0.05);
    playTone(400, 0.15, 'sine', 0.04, 0.1);
    playTone(250, 0.3, 'sine', 0.03, 0.2);
  };

  const playMLESound = () => {
    playTone(698.46, 0.15, 'sine', 0.06);
    playTone(880.00, 0.15, 'sine', 0.06, 0.1);
    playTone(1046.50, 0.3, 'triangle', 0.08, 0.2);
  };

  const playSTSound = () => {
    playTone(440, 0.2, 'sine', 0.06);
    playTone(554.37, 0.2, 'sine', 0.06, 0.1);
    playTone(659.25, 0.3, 'sine', 0.08, 0.2);
    playTone(1318.51, 0.6, 'sine', 0.04, 0.4);
  };

  const playOptionSound = () => {
    playTone(1000, 0.06, 'square', 0.05);
    playTone(1400, 0.1, 'sine', 0.07, 0.06);
  };

  useEffect(() => { doReroll(); }, []);

  function doReroll() {
    playClickSound();
    setRoster(genRoster());
    setFreeAgents(genFA(8));
    setDeadCap(0);
    setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]);
    setMleUsed(false);
    setSeason(1);
    setPhase('reroll');
    setTradeMode(false);
  }

  function handleSignRequest(player) {
    playClickSound();
    setSigningPlayer(player);
    setSigningYears(2);
    setUseMLE(false);
  }

  function handleConfirmSign() {
    playClickSound();
    const player = signingPlayer;
    const years = signingYears;

    const check = canSignFA(player, years);
    if (!check.allowed) {
      playErrorSound();
      triggerShake();
      addToast('warning', '❌', '契約不可', check.reason, 4000);
      return;
    }

    let adjustedSalary = adjustSalaryForYears(player.salary, years);

    if (useMLE && mleAmount > 0 && !mleUsed) {
      adjustedSalary = Math.min(adjustedSalary, mleAmount);
    }

    if (totalCapHit + adjustedSalary > DYN_APRON2) {
      playErrorSound();
      triggerShake();
      addToast('warning', '❌', '第2エプロン超過', '補強できません！', 4000);
      return;
    }

    const signedPlayer = { ...player, salary: adjustedSalary, contractYears: years, faStatus: 'None' };
    setFreeAgents(fa => fa.filter(p => p.id !== player.id));
    setRoster(r => [...r, signedPlayer]);
    if (useMLE) {
      setMleUsed(true);
      playMLESound();
      addToast('info', '📋', `MLE契約: ${player.name}`, `$${(adjustedSalary / 1000000).toFixed(1)}M`, 3500);
    } else {
      playSuccessSound();
      addToast('success', '✍️', `契約: {player.name}`, `R${player.rating} | $$$${(adjustedSalary / 1000000).toFixed(1)}M/年`, 3000);
    }
    setSigningPlayer(null);
  }

  function handleCancelSign() {
    playClickSound();
    setSigningPlayer(null);
  }

  function handleWaiver(player) {
    playClickSound();
    const remaining = player.salary * player.contractYears;
    if (!window.confirm(`${player.name}をウェイブしますか？\n\n残り契約: $${(remaining / 1000000).toFixed(1)}M（{player.contractYears}年）\nデッドキャップ: $$$${(player.salary / 1000000).toFixed(1)}M/年 × ${player.contractYears}年\n\n※全放出がウェイブを経由します。デッドキャップは100%です。`)) return;
    if (player.salary > 0 && player.contractYears > 0) {
      const nd = [...deadCapDetails, { name: player.name, amount: player.salary, yearsLeft: player.contractYears, type: 'Waive' }];
      setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
    }
    setRoster(r => r.filter(p => p.id !== player.id));
    playReleaseSound();
    addToast('warning', '💀', `ウェイブ: ${player.name}`, `デッドキャップ $${(player.salary / 1000000).toFixed(1)}M/年 × {player.contractYears}年`, 4000);
  }

  function handleBuyout(player) {
    playClickSound();
    const agreeChance = Math.max(5, 100 - player.rating);
    const roll = Math.random() * 100;
    if (roll < agreeChance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const deadAmount = Math.floor(player.salary * pct / 100);
      if (player.salary > 0 && player.contractYears > 0) {
        const nd = [...deadCapDetails, { name: player.name + ' (B/O)', amount: deadAmount, yearsLeft: player.contractYears, type: 'Buyout' }];
        setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
      }
      setRoster(r => r.filter(p => p.id !== player.id));
      playBuyoutSound();
      const totalSaved = player.salary * player.contractYears - deadAmount * player.contractYears;
      addToast('success', '🤝', `バイアウト成功: ${player.name}`, `契約${pct}%に軽減 | $$$${(totalSaved / 1000000).toFixed(1)}M節約`, 4500);
    } else {
      playErrorSound();
      addToast('warning', '❌', `バイアウト拒否: ${player.name}`, `同意確率: ${agreeChance}%`, 3500);
    }
  }

  function handleStretch(player) {
    playClickSound();
    const st = calcStretch(player);
    if (!window.confirm(`${player.name}をストレッチしますか？\n\n通常: $${(player.salary / 1000000).toFixed(1)}M/年 × {player.contractYears}年\nストレッチ: $$$${(st.annualAmount / 1000000).toFixed(1)}M/年 × ${st.stretchYears}年\n\n※今年のキャップは空くが、長期のデッドキャップになる。`)) return;
    if (player.salary > 0 && player.contractYears > 0) {
      const nd = [...deadCapDetails, { name: player.name + ' (ST)', amount: st.annualAmount, yearsLeft: st.stretchYears, type: 'Stretch' }];
      setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
    }
    setRoster(r => r.filter(p => p.id !== player.id));
    playBuyoutSound();
    addToast('success', '⏳', `ストレッチ条項: ${player.name}`, `${st.stretchYears}年分割 | $${(st.annualAmount / 1000000).toFixed(1)}M/年`, 4500);
  }

  function handleSignAndTrade(player) {
    playClickSound();
    setSignTradePlayer(player);
  }

  function handleConfirmSignAndTrade() {
    playClickSound();
    const p = signTradePlayer;
    const newPicks = [...draftPicks, { id: 'pick_' + Date.now(), year: season + 1, round: Math.random() > 0.5 ? 1 : 2, own: true, from: p.name }];
    setDraftPicks(newPicks);
    setExpiredPlayers(ep => ep.filter(x => x.id !== p.id));
    setSignTradePlayer(null);
    playSTSound();
    triggerConfetti();
    addToast('epic', '🔄', `S&T成功: {p.name}`, 'ドラフトピック+1獲得！将来の戦力に期待', 5000);
  }

  function handleOptionDecision(player, exercise) {
    playClickSound();
    playOptionSound();
    if (player.optionType === 'player') {
      if (exercise) {
        addToast('info', '📋', `PO行使: ${player.name}`, `$$$${(player.salary / 1000000).toFixed(1)}Mで契約延長`, 3000);
      } else {
        setRoster(r => r.filter(x => x.id !== player.id));
        player.faStatus = player.birdRights !== 'None' ? 'RFA' : 'UFA';
        setExpiredPlayers(ep => [...ep, { ...player }]);
        addToast('warning', '🏃', `PO拒否: ${player.name}`, 'FA市場へ移動', 3500);
      }
    } else {
      if (exercise) {
        addToast('success', '📋', `TO行使: ${player.name}`, `$${(player.salary / 1000000).toFixed(1)}Mで契約延長`, 3000);
      } else {
        setRoster(r => r.filter(x => x.id !== player.id));
        addToast('info', '✂️', `TO拒否: {player.name}`, '契約を終了。キャップに余裕が生まれました', 3000);
      }
    }
    setOptionPlayers(op => op.filter(x => x.id !== player.id));
  }

  function handleOpenTrade() {
    playClickSound();
    setTradeMarket(genFA(6));
    setTradeOffer([]);
    setTradeTarget(null);
    setTradeMode(true);
  }

  function handleAddToTradeOffer(player) {
    playClickSound();
    if (!tradeOffer.find(p => p.id === player.id)) {
      setTradeOffer([...tradeOffer, player]);
    }
  }

  function handleRemoveFromTradeOffer(player) {
    playClickSound();
    setTradeOffer(tradeOffer.filter(p => p.id !== player.id));
  }

  function handleSelectTradeTarget(player) {
    playClickSound();
    setTradeTarget(player);
  }

  function handleExecuteTrade() {
    playClickSound();
    if (!tradeTarget || tradeOffer.length === 0) { alert('トレードする選手を選んでください'); return; }
    const validation = validateTrade(
      tradeOffer.map(p => p.salary),
      [tradeTarget.salary]
    );
    if (!validation.allowed) {
      playErrorSound();
      triggerShake();
      addToast('warning', '❌', 'トレード不可', validation.reason, 4000);
      return;
    }
    setRoster(r => [...r.filter(p => !tradeOffer.find(o => o.id === p.id)), tradeTarget]);
    setTradeOffer([]);
    setTradeTarget(null);
    setTradeMode(false);
    playTradeSound();
    triggerConfetti();
    addToast('trade', '🤝', 'トレード成立!', `${tradeOffer.map(p => p.name).join(', ')} → ${tradeTarget.name}`, 4500);
  }

  function handleNextSeason() {
    playClickSound();
    const result = advanceSeason(roster);
    const deadResult = advanceDeadCap(deadCapDetails);
    setSummaries(result.summaries);
    setExpiredPlayers(result.expired);
    setOptionPlayers(result.optionPlayers);
    setRoster(result.surviving);
    setDeadCap(deadResult.total);
    setDeadCapDetails(deadResult.details);
    setTaxHistory([...taxHistory, isOnTax]);
    setMleUsed(false);
    setPhase('seasonEnd');
  }

  function handleToDraft() {
    playClickSound();
    if (optionPlayers.length > 0) {
      setPhase('optionDecision');
      return;
    }
    startDraft();
  }

  function startDraft() {
    setDraftProspects(genDraft(10));
    setPicksLeft(PICKS_PER_DRAFT);
    setPhase('draft');
  }

  function handleDraft(prospect) {
    playClickSound();
    playSuccessSound();
    addToast('success', '🏀', `ドラフト: ${prospect.name}`, `R${prospect.rating} | $$$${(prospect.salary / 1000000).toFixed(1)}M`, 3000);
    setRoster(r => [...r, { ...prospect, faStatus: 'None', hasOption: false, optionType: null, supermaxEligible: false }]);
    setDraftProspects(dp => dp.filter(p => p.id !== prospect.id));
    setPicksLeft(p => p - 1);
  }

  function handleDraftComplete() {
    playClickSound();
    const newSeason = season + 1;
    const survival = checkSurvival(roster, newSeason);
    if (!survival.alive) {
      playErrorSound();
      setCollapseReason(survival.reason);
      setPhase('gameOver');
      return;
    }
    playEpicSound();
    triggerConfetti();
    addToast('epic', '➡️', `SEASON ${newSeason}`, '新シーズン開始！', 3500);
    setFreeAgents(genFA(8));
    setSeason(newSeason);
    setPhase('manage');
  }

  const Header = () => (
    <header className="w-full max-w-7xl mx-auto mb-3 flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={() => { playClickSound(); onBack(); }} className="px-3 py-2 text-stone-500 hover:text-stone-300 rounded-lg transition-all text-sm font-mono">🏠</button>
        <div>
          <h1 className="text-2xl font-black font-mono text-amber-400 tracking-wider">👑 DYNASTY MODE</h1>
          <span className="text-sm font-mono text-stone-400">SEASON {season}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-stone-500">GM SCORE</span>
        <span className="text-2xl font-mono font-black text-amber-400">
          <AnimatedScore target={calcGMScore()} playClickSound={() => { try { playTone(800, 0.02, 'square', 0.03); } catch(e){} }} />
        </span>
        <span className="text-xs font-mono text-stone-600">pts</span>
        <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-3 py-2 rounded-lg transition-all text-sm ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
      </div>
    </header>
  );

  const SignModal = () => {
    if (!signingPlayer) return null;
    const adjustedSalary = useMLE && mleAmount > 0 && !mleUsed
      ? Math.min(adjustSalaryForYears(signingPlayer.salary, signingYears), mleAmount)
      : adjustSalaryForYears(signingPlayer.salary, signingYears);
    const gilbert = isGilbertArenasRestricted(signingPlayer);
    const supermax = isSupermaxEligible(signingPlayer);

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9998]" onClick={handleCancelSign}>
        <div className="bg-[#141210] border border-stone-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="text-center space-y-1">
            <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">FA SIGNING</span>
            <h3 className="text-xl font-black text-white">{signingPlayer.name}</h3>
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-amber-400 font-mono font-black">Rating {signingPlayer.rating}</span>
              <span className="text-stone-400">Age {signingPlayer.age}</span>
            </div>
          </div>

          {supermax && (
            <div className="bg-amber-950/40 border border-amber-700 rounded-lg p-2 text-xs text-amber-300 font-mono text-center">
              ⭐ スーパーマックス対象選手（Rating 90+, チーム4年以上）
            </div>
          )}
          {gilbert && (
            <div className="bg-purple-950/40 border border-purple-700 rounded-lg p-2 text-xs text-purple-300 font-mono text-center">
              🔒 ギルバート・アリーナス条項適用（他チームはMLE上限まで）
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-mono font-black text-stone-400 uppercase">契約年数を選択</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(y => {
                const check = canSignFA(signingPlayer, y);
                return (
                  <button key={y} onClick={() => setSigningYears(y)} disabled={!check.allowed}
                    className={'py-2 rounded-lg border font-mono font-black text-sm transition-all ' + (
                      signingYears === y ? 'bg-cyan-950 border-cyan-500 text-cyan-400'
                      : check.allowed ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850'
                      : 'bg-stone-950 border-stone-900 text-stone-600 cursor-not-allowed'
                    )}>{y}年</button>
                );
              })}
            </div>
            {signingPlayer.rating >= 85 && signingYears === 1 && (
              <p className="text-xs text-red-400 font-mono">⚠️ スター級選手は1年契約を拒否します</p>
            )}
          </div>

          {mleAmount > 0 && !mleUsed && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="useMLE" checked={useMLE} onChange={e => setUseMLE(e.target.checked)} className="accent-cyan-500" />
              <HoverTip text="Mid-Level Exception（MLE）：キャップ超過チームにも使える例外枠の補強予算。キャップ以下なら約$12.4M、1st Apron超えで約$5M、2nd Apron超えで没収。チェックを入れると、その選手の契約をMLE枠で補える。毎シーズン1回だけ使用可能。">
                <label htmlFor="useMLE" className="text-xs text-cyan-400 font-mono">MLEを使用（残額: ${(mleAmount / 1000000).toFixed(1)}M）</label>
              </HoverTip>
            </div>
          )}

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">年俸:</span>
              <span className="text-white font-mono font-black">${(adjustedSalary / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">契約総額:</span>
              <span className="text-white font-mono font-black">${(adjustedSalary * signingYears / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">契約後キャップ:</span>
              <span className={(totalCapHit + adjustedSalary) <= DYN_CAP ? 'text-emerald-400 font-mono font-black' : 'text-red-400 font-mono font-black'}>
                ${((totalCapHit + adjustedSalary) / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCancelSign} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-2.5 rounded-xl text-sm transition-all">キャンセル</button>
            <button onClick={handleConfirmSign} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-2.5 rounded-xl text-sm transition-all">契約する</button>
          </div>
        </div>
      </div>
    );
  };

  const SignTradeModal = () => {
    if (!signTradePlayer) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9998]" onClick={() => setSignTradePlayer(null)}>
        <div className="bg-[#141210] border border-amber-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="text-center space-y-1">
            <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">SIGN & TRADE</span>
            <h3 className="text-xl font-black text-white">{signTradePlayer.name}</h3>
            <p className="text-sm text-stone-400">Rating {signTradePlayer.rating} / Age {signTradePlayer.age}</p>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-300">
            <p>再契約してから放出し、ドラフトピックと引き換えにできます。</p>
            <p className="text-amber-400 mt-1 font-mono">→ 来シーズンのドラフトピックを1つ獲得</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSignTradePlayer(null)} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-2.5 rounded-xl text-sm">キャンセル</button>
            <button onClick={handleConfirmSignAndTrade} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-2.5 rounded-xl text-sm">S&T実行</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══ TRADE PHASE ═══
  if (tradeMode) {
    const validation = tradeOffer.length > 0 && tradeTarget ? validateTrade(tradeOffer.map(p => p.salary), [tradeTarget.salary]) : null;
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} />
        <ConfettiOverlay active={showConfetti} />
        <div className={'w-full max-w-5xl space-y-4 ' + (screenShake ? 'animate-shake' : '')}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black font-mono text-cyan-400">⚖️ TRADE MACHINE</h2>
            <button onClick={() => { playClickSound(); setTradeMode(false); }} className="text-stone-400 hover:text-white font-mono text-sm">← 戻る</button>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs font-mono text-stone-400">
            トレードルール: 獲得額は送出額の75%〜125%+$100Kの範囲内
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#141210] border border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-mono font-black text-red-400 mb-2">送出選手</h3>
              {tradeOffer.length === 0 ? (
                <p className="text-stone-500 text-sm">← ロスターから選択</p>
              ) : (
                <div className="space-y-1">
                  {tradeOffer.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm bg-stone-950 rounded p-2">
                      <span className="text-white">{p.name} ({(p.salary / 1000000).toFixed(1)}M)</span>
                      <button onClick={() => handleRemoveFromTradeOffer(p)} className="text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  <div className="text-xs font-mono text-stone-400 mt-1">合計: ${(tradeOffer.reduce((s, p) => s + p.salary, 0) / 1000000).toFixed(1)}M</div>
                </div>
              )}
            </div>
            <div className="bg-[#141210] border border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-mono font-black text-emerald-400 mb-2">獲得選手</h3>
              {tradeTarget ? (
                <div className="bg-stone-950 rounded p-2">
                  <span className="text-white text-sm">{tradeTarget.name}</span>
                  <span className="text-stone-400 text-xs ml-2">({(tradeTarget.salary / 1000000).toFixed(1)}M)</span>
                </div>
              ) : (
                <p className="text-stone-500 text-sm">← 市場から選択</p>
              )}
            </div>
            <div className="bg-[#141210] border border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-mono font-black text-amber-400 mb-2">判定</h3>
              {validation ? (
                <div className="space-y-1 text-sm">
                  <div>送出: <span className="text-white font-mono">${(validation.outgoing / 1000000).toFixed(1)}M</span></div>
                  <div>下限: <span className="text-amber-400 font-mono">${(validation.minIncoming / 1000000).toFixed(1)}M</span></div>
                  <div>上限: <span className="text-cyan-400 font-mono">${(validation.maxIncoming / 1000000).toFixed(1)}M</span></div>
                  <div>獲得: <span className="text-white font-mono">${(validation.incoming / 1000000).toFixed(1)}M</span></div>
                  <div className={validation.allowed ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>
                    {validation.allowed ? '✓ トレード成立' : `✗ ${validation.reason}`}
                  </div>
                </div>
              ) : (
                <p className="text-stone-500 text-sm">送出と獲得を選択してください</p>
              )}
              <button onClick={handleExecuteTrade} disabled={!validation?.allowed}
                className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-mono font-black py-2 rounded-lg text-sm">
                トレード実行
              </button>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl p-4 max-h-60 overflow-y-auto">
              <h3 className="text-xs font-mono font-black text-stone-400 mb-2">YOUR ROSTER（クリックで送出に追加）</h3>
              {roster.map(p => (
                <button key={p.id} onClick={() => handleAddToTradeOffer(p)}
                  className="w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between">
                  <span className="text-white">{p.name}</span>
                  <span className="text-stone-400">${(p.salary / 1000000).toFixed(1)}M</span>
                </button>
              ))}
            </div>
            <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl p-4 max-h-60 overflow-y-auto">
              <h3 className="text-xs font-mono font-black text-stone-400 mb-2">TRADE MARKET（クリックで獲得を選択）</h3>
              {tradeMarket.map(p => (
                <button key={p.id} onClick={() => handleSelectTradeTarget(p)}
                  className={'w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between ' + (tradeTarget?.id === p.id ? 'bg-cyan-950 border border-cyan-700' : '')}>
                  <span className="text-white">{p.name} (R{p.rating})</span>
                  <span className="text-stone-400">${(p.salary / 1000000).toFixed(1)}M</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ REROLL PHASE ═══
  if (phase === 'reroll') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} />
        <ConfettiOverlay active={showConfetti} />
        <div className="w-full max-w-5xl space-y-4">
          <div className="text-center space-y-2 mb-4">
            <span className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">👑 DYNASTY MODE</span>
            <h2 className="text-3xl font-black text-white">あなたの王朝を築け</h2>
            <p className="text-sm text-stone-400">満足のいくロスターが組めたら「START」を押してください</p>
          </div>
          <div className="flex gap-3 justify-center mb-4">
            <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-6 py-2.5 rounded-xl text-sm hover:bg-stone-850 transition-all">🔄 REROLL</button>
            <button onClick={() => { playClickSound(); setPhase('manage'); }} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black px-8 py-2.5 rounded-xl text-sm transition-all">START DYNASTY 💪</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black px-4 py-2.5 rounded-xl text-sm hover:text-stone-300 transition-all">← 戻る</button>
          </div>
          <RosterTable title="YOUR ROSTER" players={roster} onActionClick={() => {}} actionLabel="—" totalSalary={totalCapHit} dynastyMode />
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm text-stone-400 flex gap-6">
            <span>Total Rating: <span className="text-white font-black text-lg">{totalOvr}</span></span>
            <span>Cap Hit: <span className="text-cyan-400 font-black text-lg">${(totalCapHit / 1000000).toFixed(1)}M</span></span>
            <span>Players: <span className="text-white font-black">{roster.length}</span></span>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MANAGE PHASE ═══
  if (phase === 'manage') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <style>{`
          @keyframes dyToastIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes dyToastOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(120%); opacity: 0; }
          }
          @keyframes dyConfettiFall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          .animate-shake { animation: dyShake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
          @keyframes dyShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
        `}</style>
        <ToastContainer toasts={toasts} />
        <ConfettiOverlay active={showConfetti} />
        <SignModal />
        <div className={'w-full flex flex-col flex-1 justify-start ' + (screenShake ? 'animate-shake' : '')}>
          <Header />
          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 flex-1 items-stretch">
            <div className="w-full lg:w-[42%] space-y-4 flex flex-col justify-between">
              <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl p-5 space-y-3">
                <span className="text-sm font-mono font-black text-cyan-400 uppercase tracking-wider">TEAM STATUS</span>
                <div className="space-y-2">
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">📊 Cap Hit:</span>
                    <span className={totalCapHit <= DYN_CAP ? 'text-emerald-400 font-black text-3xl' : totalCapHit <= DYN_TAX ? 'text-amber-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>
                      ${(totalCapHit / 1000000).toFixed(1)}M <span className="text-lg text-stone-500 font-sans">/ ${(DYN_CAP / 1000000).toFixed(0)}M</span>
                    </span>
                  </div>

                  {mleAmount > 0 && (
                    <div className="bg-stone-950 px-4 py-2 rounded-xl border border-cyan-900/50 flex justify-between items-center">
                      <HoverTip text="Mid-Level Exception（MLE）：キャップ超過チームにも使える例外枠の補強予算。キャップ以下なら約$12.4M、1st Apron超えで約$5M、2nd Apron超えで没収。毎シーズン1回だけ使用可能。">
                        <span className="text-cyan-400 font-sans font-black text-sm">📋 MLE残額:</span>
                      </HoverTip>
                      <span className={mleUsed ? 'text-stone-500 font-black text-lg' : 'text-cyan-400 font-black text-lg'}>
                        {mleUsed ? '使用済み' : `$${(mleAmount / 1000000).toFixed(1)}M`}
                      </span>
                    </div>
                  )}

                  {repeaterSeasons >= 2 && (
                    <div className="bg-red-950/30 px-4 py-2 rounded-xl border border-red-900/50 flex justify-between items-center">
                      <span className="text-red-400 font-sans font-black text-sm">⚠️ Repeater:</span>
                      <span className="text-red-400 font-black text-sm">{repeaterSeasons}/3 seasons</span>
                    </div>
                  )}
                  {repeaterTax > 0 && (
                    <div className="bg-red-950/30 px-4 py-2 rounded-xl border border-red-900/50 flex justify-between items-center">
                      <span className="text-red-400 font-sans font-black text-sm">💸 Tax:</span>
                      <span className="text-red-400 font-black text-lg">${(repeaterTax / 1000000).toFixed(1)}M</span>
                    </div>
                  )}

                  {deadCap > 0 && (
                    <div className="bg-stone-950 px-4 py-2 rounded-xl border border-red-900/50">
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 font-sans font-black text-sm">💀 Dead Cap:</span>
                        <span className="text-red-400 font-black text-xl">${(deadCap / 1000000).toFixed(1)}M</span>
                      </div>
                      {deadCapDetails.map((d, i) => (
                        <div key={i} className="text-xs text-stone-500 mt-1 font-mono">{d.name}: ${(d.amount / 1000000).toFixed(1)}M × {d.yearsLeft}yr [{d.type}]</div>
                      ))}
                    </div>
                  )}
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">🔥 Total Rating:</span>
                    <span className={totalOvr >= minOvr ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>
                      {totalOvr} <span className="text-lg text-stone-500 font-sans">/ {minOvr}+</span>
                    </span>
                  </div>
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">👥 Players:</span>
                    <span className="text-white font-black text-2xl">{roster.length}</span>
                  </div>

                  <div className="bg-stone-950 px-4 py-2 rounded-xl border border-stone-850">
                    <HoverTip text="ドラフトピック：新人選手を指名する権利。Y=年、R=巡目。トレードやサイン・アンド・トレードで獲得できる。連続する2年の1巡目ピックを同時に放出することはできない（Stepien Rule）。">
                      <span className="text-stone-400 font-sans font-black text-sm">🏀 Draft Picks:</span>
                    </HoverTip>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {draftPicks.length === 0 ? (
                        <span className="text-stone-500 text-xs font-mono">なし</span>
                      ) : draftPicks.map((pk, i) => (
                        <HoverTip key={i} text={`ドラフトピック: ${pk.year}年目の${pk.round}巡目${pk.from ? `（${pk.from}から獲得）` : '（自チーム）'}`}>
                          <span className="text-xs font-mono bg-stone-900 px-1.5 py-0.5 rounded text-cyan-400 cursor-help">
                            Y{pk.year} R{pk.round}{pk.from ? ` (${pk.from})` : ''}
                          </span>
                        </HoverTip>
                      ))}
                    </div>
                  </div>
                </div>
                <SalaryMeter totalSalary={totalCapHit} capLevel={DYN_CAP} taxLevel={DYN_TAX} firstApron={DYN_APRON1} secondApron={DYN_APRON2} />
                <div className="flex flex-col gap-2">
                  <button onClick={handleNextSeason} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-3 rounded-xl text-sm tracking-widest transition-all">NEXT SEASON ➡️</button>
                  <button onClick={handleOpenTrade} className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-black py-3 rounded-xl text-sm tracking-widest transition-all">⚖️ TRADE MACHINE</button>
                </div>
              </section>
            </div>
            <div className="w-full lg:w-[58%] space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <RosterTable title="ROSTER" players={roster} totalSalary={totalCapHit} dynastyMode onWaiver={handleWaiver} onBuyout={handleBuyout} onStretch={handleStretch} />
                <RosterTable title="FREE AGENT" players={freeAgents} onActionClick={handleSignRequest} actionLabel="契約" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ═══ SEASON END PHASE ═══
  if (phase === 'seasonEnd') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} />
        <ConfettiOverlay active={showConfetti} />
        <SignTradeModal />
        <div className="w-full max-w-2xl space-y-6 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-3">
            <span className="text-xl font-mono font-black text-amber-400 uppercase tracking-widest">SEASON {season} COMPLETE</span>
            <h2 className="text-5xl font-black text-white">シーズン終了レポート</h2>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
            <h3 className="text-xl font-mono font-black text-cyan-400 uppercase">選手の経年変化</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {summaries.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xl py-1.5 px-3 rounded hover:bg-stone-900/50">
                  <span className="text-white font-bold">{s.name}</span>
                  <span className="font-mono">
                    <span className="text-stone-400">{s.oldRating}</span>
                    <span className="text-stone-600 mx-1">→</span>
                    <span className={s.change <= -2 ? 'text-red-400 font-black' : 'text-amber-400 font-black'}>{s.newRating}</span>
                    <span className="text-red-500 ml-2 text-lg">({s.change})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {expiredPlayers.length > 0 && (
            <div className="bg-stone-950 border border-amber-900/50 rounded-xl p-6 space-y-3">
              <h3 className="text-xl font-mono font-black text-amber-400 uppercase">契約切れ → FA移行</h3>
              {expiredPlayers.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xl py-1.5 px-3">
                  <div>
                    <span className="text-white font-bold">{p.name}</span>
                    <span className="text-stone-500 font-mono text-lg ml-2">Rating {p.rating}</span>
                  </div>
                  <HoverTip text="サイン・アンド・トレード（S&T）：FA選手と再契約してから即座に他チームへ放出。ドラフトピックを1つ獲得できる。3年以上の契約が必要。スターを逃さず補強素材に変換できる手段。">
                    <button onClick={() => handleSignAndTrade(p)} className="text-xs bg-amber-950/60 border border-amber-800 text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded font-mono whitespace-nowrap">S&T</button>
                  </HoverTip>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleToDraft} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">
            {optionPlayers.length > 0 ? 'OPTIONS → DRAFT' : 'DRAFT へ進む 🏀'}
          </button>
        </div>
      </div>
    );
  }

  // ═══ OPTION DECISION PHASE ═══
  if (phase === 'optionDecision') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} />
        <div className="w-full max-w-2xl space-y-4 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-2">
            <span className="text-xl font-mono font-black text-purple-400 uppercase tracking-widest">📋 CONTRACT OPTIONS</span>
            <h2 className="text-4xl font-black text-white">契約オプションの決定</h2>
          </div>
          <div className="space-y-3">
            {optionPlayers.map((p, i) => (
              <div key={i} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold text-lg">{p.name}</span>
                  <div className="flex items-center gap-3 mt-1 text-base">
                    <span className="text-amber-400 font-mono font-black">Rating {p.rating}</span>
                    <span className="text-stone-500">${(p.salary / 1000000).toFixed(1)}M</span>
                    <span className="text-purple-400 font-mono text-sm">
                      {p.optionType === 'player' ? 'Player Option' : 'Team Option'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOptionDecision(p, true)} className="bg-emerald-950 border border-emerald-700 text-emerald-400 hover:bg-emerald-900 font-mono font-black px-4 py-2 rounded-lg text-sm transition-all">行使</button>
                  <button onClick={() => handleOptionDecision(p, false)} className="bg-red-950 border border-red-700 text-red-400 hover:bg-red-900 font-mono font-black px-4 py-2 rounded-lg text-sm transition-all">拒否</button>
                </div>
              </div>
            ))}
          </div>
          {optionPlayers.length === 0 && (
            <button onClick={startDraft} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">DRAFT へ進む 🏀</button>
          )}
        </div>
      </div>
    );
  }

  // ═══ DRAFT PHASE ═══
  if (phase === 'draft') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} />
        <ConfettiOverlay active={showConfetti} />
        <div className="w-full max-w-3xl space-y-6 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-3">
            <span className="text-xl font-mono font-black text-cyan-400 uppercase tracking-widest">🏀 DRAFT</span>
            <h2 className="text-5xl font-black text-white">新人選手ドラフト</h2>
            <p className="text-xl text-stone-400">残りピック: <span className="text-cyan-400 font-black text-2xl">{picksLeft}</span></p>
          </div>
          {picksLeft > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {draftProspects.map((p, i) => (
                <div key={p.id} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center justify-between hover:border-cyan-800 transition-colors">
                  <div>
                    <span className="text-lg text-stone-500 font-mono mr-2">#{i + 1}</span>
                    <span className="text-white font-bold text-xl">{p.name}</span>
                    <div className="flex items-center gap-3 mt-1 text-lg">
                      <span className="text-amber-400 font-mono font-black">Rating {p.rating}</span>
                      <span className="text-stone-500">Age {p.age}</span>
                      <span className="text-cyan-400 font-mono">${(p.salary / 1000000).toFixed(1)}M / {p.contractYears}yr</span>
                    </div>
                  </div>
                  <button onClick={() => handleDraft(p)} className="bg-cyan-950 border border-cyan-700 text-cyan-400 hover:bg-cyan-900 font-mono font-black px-6 py-2 rounded-lg text-lg transition-all">DRAFT</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center space-y-4 py-8">
              <div className="text-emerald-400 font-mono font-black text-2xl">✓ ドラフト完了</div>
              <div className="text-xl text-stone-400">ロスター: {roster.length}人 / Total Rating: {totalOvr}</div>
              <button onClick={handleDraftComplete} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">新シーズン開始 🏀</button>
            </div>
          )}
          {picksLeft > 0 && (
            <button onClick={handleDraftComplete} className="w-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-3 rounded-xl text-lg transition-all">ドラフトをスキップ</button>
          )}
        </div>
      </div>
    );
  }

  // ═══ GAME OVER PHASE ═══
  if (phase === 'gameOver') {
    const score = calcGMScore();
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <div className="w-full max-w-2xl space-y-6 bg-[#110f0e] border border-red-900 rounded-3xl p-8 text-center">
          <div className="space-y-2">
            <span className="text-sm font-mono font-black text-red-400 uppercase tracking-widest">DYNASTY COLLAPSED</span>
            <h2 className="text-3xl font-black text-white">王朝崩壊</h2>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
            <div className="text-sm text-stone-400">存続期間</div>
            <div className="text-5xl font-black text-amber-400 font-mono">{Math.max(0, season - 1)} seasons</div>
            <div className="text-sm text-red-400 mt-2">{collapseReason}</div>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4">
            <div className="text-xs text-stone-500 font-mono">GM SCORE</div>
            <div className="text-4xl font-black text-yellow-400 font-mono">
              <AnimatedScore target={score} playClickSound={() => { try { playTone(800, 0.02, 'square', 0.03); } catch(e){} }} />
              <span className="text-lg text-stone-500 ml-1">pts</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { doReroll(); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black px-8 py-3 rounded-xl text-sm transition-all">TRY AGAIN 🔄</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black px-6 py-3 rounded-xl text-sm transition-all">タイトルに戻る</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
