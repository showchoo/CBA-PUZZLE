import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ VOTING OVERLAY — 視聴者投票 ═══                               */
/* ═══════════════════════════════════════════════════════════════ */

export function VotingOverlay({ options, title, subtitle, onDecide, onCancel, duration = 20 }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [votes, setVotes] = useState(options.map(() => 0));
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const addVote = (index) => {
    setVotes(prev => prev.map((v, i) => i === index ? v + 1 : v));
  };

  const subtractVote = (index) => {
    setVotes(prev => prev.map((v, i) => i === index ? Math.max(0, v - 1) : v));
  };

  const totalVotes = votes.reduce((s, v) => s + v, 0);
  const maxVotes = Math.max(...votes, 1);
  const leader = votes.indexOf(Math.max(...votes));

  const urgencyColor = timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-amber-400' : 'text-cyan-400';
  const urgencyBg = timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-cyan-500';

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
      <div className="w-full max-w-xl space-y-4 bg-[#110f0e] border-2 border-cyan-600 rounded-3xl p-8 shadow-2xl shadow-cyan-900/50"
        style={{ animation: 'dyToastIn 0.4s ease' }}>

        {/* ヘッダー */}
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">🗳️ VIEWER VOTE</span>
            <h2 className="text-2xl font-black text-white mt-1">{title}</h2>
            {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-center">
            <div className={`text-4xl font-mono font-black ${urgencyColor} tabular-nums`}
              style={{ fontVariantNumeric: 'tabular-nums' }}>
              {timeLeft}
            </div>
            <div className="text-[10px] text-stone-500 font-mono">秒</div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${urgencyBg}`}
            style={{ width: `${(timeLeft / duration) * 100}%` }} />
        </div>

        {/* チャット説明 */}
        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg px-4 py-2 text-center">
          <span className="text-cyan-400 font-mono font-bold text-sm">
            チャットで番号を入力 → {options.map((_, i) => `${i + 1}`).join(' / ')}
          </span>
        </div>

        {/* 選択肢 */}
        <div className="space-y-2">
          {options.map((opt, i) => {
            const pct = totalVotes > 0 ? (votes[i] / totalVotes * 100) : 0;
            const isLeader = i === leader && totalVotes > 0;

            return (
              <div key={i} className={`relative overflow-hidden rounded-xl border transition-all ${
                isLeader ? 'border-cyan-500 bg-cyan-950/30' : 'border-stone-800 bg-stone-950'
              }`}>
                {/* 背景バー */}
                <div className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                  isLeader ? 'bg-cyan-900/40' : 'bg-stone-900/60'
                }`} style={{ width: `${pct}%` }} />

                <div className="relative flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-mono font-black w-8 text-center ${
                      isLeader ? 'text-cyan-400' : 'text-stone-500'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-white font-bold text-sm">{opt.label}</span>
                      {opt.detail && <span className="text-stone-500 text-xs ml-2">{opt.detail}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-400 w-16 text-right">
                      {votes[i]}票 {totalVotes > 0 && `(${Math.round(pct)}%)`}
                    </span>
                    <button onClick={() => addVote(i)}
                      className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white w-8 h-8 rounded-lg text-sm font-mono font-black transition-all active:scale-95">
                      +
                    </button>
                    <button onClick={() => subtractVote(i)}
                      className="bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 w-8 h-8 rounded-lg text-sm font-mono font-black transition-all active:scale-95">
                      -
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 結果サマリー */}
        <div className="flex items-center justify-between text-xs font-mono text-stone-500">
          <span>合計: {totalVotes}票</span>
          {totalVotes > 0 && (
            <span className={timeLeft === 0 ? 'text-amber-400 font-bold' : ''}>
              リード: ①{leader + 1} ({votes[leader]}票)
            </span>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-3 rounded-xl text-sm transition-all">
            キャンセル
          </button>
          <button onClick={() => onDecide(leader)}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-3 rounded-xl text-sm transition-all">
            ①{leader + 1} で決定 ({votes[leader]}票)
          </button>
        </div>

        <p className="text-center text-[10px] text-stone-600 font-mono">
          ※ 配信者はチャットを読みながら + ボタンでカウント。決定ボタンで反映。
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ DRAMATIC REVEAL — 演出リベール ═══                            */
/* ═══════════════════════════════════════════════════════════════ */

export function DramaticSeasonReveal({ season, record, effectiveOvr, minOvr, gmScore, mandateResult, onContinue }) {
  const [stage, setStage] = useState(0);
  const survived = effectiveOvr >= minOvr;

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 2200),
      setTimeout(() => setStage(3), 3800),
      setTimeout(() => setStage(4), 5200),
      setTimeout(() => setStage(5), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-2xl space-y-6 text-center p-10">

        {/* Stage 0: Title */}
        <div className="space-y-2">
          <span className="text-xl font-mono font-black text-amber-400 uppercase tracking-widest animate-pulse">
            SEASON {season} RESULTS
          </span>
        </div>

        {/* Stage 1: Record */}
        {stage >= 1 && (
          <div style={{ animation: 'dyRevealUp 0.8s ease forwards' }}>
            <div className="text-6xl font-black font-mono text-white">
              {record.wins}<span className="text-stone-600">W</span> - {record.losses}<span className="text-stone-600">L</span>
            </div>
            <div className="text-lg text-stone-400 mt-2">勝率 {record.winRate}%</div>
            <div className={`text-2xl font-black font-mono mt-2 ${
              record.gmBonus >= 300 ? 'text-amber-400' : record.gmBonus > 0 ? 'text-cyan-400' : 'text-stone-500'
            }`}>
              {record.result}
            </div>
          </div>
        )}

        {/* Stage 2: Rating Check */}
        {stage >= 2 && (
          <div style={{ animation: 'dyRevealUp 0.8s ease forwards' }}>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 inline-block">
              <div className="text-sm text-stone-500 font-mono mb-2">来シーズン 生存ラインチェック</div>
              <div className="flex items-center justify-center gap-6">
                <div>
                  <div className="text-xs text-stone-500">Rating</div>
                  <div className={`text-5xl font-black font-mono ${survived ? 'text-emerald-400' : 'text-red-400'}`}>
                    {effectiveOvr}
                  </div>
                </div>
                <div className="text-3xl text-stone-600">
                  {survived ? '≥' : '<'}
                </div>
                <div>
                  <div className="text-xs text-stone-500">必要値</div>
                  <div className="text-5xl font-black font-mono text-stone-400">{minOvr}</div>
                </div>
              </div>
              <div className="mt-3">
                {survived ? (
                  <span className="text-emerald-400 font-mono font-black text-lg">
                    MARGIN: +{effectiveOvr - minOvr} ✓
                  </span>
                ) : (
                  <span className="text-red-400 font-mono font-black text-lg">
                    SHORT: {effectiveOvr - minOvr} ✗
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Survival verdict */}
        {stage >= 3 && (
          <div style={{ animation: 'dyRevealUp 0.6s ease forwards' }}>
            {survived ? (
              <div className="space-y-2">
                <div className="text-4xl font-black text-emerald-400">✓ SURVIVED</div>
                {effectiveOvr - minOvr <= 10 && (
                  <div className="text-lg text-amber-400 font-mono animate-pulse">
                    ⚠️ BARELY SURVIVED — ONLY {effectiveOvr - minOvr} POINTS!
                  </div>
                )}
              </div>
            ) : (
              <div className="text-4xl font-black text-red-400">✗ DYNASTY COLLAPSED</div>
            )}
          </div>
        )}

        {/* Stage 4: GM Score + Mandate */}
        {stage >= 4 && (
          <div style={{ animation: 'dyRevealUp 0.6s ease forwards' }} className="space-y-3">
            {record.gmBonus > 0 && (
              <div className="text-lg font-mono text-emerald-400">
                シーズンボーナス: <span className="font-black text-2xl">+{record.gmBonus}</span> GM SCORE
              </div>
            )}
            {mandateResult && (
              <div className={`text-sm font-mono ${mandateResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                オーナー要請「{mandateResult.mandate.name}」:
                {mandateResult.success ? ` 達成！ +${mandateResult.bonus}` : ` 未達成 ${mandateResult.bonus}`}
              </div>
            )}
          </div>
        )}

        {/* Stage 5: Continue */}
        {stage >= 5 && (
          <div style={{ animation: 'dyRevealUp 0.6s ease forwards' }}>
            <button onClick={onContinue}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black px-10 py-4 rounded-xl text-xl tracking-widest transition-all">
              続ける →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes dyRevealUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ DRAMATIC DRAFT REVEAL ═══                                   */
/* ═══════════════════════════════════════════════════════════════ */

export function DramaticDraftReveal({ prospect, onConfirm, onCancel }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 1800),
      setTimeout(() => setStage(3), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]">
      <div className="w-full max-w-lg text-center space-y-6 p-10">
        <div className="text-lg font-mono font-black text-cyan-400 uppercase tracking-widest animate-pulse">
          🏀 DRAFT PICK
        </div>

        {stage >= 1 && (
          <div style={{ animation: 'dyRevealUp 0.8s ease forwards' }}>
            <div className="text-stone-500 font-mono text-sm">{prospect.position}</div>
            <div className="text-5xl font-black text-white mt-2">{prospect.name}</div>
          </div>
        )}

        {stage >= 2 && (
          <div style={{ animation: 'dyRevealUp 0.8s ease forwards' }}>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div>
                <div className="text-xs text-stone-500">Rating</div>
                <div className="text-5xl font-black font-mono text-amber-400">{prospect.rating}</div>
              </div>
              {prospect.pot > prospect.rating && (
                <>
                  <div className="text-2xl text-stone-700">→</div>
                  <div>
                    <div className="text-xs text-stone-500">Potential</div>
                    <div className="text-5xl font-black font-mono text-emerald-400">{prospect.pot}</div>
                  </div>
                </>
              )}
            </div>
            <div className="text-sm text-stone-400 mt-3 font-mono">
              Age {prospect.age} · ${(prospect.salary / 1000000).toFixed(1)}M · {prospect.contractYears}yr
            </div>
          </div>
        )}

        {stage >= 3 && (
          <div style={{ animation: 'dyRevealUp 0.6s ease forwards' }} className="flex gap-3 justify-center pt-4">
            <button onClick={onConfirm}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black px-8 py-3 rounded-xl text-lg transition-all">
              DRAFT!
            </button>
            <button onClick={onCancel}
              className="bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black px-6 py-3 rounded-xl transition-all">
              別の選手へ
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes dyRevealUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ STREAM STATS WIDGET — OBS用オーバーレイ ═══                   */
/* ═══════════════════════════════════════════════════════════════ */

export function StreamStatsWidget({ season, record, effectiveOvr, minOvr, capHit, gmScore, injuredCount, rosterCount }) {
  const margin = effectiveOvr - minOvr;
  const marginColor = margin <= 0 ? 'text-red-400' : margin <= 10 ? 'text-amber-400' : margin <= 30 ? 'text-cyan-400' : 'text-emerald-400';

  return (
    <div className="fixed top-3 left-3 z-[50] bg-black/85 border border-stone-700/80 rounded-xl px-4 py-3 font-mono text-xs backdrop-blur-sm select-none pointer-events-none"
      style={{ minWidth: '180px' }}>
      <div className="text-amber-400 font-black text-sm tracking-wider mb-2">
        👑 SEASON {season}
      </div>
      {record && (
        <div className="flex justify-between">
          <span className="text-stone-500">成績</span>
          <span className="text-white font-black">{record.wins}W-{record.losses}L</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-stone-500">Rating</span>
        <span className={`${marginColor} font-black`}>{effectiveOvr} ({margin > 0 ? '+' : ''}{margin})</span>
      </div>
      <div className="flex justify-between">
        <span className="text-stone-500">Cap Hit</span>
        <span className="text-white font-black">${(capHit / 1000000).toFixed(1)}M</span>
      </div>
      <div className="flex justify-between">
        <span className="text-stone-500">GM Score</span>
        <span className="text-amber-400 font-black">{gmScore}</span>
      </div>
      {injuredCount > 0 && (
        <div className="flex justify-between">
          <span className="text-stone-500">負傷</span>
          <span className="text-orange-400 font-black">{injuredCount}人</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-stone-500">ロスター</span>
        <span className="text-stone-300 font-black">{rosterCount}人</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ SEASON SHARE CARD — シーズン結果カード ═══                     */
/* ═══════════════════════════════════════════════════════════════ */

export function SeasonShareCard({ season, record, effectiveOvr, minOvr, gmScore, topPlayers, onContinue }) {
  const survived = effectiveOvr >= minOvr;
  const margin = effectiveOvr - minOvr;

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white flex items-center justify-center font-sans antialiased px-4">
      <div className="w-full max-w-lg space-y-4" style={{ animation: 'dyRevealUp 0.6s ease' }}>

        {/* カード本体 */}
        <div className="bg-gradient-to-br from-[#1a1816] to-[#0d0b0a] border-2 border-stone-700 rounded-3xl p-8 space-y-5 relative overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5"
            style={{ background: survived ? 'radial-gradient(circle, #22c55e, transparent)' : 'radial-gradient(circle, #ef4444, transparent)' }} />

          <div className="text-center space-y-1 relative">
            <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-[0.3em]">👑 NBA DYNASTY GM</span>
            <h2 className="text-4xl font-black text-white">SEASON {season}</h2>
          </div>

          {/* 成績 */}
          <div className="text-center space-y-1">
            <div className="text-5xl font-black font-mono">
              <span className="text-white">{record.wins}</span>
              <span className="text-stone-600 text-3xl">W</span>
              <span className="text-stone-500 mx-2">-</span>
              <span className="text-white">{record.losses}</span>
              <span className="text-stone-600 text-3xl">L</span>
            </div>
            <div className={`text-lg font-mono font-black ${
              record.gmBonus >= 300 ? 'text-amber-400' : record.gmBonus > 0 ? 'text-cyan-400' : 'text-stone-500'
            }`}>
              {record.result}
            </div>
          </div>

          {/* 生存チェック */}
          <div className={`rounded-xl p-4 text-center border ${
            survived ? 'bg-emerald-950/30 border-emerald-800' : 'bg-red-950/30 border-red-800'
          }`}>
            <div className={`text-3xl font-black font-mono ${survived ? 'text-emerald-400' : 'text-red-400'}`}>
              {survived ? '✓ SURVIVED' : '✗ COLLAPSED'}
            </div>
            <div className="text-xs font-mono text-stone-400 mt-1">
              Rating {effectiveOvr} / 必要 {minOvr}+ ({margin > 0 ? '+' : ''}{margin})
            </div>
          </div>

          {/* トッププレイヤー */}
          <div className="space-y-1">
            <div className="text-xs font-mono font-black text-stone-500 uppercase">Top Players</div>
            {topPlayers.slice(0, 3).map((p, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-stone-300 text-sm">{p.name}</span>
                <span className="text-amber-400 font-mono font-black text-sm">R{p.rating}</span>
              </div>
            ))}
          </div>

          {/* GM Score */}
          <div className="text-center pt-3 border-t border-stone-800">
            <div className="text-xs text-stone-500 font-mono">GM SCORE</div>
            <div className="text-4xl font-black font-mono text-amber-400">{gmScore}</div>
          </div>
        </div>

        {/* シェアボタン */}
        <div className="flex gap-3">
          <button onClick={onContinue}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-3 rounded-xl text-sm transition-all">
            続ける →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dyRevealUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ VIEWER CHALLENGE — 視聴者チャレンジ ═══                       */
/* ═══════════════════════════════════════════════════════════════ */

const CHALLENGE_TEMPLATES = [
  { id: 'cap_clean', name: 'キャップキーパー', desc: 'シーズン終了時にキャップ以内に収める', check: (s) => s.capHit <= 136000000, reward: 100 },
  { id: 'no_tax', name: 'タックスフリー', desc: 'ラグジュアリータックスを一度も発生させない', check: (s) => s.capHit <= 165000000, reward: 80 },
  { id: 'three_stars', name: 'ビッグスリー', desc: 'Rating 85以上の選手を3人以上揃える', check: (s) => s.roster.filter(p => p.rating >= 85).length >= 3, reward: 120 },
  { id: 'young_guns', name: 'ヤングガンズ', desc: '25歳以下の選手を5人以上揃える', check: (s) => s.roster.filter(p => p.age <= 25).length >= 5, reward: 90 },
  { id: 'survive_close', name: 'ニアデス', desc: '生存マージン10以内でシーズンを乗り切る', check: (s) => s.effectiveOvr >= s.minOvr && s.effectiveOvr - s.minOvr <= 10, reward: 150 },
  { id: 'roster_full', name: 'フルロスター', desc: '15人のロスターを維持する', check: (s) => s.roster.length >= 15, reward: 60 },
  { id: 'rating_500', name: 'ハーフサウザンド', desc: 'Total Rating 500以上を達成', check: (s) => s.effectiveOvr >= 500, reward: 200 },
  { id: 'draft_star', name: 'ドラフトの星', desc: 'ドラフトでRating 80以上の選手を獲得', check: () => false, reward: 100 },
  { id: 'no_injury', name: '健康第一', desc: '怪我人ゼロでシーズンを終える', check: (s) => s.injuredList.length === 0, reward: 130 },
  { id: 'trade_master', name: 'トレードマスター', desc: 'シーズン中に3回トレードを行う', check: () => false, reward: 80 },
];

export function generateViewerChallenges(count = 3) {
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(c => ({
    ...c,
    status: 'active',
    revealed: false,
  }));
}

export function ViewerChallengePanel({ challenges, onDismiss }) {
  return (
    <div className="fixed bottom-3 right-3 z-[50] bg-black/85 border border-amber-700/60 rounded-xl px-4 py-3 font-mono text-xs backdrop-blur-sm select-none pointer-events-auto max-w-xs"
      style={{ animation: 'dyRevealUp 0.5s ease' }}>
      <div className="text-amber-400 font-black text-xs tracking-wider mb-2">
        🏆 視聴者チャレンジ
      </div>
      <div className="space-y-1.5">
        {challenges.filter(c => c.status === 'active').map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-stone-600">•</span>
            <div>
              <span className="text-white font-bold">{c.name}</span>
              <span className="text-stone-500 ml-1">(+{c.reward}pts)</span>
              <div className="text-stone-500 text-[10px]">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onDismiss} className="text-stone-600 hover:text-stone-400 text-[10px] mt-2">非表示</button>

      <style>{`
        @keyframes dyRevealUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ═══ STREAM MODE SETTINGS PANEL ═══                              */
/* ═══════════════════════════════════════════════════════════════ */

export function StreamSettingsPanel({ settings, onChange, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9998]" onClick={onClose}>
      <div className="bg-[#110f0e] border border-cyan-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black font-mono text-cyan-400">🎬 配信モード設定</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-sm font-mono">✕</button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded-xl px-4 py-3">
            <div>
              <div className="text-white font-bold text-sm">🗳️ 視聴者投票を有効化</div>
              <div className="text-stone-500 text-xs">全選択肢に投票ボタンを表示</div>
            </div>
            <input type="checkbox" checked={settings.votingEnabled}
              onChange={e => onChange({ ...settings, votingEnabled: e.target.checked })}
              className="accent-cyan-500 w-5 h-5" />
          </label>

          <label className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded-xl px-4 py-3">
            <div>
              <div className="text-white font-bold text-sm">🎬 ドラマチック演出</div>
              <div className="text-stone-500 text-xs">シーズン結果・ドラフトを段階的に表示</div>
            </div>
            <input type="checkbox" checked={settings.dramaticMode}
              onChange={e => onChange({ ...settings, dramaticMode: e.target.checked })}
              className="accent-cyan-500 w-5 h-5" />
          </label>

          <label className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded-xl px-4 py-3">
            <div>
              <div className="text-white font-bold text-sm">📊 ステータスオーバーレイ</div>
              <div className="text-stone-500 text-xs">左上にチーム情報を常時表示（OBS向け）</div>
            </div>
            <input type="checkbox" checked={settings.statsOverlay}
              onChange={e => onChange({ ...settings, statsOverlay: e.target.checked })}
              className="accent-cyan-500 w-5 h-5" />
          </label>

          <label className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded-xl px-4 py-3">
            <div>
              <div className="text-white font-bold text-sm">🏆 視聴者チャレンジ</div>
              <div className="text-stone-500 text-xs">右下にチャレンジ目標を表示</div>
            </div>
            <input type="checkbox" checked={settings.challengesEnabled}
              onChange={e => onChange({ ...settings, challengesEnabled: e.target.checked })}
              className="accent-cyan-500 w-5 h-5" />
          </label>

          <div className="bg-stone-950 border border-stone-800 rounded-xl px-4 py-3">
            <div className="text-white font-bold text-sm mb-2">⏱ 投票タイマー</div>
            <div className="flex gap-2">
              {[10, 15, 20, 30, 45].map(sec => (
                <button key={sec} onClick={() => onChange({ ...settings, voteDuration: sec })}
                  className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-all ${
                    settings.voteDuration === sec
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-400 border'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:bg-stone-800'
                  }`}>
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onClose}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-stone-950 font-mono font-black py-3 rounded-xl text-sm">
          設定を保存
        </button>
      </div>
    </div>
  );
}
