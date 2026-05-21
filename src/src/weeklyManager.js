// Weekly Challenge Manager
// GAS (Google Apps Script) の URL が設定されていない場合のスタブ

const GAS_URL = '';

export function getCurrentWeekId() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  const weekNum = Math.floor(diff / oneWeek) + 1;
  return now.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

export async function fetchCurrentChallenge() {
  if (!GAS_URL) return null;
  try {
    const res = await fetch(GAS_URL + '?action=challenge');
    const data = await res.json();
    if (data.stageId) return data;
    return null;
  } catch (e) {
    console.error('fetchChallenge error:', e);
    return null;
  }
}

export async function fetchWeeklyRanking(weekId) {
  if (!GAS_URL) return [];
  try {
    const res = await fetch(GAS_URL + '?action=ranking&week=' + weekId);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('fetchRanking error:', e);
    return [];
  }
}

export async function submitWeeklyScore(weekId, playerId, name, score) {
  if (!GAS_URL) return false;
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submit',
        week: weekId,
        playerId: playerId,
        name: name,
        score: score
      })
    });
    const data = await res.json();
    return data.success || false;
  } catch (e) {
    console.error('submitScore error:', e);
    return false;
  }
}
