import React, { useState, useEffect, useRef } from 'react';
import SalaryMeter from './components/SalaryMeter';
import RosterTable from './components/RosterTable';
import LeaderboardPage from './components/LeaderboardPage';
import { CBACoreEngine } from './engine/cbaEngine';
import stagesData from './data/stages.json';
import { fetchCurrentChallenge, submitWeeklyScore, fetchWeeklyRanking, getCurrentWeekId } from './weeklyManager';

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
    regularContractCount: 0, twoWayCount: 0, status: "UNDER_CAP"
  });

  const [clearScore, setClearScore] = useState(0);
  const [gmName, setGmName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isBgmOn, setIsBgmOn] = useState(false);

  const [weeklyChallenge, setWeeklyChallenge] = useState(null);
  const [weeklyRanking, setWeeklyRanking] = useState([]);
  const [weeklySubmitted, setWeeklySubmitted] = useState(false);
  const [playerId] = useState(() => {
    let id = localStorage.getItem('cba_player_id');
    if (!id) { id = Math.random().toString(36).substring(2, 10); localStorage.setItem('cba_player_id', id); }
    return id;
  });

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

  useEffect(() => {
    const loadChallenge = async () => {
      const challenge = await fetchCurrentChallenge();
      if (challenge) {
        setWeeklyChallenge(challenge);
        const ranking = await fetchWeeklyRanking(challenge.week);
        setWeeklyRanking(ranking);
      }
    };
    loadChallenge();
  }, []);

  useEffect(() => {
    if (currentStage) {
      setRoster(currentStage.initialRoster);
      setFreeAgents(currentStage.initialFreeAgents);
      setIsCleared(false);
      setActiveWarnings([]);
      setClearScore(0);
      setIsSent(false);
      setWeeklySubmitted(false);
      setInfoTab('mission');
    }
  }, [currentStageIdx]);

  useEffect(() => {
    if (!currentStage || currentView === 'title') return;

    const metrics = CBACoreEngine.evaluate(roster);
    setCbaMetrics(metrics);

    const warnings = [...metrics.violations];
    if (metrics.status === "LUXURY_TAX") warnings.push({ label: "💸 贅沢税発生中", text: "ラインを超える額が多ければ多いほど、オーナーの罰金が指数関数的に跳ね上がります！" });
    if (metrics.status === "FIRST_APRON") warnings.push({ label: "⚠️ 第1エプロン突破", text: "トレードで獲得する選手の年俸を、出す選手以下に抑える必要があります。" });
    if (metrics.status === "SECOND_APRON") warnings.push({ label: "🔥 第2エプロン突破", text: "2人以上のパッケージトレード禁止、MLE没収、RFAオファー全面禁止！" });
    setActiveWarnings(warnings);
    if (warnings.length > activeWarnings.length && infoTab !== 'warning') setInfoTab('warning');

    let ok = metrics.totalCapHit <= currentStage.conditions.maxSalary
      && metrics.totalOvr >= (currentStage.conditions.minTotalOvr || 0)
      && (currentStage.conditions.mustHaveStar ? metrics.hasStar : true)
      && metrics.violations.length === 0;

    if (ok) {
      setIsCleared(true);
      const ovrBonus = metrics.totalOvr * 100;
      const remaining = currentStage.conditions.maxSalary - metrics.totalCapHit;
      const budgetBonus = Math.max(0, Math.floor((remaining / 1000000) * 50));
      setClearScore(ovrBonus + budgetBonus);
    } else {
      setIsCleared(false);
    }
  }, [roster, currentStage, currentView]);

  useEffect(() => {
    if (isCleared && weeklyChallenge && currentStage && weeklyChallenge.stageId === currentStage.id && clearScore > 0) {
      submitWeeklyScore(weeklyChallenge.week, playerId, gmName.trim() || 'GM', clearScore).then(() => setWeeklySubmitted(true));
    }
  }, [isCleared, clearScore]);

  const handleSignPlayer = (player) => {
    playClickSound();
    const m = CBACoreEngine.evaluate(roster, null, player);
    if (!m.tradeCheck.allowed) { alert(m.tradeCheck.message); return; }
    setFreeAgents(freeAgents.filter(p => p.id !== player.id));
    setRoster([...roster, player]);
  };

  const handleReleasePlayer = (player) => {
    playClickSound();
    setRoster(roster.filter(p => p.id !== player.id));
    setFreeAgents([...freeAgents, player]);
  };

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
    else alert("全シチュエーションクリア！");
  };

  const isWeeklyStage = weeklyChallenge && currentStage && weeklyChallenge.stageId === currentStage.id;

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white px-2 sm:px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">

      {/* ═══ タイトル画面 ═══ */}
      {currentView === 'title' && (
        <div className="w-full max-w-2xl text-center space-y-6 py-8 sm:py-12 px-4 sm:px-8 bg-[#110f0e] border border-stone-850 rounded-3xl shadow-2xl font-mono animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse"></div>
          <div className="space-y-3">
            <div className="inline-block bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 text-[10px] sm:text-xs font-black px-3 sm:px-4 py-1.5 rounded-full tracking-widest uppercase">🚀 SYSTEM ONLINE // VER 2026.5</div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-200 to-stone-500 uppercase pt-2">CRUNCH THE CAP</h1>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-cyan-500 uppercase">NBA Labor Agreement Hacking Simulation</p>
          </div>
          <div className="border-t border-b border-stone-900 py-4 text-left font-sans text-stone-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-medium space-y-2">
            <p>「勝つためにスターを並べろ。ただし、1ドルでも規約を超えればチームを剥奪する。」</p>
            <p>NBAの鬼畜な裏法律『CBA』の隙間を突き、最強ロスターを構築する、大人の数字パズルシミュレーター。</p>
          </div>

          {weeklyChallenge && (
            <div className="bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-700/50 rounded-xl p-3 sm:p-4 space-y-2 text-left max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-black text-amber-400 uppercase tracking-widest">📅 WEEKLY CHALLENGE</span>
                <span className="text-[10px] text-stone-500 font-mono">{weeklyChallenge.week}</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white">STAGE {String(weeklyChallenge.stageId).padStart(2, '0')}</div>
              <div className="text-[10px] sm:text-xs text-stone-400">{weeklyChallenge.startDate} 〜 {weeklyChallenge.endDate}</div>
              {weeklyRanking.length > 0 && (
                <div className="text-[10px] sm:text-xs text-stone-500 pt-1 border-t border-stone-800 mt-2">
                  👑 TOP: {weeklyRanking[0].name} ({weeklyRanking[0].score} pts) | {weeklyRanking.length}人参加中
                </div>
              )}
              <button onClick={() => {
                playClickSound();
                const idx = stagesData.findIndex(s => s.id === weeklyChallenge.stageId);
                if (idx >= 0) setCurrentStageIdx(idx);
                setCurrentView('game');
              }} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black py-2 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm tracking-widest">
                CHALLENGE NOW 🔥
              </button>
            </div>
          )}

          <div className="max-w-xs mx-auto">
            <input type="text" placeholder="GMネームを入力..." value={gmName} onChange={(e) => setGmName(e.target.value)} maxLength={15} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold text-center" />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
            <button onClick={() => { playStartSound(); startBGM(); setIsBgmOn(true); setCurrentView('game'); }} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 text-sm sm:text-base font-black px-6 sm:px-8 py-3 rounded-xl transition-all tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98]">SOLO PLAY 💼</button>
            <button onClick={() => { playClickSound(); setCurrentView('weekly'); }} className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 text-sm sm:text-base font-black px-6 sm:px-8 py-3 rounded-xl transition-all tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98]">📅 WEEKLY</button>
            <button onClick={() => { playClickSound(); setCurrentView('leaderboard'); }} className="w-full sm:w-auto bg-stone-900 border border-stone-800 hover:bg-stone-850 text-stone-300 text-xs sm:text-sm font-black px-4 sm:px-6 py-3 rounded-xl transition-all tracking-wider">🏆 RANK</button>
          </div>
          <div className="text-[10px] text-stone-600 pt-2 font-mono uppercase tracking-widest">Developed by Higashimura & Gemini Pro Engine</div>
        </div>
      )}

      {/* ═══ 週間ランキング画面 ═══ */}
      {currentView === 'weekly' && (
        <div className="w-full max-w-lg space-y-4 py-6 sm:py-8 px-4 sm:px-8 bg-[#110f0e] border border-amber-900 rounded-3xl shadow-2xl font-mono animate-fade-in">
          <div className="text-center space-y-2">
            <div className="inline-block bg-amber-950/60 border border-amber-800/80 text-amber-400 text-[10px] sm:text-xs font-black px-3 sm:px-4 py-1.5 rounded-full tracking-widest uppercase">📅 WEEKLY CHALLENGE</div>
            <h2 className="text-xl sm:text-2xl font-black text-white">WEEKLY RANKING</h2>
          </div>

          {weeklyChallenge && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 sm:p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-stone-400">今週のお題</span>
                <span className="text-[10px] sm:text-xs text-stone-500">{weeklyChallenge.week}</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-400">STAGE {String(weeklyChallenge.stageId).padStart(2, '0')}</div>
              <div className="text-[10px] sm:text-xs text-stone-500">{weeklyChallenge.startDate} 〜 {weeklyChallenge.endDate}</div>
              <button onClick={() => {
                playClickSound();
                const idx = stagesData.findIndex(s => s.id === weeklyChallenge.stageId);
                if (idx >= 0) setCurrentStageIdx(idx);
                setCurrentView('game');
              }} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black py-2.5 rounded-lg transition-all text-xs sm:text-sm tracking-widest mt-2">
                CHALLENGE NOW 🔥
              </button>
            </div>
          )}

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 sm:p-4 space-y-2">
            <div className="text-[10px] sm:text-xs font-mono font-black text-amber-400 uppercase tracking-widest">RANKING</div>
            {weeklyRanking.length === 0 ? (
              <div className="text-stone-500 text-xs sm:text-sm text-center py-4">まだ参加者がいません</div>
            ) : (
              <div className="space-y-1">
                {weeklyRanking.map((entry, i) => (
                  <div key={entry.id} className={'flex items-center justify-between py-2 px-2 sm:px-3 rounded-lg ' + (i === 0 ? 'bg-amber-950/40 border border-amber-800' : i === 1 ? 'bg-stone-800/40' : i === 2 ? 'bg-orange-950/20' : 'bg-stone-950')}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className={'text-base sm:text-lg font-black w-6 sm:w-8 ' + (i === 0 ? 'text-amber-400' : i === 1 ? 'text-stone-300' : i === 2 ? 'text-orange-400' : 'text-stone-500')}>
                        {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}
                      </span>
                      <span className={'font-bold text-xs sm:text-sm ' + (i === 0 ? 'text-white' : 'text-stone-300')}>{entry.name}</span>
                    </div>
                    <span className={'font-black text-xs sm:text-sm ' + (i === 0 ? 'text-amber-400 text-base' : 'text-stone-400')}>{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { playClickSound(); setCurrentView('title'); }} className="w-full text-center text-[10px] sm:text-xs text-stone-500 hover:text-stone-300 font-mono py-2">← タイトルに戻る</button>
        </div>
      )}

      {/* ═══ メインゲーム画面 ═══ */}
      {currentView !== 'title' && currentView !== 'weekly' && (
        <div className="w-full flex flex-col flex-1 justify-start">
          {/* ヘッダー */}
          <header className="w-full max-w-7xl mx-auto mb-2 border-b border-stone-800 pb-2 sm:pb-3 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-2 sm:gap-4">
            <div className="cursor-pointer text-center sm:text-left" onClick={() => { playClickSound(); setCurrentView('title'); }}>
              <h1 className="text-xl sm:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">CRUNCH THE CAP</h1>
              <p className="text-[10px] sm:text-sm text-stone-400 mt-0.5 font-mono tracking-wider">NBA Labor Agreement Hacking Simulation</p>
            </div>
            <div className="flex bg-stone-950 p-1 sm:p-1.5 rounded-xl border border-stone-850 font-mono text-xs sm:text-sm font-black">
              <button onClick={() => { playClickSound(); setCurrentView('title'); }} className="px-2 sm:px-4 py-2 sm:py-2.5 text-stone-500 hover:text-stone-300 rounded-lg transition-all">🏠</button>
              <button onClick={() => { playClickSound(); setCurrentView('game'); }} className={'px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all ' + (currentView === 'game' ? 'bg-cyan-500 text-stone-950 shadow-lg' : 'text-stone-400 hover:text-white')}>🎮</button>
              <button onClick={() => { playClickSound(); setCurrentView('weekly'); }} className="px-2 sm:px-4 py-2 sm:py-2.5 text-stone-400 hover:text-stone-300 rounded-lg transition-all">📅</button>
              <button onClick={() => { playClickSound(); setCurrentView('leaderboard'); }} className={'px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all ' + (currentView === 'leaderboard' ? 'bg-amber-500 text-stone-950 shadow-lg' : 'text-stone-400 hover:text-white')}>🏆</button>
              <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
            </div>
          </header>

          {/* 週間チャレンジバナー */}
          {weeklyChallenge && isWeeklyStage && !isCleared && (
            <div className="w-full max-w-7xl mx-auto mb-2 shrink-0">
              <div className="bg-amber-950/40 border border-amber-800 rounded-xl px-3 sm:px-4 py-2 flex items-center justify-between font-mono text-[10px] sm:text-sm">
                <span className="text-amber-400 font-black">📅 WEEKLY CHALLENGE</span>
                <span className="text-stone-400 hidden sm:inline">STAGE {String(weeklyChallenge.stageId).padStart(2, '0')} | {weeklyChallenge.endDate} まで</span>
              </div>
            </div>
          )}

          {/* ステージ選択ボタン */}
          {currentView === 'game' && (
            <div className="w-full max-w-7xl mx-auto mb-2 sm:mb-3 shrink-0">
              <div className="grid grid-cols-5 sm:flex sm:justify-end gap-1 sm:gap-2">
                {stagesData.map((stage, idx) => (
                  <button key={stage.id} onClick={() => { playClickSound(); setCurrentStageIdx(idx); }} className={'px-2 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-base font-mono font-black rounded border transition-all relative ' + (idx === currentStageIdx ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-950/50' : 'bg-stone-900 border-stone-800 text-white hover:bg-stone-850')}>
                    S0{stage.id}
                    {weeklyChallenge && weeklyChallenge.stageId === stage.id && <span className="absolute -top-1 -right-1 w-2 sm:w-3 h-2 sm:h-3 bg-amber-500 rounded-full animate-pulse"></span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-3 sm:gap-4 flex-1 items-stretch">
            {currentView === 'game' ? (
              <>
                <div className="w-full lg:w-[42%] space-y-3 sm:space-y-4 flex flex-col justify-between">
                  <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col flex-1 min-h-[320px] sm:min-h-[420px]">
                    <div className="flex bg-stone-950/80 border-b border-stone-850 p-1 sm:p-1.5 rounded-t-xl font-mono text-[10px] sm:text-sm font-black">
                      <button onClick={() => { playClickSound(); setInfoTab('mission'); }} className={'flex-1 py-1.5 sm:py-2 rounded-lg transition-all ' + (infoTab === 'mission' ? 'bg-stone-900 text-cyan-400 border border-stone-800' : 'text-stone-400 hover:text-stone-200')}>🎯 MISSION</button>
                      <button onClick={() => { playClickSound(); setInfoTab('rule'); }} className={'flex-1 py-1.5 sm:py-2 rounded-lg transition-all ' + (infoTab === 'rule' ? 'bg-stone-900 text-blue-400 border border-stone-800' : 'text-stone-400 hover:text-stone-200')}>📖 RULE</button>
                      <button onClick={() => { playClickSound(); setInfoTab('warning'); }} className={'flex-1 py-1.5 sm:py-2 rounded-lg transition-all relative ' + (infoTab === 'warning' ? 'bg-stone-900 text-red-400 border border-stone-800' : 'text-stone-400 hover:text-stone-200')}>🚨 WARN{activeWarnings.length > 0 && <span className="absolute top-1 right-1 sm:right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 animate-ping"></span>}</button>
                    </div>

                    <div className="p-3 sm:p-5 flex-1 overflow-y-auto">
                      {infoTab === 'mission' && (
                        <div className="space-y-2 sm:space-y-3 animate-fade-in">
                          <span className="text-[10px] sm:text-sm font-mono font-black text-cyan-400 tracking-wider block uppercase">CURRENT MISSION</span>
                          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">{currentStage?.title}</h2>
                          <p className="text-xs sm:text-base text-stone-200 font-bold leading-relaxed pt-1">{currentStage?.description}</p>
                        </div>
                      )}
                      {infoTab === 'rule' && (
                        <div className="space-y-2 sm:space-y-3 animate-fade-in">
                          <span className="text-[10px] sm:text-sm font-mono font-black text-blue-400 tracking-wider block uppercase">CBA MANUAL</span>
                          <h2 className="text-base sm:text-xl font-black text-white tracking-wide">{currentStage?.ruleExplanation?.title}</h2>
                          <p className="text-xs sm:text-base text-stone-100 font-bold leading-relaxed bg-stone-950/50 p-3 sm:p-4 rounded-xl border border-stone-900 mt-2">{currentStage?.ruleExplanation?.text}</p>
                        </div>
                      )}
                      {infoTab === 'warning' && (
                        <div className={'space-y-2 sm:space-y-3 ' + (activeWarnings.length > 0 ? 'animate-[pulse_3s_infinite]' : '')}>
                          <span className="text-[10px] sm:text-sm font-mono font-black text-red-500 tracking-widest block uppercase">REGULATORY STATUS</span>
                          {activeWarnings.length === 0 ? (
                            <div className="text-emerald-400 font-bold text-xs sm:text-base py-4 sm:py-6 text-center bg-stone-950/40 rounded-xl border border-stone-900">✓ すべてのCBA規約を完全遵守しています。</div>
                          ) : (
                            <div className="space-y-2 sm:space-y-3 pt-1">
                              {activeWarnings.map((w, i) => (
                                <div key={i} className="bg-stone-950 border border-stone-900 p-2 sm:p-4 rounded-xl border-l-4 border-l-red-500 overflow-hidden">
                                  <h4 className="text-[9px] sm:text-base font-black text-red-400 font-mono uppercase tracking-wide break-all leading-tight">{w.label}</h4>
                                  <p className="text-[9px] sm:text-base text-white mt-1 sm:mt-1.5 leading-tight font-sans font-bold break-all">{w.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* メーター */}
                    <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-base p-3 sm:p-4 border-t border-stone-900 font-mono bg-stone-950/40 rounded-b-xl">
                      <div className="bg-stone-950 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                        <span className="text-stone-400 font-sans font-black text-[10px] sm:text-sm">📊 Cap Hit:</span>
                        <div className="text-right">
                          <span className={cbaMetrics.totalCapHit <= currentStage?.conditions.maxSalary ? 'text-emerald-400 font-black text-sm sm:text-xl' : 'text-red-400 font-black text-sm sm:text-xl'}>${cbaMetrics.totalCapHit.toLocaleString()}</span>
                          <span className="text-[9px] sm:text-xs text-stone-500 font-sans block">/ ${currentStage?.conditions.maxSalary.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="bg-stone-950 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                        <span className="text-stone-400 font-sans font-black text-[10px] sm:text-sm">💸 Real Payroll:</span>
                        <span className="text-amber-400 font-black text-sm sm:text-xl">${cbaMetrics.actualPayroll.toLocaleString()}</span>
                      </div>
                      <div className="bg-stone-950 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                        <span className="text-stone-400 font-sans font-black text-[10px] sm:text-sm">🔥 Total OVR:</span>
                        <div className="text-right">
                          <span className={cbaMetrics.totalOvr >= currentStage?.conditions.minTotalOvr ? 'text-emerald-400 font-black text-sm sm:text-xl' : 'text-red-400 font-black text-sm sm:text-xl'}>{cbaMetrics.totalOvr}</span>
                          <span className="text-[9px] sm:text-xs text-stone-500 font-sans block">/ {currentStage?.conditions.minTotalOvr}+</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-center text-[10px] sm:text-sm font-sans font-bold">
                        <div className="bg-stone-900 py-1.5 sm:py-2 rounded-lg border border-stone-800">Regular: <span className="text-cyan-400 font-mono font-black text-sm sm:text-base">{cbaMetrics.regularContractCount}</span></div>
                        <div className="bg-stone-900 py-1.5 sm:py-2 rounded-lg border border-stone-800">Two-Way: <span className="text-purple-400 font-mono font-black text-sm sm:text-base">{cbaMetrics.twoWayCount}</span></div>
                      </div>
                      <div className="pt-1 sm:pt-2"><SalaryMeter totalSalary={cbaMetrics.totalCapHit} /></div>
                    </div>
                  </section>

                  {/* クリア: 週間チャレンジ */}
                  {isCleared && isWeeklyStage && (
                    <div className="bg-gradient-to-r from-amber-950 to-stone-900 border-2 border-amber-500 rounded-xl p-3 sm:p-5 shadow-2xl space-y-2 sm:space-y-3 shrink-0">
                      <div className="flex justify-between items-center border-b border-amber-900 pb-2">
                        <h3 className="text-xs sm:text-base font-black text-amber-400 font-mono uppercase">📅 WEEKLY CLEARED!</h3>
                        <div className="text-right shrink-0">
                          <span className="block text-[9px] sm:text-[10px] text-stone-400 font-mono">GM SCORE</span>
                          <span className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">{clearScore} pts</span>
                        </div>
                      </div>
                      {!weeklySubmitted ? (
                        <button onClick={async () => {
                          if (!weeklyChallenge || !gmName.trim()) return;
                          setIsSending(true);
                          const ok = await submitWeeklyScore(weeklyChallenge.week, playerId, gmName.trim(), clearScore);
                          if (ok) { setWeeklySubmitted(true); const r = await fetchWeeklyRanking(weeklyChallenge.week); setWeeklyRanking(r); }
                          setIsSending(false);
                        }} disabled={isSending || !gmName.trim()} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-black py-2.5 sm:py-3 rounded-lg transition-all text-xs sm:text-sm tracking-widest">
                          {isSending ? '送信中...' : !gmName.trim() ? 'GMネームを入力してください' : '📅 WEEKLYにスコア送信'}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-center text-amber-400 text-xs sm:text-sm font-mono animate-pulse">✓ 送信完了！</div>
                          <button onClick={() => { playClickSound(); setCurrentView('weekly'); }} className="w-full bg-stone-900 border border-stone-800 hover:bg-stone-850 text-stone-300 font-black py-2 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm tracking-wider">📅 ランキングを見る</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* クリア: 通常 */}
                  {isCleared && !isWeeklyStage && (
                    <div className="bg-gradient-to-r from-emerald-950 to-stone-900 border-2 border-emerald-500 rounded-xl p-3 sm:p-5 shadow-2xl space-y-2 sm:space-y-3 shrink-0">
                      <div className="flex justify-between items-center border-b border-emerald-900 pb-2">
                        <h3 className="text-xs sm:text-base font-black text-emerald-400 font-mono uppercase">✓ MISSION ACCOMPLISHED</h3>
                        <div className="text-right shrink-0">
                          <span className="block text-[9px] sm:text-[10px] text-stone-400 font-mono">GM SCORE</span>
                          <span className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">{clearScore} pts</span>
                        </div>
                      </div>
                      {!isSent ? (
                        <form onSubmit={handleSubmitRanking} className="space-y-2 sm:space-y-3 bg-stone-950/60 p-2 sm:p-3 rounded-xl border border-emerald-900/50">
                          <label className="block text-[10px] sm:text-xs font-mono font-black text-emerald-400 uppercase">LEADERBOARD</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="GMネーム..." value={gmName} onChange={(e) => setGmName(e.target.value)} maxLength={15} required className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-bold" />
                            <button type="submit" disabled={isSending || !gmName.trim()} className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-stone-800 text-stone-950 disabled:text-stone-600 text-[10px] sm:text-xs font-mono font-black px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all">{isSending ? "..." : "🚀"}</button>
                          </div>
                        </form>
                      ) : <div className="text-center text-emerald-400 text-xs sm:text-sm font-mono animate-pulse">✓ 送信完了！</div>}
                      <button onClick={handleNextStage} className="w-full bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs sm:text-sm font-mono font-black py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg transition-colors shadow-md">NEXT MISSION ➡️</button>
                    </div>
                  )}
                </div>

                {/* 選手リスト */}
                <div className="w-full lg:w-[58%] space-y-3 sm:space-y-4 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
                    <RosterTable title="CURRENT ROSTER" players={roster} onActionClick={handleReleasePlayer} actionLabel="解雇" totalSalary={cbaMetrics.totalCapHit} />
                    <RosterTable title="FREE AGENT MARKET" players={freeAgents} onActionClick={handleSignPlayer} actionLabel="契約" />
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
