import React, { useState, useEffect } from 'react';
import RosterTable from './RosterTable';
import SalaryMeter from './SalaryMeter';
import {
  genRoster, genFA, genDraft, genDraftPicks, advanceSeason, advanceDeadCap,
  checkSurvival, calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, calcRepeaterTax, calcStretch, validateTrade,
  isSupermaxEligible, isGilbertArenasRestricted,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2, PICKS_PER_DRAFT
} from '../dynastyEngine';

function HoverTip({ children, text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [align, setAlign] = useState('center');
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const tooltipWidth = 288;
    const halfW = tooltipWidth / 2;
    if (x - halfW < 8) {
      setAlign('left');
    } else {
      setAlign('center');
    }
    setPos({ x, y: rect.top });
    setShow(true);
  };
  const style = align === 'left'
    ? { left: 8, top: pos.y, transform: 'translateY(-110%)' }
    : { left: pos.x, top: pos.y, transform: 'translate(-50%, -110%)' };
  return (
    <span className="relative inline-block cursor-help" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="fixed z-[9999] px-3 py-2.5 bg-stone-950 border border-stone-500 rounded-xl text-sm text-white leading-relaxed shadow-2xl shadow-black/60 w-72 pointer-events-none" style={style}>
          {text}
          <div className={"absolute top-full border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-stone-500 " + (align === 'left' ? 'left-4' : 'left-1/2 -translate-x-1/2')}></div>
        </div>
      )}
    </span>
  );
}

export default function DynastyView({ onBack, gmName, playClickSound, isBgmOn, toggleBGM }) {
  const [phase, setPhase] = useState('reroll');
  const [season, setSeason] = useState(1);
  const [roster, setRoster] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [deadCap, setDeadCap] = useState(0);
  const [deadCapDetails, setDeadCapDetails] = useState([]);
  const [draftProspects, setDraftProspects] = useState([]);
  const [picksLeft, setPicksLeft] = useState(0);
  const [draftPicks, setDraftPicks] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [expiredPlayers, setExpiredPlayers] = useState([]);
  const [optionPlayers, setOptionPlayers] = useState([]);
  const [collapseReason, setCollapseReason] = useState('');
  const [signingPlayer, setSigningPlayer] = useState(null);
  const [signingYears, setSigningYears] = useState(2);
  const [useMLE, setUseMLE] = useState(false);
  const [taxHistory, setTaxHistory] = useState([]);
  const [mleUsed, setMleUsed] = useState(false);

  const [tradeMode, setTradeMode] = useState(false);
  const [tradeOffer, setTradeOffer] = useState([]);
  const [tradeTarget, setTradeTarget] = useState(null);
  const [tradeMarket, setTradeMarket] = useState([]);

  const [signTradePlayer, setSignTradePlayer] = useState(null);

  const totalCapHit = calcCapHit(roster, deadCap);
  const totalOvr = roster.reduce((s, p) => s + p.rating, 0);
  const minOvr = 380 + (season - 1) * 8;
  const mleAmount = getMLEAmount(totalCapHit);
  const repe const overTax = Math.max(0, totalCapHit - DYN_TAX);
  const repeaterTax = calcRepeaterTax(overTax, repeaterSeasons);
  const isOnTax = totalCapHit > DYN_TAX;

  useEffect(() => { doReroll(); }, []);

  function doReroll() {
    playClickSound();
    setRoster(genRoster());
    setFreeAgents(genFA(8));
    setDeadCap(0);
    setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]);
    setMleUsed(false);
    setSeason(1);
    setPhase('reroll');
    setTradeMode(false);
  }

  function handleSignRequest(player) {
    playClickSound();
    setSigningPlayer(player);
    setSigningYears(2);
    setUseMLE(false);
  }

  function handleConfirmSign() {
    playClickSound();
    const player = signingPlayer;
    const years = signingYears;

    const check = canSignFA(player, years);
    if (!check.allowed) { alert(check.reason); return; }

    let adjustedSalary = adjustSalaryForYears(player.salary, years);

    if (useMLE && mleAmount > 0 && !mleUsed) {
      adjustedSalary = Math.min(adjustedSalary, mleAmount);
    }

    if (totalCapHit + adjustedSalary > DYN_APRON2) {
      alert('第2エプロンを超えてしまうため補強できません！');
      return;
    }

    const signedPlayer = { ...player, salary: adjustedSalary, contractYears: years, faStatus: 'None' };
    setFreeAgents(fa => fa.filter(p => p.id !== player.id));
    setRoster(r => [...r, signedPlayer]);
    if (useMLE) setMleUsed(true);
    setSigningPlayer(null);
  }

  function handleCancelSign() {
    playClickSound();
    setSigningPlayer(null);
  }

  function handleWaiver(player) {
    playClickSound();
    const remaining = player.salary * player.contractYears;
    if (!window.confirm(`${player.name}をウェイブしますか？\n\n残り契約: $${(remaining / 1000000).toFixed(1)}M（{player.contractYears}年）\nデッドキャップ: $$$${(player.salary / 1000000).toFixed(1)}M/年 × ${player.contractYears}年\n\n※NBAでは全放出がワイブを経由します。デッドキャップは100%です。`)) return;
    if (player.salary > 0 && player.contractYears > 0) {
      const nd = [...deadCapDetails, { name: player.name, amount: player.salary, yearsLeft: player.contractYears, type: 'Waive' }];
      setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
    }
    setRoster(r => r.filter(p => p.id !== player.id));
  }

  function handleBuyout(player) {
    playClickSound();
    const agreeChance = Math.max(5, 100 - player.rating);
    const roll = Math.random() * 100;
    if (roll < agreeChance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const deadAmount = Math.floor(player.salary * pct / 100);
      alert(`${player.name}はバイアウトに同意しました！\n\nデッドキャップ: $${([]);
    setTrade(deadAmount / 1000000).toFixed(1)}M/年（{pct}%）× ${player.contractYears}年`);
      if (player.salary > 0 && player.contractYears > 0) {
        const nd = [...deadCapDetails, { name: player.name + ' (B/O)', amount: deadAmount, yearsLeft: player.contractYears, type: 'Buyout' }];
        setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
      }
      setRoster(r => r.filter(p => p.id !== player.id));
    } else {
      alert(`${player.name}はバイアウトを拒否しました。\n\n同意確率: ${agreeChance}%`);
    }
  }

  function handleStretch(player) {
    playClickSound();
    const st = calcStretch(player);
    if (!window.confirm(`${player.name}をストレッチしますか？\n\n通常: $$$${(player.salary / 1000000).toFixed(1)}M/年 × ${player.contractYears}年\nストレッチ: $${aterSeasons = taxHistory.filter(Boolean).length;
 (st.annualClickSound();
    setSignTradePlayer(player);
  }

  function handleConfirmSignAndTrade() {
    playClickSound();
    const p = signTradePlayer;
    const newPicks = [...draftPicks, { id: 'pick_' + Date.now(), year: season + 1, round: Math.random() > 0.5 ? 1 : 2, own: true, from: p.name }];
    setDraftPicks(newPicks);
    setExpiredPlayers(ep => ep.filter(x => x.id !== p.id));
    setSignTradePlayer(null);
    alert(`{p.name}をサイン・アンド・トレード！\nドラフトピックを1つ獲得しました。`);
  }

  function handleOptionDecision(player, exercise) {
    playClickSound();
    if (player.optionType === 'player') {
      if (exercise) {
        alert(`${player.name}がプレイヤーオプションを行使！契約延長。`);
      } else {
        alert(`${player.name}がプレイヤーオプションを拒否！FAに。`);
        setRoster(r => r.filter(x => x.id !== player.id));
        player.faStatus = player.birdRights !== 'None' ? 'RFA' : 'UFA';
        setExpiredPlayers(ep => [...ep, { ...player }]);
      }
    } else {
      if (exercise) {
        alert(`チームオプションを行使！${player.name}の契約延長。`);
      } else {
        alert(`チームオプションを拒否。${player.name}をFAに。`);
        setRoster(r => r.filter(x => x.id !== player.id));
        player.faStatus = 'UFA';
        setExpiredPlayers(ep => [...ep, { ...player }]);
      }
    }
    setOptionPlayers(op => op.filter(x => x.id !== player.id));
  }

  function handleOpenTrade() {
    playClickSound();
    setTradeMarket(genFA(6));
    setTradeOffer([]);
    setTradeTarget(null);
    setTradeMode(true);
  }

  function handleAddToTradeOffer(player) {
    playClickSound();
    if (!tradeOffer.find(p => p.id === player.id)) {
      setTradeOffer([...tradeOffer, player]);
    }
  }

  function handleRemoveFromTradeOffer(player) {
    playClickSound();
    setTradeOffer(trade Rating: <spanOffer.filter(p => p.id !== player.id));
  }

  function handleSelectTradeTarget(player) {
    playClickSound();
    setTradeTarget(player);
  }

  function handleExecuteTrade() {
    playClickSound();
    if (!tradeTarget || tradeOffer.length === 0) { alert('トレードする選手を選んでください'); return; }
    const validation = validateTrade(
      tradeOffer.map(p => p.salary),
      [tradeTarget.salary]
    );
    if (!validation.allowed) {
      alert(`トレード不可！\n\n送出: $$$${(validation.outgoing / 1000000).toFixed(1)}M\n範囲: $${(validation.minIncoming / 1000000).toFixed(1)}M 〜 $${(validation.maxIncoming / 1000000).toFixed(1)}M\n獲得予定: $${(validation.incoming / 1000000).toFixed(1)}M\n\n理由: ${validation.reason}`);
      return;
    }
    setRoster(r => [...r.filter(p => !tradeOffer.find(o => o.id === p.id)), tradeTarget]);
    setTradeOfferTarget(null);
   4 max-h-60 overflow-y-auto">
              <h3 className="text-xs font-mono font-black text-stone-400 mb-2">TRADE MARKET（クリックで獲得を選択）</h3>
              {tradeMarket.map(p => (
                <button key={p.id} onClick={() => handleSelectTradeTarget(p)}
                  className={'w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between ' + (tradeTarget?.id === p.id ? 'bg-cyan-950 border border-cyan-700' : '')}>
                  <span className="text-white">{p.name} (R{p.rating})</span>
                  <span className="text-stone-400">${(p.salary / 1000000).toFixed(1)}M</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-6 py-2.5 rounded-xl text-sm hover:bg-stone-850 transition-all">🔄 RER0 && (
           OLL</button>
            <button onClick={() => { playClickSound(); setPhase('manage'); }} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black px-8 py-2.5 rounded-xl text-sm transition-all">START DYNASTY 💪</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black px-4 py-2.5 rounded-xl text-sm hover:text-stone-300 transition-all">← 戻る</button>
          </div>
          <RosterTable title="YOUR ROSTER" players={roster} onActionClick={() => {}} actionLabel="—" totalSalary={totalCapHit} dynastyMode />
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm text-stone-400 flex gap-6">
            <span>Total className="text-white600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-3 rounded-xl text-sm tracking-widest transition-all">NEXT SEASON ➡️</button>
                  <button onClick={handleOpenTrade} className="bg-stone-900 border border-stone-800 text-cyan-400 hover:bg-stone-850 font-mono font-black py-3 px-4 rounded-xl text-sm transition-all">⚖️ TRADE</button>
                </div>
              </section>
            </div>
            <div className="w-full lg:w-[58%] space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <RosterTable title="ROSTER" players={roster} totalSalary={totalCapHit} dynastyMode onWaiver={handleWaiver} onBuyout={handleBuyout} onStretch={handleStretch} />
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
        <SignTradeModal />
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
          {expiredPlayers.length >  <div className=" hover:text-white font-mono font-black px-6 py-3 rounded-xl text-sm transition-all">タイトルに戻る</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
