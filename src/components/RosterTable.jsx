import React from 'react';

const fmt = (v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0/, '')}M` : `$$$${v.toLocaleString()}`;

export default function RosterTable({ title, players, onActionClick, actionLabel, totalSalary }) {
  return (
    <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-stone-900 flex justify-between items-center shrink-0">
        <h3 className="text-sm font-mono font-black text-cyan-400 uppercase tracking-widest">{title}</h3>
        <span className="text-sm text-stone-500 font-mono">{players.length}人</span>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-center py-2 px-1">EXP</th>
              <th className="text-center py-2 px-1">OVR</th>
              <th className="text-right py-2 px-3">Salary</th>
              <th className="text-center py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-stone-900/50 hover:bg-stone-950/60 transition-colors">
                <td className="py-1.5 px-3">
                  <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                    {player.name}
                    {player.birdRights === 'Full' && <span className="text-[9px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-mono">🐦 BIRD</span>}
                    {player.contractType === 'minimum' && <span className="text-[9px] bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded font-mono">MIN</span>}
                    {player.contractType === 'twoway' && <span className="text-[9px] bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded font-mono">2WAY</span>}
                  </div>
                </td>
                <td className="text-center py-1.5 px-1">
                  <span className="text-sm bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-mono">{player.experience}年</span>
                </td>
                <td className="text-center py-1.5 px-1">
                  <span className="font-mono font-black text-amber-400 text-xl">{player.rating}</span>
                </td>
                <td className="text-right py-1.5 px-3">
                  <span className="font-mono text-stone-400 text-lg">{fmt(player.salary)}</span>
                </td>
                <td className="text-center py-1.5 px-2">
                  <button onClick={() => onActionClick(player)} className="text-xs bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 px-2 py-0.5 rounded transition-colors font-mono">{actionLabel}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
