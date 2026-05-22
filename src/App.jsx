import React, { useState, useEffect, useCallback } from "react";
import StageStartScreen from "./components/StageStartScreen";
import LeaderboardPage from "./components/LeaderboardPage";
import DynastyView from "./components/DynastyView";
import { CBACoreEngine } from "./data/cbaEngine";
import stagesData from "./data/stages.json";


const STAGE_IDS = [
  "01","02","03","04","05","06","07","08","09","10","11","12","13",
];

const BGM_PATHS = {
  "01": "/audio/stage01.mp3",
  "02": "/audio/stage02.mp3",
  "03": "/audio/stage03.mp3",
  "04": "/audio/stage04.mp3",
  "05": "/audio/stage05.mp3",
  "06": "/audio/stage06.mp3",
  "07": "/audio/stage07.mp3",
  "08": "/audio/stage08.mp3",
  "09": "/audio/stage09.mp3",
  "10": "/audio/stage10.mp3",
  "11": "/audio/stage11.mp3",
  "12": "/audio/stage12.mp3",
  "13": "/audio/stage13.mp3",
};

const CLICK_SFX_PATH = "/audio/click.mp3";
const SFX_VOLUME = 0.7;
const FADE_DURATION = 1000;

function App() {
  const [page, setPage] = useState("title");
  const [isDynasty, setIsDynasty] = useState(false);
  const [currentStageId, setCurrentStageId] = useState(1);
  const [gamePhase, setGamePhase] = useState("missionStart");
  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [deadCap, setDeadCap] = useState([]);
  const [taxHistory, setTaxHistory] = useState([]);
  const [draftPicks, setDraftPicks] = useState(0);
  const [mleUsedThisSeason, setMleUsedThisSeason] = useState(false);
  const [currentBgmKey, setCurrentBgmKey] = useState(null);
  const [isBgmOn, setIsBgmOn] = useState(true);
  const [gmName, setGmName] = useState("");

  const stages = stagesData;
  const currentStage = stages.find(s => s.id === currentStageId) || stages[0];

  const audioRef = React.useRef(null);
  const clickAudioRef = React.useRef(null);
  const fadeIntervalRef = React.useRef(null);

  const playClickSound = useCallback(() => {
    if (!isBgmOn) return;
    try {
      if (clickAudioRef.current) {
        clickAudioRef.current.pause();
        clickAudioRef.current.currentTime = 0;
      } else {
        clickAudioRef.current = new Audio();
      }
      clickAudioRef.current.src = CLICK_SFX_PATH;
      clickAudioRef.current.volume = SFX_VOLUME;
      clickAudioRef.current.play().catch(() => {});
    } catch (e) {}
  }, [isBgmOn]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
  }, []);

  const toggleBGM = useCallback(() => {
    playClickSound();
    if (!audioRef.current) return;
    if (isBgmOn) {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      const startVol = audioRef.current.volume;
      const steps = 20;
      const interval = FADE_DURATION / steps;
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        audioRef.current.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fadeIntervalRef.current);
          audioRef.current.pause();
          audioRef.current.volume = 1;
        }
      }, interval);
      setIsBgmOn(false);
    } else {
      audioRef.current.volume = 1;
      audioRef.current.play().catch(() => {});
      setIsBgmOn(true);
    }
  }, [playClickSound, isBgmOn]);

  useEffect(() => {
    const desiredKey = isDynasty ? "dynasty" : currentStageId ? String(currentStageId).padStart(2, "0") : null;
    if (desiredKey === currentBgmKey) return;
    if (!audioRef.current) return;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const startVol = audioRef.current.volume;
    const steps = 20;
    const interval = FADE_DURATION / steps;
    let step = 0;
    if (!audioRef.current.paused && currentBgmKey !== null) {
      fadeIntervalRef.current = setInterval(() => {
        step++;
        audioRef.current.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fadeIntervalRef.current);
          audioRef.current.pause();
          audioRef.current.volume = 1;
          loadAndPlay(desiredKey);
        }
      }, interval);
    } else {
      loadAndPlay(desiredKey);
    }
    function loadAndPlay(key) {
      const path = isDynasty ? "/audio/dynasty.mp3" : BGM_PATHS[key];
      if (!path) return;
      audioRef.current.src = path;
      audioRef.current.volume = isBgmOn ? 1 : 0;
      if (isBgmOn) audioRef.current.play().catch(() => {});
    }
    setCurrentBgmKey(desiredKey);
  }, [currentStageId, isDynasty, isBgmOn, currentBgmKey]);

  const loadStage = useCallback((stageId) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    setCurrentStageId(stageId);
    setRoster(JSON.parse(JSON.stringify(stage.initialRoster)));
    setFreeAgents(JSON.parse(JSON.stringify(stage.initialFreeAgents)));
    setDeadCap([]);
    setTaxHistory(stage.taxHistoryInitial ? [...stage.taxHistoryInitial] : []);
    setDraftPicks(stage.initialDraftPicks || 0);
    setMleUsedThisSeason(false);
    setGamePhase("missionStart");
  }, [stages]);

  const metrics = CBACoreEngine.evaluate(roster, null, null, {
    deadCap,
    features: currentStage.features,
    draftPicks,
    taxHistory,
    mleUsedThisSeason,
    minPlayers: currentStage.conditions.minPlayers,
  });

  const isCleared =
    metrics.violations.length === 0 &&
    metrics.regularContractCount >= currentStage.conditions.minPlayers &&
    metrics.totalCapHit <= currentStage.conditions.maxSalary &&
    metrics.totalOvr >= currentStage.conditions.minTotalRating &&
    (!currentStage.conditions.mustHaveStar || metrics.hasStar) &&
    (!currentStage.conditions.minDraftPicks || metrics.draftPicks >= (currentStage.conditions.minDraftPicks || 0));

  const handleClearMission = () => {
    playClickSound();
    if (isStageMode) {
      setGamePhase("clear");
    }
  };

  const handleDismissPlayer = (player) => {
    playClickSound();
    if (currentStage.features.waiver) {
      setRoster((prev) => prev.filter((p) => p.id !== player.id));
      if (currentStage.features.deadCap) {
        setDeadCap((prev) => [
          ...prev,
          {
            id: `dc_${player.id}_${Date.now()}`,
            label: `放出: ${player.name}`,
            salary: player.salary,
            yearsRemaining: player.contractYears,
            source: "waiver",
          },
        ]);
      }
    }
  };

  const handleBuyoutPlayer = (player) => {
    playClickSound();
    const result = CBACoreEngine.executeBuyout(player);
    if (result.success) {
      setRoster((prev) => prev.filter((p) => p.id !== player.id));
      setDeadCap((prev) => [...prev, ...result.deadCapEntries]);
    }
  };

  const handleStretchPlayer = (player) => {
    playClickSound();
    const result = CBACoreEngine.executeStretch(player);
    if (result.success) {
      setRoster((prev) => prev.filter((p) => p.id !== player.id));
      setDeadCap((prev) => [...prev, ...result.deadCapEntries]);
    }
  };

  const handleSignFA = (player) => {
    playClickSound();
    if (player.contractType === "twoway") {
      if (metrics.twoWayCount >= 2) {
        alert("2ウェイ枠は最大2人までです。");
        return;
      }
    }
    if (player.contractType !== "twoway") {
      if (metrics.regularContractCount >= 15) {
        alert("通常契約は最大15人までです。");
        return;
      }
      if (metrics.totalCapHit + player.salary > currentStage.conditions.maxSalary && !currentStage.features.mle) {
        alert("キャップ超過のため契約できません。");
        return;
      }
    }
    setRoster((prev) => [...prev, player]);
    setFreeAgents((prev) => prev.filter((fa) => fa.id !== player.id));
  };

  const handleUseMLE = (player) => {
    playClickSound();
    const mleCheck = CBACoreEngine.canUseMLE(player.salary, metrics.mleRemaining, metrics.apronStatus);
    if (!mleCheck.allowed) {
      alert(mleCheck.message);
      return;
    }
    setRoster((prev) => [...prev, player]);
    setFreeAgents((prev) => prev.filter((fa) => fa.id !== player.id));
    setMleUsedThisSeason(true);
  };

  const handleNextStage = () => {
    playClickSound();
    if (currentStageId < stages.length) {
      loadStage(currentStageId + 1);
    } else {
      setPage("title");
    }
  };

  const handleRestartStage = () => {
    playClickSound();
    loadStage(currentStageId);
  };

  const isStageMode = page === "stage";

  if (page === "title") {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white flex flex-col items-center justify-center font-sans antialiased px-4 selection:bg-cyan-500 selection:text-black">
        <div className="w-full max-w-4xl mx-auto text-center space-y-12">
          <header className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="w-1 h-16 bg-gradient-to-b from-amber-400 to-transparent"></div>
              <div>
                <p className="text-xs font-mono text-stone-500 tracking-[0.3em] uppercase mb-1">
                  Front Office Simulator
                </p>
                <h1 className="text-4xl md:text-5xl font-black font-mono tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-stone-200 to-stone-400">
                    CAP
                  </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                    HACK
                  </span>
                </h1>
                <p className="text-sm text-stone-500 font-mono mt-1">
                  Pro Basketball Salary Cap Simulation
                </p>
              </div>
            </div>
          </header>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="text"
              placeholder="GM NAME"
              value={gmName}
              onChange={(e) => setGmName(e.target.value.toUpperCase())}
              maxLength={12}
              className="w-48 bg-stone-950 border border-stone-800 text-amber-400 placeholder-stone-700 font-mono font-black text-center text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={() => {
                playClickSound();
                if (!gmName.trim()) {
                  alert("GM NAME を入力してください！");
                  return;
                }
                setIsDynasty(false);
                loadStage(1);
                setPage("stage");
              }}
              className="w-64 bg-stone-950 border border-stone-800 text-stone-300 font-mono font-black text-sm px-6 py-3 rounded-xl hover:border-amber-500 hover:text-amber-400 transition-all"
            >
              STAGE MODE ▶
            </button>
            <button
              onClick={() => {
                playClickSound();
                setIsDynasty(true);
                setPage("dynasty");
              }}
              className="w-64 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              👑 DYNASTY MODE
            </button>
          </div>
          <div>
            <button
              onClick={() => {
                playClickSound();
                setPage("leaderboard");
              }}
              className="text-sm font-mono text-stone-500 hover:text-amber-400 transition-colors"
            >
              🏆 GLOBAL LEADERBOARD
            </button>
          </div>
          <footer className="text-[10px] text-stone-700 font-mono space-y-1">
            <p>© 2025 SHOWCHOO. All Rights Reserved.</p>
            <p>This is a basketball strategy simulation game designed for educational and entertainment purposes only.</p>
            <p>All player names, team names, statistics, and related data featured in this game are entirely fictional.</p>
            <p>This game is not affiliated with, endorsed by, or connected to any real-world basketball league, team, or organization.</p>
          </footer>
        </div>
      </div>
    );
  }

  if (page === "leaderboard") {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-full">
          <LeaderboardPage />
          <button
            onClick={() => {
              playClickSound();
              setPage("title");
            }}
            className="text-sm font-mono text-stone-500 hover:text-white transition-colors"
          >
            ← タイトルに戻る
          </button>
        </div>
      </div>
    );
  }

  if (page === "dynasty") {
    return (
      <DynastyView
        onBack={() => {
          playClickSound();
          setIsDynasty(false);
          setPage("title");
        }}
        gmName={gmName}
        playClickSound={playClickSound}
        isBgmOn={isBgmOn}
        toggleBGM={toggleBGM}
      />
    );
  }

  if (page === "stage") {
    if (gamePhase === "missionStart") {
      return (
        <StageStartScreen
          stage={currentStage}
          onDismiss={() => {
            playClickSound();
            setGamePhase("playing");
          }}
        />
      );
    }

    if (gamePhase === "gameComplete") {
      return (
        <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black items-center justify-center">
          <div className="w-full max-w-2xl text-center space-y-8">
            <h1 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              ✨ ALL STAGES CLEAR ✨
            </h1>
            <div className="bg-[#141210] border border-amber-700 rounded-2xl p-6 space-y-4">
              <p className="text-xl text-stone-300">すべてのミッションをクリアしました！</p>
              <p className="text-sm text-stone-400">あなたはCBAマスターです。すべての給与規制を理解し、最適なチーム構築を実現しました。</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  playClickSound();
                  loadStage(1);
                }}
                className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-6 py-3 rounded-xl text-sm hover:text-amber-400 transition-all"
              >
                もう一度プレイ
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setPage("title");
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 font-mono font-black px-6 py-3 rounded-xl text-sm transition-all"
              >
                タイトルに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (gamePhase === "clear") {
      return (
        <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black items-center justify-center">
          <div className="w-full max-w-3xl flex flex-col items-center gap-8">

            {/* クリアスタンプ */}
            <div className="relative">
              <div
                className="text-[120px] md:text-[160px] font-black font-mono text-emerald-400 tracking-widest select-none opacity-90 rotate-[-12deg]"
                style={{ textShadow: '0 0 60px rgba(52,211,153,0.4), 0 0 120px rgba(52,211,153,0.15)' }}
              >
                CLEAR
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-mono text-emerald-300 tracking-[0.4em] whitespace-nowrap">
                STAGE {String(currentStageId).padStart(2, "0")} MISSION COMPLETE
              </div>
            </div>

            {/* 成績サマリー */}
            <div className="bg-[#141210] border border-emerald-700 rounded-2xl p-6 w-full max-w-md space-y-3">
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm space-y-1">
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Cap Hit:</span>
                  <span className="text-emerald-400">
                    ${(metrics.totalCapHit / 1e6).toFixed(1)}M / ${(currentStage.conditions.maxSalary / 1e6).toFixed(0)}M
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Total Rating:</span>
                  <span className="text-amber-400">
                    {metrics.totalOvr} / {currentStage.conditions.minTotalRating}+
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Players:</span>
                  <span className="text-white">
                    {metrics.regularContractCount}
                    {metrics.twoWayCount > 0 && (
                      <span className="text-purple-400">+{metrics.twoWayCount} (2W)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={handleRestartStage}
                className="bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black px-6 py-3 rounded-xl text-sm transition-all"
              >
                🔄 もう一度挑戦
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  if (currentStageId < stages.length) {
                    loadStage(currentStageId + 1);
                  } else {
                    setGamePhase("gameComplete");
                  }
                }}
                className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-stone-950 font-mono font-black px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                OK ▶ 次のステージへ
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ═══════ STAGE MODE PLAYING ═══════
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black">
        <div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
          <header className="w-full max-w-7xl mx-auto mb-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  playClickSound();
                  setPage("title");
                }}
                className="px-3 py-2 text-stone-500 hover:text-stone-300 rounded-lg transition-all text-sm font-mono"
              >
                🏠
              </button>
              <div>
                <h1 className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                  CAPHACK
                </h1>
                <span className="text-sm font-mono text-stone-400">
                  STAGE {String(currentStageId).padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-stone-400">
                {currentStage.title.split("//")[0].trim()}
              </span>
              <button
                onClick={() => {
                  playClickSound();
                  toggleBGM();
                }}
                className={
                  "px-3 py-2 rounded-lg transition-all text-sm " +
                  (isBgmOn
                    ? "text-emerald-400 bg-emerald-950/40"
                    : "text-stone-500 hover:text-stone-300")
                }
              >
                {isBgmOn ? "🔊" : "🔇"}
              </button>
            </div>
          </header>

          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 flex-1 items-stretch">
            <div className="w-full lg:w-[42%] space-y-4 flex flex-col justify-between">
              <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl p-5 space-y-3">
                <span className="text-sm font-mono font-black text-cyan-400 uppercase tracking-widest">
                  MISSION
                </span>
                <p className="text-xl text-white font-bold leading-relaxed">
                  {currentStage.description}
                </p>
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm text-stone-400">
                  <div className="flex justify-between py-1">
                    <span>Cap Hit上限:</span>
                    <span className="text-emerald-400">
                      ${(currentStage.conditions.maxSalary / 1e6).toFixed(0)}M
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>最低Rating:</span>
                    <span className="text-amber-400">
                      {currentStage.conditions.minTotalRating}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>最低人数:</span>
                    <span className="text-cyan-400">
                      {currentStage.conditions.minPlayers}人
                    </span>
                  </div>
                  {currentStage.conditions.mustHaveStar && (
                    <div className="flex justify-between py-1">
                      <span>スター:</span>
                      <span className="text-yellow-400">★必須 (Rating 90+)</span>
                    </div>
                  )}
                  {currentStage.conditions.minDraftPicks > 0 && (
                    <div className="flex justify-between py-1">
                      <span>ドラフトピック:</span>
                      <span className="text-purple-400">
                        {currentStage.conditions.minDraftPicks}枚以上
                      </span>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl p-5 space-y-3">
                <span className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">
                  RULE
                </span>
                <div className="bg-amber-950/30 border border-amber-800 rounded-xl p-4">
                  <h4 className="text-base font-black text-amber-300 mb-2">
                    {currentStage.ruleExplanation.title}
                  </h4>
                  <p className="text-sm text-stone-300 leading-relaxed">
                    {currentStage.ruleExplanation.text}
                  </p>
                </div>
              </section>

              {metrics.violations.length > 0 && (
                <section className="bg-red-950/30 border border-red-800 rounded-xl shadow-xl p-5 space-y-3">
                  <span className="text-sm font-mono font-black text-red-400 uppercase tracking-widest">
                    WARNINGS
                  </span>
                  {metrics.violations.map((v) => (
                    <div
                      key={v.id}
                      className="bg-red-950/50 border border-red-700 rounded-xl p-4"
                    >
                      <h4 className="text-base font-black text-red-300 mb-1">
                        {v.label}
                      </h4>
                      <p className="text-sm text-red-400">{v.text}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>

            <div className="w-full lg:w-[58%] space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col min-h-0">
                  <div className="px-4 py-3 border-b border-stone-900 flex justify-between items-center shrink-0">
                    <h3 className="text-sm font-mono font-black text-cyan-400 uppercase tracking-widest">
                      CURRENT ROSTER
                    </h3>
                    <span className="text-sm text-stone-500 font-mono">
                      {roster.length}人
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-center py-2 px-1">EXP</th>
                          <th className="text-center py-2 px-1">OVR</th>
                          <th className="text-right py-2 px-3">Salary</th>
                          <th className="text-center py-2 px-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((player) => (
                          <tr
                            key={player.id}
                            className="border-t border-stone-900/50 hover:bg-stone-950/60 transition-colors"
                          >
                            <td className="py-1.5 px-3">
                              <div className="font-bold text-white text-sm">
                                {player.name}
                              </div>
                              <div className="flex gap-1 mt-0.5">
                                {player.birdRights === "Full" && (
                                  <span className="text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                                    🐦 BIRD
                                  </span>
                                )}
                                {player.contractType === "minimum" && (
                                  <span className="text-[10px] bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded font-mono">
                                    MIN
                                  </span>
                                )}
                                {player.contractType === "twoway" && (
                                  <span className="text-[10px] bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                                    2WAY
                                  </span>
                                )}
                                {player.contractType === "rookie" && (
                                  <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                                    Rookie
                                  </span>
                                )}
                                {player.optionType === "player" && (
                                  <span className="text-[10px] bg-blue-950 border border-blue-800 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                                    PO
                                  </span>
                                )}
                                {player.optionType === "team" && (
                                  <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
                                    TO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-1.5 px-1">
                              <span className="text-sm bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                                {player.experience}年
                              </span>
                            </td>
                            <td className="text-center py-1.5 px-1">
                              <span className="font-mono font-black text-amber-400 text-xl">
                                {player.rating}
                              </span>
                            </td>
                            <td className="text-right py-1.5 px-3">
                              <span className="font-mono text-stone-400 text-lg">
                                ${(player.salary / 1e6).toFixed(1)}M
                              </span>
                            </td>
                            <td className="text-center py-1.5 px-2">
                              <div className="flex flex-row gap-0.5 justify-center flex-nowrap">
                                {currentStage.features.waiver && (
                                  <button
                                    onClick={() => handleDismissPlayer(player)}
                                    title="放出（デッドキャップ発生）"
                                    className="text-[10px] bg-amber-950/60 border border-amber-800 text-amber-400 hover:text-amber-300 hover:border-amber-600 px-1 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                                  >
                                    解雇
                                  </button>
                                )}
                                {currentStage.features.buyout &&
                                  player.contractYears > 1 && (
                                    <button
                                      onClick={() => handleBuyoutPlayer(player)}
                                      title={`バイアウト成功率: ${CBACoreEngine.getBuyoutSuccessChance(player.rating)}%`}
                                      className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-400 hover:text-purple-300 hover:border-purple-600 px-1 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                                    >
                                      B/O
                                    </button>
                                  )}
                                {currentStage.features.stretch &&
                                  player.contractYears > 1 && (
                                    <button
                                      onClick={() => handleStretchPlayer(player)}
                                      title={`ストレッチ: ${player.contractYears * 2 + 1}年分割`}
                                      className="text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-600 px-1 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                                    >
                                      ST
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col min-h-0">
                  <div className="px-4 py-3 border-b border-stone-900 flex justify-between items-center shrink-0">
                    <h3 className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">
                      FREE AGENT MARKET
                    </h3>
                    <span className="text-sm text-stone-500 font-mono">
                      {freeAgents.length}人
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {currentStage.features.mle && metrics.mleRemaining > 0 && (
                      <div className="px-4 py-2 bg-cyan-950/30 border-b border-cyan-900">
                        <span className="text-xs font-mono text-cyan-400">
                          MLE残額: ${(metrics.mleRemaining / 1e6).toFixed(1)}M
                          {mleUsedThisSeason && (
                            <span className="text-stone-500 ml-2">(使用済み)</span>
                          )}
                        </span>
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-center py-2 px-1">EXP</th>
                          <th className="text-center py-2 px-1">OVR</th>
                          <th className="text-right py-2 px-3">Salary</th>
                          <th className="text-center py-2 px-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {freeAgents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-stone-600">
                              FA市場に選手がいません
                            </td>
                          </tr>
                        ) : (
                          freeAgents.map((player) => (
                            <tr
                              key={player.id}
                              className="border-t border-stone-900/50 hover:bg-stone-950/60 transition-colors"
                            >
                              <td className="py-1.5 px-3">
                                <div className="font-bold text-white text-sm">
                                  {player.name}
                                </div>
                                <div className="flex gap-1 mt-0.5">
                                  {player.contractType === "minimum" && (
                                    <span className="text-[10px] bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded font-mono">
                                      MIN
                                    </span>
                                  )}
                                  {player.contractType === "twoway" && (
                                    <span className="text-[10px] bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                                      2WAY
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center py-1.5 px-1">
                                <span className="text-sm bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                                  {player.experience}年
                                </span>
                              </td>
                              <td className="text-center py-1.5 px-1">
                                <span className="font-mono font-black text-amber-400 text-xl">
                                  {player.rating}
                                </span>
                              </td>
                              <td className="text-right py-1.5 px-3">
                                <span className="font-mono text-stone-400 text-lg">
                                  ${(player.salary / 1e6).toFixed(1)}M
                                </span>
                              </td>
                              <td className="text-center py-1.5 px-2">
                                <div className="flex flex-col gap-0.5 items-center">
                                  <button
                                    onClick={() => handleSignFA(player)}
                                    className="text-[10px] bg-cyan-950/60 border border-cyan-800 text-cyan-400 hover:text-cyan-300 hover:border-cyan-600 px-1.5 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                                  >
                                    契約
                                  </button>
                                  {currentStage.features.mle &&
                                    metrics.mleRemaining > 0 &&
                                    !mleUsedThisSeason &&
                                    player.contractType !== "twoway" && (
                                      <button
                                        onClick={() => handleUseMLE(player)}
                                        className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-400 hover:text-purple-300 hover:border-purple-600 px-1.5 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                                      >
                                        MLE
                                      </button>
                                    )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <div className="w-full max-w-7xl mx-auto mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-[#110f0e] border border-stone-800 rounded-xl p-5">
              <span className="text-xs font-mono font-black text-red-400 uppercase tracking-widest">
                REGULATORY STATUS
              </span>
              {metrics.violations.length === 0 ? (
                <div className="mt-2 text-sm text-emerald-400 font-mono">
                  ✅ リーグ規約を遵守中
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  {metrics.violations.map((v) => (
                    <div key={v.id} className="text-sm text-red-400 font-mono">
                      {v.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#110f0e] border border-stone-800 rounded-xl p-5">
              <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
                CONDITION CHECK
              </span>
              <div className="mt-2 space-y-1 text-sm font-mono">
                <div className={metrics.totalCapHit <= currentStage.conditions.maxSalary ? "text-emerald-400" : "text-red-400"}>
                  {metrics.totalCapHit <= currentStage.conditions.maxSalary ? "✅" : "❌"}{" "}
                  Cap Hit: ${(metrics.totalCapHit / 1e6).toFixed(1)}M / ${(currentStage.conditions.maxSalary / 1e6).toFixed(0)}M
                </div>
                <div className={metrics.totalOvr >= currentStage.conditions.minTotalRating ? "text-emerald-400" : "text-red-400"}>
                  {metrics.totalOvr >= currentStage.conditions.minTotalRating ? "✅" : "❌"}{" "}
                  Total Rating: {metrics.totalOvr} / {currentStage.conditions.minTotalRating}+
                </div>
                <div className={metrics.regularContractCount >= currentStage.conditions.minPlayers ? "text-emerald-400" : "text-red-400"}>
                  {metrics.regularContractCount >= currentStage.conditions.minPlayers ? "✅" : "❌"}{" "}
                  Players: {metrics.regularContractCount} / {currentStage.conditions.minPlayers}+
                </div>
                {currentStage.conditions.mustHaveStar && (
                  <div className={metrics.hasStar ? "text-emerald-400" : "text-red-400"}>
                    {metrics.hasStar ? "✅" : "❌"} Star: {metrics.hasStar ? "在籍" : "不在"} (Rating 90+)
                  </div>
                )}
                {currentStage.conditions.minDraftPicks > 0 && (
                  <div className={metrics.draftPicks >= (currentStage.conditions.minDraftPicks || 0) ? "text-emerald-400" : "text-red-400"}>
                    {metrics.draftPicks >= (currentStage.conditions.minDraftPicks || 0) ? "✅" : "❌"}{" "}
                    Draft Picks: {metrics.draftPicks} / {currentStage.conditions.minDraftPicks}+
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-[#110f0e] border border-stone-800 rounded-xl p-5">
              <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">
                SALARY CAP MONITOR
              </span>
              <div className="mt-2 space-y-1 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-stone-500">Cap Hit:</span>
                  <span className="text-white">${(metrics.totalCapHit / 1e6).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Real Payroll:</span>
                  <span className="text-white">${(metrics.actualPayroll / 1e6).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Rating:</span>
                  <span className="text-amber-400">{metrics.totalRating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Regular:</span>
                  <span className="text-white">{metrics.regularContractCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Two-Way:</span>
                  <span className="text-purple-400">{metrics.twoWayCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* クリアボタン */}
          <div className="w-full max-w-7xl mx-auto mt-4 mb-4">
            <button
              onClick={handleClearMission}
              disabled={!isCleared}
              className={
                isCleared
                  ? "w-full bg-gradient-to-r from-emerald-400 to-cyan-500 text-stone-950 font-mono font-black py-4 rounded-xl text-lg tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20 animate-pulse"
                  : "w-full bg-stone-900 border border-stone-800 text-stone-600 font-mono font-black py-4 rounded-xl text-lg tracking-widest cursor-not-allowed"
              }
            >
              {isCleared ? "✨ MISSION CLEAR！ 次のステージへ ▶" : "条件を満たしていません"}
            </button>
            {!isCleared && (
              <p className="text-xs text-stone-600 font-mono text-center mt-1">
                すべての条件をクリアするとボタンが光ります
              </p>
            )}
          </div>

          {deadCap.length > 0 && (
            <div className="w-full max-w-7xl mx-auto mb-4">
              <div className="bg-red-950/20 border border-red-900 rounded-xl p-4">
                <span className="text-xs font-mono font-black text-red-400 uppercase tracking-widest">
                  💀 DEAD CAP
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {deadCap.map((dc) => (
                    <span
                      key={dc.id}
                      className="text-xs font-mono bg-red-950/60 border border-red-800 text-red-400 px-2 py-1 rounded"
                    >
                      {dc.label}: ${(dc.salary / 1e6).toFixed(1)}M × {dc.yearsRemaining}yr
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default App;
