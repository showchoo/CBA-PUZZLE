import React, { useState, useEffect } from 'react';
import RosterTable from './RosterTable';
import SalaryMeter from './SalaryMeter';
import {
  genRoster, genFA, genDraft, advanceSeason, advanceDeadCap,
  checkSurvival, calcCapHit, canSignFA, adjustSalaryForYears,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2, PICKS_PER_DRAFT
} from '../dynastyEngine';

export default function DynastyView({ onBack, gmName, playClickSound, isBgmOn, toggleBGM }) {
  const [phase, setPhase] = useState('reroll');
  const [season, setSeason] = useState(1);
  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [deadCap, setDeadCap] = useState(0);
  const [deadCapDetails, setDeadCapDetails] = useState([]);
  const [draftProspects, setDraftProspects] = useState([]);
  const [picksLeft, setPicksLeft] = useState(0);
  const [summaries, setSummaries] = useState([]);
  const [expiredPlayers, setExpiredPlayers] = useState([]);
  const [collapseReason, setCollapseReason] = useState('');
  const [signingPlayer, setSigningPlayer] = useState(null);
  const [signingYears, setSigningYears] = useState(2);

  const totalCapHit = calcCapHit(roster, deadCap);
  const totalOvr = roster.reduce((s, p) => s + p.rating, 0);
  const minOvr = 380 + (season - 1) * 8;

  useEffect(() => { doReroll(); }, []);

  function doReroll() {
    playClickSound();
    setRoster(genRoster());
    setFreeAgents(genFA(8));
    setDeadCap(0);
    setDeadCapDetails([]);
    setSeason(1);
    setPhase('reroll');
  }

  function handleSignRequest(player) {
    playClickSound();
    setSigningPlayer(player);
    setSigningYears(2);
  }

  function handleConfirmSign() {
    playClickSound();
    const player = signingPlayer;
    const years = signingYears;

    const check = canSignFA(player, years);
    if (!check.allowed) {
      alert(check.reason);
      return;
    }

    const adjustedSalary = adjustSalaryForYears(player.salary, years);

    if (totalCapHit + adjustedSalary > DYN_APRON2) {
      alert('第2エプロンを超えてしまうため補強できません！');
      return;
    }

    const signedPlayer = { ...player, salary: adjustedSalary, contractYears: years, faStatus: 'None' };
    setFreeAgents(fa => fa.filter(p => p.id !== player.id));
    setRoster(r => [...r, signedPlayer]);
    setSigningPlayer(null);
  }

  function handleCancelSign() {
    playClickSound();
    setSigningPlayer(null);
  }

  function handleWaiver(player) {
    playClickSound();
    const remaining = player.salary * player.contractYears;
    if (!window.confirm(
      `${player.name}をウェイブしますか？\n\n` +
      `残り契約: $${(remaining / 1000000).toFixed(1)}M（{player.contractYears}年）\n` +
      `デッドキャップ: $$$${(player.salary / 1000000).toFixed(1)}M/年 × ${player.contractYears}年\n\n` +
      `※NBAでは全放出がワイブを経由します。デッドキャップは100%です。`
    )) return;

    if (player.salary > 0 && player.contractYears > 0) {
      const newDetails = [...deadCapDetails, { name: player.name, amount: player.salary, yearsLeft: player.contractYears, type: 'Waive' }];
      setDeadCapDetails(newDetails);
      setDeadCap(newDetails.reduce((s, d) => s + d.amount, 0));
    }
    setRoster(r => r.filter(p => p.id !== player.id));
  }

  function handleBuyout(player) {
    playClickSound();
    const agreeChance = Math.max(5, 100 - player.rating);
    const roll = Math.random() * 100;
    const agreed = roll < agreeChance;

    if (agreed) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const deadAmount = Math.floor(player.salary * pct / 100);
      alert(
        `${player.name}はバイアウトに同意しました！\n\n` +
        `デッドキャップ: $${(deadAmount / 1000000).toFixed(1)}M/年（{pct}%）× ${player.contractYears}年\n` +
        `節約額: $$$${((player.salary - deadAmount) * player.contractYears / 1000000).toFixed(1)}M`
      );
      if (player.salary > 0 && player.contractYears > 0) {
        const newDetails = [...deadCapDetails, { name: player.name + ' (B/O)', amount: deadAmount, yearsLeft: player.contractYears, type: 'Buyout' }];
        setDeadCapDetails(newDetails);
        setDeadCap(newDetails.reduce((s, d) => s + d.amount, 0));
      }
      setRoster(r => r.filter(p => p.id !== player.id));
    } else {
      alert(
        `${player.name}はバイアウトを拒否しました。\n\n` +
        `同意確率: ${agreeChance}%（Ratingが低いほど同意しやすい）\n` +
        `判定: ${roll.toFixed(0)} / ${agreeChance}`
      );
    }
  }

  function handleNextSeason() {
    playClickSound();
    const result = advanceSeason(roster);
    const deadResult = advanceDeadCap(deadCapDetails);
    setSummaries(result.summaries);
    setExpiredPlayers(result.expired);
    setRoster(result.surviving);
    setDeadCap(deadResult.total);
    setDeadCapDetails(deadResult.details);
    setPhase('seasonEnd');
  }

  function handleToDraft() {
    playClickSound();
    setDraftProspects(genDraft(10));
    setPicksLeft(PICKS_PER_DRAFT);
    setPhase('draft');
  }

  function handleDraft(prospect) {
    playClickSound();
    setRoster(r => [...r, { ...prospect, faStatus: 'None' }]);
    setDraftProspects(dp => dp.filter(p => p.id !== prospect.id));
    setPicksLeft(p => p - 1);
  }

  function handleDraftComplete() {
    playClickSound();
    const newSeason = season + 1;
    const survival = checkSurvival(roster, newSeason);
    if (!survival.alive) {
      setCollapseReason(survival.reason);
      setPhase('gameOver');
      return;
    }
    setFreeAgents(genFA(8));
    setSeason(newSeason);
    setPhase('manage');
  }

  const Header = () => (
    <header className="w-full max-w-7xl mx-auto mb-3 flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={() => { playClickSound(); onBack(); }} className="px-3 py-2 text-stone-500 hover:text-stone-300 rounded-lg transition-all text-sm font-mono">🏠</button>
        <div>
          <h1 className="text-2xl font-black font-mono text-amber-400 tracking-wider">👑 DYNASTY MODE</h1>
          <span className="text-sm font-mono text-stone-400">SEASON {season}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-stone-500">DYNASTY SCORE</span>
        <span className="text-2xl font-mono font-black text-amber-400">{Math.max(0, season - 1)}</span>
        <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-3 py-2 rounded-lg transition-all text-sm ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
      </div>
    </header>
  );

  const SignModal = () => {
    if (!signingPlayer) return null;
    const adjustedSalary = adjustSalaryForYears(signingPlayer.salary, signingYears);
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9998]" onClick={handleCancelSign}>
        <div className="bg-[#141210] border border-stone-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="text-center space-y-1">
            <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">FA SIGNING</span>
            <h3 className="text-xl font-black text-white">{signingPlayer.name}</h3>
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-amber-400 font-mono font-black">Rating {signingPlayer.rating}</span>
              <span className="text-stone-400">Age {signingPlayer.age}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-black text-stone-400 uppercase">契約年数を選択</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(y => {
                const check = canSignFA(signingPlayer, y);
                return (
                  <button
                    key={y}
                    onClick={() => setSigningYears(y)}
                    disabled={!check.allowed}
                    className={'py-2 rounded-lg border font-mono font-black text-sm transition-all ' + (
                      signingYears === y
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-400'
                        : check.allowed
                          ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850'
                          : 'bg-stone-950 border-stone-900 text-stone-600 cursor-not-allowed'
                    )}
                  >
                    {y}年
                  </button>
                );
              })}
            </div>
            {signingPlayer.rating >= 85 && signingYears === 1 && (
              <p className="text-xs text-red-400 font-mono">⚠️ スター級選手は1年契約を拒否します</p>
            )}
          </div>

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">年俸:</span>
              <span className="text-white font-mono font-black">${(adjustedSalary / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">契約総額:</span>
              <span className="text-white font-mono font-black">${(adjustedSalary * signingYears / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">契約後キャップ:</span>
              <span className={(totalCapHit + adjustedSalary) <= DYN_CAP ? 'text-emerald-400 font-mono font-black' : 'text-red-400 font-mono font-black'}>
                ${((totalCapHit + adjustedSalary) / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCancelSign} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-2.5 rounded-xl text-sm transition-all">キャンセル</button>
            <button onClick={handleConfirmSign} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-2.5 rounded-xl text-sm transition-all">契約する</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══ REROLL PHASE ═══
  if (phase === 'reroll') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <div className="w-full max-w-5xl space-y-4">
          <div className="text-center space-y-2 mb-4">
            <span className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">👑 DYNASTY MODE</span>
            <h2 className="text-3xl font-black text-white">あなたの王朝を築け</h2>
            <p className="text-sm text-stone-400">満足のいくロスターが組めたら「START」を押してください</p>
          </div>
          <div className="flex gap-3 justify-center mb-4">
            <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-6 py-2.5 rounded-xl text-sm hover:bg-stone-850 transition-all">🔄 REROLL</button>
            <button onClick={() => { playClickSound(); setPhase('manage'); }} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black px-8 py-2.5 rounded-xl text-sm transition-all">START DYNASTY 💪</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black px-4 py-2.5 rounded-xl text-sm hover:text-stone-300 transition-all">← 戻る</button>
          </div>
          <RosterTable title="YOUR ROSTER" players={roster} onActionClick={() => {}} actionLabel="—" totalSalary={totalCapHit} dynastyMode />
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm text-stone-400 flex gap-6">
            <span>Total Rating: <span className="text-white font-black text-lg">{totalOvr}</span></span>
            <span>Cap Hit: <span className="text-cyan-400 font-black text-lg">${(totalCapHit / 1000000).toFixed(1)}M</span></span>
            <span>Players: <span className="text-white font-black">{roster.length}</span></span>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MANAGE PHASE ═══
  if (phase === 'manage') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <SignModal />
        <div className="w-full flex flex-col flex-1 justify-start">
          <Header />
          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 flex-1 items-stretch">
            <div className="w-full lg:w-[42%] space-y-4 flex flex-col justify-between">
              <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl p-5 space-y-3">
                <span className="text-sm font-mono font-black text-cyan-400 uppercase tracking-wider">TEAM STATUS</span>
                <div className="space-y-2">
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">📊 Cap Hit:</span>
                    <span className={totalCapHit <= DYN_CAP ? 'text-emerald-400 font-black text-3xl' : totalCapHit <= DYN_TAX ? 'text-amber-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>
                      ${(totalCapHit / 1000000).toFixed(1)}M <span className="text-lg text-stone-500 font-sans">/ ${(DYN_CAP / 1000000).toFixed(0)}M</span>
                    </span>
                  </div>
                  {deadCap > 0 && (
                    <div className="bg-stone-950 px-4 py-2 rounded-xl border border-red-900/50">
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 font-sans font-black text-sm">💀 Dead Cap:</span>
                        <span className="text-red-400 font-black text-xl">${(deadCap / 1000000).toFixed(1)}M</span>
                      </div>
                      {deadCapDetails.map((d, i) => (
                        <div key={i} className="text-xs text-stone-500 mt-1 font-mono">{d.name}: ${(d.amount / 1000000).toFixed(1)}M × {d.yearsLeft}yr [{d.type}]</div>
                      ))}
                    </div>
                  )}
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">🔥 Total Rating:</span>
                    <span className={totalOvr >= minOvr ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>
                      {totalOvr} <span className="text-lg text-stone-500 font-sans">/ {minOvr}+</span>
                    </span>
                  </div>
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">👥 Players:</span>
                    <span className="text-white font-black text-2xl">{roster.length}</span>
                  </div>
                </div>
                <SalaryMeter totalSalary={totalCapHit} capLevel={DYN_CAP} taxLevel={DYN_TAX} firstApron={DYN_APRON1} secondApron={DYN_APRON2} />
                <button onClick={handleNextSeason} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-3 rounded-xl text-sm tracking-widest transition-all">NEXT SEASON ➡️</button>
              </section>
            </div>
            <div className="w-full lg:w-[58%] space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <RosterTable title="ROSTER" players={roster} totalSalary={totalCapHit} dynastyMode onWaiver={handleWaiver} onBuyout={handleBuyout} />
                <RosterTable title="FREE AGENT" players={freeAgents} onActionClick={handleSignRequest} actionLabel="契約" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ═══ SEASON END PHASE ═══
  if (phase === 'seasonEnd') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <div className="w-full max-w-2xl space-y-6 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-3">
            <span className="text-xl font-mono font-black text-amber-400 uppercase tracking-widest">SEASON {season} COMPLETE</span>
            <h2 className="text-5xl font-black text-white">シーズン終了レポート</h2>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
            <h3 className="text-xl font-mono font-black text-cyan-400 uppercase">選手の経年変化</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {summaries.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xl py-1.5 px-3 rounded hover:bg-stone-900/50">
                  <span className="text-white font-bold">{s.name}</span>
                  <span className="font-mono">
                    <span className="text-stone-400">{s.oldRating}</span>
                    <span className="text-stone-600 mx-1">→</span>
                    <span className={s.change <= -2 ? 'text-red-400 font-black' : 'text-amber-400 font-black'}>{s.newRating}</span>
                    <span className="text-red-500 ml-2 text-lg">({s.change})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {expiredPlayers.length > 0 && (
            <div className="bg-stone-950 border border-amber-900/50 rounded-xl p-6 space-y-3">
              <h3 className="text-xl font-mono font-black text-amber-400 uppercase">契約切れ → FA移行</h3>
              {expiredPlayers.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xl py-1.5 px-3">
                  <span className="text-white font-bold">{p.name}</span>
                  <span className="text-stone-500 font-mono text-lg">Rating {p.rating} → FA</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleToDraft} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">DRAFT へ進む 🏀</button>
        </div>
      </div>
    );
  }

  // ═══ DRAFT PHASE ═══
  if (phase === 'draft') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <div className="w-full max-w-3xl space-y-6 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-3">
            <span className="text-xl font-mono font-black text-cyan-400 uppercase tracking-widest">🏀 DRAFT</span>
            <h2 className="text-5xl font-black text-white">新人選手ドラフト</h2>
            <p className="text-xl text-stone-400">残りピック: <span className="text-cyan-400 font-black text-2xl">{picksLeft}</span></p>
          </div>
          {picksLeft > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {draftProspects.map((p, i) => (
                <div key={p.id} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center justify-between hover:border-cyan-800 transition-colors">
                  <div>
                    <span className="text-lg text-stone-500 font-mono mr-2">#{i + 1}</span>
                    <span className="text-white font-bold text-xl">{p.name}</span>
                    <div className="flex items-center gap-3 mt-1 text-lg">
                      <span className="text-amber-400 font-mono font-black">Rating {p.rating}</span>
                      <span className="text-stone-500">Age {p.age}</span>
                      <span className="text-cyan-400 font-mono">${(p.salary / 1000000).toFixed(1)}M / {p.contractYears}yr</span>
                    </div>
                  </div>
                  <button onClick={() => handleDraft(p)} className="bg-cyan-950 border border-cyan-700 text-cyan-400 hover:bg-cyan-900 font-mono font-black px-6 py-2 rounded-lg text-lg transition-all">DRAFT</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center space-y-4 py-8">
              <div className="text-emerald-400 font-mono font-black text-2xl">✓ ドラフト完了</div>
              <div className="text-xl text-stone-400">現在のロスター: {roster.length}人 / Total Rating: {totalOvr}</div>
              <button onClick={handleDraftComplete} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">新シーズン開始 🏀</button>
            </div>
          )}
          {picksLeft > 0 && (
            <button onClick={handleDraftComplete} className="w-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-3 rounded-xl text-lg transition-all">ドラフトをスキップ</button>
          )}
        </div>
      </div>
    );
  }

  // ═══ GAME OVER PHASE ═══
  if (phase === 'gameOver') {
    const score = Math.max(0, season - 1) * 100;
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <div className="w-full max-w-2xl space-y-6 bg-[#110f0e] border border-red-900 rounded-3xl p-8 text-center">
          <div className="space-y-2">
            <span className="text-sm font-mono font-black text-red-400 uppercase tracking-widest">DYNASTY COLLAPSED</span>
            <h2 className="text-3xl font-black text-white">王朝崩壊</h2>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
            <div className="text-sm text-stone-400">存続期間</div>
            <div className="text-5xl font-black text-amber-400 font-mono">{Math.max(0, season - 1)} seasons</div>
            <div className="text-sm text-red-400 mt-2">{collapseReason}</div>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4">
            <div className="text-xs text-stone-500 font-mono">GM SCORE</div>
            <div className="text-4xl font-black text-yellow-400 font-mono">{score} pts</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { doReroll(); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black px-8 py-3 rounded-xl text-sm transition-all">TRY AGAIN 🔄</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black px-6 py-3 rounded-xl text-sm transition-all">タイトルに戻る</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
