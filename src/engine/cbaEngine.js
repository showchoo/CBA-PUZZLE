export class CBACoreEngine {
  /**
   * チームのロスター財政状況、戦力、違反項目を極限まで精密に評価する
   */
  static evaluate(roster, outgoingPlayer = null, incomingPlayer = null) {
    let totalCapHit = 0;      // 帳簿上の総年俸（メーター用）
    let actualPayroll = 0;     // オーナーが実際に支払うリアルな総年俸
    let totalOvr = 0;
    let regularContractCount = 0;
    let twoWayCount = 0;
    let hasStar = false;
    const violations = [];

    // 1. ロスター全体の契約形態・ステータスをディープに解析
    roster.forEach(player => {
      if (player.rating >= 90) hasStar = true;

      if (player.contractType === "twoway") {
        twoWayCount++;
        // 2ウェイ契約はキャップヒット$0、リアルペイロールも激安固定
        totalCapHit += 0;
        actualPayroll += 500000;
      } else {
        regularContractCount++;
        
        // 🌟 ベテランミニマム割引の帳簿マジック
        if (player.contractType === "minimum" && player.experience >= 10) {
          totalCapHit += 2010000; // 帳簿上は2年目プレイヤーの額に割引！
          actualPayroll += player.salary; // オーナーは満額（3.5Mなど）をリアルに支払う
        } else {
          totalCapHit += player.salary;
          actualPayroll += player.salary;
        }
        
        totalOvr += player.rating;
      }
    });

    // 🌟 2ウェイ契約の「14人縛り」ペナルティ
    // 通常契約が14人未満の場合、2ウェイ選手の戦力（OVR）は完全に無視され、ペナルティが発生する
    if (regularContractCount < 14) {
      violations.push({
        id: "ROSTER_MINIMUM_VIO",
        label: "🚨 リーグ規約違反 // 通常契約14人未満",
        text: `通常契約の選手が現在${regularContractCount}人です。CBA規約により最低14人の通常契約が必要です（育成枠の2ウェイ選手は戦力換算されません）。`
      });
    } else {
      // 14人縛りをクリアしていれば、2ウェイ選手の戦力もチームOVRにドッキング！
      roster.forEach(player => {
        if (player.contractType === "twoway") {
          totalOvr += player.rating;
        }
      });
    }

    // 2. 段階的サラリーキャップ＆エプロンラインの厳格ジャッジ
    const CAP_LIMIT = 136000000;
    const TAX_LIMIT = 165000000;
    const APRON_1   = 172000000;
    const APRON_2   = 182500000;

    let status = "UNDER_CAP";
    if (totalCapHit > CAP_LIMIT) status = "OVER_CAP";
    if (totalCapHit > TAX_LIMIT) status = "LUXURY_TAX";
    if (totalCapHit > APRON_1)   status = "FIRST_APRON";
    if (totalCapHit > APRON_2)   status = "SECOND_APRON";

    // 3. 🌟 悪魔のトレード・サラリーマッチング規制チェック
    // 選手を「入れ替える（トレードする）」瞬間に、エプロン状況に応じた数式制限をかける
    let isTradeAllowed = true;
    let tradeErrorMessage = "";

    if (outgoingPlayer && incomingPlayer) {
      const outSalary = outgoingPlayer.salary;
      const inSalary = incomingPlayer.salary;

      if (status === "SECOND_APRON") {
        // 第2エプロン突破時：1ドルでも貰う年俸が出す年俸を上回ったら即却下
        if (inSalary > outSalary) {
          isTradeAllowed = false;
          tradeErrorMessage = `【第2エプロン規制】1ドルでも貰う年俸が出す年俸を上回るトレードは完全禁止です（$In: $${inSalary.toLocaleString()} > $Out: $${outSalary.toLocaleString()}）。`;
        }
        // マニアックルール：第2エプロンチームは他チームの制限付きFA（RFA）へのオファーシート禁止
        if (incomingPlayer.faStatus === "RFA") {
          isTradeAllowed = false;
          tradeErrorMessage = "【第2エプロン規制】他チームの制限付きFA（RFA）選手を強奪することは禁止されています。";
        }
      } else if (status === "FIRST_APRON" || status === "LUXURY_TAX") {
        // 第1エプロン・贅沢税ゾーン：100%等価以下ルール
        if (inSalary > outSalary) {
          isTradeAllowed = false;
          tradeErrorMessage = `【第1エプロン規制】キャップ超過チームは、トレードで獲得する選手の年俸を出す選手以下に抑える必要があります。`;
        }
      } else {
        // 通常時：CBA基本の125%ルール（出す年俸の1.25倍＋10万ドルまで獲得可能）
        const maxIncoming = outSalary * 1.25 + 100000;
        if (inSalary > maxIncoming) {
          isTradeAllowed = false;
          tradeErrorMessage = `【125%トレードルール違反】獲得する年俸（$${inSalary.toLocaleString()}）が、放出する年俸の許容限界（$${Math.floor(maxIncoming).toLocaleString()}）を超えています。`;
        }
      }

      // バード権の縛り：バード権が"None"の選手をキャップオーバー状態で獲得することはできない
      if (status !== "UNDER_CAP" && incomingPlayer.birdRights === "None" && incomingPlayer.contractType !== "minimum" && incomingPlayer.contractType !== "twoway") {
        isTradeAllowed = false;
        tradeErrorMessage = "【バード権なし】サラリーキャップを超えているため、バード権を持たない通常契約の選手をFA市場から直接獲得することはできません。";
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
      tradeCheck: {
        allowed: isTradeAllowed,
        message: tradeErrorMessage
      }
    };
  }
}