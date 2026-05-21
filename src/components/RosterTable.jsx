import React from 'react';

export default function RosterTable({ title, players, onActionClick, actionLabel, totalSalary }) {
  return (
    <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-stone-900 flex justify-between items-center shrink-0">
        <h3 className="text-sm font-mono font-black text-cyan-400 uppercase tracking-widest">{title}</h3>
        <span className="text-[10px] text-stone-500 font-mono">{players.length}人</span>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500 font-mono text-[9px] uppercase tracking-wider">
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
                  <span className="text-[9px] bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-mono">{player.position}</span>
                </td>
                <td className="text-center py-1.5 px-1">
                  <span className="font-mono font-black text-amber-400 text-xs">{player.ovr}</span>
                </td>
                <td className="text-right py-1.5 px-3">
                  <span className="font-mono text-stone-400 text-[10px]">${player.salary.toLocaleString()}</span>
                </td>
                <td className="text-center py-1.5 px-2">
                  <button onClick={() => onActionClick(player)} className="text-[9px] bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 px-2 py-0.5 rounded transition-colors font-mono">{actionLabel}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
