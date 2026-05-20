import React, { useState, useEffect, useCallback } from 'react';

export default function LeaderboardPage({ currentStageId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(currentStageId || 1);

  // 🌟 本物の公開用スプレッドシートID
  const SPREADSHEET_KEY = "1hMyi15Kw7nNo5WHwpsvKlIhqNPM5s8WR8C15Bc-TeMg";
  const GOOGLE_DATA_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_KEY}/gviz/tq?tqx=out:json`;

  const fetchLeaderboard = useCallback(async () => {
    setIsRankingLoading(true);
    try {
      const response = await fetch(GOOGLE_DATA_URL);
      const text = await response.text();
      const jsonString = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
      const jsonData = JSON.parse(jsonString);
      const rows = jsonData.table.rows;
      
      const parsedScores = rows.map(row => {
        if (!row.c || row.c.length < 4) return null;
        const rawStage = row.c[1] ? parseInt(row.c[1].v) : 1;
        const rawName = row.c[2] ? String(row.c[2].v).trim() : "ANONYMOUS";
        const rawScore = row.c[3] ? parseInt(row.c[3].v) : 0;

        return {
          stage: isNaN(rawStage) ? 1 : rawStage,
          name: rawName || "ANONYMOUS",
          score: isNaN(rawScore) ? 0 : rawScore
        };
      }).filter(item => item !== null);

      setLeaderboard(parsedScores);
    } catch (error) {
      console.error("Ranking Fetch Error:", error);
    } finally {
      setIsRankingLoading(false);
    }
  }, [GOOGLE_DATA_URL]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // 選択されたステージのデータを抽出してソート
  const filteredRankings = leaderboard
    .filter(item => item.stage === selectedStage)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#110f0e] border border-stone-800 rounded-2xl p-6 shadow-2xl font-mono">
      {/* 💡 ヘッダー部分のレイアウト崩れ防止策 */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-stone-800 pb-5 mb-6 gap-5">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 uppercase whitespace-nowrap">
            🏆 GLOBAL LEADERBOARD // 殿堂入りGM一覧
          </h2>
          <p className="text-xs text-stone-500 mt-1">CBAパズルをハックした世界中の敏腕GMたちの記録</p>
        </div>
        
        {/* 💡 ボタン部分の回り込み・レスポンシブ最適化 */}
        <div className="flex bg-stone-950 p-1.5 rounded-xl border border-stone-850 shrink-0 flex-wrap gap-1 w-full sm:w-auto justify-start sm:justify-end">
          {[1, 2, 3, 4, 5].map((stageNum) => (
            <button
              key={stageNum}
              onClick={() => setSelectedStage(stageNum)}
              className={`px-3.5 py-2 text-xs font-mono font-black rounded-lg transition-all tracking-wider ${
                selectedStage === stageNum 
                  ? 'bg-amber-500 text-stone-950 shadow-lg' 
                  : 'text-stone-400 hover:text-white hover:bg-stone-900/50'
              }`}
            >
              STAGE 0{stageNum}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-12 text-xs text-stone-500 font-bold px-4 uppercase tracking-wider mb-3">
          <span className="col-span-2 text-center">RANK</span>
          <span className="col-span-6">GM NAME</span>
          <span className="col-span-4 text-right text-amber-500">SCORE</span>
        </div>

        {isRankingLoading ? (
          <div className="text-center py-12 text-stone-600 animate-pulse text-sm">CONNECTING TO DATABASE...</div>
        ) : filteredRankings.length === 0 ? (
          <div className="text-center py-12 text-stone-600 italic text-sm">
            このステージの登録データはまだありません。<br />
            最初のGMになってスコアを刻め！
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRankings.map((row, index) => {
              const rank = index + 1;
              let rankStyle = "bg-stone-950/40 border-stone-900/50 text-stone-300";
              let badgeColor = "text-stone-500";

              if (rank === 1) {
                rankStyle = "bg-yellow-950/20 border-yellow-600/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.05)]";
                badgeColor = "text-yellow-400 font-black";
              } else if (rank === 2) {
                rankStyle = "bg-stone-900/60 border-stone-700/50 text-stone-200";
                badgeColor = "text-stone-300 font-bold";
              } else if (rank === 3) {
                rankStyle = "bg-amber-950/10 border-amber-800/30 text-amber-600";
                badgeColor = "text-amber-600 font-bold";
              }

              return (
                <div key={index} className={`grid grid-cols-12 border py-3 px-4 rounded-xl items-center transition-all hover:scale-[1.01] ${rankStyle}`}>
                  <span className={`col-span-2 text-center font-black text-base ${badgeColor}`}>#{rank}</span>
                  <span className="col-span-6 font-bold text-sm truncate pr-4">{row.name}</span>
                  <span className="col-span-4 text-right font-black text-base tracking-wide text-yellow-400">{row.score.toLocaleString()} <span className="text-xs text-stone-500">pts</span></span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-900 text-[10px] text-stone-600">
        <span>DATABASE KEY: {SPREADSHEET_KEY.slice(0, 12)}...</span>
        <button onClick={fetchLeaderboard} className="bg-stone-900 hover:bg-stone-850 text-stone-400 px-3 py-1 rounded border border-stone-800 transition-colors">
          LIVE REFRESH ↻
        </button>
      </div>
    </div>
  );
}