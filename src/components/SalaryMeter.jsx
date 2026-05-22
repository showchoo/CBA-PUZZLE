import React, { useState } from 'react';

function ZoneTip({ children, text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setShow(true);
  };
  return (
    <span className="relative inline-block cursor-help" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="fixed z-[9999] px-3 py-2.5 bg-stone-950 border border-stone-500 rounded-xl text-sm text-white leading-relaxed shadow-2xl shadow-black/60 w-72 pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -110%)' }}>
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-stone-500"></div>
        </div>
      )}
    </span>
  );
}

export default function SalaryMeter({ totalSalary, capLevel, taxLevel, firstApron, secondApron }) {
  const max = secondApron * 1.15;
  const pct = Math.min(100, (totalSalary / max) * 100);

  const capPct = (capLevel / max) * 100;
  const taxPct = (taxLevel / max) * 100;
  const apron1Pct = (firstApron / max) * 100;
  const apron2Pct = (secondApron / max) * 100;

  const getZone = () => {
    if (totalSalary <= capLevel) return { label: 'Under Cap', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (totalSalary <= taxLevel) return { label: 'Cap〜Tax', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    if (totalSalary <= firstApron) return { label: 'Tax〜1st Apron', color: 'text-orange-400', bg: 'bg-orange-500' };
    if (totalSalary <= secondApron) return { label: '1st〜2nd Apron', color: 'text-red-400', bg: 'bg-red-500' };
    return { label: 'Over 2nd Apron', color: 'text-red-600', bg: 'bg-red-700' };
  };
  const zone = getZone();

  return (
    <div className="space-y-1.5">
      {/* バー */}
      <div className="relative h-4 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
        {/* ゾーン背景 */}
        <div className="absolute inset-0 flex">
          <div className="bg-emerald-950/40" style={{ width: `${capPct}%` }} />
          <div className="bg-yellow-950/40" style={{ width: `${taxPct - capPct}%` }} />
          <div className="bg-orange-950/40" style={{ width: `${apron1Pct - taxPct}%` }} />
          <div className="bg-red-950/40" style={{ width: `${apron2Pct - apron1Pct}%` }} />
          <div className="bg-red-950/60 flex-1" />
        </div>

        {/* マーカーライン */}
        <div className="absolute top-0 bottom-0 w-px bg-emerald-500/60" style={{ left: `${capPct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-yellow-500/60" style={{ left: `${taxPct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-orange-500/60" style={{ left: `${apron1Pct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-red-500/60" style={{ left: `${apron2Pct}%` }} />

        {/* 現在位置 */}
        <div className={'absolute top-0 bottom-0 w-1.5 rounded-full transition-all duration-500 ' + zone.bg}
          style={{ left: `calc(${pct}% - 3px)` }} />
      </div>

      {/* ラベル行 */}
      <div className="flex justify-between text-[10px] font-mono text-stone-500 relative" style={{ paddingRight: '2px' }}>
        <span>$0</span>
        <ZoneTip text="サラリーキャップ（$136M）：チームの年俸総額の上限。FA契約やトレードの制約の基準。超過しても契約は可能だが制限を受ける。">
          <span className="text-emerald-500 cursor-help">${(capLevel / 1000000).toFixed(0)}M Cap</span>
        </ZoneTip>
        <ZoneTip text="ラグジュアリータックスライン（$165M）：超過分に罰金が課されるライン。超過額が大きいほど税率が上がる。">
          <span className="text-yellow-500 cursor-help">${(taxLevel / 1000000).toFixed(0)}M Tax</span>
        </ZoneTip>
        <ZoneTip text="第1エプロン（$178.1M）：超過するとMLE額が下がり、FA契約数が制限。ハードキャップの基準にもなる。">
          <span className="text-orange-500 cursor-help">${(firstApron / 1000000).toFixed(1)}M 1st</span>
        </ZoneTip>
        <ZoneTip text="第2エプロン（$188.9M）：超過でFA契約禁止、MLE没収、ドラフトピック順位低下等の厳しい制約。">
          <span className="text-red-500 cursor-help">${(secondApron / 1000000).toFixed(1)}M 2nd</span>
        </ZoneTip>
      </div>

      {/* 現在ゾーン表示 */}
      <div className="flex items-center gap-2">
        <div className={'w-2 h-2 rounded-full ' + zone.bg} />
        <span className={'text-xs font-mono font-black ' + zone.color}>{zone.label}</span>
      </div>
    </div>
  );
}
