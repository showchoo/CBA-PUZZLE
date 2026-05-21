import React from 'react';

export default function SalaryMeter({ totalSalary, capLevel = 140000000, taxLevel = 170000000, firstApron = 178000000, secondApron = 189000000 }) {
  const minRange = 100000000;
  const maxRange = 210000000;

  const getPercent = (value) => Math.min(Math.max(((value - minRange) / (maxRange - minRange)) * 100, 0), 100);
  const currentPercent = getPercent(totalSalary);

  return (
    <div className="font-mono select-none pt-2">
      <div className="flex justify-between items-center mb-16 border-b border-stone-900 pb-2">
        <span className="text-stone-400 text-xl font-bold tracking-wider">SALARY CAP MONITOR</span>
        <span className="text-white text-4xl font-black bg-stone-950 px-3 py-1 rounded border border-stone-800 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
          ${(totalSalary / 1000000).toFixed(1)}M
        </span>
      </div>

      <div className="relative w-full h-8 bg-stone-950 rounded-md border border-stone-800 overflow-visible mb-20">
        <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-500 relative" style={{ width: `${currentPercent}%` }}>
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-300 shadow-[0_0_8px_#22d3ee]"></div>
        </div>

        {/* 左端: $100M~ */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-stone-700/40" style={{ left: '0%' }}>
          <div className="absolute top-12 left-0 whitespace-nowrap text-center">
            <span className="block text-stone-500 text-sm font-bold">${(minRange / 1000000).toFixed(0)}M~</span>
          </div>
        </div>

        {/* CAP: 下側1段目 */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/50" style={{ left: `${getPercent(capLevel)}%` }}>
          <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-yellow-500 text-lg font-black">CAP</span>
            <span className="block text-stone-400 text-base font-bold">${(capLevel / 1000000).toFixed(0)}M</span>
          </div>
        </div>

        {/* TAX: 上側 */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50" style={{ left: `${getPercent(taxLevel)}%` }}>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-amber-500 text-lg font-black">TAX</span>
            <span className="block text-stone-400 text-base font-bold">${(taxLevel / 1000000).toFixed(0)}M</span>
          </div>
        </div>

        {/* 1st APRON: 下側2段目 */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500/60" style={{ left: `${getPercent(firstApron)}%` }}>
          <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-orange-500 text-lg font-black">1st APRON</span>
            <span className="block text-stone-400 text-base font-bold">${(firstApron / 1000000).toFixed(0)}M</span>
          </div>
        </div>

        {/* 2nd APRON: 上側2段目 */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/60" style={{ left: `${getPercent(secondApron)}%` }}>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <span className="block text-red-500 text-lg font-black">2nd APRON</span>
            <span className="block text-stone-400 text-base font-bold">${(secondApron / 1000000).toFixed(0)}M</span>
          </div>
        </div>
      </div>
    </div>
  );
}
