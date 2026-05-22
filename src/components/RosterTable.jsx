import React, { useState } from 'react';

const fmt = (v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0/, '')}M` : `$${v.toLocaleString()}`;

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

export default function RosterTable({ title, players, onActionClick, actionLabel, totalSalary, dynastyMode, onWaiver, onBuyout, onStretch }) {
  return (
    <div className="flex-1 bg-[#141210] border border-stone-800 rounded-xl shadow-xl flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-stone-900 flex justify-between items-center shrink-0">
        <h3 className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">{title}</h3>
        <span className="text-xs text-stone-500 font-mono">{players.length}人</span>
      </div>
      <div className="overflow-y-auto flex-1">
        {players.map((player) => (
          <div key={player.id} className="border-b border-stone-900/40 hover:bg-stone-950/60 transition-colors px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              {/* 左側: 選手情報 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-white text-sm truncate">{player.name}</span>
                  {player.birdRights === 'Full' && (
                    <Badge tooltip="バード特例：3年以上在籍の生え抜き選手。サラリーキャップを超過しても再契約できる特別な権利。" className="text-[9px] bg-blue-900 text-blue-300 px-1 py-0 rounded font-mono leading-tight">🐦</Badge>
                  )}
                  {player.contractType === 'minimum' && (
                    <Badge tooltip="ベテランミニマム：10年以上の実績を持つベテランが最低保証で契約。帳簿上のキャップ加算は一律$2.0Mに割引。" className="text-[9px] bg-orange-900 text-orange-300 px-1 py-0 rounded font-mono leading-tight">MIN</Badge>
                  )}
                  {player.contractType === 'twoway' && (
                    <Badge tooltip="2-Way契約：若手向けの特別枠。キャップヒットにカウントされない。" className="text-[9px] bg-purple-900 text-purple-300 px-1 py-0 rounded font-mono leading-tight">2W</Badge>
                  )}
                  {player.contractType === 'rookie' && (
                    <Badge tooltip="ルーキー契約：新人選手の低額契約。将来の成長が期待できる有望株。" className="text-[9px] bg-emerald-900 text-emerald-300 px-1 py-0 rounded font-mono leading-tight">RK</Badge>
                  )}
                  {player.hasOption && (
                    <Badge
                      tooltip={player.optionType === 'player' ? 'プレイヤーオプション：選手が契約最終年に「延長 or FA」を選択できる' : 'チームオプション：チームが契約最終年に「延長 or 切断」を選択できる'}
                      className={'text-[9px] px-1 py-0 rounded font-mono leading-tight ' + (player.optionType === 'player' ? 'bg-blue-950 border border-blue-800 text-blue-400' : 'bg-cyan-950 border border-cyan-800 text-cyan-400')}
                    >
                      {player.optionType === 'player' ? 'PO' : 'TO'}
                    </Badge>
                  )}
                  {player.supermaxEligible && (
                    <Badge
                      tooltip="スーパーマックス対象選手：Rating 90以上かつチーム4年以上在籍。キャップの35%の大型契約が可能。"
                      className="text-[9px] bg-amber-950 border border-amber-700 text-amber-400 px-1 py-0 rounded font-mono leading-tight"
                    >
                      SMAX
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {dynastyMode ? (
                    <>
                      <span className="text-[11px] text-stone-500 font-mono">Age {player.age}</span>
                      <span className="text-stone-700">·</span>
                      <span className="text-[11px] font-mono font-black text-amber-400">R{player.rating}</span>
                      <span className="text-stone-700">·</span>
                      <span className="text-[11px] font-mono text-stone-400">{fmt(player.salary)}</span>
                      <span className="text-stone-700">·</span>
                      <span className="text-[11px] font-mono text-cyan-400 font-black">{player.contractYears}yr</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-stone-500 font-mono">{player.experience}年</span>
                      <span className="text-stone-700">·</span>
                      <span className="text-[11px] font-mono font-black text-amber-400">R{player.rating}</span>
                      <span className="text-stone-700">·</span>
                      <span className="text-[11px] font-mono text-stone-400">{fmt(player.salary)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 右側: アクションボタン */}
              <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                {dynastyMode ? (
                  <>
                    <TipButton
                      onClick={() => onWaiver && onWaiver(player)}
                      className="text-[10px] bg-amber-950/60 border border-amber-800 text-amber-400 hover:text-amber-300 hover:border-amber-600 px-1.5 py-0.5 rounded transition-colors font-mono"
                      tip="ウェイブ（Waiver）：選手を放出するプロセス。残り契約の100%がデッドキャップになる。"
                    >
                      W
                    </TipButton>
                    {player.contractYears > 1 && (
                      <TipButton
                        onClick={() => onBuyout && onBuyout(player)}
                        className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-400 hover:text-purple-300 hover:border-purple-600 px-1.5 py-0.5 rounded transition-colors font-mono"
                        tip="バイアウト（Buyout）：選手と交渉して契約を減額。デッドキャップ50〜70%に軽減。Ratingが低い選手ほど同意しやすい。"
                      >
                        B/O
                      </TipButton>
                    )}
                    {player.contractYears > 1 && (
                      <TipButton
                        onClick={() => onStretch && onStretch(player)}
                        className="text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-600 px-1.5 py-0.5 rounded transition-colors font-mono"
                        tip="ストレッチ（Stretch）：残り契約を（年数×2+1）年で均等分割。今年のキャップは空くが、長期のデッドキャップになる。"
                      >
                        ST
                      </TipButton>
                    )}
                  </>
                ) : (
                  <button onClick={() => onActionClick(player)} className="text-xs bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 px-2.5 py-1 rounded transition-colors font-mono whitespace-nowrap">{actionLabel}</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <div className="text-center py-8 text-stone-600 font-mono text-sm">選手がいません</div>
        )}
      </div>
    </div>
  );
}
