import React, { useState } from 'react';

const fmt = (v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0/, '')}M` : `$$$${v.toLocaleString()}`;

function Badge({ children, tooltip, className }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setShow(true);
  };
  return (
    <span onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      <span className={className + " cursor-help"}>{children}</span>
      {show && (
        <div className="fixed z-[9999] px-3 py-2.5 bg-stone-950 border border-stone-500 rounded-xl text-sm text-white leading-relaxed shadow-2xl shadow-black/60 w-64 pointer-events-none" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -110%)' }}>
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-stone-500"></div>
        </div>
      )}
    </span>
  );
}

function TipButton({ children, onClick, className, tip }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setShow(true);
  };
  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      <button onClick={onClick} className={className}>{children}</button>
      {show && (
        <div className="fixed z-[9999] px-3 py-2 bg-stone-950 border border-stone-500 rounded-lg text-xs text-white leading-relaxed shadow-xl w-56 pointer-events-none" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -110%)' }}>
          {tip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-stone-500"></div>
        </div>
      )}
    </span>
  );
}

export default function RosterTable({ title, players, onActionClick, actionLabel, totalSalary, dynastyMode, onWaiver, onBuyout }) {
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
              <th className="text-left py-2 px-3 whitespace-nowrap">Name</th>
              {dynastyMode ? (
                <>
                  <th className="text-center py-2 px-1 whitespace-nowrap">Age</th>
                  <th className="text-center py-2 px-1 whitespace-nowrap">Rating</th>
                  <th className="text-right py-2 px-2 whitespace-nowrap">Salary</th>
                  <th className="text-center py-2 px-2 whitespace-nowrap">契約</th>
                </>
              ) : (
                <>
                  <th className="text-center py-2 px-1 whitespace-nowrap">EXP</th>
                  <th className="text-center py-2 px-1 whitespace-nowrap">Rating</th>
                  <th className="text-right py-2 px-3 whitespace-nowrap">Salary</th>
                </>
              )}
              <th className="text-center py-2 px-2 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-stone-900/50 hover:bg-stone-950/60 transition-colors">
                <td className="py-1.5 px-3">
                  <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                    {player.name}
                    {player.birdRights === 'Full' && (
                      <Badge tooltip="バード特例：3年以上在籍の生え抜き選手。サラリーキャップを超過しても再契約できる特別な権利。" className="text-sm bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-mono">🐦 BIRD</Badge>
                    )}
                    {player.contractType === 'minimum' && (
                      <Badge tooltip="ベテランミニマム：10年以上の実績を持つベテランが最低保証で契約。帳簿上のキャップ加算は一律$2.0Mに割引。" className="text-sm bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded font-mono">MIN</Badge>
                    )}
                    {player.contractType === 'twoway' && (
                      <Badge tooltip="2-Way契約：NBAとGリーグを行き来する若手向けの特別枠。キャップヒットにカウントされない。" className="text-sm bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded font-mono">2WAY</Badge>
                    )}
                    {player.contractType === 'rookie' && (
                      <Badge tooltip="ルーキー契約：新人選手の低額契約。将来の成長が期待できる有望株。" className="text-sm bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Rookie</Badge>
                    )}
                  </div>
                </td>
                {dynastyMode ? (
                  <>
                    <td className="text-center py-1.5 px-1"><span className="font-mono text-stone-300 text-sm">{player.age}</span></td>
                    <td className="text-center py-1.5 px-1"><span className="font-mono font-black text-amber-400 text-xl">{player.rating}</span></td>
                    <td className="text-right py-1.5 px-2"><span className="font-mono text-stone-400 text-sm">{fmt(player.salary)}</span></td>
                    <td className="text-center py-1.5 px-1"><span className="font-mono text-cyan-400 text-sm font-black">{player.contractYears}yr</span></td>
                  </>
                ) : (
                  <>
                    <td className="text-center py-1.5 px-1"><span className="text-sm bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">{player.experience}年</span></td>
                    <td className="text-center py-1.5 px-1"><span className="font-mono font-black text-amber-400 text-xl">{player.rating}</span></td>
                    <td className="text-right py-1.5 px-3"><span className="font-mono text-stone-400 text-lg">{fmt(player.salary)}</span></td>
                  </>
                )}
                <td className="text-center py-1.5 px-2">
                  {dynastyMode ? (
                    <div className="flex flex-row gap-1 justify-center flex-nowrap">
                      <TipButton
                        onClick={() => onWaiver && onWaiver(player)}
                        className="text-[10px] bg-amber-950/60 border border-amber-800 text-amber-400 hover:text-amber-300 hover:border-amber-600 px-1.5 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                        tip="ウェイブ（Waiver）：NBAで選手を放出するプロセス。残り契約の100%がデッドキャップになる。"
                      >
                        ウェイブ
                      </TipButton>
                      {player.contractYears > 1 && (
                        <TipButton
                          onClick={() => onBuyout && onBuyout(player)}
                          className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-400 hover:text-purple-300 hover:border-purple-600 px-1.5 py-0.5 rounded transition-colors font-mono whitespace-nowrap"
                          tip="バイアウト（Buyout）：選手と交渉して契約を減額。デッドキャップ50〜70%に軽減。Ratingが低い選手ほど同意しやすい。"
                        >
                          B/O
                        </TipButton>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => onActionClick(player)} className="text-xs bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 px-2 py-0.5 rounded transition-colors font-mono whitespace-nowrap">{actionLabel}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
