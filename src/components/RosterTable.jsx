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
    <button onClick={() => onActionClick(player)} className="text-xs bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 px-2 py-0.5 rounded transition-colors font-mono">{actionLabel}</button>
  )}
</td>
