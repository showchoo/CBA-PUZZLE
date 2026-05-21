export class CBACoreEngine {

  // ═══════════════════════════════════════════════
  // 定数
  // ═══════════════════════════════════════════════
  static CAP_LIMIT  = 136000000;
  static TAX_LIMIT  = 165000000;
  static APRON_1    = 172000000;
  static APRON_2    = 182500000;
  static MLE_FULL   = 12400000;
  static MLE_MINI   = 5000000;
  static SMAX_RATE  = 0.35; // キャップの35%

  // ═══════════════════════════════════════════════
  // メイン評価関数（既存互換 + 拡張）
  // ═══════════════════════════════════════════════
  static evaluate(roster, outgoingPlayer = null, incomingPlayer = null, options = {}) {
    const {
      deadCap = [],         // [{salary, yearsRemaining}] デッドキャップ配列
      features = {},        // ステージのfeaturesオブジェクト
      draftPicks = 0,       // 現在のドラフトピック数
      taxHistory = [],      // [true, false, ...] 過去のTax超過履歴
      mleUsedThisSeason = false,
      birdRightsOverride = null, // Bird Rights による再契約用
    } = options;

    let totalCapHit = 0;
    let actualPayroll = 0;
    let totalOvr = 0;
    let regularContractCount = 0;
    let twoWayCount = 0;
    let hasStar = false;
    const violations = [];

    // ─── 1. ロスター全体の解析 ───
    roster.forEach(player => {
      if (player.rating >= 90) hasStar = true;

      if (player.contractType === "twoway") {
        twoWayCount++;
        totalCapHit += 0;
        actualPayroll += 500000;
      } else {
        regularContractCount++;

        // ベテランミニマム割引
        if (player.contractType === "minimum" && player.experience >= 10) {
          totalCapHit += 2010000;
          actualPayroll += player.salary;
        } else {
          totalCapHit += player.salary;
          actualPayroll += player.salary;
        }

        totalOvr += player.rating;
      }
    });

    // ─── 2. デッドキャップ加算 ───
    let deadCapHit = 0;
    if (features.deadCap && deadCap.length > 0) {
      deadCap.forEach(dc => {
        totalCapHit += dc.salary;
        actualPayroll += dc.salary;
        deadCapHit += dc.salary;
      });
    }

    // ─── 3. 14人縛りチェック ───
    if (regularContractCount < (features.minPlayers || 14)) {
      violations.push({
        id: "ROSTER_MINIMUM_VIO",
        label: "🚨 リーグ規約違反 // 通常契約14人未満",
        text: `通常契約の選手が現在${regularContractCount}人です。CBA規約により最低${features.minPlayers || 14}人の通常契約が必要です（育成枠の2ウェイ選手は戦力換算されません）。`
      });
    } else {
      roster.forEach(player => {
        if (player.contractType === "twoway") {
          totalOvr += player.rating;
        }
      });
    }

    // ─── 4. キャップステータス判定 ───
    let status = "UNDER_CAP";
    if (totalCapHit > CBACoreEngine.CAP_LIMIT) status = "OVER_CAP";
    if (totalCapHit > CBACoreEngine.TAX_LIMIT) status = "LUXURY_TAX";
    if (totalCapHit > CBACoreEngine.APRON_1)   status = "FIRST_APRON";
    if (totalCapHit > CBACoreEngine.APRON_2)   status = "SECOND_APRON";

    // ─── 5. エプロンステータス ───
    let apronStatus = "UNDER";
    if (totalCapHit > CBACoreEngine.APRON_1) apronStatus = "FIRST";
    if (totalCapHit > CBACoreEngine.APRON_2) apronStatus = "SECOND";

    // ─── 6. MLE残額計算 ───
    let mleRemaining = 0;
    if (features.mle && !mleUsedThisSeason) {
      if (apronStatus === "SECOND") {
        mleRemaining = 0; // 2nd Apron超えでMLE没収
      } else if (apronStatus === "FIRST") {
        mleRemaining = CBACoreEngine.MLE_MINI; // ミニMLE
      } else {
        mleRemaining = CBACoreEngine.MLE_FULL; // フルMLE
      }
    }

    // ─── 7. リピータータックス判定 ───
    let repeaterTaxActive = false;
    if (taxHistory.length >= 2) {
      const recentTaxCount = taxHistory.slice(-3).filter(Boolean).length;
      if (recentTaxCount >= 2 && status === "LUXURY_TAX") {
        repeaterTaxActive = true;
        violations.push({
          id: "REPEATER_TAX",
          label: "🔥 リピータータックス発動中",
          text: `過去3シーズン中に${recentTaxCount}回のTax超過。通常の税率に追加罰金が上乗せされます！`
        });
      }
    }

    // ─── 8. トレードチェック（既存 + 75%ルール追加）───
    let isTradeAllowed = true;
    let tradeErrorMessage = "";

    if (outgoingPlayer && incomingPlayer) {
      const outSalary = outgoingPlayer.salary;
      const inSalary = incomingPlayer.salary;

      if (status === "SECOND_APRON") {
        if (inSalary > outSalary) {
          isTradeAllowed = false;
          tradeErrorMessage = `【第2エプロン規制】貰う年俸（$${(inSalary/1e6).toFixed(1)}M）が出す年俸（$${(outSalary/1e6).toFixed(1)}M）を上回るトレードは完全禁止です。`;
        }
        if (incomingPlayer.faStatus === "RFA") {
          isTradeAllowed = false;
          tradeErrorMessage = "【第2エプロン規制】他チームのRFA選手へのオファーシート禁止。";
        }
      } else if (status === "FIRST_APRON" || status === "LUXURY_TAX") {
        if (inSalary > outSalary) {
          isTradeAllowed = false;
          tradeErrorMessage = `【第1エプロン規制】獲得する年俸（$${(inSalary/1e6).toFixed(1)}M）を出す年俸（$${(outSalary/1e6).toFixed(1)}M）以下に抑える必要があります。`;
        }
      } else {
        // 通常時: 75%〜125%ルール
        const maxIncoming = outSalary * 1.25 + 100000;
        const minIncoming = outSalary * 0.75;

        if (inSalary > maxIncoming) {
          isTradeAllowed = false;
          tradeErrorMessage = `【125%ルール違反】獲得年俸（$${(inSalary/1e6).toFixed(1)}M）が上限（$${(maxIncoming/1e6).toFixed(1)}M）を超えています。`;
        }
        if (inSalary < minIncoming) {
          isTradeAllowed = false;
          tradeErrorMessage = `【75%ルール違反】獲得年俸（$${(inSalary/1e6).toFixed(1)}M）が下限（$${(minIncoming/1e6).toFixed(1)}M）を下回っています。等価交換の原則に反します。`;
        }
      }

      // Bird Rights制限
      if (status !== "UNDER_CAP" && incomingPlayer.birdRights === "None"
          && incomingPlayer.contractType !== "minimum"
          && incomingPlayer.contractType !== "twoway") {
        isTradeAllowed = false;
        tradeErrorMessage = "【バード権なし】キャップ超過中は、バード権を持たない通常契約の選手をFA市場から獲得できません。";
      }
    }

    return {
      totalCapHit,
      actualPayroll,
      totalOvr,
      regularContractCount,
      twoWayCount,
      hasStar,
      status,
      violations,
      deadCapHit,
      draftPicks,
      apronStatus,
      mleRemaining,
      mleUsedThisSeason,
      repeaterTaxActive,
      tradeCheck: {
        allowed: isTradeAllowed,
        message: tradeErrorMessage
      }
    };
  }

  // ═══════════════════════════════════════════════
  // バイアウト成功率計算
  // ═══════════════════════════════════════════════
  // Ratingが低いほど同意しやすい
  static getBuyoutRate(rating) {
    if (rating <= 55) return 0.50; // 50%に軽減（最も有利）
    if (rating <= 65) return 0.55;
    if (rating <= 75) return 0.60;
    if (rating <= 85) return 0.65;
    return 0.70; // 70%（高Rating選手は不利）
  }

  static getBuyoutSuccessChance(rating) {
    if (rating <= 55) return 95;  // 95%の確率で交渉成功
    if (rating <= 65) return 80;
    if (rating <= 75) return 60;
    if (rating <= 85) return 35;
    return 15; // Rating 85+は交渉が困難
  }

  // ═══════════════════════════════════════════════
  // バイアウト実行（デッドキャップ配列を返す）
  // ═══════════════════════════════════════════════
  static executeBuyout(player) {
    const rate = CBACoreEngine.getBuyoutRate(player.rating);
    const totalRemaining = player.salary * player.contractYears;
    const buyoutTotal = Math.floor(totalRemaining * rate);
    const annualDeadCap = Math.floor(buyoutTotal / player.contractYears);

    return {
      success: true,
      rate,
      deadCapEntries: Array.from({ length: player.contractYears }, (_, i) => ({
        id: `bo_${player.id}_${i}`,
        label: `B/O: ${player.name}`,
        salary: annualDeadCap,
        yearsRemaining: player.contractYears - i,
        source: 'buyout'
      })),
      message: `バイアウト成功！ ${player.name}の契約が${(rate*100).toFixed(0)}%に軽減。デッドキャップ $${(annualDeadCap/1e6).toFixed(1)}M/年 × {player.contractYears}年`
    };
  }

  // ═══════════════════════════════════════════════
  // ストレッチ実行
  // ═══════════════════════════════════════════════
  static executeStretch(player) {
    const totalRemaining = player.salary * player.contractYears;
    const stretchYears = player.contractYears * 2 + 1;
    const annualDeadCap = Math.floor(totalRemaining / stretchYears);

    return {
      success: true,
      stretchYears,
      deadCapEntries: Array.from({ length: stretchYears }, (_, i) => ({
        id: `st_${player.id}_${i}`,
        label: `ST: ${player.name}`,
        salary: annualDeadCap,
        yearsRemaining: stretchYears - i,
        source: 'stretch'
      })),
      message: `ストレッチ条項発動！ ${player.name}の残り契約 $$$${(totalRemaining/1e6).toFixed(1)}M を${stretchYears}年間で分割。デッドキャップ $${(annualDeadCap/1e6).toFixed(1)}M/年 × {stretchYears}年`
    };
  }

  // ═══════════════════════════════════════════════
  // MLE使用チェック
  // ═══════════════════════════════════════════════
  static canUseMLE(playerSalary, mleRemaining, apronStatus) {
    if (apronStatus === "SECOND") {
      return { allowed: false, message: "【第2エプロン】MLEは没収されています。" };
    }
    if (playerSalary > mleRemaining) {
      return {
        allowed: false,
        message: `【MLE超過】選手の年俸（$$$${(playerSalary/1e6).toFixed(1)}M）がMLE残額（$${(mleRemaining/1e6).toFixed(1)}M）を超えています。`
      };
    }
    return { allowed: true, message: "" };
  }

  // ═══════════════════════════════════════════════
  // サイン・アンド・トレード検証
  // ═══════════════════════════════════════════════
  static validateSignAndTrade(player, targetYears) {
    if (targetYears < 3) {
      return { allowed: false, message: "【S&T規定】サイン・アンド・トレードには最低3年の契約が必要です。" };
    }
    if (player.birdRights !== "Full") {
      return { allowed: false, message: "【S&T規定】S&TにはFull Bird Rightsが必要です。" };
    }
    return { allowed: true, message: "" };
  }

  // ═══════════════════════════════════════════════
  // スーパーマックス判定・計算
  // ═══════════════════════════════════════════════
  static isSupermaxEligible(player) {
    return player.rating >= 90 && player.experience >= 4 && player.birdRights === "Full";
  }

  static getSupermaxSalary(capLimit) {
    return Math.floor(capLimit * CBACoreEngine.SMAX_RATE);
  }

  // ═══════════════════════════════════════════════
  // Player Option 判定
  // ═══════════════════════════════════════════════
  // 高Rating選手は拒否してFAへ、低Rating選手は行使して残留
  static willPlayerExerciseOption(player) {
    if (player.optionType !== "player") return null;
    // Rating 80以上 → 拒否（FA市場で高額契約を狙う）
    // Rating 80未満 → 行使（残留を選択）
    return player.rating < 80;
  }

  // ═══════════════════════════════════════════════
  // Team Option 判定（チームが選択）
  // ═══════════════════════════════════════════════
  static getTeamOptionAdvice(player) {
    if (player.optionType !== "team") return null;
    // 低Rating高給 → 切るべき
    // 高Rating安価 → 残すべき
    const efficiency = player.rating / (player.salary / 1000000);
    if (efficiency < 3) return "release"; // 切る推奨
    return "keep"; // 残す推奨
  }
}
