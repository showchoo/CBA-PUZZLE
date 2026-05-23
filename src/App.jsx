import React, { useState, useEffect, useRef, useCallback } from 'react';
import SalaryMeter from './components/SalaryMeter';
import LeaderboardPage from './components/LeaderboardPage';
import DynastyView from './components/DynastyView';
import WaterTowerView from './components/water-tower/WaterTowerView'; /* ★追加 */
import { CBACoreEngine } from './data/cbaEngine';
import stagesData from './data/stages.json';

// ═══════════════════════════════════════════════
// Toast コンポーネント
// ═══════════════════════════════════════════════
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none" style={{ maxWidth: '400px' }}>
      {toasts.map((toast) => (
        <div key={toast.id}
          className="pointer-events-auto animate-toast-in"
          style={{
            animation: toast.exiting ? 'toastOut 0.4s ease forwards' : 'toastIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
          onAnimationEnd={() => { if (toast.exiting) onRemove(toast.id); }}
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

// ═══════════════════════════════════════════════
// 紙吹雪コンポーネント
// ═══════════════════════════════════════════════
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
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0.9,
        }} />
      ))}
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('title');
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const currentStage = stagesData[currentStageIdx];

  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [isCleared, setIsCleared] = useState(false);
  const [activeWarnings, setActiveWarnings] = useState([]);
  const [infoTab, setInfoTab] = useState('mission');

  const [cbaMetrics, setCbaMetrics] = useState({
    totalCapHit: 0, actualPayroll: 0, totalOvr: 0,
    regularContractCount: 0, twoWayCount: 0, status: "UNDER_CAP",
    totalRating: 0, hasStar: false, deadCapHit: 0, draftPicks: 0,
    apronStatus: "UNDER", mleRemaining: 0, mleUsedThisSeason: false,
    repeaterTaxActive: false, violations: []
  });

  const [gmName, setGmName] = useState('');
  const [isBgmOn, setIsBgmOn] = useState(false);
  const [deadCap, setDeadCap] = useState([]);
  const [draftPicks, setDraftPicks] = useState(0);
  const [taxHistory, setTaxHistory] = useState([]);
  const [mleUsedThisSeason, setMleUsedThisSeason] = useState(false);
  const [useMle, setUseMle] = useState(false);
  const [tradeModalTarget, setTradeModalTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [showClearScreen, setShowClearScreen] = useState(false);

  const fmt = (v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0/, '')}M` : `$${v.toLocaleString()}`;

  // ═══════════════════════════════════════
  // Toast システム
  // ═══════════════════════════════════════
  const toastCounter = useRef(0);
  const addToast = useCallback((type, icon, title, message, duration = 3000) => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, icon, title, message, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ═══════════════════════════════════════
  // エフェクトトリガー
  // ═══════════════════════════════════════
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  }, []);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 600);
  }, []);

  // ═══════════════════════════════════════
  // オーディオシステム
  // ═══════════════════════════════════════
  const ctxRef = useRef(null);
  const bgmStartedRef = useRef(false);
  const bgmGainRef = useRef(null);
  const sparkleTimerRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const playTone = (freq, duration = 0.15, type = 'sine', vol = 0.08, delay = 0) => {
    try {
      const ctx = getCtx(); const now = ctx.currentTime + delay;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + duration + 0.01);
    } catch (e) {}
  };

  const playClickSound = () => {
    playTone(1200, 0.04, 'sine', 0.06);
  };

  const playStartSound = () => {
    try {
      const ctx = getCtx(); const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.7);
      });
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

  const playWarningSound = () => {
    playTone(110, 0.5, 'sawtooth', 0.06);
    playTone(116.54, 0.5, 'sawtooth', 0.05, 0.01);
  };

  const playErrorSound = () => {
    playTone(200, 0.2, 'square', 0.06);
    playTone(190, 0.2, 'square', 0.06, 0.15);
  };

  const playOptionSound = () => {
    playTone(1000, 0.06, 'square', 0.05);
    playTone(1400, 0.1, 'sine', 0.07, 0.06);
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

  const playDraftPickSound = () => {
    [880, 1108.73, 1318.51, 1760].forEach((f, i) => {
      playTone(f, 0.2, 'sine', 0.04, i * 0.08);
    });
  };

  const startBGM = () => {
    if (bgmStartedRef.current) return;
    bgmStartedRef.current = true;
    try {
      const ctx = getCtx(); const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now); master.gain.linearRampToValueAtTime(1, now + 3);
      master.connect(ctx.destination); bgmGainRef.current = master;
      [[65.41, 0.06], [65.81, 0.04]].forEach(([f, v]) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, now); g.gain.setValueAtTime(v, now);
        o.connect(g); g.connect(master); o.start(now);
      });
      [130.81, 164.81, 196.00, 246.94].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, now); g.gain.setValueAtTime(0.018, now);
        const l = ctx.createOscillator(); const lg = ctx.createGain();
        l.type = 'sine'; l.frequency.setValueAtTime(0.04 + i * 0.015, now);
        lg.gain.setValueAtTime(0.006, now); l.connect(lg); lg.connect(g.gain); l.start(now);
        o.connect(g); g.connect(master); o.start(now);
      });
      const notes = [523.25, 659.25, 783.99, 880.00, 1046.50];
      function sparkle() {
        if (!bgmStartedRef.current) return;
        try {
          const n = notes[Math.floor(Math.random() * notes.length)];
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(n, ctx.currentTime);
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.8);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
          o.connect(g); g.connect(master); o.start(ctx.currentTime); o.stop(ctx.currentTime + 4.5);
        } catch (e) {}
        sparkleTimerRef.current = setTimeout(sparkle, 3000 + Math.random() * 6000);
      }
      sparkleTimerRef.current = setTimeout(sparkle, 2000);
    } catch (e) {}
  };

  const stopBGM = () => {
    bgmStartedRef.current = false;
    if (sparkleTimerRef.current) { clearTimeout(sparkleTimerRef.current); sparkleTimerRef.current = null; }
    if (ctxRef.current && ctxRef.current.state !== 'closed') { try { ctxRef.current.close(); } catch (e) {} }
    ctxRef.current = null; bgmGainRef.current = null;
  };

  const toggleBGM = () => {
    if (isBgmOn) { stopBGM(); setIsBgmOn(false); }
    else { startBGM(); setIsBgmOn(true); }
  };

  // ═══════════════════════════════════════
  // ステージ初期化
  // ═══════════════════════════════════════
  useEffect(() => {
    if (currentStage) {
      setRoster(currentStage.initialRoster);
      setFreeAgents(currentStage.initialFreeAgents);
      setIsCleared(false);
      setActiveWarnings([]);
      setInfoTab('mission');
      setDeadCap([]);
      setDraftPicks(currentStage.initialDraftPicks || 0);
      setUseMle(false);
      setMleUsedThisSeason(false);
      setTaxHistory(currentStage.taxHistoryInitial || []);
      setTradeModalTarget(null);
      setShowConfetti(false);
      setShowClearScreen(false);
    }
  }, [currentStageIdx]);

  // ═══════════════════════════════════════
  // メトリクス評価
  // ═══════════════════════════════════════
  const wasClearedRef = useRef(false);

  useEffect(() => {
    if (!currentStage || currentView !== 'game') return;

    const metrics = CBACoreEngine.evaluate(roster, null, null, {
      deadCap,
      features: currentStage.features || {},
      draftPicks,
      taxHistory,
      mleUsedThisSeason,
      minPlayers: currentStage.conditions.minPlayers || 14,
    });
    setCbaMetrics(metrics);

    const warnings = [...metrics.violations];
    if (metrics.status === "LUXURY_TAX") warnings.push({ label: "💸 贅沢税発生中", text: "ラインを超える額が多ければ多いほど、オーナーの罰金が指数関数的に跳ね上がります！" });
    if (metrics.status === "FIRST_APRON") warnings.push({ label: "⚠️ 第1エプロン突破", text: "トレードで獲得する選手の年俸を、出す選手以下に抑える必要があります。" });
    if (metrics.status === "SECOND_APRON") warnings.push({ label: "🔥 第2エプロン突破", text: "MLE没収、トレード制限強化！" });
    setActiveWarnings(warnings);

    let ok = metrics.totalCapHit <= currentStage.conditions.maxSalary
      && metrics.totalRating >= (currentStage.conditions.minTotalRating || 0)
      && (currentStage.conditions.mustHaveStar ? metrics.hasStar : true)
      && metrics.violations.length === 0
      && metrics.regularContractCount >= (currentStage.conditions.minPlayers || 0)
      && (currentStage.conditions.minDraftPicks ? metrics.draftPicks >= currentStage.conditions.minDraftPicks : true);

    if (ok && !wasClearedRef.current) {
      wasClearedRef.current = true;
      setIsCleared(true);
      setShowClearScreen(true);
      playEpicSound();
      triggerConfetti();
      addToast('epic', '🏆', 'MISSION ACCOMPLISHED!', '全CBA規約をクリア！見事なマネージメントです', 5000);
    } else if (!ok) {
      wasClearedRef.current = false;
      setIsCleared(false);
    }
  }, [roster, currentStage, currentView, deadCap, draftPicks, mleUsedThisSeason, infoTab, activeWarnings.length]);

  // ═══════════════════════════════════════
  // ハンドラー群
  // ═══════════════════════════════════════

  const handleWaiver = (player) => {
    playClickSound();
    const features = currentStage.features || {};
    if (features.deadCap) {
      const entries = Array.from({ length: player.contractYears || 1 }, (_, i) => ({
        id: `dc_${player.id}_${i}`,
        label: `ウェイブ: ${player.name}`,
        salary: player.salary,
        yearsRemaining: (player.contractYears || 1) - i,
        source: 'waiver'
      }));
      setDeadCap(prev => [...prev, ...entries]);
      setRoster(roster.filter(p => p.id !== player.id));
      playReleaseSound();
      addToast('warning', '💀', `ウェイブ: ${player.name}`,
        `デッドキャップ ${fmt(player.salary)}/年 × ${player.contractYears}年 発生`, 4000);
    } else {
      setRoster(roster.filter(p => p.id !== player.id));
      setFreeAgents([...freeAgents, player]);
      playReleaseSound();
      addToast('info', '📤', `${player.name} を放出`, 'FA市場に移動しました', 2500);
    }
  };

  const handleBuyout = (player) => {
    playClickSound();
    const result = CBACoreEngine.executeBuyout(player);
    setDeadCap(prev => [...prev, ...result.deadCapEntries]);
    setRoster(roster.filter(p => p.id !== player.id));
    playBuyoutSound();
    const totalSaved = player.salary * player.contractYears - result.deadCapEntries.reduce((s, d) => s + d.salary, 0);
    addToast('success', '🤝', `バイアウト成功: ${player.name}`,
      `契約${(result.rate * 100).toFixed(0)}%に軽減 | ${fmt(totalSaved)}節約`, 4500);
  };

  const handleStretch = (player) => {
    playClickSound();
    const result = CBACoreEngine.executeStretch(player);
    setDeadCap(prev => [...prev, ...result.deadCapEntries]);
    setRoster(roster.filter(p => p.id !== player.id));
    playBuyoutSound();
    const annual = result.deadCapEntries[0]?.salary || 0;
    addToast('success', '⏳', `ストレッチ条項: ${player.name}`,
      `${result.stretchYears}年分割 | ${fmt(annual)}/年`, 4500);
  };

  const handlePlayerOption = (player, exercise) => {
    playClickSound();
    playOptionSound();
    if (exercise) {
      addToast('info', '📋', `PO行使: ${player.name}`,
        `${fmt(player.salary)}で契約延長`, 3000);
    } else {
      setRoster(roster.filter(p => p.id !== player.id));
      setFreeAgents([...freeAgents, { ...player, faStatus: "UFA", optionType: null }]);
      addToast('warning', '🏃', `PO拒否: ${player.name}`,
        'FA市場へ移動。再契約を検討してください', 3500);
    }
  };

  const handleTeamOption = (player, exercise) => {
    playClickSound();
    playOptionSound();
    if (exercise) {
      addToast('success', '📋', `TO行使: ${player.name}`,
        `${fmt(player.salary)}で契約延長`, 3000);
    } else {
      setRoster(roster.filter(p => p.id !== player.id));
      addToast('info', '✂️', `TO拒否: ${player.name}`,
        '契約を終了。キャップに余裕が生まれました', 3000);
    }
  };

  const handleSignFA = (player) => {
    playClickSound();
    if (useMle) {
      const check = CBACoreEngine.canUseMLE(player.salary, cbaMetrics.mleRemaining, cbaMetrics.apronStatus);
      if (!check.allowed) { playErrorSound(); triggerShake(); addToast('warning', '❌', 'MLE使用不可', check.message, 4000); return; }
      setMleUsedThisSeason(true);
      setUseMle(false);
      playMLESound();
      addToast('info', '📋', `MLE契約: ${player.name}`,
        `例外枠で${fmt(player.salary)}契約`, 3500);
    } else {
      const m = CBACoreEngine.evaluate(roster, null, player, {
        deadCap, features: currentStage.features || {},
        draftPicks, taxHistory, mleUsedThisSeason,
        minPlayers: currentStage.conditions.minPlayers || 14,
      });
      if (!m.tradeCheck.allowed) { playErrorSound(); triggerShake(); addToast('warning', '❌', '契約不可', m.tradeCheck.message, 4000); return; }
      playSuccessSound();
      addToast('success', '✍️', `契約: ${player.name}`,
        `R${player.rating} | ${fmt(player.salary)}/年`, 3000);
    }
    setFreeAgents(freeAgents.filter(p => p.id !== player.id));
    setRoster([...roster, player]);
  };

  const handleTrade = (rosterPlayer) => {
    playClickSound();
    const faPlayer = tradeModalTarget;
    const m = CBACoreEngine.evaluate(roster, rosterPlayer, faPlayer, {
      deadCap, features: currentStage.features || {},
      draftPicks, taxHistory, mleUsedThisSeason,
      minPlayers: currentStage.conditions.minPlayers || 14,
    });
    if (!m.tradeCheck.allowed) { playErrorSound(); triggerShake(); addToast('warning', '❌', 'トレード不可', m.tradeCheck.message, 4000); return; }
    setRoster(roster.map(p => p.id === rosterPlayer.id ? { ...faPlayer, contractYears: faPlayer.contractYears || 2 } : p));
    setFreeAgents(freeAgents.filter(p => p.id !== faPlayer.id));
    setTradeModalTarget(null);
    playTradeSound();
    triggerConfetti();
    addToast('trade', '🤝', 'トレード成立!',
      `${rosterPlayer.name} → ${faPlayer.name} (R${faPlayer.rating})`, 4500);
  };

  const handleSignAndTrade = (player) => {
    playClickSound();
    const v = CBACoreEngine.validateSignAndTrade(player, 3);
    if (!v.allowed) { playErrorSound(); triggerShake(); addToast('warning', '❌', 'S&T不可', v.message, 4000); return; }
    setRoster(roster.filter(p => p.id !== player.id));
    setDraftPicks(prev => prev + 1);
    playSTSound();
    triggerConfetti();
    addToast('epic', '🔄', `S&T成功: ${player.name}`,
      `ドラフトピック+1獲得！将来の戦力に期待`, 5000);
  };

  const handleNextStage = () => {
    playClickSound();
    wasClearedRef.current = false;
    if (currentStageIdx < stagesData.length - 1) {
      setCurrentStageIdx(currentStageIdx + 1);
      playStartSound();
      addToast('info', '➡️', `STAGE ${String(currentStageIdx + 2).padStart(2, '0')}`, stagesData[currentStageIdx + 1]?.title || '', 3000);
    } else {
      playEpicSound();
      triggerConfetti();
      addToast('epic', '👑', 'ALL STAGES CLEAR!', '全ステージクリア！CBAマスターです！', 6000);
    }
  };

  const handleRestartStage = () => {
    playClickSound();
    wasClearedRef.current = false;
    setShowClearScreen(false);
    setRoster(currentStage.initialRoster);
    setFreeAgents(currentStage.initialFreeAgents);
    setDeadCap([]);
    setDraftPicks(currentStage.initialDraftPicks || 0);
    setUseMle(false);
    setMleUsedThisSeason(false);
    setTaxHistory(currentStage.taxHistoryInitial || []);
    setIsCleared(false);
    setActiveWarnings([]);
  };

  const getBadges = (player) => {
    const badges = [];
    if (player.birdRights === "Full") badges.push({ text: "🐦", title: "Full Bird Rights", color: "bg-blue-900 text-blue-300" });
    if (player.contractType === "twoway") badges.push({ text: "2W", title: "Two-Way", color: "bg-purple-900 text-purple-300" });
    if (player.contractType === "minimum") badges.push({ text: "MIN", title: "Minimum", color: "bg-orange-900 text-orange-300" });
    if (player.optionType === "player") badges.push({ text: "PO", title: "Player Option", color: "bg-yellow-900 text-yellow-300" });
    if (player.optionType === "team") badges.push({ text: "TO", title: "Team Option", color: "bg-yellow-900 text-yellow-300" });
    if (CBACoreEngine.isSupermaxEligible(player)) badges.push({ text: "SMAX", title: "Supermax Eligible", color: "bg-amber-900 text-amber-300" });
    return badges;
  };

  const features = currentStage?.features || {};

  // ═══════════════════════════════════════
  // JSX
  // ═══════════════════════════════════════
  return (
    <div className={
      'min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center ' +
      (screenShake ? 'animate-shake' : '')
    }>
      {/* グローバルCSS */}
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(120%); opacity: 0; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(34, 211, 238, 0.3); }
          50% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.6); }
        }
        @keyframes epicGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(232, 197, 71, 0.3); }
          50% { box-shadow: 0 0 30px rgba(232, 197, 71, 0.8); }
        }
        .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-pulse-glow { animation: pulseGlow 2s ease infinite; }
        .animate-epic-glow { animation: epicGlow 1.5s ease infinite; }
      `}</style>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfettiOverlay active={showConfetti} />

      {/* クリアスタンプオーバーレイ */}
      {showClearScreen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div
                className="text-[120px] md:text-[160px] font-black font-mono text-emerald-400 tracking-widest select-none opacity-90 rotate-[-12deg]"
                style={{ textShadow: '0 0 60px rgba(52,211,153,0.4), 0 0 120px rgba(52,211,153,0.15)' }}
              >
                CLEAR
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-mono text-emerald-300 tracking-[0.4em] whitespace-nowrap">
                STAGE {String(currentStage?.id || 1).padStart(2, "0")} MISSION COMPLETE
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRestartStage} className="bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black px-6 py-3 rounded-xl text-sm transition-all">
                🔄 もう一度挑戦
              </button>
              <button onClick={() => { playClickSound(); setShowClearScreen(false); }} className="bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black px-6 py-3 rounded-xl text-sm transition-all">
                📋 ロスター確認
              </button>
              <button onClick={() => { handleNextStage(); setShowClearScreen(false); }} className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-stone-950 font-mono font-black px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20">
                OK ▶ 次のステージへ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ タイトル画面 ═══ */}
      {currentView === 'title' && (
        <div className="w-full max-w-2xl text-center space-y-8 py-12 px-8 bg-[#110f0e] border border-stone-850 rounded-3xl shadow-2xl font-mono animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse"></div>
          <div className="space-y-3">
            <div className="inline-block bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 text-xs font-black px-4 py-1.5 rounded-full tracking-widest uppercase">🚀 SYSTEM ONLINE // VER 2026.5</div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-200 to-stone-500 uppercase pt-2">CRUNCH THE CAP</h1>
            <p className="text-sm font-bold tracking-widest text-cyan-500 uppercase">Pro Basketball Salary Cap Simulation</p>
          </div>
          <div className="border-t border-b border-stone-900 py-4 text-left font-sans text-stone-400 text-sm leading-relaxed max-w-md mx-auto font-medium space-y-2">
            <p>「勝つためにスターを並べろ。ただし、1ドルでも規約を超えればチームを剥奪する。」</p>
            <p>プロバスケットボール界の鬼畜な裏法律『労使協定』の隙間を突き、最強ロスターを構築する、大人の数字パズルシミュレーター。</p>
          </div>
          <div className="max-w-xs mx-auto">
            <input type="text" placeholder="GMネームを入力..." value={gmName} onChange={(e) => setGmName(e.target.value)} maxLength={15} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold text-center" />
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button onClick={() => { playStartSound(); startBGM(); setIsBgmOn(true); setCurrentView('game'); }} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 text-base font-black px-8 py-3.5 rounded-xl transition-all tracking-widest shadow-lg shadow-cyan-950/50 hover:scale-[1.02] active:scale-[0.98]">STAGES 💼</button>
            <button onClick={() => { playStartSound(); startBGM(); setIsBgmOn(true); setCurrentView('dynasty'); }} className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 text-base font-black px-8 py-3.5 rounded-xl transition-all tracking-widest shadow-lg shadow-amber-950/50 hover:scale-[1.02] active:scale-[0.98]">DYNASTY 👑</button>
            <button onClick={() => { playStartSound(); startBGM(); setIsBgmOn(true); setCurrentView('watertower'); }} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 text-base font-black px-8 py-3.5 rounded-xl transition-all tracking-widest shadow-lg shadow-cyan-950/50 hover:scale-[1.02] active:scale-[0.98]">WATER TOWER 💧</button>
            <button onClick={() => { playClickSound(); setCurrentView('leaderboard'); }} className="w-full sm:w-auto bg-stone-900 border border-stone-800 hover:bg-stone-850 text-stone-300 text-sm font-black px-6 py-3.5 rounded-xl transition-all tracking-wider">RANK 🏆</button>
          </div>
          <div className="text-[10px] text-stone-600 pt-4 font-mono uppercase tracking-widest">Developed by Stark Games</div>
        </div>
      )}

      {/* ═══ 王朝モード ═══ */}
      {currentView === 'dynasty' && (
        <DynastyView onBack={() => { playClickSound(); setCurrentView('title'); }} gmName={gmName} playClickSound={playClickSound} isBgmOn={isBgmOn} toggleBGM={toggleBGM} />
      )}

      {/* ═══ ウォータータワーモード ═══ */}
      {currentView === 'watertower' && (
        <WaterTowerView onBack={() => { playClickSound(); setCurrentView('title'); }} gmName={gmName} playClickSound={playClickSound} isBgmOn={isBgmOn} toggleBGM={toggleBGM} />
      )}

      {/* ═══ ランキング画面 ═══ */}
      {currentView === 'leaderboard' && (
        <div className="w-full flex flex-col flex-1 justify-start">
          <header className="w-full max-w-7xl mx-auto mb-2 border-b border-stone-800 pb-3 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
            <div className="cursor-pointer" onClick={() => { playClickSound(); setCurrentView('title'); }}>
              <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">CRUNCH THE CAP</h1>
              <p className="text-sm text-stone-400 mt-0.5 font-mono tracking-wider">Pro Basketball Salary Cap Simulation</p>
            </div>
            <div className="flex bg-stone-950 p-1.5 rounded-xl border border-stone-850 font-mono text-sm font-black">
              <button onClick={() => { playClickSound(); setCurrentView('title'); }} className="px-4 py-2.5 text-stone-500 hover:text-stone-300 rounded-lg transition-all">🏠</button>
              <button onClick={() => { playClickSound(); setCurrentView('game'); }} className="px-5 py-2.5 rounded-lg transition-all text-stone-400 hover:text-white">🎮</button>
              <button onClick={() => { playClickSound(); setCurrentView('leaderboard'); }} className="px-5 py-2.5 rounded-lg transition-all bg-amber-500 text-stone-950 shadow-lg">🏆</button>
              <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-3 py-2.5 rounded-lg transition-all ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
            </div>
          </header>
          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 flex-1 items-stretch">
            <div className="w-full"><LeaderboardPage /></div>
          </main>
        </div>
      )}

      {/* ═══ ステージゲーム画面 ═══ */}
      {currentView === 'game' && (
        <div className="w-full flex flex-col flex-1 justify-start">
          <header className="w-full max-w-7xl mx-auto mb-2 border-b border-stone-800 pb-3 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
            <div className="cursor-pointer" onClick={() => { playClickSound(); setCurrentView('title'); }}>
              <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">CRUNCH THE CAP</h1>
              <p className="text-sm text-stone-400 mt-0.5 font-mono tracking-wider">Pro Basketball Salary Cap Simulation</p>
            </div>
            <div className="flex bg-stone-950 p-1.5 rounded-xl border border-stone-850 font-mono text-sm font-black">
              <button onClick={() => { playClickSound(); setCurrentView('title'); }} className="px-4 py-2.5 text-stone-500 hover:text-stone-300 rounded-lg transition-all">🏠</button>
              <button onClick={() => { playClickSound(); setCurrentView('game'); }} className="px-5 py-2.5 rounded-lg transition-all bg-cyan-500 text-stone-950 shadow-lg">🎮</button>
              <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-3 py-2.5 rounded-lg transition-all ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
            </div>
          </header>

          <div className="w-full max-w-7xl mx-auto mb-3 shrink-0 flex flex-wrap justify-center gap-2">
            {stagesData.map((stage, idx) => (
              <button key={stage.id} onClick={() => { playClickSound(); setCurrentStageIdx(idx); }}
                className={'px-4 py-2 text-xs font-mono font-black rounded border transition-all ' + (idx === currentStageIdx ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-950/50' : 'bg-stone-900 border-stone-800 text-white hover:bg-stone-850')}>
                {String(stage.id).padStart(2, '0')}
              </button>
            ))}
          </div>

          {tradeModalTarget && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setTradeModalTarget(null)}>
              <div className="bg-[#141210] border border-stone-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-amber-400 font-mono mb-1">⚖️ トレード</h3>
                <p className="text-sm text-stone-400 mb-4">獲得: <span className="text-white font-bold">{tradeModalTarget.name}</span> ({fmt(tradeModalTarget.salary)})</p>
                <p className="text-xs text-stone-500 mb-3 font-mono">放出する選手を選択してください（75%〜125%ルール適用）</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {roster.filter(p => p.contractType !== 'twoway').map(p => {
                    const minIn = Math.floor(tradeModalTarget.salary * 0.75);
                    const maxIn = Math.floor(tradeModalTarget.salary * 1.25 + 100000);
                    const inRange = p.salary >= minIn && p.salary <= maxIn;
                    return (
                      <button key={p.id} onClick={() => handleTrade(p)} disabled={!inRange}
                        className={'w-full flex justify-between items-center px-4 py-3 rounded-lg border transition-all text-left ' + (inRange ? 'bg-stone-900 border-stone-700 hover:border-amber-500 hover:bg-stone-850' : 'bg-stone-950 border-stone-900 opacity-40 cursor-not-allowed')}>
                        <div>
                          <span className="text-white font-bold text-sm">{p.name}</span>
                          <span className="text-stone-500 text-xs ml-2">R{p.rating}</span>
                        </div>
                        <span className={inRange ? 'text-amber-400 font-mono font-black' : 'text-red-500 font-mono font-black'}>{fmt(p.salary)}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setTradeModalTarget(null)} className="w-full mt-4 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-bold py-2.5 rounded-lg transition-all">キャンセル</button>
              </div>
            </div>
          )}

          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 flex-1 items-stretch">
            <div className="w-full lg:w-[42%] space-y-4 flex flex-col justify-between">
              <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col flex-1 min-h-[420px]">
                <div className="flex bg-stone-950/80 border-b border-stone-850 p-1.5 rounded-t-xl font-mono text-sm font-black">
                  <button onClick={() => { playClickSound(); setInfoTab('mission'); }} className={'flex-1 py-2 rounded-lg transition-all ' + (infoTab === 'mission' ? 'bg-stone-900 text-cyan-400 border border-stone-800' : 'text-stone-400 hover:text-stone-200')}>🎯 MISSION</button>
                  <button onClick={() => { playClickSound(); setInfoTab('rule'); }} className={'flex-1 py-2 rounded-lg transition-all ' + (infoTab === 'rule' ? 'bg-stone-900 text-blue-400 border border-stone-800' : 'text-stone-400 hover:text-stone-200')}>📖 RULE</button>
                  <button onClick={() => { playClickSound(); setInfoTab('warning'); }} className={'flex-1 py-2 rounded-lg transition-all relative ' + (infoTab === 'warning' ? 'bg-stone-900 text-red-400 border border-stone-800' : 'text-stone-400 hover:text-stone-200')}>🚨 WARNINGS{activeWarnings.length > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>}</button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto">
                  {infoTab === 'mission' && (
                    <div className="space-y-3 animate-fade-in">
                      <span className="text-sm font-mono font-black text-cyan-400 tracking-wider block uppercase">CURRENT MISSION</span>
                      <h2 className="text-2xl font-black text-white tracking-wide">{currentStage?.title}</h2>
                      <p className="text-base text-stone-200 font-bold leading-relaxed pt-1">{currentStage?.description}</p>
                    </div>
                  )}
                  {infoTab === 'rule' && (
                    <div className="space-y-3 animate-fade-in">
                      <span className="text-sm font-mono font-black text-blue-400 tracking-wider block uppercase">CBA MANUAL</span>
                      <h2 className="text-xl font-black text-white tracking-wide">{currentStage?.ruleExplanation?.title}</h2>
                      <p className="text-base text-stone-100 font-bold leading-relaxed bg-stone-950/50 p-4 rounded-xl border border-stone-900 mt-2">{currentStage?.ruleExplanation?.text}</p>
                    </div>
                  )}
                  {infoTab === 'warning' && (
                    <div className={'space-y-3 ' + (activeWarnings.length > 0 ? 'animate-[pulse_3s_infinite]' : '')}>
                      <span className="text-sm font-mono font-black text-red-500 tracking-widest block uppercase">REGULATORY STATUS</span>
                      {activeWarnings.length === 0 ? (
                        <div className="text-emerald-400 font-bold text-base py-6 text-center bg-stone-950/40 rounded-xl border border-stone-900">✓ すべてのCBA規約を完全遵守しています。</div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {activeWarnings.map((w, i) => (
                            <div key={i} className="bg-stone-950 border border-stone-900 p-4 rounded-xl border-l-4 border-l-red-500">
                              <h4 className="text-base font-black text-red-400 font-mono uppercase tracking-wide">{w.label}</h4>
                              <p className="text-base text-white mt-1.5 leading-relaxed font-sans font-extrabold">{w.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 text-base p-4 border-t border-stone-900 font-mono bg-stone-950/40 rounded-b-xl">
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">📊 Cap Hit:</span>
                    <span className={cbaMetrics.totalCapHit <= currentStage?.conditions.maxSalary ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>{fmt(cbaMetrics.totalCapHit)} <span className="text-lg text-stone-500 font-sans">/ {fmt(currentStage?.conditions.maxSalary)}</span></span>
                  </div>
                  {deadCap.length > 0 && (
                    <div className="bg-red-950/30 px-4 py-2.5 rounded-xl border border-red-900/50 flex justify-between items-center">
                      <span className="text-red-400 font-sans font-black text-sm">💀 Dead Cap:</span>
                      <span className="text-red-400 font-black text-2xl">{fmt(cbaMetrics.deadCapHit || deadCap.reduce((s, d) => s + d.salary, 0))}</span>
                    </div>
                  )}
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">💸 Real Payroll:</span>
                    <span className="text-amber-400 font-black text-3xl">{fmt(cbaMetrics.actualPayroll)}</span>
                  </div>
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">🔥 Total Rating:</span>
                    <span className={cbaMetrics.totalRating >= currentStage?.conditions.minTotalRating ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>{cbaMetrics.totalRating} <span className="text-lg text-stone-500 font-sans">/ {currentStage?.conditions.minTotalRating}+</span></span>
                  </div>
                  {currentStage?.conditions.minDraftPicks > 0 && (
                    <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                      <span className="text-stone-400 font-sans font-black text-sm">🎫 Draft Picks:</span>
                      <span className={draftPicks >= currentStage.conditions.minDraftPicks ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>{draftPicks} <span className="text-lg text-stone-500 font-sans">/ {currentStage.conditions.minDraftPicks}+</span></span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-center text-sm font-sans font-bold pt-0.5">
                    <div className="bg-stone-900 py-2 rounded-lg border border-stone-800">Regular: <span className="text-cyan-400 font-mono font-black text-2xl">{cbaMetrics.regularContractCount}</span></div>
                    <div className="bg-stone-900 py-2 rounded-lg border border-stone-800">Two-Way: <span className="text-purple-400 font-mono font-black text-2xl">{cbaMetrics.twoWayCount}</span></div>
                  </div>
                  {features.mle && !mleUsedThisSeason && cbaMetrics.mleRemaining > 0 && (
                    <label className="flex items-center gap-3 bg-blue-950/40 px-4 py-2.5 rounded-xl border border-blue-900/50 cursor-pointer hover:bg-blue-950/60 transition-all">
                      <input type="checkbox" checked={useMle} onChange={() => setUseMle(!useMle)} className="w-4 h-4 accent-blue-500" />
                      <span className="text-blue-300 font-sans font-black text-sm">MLE使用（残額: {fmt(cbaMetrics.mleRemaining)}）</span>
                    </label>
                  )}
                  {mleUsedThisSeason && (
                    <div className="bg-stone-900 px-4 py-2 rounded-xl border border-stone-800 text-stone-500 font-sans font-bold text-xs text-center">MLE: 今シーズン使用済み</div>
                  )}
                  <div className="pt-2"><SalaryMeter totalSalary={cbaMetrics.totalCapHit} /></div>
                </div>
              </section>

              {isCleared && (
                <div className="bg-gradient-to-r from-emerald-950 to-stone-900 border-2 border-emerald-500 rounded-xl p-5 shadow-2xl space-y-3 shrink-0 animate-epic-glow">
                  <div className="flex justify-between items-center border-b border-emerald-900 pb-2">
                    <h3 className="text-base font-black text-emerald-400 font-mono uppercase">✓ MISSION ACCOMPLISHED</h3>
                    <span className="text-lg font-black text-yellow-400 font-mono">CLEAR</span>
                  </div>
                  <button onClick={handleNextStage} className="w-full bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-sm font-mono font-black py-2.5 px-6 rounded-lg transition-colors shadow-md">NEXT MISSION ➡️</button>
                </div>
              )}
            </div>

            <div className="w-full lg:w-[58%] space-y-4 flex flex-col">
              <div className="flex flex-col gap-4 flex-1">
                <div className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex-1 flex flex-col overflow-hidden">
                  <div className="px-5 py-3 border-b border-stone-850 flex justify-between items-center bg-stone-950/50">
                    <h3 className="font-mono text-sm font-black text-cyan-400 tracking-wider">📋 CURRENT ROSTER</h3>
                    <span className="text-stone-500 font-mono text-xs">{roster.length}人</span>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-stone-500 text-xs font-mono border-b border-stone-900">
                          <th className="text-left px-5 py-2">NAME</th>
                          <th className="text-center px-2 py-2">EXP</th>
                          <th className="text-center px-2 py-2">OVR</th>
                          <th className="text-right px-2 py-2">SALARY</th>
                          <th className="text-center px-2 py-2">-</th>
                          <th className="text-center px-5 py-2">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map(player => (
                          <tr key={player.id} className="border-b border-stone-900/50 hover:bg-stone-900/30 transition-colors">
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-sm truncate max-w-[120px]">{player.name}</span>
                                {getBadges(player).map((b, i) => (
                                  <span key={i} title={b.title} className={'text-[9px] font-mono font-black px-1.5 py-0.5 rounded ' + b.color}>{b.text}</span>
                                ))}
                              </div>
                            </td>
                            <td className="text-center text-stone-400 font-mono text-xs">{player.experience}yr</td>
                            <td className="text-center font-mono font-black text-base text-white">{player.rating}</td>
                            <td className="text-right font-mono font-black text-amber-400 text-sm">{fmt(player.salary)}</td>
                            <td className="text-center text-stone-600 text-[10px] font-mono">{player.contractYears}yr</td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1 justify-end flex-wrap">
                                {player.optionType === "player" && (
                                  <>
                                    <button onClick={() => handlePlayerOption(player, true)} className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-[10px] font-mono font-black rounded transition-all">PO:行使</button>
                                    <button onClick={() => handlePlayerOption(player, false)} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 text-[10px] font-mono font-black rounded transition-all">PO:拒否</button>
                                  </>
                                )}
                                {player.optionType === "team" && (
                                  <>
                                    <button onClick={() => handleTeamOption(player, true)} className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-[10px] font-mono font-black rounded transition-all">TO:行使</button>
                                    <button onClick={() => handleTeamOption(player, false)} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 text-[10px] font-mono font-black rounded transition-all">TO:拒否</button>
                                  </>
                                )}
                                {features.signAndTrade && player.birdRights === "Full" && (
                                  <button onClick={() => handleSignAndTrade(player)} className="px-2 py-1 bg-purple-800 hover:bg-purple-700 text-purple-200 text-[10px] font-mono font-black rounded transition-all">S&T</button>
                                )}
                                {features.buyout && (
                                  <button onClick={() => handleBuyout(player)} className="px-2 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-[10px] font-mono font-black rounded transition-all">B/O</button>
                                )}
                                {features.stretch && (
                                  <button onClick={() => handleStretch(player)} className="px-2 py-1 bg-teal-800 hover:bg-teal-700 text-teal-200 text-[10px] font-mono font-black rounded transition-all">ST</button>
                                )}
                                {features.waiver !== false && (
                                  <button onClick={() => handleWaiver(player)} className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-300 text-[10px] font-mono font-black rounded transition-all">解雇</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {roster.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-8 text-stone-600 font-mono text-sm">選手がいません</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex-1 flex flex-col overflow-hidden">
                  <div className="px-5 py-3 border-b border-stone-850 flex justify-between items-center bg-stone-950/50">
                    <h3 className="font-mono text-sm font-black text-emerald-400 tracking-wider">🏪 FREE AGENT MARKET</h3>
                    <span className="text-stone-500 font-mono text-xs">{freeAgents.length}人</span>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-stone-500 text-xs font-mono border-b border-stone-900">
                          <th className="text-left px-5 py-2">NAME</th>
                          <th className="text-center px-2 py-2">EXP</th>
                          <th className="text-center px-2 py-2">OVR</th>
                          <th className="text-right px-2 py-2">SALARY</th>
                          <th className="text-center px-2 py-2">-</th>
                          <th className="text-center px-5 py-2">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {freeAgents.map(player => (
                          <tr key={player.id} className="border-b border-stone-900/50 hover:bg-stone-900/30 transition-colors">
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-sm truncate max-w-[120px]">{player.name}</span>
                                {getBadges(player).map((b, i) => (
                                  <span key={i} title={b.title} className={'text-[9px] font-mono font-black px-1.5 py-0.5 rounded ' + b.color}>{b.text}</span>
                                ))}
                              </div>
                            </td>
                            <td className="text-center text-stone-400 font-mono text-xs">{player.experience}yr</td>
                            <td className="text-center font-mono font-black text-base text-white">{player.rating}</td>
                            <td className="text-right font-mono font-black text-emerald-400 text-sm">{fmt(player.salary)}</td>
                            <td className="text-center text-stone-600 text-[10px] font-mono">{player.contractYears}yr</td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1 justify-end flex-wrap">
                                {features.trade && (
                                  <button onClick={() => { playClickSound(); setTradeModalTarget(player); }} className="px-2 py-1 bg-amber-800 hover:bg-amber-700 text-amber-200 text-[10px] font-mono font-black rounded transition-all">TRE</button>
                                )}
                                {features.mle && !mleUsedThisSeason && cbaMetrics.mleRemaining > 0 && player.salary <= cbaMetrics.mleRemaining && (
                                  <button onClick={() => { setUseMle(true); handleSignFA(player); }} className="px-2 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-[10px] font-mono font-black rounded transition-all">MLE</button>
                                )}
                                <button onClick={() => handleSignFA(player)} className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-[10px] font-mono font-black rounded transition-all">契約</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {freeAgents.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-8 text-stone-600 font-mono text-sm">FA市場に選手がいません</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
