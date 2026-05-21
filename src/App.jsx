import React, { useState, useEffect, useRef } from 'react';
import SalaryMeter from './components/SalaryMeter';
import LeaderboardPage from './components/LeaderboardPage';
import DynastyView from './components/DynastyView';
import { CBACoreEngine } from './engine/cbaEngine';
import stagesData from './data/stages.json';

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

  const [clearScore, setClearScore] = useState(0);
  const [gmName, setGmName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isBgmOn, setIsBgmOn] = useState(false);

  // ★ 新規state
  const [deadCap, setDeadCap] = useState([]);
  const [draftPicks, setDraftPicks] = useState(0);
  const [taxHistory, setTaxHistory] = useState([]);
  const [mleUsedThisSeason, setMleUsedThisSeason] = useState(false);
  const [useMle, setUseMle] = useState(false);
  const [tradeModalTarget, setTradeModalTarget] = useState(null);

  const fmt = (v) => v >= 1000000 ? `$$$${(v / 1000000).toFixed(1).replace(/\.0/, '')}M` : `$${v.toLocaleString()}`;

  // ═══════════════════════════════════════
  // オーディオ（変更なし）
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

  const playClickSound = () => {
    try {
      const ctx = getCtx(); const now = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1200, now);
      g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.05);
    } catch (e) {}
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
  // ステージ初期化（★ 拡張）
  // ═══════════════════════════════════════
  useEffect(() => {
    if (currentStage) {
      setRoster(currentStage.initialRoster);
      setFreeAgents(currentStage.initialFreeAgents);
      setIsCleared(false);
      setActiveWarnings([]);
      setClearScore(0);
      setIsSent(false);
      setInfoTab('mission');
      setDeadCap([]);
      setDraftPicks(currentStage.initialDraftPicks || 0);
      setUseMle(false);
      setMleUsedThisSeason(false);
      setTaxHistory(currentStage.taxHistoryInitial || []);
      setTradeModalTarget(null);
    }
  }, [currentStageIdx]);

  // ═══════════════════════════════════════
  // メトリクス評価（★ 拡張）
  // ═══════════════════════════════════════
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

    if (ok) {
      setIsCleared(true);
      const RatingBonus = metrics.totalRating * 100;
      const remaining = currentStage.conditions.maxSalary - metrics.totalCapHit;
      const budgetBonus = Math.max(0, Math.floor((remaining / 1000000) * 50));
      setClearScore(RatingBonus + budgetBonus);
    } else {
      setIsCleared(false);
    }
  }, [roster, currentStage, currentView, deadCap, draftPicks, mleUsedThisSeason, infoTab, activeWarnings.length]);

  // ═══════════════════════════════════════
  // ハンドラー群
  // ═══════════════════════════════════════

  // ★ ウェイブ（デッドキャップ対応）
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
    } else {
      setRoster(roster.filter(p => p.id !== player.id));
      setFreeAgents([...freeAgents, player]);
    }
  };

  // ★ バイアウト
  const handleBuyout = (player) => {
    playClickSound();
    const result = CBACoreEngine.executeBuyout(player);
    setDeadCap(prev => [...prev, ...result.deadCapEntries]);
    setRoster(roster.filter(p => p.id !== player.id));
    alert(result.message);
  };

  // ★ ストレッチ
  const handleStretch = (player) => {
    playClickSound();
    const result = CBACoreEngine.executeStretch(player);
    setDeadCap(prev => [...prev, ...result.deadCapEntries]);
    setRoster(roster.filter(p => p.id !== player.id));
    alert(result.message);
  };

  // ★ Player Option
  const handlePlayerOption = (player, exercise) => {
    playClickSound();
    if (exercise) {
      alert(`${player.name}のPlayer Optionを行使。契約延長します。`);
    } else {
      setRoster(roster.filter(p => p.id !== player.id));
      setFreeAgents([...freeAgents, { ...player, faStatus: "UFA", optionType: null }]);
    }
  };

  // ★ Team Option
  const handleTeamOption = (player, exercise) => {
    playClickSound();
    if (exercise) {
      alert(`${player.name}のTeam Optionを行使。契約延長します。`);
    } else {
      setRoster(roster.filter(p => p.id !== player.id));
    }
  };

  // ★ FA契約（MLE対応）
  const handleSignFA = (player) => {
    playClickSound();
    if (useMle) {
      const check = CBACoreEngine.canUseMLE(player.salary, cbaMetrics.mleRemaining, cbaMetrics.apronStatus);
      if (!check.allowed) { alert(check.message); return; }
      setMleUsedThisSeason(true);
      setUseMle(false);
    } else {
      const m = CBACoreEngine.evaluate(roster, null, player, {
        deadCap, features: currentStage.features || {},
        draftPicks, taxHistory, mleUsedThisSeason,
        minPlayers: currentStage.conditions.minPlayers || 14,
      });
      if (!m.tradeCheck.allowed) { alert(m.tradeCheck.message); return; }
    }
    setFreeAgents(freeAgents.filter(p => p.id !== player.id));
    setRoster([...roster, player]);
  };

  // ★ トレード
  const handleTrade = (rosterPlayer) => {
    playClickSound();
    const faPlayer = tradeModalTarget;
    const m = CBACoreEngine.evaluate(roster, rosterPlayer, faPlayer, {
      deadCap, features: currentStage.features || {},
      draftPicks, taxHistory, mleUsedThisSeason,
      minPlayers: currentStage.conditions.minPlayers || 14,
    });
    if (!m.tradeCheck.allowed) { alert(m.tradeCheck.message); return; }
    setRoster(roster.map(p => p.id === rosterPlayer.id ? { ...faPlayer, contractYears: faPlayer.contractYears || 2 } : p));
    setFreeAgents(freeAgents.filter(p => p.id !== faPlayer.id));
    setTradeModalTarget(null);
  };

  // ★ S&T
  const handleSignAndTrade = (player) => {
    playClickSound();
    const v = CBACoreEngine.validateSignAndTrade(player, 3);
    if (!v.allowed) { alert(v.message); return; }
    setRoster(roster.filter(p => p.id !== player.id));
    setDraftPicks(prev => prev + 1);
    alert(`S&T成功！ ${player.name}を放出し、ドラフトピック+1`);
  };

  // ランキング送信（変更なし）
  const handleSubmitRanking = async (e) => {
    e.preventDefault();
    if (!gmName.trim() || isSending || isSent) return;
    playClickSound(); setIsSending(true);
    const FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdFQ-mncKVOb92YW9DfMwxSvhGsmJDLKgrDCmaW5nivQNXuvg/formResponse";
    const fd = new FormData();
    fd.append("entry.2085222849", currentStage.id);
    fd.append("entry.281218617", gmName.trim());
    fd.append("entry.1962400956", clearScore);
    try {
      await fetch(FORM_ACTION_URL, { method: "POST", body: fd, mode: "no-cors" });
      setIsSent(true);
      setTimeout(() => { setCurrentView('leaderboard'); }, 1500);
    } catch (e2) { alert("送信エラー"); }
    finally { setIsSending(false); }
  };

  const handleNextStage = () => {
    playClickSound();
    if (currentStageIdx < stagesData.length - 1) setCurrentStageIdx(currentStageIdx + 1);
    else alert("全ステージクリア！");
  };

  // バッジヘルパー
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
    <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">

      {/* ═══ タイトル画面（変更なし）═══ */}
      {currentView === 'title' && (
        <div className="w-full max-w-2xl text-center space-y-8 py-12 px-8 bg-[#110f0e] border border-stone-850 rounded-3xl shadow-2xl font-mono animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse"></div>
          <div className="space-y-3">
            <div className="inline-block bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 text-xs font-black px-4 py-1.5 rounded-full tracking-widest uppercase">🚀 SYSTEM ONLINE // VER 2026.5</div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-200 to-stone-500 uppercase pt-2">CRUNCH THE CAP</h1>
            <p className="text-sm font-bold tracking-widest text-cyan-500 uppercase">NBA Labor Agreement Hacking Simulation</p>
          </div>
          <div className="border-t border-b border-stone-900 py-4 text-left font-sans text-stone-400 text-sm leading-relaxed max-w-md mx-auto font-medium space-y-2">
            <p>「勝つためにスターを並べろ。ただし、1ドルでも規約を超えればチームを剥奪する。」</p>
            <p>NBAの鬼畜な裏法律『CBA』の隙間を突き、最強ロスターを構築する、大人の数字パズルシミュレーター。</p>
          </div>
          <div className="max-w-xs mx-auto">
            <input type="text" placeholder="GMネームを入力..." value={gmName} onChange={(e) => setGmName(e.target.value)} maxLength={15} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold text-center" />
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button onClick={() => { playStartSound(); startBGM(); setIsBgmOn(true); setCurrentView('game'); }} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 text-base font-black px-8 py-3.5 rounded-xl transition-all tracking-widest shadow-lg shadow-cyan-950/50 hover:scale-[1.02] active:scale-[0.98]">STAGES 💼</button>
            <button onClick={() => { playStartSound(); startBGM(); setIsBgmOn(true); setCurrentView('dynasty'); }} className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 text-base font-black px-8 py-3.5 rounded-xl transition-all tracking-widest shadow-lg shadow-amber-950/50 hover:scale-[1.02] active:scale-[0.98]">DYNASTY 👑</button>
            <button onClick={() => { playClickSound(); setCurrentView('leaderboard'); }} className="w-full sm:w-auto bg-stone-900 border border-stone-800 hover:bg-stone-850 text-stone-300 text-sm font-black px-6 py-3.5 rounded-xl transition-all tracking-wider">RANK 🏆</button>
          </div>
          <div className="text-[10px] text-stone-600 pt-4 font-mono uppercase tracking-widest">Developed by Higashimura & Gemini Pro Engine</div>
        </div>
      )}

      {/* ═══ 王朝モード（変更なし）═══ */}
      {currentView === 'dynasty' && (
        <DynastyView onBack={() => { playClickSound(); setCurrentView('title'); }} gmName={gmName} playClickSound={playClickSound} isBgmOn={isBgmOn} toggleBGM={toggleBGM} />
      )}

      {/* ═══ メインゲーム画面 & ランキング ═══ */}
      {currentView !== 'title' && currentView !== 'dynasty' && (
        <div className="w-full flex flex-col flex-1 justify-start">
          <header className="w-full max-w-7xl mx-auto mb-2 border-b border-stone-800 pb-3 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
            <div className="cursor-pointer" onClick={() => { playClickSound(); setCurrentView('title'); }}>
              <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">CRUNCH THE CAP</h1>
              <p className="text-sm text-stone-400 mt-0.5 font-mono tracking-wider">NBA Labor Agreement Hacking Simulation</p>
            </div>
            <div className="flex bg-stone-950 p-1.5 rounded-xl border border-stone-850 font-mono text-sm font-black">
              <button onClick={() => { playClickSound(); setCurrentView('title'); }} className="px-4 py-2.5 text-stone-500 hover:text-stone-300 rounded-lg transition-all">🏠</button>
              <button onClick={() => { playClickSound(); setCurrentView('game'); }} className={'px-5 py-2.5 rounded-lg transition-all ' + (currentView === 'game' ? 'bg-cyan-500 text-stone-950 shadow-lg' : 'text-stone-400 hover:text-white')}>🎮</button>
              <button onClick={() => { playClickSound(); setCurrentView('leaderboard'); }} className={'px-5 py-2.5 rounded-lg transition-all ' + (currentView === 'leaderboard' ? 'bg-amber-500 text-stone-950 shadow-lg' : 'text-stone-400 hover:text-white')}>🏆</button>
              <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-3 py-2.5 rounded-lg transition-all ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
            </div>
          </header>

          {/* ★ ステージ選択ボタン（13ステージ対応） */}
          {currentView === 'game' && (
            <div className="w-full max-w-7xl mx-auto mb-3 shrink-0 flex flex-wrap justify-center gap-2">
              {stagesData.map((stage, idx) => (
                <button key={stage.id} onClick={() => { playClickSound(); setCurrentStageIdx(idx); }}
                  className={'px-4 py-2 text-xs font-mono font-black rounded border transition-all ' + (idx === currentStageIdx ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-950/50' : 'bg-stone-900 border-stone-800 text-white hover:bg-stone-850')}>
                  {String(stage.id).padStart(2, '0')}
                </button>
              ))}
            </div>
          )}

          {/* ★ トレードモーダル */}
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
            {currentView === 'game' ? (
              <>
                {/* ═══ 左パネル (42%) ═══ */}
                <div className="w-full lg:w-[42%] space-y-4 flex flex-col justify-between">
                  <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col flex-1 min-h-[420px]">
                    {/* タブバー（変更なし） */}
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

                    {/* ★ メトリクス（拡張） */}
                    <div className="flex flex-col gap-2 text-base p-4 border-t border-stone-900 font-mono bg-stone-950/40 rounded-b-xl">
                      <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                        <span className="text-stone-400 font-sans font-black text-sm">📊 Cap Hit:</span>
                        <span className={cbaMetrics.totalCapHit <= currentStage?.conditions.maxSalary ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>{fmt(cbaMetrics.totalCapHit)} <span className="text-lg text-stone-500 font-sans">/ {fmt(currentStage?.conditions.maxSalary)}</span></span>
                      </div>

                      {/* ★ デッドキャップ表示 */}
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

                      {/* ★ ドラフトピック表示 */}
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

                      {/* ★ MLEチェックボックス */}
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

                  {/* クリアパネル（変更なし） */}
                  {isCleared && (
                    <div className="bg-gradient-to-r from-emerald-950 to-stone-900 border-2 border-emerald-500 rounded-xl p-5 shadow-2xl space-y-3 shrink-0">
                      <div className="flex justify-between items-center border-b border-emerald-900 pb-2">
                        <h3 className="text-base font-black text-emerald-400 font-mono uppercase">✓ MISSION ACCOMPLISHED</h3>
                        <div className="text-right shrink-0">
                          <span className="block text-[10px] text-stone-400 font-mono">GM SCORE</span>
                          <span className="text-2xl font-black text-yellow-400 font-mono">{clearScore} pts</span>
                        </div>
                      </div>
                      {!isSent ? (
                        <form onSubmit={handleSubmitRanking} className="space-y-3 bg-stone-950/60 p-3 rounded-xl border border-emerald-900/50">
                          <label className="block text-xs font-mono font-black text-emerald-400 uppercase">LEADERBOARD</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="GMネーム..." value={gmName} onChange={(e) => setGmName(e.target.value)} maxLength={15} required className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold" />
                            <button type="submit" disabled={isSending || !gmName.trim()} className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-stone-800 text-stone-950 disabled:text-stone-600 text-xs font-mono font-black px-5 py-2.5 rounded-lg transition-all">{isSending ? "..." : "🚀"}</button>
                          </div>
                        </form>
                      ) : <div className="text-center text-emerald-400 text-sm font-mono animate-pulse">✓ 送信完了！</div>}
                      <button onClick={handleNextStage} className="w-full bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-sm font-mono font-black py-2.5 px-6 rounded-lg transition-colors shadow-md">NEXT MISSION ➡️</button>
                    </div>
                  )}
                </div>

                {/* ═══ 右パネル (58%) - ロスターテーブル ★ 改造 ═══ */}
                <div className="w-full lg:w-[58%] space-y-4 flex flex-col">
                  <div className="flex flex-col gap-4 flex-1">

                    {/* ─── CURRENT ROSTER ─── */}
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
                                    {/* Player Option ボタン */}
                                    {player.optionType === "player" && (
                                      <>
                                        <button onClick={() => handlePlayerOption(player, true)} className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-[10px] font-mono font-black rounded transition-all" title="行使して残留">PO:行使</button>
                                        <button onClick={() => handlePlayerOption(player, false)} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 text-[10px] font-mono font-black rounded transition-all" title="拒否してFAへ">PO:拒否</button>
                                      </>
                                    )}
                                    {/* Team Option ボタン */}
                                    {player.optionType === "team" && (
                                      <>
                                        <button onClick={() => handleTeamOption(player, true)} className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-[10px] font-mono font-black rounded transition-all" title="行使して延長">TO:行使</button>
                                        <button onClick={() => handleTeamOption(player, false)} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 text-[10px] font-mono font-black rounded transition-all" title="拒否して放出">TO:拒否</button>
                                      </>
                                    )}
                                    {/* S&T ボタン */}
                                    {features.signAndTrade && player.birdRights === "Full" && (
                                      <button onClick={() => handleSignAndTrade(player)} className="px-2 py-1 bg-purple-800 hover:bg-purple-700 text-purple-200 text-[10px] font-mono font-black rounded transition-all" title="サイン・アンド・トレード">S&T</button>
                                    )}
                                    {/* バイアウトボタン */}
                                    {features.buyout && (
                                      <button onClick={() => handleBuyout(player)} className="px-2 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-[10px] font-mono font-black rounded transition-all" title={`バイアウト（${CBACoreEngine.getBuyoutRate(player.rating)*100}%に軽減）`}>B/O</button>
                                    )}
                                    {/* ストレッチボタン */}
                                    {features.stretch && (
                                      <button onClick={() => handleStretch(player)} className="px-2 py-1 bg-teal-800 hover:bg-teal-700 text-teal-200 text-[10px] font-mono font-black rounded transition-all" title="ストレッチ条項">ST</button>
                                    )}
                                    {/* ウェイブボタン */}
                                    {features.waiver !== false && (
                                      <button onClick={() => handleWaiver(player)} className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-300 text-[10px] font-mono font-black rounded transition-all" title="ウェイブ（放出）">解雇</button>
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

                    {/* ─── FREE AGENT MARKET ─── */}
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
                                    {/* トレードボタン */}
                                    {features.trade && (
                                      <button onClick={() => { playClickSound(); setTradeModalTarget(player); }} className="px-2 py-1 bg-amber-800 hover:bg-amber-700 text-amber-200 text-[10px] font-mono font-black rounded transition-all" title="トレードで獲得">TRE</button>
                                    )}
                                    {/* MLE契約ボタン */}
                                    {features.mle && !mleUsedThisSeason && cbaMetrics.mleRemaining > 0 && player.salary <= cbaMetrics.mleRemaining && (
                                      <button onClick={() => { setUseMle(true); handleSignFA(player); }} className="px-2 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-[10px] font-mono font-black rounded transition-all" title="MLEで契約">MLE</button>
                                    )}
                                    {/* 通常契約ボタン */}
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
              </>
            ) : (
              <div className="w-full"><LeaderboardPage currentStageId={currentStage?.id || 1} /></div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
