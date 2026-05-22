import React, { useState, useEffect, useRef, useCallback } from 'react';
import RosterTable from './RosterTable';
import SalaryMeter from './SalaryMeter';
import {
  genRoster, genFA, genDraft, genDraftPicks, advanceSeason, advanceDeadCap,
  checkSurvival, calcCapHit, canSignFA, adjustSalaryForYears,
  getMLEAmount, calcRepeaterTax, calcStretch, validateTrade,
  isSupermaxEligible, isGilbertArenasRestricted, getFALimit, calcSeasonBonus, calcGMScore,
  calcSeasonRecord, calcRosterBalance, generateMandate,
  genTradeMarketPicks, genTradeMarketPlayers, validateStepienRule, validateHardCap,
  validatePickBalance, getPickValue,
  DYN_CAP, DYN_TAX, DYN_APRON1, DYN_APRON2, PICKS_PER_DRAFT,
  FA_BASE_LIMIT, FA_APRON1_LIMIT,
  BONUS_RATING80_GM_SCORE, BONUS_SEASON_50, BONUS_SEASON_100
} from '../dynastyEngine';

/* ═══ 定数 ═══ */
const TRADE_LIMIT = 3;

/* ═══ Toast ═══ */
function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none" style={{ maxWidth: '400px' }}>
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto"
          style={{ animation: toast.exiting ? 'dyToastOut 0.4s ease forwards' : 'dyToastIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
          <div className={
            'border rounded-xl px-5 py-3.5 shadow-2xl backdrop-blur-sm ' +
            (toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/60' :
             toast.type === 'epic' ? 'bg-amber-950/90 border-amber-400/60' :
             toast.type === 'trade' ? 'bg-purple-950/90 border-purple-500/60' :
             toast.type === 'warning' ? 'bg-red-950/90 border-red-500/60' :
             toast.type === 'info' ? 'bg-blue-950/90 border-blue-500/60' :
             'bg-stone-900/90 border-stone-600/60')
          }>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{toast.icon}</span>
              <div>
                <div className={
                  'text-sm font-mono font-black tracking-wide ' +
                  (toast.type === 'success' ? 'text-emerald-400' :
                   toast.type === 'epic' ? 'text-amber-400' :
                   toast.type === 'trade' ? 'text-purple-400' :
                   toast.type === 'warning' ? 'text-red-400' :
                   toast.type === 'info' ? 'text-blue-400' :
                   'text-stone-300')
                }>{toast.title}</div>
                {toast.message && <div className="text-xs text-stone-300 font-bold mt-0.5">{toast.message}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Confetti ═══ */
function ConfettiOverlay({ active }) {
  if (!active) return null;
  const colors = ['#e8c547', '#22d3ee', '#f97316', '#a78bfa', '#34d399', '#fb7185'];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i, color: colors[i % colors.length], left: Math.random() * 100,
    delay: Math.random() * 2, duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8, rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }));
  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-20px',
          width: p.shape === 'circle' ? `${p.size}px` : `${p.size * 1.5}px`,
          height: `${p.size}px`, backgroundColor: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          transform: `rotate(${p.rotation}deg)`,
          animation: `dyConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`, opacity: 0.9,
        }} />
      ))}
    </div>
  );
}

/* ═══ AnimatedScore ═══ */
function AnimatedScore({ target, playClickSound, animate = true }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const timerRef = useRef(null);
  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    prevRef.current = end;
    if (!animate || Math.abs(end - start) < 10) { setDisplay(end); return; }
    const diff = end - start;
    const steps = Math.min(Math.abs(diff), 40);
    const stepSize = diff / steps;
    let current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      current++;
      setDisplay(Math.round(start + stepSize * current));
      try { playClickSound(); } catch (e) {}
      if (current >= steps) { clearInterval(timerRef.current); setDisplay(end); }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [target, animate]);
  useEffect(() => { setDisplay(target); prevRef.current = target; }, []);
  return <>{display}</>;
}

/* ═══ HoverTip ═══ */
function HoverTip({ children, text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [align, setAlign] = useState('center');
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    if (x - 144 < 8) setAlign('left'); else setAlign('center');
    setPos({ x, y: rect.top }); setShow(true);
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

/* ═══ BonusPanel ═══ */
function BonusPanel({ onClose, effectiveOvr, totalOvr, totalCapHit, effectiveRoster, season, faSignedThisSeason, injuredList, hardCapped }) {
  const seasonBonus = calcSeasonBonus(effectiveRoster, season);
  const rating80Count = effectiveRoster.filter(p => p.rating >= 80).length;
  const minRequired = 380 + (season - 1) * 8;
  const seasonDiff = effectiveOvr - minRequired;
  const sevColor = { minor: 'text-stone-400', moderate: 'text-amber-400', severe: 'text-orange-400', critical: 'text-red-400' };
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9998]" onClick={onClose}>
      <div className="bg-[#110f0e] border border-stone-700 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black font-mono text-amber-400">📋 ボーナス・ペナルティ一覧</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-sm font-mono">✕ 閉じる</button>
        </div>
        <div className="space-y-4 text-sm">
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-cyan-400 font-mono font-black text-xs uppercase tracking-wider">GM SCORE 内訳</h3>
            <div className="flex justify-between"><span className="text-stone-400">基本（生存シーズン×100）</span><span className="text-white font-mono">{Math.max(0, season - 1) * 100}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Total Rating ボーナス（÷10）</span><span className="text-white font-mono">+{Math.floor(effectiveOvr / 10)}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">キャップ残りボーナス</span><span className="text-white font-mono">+{Math.min(100, Math.floor((Math.max(0, DYN_CAP - totalCapHit) / 1000000) * 5))}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">スター保持（90+）</span><span className="text-white font-mono">{effectiveRoster.some(p => p.rating >= 90) ? '+50' : '0'}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">12人ロスター</span><span className="text-white font-mono">{effectiveRoster.length >= 12 ? '+30' : '0'}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">バード権ボーナス</span><span className="text-white font-mono">+{Math.min(60, effectiveRoster.filter(p => p.birdRights === 'Full').length * 20)}</span></div>
            <div className="flex justify-between text-amber-400"><span>Rating 80+ボーナス（×{rating80Count}人）</span><span className="font-mono">+{rating80Count * BONUS_RATING80_GM_SCORE}</span></div>
            {seasonBonus > 0 && <div className="flex justify-between text-emerald-400"><span>シーズン成績ボーナス（+{seasonDiff} over）</span><span className="font-mono">+{seasonBonus}</span></div>}
          </div>
          {hardCapped && (
            <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 space-y-2">
              <h3 className="text-red-400 font-mono font-black text-xs uppercase tracking-wider">🔒 ハードキャップ中</h3>
              <div className="text-stone-500 text-xs space-y-1">
                <p>• 第1エプロン ${(DYN_APRON1 / 1000000).toFixed(1)}M で拘束中</p>
                <p>• FA、トレード、MLE等如何なる手段でも超過不可</p>
                <p>• 次のシーズン開始で解除</p>
              </div>
            </div>
          )}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-cyan-400 font-mono font-black text-xs uppercase tracking-wider">FA契約制限</h3>
            <div className="flex justify-between"><span className="text-stone-400">今シーズンのFA契約</span><span className="text-white font-mono">{faSignedThisSeason} / {getFALimit(totalCapHit)}人</span></div>
            <div className="text-stone-500 text-xs space-y-1 mt-2">
              <p>• キャップ以内 → 最大{FA_BASE_LIMIT}人/シーズン</p>
              <p>• 第1エプロン超過 → 最大{FA_APRON1_LIMIT}人/シーズン、契約年数最大3年</p>
              <p>• 第2エプロン超過 → FA契約禁止（ドラフトとトレードのみ）</p>
            </div>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-cyan-400 font-mono font-black text-xs uppercase tracking-wider">成長率の違い</h3>
            <div className="text-stone-500 text-xs space-y-1">
              <p>• FA契約選手 → 毎シーズン <span className="text-red-400 font-mono">-2〜-4</span> Rating低下</p>
              <p>• トレード獲得選手 → 毎シーズン <span className="text-emerald-400 font-mono">-0〜-2</span> Rating低下</p>
              <p>• ドラフト/ロスター → <span className="text-stone-300 font-mono">Potまで成長</span>（25%の確率で成長）</p>
              <p>• Rating 85+ → 低下率が <span className="text-amber-400 font-mono">30%軽減</span></p>
            </div>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-orange-400 font-mono font-black text-xs uppercase tracking-wider">🏥 怪我システム</h3>
            <div className="text-stone-500 text-xs space-y-1">
              <p>• 発生確率: <span className="text-white font-mono">15%</span>/シーズン（30歳以上 +1%/歳）</p>
              <p>• <span className={sevColor.minor}>軽傷 55%</span>: Rating -1〜-2、即回復</p>
              <p>• <span className={sevColor.moderate}>中度 25%</span>: Rating -2〜-5、1シーズン欠場</p>
              <p>• <span className={sevColor.severe}>重度 15%</span>: Rating -4〜-15、1〜2シーズン欠場</p>
              <p>• <span className={sevColor.critical}>深刻 5%</span>: Rating -5〜-25、1〜5シーズン欠場、引退の可能性</p>
              <p className="text-stone-400 mt-1">※ 怪我中の選手はTotal Ratingに反映されません</p>
            </div>
            {injuredList.length > 0 && (
              <div className="mt-2 pt-2 border-t border-stone-800">
                <h4 className="text-orange-400 font-mono font-black text-xs mb-1">現在の負傷者</h4>
                {injuredList.map((inj, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span className="text-stone-300">{inj.playerName}</span>
                    <span className={sevColor[inj.severity]}>{inj.name} ({inj.seasonsLeft}yr)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-cyan-400 font-mono font-black text-xs uppercase tracking-wider">放出手段の使いどころ</h3>
            <div className="text-stone-500 text-xs space-y-1">
              <p>• <span className="text-white font-bold">ウェイブ</span>: 100%デッドキャップ。契約を完全に切る</p>
              <p>• <span className="text-white font-bold">バイアウト</span>: 50-70%デッドキャップ。選手が同意するとは限らない</p>
              <p>• <span className="text-white font-bold">ストレッチ</span>: 今年のキャップを空けるが、長期のデッドキャップになる</p>
            </div>
          </div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-cyan-400 font-mono font-black text-xs uppercase tracking-wider">トレードルール</h3>
            <div className="text-stone-500 text-xs space-y-1">
              <p>• 給与マッチング: 獲得額は送出額の75%〜125%+$100K</p>
              <p>• ステピアンルール: 連続する2年の1巡目ピックを同時に放出不可</p>
              <p>• ピック価値バランス: 獲得ピック合計値が送出の2倍+25を超えると拒否</p>
              <p>• ピックのみのトレードは給与マッチング不要</p>
              <p>• トレード獲得選手は成長率優遇（-0〜-2）</p>
              <p>• シーズンあたり最大{TRADE_LIMIT}回まで</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
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
  const [tradeOffer, setTradeOffer] = useState({ players: [], picks: [] });
  const [tradeTarget, setTradeTarget] = useState({ players: [], picks: [] });
  const [tradeMarket, setTradeMarket] = useState({ players: [], picks: [] });
  const [hardCapped, setHardCapped] = useState(false);
  const [tradesUsedThisSeason, setTradesUsedThisSeason] = useState(0);

  const [toasts, setToasts] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const toastCounter = useRef(0);
  const [gmAnimating, setGmAnimating] = useState(false);
  const [faSignedThisSeason, setFaSignedThisSeason] = useState(0);
  const [showBonusPanel, setShowBonusPanel] = useState(false);
  const [injuredList, setInjuredList] = useState([]);
  const [seasonRecord, setSeasonRecord] = useState(null);
  const [totalRecordBonus, setTotalRecordBonus] = useState(0);
  const [currentMandate, setCurrentMandate] = useState(null);
  const [mandateResult, setMandateResult] = useState(null);
  const [totalMandateBonus, setTotalMandateBonus] = useState(0);

  /* ── derived ── */
  const totalCapHit = calcCapHit(roster, deadCap);
  const totalOvr = roster.reduce((s, p) => s + p.rating, 0);
  const minOvr = 380 + (season - 1) * 8;
  const faLimit = getFALimit(totalCapHit);

  const injuredIds = new Set(injuredList.map(inj => inj.playerId));
  const effectiveRoster = roster.filter(p => !injuredIds.has(p.id));
  const rawEffectiveOvr = effectiveRoster.reduce((s, p) => s + p.rating, 0);
  const balance = calcRosterBalance(effectiveRoster);
  const effectiveOvr = Math.floor(rawEffectiveOvr * (100 - balance.penaltyPct) / 100);

  function gmScoreCalc() {
    return calcGMScore(season, effectiveOvr, totalCapHit, effectiveRoster) + totalRecordBonus + totalMandateBonus;
  }

  const mleAmount = getMLEAmount(totalCapHit);
  const repeaterSeasons = taxHistory.filter(Boolean).length;
  const overTax = Math.max(0, totalCapHit - DYN_TAX);
  const repeaterTax = calcRepeaterTax(overTax, repeaterSeasons);
  const isOnTax = totalCapHit > DYN_TAX;

  const nextSeasonMinOvr = 380 + season * 8;
  const survivalMargin = effectiveOvr - nextSeasonMinOvr;

  /* ── toast helpers ── */
  const addToast = useCallback((type, icon, title, message, duration = 3000) => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, icon, title, message, exiting: false }]);
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t)), duration);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration + 500);
  }, []);
  const triggerConfetti = useCallback(() => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 5000); }, []);
  const triggerShake = useCallback(() => { setScreenShake(true); setTimeout(() => setScreenShake(false), 600); }, []);

  /* ── sounds ── */
  const ctxRef = useRef(null);
  const getAudioCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };
  const playTone = (freq, duration = 0.15, type = 'sine', vol = 0.08, delay = 0) => {
    try {
      const ctx = getAudioCtx(); const now = ctx.currentTime + delay;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + duration + 0.01);
    } catch (e) {}
  };
  const playSuccessSound = () => { playTone(523.25, 0.15, 'sine', 0.07); playTone(659.25, 0.15, 'sine', 0.07, 0.1); playTone(783.99, 0.25, 'sine', 0.09, 0.2); };
  const playEpicSound = () => { [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => { playTone(f, 0.4, 'sine', 0.06, i * 0.12); playTone(f * 1.5, 0.3, 'triangle', 0.03, i * 0.12 + 0.05); }); [1318.51, 1567.98, 2093.00].forEach((f, i) => { playTone(f, 0.8, 'sine', 0.02, 0.5 + i * 0.15); }); };
  const playTradeSound = () => { playTone(200, 0.3, 'sawtooth', 0.06); playTone(150, 0.4, 'sine', 0.08, 0.05); playTone(800, 0.08, 'square', 0.04, 0.1); playTone(600, 0.15, 'sine', 0.06, 0.15); playTone(900, 0.2, 'sine', 0.08, 0.25); };
  const playBuyoutSound = () => { playTone(329.63, 0.6, 'sine', 0.05); playTone(415.30, 0.6, 'sine', 0.05, 0.02); playTone(493.88, 0.8, 'sine', 0.07, 0.04); playTone(987.77, 1.2, 'sine', 0.02, 0.4); };
  const playErrorSound = () => { playTone(200, 0.2, 'square', 0.06); playTone(190, 0.2, 'square', 0.06, 0.15); };
  const playReleaseSound = () => { playTone(600, 0.15, 'sine', 0.05); playTone(400, 0.15, 'sine', 0.04, 0.1); playTone(250, 0.3, 'sine', 0.03, 0.2); };
  const playMLESound = () => { playTone(698.46, 0.15, 'sine', 0.06); playTone(880.00, 0.15, 'sine', 0.06, 0.1); playTone(1046.50, 0.3, 'triangle', 0.08, 0.2); };
  const playOptionSound = () => { playTone(1000, 0.06, 'square', 0.05); playTone(1400, 0.1, 'sine', 0.07, 0.06); };
  const playInjurySound = () => { playTone(300, 0.4, 'sawtooth', 0.05); playTone(200, 0.6, 'sine', 0.04, 0.1); playTone(120, 0.8, 'sine', 0.06, 0.3); };

  useEffect(() => { doReroll(); }, []);

  /* ═══════════════════════════════════════ */
  /* ═══ HANDLERS ═══                        */
  /* ═══════════════════════════════════════ */

  function doReroll() {
    playClickSound();
    setRoster(genRoster());
    setFreeAgents(genFA(8));
    setDeadCap(0); setDeadCapDetails([]);
    setDraftPicks(genDraftPicks());
    setTaxHistory([]); setMleUsed(false);
    setSeason(1); setPhase('reroll'); setTradeMode(false);
    setGmAnimating(false); setFaSignedThisSeason(0);
    setInjuredList([]);
    setSeasonRecord(null);
    setTotalRecordBonus(0);
    setCurrentMandate(generateMandate());
    setMandateResult(null);
    setTotalMandateBonus(0);
    setHardCapped(false);
    setTradesUsedThisSeason(0);
    setTradeOffer({ players: [], picks: [] });
    setTradeTarget({ players: [], picks: [] });
    setTradeMarket({ players: [], picks: [] });
  }

  function handleSignRequest(player) {
    playClickSound(); setSigningPlayer(player); setSigningYears(2); setUseMLE(false);
  }

  function handleConfirmSign() {
    playClickSound();
    const player = signingPlayer;
    const years = signingYears;
    const check = canSignFA(player, years, totalCapHit, faSignedThisSeason);
    if (!check.allowed) { playErrorSound(); triggerShake(); addToast('warning', '❌', '契約不可', check.reason, 4000); return; }
    let adjustedSalary = adjustSalaryForYears(player.salary, years);
    if (useMLE && mleAmount > 0 && !mleUsed) adjustedSalary = Math.min(adjustedSalary, mleAmount);
    if (totalCapHit + adjustedSalary > DYN_APRON2) { playErrorSound(); triggerShake(); addToast('warning', '❌', '第2エプロン超過', '補強できません！', 4000); return; }
    if (hardCapped && totalCapHit + adjustedSalary > DYN_APRON1) {
      playErrorSound(); triggerShake();
      addToast('warning', '🔒', 'ハードキャップ中', `第1エプロン $${(DYN_APRON1 / 1000000).toFixed(1)}Mを超過できません`, 4000);
      return;
    }
    const signedPlayer = { ...player, salary: adjustedSalary, contractYears: years, faStatus: 'None', source: 'fa' };
    setFreeAgents(fa => fa.filter(p => p.id !== player.id));
    setRoster(r => [...r, signedPlayer]);
    setFaSignedThisSeason(c => c + 1);
    if (useMLE) {
      setMleUsed(true);
      if (totalCapHit > DYN_CAP) {
        setHardCapped(true);
        addToast('info', '🔒', 'ハードキャップ発動', 'MLE使用 → 第1エプロンで拘束', 4000);
      }
      playMLESound();
      addToast('info', '📋', `MLE契約: {player.name}`, `$$$${(adjustedSalary / 1000000).toFixed(1)}M`, 3500);
    } else {
      playSuccessSound();
      addToast('success', '✍️', `契約: ${player.name}`, `R${player.rating} | $${(adjustedSalary / 1000000).toFixed(1)}M/年`, 3000);
    }
    setSigningPlayer(null);
  }

  function handleCancelSign() { playClickSound(); setSigningPlayer(null); }

  function handleWaiver(player) {
    playClickSound();
    const remaining = player.salary * player.contractYears;
    if (!window.confirm(`{player.name}をウェイブしますか？\n\n残り契約: $$$${(remaining / 1000000).toFixed(1)}M（${player.contractYears}年）\nデッドキャップ: $${(player.salary / 1000000).toFixed(1)}M/年 × {player.contractYears}年`)) return;
    if (player.salary > 0 && player.contractYears > 0) {
      const nd = [...deadCapDetails, { name: player.name, amount: player.salary, yearsLeft: player.contractYears, type: 'Waive' }];
      setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
    }
    setRoster(r => r.filter(p => p.id !== player.id));
    setInjuredList(il => il.filter(inj => inj.playerId !== player.id));
    playReleaseSound();
    addToast('warning', '💀', `ウェイブ: ${player.name}`, `デッドキャップ $$$${(player.salary / 1000000).toFixed(1)}M/年 × ${player.contractYears}年`, 4000);
  }

  function handleBuyout(player) {
    playClickSound();
    const agreeChance = Math.max(5, 100 - player.rating);
    const roll = Math.random() * 100;
    if (roll < agreeChance) {
      const pct = 50 + Math.floor(Math.random() * 21);
      const deadAmount = Math.floor(player.salary * pct / 100);
      if (player.salary > 0 && player.contractYears > 0) {
        const nd = [...deadCapDetails, { name: player.name + ' (B/O)', amount: deadAmount, yearsLeft: player.contractYears, type: 'Buyout' }];
        setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
      }
      setRoster(r => r.filter(p => p.id !== player.id));
      setInjuredList(il => il.filter(inj => inj.playerId !== player.id));
      playBuyoutSound();
      const totalSaved = player.salary * player.contractYears - deadAmount * player.contractYears;
      addToast('success', '🤝', `バイアウト成功: ${player.name}`, `契約${pct}%に軽減 | $${(totalSaved / 1000000).toFixed(1)}M節約`, 4500);
    } else { playErrorSound(); addToast('warning', '❌', `バイアウト拒否: {player.name}`, `同意確率: ${agreeChance}%`, 3500); }
  }

  function handleStretch(player) {
    playClickSound();
    const st = calcStretch(player);
    if (!window.confirm(`${player.name}をストレッチしますか？\n\n通常: $$$${(player.salary / 1000000).toFixed(1)}M/年 × ${player.contractYears}年\nストレッチ: $${(st.annualAmount / 1000000).toFixed(1)}M/年 × {st.stretchYears}年`)) return;
    if (player.salary > 0 && player.contractYears > 0) {
      const nd = [...deadCapDetails, { name: player.name + ' (ST)', amount: st.annualAmount, yearsLeft: st.stretchYears, type: 'Stretch' }];
      setDeadCapDetails(nd); setDeadCap(nd.reduce((s, d) => s + d.amount, 0));
    }
    setRoster(r => r.filter(p => p.id !== player.id));
    setInjuredList(il => il.filter(inj => inj.playerId !== player.id));
    playBuyoutSound();
    addToast('success', '⏳', `ストレッチ条項: ${player.name}`, `${st.stretchYears}年分割 | $$$${(st.annualAmount / 1000000).toFixed(1)}M/年`, 4500);
  }

  function handleOptionDecision(player, exercise) {
    playClickSound(); playOptionSound();
    if (player.optionType === 'player') {
      if (exercise) { addToast('info', '📋', `PO行使: ${player.name}`, `$${(player.salary / 1000000).toFixed(1)}Mで契約延長`, 3000); }
      else {
        setRoster(r => r.filter(x => x.id !== player.id));
        setInjuredList(il => il.filter(inj => inj.playerId !== player.id));
        player.faStatus = player.birdRights !== 'None' ? 'RFA' : 'UFA';
        setExpiredPlayers(ep => [...ep, { ...player }]);
        addToast('warning', '🏃', `PO拒否: {player.name}`, 'FA市場へ移動', 3500);
      }
    } else {
      if (exercise) { addToast('success', '📋', `TO行使: ${player.name}`, `$$$${(player.salary / 1000000).toFixed(1)}Mで契約延長`, 3000); }
      else {
        setRoster(r => r.filter(x => x.id !== player.id));
        setInjuredList(il => il.filter(inj => inj.playerId !== player.id));
        addToast('info', '✂️', `TO拒否: ${player.name}`, '契約を終了。キャップに余裕が生まれました', 3000);
      }
    }
    setOptionPlayers(op => op.filter(x => x.id !== player.id));
  }

  /* ── Trade ── */
  function handleOpenTrade() {
    playClickSound();
    if (tradesUsedThisSeason >= TRADE_LIMIT) {
      playErrorSound(); triggerShake();
      addToast('warning', '❌', 'トレード回数上限', `今シーズンのトレードは${TRADE_LIMIT}回まで`, 4000);
      return;
    }
    if (tradeMarket.players.length === 0) {
      setTradeMarket({ players: genTradeMarketPlayers(4), picks: genTradeMarketPicks() });
    }
    setTradeOffer({ players: [], picks: [] });
    setTradeTarget({ players: [], picks: [] });
    setTradeMode(true);
  }

  function handleAddToTradeOut(player) {
    playClickSound();
    const exists = tradeOffer.players.find(p => p.id === player.id);
    setTradeOffer({ ...tradeOffer, players: exists ? tradeOffer.players.filter(p => p.id !== player.id) : [...tradeOffer.players, player] });
  }

  function handleAddToTradeOutPick(pick) {
    playClickSound();
    const exists = tradeOffer.picks.find(p => p.id === pick.id);
    setTradeOffer({ ...tradeOffer, picks: exists ? tradeOffer.picks.filter(p => p.id !== pick.id) : [...tradeOffer.picks, pick] });
  }

  function handleRemoveFromTradeOut(player) {
    playClickSound();
    setTradeOffer({ ...tradeOffer, players: tradeOffer.players.filter(p => p.id !== player.id) });
  }

  function handleRemoveFromTradeOutPick(pick) {
    playClickSound();
    setTradeOffer({ ...tradeOffer, picks: tradeOffer.picks.filter(p => p.id !== pick.id) });
  }

  function handleAddToTradeIn(player) {
    playClickSound();
    const exists = tradeTarget.players.find(p => p.id === player.id);
    setTradeTarget({ ...tradeTarget, players: exists ? tradeTarget.players.filter(p => p.id !== player.id) : [...tradeTarget.players, player] });
  }

  function handleAddToTradeInPick(pick) {
    playClickSound();
    const exists = tradeTarget.picks.find(p => p.id === pick.id);
    setTradeTarget({ ...tradeTarget, picks: exists ? tradeTarget.picks.filter(p => p.id !== pick.id) : [...tradeTarget.picks, pick] });
  }

  function handleRemoveFromTradeIn(player) {
    playClickSound();
    setTradeTarget({ ...tradeTarget, players: tradeTarget.players.filter(p => p.id !== player.id) });
  }

  function handleRemoveFromTradeInPick(pick) {
    playClickSound();
    setTradeTarget({ ...tradeTarget, picks: tradeTarget.picks.filter(p => p.id !== pick.id) });
  }

  function handleExecuteTrade() {
    playClickSound();
    const outP = tradeOffer.players;
    const outK = tradeOffer.picks;
    const inP = tradeTarget.players;
    const inK = tradeTarget.picks;

    // ピック価値バランス検証
    if (inK.length > 0) {
      const pv = validatePickBalance(outK, inK);
      if (!pv.valid) { playErrorSound(); triggerShake(); addToast('warning', '❌', 'ピック価値不均衡', pv.reason, 4000); return; }
    }

    if (outP.length > 0 && inP.length > 0) {
      const v = validateTrade(outP.map(p => p.salary), inP.map(p => p.salary));
      if (!v.allowed) { playErrorSound(); triggerShake(); addToast('warning', '❌', 'トレード不可', v.reason, 4000); return; }
    }
    if (outK.filter(p => p.round === 1).length > 0 || inK.filter(p => p.round === 1).length > 0) {
      const sv = validateStepienRule(draftPicks, outK, inK);
      if (!sv.valid) { playErrorSound(); triggerShake(); addToast('warning', '❌', 'ステピアンルール', sv.reason, 4000); return; }
    }
    if (hardCapped) {
      const outSal = outP.reduce((s, p) => s + p.salary, 0);
      const inSal = inP.reduce((s, p) => s + p.salary, 0);
      const postCap = totalCapHit - outSal + inSal;
      if (postCap > DYN_APRON1) {
        playErrorSound(); triggerShake();
        addToast('warning', '🔒', 'ハードキャップ', `Cap Hit $${(postCap / 1000000).toFixed(1)}M > 第1エプロン`, 4000);
        return;
      }
    }

    const tradedIn = inP.map(p => ({ ...p, source: 'trade' }));
    setRoster(r => [...r.filter(p => !outP.find(o => o.id === p.id)), ...tradedIn]);
    setInjuredList(il => il.filter(inj => !outP.find(o => o.id === inj.playerId)));
    if (outK.length > 0) setDraftPicks(dp => dp.filter(p => !outK.find(o => o.id === p.id)));
    if (inK.length > 0) {
      const newPicks = inK.map(p => ({ id: p.id, year: p.year, round: p.round, own: true, from: p.from }));
      setDraftPicks(dp => [...dp, ...newPicks]);
    }

    setTradeOffer({ players: [], picks: [] });
    setTradeTarget({ players: [], picks: [] });
    setTradeMode(false);

    const newCount = tradesUsedThisSeason + 1;
    setTradesUsedThisSeason(newCount);
    if (newCount >= TRADE_LIMIT) {
      setTradeMarket({ players: [], picks: [] });
    }

    playTradeSound(); triggerConfetti();
    const outNames = [];
    if (outP.length > 0) outNames.push(outP.map(p => p.name).join(', '));
    if (outK.length > 0) outNames.push(outK.map(p => `Y{p.year}R${p.round}`).join(', '));
    const inNames = [];
    if (inP.length > 0) inNames.push(inP.map(p => p.name).join(', '));
    if (inK.length > 0) inNames.push(inK.map(p => `Y${p.year}R${p.round}${p.from ? `(${p.from})` : ''}`).join(', '));
    addToast('trade', '🤝', 'トレード成立!', `${outNames.join(' + ')} → ${inNames.join(' + ')}`, 5000);
  }

  /* ── Season ── */
  function handleNextSeason() {
    playClickSound();
    const record = calcSeasonRecord(effectiveOvr, minOvr);
    setSeasonRecord(record);
    setTotalRecordBonus(prev => prev + record.gmBonus);

    let mResult = null;
    if (currentMandate) {
      let success = false;
      switch (currentMandate.id) {
        case 'win': success = record.winRate >= 60; break;
        case 'playoff': success = record.winRate >= 40; break;
        case 'cap': success = totalCapHit <= DYN_CAP; break;
        case 'stars': success = effectiveRoster.filter(p => p.rating >= 80).length >= 3; break;
        case 'balance': success = balance.penaltyPct === 0; break;
      }
      const bonus = success ? currentMandate.successBonus : currentMandate.failPenalty;
      setTotalMandateBonus(prev => prev + bonus);
      mResult = { mandate: currentMandate, success, bonus };
    }
    setMandateResult(mResult);
    setCurrentMandate(generateMandate());

    const result = advanceSeason(roster, injuredList);
    const deadResult = advanceDeadCap(deadCapDetails);
    setSummaries(result.summaries);
    setExpiredPlayers(result.expired);
    setOptionPlayers(result.optionPlayers);
    setRoster(result.surviving);
    setDeadCap(deadResult.total); setDeadCapDetails(deadResult.details);
    setTaxHistory([...taxHistory, isOnTax]); setMleUsed(false); setFaSignedThisSeason(0);
    setInjuredList(result.injuries);
    setHardCapped(false);
    setTradesUsedThisSeason(0);
    setTradeMarket({ players: [], picks: [] });

    const newInjuries = result.injuries.filter(inj => !injuredList.find(old => old.id === inj.id));
    newInjuries.forEach(inj => {
      const sevLabel = { minor: '軽傷', moderate: '中度', severe: '重度', critical: '深刻' };
      playInjurySound();
      addToast('warning', '🏥', `${inj.playerName}: ${inj.name}`, `${sevLabel[inj.severity]} | -${inj.ratingLoss} Rating | ${inj.seasonsLeft}シーズン欠場`, 5000);
    });
    if (record.gmBonus > 0) {
      addToast('epic', '🏀', `シーズン成績: ${record.wins}勝${record.losses}敗`, `${record.result} → GM SCORE +${record.gmBonus}`, 5000);
    } else {
      addToast('warning', '🏀', `シーズン成績: ${record.wins}勝${record.losses}敗`, `${record.result}`, 4000);
    }
    if (mResult) {
      if (mResult.success) addToast('epic', '📋', `オーナー要請: 達成！`, `${mResult.mandate.name} → GM SCORE +${mResult.bonus}`, 5000);
      else if (mResult.bonus < 0) addToast('warning', '📋', `オーナー要請: 未達成`, `${mResult.mandate.name} → GM SCORE ${mResult.bonus}`, 4000);
      else addToast('info', '📋', `オーナー要請: 未達成`, `${mResult.mandate.name}（ペナルティなし）`, 3000);
    }
    setPhase('seasonEnd');
  }

  function handleToDraft() { playClickSound(); if (optionPlayers.length > 0) { setPhase('optionDecision'); return; } startDraft(); }

  function startDraft() {
    const year1Picks = draftPicks.filter(pk => pk.year === 1).length;
    setDraftProspects(genDraft(10));
    setPicksLeft(year1Picks);
    setPhase('draft');
  }

  function handleDraft(prospect) {
    playClickSound(); playSuccessSound();
    addToast('success', '🏀', `ドラフト: ${prospect.name}`, `${prospect.position} R${prospect.rating} | $$$${(prospect.salary / 1000000).toFixed(1)}M`, 3000);
    setRoster(r => [...r, { ...prospect, faStatus: 'None', hasOption: false, optionType: null, supermaxEligible: false, source: 'draft' }]);
    setDraftProspects(dp => dp.filter(p => p.id !== prospect.id));
    setPicksLeft(p => p - 1);
    setDraftPicks(picks => {
      const idx = picks.findIndex(pk => pk.year === 1);
      if (idx >= 0) return picks.filter((_, i) => i !== idx);
      return picks;
    });
  }

  function handleDraftComplete() {
    playClickSound();
    const newSeason = season + 1;
    const survival = checkSurvival(roster, newSeason, injuredList);
    if (!survival.alive) { playErrorSound(); setCollapseReason(survival.reason); setPhase('gameOver'); return; }
    const bonus = calcSeasonBonus(effectiveRoster, season);
    if (bonus > 0) addToast('epic', '🏆', `シーズンボーナス +${bonus} GM SCORE!`, `Total Rating ${effectiveOvr}（生存ライン+${effectiveOvr - minOvr}）`, 4000);
    playEpicSound(); triggerConfetti(); setGmAnimating(true);
    addToast('epic', '➡️', `SEASON ${newSeason}`, '新シーズン開始！', 3500);
    setDraftPicks(picks => {
      const updated = picks.map(pk => ({ ...pk, year: pk.year - 1 })).filter(pk => pk.year >= 1);
      const maxYear = updated.length > 0 ? Math.max(...updated.map(pk => pk.year)) : 0;
      updated.push({ id: 'pick_new_' + Date.now(), year: maxYear + 1, round: 1, own: true, from: null });
      if (Math.random() > 0.5) updated.push({ id: 'pick_new2_' + Date.now(), year: maxYear + 1, round: 2, own: true, from: null });
      return updated;
    });
    setHardCapped(false);
    setTradesUsedThisSeason(0);
    setTradeMarket({ players: [], picks: [] });
    setCurrentMandate(generateMandate());
    setFreeAgents(genFA(8)); setSeason(newSeason); setPhase('manage');
    setTimeout(() => setGmAnimating(false), 3000);
  }

  /* ═══════════════════════════════════════ */
  /* ═══ SUB-COMPONENTS ═══                  */
  /* ═══════════════════════════════════════ */

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
        <button onClick={() => { playClickSound(); setShowBonusPanel(true); }} className="px-2 py-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded-lg transition-all">📋 ボーナス一覧</button>
        <span className="text-xs font-mono text-stone-500">GM SCORE</span>
        <span className="text-2xl font-mono font-black text-amber-400">
          <AnimatedScore target={gmScoreCalc()} playClickSound={() => { try { playTone(800, 0.02, 'square', 0.03); } catch(e){} }} animate={gmAnimating} />
        </span>
        <span className="text-xs font-mono text-stone-600">pts</span>
        <button onClick={() => { playClickSound(); toggleBGM(); }} className={'px-3 py-2 rounded-lg transition-all text-sm ' + (isBgmOn ? 'text-emerald-400 bg-emerald-950/40' : 'text-stone-500 hover:text-stone-300')}>{isBgmOn ? '🔊' : '🔇'}</button>
      </div>
    </header>
  );

  const SignModal = () => {
    if (!signingPlayer) return null;
    const adjustedSalary = useMLE && mleAmount > 0 && !mleUsed
      ? Math.min(adjustSalaryForYears(signingPlayer.salary, signingYears), mleAmount)
      : adjustSalaryForYears(signingPlayer.salary, signingYears);
    const gilbert = isGilbertArenasRestricted(signingPlayer);
    const supermax = isSupermaxEligible(signingPlayer);
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9998]" onClick={handleCancelSign}>
        <div className="bg-[#141210] border border-stone-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="text-center space-y-1">
            <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">FA SIGNING</span>
            <h3 className="text-xl font-black text-white">{signingPlayer.name}</h3>
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-stone-500 font-mono">{signingPlayer.position}</span>
              <span className="text-amber-400 font-mono font-black">Rating {signingPlayer.rating}</span>
              {signingPlayer.pot > signingPlayer.rating && <span className="text-emerald-400 font-mono text-xs">(Pot {signingPlayer.pot})</span>}
              <span className="text-stone-400">Age {signingPlayer.age}</span>
            </div>
          </div>
          {supermax && (
            <HoverTip text="スーパーマックス：Rating 90以上かつ同一チーム4年以上の選手が対象。通常のマックス（キャップ30%）より高い35%の契約が可能。">
              <div className="bg-amber-950/40 border border-amber-700 rounded-lg p-2 text-xs text-amber-300 font-mono text-center cursor-help">⭐ スーパーマックス対象選手</div>
            </HoverTip>
          )}
          {gilbert && (
            <HoverTip text="ギルバート・アリーナス条項：ルーキー契約（2年以下）でRating 75以上の選手に適用。他チームのオファーはMLE額までに制限。">
              <div className="bg-purple-950/40 border border-purple-700 rounded-lg p-2 text-xs text-purple-300 font-mono text-center cursor-help">🔒 ギルバート・アリーナス条項適用</div>
            </HoverTip>
          )}
          {hardCapped && (
            <HoverTip text="ハードキャップ中：MLEまたはサイン＆トレード使用で発動。第1エプロン（$178.1M）を超える如何なる手段でも補強不可。">
              <div className="bg-red-950/40 border border-red-700 rounded-lg p-2 text-xs text-red-300 font-mono text-center cursor-help">🔒 ハードキャップ中: 第1エプロン ${(DYN_APRON1 / 1000000).toFixed(1)}M上限</div>
            </HoverTip>
          )}
          <div className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-400 text-center">
            今シーズンのFA契約: <span className="text-white font-black">{faSignedThisSeason}</span> / {faLimit}人
            {faLimit === 0 && <span className="text-red-400 ml-2">⚠️ FA契約不可</span>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono font-black text-stone-400 uppercase">契約年数を選択</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(y => {
                const check = canSignFA(signingPlayer, y, totalCapHit, faSignedThisSeason);
                return <button key={y} onClick={() => setSigningYears(y)} disabled={!check.allowed}
                  className={'py-2 rounded-lg border font-mono font-black text-sm transition-all ' + (signingYears === y ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : check.allowed ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850' : 'bg-stone-950 border-stone-900 text-stone-600 cursor-not-allowed')}>{y}年</button>;
              })}
            </div>
            {signingPlayer.rating >= 85 && signingYears === 1 && <p className="text-xs text-red-400 font-mono">⚠️ スター級選手は1年契約を拒否します</p>}
          </div>
          {mleAmount > 0 && !mleUsed && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="useMLE" checked={useMLE} onChange={e => setUseMLE(e.target.checked)} className="accent-cyan-500" />
              <HoverTip text="Mid-Level Exception：キャップ超過チームにも使える例外枠。チェックでMLE使用。使用すると第1エプロンでハードキャップ。毎シーズン1回。">
                <label htmlFor="useMLE" className="text-xs text-cyan-400 font-mono">MLEを使用（残額: ${(mleAmount / 1000000).toFixed(1)}M）</label>
              </HoverTip>
            </div>
          )}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-stone-400">年俸:</span><span className="text-white font-mono font-black">${(adjustedSalary / 1000000).toFixed(1)}M</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-400">契約総額:</span><span className="text-white font-mono font-black">${(adjustedSalary * signingYears / 1000000).toFixed(1)}M</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-400">契約後キャップ:</span><span className={(totalCapHit + adjustedSalary) <= DYN_CAP ? 'text-emerald-400 font-mono font-black' : 'text-red-400 font-mono font-black'}>${((totalCapHit + adjustedSalary) / 1000000).toFixed(1)}M</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCancelSign} className="flex-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-2.5 rounded-xl text-sm transition-all">キャンセル</button>
            <button onClick={handleConfirmSign} disabled={faSignedThisSeason >= faLimit} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-mono font-black py-2.5 rounded-xl text-sm transition-all">契約する</button>
          </div>
        </div>
      </div>
    );
  };

  const sevColor = { minor: 'text-stone-400', moderate: 'text-amber-400', severe: 'text-orange-400', critical: 'text-red-400' };
  const sevBg = { minor: 'bg-stone-900', moderate: 'bg-amber-950/50', severe: 'bg-orange-950/50', critical: 'bg-red-950/50' };
  const sevBorder = { minor: 'border-stone-800', moderate: 'border-amber-800', severe: 'border-orange-800', critical: 'border-red-800' };

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: TRADE ═══                   */
  /* ═══════════════════════════════════════ */
  if (tradeMode) {
    const outP = tradeOffer.players;
    const outK = tradeOffer.picks;
    const inP = tradeTarget.players;
    const inK = tradeTarget.picks;
    const hasOut = outP.length > 0 || outK.length > 0;
    const hasIn = inP.length > 0 || inK.length > 0;

    let salaryValid = null;
    if (outP.length > 0 || inP.length > 0) {
      salaryValid = validateTrade(outP.map(p => p.salary), inP.map(p => p.salary));
    }
    let stepienValid = { valid: true };
      if (outK.filter(p => p.round === 1).length > 0 || inK.filter(p => p.round === 1).length > 0) {
      stepienValid = validateStepienRule(draftPicks, outK, inK);
    }

    let hardCapValid = { valid: true };
    if (hardCapped && (outP.length > 0 || inP.length > 0)) {
      const outSal = outP.reduce((s, p) => s + p.salary, 0);
      const inSal = inP.reduce((s, p) => s + p.salary, 0);
      hardCapValid = validateHardCap(totalCapHit - outSal + inSal, true);
    }
    const pickBalanceValid = inK.length > 0 ? validatePickBalance(outK, inK) : { valid: true };
    const tradeAllowed = hasOut && hasIn && (!salaryValid || salaryValid.allowed) && stepienValid.valid && hardCapValid.valid && pickBalanceValid.valid;

    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} /><ConfettiOverlay active={showConfetti} />
        <div className={'w-full max-w-6xl space-y-4 ' + (screenShake ? 'animate-shake' : '')}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black font-mono text-cyan-400">⚖️ TRADE MACHINE</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-stone-400">残り: {TRADE_LIMIT - tradesUsedThisSeason}/{TRADE_LIMIT}回</span>
              <button onClick={() => { playClickSound(); setTradeMode(false); }} className="text-stone-400 hover:text-white font-mono text-sm">← 戻る</button>
            </div>
          </div>

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs font-mono text-stone-400 space-y-0.5">
            <p>• <HoverTip text="給与マッチング：トレードでは送出側と獲得側の給与差を一定範囲内に制限。獲得額は送出額の75%〜125%+$100K。"><span className="text-stone-300 cursor-help">給与マッチング</span></HoverTip>: 獲得額は送出額の75%〜125%+$100K（両側に選手がいる場合のみ）</p>
            <p>• <HoverTip text="ステピアンルール：連続する2年の1巡目ドラフトピックの同時放出を禁止。"><span className="text-stone-300 cursor-help">ステピアンルール</span></HoverTip>: 連続する2年の1巡目ピックを同時に放出不可</p>
            <p>• <HoverTip text="ピック価値：1巡目は高価値（来年75/2年後55/3年後40）、2巡目は低価値（来年20/2年後15/3年後10）。獲得ピックの合計価値が送出の2倍+25を超えるとAIが拒否。"><span className="text-stone-300 cursor-help">ピック価値バランス</span></HoverTip>: 獲得ピック合計値が送出の2倍+25を超えると拒否</p>
            {hardCapped && <p className="text-red-400">• 🔒 <HoverTip text="ハードキャップ：MLEやサイン＆トレード使用で発動。第1エプロン（$178.1M）を超える如何なる手段でも補強不可。"><span className="text-red-300 cursor-help">ハードキャップ中</span></HoverTip>: トレード後のCap Hitが第1エプロン ${(DYN_APRON1 / 1000000).toFixed(1)}Mを超えてはならない</p>}
            <p>• ピックのみのトレード（選手を含まない）は給与マッチング不要</p>
            <p>• シーズンあたり最大{TRADE_LIMIT}回まで</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 送出 */}
            <div className="bg-[#141210] border border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-mono font-black text-red-400 mb-2">📤 送出資産</h3>
              {!hasOut ? <p className="text-stone-500 text-sm">← 下から選択</p> : (
                <div className="space-y-1">
                  {outP.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm bg-stone-950 rounded p-2">
                      <span className="text-white truncate">{p.name} <span className="text-stone-500">{p.position}</span></span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-stone-400 font-mono">${(p.salary / 1000000).toFixed(1)}M</span>
                        <button onClick={() => handleRemoveFromTradeOut(p)} className="text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                  {outK.map(pk => (
                    <div key={pk.id} className="flex justify-between items-center text-sm bg-stone-950 rounded p-2">
                      <span className="text-cyan-400 font-mono">Y{pk.year} R{pk.round} <span className="text-stone-500">{pk.from || '自チーム'}</span> <span className="text-stone-600">[{getPickValue(pk)}]</span></span>
                      <button onClick={() => handleRemoveFromTradeOutPick(pk)} className="text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  {outP.length > 0 && <div className="text-xs font-mono text-stone-400 mt-1 pt-1 border-t border-stone-800">給与: ${(outP.reduce((s, p) => s + p.salary, 0) / 1000000).toFixed(1)}M</div>}
                </div>
              )}
            </div>

            {/* 獲得 */}
            <div className="bg-[#141210] border border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-mono font-black text-emerald-400 mb-2">📥 獲得資産</h3>
              {!hasIn ? <p className="text-stone-500 text-sm">← 市場から選択</p> : (
                <div className="space-y-1">
                  {inP.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm bg-stone-950 rounded p-2">
                      <span className="text-white truncate">{p.name} <span className="text-stone-500">{p.position}</span> <span className="text-amber-400">R{p.rating}</span></span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-stone-400 font-mono">${(p.salary / 1000000).toFixed(1)}M</span>
                        <button onClick={() => handleRemoveFromTradeIn(p)} className="text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                  {inK.map(pk => (
                    <div key={pk.id} className="flex justify-between items-center text-sm bg-stone-950 rounded p-2">
                      <span className="text-cyan-400 font-mono">Y{pk.year} R{pk.round} <span className="text-stone-500">({pk.from})</span> <span className="text-stone-600">[{getPickValue(pk)}]</span></span>
                      <button onClick={() => handleRemoveFromTradeInPick(pk)} className="text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  {inP.length > 0 && <div className="text-xs font-mono text-stone-400 mt-1 pt-1 border-t border-stone-800">給与: ${(inP.reduce((s, p) => s + p.salary, 0) / 1000000).toFixed(1)}M</div>}
                </div>
              )}
            </div>

            {/* 判定 */}
            <div className="bg-[#141210] border border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-mono font-black text-amber-400 mb-2">📋 判定</h3>
              {hasOut && hasIn ? (
                <div className="space-y-2 text-sm">
                  {salaryValid && (
                    <div>
                      <div className="text-stone-500 text-xs font-mono mb-0.5"><HoverTip text="給与マッチング：獲得額は送出額の75%〜125%+$100K。"><span className="cursor-help">給与マッチング</span></HoverTip></div>
                      <div className="text-xs text-stone-400">送出: ${(salaryValid.outgoing / 1000000).toFixed(1)}M → 範囲: ${(salaryValid.minIncoming / 1000000).toFixed(1)}M〜${(salaryValid.maxIncoming / 1000000).toFixed(1)}M</div>
                      <div className="text-xs text-stone-400">獲得: ${(salaryValid.incoming / 1000000).toFixed(1)}M</div>
                      <div className={salaryValid.allowed ? 'text-emerald-400 font-black text-xs' : 'text-red-400 font-black text-xs'}>
                        {salaryValid.allowed ? '✓ 範囲内' : `✗ ${salaryValid.reason}`}
                      </div>
                    </div>
                  )}
                  {(outK.filter(p => p.round === 1).length > 0 || inK.filter(p => p.round === 1).length > 0) && (
                    <div>
                      <div className="text-stone-500 text-xs font-mono mb-0.5"><HoverTip text="ステピアンルール：連続する2年の1巡目ドラフトピックの同時放出を禁止。"><span className="cursor-help">ステピアンルール</span></HoverTip></div>
                      <div className={stepienValid.valid ? 'text-emerald-400 font-black text-xs' : 'text-red-400 font-black text-xs'}>
                        {stepienValid.valid ? '✓ 適合' : `✗ ${stepienValid.reason}`}
                      </div>
                    </div>
                  )}
                  {(outK.length > 0 || inK.length > 0) && (() => {
                    const outVal = outK.reduce((s, p) => s + getPickValue(p), 0);
                    const inVal = inK.reduce((s, p) => s + getPickValue(p), 0);
                    const pv = validatePickBalance(outK, inK);
                    return (
                      <div>
                        <div className="text-stone-500 text-xs font-mono mb-0.5"><HoverTip text="ピック価値：1巡目は高価値（来年75/2年後55/3年後40）、2巡目は低価値（来年20/2年後15/3年後10）。獲得ピックの合計価値が送出の2倍+25を超えるとAIが拒否。"><span className="cursor-help">ピック価値バランス</span></HoverTip></div>
                        <div className="text-xs text-stone-400">
                          送出: <span className="text-red-400 font-mono">{outVal}</span>pt → 獲得: <span className="text-cyan-400 font-mono">{inVal}</span>pt
                          <span className="text-stone-600 ml-1">(上限{outVal * 2 + 25})</span>
                        </div>
                        <div className={pv.valid ? 'text-emerald-400 font-black text-xs' : 'text-red-400 font-black text-xs'}>
                          {pv.valid ? '✓ バランスOK' : `✗ ${pv.reason}`}
                        </div>
                      </div>
                    );
                  })()}
                  {hardCapped && (
                    <div>
                      <div className="text-stone-500 text-xs font-mono mb-0.5"><HoverTip text="ハードキャップ：第1エプロン（$178.1M）を超える如何なる手段でも補強不可。"><span className="cursor-help">ハードキャップ</span></HoverTip></div>
                      <div className={hardCapValid.valid ? 'text-emerald-400 font-black text-xs' : 'text-red-400 font-black text-xs'}>
                        {hardCapValid.valid ? '✓ 第1エプロン内' : `✗ ${hardCapValid.reason}`}
                      </div>
                    </div>
                  )}
                  <div className={'text-lg font-black font-mono pt-1 ' + (tradeAllowed ? 'text-emerald-400' : 'text-red-400')}>
                    {tradeAllowed ? '✓ トレード成立' : '✗ トレード不可'}
                  </div>
                  <button onClick={handleExecuteTrade} disabled={!tradeAllowed}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-mono font-black py-2.5 rounded-lg text-sm transition-all">
                    トレード実行
                  </button>
                </div>
              ) : <p className="text-stone-500 text-sm">送出と獲得を選択してください</p>}
            </div>
          </div>

          {/* あなたの資産 / 市場 */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-3">
              <div className="bg-[#141210] border border-stone-800 rounded-xl p-4 max-h-52 overflow-y-auto">
                <h3 className="text-xs font-mono font-black text-stone-400 mb-2">YOUR ROSTER（クリックで送出に追加）</h3>
                {roster.map(p => (
                  <button key={p.id} onClick={() => handleAddToTradeOut(p)}
                    className={'w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between ' +
                      (outP.find(op => op.id === p.id) ? 'bg-red-950/50 border border-red-800' : '')}>
                    <span className="text-white">{p.name} <span className="text-stone-500">{p.position}</span> <span className="text-amber-400">R{p.rating}</span></span>
                    <span className="text-stone-400 font-mono">${(p.salary / 1000000).toFixed(1)}M</span>
                  </button>
                ))}
              </div>
              <div className="bg-[#141210] border border-stone-800 rounded-xl p-4 max-h-36 overflow-y-auto">
                <h3 className="text-xs font-mono font-black text-stone-400 mb-2">YOUR PICKS（クリックで送出に追加）</h3>
                {draftPicks.length === 0 ? <p className="text-stone-600 text-xs">ピックなし</p> : draftPicks.map(pk => (
                  <button key={pk.id} onClick={() => handleAddToTradeOutPick(pk)}
                    className={'w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between ' +
                      (outK.find(op => op.id === pk.id) ? 'bg-red-950/50 border border-red-800' : '')}>
                    <span className="text-cyan-400 font-mono">Y{pk.year} R{pk.round} <span className="text-stone-600">[{getPickValue(pk)}]</span></span>
                    <span className="text-stone-500 text-xs">{pk.from || '自チーム'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="bg-[#141210] border border-stone-800 rounded-xl p-4 max-h-52 overflow-y-auto">
                <h3 className="text-xs font-mono font-black text-stone-400 mb-2">MARKET PLAYERS（クリックで獲得に追加）</h3>
                {tradeMarket.players.map(p => (
                  <button key={p.id} onClick={() => handleAddToTradeIn(p)}
                    className={'w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between ' +
                      (inP.find(tp => tp.id === p.id) ? 'bg-cyan-950 border border-cyan-700' : '')}>
                    <span className="text-white">{p.name} <span className="text-stone-500">{p.position}</span> <span className="text-amber-400">R{p.rating}</span></span>
                    <span className="text-stone-400 font-mono">${(p.salary / 1000000).toFixed(1)}M · {p.contractYears}yr</span>
                  </button>
                ))}
              </div>
              <div className="bg-[#141210] border border-stone-800 rounded-xl p-4 max-h-36 overflow-y-auto">
                <h3 className="text-xs font-mono font-black text-stone-400 mb-2">MARKET PICKS（クリックで獲得に追加）</h3>
                {tradeMarket.picks.length === 0 ? <p className="text-stone-600 text-xs">ピックなし</p> : tradeMarket.picks.map(pk => (
                  <button key={pk.id} onClick={() => handleAddToTradeInPick(pk)}
                    className={'w-full text-left text-sm py-1 px-2 rounded hover:bg-stone-900/50 flex justify-between ' +
                      (inK.find(tp => tp.id === pk.id) ? 'bg-cyan-950 border border-cyan-700' : '')}>
                    <span className="text-cyan-400 font-mono">Y{pk.year} R{pk.round} <span className="text-stone-600">[{getPickValue(pk)}]</span></span>
                    <span className="text-stone-500 text-xs">{pk.from}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: REROLL ═══                  */
  /* ═══════════════════════════════════════ */
  if (phase === 'reroll') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} /><ConfettiOverlay active={showConfetti} />
        <div className="w-full max-w-5xl space-y-4">
          <div className="text-center space-y-2 mb-4">
            <span className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">👑 DYNASTY MODE</span>
            <h2 className="text-3xl font-black text-white">あなたの王朝を築け</h2>
            <p className="text-sm text-stone-400">満足のいくロスターが組めたら「START」を押してください</p>
          </div>
          <div className="space-y-3">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-sm text-stone-400 flex gap-6">
              <span>Total Rating: <span className="text-white font-black text-lg">{totalOvr}</span></span>
              <span>Cap Hit: <span className={totalCapHit <= DYN_CAP ? 'text-emerald-400 font-black text-lg' : 'text-red-400 font-black text-lg'}>${(totalCapHit / 1000000).toFixed(1)}M <span className="text-stone-500 font-sans">/ ${(DYN_CAP / 1000000).toFixed(0)}M</span></span></span>
              <span>Players: <span className="text-white font-black">{roster.length}</span></span>
            </div>
            <SalaryMeter totalSalary={totalCapHit} capLevel={DYN_CAP} taxLevel={DYN_TAX} firstApron={DYN_APRON1} secondApron={DYN_APRON2} />
          </div>
          <div className="flex gap-3 justify-center mb-4">
            <button onClick={doReroll} className="bg-stone-900 border border-stone-800 text-stone-300 font-mono font-black px-6 py-2.5 rounded-xl text-sm hover:bg-stone-850 transition-all">🔄 REROLL</button>
            <button onClick={() => { playClickSound(); setPhase('manage'); }} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black px-8 py-2.5 rounded-xl text-sm transition-all">START DYNASTY 💪</button>
            <button onClick={() => { playClickSound(); onBack(); }} className="bg-stone-900 border border-stone-800 text-stone-500 font-mono font-black px-4 py-2.5 rounded-xl text-sm hover:text-stone-300 transition-all">← 戻る</button>
          </div>
          <RosterTable title="YOUR ROSTER" players={roster} onActionClick={() => {}} actionLabel="—" totalSalary={totalCapHit} dynastyMode />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: MANAGE ═══                  */
  /* ═══════════════════════════════════════ */
  if (phase === 'manage') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <style>{`
          @keyframes dyToastIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes dyToastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
          @keyframes dyConfettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
          .animate-shake { animation: dyShake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
          @keyframes dyShake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); } 20%, 40%, 60%, 80% { transform: translateX(4px); } }
        `}</style>
        <ToastContainer toasts={toasts} /><ConfettiOverlay active={showConfetti} />
        {showBonusPanel && <BonusPanel onClose={() => setShowBonusPanel(false)} effectiveOvr={effectiveOvr} totalOvr={totalOvr} totalCapHit={totalCapHit} effectiveRoster={effectiveRoster} season={season} faSignedThisSeason={faSignedThisSeason} injuredList={injuredList} hardCapped={hardCapped} />}
        <SignModal />
        <div className={'w-full flex flex-col flex-1 justify-start ' + (screenShake ? 'animate-shake' : '')}>
          <Header />
          <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 flex-1 items-stretch">
            <div className="w-full lg:w-[42%] space-y-4 flex flex-col justify-between">
              <section className="bg-[#141210] border border-stone-800 rounded-xl shadow-xl p-5 space-y-3">
                <span className="text-sm font-mono font-black text-cyan-400 uppercase tracking-wider">TEAM STATUS</span>
                <div className="space-y-2">

                  {/* 生存ライン警告 */}
                  {survivalMargin <= 0 && (
                    <div className="bg-red-950/50 px-4 py-3 rounded-xl border-2 border-red-600 animate-pulse">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-red-400 font-sans font-black text-sm">🚨 崩壊危機: 来シーズン生存不可</span>
                      </div>
                      <div className="text-xs text-red-300 font-mono space-y-0.5">
                        <p>来シーズンの必要Rating: <span className="text-red-400 font-black">{nextSeasonMinOvr}</span></p>
                        <p>現在の実効Rating: <span className="text-white font-black">{effectiveOvr}</span></p>
                        <p className="text-red-400 font-black">不足: {Math.abs(survivalMargin)}ポイント</p>
                        <p className="text-red-300 mt-1">⚡ FA、トレードで Rating {Math.abs(survivalMargin)} 以上を補強してください</p>
                      </div>
                    </div>
                  )}
                  {survivalMargin > 0 && survivalMargin <= 20 && (
                    <div className="bg-amber-950/40 px-4 py-3 rounded-xl border border-amber-600">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-amber-400 font-sans font-black text-sm">⚠️ 生存ライン接近</span>
                        <span className={survivalMargin <= 10 ? 'text-red-400 font-mono font-black text-sm' : 'text-amber-400 font-mono font-black text-sm'}>
                          余裕: +{survivalMargin}
                        </span>
                      </div>
                      <div className="text-xs text-amber-300 font-mono space-y-0.5">
                        <p>来シーズン必要: <span className="text-amber-400 font-black">{nextSeasonMinOvr}</span> | 現在: <span className="text-white font-black">{effectiveOvr}</span></p>
                        {survivalMargin <= 10 && <p className="text-red-400">⚡ あと少しで崩壊。補強を検討してください</p>}
                      </div>
                    </div>
                  )}

                  {/* Cap Hit */}
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <HoverTip text="キャップヒット：チームの年俸総額。サラリーキャップ（$136M）以内が基本。超過するとFA契約制限やトレード条件が厳しくなる。">
                      <span className="text-stone-400 font-sans font-black text-sm">📊 Cap Hit:</span>
                    </HoverTip>
                    <span className={totalCapHit <= DYN_CAP ? 'text-emerald-400 font-black text-3xl' : totalCapHit <= DYN_TAX ? 'text-amber-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>
                      ${(totalCapHit / 1000000).toFixed(1)}M <span className="text-lg text-stone-500 font-sans">/ ${(DYN_CAP / 1000000).toFixed(0)}M</span>
                    </span>
                  </div>

                  {/* ハードキャップ */}
                  {hardCapped && (
                    <div className="bg-red-950/30 px-4 py-2 rounded-xl border border-red-900/50 flex justify-between items-center">
                      <HoverTip text="ハードキャップ：MLE使用やサイン＆トレードで発動。第1エプロン（$178.1M）を超える如何なる手段でも補強が不可能に。翌シーズンで解除。">
                        <span className="text-red-400 font-sans font-black text-sm">🔒 ハードキャップ:</span>
                      </HoverTip>
                      <span className="text-red-400 font-black text-sm">第1エプロン ${(DYN_APRON1 / 1000000).toFixed(1)}M拘束中</span>
                    </div>
                  )}

                  {/* オーナー要請 */}
                  {currentMandate && (
                    <div className="bg-amber-950/20 px-4 py-2.5 rounded-xl border border-amber-800/50">
                      <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider mb-1">📋 オーナー要請</div>
                      <div className="text-white font-bold text-sm">{currentMandate.name}</div>
                      <div className="text-stone-400 text-xs mt-0.5">{currentMandate.desc}</div>
                      <div className="flex gap-3 mt-1 text-xs font-mono">
                        <span className="text-emerald-400">達成: +{currentMandate.successBonus}</span>
                        {currentMandate.failPenalty !== 0 && <span className="text-red-400">失敗: {currentMandate.failPenalty}</span>}
                      </div>
                    </div>
                  )}

                  {/* ポジション不足 */}
                  {balance.penaltyPct > 0 && (
                    <div className="bg-red-950/30 px-4 py-2 rounded-xl border border-red-900/50">
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 font-sans font-black text-sm">⚠️ ポジション不足:</span>
                        <span className="text-red-400 font-black text-sm">-{balance.penaltyPct}% Rating</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {['PG', 'SG', 'SF', 'PF', 'C'].map(pos => (
                          <span key={pos} className={'text-xs font-mono px-1.5 py-0.5 rounded ' + (balance.filled[pos] > 0 ? 'bg-stone-900 text-stone-400' : 'bg-red-950 text-red-400')}>
                            {pos}: {balance.filled[pos]}人
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FA残り枠 */}
                  <div className="bg-stone-950 px-4 py-2 rounded-xl border border-stone-850 flex justify-between items-center">
                    <HoverTip text="FA契約制限：キャップ以内で最大2人/年。第1エプロン超過で最大1人/年（3年まで）。第2エプロン超過でFA契約禁止（ドラフトとトレードのみ）。">
                      <span className="text-stone-400 font-sans font-black text-sm">✍️ FA残り枠:</span>
                    </HoverTip>
                    <span className={faSignedThisSeason >= faLimit ? 'text-red-400 font-black text-lg' : 'text-emerald-400 font-black text-lg'}>{faLimit - faSignedThisSeason} / {faLimit}人</span>
                  </div>

                  {/* トレード残り */}
                  <div className="bg-stone-950 px-4 py-2 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">⚖️ トレード残り:</span>
                    <span className={tradesUsedThisSeason >= TRADE_LIMIT ? 'text-red-400 font-black text-lg' : 'text-cyan-400 font-black text-lg'}>
                      {TRADE_LIMIT - tradesUsedThisSeason} / {TRADE_LIMIT}回
                    </span>
                  </div>

                  {/* MLE */}
                  {mleAmount > 0 && (
                    <div className="bg-stone-950 px-4 py-2 rounded-xl border border-cyan-900/50 flex justify-between items-center">
                      <HoverTip text="Mid-Level Exception：キャップ超過チームにも使える例外枠。キャップ以下≈$12.4M、1st Apron超え≈$5M、2nd Apron超えで没収。使用で第1エプロンハードキャップ。毎シーズン1回。">
                        <span className="text-cyan-400 font-sans font-black text-sm">📋 MLE残額:</span>
                      </HoverTip>
                      <span className={mleUsed ? 'text-stone-500 font-black text-lg' : 'text-cyan-400 font-black text-lg'}>{mleUsed ? '使用済み' : `$${(mleAmount / 1000000).toFixed(1)}M`}</span>
                    </div>
                  )}

                  {/* Repeater */}
                  {repeaterSeasons >= 2 && (
                    <div className="bg-red-950/30 px-4 py-2 rounded-xl border border-red-900/50 flex justify-between items-center">
                      <HoverTip text="リピータータックス：過去3シーズン中2回以上タックス超過したチームに適用される追加罰金。">
                        <span className="text-red-400 font-sans font-black text-sm">⚠️ Repeater:</span>
                      </HoverTip>
                      <span className="text-red-400 font-black text-sm">{repeaterSeasons}/3 seasons</span>
                    </div>
                  )}
                  {repeaterTax > 0 && (
                    <div className="bg-red-950/30 px-4 py-2 rounded-xl border border-red-900/50 flex justify-between items-center">
                      <HoverTip text="ラグジュアリータックス：タックスライン（$165M）を超えた額に課される罰金。">
                        <span className="text-red-400 font-sans font-black text-sm">💸 Tax:</span>
                      </HoverTip>
                      <span className="text-red-400 font-black text-lg">${(repeaterTax / 1000000).toFixed(1)}M</span>
                    </div>
                  )}

                  {/* Dead Cap */}
                  {deadCap > 0 && (
                    <div className="bg-stone-950 px-4 py-2 rounded-xl border border-red-900/50">
                      <div className="flex justify-between items-center">
                        <HoverTip text="デッドキャップ：放出した選手の残り契約がキャップに残る金額。ウェイブ100%、バイアウト50〜70%、ストレッチで長期分割。">
                          <span className="text-red-400 font-sans font-black text-sm">💀 Dead Cap:</span>
                        </HoverTip>
                        <span className="text-red-400 font-black text-xl">${(deadCap / 1000000).toFixed(1)}M</span>
                      </div>
                      {deadCapDetails.map((d, i) => <div key={i} className="text-xs text-stone-500 mt-1 font-mono">{d.name}: ${(d.amount / 1000000).toFixed(1)}M × {d.yearsLeft}yr [{d.type}]</div>)}
                    </div>
                  )}

                  {/* Injured List */}
                  {injuredList.length > 0 && (
                    <div className="px-4 py-2 rounded-xl border bg-orange-950/20 border-orange-900/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-orange-400 font-sans font-black text-sm">🏥 Injured List:</span>
                        <span className="text-orange-400 font-black text-sm">{injuredList.length}人</span>
                      </div>
                      {injuredList.map((inj, i) => (
                        <div key={i} className={'flex justify-between items-center text-xs py-1 px-2 rounded mt-0.5 ' + sevBg[inj.severity] + ' ' + sevBorder[inj.severity] + ' border'}>
                          <span className="text-stone-300">{inj.playerName}</span>
                          <div className="flex items-center gap-2">
                            <span className={sevColor[inj.severity]}>{inj.name}</span>
                            <span className="text-stone-500 font-mono">-{inj.ratingLoss}</span>
                            <span className="text-stone-400 font-mono">{inj.seasonsLeft}yr</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Rating */}
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">🔥 Total Rating:</span>
                    <span className={effectiveOvr >= minOvr ? 'text-emerald-400 font-black text-3xl' : 'text-red-400 font-black text-3xl'}>
                      {effectiveOvr}
                      {balance.penaltyPct > 0 && <span className="text-sm text-stone-500 font-sans ml-2">(Raw: {rawEffectiveOvr})</span>}
                      {injuredList.length > 0 && effectiveOvr !== totalOvr && <span className="text-sm text-stone-500 font-sans ml-2">(フル: {totalOvr})</span>}
                      <span className="text-lg text-stone-500 font-sans"> / {minOvr}+</span>
                    </span>
                  </div>

                  {/* Players */}
                  <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-850 flex justify-between items-center">
                    <span className="text-stone-400 font-sans font-black text-sm">👥 Players:</span>
                    <span className="text-white font-black text-2xl">{roster.length}</span>
                  </div>

                  {/* Draft Picks */}
                  <div className="bg-stone-950 px-4 py-2 rounded-xl border border-stone-850">
                    <HoverTip text="ドラフトピック：新人選手を指名する権利。Y=年、R=巡目。トレードで獲得・放出可能。ステピアンルール: 連続する2年の1巡目ピックの同時放出は禁止。">
                      <span className="text-stone-400 font-sans font-black text-sm">🏀 Draft Picks:</span>
                    </HoverTip>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {draftPicks.length === 0 ? <span className="text-stone-500 text-xs font-mono">なし</span> : draftPicks.map((pk, i) => (
                        <HoverTip key={i} text={`ドラフトピック: ${pk.year}年目の${pk.round}巡目${pk.from ? `（${pk.from}から獲得）` : '（自チーム）'} | 価値: ${getPickValue(pk)}pt`}>
                          <span className="text-xs font-mono bg-stone-900 px-1.5 py-0.5 rounded text-cyan-400 cursor-help">Y{pk.year} R{pk.round}{pk.from ? ` (${pk.from})` : ''} [{getPickValue(pk)}]</span>
                        </HoverTip>
                      ))}
                    </div>
                  </div>
                </div>
                <SalaryMeter totalSalary={totalCapHit} capLevel={DYN_CAP} taxLevel={DYN_TAX} firstApron={DYN_APRON1} secondApron={DYN_APRON2} />
                <div className="flex flex-col gap-2">
                  <button onClick={handleNextSeason} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-3 rounded-xl text-sm tracking-widest transition-all">NEXT SEASON ➡️</button>
                  <button onClick={handleOpenTrade} disabled={tradesUsedThisSeason >= TRADE_LIMIT}
                    className={"w-full font-mono font-black py-3 rounded-xl text-sm tracking-widest transition-all " +
                      (tradesUsedThisSeason >= TRADE_LIMIT
                        ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white')}>
                    ⚖️ TRADE MACHINE {tradesUsedThisSeason >= TRADE_LIMIT ? '(上限)' : `(${TRADE_LIMIT - tradesUsedThisSeason}回)`}
                  </button>
                </div>
              </section>
            </div>
            <div className="w-full lg:w-[58%] space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <RosterTable title="ROSTER" players={roster} totalSalary={totalCapHit} dynastyMode onWaiver={handleWaiver} onBuyout={handleBuyout} onStretch={handleStretch} />
                <RosterTable title="FREE AGENT" players={freeAgents} onActionClick={faSignedThisSeason < faLimit ? handleSignRequest : undefined} actionLabel={faSignedThisSeason >= faLimit ? '枠なし' : '契約'} />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: SEASON END ═══              */
  /* ═══════════════════════════════════════ */
  if (phase === 'seasonEnd') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} /><ConfettiOverlay active={showConfetti} />
        <div className="w-full max-w-2xl space-y-6 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-3">
            <span className="text-xl font-mono font-black text-amber-400 uppercase tracking-widest">SEASON {season} COMPLETE</span>
            <h2 className="text-5xl font-black text-white">シーズン終了レポート</h2>
          </div>
          {seasonRecord && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 text-center space-y-2">
              <div className="text-2xl font-mono font-black text-white">{seasonRecord.wins}勝 {seasonRecord.losses}敗</div>
              <div className="text-lg text-stone-400 font-mono">勝率 {seasonRecord.winRate}%</div>
              <div className={'text-2xl font-black font-mono ' + (seasonRecord.gmBonus >= 300 ? 'text-amber-400' : seasonRecord.gmBonus > 0 ? 'text-cyan-400' : 'text-stone-500')}>{seasonRecord.result}</div>
              {seasonRecord.gmBonus > 0 && <div className="text-sm text-emerald-400 font-mono">GM SCORE +{seasonRecord.gmBonus}</div>}
            </div>
          )}
          {mandateResult && (
            <div className={'border rounded-xl p-6 text-center space-y-1 ' + (mandateResult.success ? 'bg-emerald-950/30 border-emerald-800' : 'bg-stone-950 border-stone-800')}>
              <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">📋 オーナー要請</div>
              <div className="text-lg font-bold text-white">{mandateResult.mandate.name}</div>
              <div className={'text-xl font-black font-mono ' + (mandateResult.success ? 'text-emerald-400' : mandateResult.bonus < 0 ? 'text-red-400' : 'text-stone-400')}>
                {mandateResult.success ? '✅ 達成！' : '❌ 未達成'}
              </div>
              {mandateResult.bonus !== 0 && (
                <div className={'text-sm font-mono ' + (mandateResult.bonus > 0 ? 'text-emerald-400' : 'text-red-400')}>
                  GM SCORE {mandateResult.bonus > 0 ? '+' : ''}{mandateResult.bonus}
                </div>
              )}
            </div>
          )}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
            <h3 className="text-xl font-mono font-black text-cyan-400 uppercase">選手の経年変化</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {summaries.map((s, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 px-3 rounded hover:bg-stone-900/50">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xl">{s.name}</span>
                    {s.injury && <span className={'text-xs font-mono px-1.5 py-0.5 rounded ' + (s.change === 'RETIRE' ? 'bg-red-950 text-red-400' : 'bg-orange-950 text-orange-400')}>🏥 {s.injury}</span>}
                  </div>
                  <span className="font-mono">
                    <span className="text-stone-400">{s.oldRating}</span>
                    <span className="text-stone-600 mx-1">→</span>
                    <span className={s.change === 'RETIRE' ? 'text-yellow-400 font-black' : s.change <= -5 ? 'text-red-400 font-black' : s.change <= -2 ? 'text-orange-400 font-black' : 'text-amber-400 font-black'}>{s.newRating === 0 ? 'RETIRE' : s.newRating}</span>
                    {s.change !== 'RETIRE' && <span className="text-red-500 ml-2 text-lg">({s.change})</span>}
                    {s.change === 'RETIRE' && <span className="text-yellow-400 ml-2 text-lg">🏆</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {expiredPlayers.length > 0 && (
            <div className="bg-stone-950 border border-amber-900/50 rounded-xl p-6 space-y-3">
              <h3 className="text-xl font-mono font-black text-amber-400 uppercase">契約切れ → FA移行</h3>
              {expiredPlayers.map((p, i) => (
                <div key={i} className="flex items-center text-xl py-1.5 px-3">
                  <span className="text-white font-bold">{p.name}</span>
                  <span className="text-stone-500 font-mono text-lg ml-2">{p.position} Rating {p.rating}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleToDraft} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">
            {optionPlayers.length > 0 ? 'OPTIONS → DRAFT' : 'DRAFT へ進む 🏀'}
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: OPTION DECISION ═══         */
  /* ═══════════════════════════════════════ */
  if (phase === 'optionDecision') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} />
        <div className="w-full max-w-2xl space-y-4 bg-[#110f0e] border border-stone-800 rounded-3xl p-10">
          <div className="text-center space-y-2">
            <span className="text-xl font-mono font-black text-purple-400 uppercase tracking-widest">📋 CONTRACT OPTIONS</span>
            <h2 className="text-4xl font-black text-white">契約オプションの決定</h2>
          </div>
          <div className="space-y-3">
            {optionPlayers.map((p, i) => (
              <div key={i} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold text-lg">{p.name}</span>
                  <div className="flex items-center gap-3 mt-1 text-base">
                    <span className="text-stone-500 font-mono">{p.position}</span>
                    <span className="text-amber-400 font-mono font-black">Rating {p.rating}</span>
                    <span className="text-stone-500">${(p.salary / 1000000).toFixed(1)}M</span>
                    <span className="text-purple-400 font-mono text-sm">{p.optionType === 'player' ? 'Player Option' : 'Team Option'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOptionDecision(p, true)} className="bg-emerald-950 border border-emerald-700 text-emerald-400 hover:bg-emerald-900 font-mono font-black px-4 py-2 rounded-lg text-sm transition-all">行使</button>
                  <button onClick={() => handleOptionDecision(p, false)} className="bg-red-950 border border-red-700 text-red-400 hover:bg-red-900 font-mono font-black px-4 py-2 rounded-lg text-sm transition-all">拒否</button>
                </div>
              </div>
            ))}
          </div>
          {optionPlayers.length === 0 && <button onClick={startDraft} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">DRAFT へ進む 🏀</button>}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: DRAFT ═══                   */
  /* ═══════════════════════════════════════ */
  if (phase === 'draft') {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-white px-6 py-4 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black justify-center items-center">
        <ToastContainer toasts={toasts} /><ConfettiOverlay active={showConfetti} />
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
                      <span className="text-stone-500 font-mono">{p.position}</span>
                      <span className="text-amber-400 font-mono font-black">Rating {p.rating}</span>
                      {p.pot > p.rating && <span className="text-emerald-400 font-mono text-sm">Pot {p.pot}</span>}
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
              <div className="text-xl text-stone-400">ロスター: {roster.length}人 / Total Rating: {effectiveOvr}</div>
              <button onClick={handleDraftComplete} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-mono font-black py-4 rounded-xl text-xl tracking-widest transition-all">新シーズン開始 🏀</button>
            </div>
          )}
          {picksLeft > 0 && <button onClick={handleDraftComplete} className="w-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white font-mono font-black py-3 rounded-xl text-lg transition-all">ドラフトをスキップ</button>}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════ */
  /* ═══ RENDER: GAME OVER ═══               */
  /* ═══════════════════════════════════════ */
  if (phase === 'gameOver') {
    const score = gmScoreCalc() + calcSeasonBonus(effectiveRoster, season);
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
            <div className="text-4xl font-black text-yellow-400 font-mono">
              <AnimatedScore target={score} playClickSound={() => { try { playTone(800, 0.02, 'square', 0.03); } catch(e){} }} animate={true} />
              <span className="text-lg text-stone-500 ml-1">pts</span>
            </div>
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
