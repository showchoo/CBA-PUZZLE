import React from "react";

export default function StageStartScreen({ stage, onDismiss }) {
  if (!stage) return null;

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-mono text-stone-500 tracking-widest">
            STAGE {String(stage.id).padStart(2, "0")}
          </p>
          <h1 className="text-3xl md:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 leading-tight">
            {stage.title}
          </h1>
        </div>

        <div className="bg-[#141210] border border-stone-800 rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">
              MISSION
            </span>
            <p className="text-lg text-stone-300 leading-relaxed">
              {stage.description}
            </p>
          </div>

          <div className="border-t border-stone-800 pt-5 space-y-3">
            <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
              {stage.ruleExplanation.title}
            </span>
            <p className="text-sm text-stone-400 leading-relaxed">
              {stage.ruleExplanation.text}
            </p>
          </div>

          <div className="border-t border-stone-800 pt-5 space-y-2">
            <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">
              CLEAR CONDITIONS
            </span>
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm text-stone-400 space-y-1">
              <div className="flex justify-between py-1">
                <span>Cap Hit上限:</span>
                <span className="text-emerald-400">
                  ${(stage.conditions.maxSalary / 1e6).toFixed(0)}M以下
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>最低Total Rating:</span>
                <span className="text-amber-400">
                  {stage.conditions.minTotalRating}以上
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>最低人数:</span>
                <span className="text-cyan-400">
                  {stage.conditions.minPlayers}人
                </span>
              </div>
              {stage.conditions.mustHaveStar && (
                <div className="flex justify-between py-1">
                  <span>スター選手:</span>
                  <span className="text-yellow-400">★必須 (Rating 90+)</span>
                </div>
              )}
              {stage.conditions.minDraftPicks > 0 && (
                <div className="flex justify-between py-1">
                  <span>ドラフトピック:</span>
                  <span className="text-purple-400">
                    {stage.conditions.minDraftPicks}枚以上
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onDismiss}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black px-10 py-4 rounded-xl text-lg tracking-widest transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02]"
          >
            ミッション開始 ▶
          </button>
        </div>
      </div>
    </div>
  );
}
