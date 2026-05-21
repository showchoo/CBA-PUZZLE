import React from 'react';

export default function SalaryMeter({ totalSalary }) {
  const capLevel = 136000000;
  const taxLevel = 165000000;
  const firstApron = 172000000;
  const secondApron = 182500000;
  const maxRange = 210000000;

  const getPercent = (value) => Math.min((value / maxRange) * 100, 100);
  const currentPercent = getPercent(totalSalary);

  return (
    <div className="font-mono select-none pt-2">
      <div className="flex justify-between items-center mb-14 border-b border-stone-900 pb-2">
        <span className="text-stone-400 text-sm font-bold tracking-wider">SALARY CAP MONITOR // 各種閾値</span>
        <span className="text-white text-2xl font-black bg-stone-950 px-3 py-1 rounded border border-stone-800 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
          ${(totalSalary / 1000000).toFixed(1)}M
        </span>
      </div>

      <div className="relative w-full h-8 bg-stone-950 rounded-md border border-stone-800 overflow-visible mb-14">
        <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-500 relative" style={{ width: `${currentPercent}%` }}>
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-300 shadow-[0_0_8px_#22d3ee]"></div>
        </div>

        {/* 上側: TAX */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50" style={{ left: `${getPercent(taxLevel)}%` }}>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-amber-500 text-xs font-black">TAX</span>
            <span className="block text-stone-400 text-[11px] font-bold">${(taxLevel / 1000000).toFixed(0)}M</span>
          </div>
        </div>

        {/* 上側: 2nd APRON（位置を上げて重なり防止） */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/60" style={{ left: `${getPercent(secondApron)}%` }}>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-red-500 text-xs font-black">2nd APRON</span>
            <span className="block text-stone-400 text-[11px] font-bold">${(secondApron / 1000000).toFixed(0)}M</span>
          </div>
        </div>

        {/* 下側: CAP */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/50" style={{ left: `${getPercent(capLevel)}%` }}>
          <div className="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-yellow-500 text-xs font-black">CAP</span>
            <span className="block text-stone-400 text-[11px] font-bold">${(capLevel / 1000000).toFixed(0)}M</span>
          </div>
        </div>

        {/* 下側: 1st APRON */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500/60" style={{ left: `${getPercent(firstApron)}%` }}>
          <div className="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-orange-500 text-xs font-black">1st APRON</span>
            <span className="block text-stone-400 text-[11px] font-bold">${(firstApron / 1000000).toFixed(0)}M</span>
          </div>
        </div>
      </div>
    </div>
  );
}
