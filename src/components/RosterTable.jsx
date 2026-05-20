import React from 'react';

export default function RosterTable({ title, players, onActionClick, actionLabel, totalSalary }) {
  return (
    // 💡 全体のフォントベースを大きくし、パディングを調整して見やすく
    <div className="flex-1 bg-[#110f0e] border border-stone-850 rounded-xl p-5 shadow-xl font-mono">
      
      {/* 💡 テーブルタイトルの文字サイズアップ (text-sm -> text-base / trackingも強調) */}
      <div className="flex justify-between items-center border-b border-stone-900 pb-3 mb-4">
        <h3 className="text-base font-black text-stone-400 tracking-widest uppercase">{title}</h3>
        <span className="text-sm text-stone-500 font-mono font-black">TOTAL: {players.length}人</span>
      </div>

      <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
        {players.length === 0 ? (
          <div className="text-center py-12 text-stone-600 italic text-sm">選手がいません</div>
        ) : (
          players.map((p) => (
            <div key={p.id} className="bg-stone-950/80 border border-stone-900 rounded-xl p-4 flex justify-between items-center hover:border-stone-700 transition-colors gap-4">
              
              {/* 左側：選手名・能力値・契約属性バッジ */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                  {/* 🌟 選手名を大きく肉厚に (text-sm -> text-base, font-bold -> font-black) */}
                  <span className="font-black text-base text-stone-100 truncate tracking-wide">{p.name}</span>
                  
                  {/* 🌟 契約形態バッジの文字サイズ・余白を拡大してアピール */}
                  {p.contractType === "twoway" && (
                    <span className="bg-purple-950/80 border border-purple-700 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                      2-WAY (育成枠)
                    </span>
                  )}
                  {p.contractType === "minimum" && (
                    <span className="bg-amber-950/80 border border-amber-700 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                      MIN (最低保証)
                    </span>
                  )}
                  {p.contractType === "regular" && p.salary >= 35000000 && (
                    <span className="bg-cyan-950/80 border border-cyan-700 text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                      MAXスター
                    </span>
                  )}
                </div>

                {/* 🌟 サブステータス（能力値やキャリア）のフォントサイズアップ (text-[10px] -> text-xs) */}
                <div className="flex space-x-4 text-xs text-stone-400 mt-2 font-sans font-semibold">
                  <span>能力: <span className="text-emerald-400 font-bold font-mono text-sm">{p.rating}</span></span>
                  <span>キャリア: <span className="text-stone-300 font-bold font-mono text-sm">{p.experience}年</span></span>
                  {p.birdRights === "Full" && <span className="text-blue-400 font-mono text-xs">★生え抜き(バード権有)</span>}
                </div>
              </div>

              {/* 右側：年俸表示 ＋ CBA特例の解説補足 */}
              <div className="text-right shrink-0 flex items-center space-x-4">
                <div className="flex flex-col text-right justify-center">
                  {/* 🌟 最重要である「金額」を最大化・ボールド化 (text-sm -> text-lg) */}
                  <span className={`text-lg font-black font-mono tracking-wide ${p.contractType === "twoway" ? "text-purple-400" : "text-white"}`}>
                    {p.contractType === "twoway" ? "$0.0M" : `$${(p.salary / 1000000).toFixed(1)}M`}
                  </span>
                  
                  {/* 🌟 特例の注釈テキストも読みやすく大きく (text-[9px] -> text-[11px]) */}
                  {p.contractType === "twoway" && (
                    <span className="text-[11px] text-purple-400 font-sans font-bold mt-0.5 block">
                      ※CBA特例:キャップ対象外(実質$0)
                    </span>
                  )}
                  {p.contractType === "minimum" && p.experience >= 10 && (
                    <span className="text-[11px] text-amber-500 font-sans font-bold mt-0.5 block">
                      ※ベテランミニマム割引適用
                    </span>
                  )}
                </div>

                {/* 🌟 アクションボタン（獲得/放出）を大きく押しやすく変更 (text-[10px] -> text-xs, py-1.5 -> py-2) */}
                <button
                  onClick={() => onActionClick(p)}
                  className={`px-3 py-2 text-xs font-mono font-black rounded-lg border transition-all tracking-wider ${
                    title.includes("CURRENT")
                      ? "bg-stone-900 border-stone-800 text-stone-300 hover:bg-red-950/40 hover:border-red-700 hover:text-red-400"
                      : "bg-stone-900 border-stone-800 text-cyan-400 hover:bg-cyan-950/50 hover:border-cyan-500 hover:text-cyan-300"
                  }`}
                >
                  {title.includes("CURRENT") ? "放出 ✕" : "獲得 ＋"}
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}