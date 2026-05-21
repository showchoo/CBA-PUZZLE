import React from 'react';

export default function RosterTable({ title, players, onActionClick, actionLabel, totalSalary }) {
  return (
    <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col min-h-0">
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-stone-900 flex justify-between items-center shrink-0">
        <h3 className="text-[10px] sm:text-sm font-mono font-black text-cyan-400 uppercase tracking-widest">{title}</h3>
        <span className="text-[9px] sm:text-[10px] text-white font-mono">{players.length}人</span>
      </div>

      {/* PC: テーブル表示 */}
      <div className="hidden sm:block overflow-y-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white font-mono text-[9px] uppercase tracking-wider">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-center py-2 px-1">Pos</th>
              <th className="text-center py-2 px-1">OVR</th>
              <th className="text-right py-2 px-3">Salary</th>
              <th className="text-center py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-stone-900/50 hover:bg-stone-950/60 transition-colors">
                <td className="py-1.5 px-3">
                  <div className="font-bold text-white text-xs">{player.name}</div>
                </td>
                <td className="text-center py-1.5 px-1">
                  <span className="text-[9px] bg-stone-800 text-white px-1.5 py-0.5 rounded font-mono">{player.position}</span>
                </td>
                <td className="text-center py-1.5 px-1">
                  <span className="font-mono font-black text-amber-400 text-xs">{player.ovr}</span>
                </td>
                <td className="text-right py-1.5 px-3">
                  <span className="font-mono text-white text-[10px]">${player.salary.toLocaleString()}</span>
                </td>
                <td className="text-center py-1.5 px-2">
                  <button onClick={() => onActionClick(player)} className="text-[9px] bg-stone-900 border border-stone-800 text-white hover:text-cyan-400 hover:border-stone-600 px-2 py-0.5 rounded transition-colors font-mono">{actionLabel}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* スマホ: カード表示 */}
      <div className="sm:hidden overflow-y-auto flex-1 p-2 space-y-1.5">
        {players.map((player) => (
          <div key={player.id} className="bg-stone-950 border border-stone-900 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-xs truncate">{player.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] bg-stone-800 text-white px-1.5 py-0.5 rounded font-mono">{player.position}</span>
                <span className="font-mono font-black text-amber-400 text-xs">OVR {player.ovr}</span>
              </div>
              <div className="font-mono text-white text-[10px] mt-0.5">${player.salary.toLocaleString()}</div>
            </div>
            <button onClick={() => onActionClick(player)} className="bg-stone-900 border border-stone-800 text-white hover:text-cyan-400 hover:border-stone-600 px-2.5 py-1.5 rounded-lg transition-colors font-mono text-[10px] shrink-0 ml-2">{actionLabel}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
