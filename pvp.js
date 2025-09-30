import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  get,
  set,
  update,
  onValue
} from './firebase.js';
import {
  PART_ICONS,
  sanitizeEquipMap,
  sanitizeItems,
  sanitizeEnhanceConfig,
  sanitizeConfig,
  sanitizePetState,
  sanitizeCharacterState,
  createDefaultCharacterState,
  computePlayerStats as derivePlayerStats,
  combatPower,
  formatNum,
  characterBaseStats,
  getCharacterDefinition,
  getCharacterImageVariants,
  getEnhancementMultiplier
} from './combat-core.js';
import { simulatePvpBattle } from './pvp-battle-sim.js';
import { enqueueMail } from './mail-service.js';

const qs = (selector) => document.querySelector(selector);

const els = {
  toGacha: qs('#toGacha'),
  toBattle: qs('#toBattle'),
  logout: qs('#logoutBtn'),
  whoami: qs('#whoamiPvp'),
  pvpRecord: qs('#pvpRecord'),
  playerEquipment: qs('#playerEquipment'),
  playerStats: qs('#playerStats'),
  personalHistory: qs('#personalHistory'),
  opponentList: qs('#opponentList'),
  battleLog: qs('#battleLog'),
  versusSummary: qs('#versusSummary'),
  battleArena: qs('#pvpBattleArena'),
  battleBanner: qs('#pvpBattleBanner'),
  challengeBtn: qs('#challengeBtn'),
  rankingTable: qs('#rankingTable tbody'),
  resetPvpBtn: qs('#resetPvpData'),
  registerBtn: qs('#pvpRegisterBtn'),
  unregisterBtn: qs('#pvpUnregisterBtn'),
  registrationStatus: qs('#pvpRegistrationStatus'),
  seasonBanner: qs('#pvpSeasonBanner'),
  seasonStatusText: qs('#pvpSeasonStatusText'),
  seasonRewardSummary: qs('#pvpSeasonRewardSummary'),
  seasonTiming: qs('#pvpSeasonTiming'),
  seasonAdminPanel: qs('#pvpSeasonAdminPanel'),
  seasonHistoryPanel: qs('#pvpSeasonHistoryPanel'),
  seasonHistoryContent: qs('#pvpSeasonHistoryContent'),
  seasonStartBtn: qs('#pvpSeasonStartBtn'),
  seasonEndBtn: qs('#pvpSeasonEndBtn'),
  seasonRewardGoldInput: qs('#pvpRewardGoldInput'),
  seasonRewardDiamondsInput: qs('#pvpRewardDiamondsInput'),
  seasonRewardPointsInput: qs('#pvpRewardPointsInput'),
  seasonAdminMsg: qs('#pvpSeasonAdminMsg')
};

const stageEls = {
  left: {
    card: qs('#pvpLeftCard'),
    name: qs('#pvpLeftName'),
    power: qs('#pvpLeftPower'),
    hpFill: qs('#pvpLeftHpFill'),
    hpText: qs('#pvpLeftHpText'),
    stats: qs('#pvpLeftStats'),
    record: qs('#pvpLeftRecord'),
    characterImg: qs('#pvpLeftCharacterImg'),
    pet: qs('#pvpLeftPet')
  },
  right: {
    card: qs('#pvpRightCard'),
    name: qs('#pvpRightName'),
    power: qs('#pvpRightPower'),
    hpFill: qs('#pvpRightHpFill'),
    hpText: qs('#pvpRightHpText'),
    stats: qs('#pvpRightStats'),
    record: qs('#pvpRightRecord'),
    characterImg: qs('#pvpRightCharacterImg'),
    pet: qs('#pvpRightPet')
  }
};

const GLOBAL_CONFIG_PATH = 'config/global';

const state = {
  user: null,
  profile: null,
  config: null,
  opponents: [],
  selectedOpponent: null,
  playerStats: null,
  scoreboard: [],
  registration: null,
  rng: Math.random,
  battleAnimating: false,
  battleTimers: [],
  stage: {
    left: { hp: 0, maxHp: 1, uid: null },
    right: { hp: 0, maxHp: 1, uid: null }
  },
  season: {
    status: 'idle',
    rewardGold: 0,
    rewardDiamonds: 0,
    rewardPoints: 0,
    startedAt: null,
    endedAt: null,
    lastSeason: null
  },
  seasonListener: null,
  globalConfigListener: null
};

const CHARACTER_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2210%22%20ry%3D%2210%22%20fill%3D%22%23d0d0d0%22/%3E%3Cpath%20d%3D%22M32%2018a10%2010%200%201%201%200%2020a10%2010%200%200%201%200-20zm0%2024c10.5%200%2019%206.3%2019%2014v4H13v-4c0-7.7%208.5-14%2019-14z%22%20fill%3D%22%23808080%22/%3E%3C/svg%3E';
const BATTLE_EVENT_DELAY_MS = 650;
const MAX_BATTLE_LOG_ENTRIES = 120;

function createEmptyPvpStats() {
  return { wins: 0, losses: 0, draws: 0, history: [] };
}

async function fetchGlobalConfig() {
  try {
    const snapshot = await get(ref(db, GLOBAL_CONFIG_PATH));
    if (!snapshot.exists()) return null;
    const raw = snapshot.val();
    if (raw && typeof raw === 'object') {
      if (raw.config && typeof raw.config === 'object') {
        return sanitizeConfig(raw.config);
      }
      return sanitizeConfig(raw);
    }
  } catch (error) {
    console.error('전역 설정을 불러오지 못했습니다.', error);
  }
  return null;
}

function ensureNumber(value) {
  return typeof value === 'number' && isFinite(value) ? value : 0;
}

function ensureStats(stats) {
  return {
    atk: ensureNumber(stats?.atk),
    def: ensureNumber(stats?.def),
    hp: Math.max(0, ensureNumber(stats?.hp)),
    speed: ensureNumber(stats?.speed),
    critRate: ensureNumber(stats?.critRate),
    critDmg: ensureNumber(stats?.critDmg),
    dodge: ensureNumber(stats?.dodge)
  };
}

function ensureNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function formatRelativeTime(ts) {
  if (!ts || typeof ts !== 'number') return '-';
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    const remHours = hours % 24;
    return `${days}일 ${remHours}시간 경과`;
  }
  if (hours > 0) {
    const remMinutes = minutes % 60;
    return `${hours}시간 ${remMinutes}분 경과`;
  }
  if (minutes > 0) {
    return `${minutes}분 경과`;
  }
  const seconds = Math.floor(diff / 1000);
  if (seconds >= 5) {
    return `${seconds}초 경과`;
  }
  return '방금 전';
}

function allocateSeasonTotals(total, count) {
  const totalReward = ensureNonNegativeInt(total);
  const participantCount = Math.max(0, count || 0);
  const amounts = new Array(participantCount).fill(0);
  if (participantCount === 0 || totalReward <= 0) return amounts;
  if (participantCount === 1) {
    amounts[0] = totalReward;
    return amounts;
  }
  if (participantCount === 2) {
    const weights = [0.5 / 0.8, 0.3 / 0.8];
    let remaining = totalReward;
    let first = Math.floor(totalReward * weights[0]);
    if (first <= 0 && remaining > 0) first = 1;
    if (first > remaining) first = remaining;
    remaining -= first;
    let second = Math.floor(totalReward * weights[1]);
    if (second <= 0 && remaining > 0) second = Math.min(1, remaining);
    if (second > remaining) second = remaining;
    remaining -= second;
    amounts[0] = first;
    amounts[1] = second;
    if (remaining > 0) {
      amounts[0] += remaining;
    }
    return amounts;
  }

  const participants = participantCount;
  const originalTotal = totalReward;
  let remaining = totalReward;
  let first = Math.floor(originalTotal * 0.5);
  if (first <= 0 && remaining > 0) first = 1;
  if (first > remaining) first = remaining;
  remaining -= first;

  let second = Math.floor(originalTotal * 0.3);
  if (second <= 0 && remaining > 0) second = Math.min(1, remaining);
  if (second > remaining) second = remaining;
  remaining -= second;

  const othersCount = participants - 2;
  let targetOthersTotal = Math.floor(originalTotal * 0.2);
  if (targetOthersTotal <= 0 && remaining > 0) {
    targetOthersTotal = Math.min(remaining, othersCount);
  }
  let othersBudget = Math.min(remaining, targetOthersTotal);
  if (othersBudget <= 0 && remaining > 0) {
    othersBudget = Math.min(remaining, othersCount);
  }
  let perOther = othersCount > 0 ? Math.floor(othersBudget / othersCount) : 0;
  let remainderForOthers = othersBudget - perOther * othersCount;

  amounts[0] = first;
  amounts[1] = second;

  for (let i = 0; i < othersCount; i += 1) {
    let award = perOther;
    if (remainderForOthers > 0) {
      award += 1;
      remainderForOthers -= 1;
    }
    award = Math.min(award, remaining);
    amounts[2 + i] = award;
    remaining -= award;
  }

  if (remaining > 0) {
    for (let i = 0; i < amounts.length && remaining > 0; i += 1) {
      amounts[i] += 1;
      remaining -= 1;
    }
  }

  return amounts;
}

function setSeasonAdminMessage(message, tone = null) {
  if (!els.seasonAdminMsg) return;
  els.seasonAdminMsg.textContent = message || '';
  els.seasonAdminMsg.classList.remove('ok', 'warn', 'danger');
  if (tone === 'ok') {
    els.seasonAdminMsg.classList.add('ok');
  } else if (tone === 'warn') {
    els.seasonAdminMsg.classList.add('warn');
  } else if (tone === 'danger') {
    els.seasonAdminMsg.classList.add('danger');
  }
}

function formatRatio(wins, losses) {
  const total = wins + losses;
  if (total === 0) return '0%';
  return `${((wins / total) * 100).toFixed(1)}%`;
}

function formatTime(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('ko-KR');
}

function getCharacterImageSource(characterId) {
  if (!characterId) return CHARACTER_IMAGE_PLACEHOLDER;
  const variants = getCharacterImageVariants(characterId);
  if (Array.isArray(variants) && variants.length) {
    const candidate = variants.find(Boolean);
    if (candidate) return candidate;
  }
  const def = getCharacterDefinition(characterId);
  if (def?.image) return def.image;
  return CHARACTER_IMAGE_PLACEHOLDER;
}

function setCharacterImage(imgEl, characterId) {
  if (!(imgEl instanceof HTMLImageElement)) return;
  const def = characterId ? getCharacterDefinition(characterId) : null;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = CHARACTER_IMAGE_PLACEHOLDER;
  };
  imgEl.src = getCharacterImageSource(characterId);
  imgEl.alt = def?.name || '캐릭터';
  imgEl.style.opacity = characterId ? '1' : '0.35';
}

function ensureChallengeButtonState() {
  if (!els.challengeBtn) return;
  const ready = !!(
    state.registration &&
    state.selectedOpponent &&
    state.selectedOpponent.registration &&
    !state.battleAnimating &&
    state.season.status === 'active'
  );
  els.challengeBtn.disabled = !ready;
}

function clearBattleLog() {
  if (els.battleLog) {
    els.battleLog.innerHTML = '';
  }
}

function appendBattleLog(message, tone = '') {
  if (!els.battleLog || !message) return;
  const entry = document.createElement('div');
  entry.className = 'log-line';
  if (tone) entry.classList.add(tone);
  entry.textContent = message;
  els.battleLog.appendChild(entry);
  while (els.battleLog.childNodes.length > MAX_BATTLE_LOG_ENTRIES) {
    els.battleLog.removeChild(els.battleLog.firstChild);
  }
  els.battleLog.scrollTop = els.battleLog.scrollHeight;
}

function clearBattleTimers() {
  state.battleTimers.forEach((timer) => window.clearTimeout(timer));
  state.battleTimers = [];
  ['left', 'right'].forEach((side) => {
    const card = stageEls[side]?.card;
    if (card) {
      card.classList.remove('action-hit', 'action-miss', 'action-defend', 'action-critical');
    }
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      state.battleTimers = state.battleTimers.filter((id) => id !== timer);
      resolve();
    }, ms);
    state.battleTimers.push(timer);
  });
}

function flashStageAction(side, outcome) {
  const card = stageEls[side]?.card;
  if (!card) return;
  const classes = ['action-hit', 'action-miss', 'action-defend', 'action-critical'];
  classes.forEach((cls) => card.classList.remove(cls));
  let className = '';
  switch (outcome) {
    case 'critical':
      className = 'action-critical';
      break;
    case 'miss':
      className = 'action-miss';
      break;
    case 'defend':
      className = 'action-defend';
      break;
    case 'hit':
      className = 'action-hit';
      break;
    default:
      className = '';
      break;
  }
  if (!className) return;
  card.classList.add(className);
  const timer = window.setTimeout(() => {
    card.classList.remove(className);
    state.battleTimers = state.battleTimers.filter((id) => id !== timer);
  }, 420);
  state.battleTimers.push(timer);
}

function showBattleBanner(text, mode) {
  if (!els.battleBanner) return;
  if (!text) {
    els.battleBanner.textContent = '';
    els.battleBanner.className = 'battle-result-banner';
    els.battleBanner.style.display = 'none';
    return;
  }
  els.battleBanner.textContent = text;
  els.battleBanner.className = 'battle-result-banner';
  if (mode) {
    els.battleBanner.classList.add(mode);
  }
  els.battleBanner.style.display = 'block';
}

function showBattleBannerFromResult(finalEvent, battleResult, leftUid) {
  if (battleResult?.winner) {
    const isLeft = battleResult.winner.uid === leftUid;
    showBattleBanner(isLeft ? '승리!' : '패배', isLeft ? 'victory' : 'defeat');
    return;
  }
  if (finalEvent?.outcome === 'timeout') {
    showBattleBanner('시간 초과', 'timeout');
  } else if (finalEvent) {
    showBattleBanner('무승부', 'draw');
  } else {
    showBattleBanner(null);
  }
}

function setStageHp(side, current, max) {
  const sideState = state.stage[side];
  const elsSide = stageEls[side];
  if (!sideState || !elsSide) return;
  const cappedMax = Math.max(1, Number.isFinite(max) ? max : sideState.maxHp || 1);
  const safeCurrent = Math.max(0, Number.isFinite(current) ? current : sideState.hp || 0);
  if (elsSide.hpFill) {
    const pct = Math.max(0, Math.min(100, (safeCurrent / cappedMax) * 100));
    elsSide.hpFill.style.width = `${pct}%`;
  }
  if (elsSide.hpText) {
    elsSide.hpText.textContent = `${formatNum(Math.floor(safeCurrent))} / ${formatNum(Math.floor(cappedMax))}`;
  }
  sideState.hp = safeCurrent;
  sideState.maxHp = cappedMax;
}

function setStageSide(side, registration, record) {
  const elsSide = stageEls[side];
  if (!elsSide) return;
  const stats = registration ? ensureStats(registration.stats) : ensureStats(null);
  const displayName = registration
    ? registration.displayName
    : side === 'left'
    ? '출전 등록 필요'
    : '상대를 선택하세요';
  if (elsSide.name) elsSide.name.textContent = displayName;
  const power = registration ? registration.power || combatPower(stats) : 0;
  if (elsSide.power) elsSide.power.textContent = formatNum(power);
  if (elsSide.characterImg) {
    setCharacterImage(elsSide.characterImg, registration?.characterId || null);
  }
  if (elsSide.pet) {
    if (registration?.petName) {
      const icon = registration.petIcon || '🐾';
      elsSide.pet.textContent = `${icon} ${registration.petName}`;
    } else {
      elsSide.pet.textContent = '펫 없음';
    }
  }
  if (elsSide.record) {
    const wins = ensureNumber(record?.wins);
    const losses = ensureNumber(record?.losses);
    const draws = ensureNumber(record?.draws);
    const ratio = formatRatio(wins, losses);
    elsSide.record.textContent = registration
      ? `${wins}승 ${losses}패${draws ? ` ${draws}무` : ''} · 승률 ${ratio}`
      : '---';
  }
  renderStats(elsSide.stats, stats);
  setStageHp(side, stats.hp, stats.hp || 1);
  state.stage[side].uid = registration?.uid || null;
}

function populateStageForSelection(opponent) {
  const myRecord = state.profile?.pvpStats || createEmptyPvpStats();
  setStageSide('left', state.registration, myRecord);
  if (opponent?.registration) {
    setStageSide('right', opponent.registration, opponent.rawStats);
  } else {
    setStageSide('right', null, createEmptyPvpStats());
  }
}

function updateRegistrationUI() {
  if (els.registrationStatus) {
    if (state.registration) {
      const timeText = state.registration.registeredAt ? formatTime(state.registration.registeredAt) : '-';
      const powerText = formatNum(state.registration.power || 0);
      els.registrationStatus.textContent = `출전 중 · 전투력 ${powerText} · 등록 ${timeText}`;
    } else {
      els.registrationStatus.textContent = '현재 미등록 상태입니다.';
    }
  }
  if (els.registerBtn) {
    els.registerBtn.disabled = state.battleAnimating;
  }
  if (els.unregisterBtn) {
    els.unregisterBtn.disabled = !state.registration || state.battleAnimating;
  }
  populateStageForSelection(state.selectedOpponent);
  ensureChallengeButtonState();
}

function renderEquipment(listEl, equipment) {
  if (!listEl) return;
  listEl.innerHTML = '';
  const list = Array.isArray(equipment) ? equipment : [];
  if (!list.length) {
    const empty = document.createElement('div');
    empty.textContent = '장착된 장비가 없습니다.';
    empty.className = 'muted';
    listEl.appendChild(empty);
    return;
  }
  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'tier-badge';
    div.innerHTML = `${PART_ICONS[item.part] || '🎁'} ${item.tier} Lv.${item.lvl || 0} <span class="muted">(${formatNum(item.effective)})</span>`;
    listEl.appendChild(div);
  });
}

function renderStats(tableEl, stats) {
  if (!tableEl) return;
  const safe = ensureStats(stats);
  tableEl.innerHTML = '';
  const entries = [
    ['공격력', safe.atk],
    ['방어력', safe.def],
    ['체력', safe.hp],
    ['속도', safe.speed],
    ['크리티컬', `${safe.critRate.toFixed(1)}%`],
    ['크리티컬 데미지', `${safe.critDmg.toFixed(1)}%`],
    ['회피', `${safe.dodge.toFixed(1)}%`]
  ];
  entries.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'row';
    const left = document.createElement('span');
    left.className = 'label';
    left.textContent = label;
    const right = document.createElement('span');
    right.textContent = typeof value === 'number' ? formatNum(value) : value;
    row.appendChild(left);
    row.appendChild(right);
    tableEl.appendChild(row);
  });
}

function renderHistory(listEl, history) {
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!history || !history.length) {
    const empty = document.createElement('div');
    empty.textContent = '전투 기록이 없습니다.';
    empty.className = 'muted';
    listEl.appendChild(empty);
    return;
  }
  history
    .slice()
    .reverse()
    .forEach((entry) => {
      const div = document.createElement('div');
      const tone = entry.result === 'win' ? 'ok' : entry.result === 'loss' ? 'danger' : 'warn';
      div.className = `log-line ${tone === 'ok' ? 'win' : tone === 'danger' ? 'loss' : ''}`;
      div.innerHTML = `<strong>${entry.opponentName}</strong> ${
        entry.result === 'win' ? '승' : entry.result === 'loss' ? '패' : '무'
      } · ${formatTime(entry.timestamp)}`;
      listEl.appendChild(div);
    });
}

function renderOpponents(opponents) {
  if (!els.opponentList) return;
  els.opponentList.innerHTML = '';
  if (!opponents.length) {
    const empty = document.createElement('div');
    empty.textContent = '등록된 다른 플레이어가 없습니다.';
    empty.className = 'muted';
    els.opponentList.appendChild(empty);
    return;
  }
  opponents.forEach((opp) => {
    const item = document.createElement('div');
    item.className = 'opponent-item';
    if (state.selectedOpponent?.uid === opp.uid) {
      item.classList.add('selected');
    }
    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = opp.displayName;
    const rating = document.createElement('div');
    rating.className = 'rating';
    const wins = ensureNumber(opp.rawStats?.wins);
    const losses = ensureNumber(opp.rawStats?.losses);
    rating.textContent = `전투력 ${formatNum(opp.registration.power || 0)} · ${wins}승 ${losses}패`;
    info.appendChild(name);
    info.appendChild(rating);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const charLabel = opp.registration.characterName || '미확인 캐릭터';
    const petLabel = opp.registration.petName
      ? `${opp.registration.petIcon || '🐾'} ${opp.registration.petName}`
      : '펫 없음';
    meta.innerHTML = `<span>${charLabel}</span><span>${petLabel}</span>`;
    info.appendChild(meta);
    if (opp.registration.registeredAt) {
      const time = document.createElement('div');
      time.className = 'time';
      time.textContent = `등록: ${formatTime(opp.registration.registeredAt)}`;
      info.appendChild(time);
    }
    const btn = document.createElement('button');
    btn.textContent = '도전';
    btn.addEventListener('click', () => selectOpponent(opp.uid));
    item.appendChild(info);
    item.appendChild(btn);
    els.opponentList.appendChild(item);
  });
}

function renderRanking(board) {
  if (!els.rankingTable) return;
  els.rankingTable.innerHTML = '';
  if (!board.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="4">등록된 플레이어가 없습니다.</td>';
    els.rankingTable.appendChild(emptyRow);
    return;
  }
  board.forEach((entry, idx) => {
    const total = entry.wins + entry.losses;
    const winRate = total ? ((entry.wins / total) * 100).toFixed(1) : '0.0';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx + 1}</td><td>${entry.displayName}</td><td>${entry.wins}승 ${entry.losses}패${
      entry.draws ? ` ${entry.draws}무` : ''
    }</td><td>${winRate}%</td>`;
    els.rankingTable.appendChild(tr);
  });
}

function selectOpponent(uid) {
  const previousUid = state.selectedOpponent?.uid;
  const opponent = state.opponents.find((o) => o.uid === uid) || null;
  state.selectedOpponent = opponent;
  const changed = previousUid !== opponent?.uid;
  if (!opponent) {
    els.versusSummary.innerHTML = state.registration
      ? '도전할 상대를 선택하세요.'
      : '출전 등록 후 상대를 선택할 수 있습니다.';
    populateStageForSelection(null);
    ensureChallengeButtonState();
    if (changed) {
      clearBattleLog();
      showBattleBanner(null);
    }
    renderOpponents(state.opponents);
    return;
  }
  const reg = opponent.registration;
  const lines = [
    `<span>상대: <strong>${opponent.displayName}</strong></span>`,
    `<span>전투력: ${formatNum(reg.power || 0)}</span>`,
    `<span>전적: ${ensureNumber(opponent.rawStats?.wins)}승 ${ensureNumber(opponent.rawStats?.losses)}패${
      opponent.rawStats?.draws ? ` ${ensureNumber(opponent.rawStats.draws)}무` : ''
    }</span>`
  ];
  if (reg.registeredAt) {
    lines.push(`<span>등록: ${formatTime(reg.registeredAt)}</span>`);
  }
  els.versusSummary.innerHTML = lines.join(' ');
  populateStageForSelection(opponent);
  ensureChallengeButtonState();
  if (changed) {
    clearBattleLog();
    showBattleBanner(null);
  }
  renderOpponents(state.opponents);
}

async function animateBattle(result, playerReg, opponentReg) {
  clearBattleTimers();
  state.battleAnimating = true;
  ensureChallengeButtonState();
  clearBattleLog();
  showBattleBanner(null);

  const leftUid = playerReg?.uid || state.user?.uid;
  const rightUid = opponentReg?.uid || state.selectedOpponent?.uid;

  setStageSide('left', playerReg, state.profile?.pvpStats || createEmptyPvpStats());
  setStageSide('right', opponentReg, state.selectedOpponent?.rawStats || createEmptyPvpStats());

  const timeline = Array.isArray(result.timeline) ? result.timeline : [];
  const events = timeline.filter((event) => event && event.action !== 'result');
  const finalEvent = timeline.find((event) => event && event.action === 'result');

  if (!events.length) {
    const logEntries = Array.isArray(result.logs) ? result.logs : [];
    logEntries.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === 'string') {
        appendBattleLog(entry);
      } else if (entry.message) {
        appendBattleLog(entry.message, entry.tone || '');
      }
    });
    const leftRemain = finalEvent?.remaining?.A ?? finalEvent?.remaining?.left ?? result.remaining?.A ?? result.remaining?.left ?? state.stage.left.hp;
    const rightRemain = finalEvent?.remaining?.B ?? finalEvent?.remaining?.right ?? result.remaining?.B ?? result.remaining?.right ?? state.stage.right.hp;
    setStageHp('left', leftRemain, state.stage.left.maxHp);
    setStageHp('right', rightRemain, state.stage.right.maxHp);
    showBattleBannerFromResult(finalEvent, result, leftUid);
    state.battleAnimating = false;
    ensureChallengeButtonState();
    return;
  }

  setStageHp('left', state.stage.left.maxHp, state.stage.left.maxHp);
  setStageHp('right', state.stage.right.maxHp, state.stage.right.maxHp);

  for (const event of events) {
    const tone =
      event.tone ||
      (event.outcome === 'critical'
        ? 'danger'
        : event.outcome === 'miss'
        ? 'warn'
        : event.outcome === 'defend'
        ? 'ok'
        : event.outcome === 'heal'
        ? 'heal'
        : '');
    if (event.log) appendBattleLog(event.log, tone);
    if (event.target?.uid === leftUid && typeof event.targetHpAfter === 'number') {
      setStageHp('left', event.targetHpAfter, state.stage.left.maxHp);
    } else if (event.target?.uid === rightUid && typeof event.targetHpAfter === 'number') {
      setStageHp('right', event.targetHpAfter, state.stage.right.maxHp);
    }
    if (event.actor?.uid === leftUid) {
      flashStageAction('left', event.outcome);
    } else if (event.actor?.uid === rightUid) {
      flashStageAction('right', event.outcome);
    }
    await wait(BATTLE_EVENT_DELAY_MS);
  }

  if (finalEvent) {
    if (finalEvent.log) appendBattleLog(finalEvent.log, 'muted');
    if (finalEvent.remaining) {
      if (typeof finalEvent.remaining.A === 'number' || typeof finalEvent.remaining.left === 'number') {
        const leftRemain = finalEvent.remaining.A ?? finalEvent.remaining.left;
        setStageHp('left', leftRemain, state.stage.left.maxHp);
      }
      if (typeof finalEvent.remaining.B === 'number' || typeof finalEvent.remaining.right === 'number') {
        const rightRemain = finalEvent.remaining.B ?? finalEvent.remaining.right;
        setStageHp('right', rightRemain, state.stage.right.maxHp);
      }
    }
  } else {
    const leftRemain = result.remaining?.A ?? result.remaining?.left ?? state.stage.left.hp;
    const rightRemain = result.remaining?.B ?? result.remaining?.right ?? state.stage.right.hp;
    setStageHp('left', leftRemain, state.stage.left.maxHp);
    setStageHp('right', rightRemain, state.stage.right.maxHp);
  }

  showBattleBannerFromResult(finalEvent, result, leftUid);
  state.battleAnimating = false;
  ensureChallengeButtonState();
}

async function recordPvPResult(result, opponent) {
  const now = Date.now();
  const myUid = state.user.uid;
  const oppUid = opponent.uid;
  const currentMyStats = state.profile.pvpStats || createEmptyPvpStats();
  const currentOppStats = opponent.rawStats || createEmptyPvpStats();
  const myStats = {
    wins: ensureNumber(currentMyStats.wins),
    losses: ensureNumber(currentMyStats.losses),
    draws: ensureNumber(currentMyStats.draws),
    history: Array.isArray(currentMyStats.history) ? [...currentMyStats.history] : []
  };
  const oppStats = {
    wins: ensureNumber(currentOppStats.wins),
    losses: ensureNumber(currentOppStats.losses),
    draws: ensureNumber(currentOppStats.draws),
    history: Array.isArray(currentOppStats.history) ? [...currentOppStats.history] : []
  };
  let myResult = 'draw';
  let oppResult = 'draw';
  if (result.winner && result.winner.uid === myUid) {
    myResult = 'win';
    oppResult = 'loss';
    myStats.wins += 1;
    oppStats.losses += 1;
  } else if (result.winner && result.winner.uid === oppUid) {
    myResult = 'loss';
    oppResult = 'win';
    myStats.losses += 1;
    oppStats.wins += 1;
  } else {
    myStats.draws += 1;
    oppStats.draws += 1;
  }
  const historyEntryMe = {
    opponent: oppUid,
    opponentName: opponent.displayName,
    result: myResult,
    turns: result.turns,
    timestamp: now
  };
  const historyEntryOpp = {
    opponent: myUid,
    opponentName: state.user.username,
    result: oppResult,
    turns: result.turns,
    timestamp: now
  };
  myStats.history = [...myStats.history, historyEntryMe].slice(-20);
  oppStats.history = [...oppStats.history, historyEntryOpp].slice(-20);
  state.profile.pvpStats = myStats;
  const matchId = `match_${now}`;
  const updates = {};
  updates[`pvpMatches/${matchId}`] = {
    createdAt: now,
    playerA: myUid,
    playerB: oppUid,
    winner: result.winner ? result.winner.uid : null,
    turns: result.turns,
    log: result.logs
  };
  updates[`users/${myUid}/pvpStats`] = myStats;
  updates[`users/${oppUid}/pvpStats`] = oppStats;
  await update(ref(db), updates);
  opponent.rawStats = oppStats;
}

function renderPersonalStats() {
  if (!state.profile) return;
  const stats = state.profile.pvpStats || createEmptyPvpStats();
  if (els.pvpRecord) {
    const wins = ensureNumber(stats.wins);
    const losses = ensureNumber(stats.losses);
    const draws = ensureNumber(stats.draws);
    els.pvpRecord.textContent = `${wins}승 ${losses}패${draws ? ` ${draws}무` : ''}`;
  }
  renderHistory(els.personalHistory, stats.history || []);
}

function buildRegistrationSnapshot() {
  if (!state.user || !state.playerStats) return null;
  const now = Date.now();
  const stats = ensureStats(state.playerStats.stats || {});
  const equipment = Array.isArray(state.playerStats.equipment)
    ? state.playerStats.equipment.map((item) => ({ ...item }))
    : [];
  const combat = state.playerStats.combat && typeof state.playerStats.combat === 'object'
    ? { ...state.playerStats.combat }
    : {};
  const characterDef = state.playerStats.character || (state.playerStats.characterId ? getCharacterDefinition(state.playerStats.characterId) : null);
  return {
    uid: state.user.uid,
    displayName: state.user.username,
    stats,
    equipment,
    combat,
    power: combatPower(stats),
    registeredAt: now,
    updatedAt: now,
    characterId: state.playerStats.characterId || null,
    characterName: state.playerStats.character?.name || null,
    characterTier: characterDef?.tier || null,
    characterClass: characterDef?.classId || null,
    petId: state.profile?.pets?.active || null,
    petName: state.playerStats.pet?.name || null,
    petIcon: state.playerStats.pet?.icon || null,
    version: 1,
    skillMultiplier: typeof state.playerStats.skillMultiplier === 'number' && isFinite(state.playerStats.skillMultiplier) && state.playerStats.skillMultiplier > 0
      ? state.playerStats.skillMultiplier
      : 1
  };
}

async function registerForPvp() {
  if (!state.user || !state.profile || !state.playerStats) return;
  if (state.battleAnimating) return;
  const snapshot = buildRegistrationSnapshot();
  if (!snapshot) return;
  if (els.registerBtn) els.registerBtn.disabled = true;
  try {
    setLoadingState('출전 등록 정보를 저장하는 중...');
    await set(ref(db, `pvpRegistrations/${state.user.uid}`), snapshot);
    state.registration = snapshot;
    updateRegistrationUI();
    await loadOpponents();
    setLoadingState('출전 등록이 완료되었습니다. 상대를 선택하세요.');
  } catch (error) {
    console.error('PVP 등록 실패', error);
    setLoadingState('출전 등록에 실패했습니다.');
  } finally {
    if (els.registerBtn) els.registerBtn.disabled = false;
    ensureChallengeButtonState();
  }
}

async function unregisterFromPvp() {
  if (!state.user || !state.registration) return;
  if (state.battleAnimating) return;
  if (els.unregisterBtn) els.unregisterBtn.disabled = true;
  try {
    setLoadingState('출전 등록을 해제하는 중...');
    await set(ref(db, `pvpRegistrations/${state.user.uid}`), null);
    state.registration = null;
    updateRegistrationUI();
    await loadOpponents();
    setLoadingState('출전 등록이 해제되었습니다.');
  } catch (error) {
    console.error('PVP 등록 해제 실패', error);
    setLoadingState('출전 등록 해제에 실패했습니다.');
  } finally {
    if (els.unregisterBtn) els.unregisterBtn.disabled = false;
    ensureChallengeButtonState();
  }
}

async function challengeSelectedOpponent() {
  if (state.battleAnimating) return;
  const opponent = state.selectedOpponent;
  const playerReg = state.registration;
  if (!opponent || !playerReg || !opponent.registration) return;
  state.battleAnimating = true;
  ensureChallengeButtonState();
  try {
    const battleResult = simulatePvpBattle({
      left: registrationToCombatant(playerReg, state.user?.username),
      right: registrationToCombatant(opponent.registration, opponent.displayName),
      rng: state.rng
    });
    await animateBattle(battleResult, playerReg, opponent.registration);
    await recordPvPResult(battleResult, opponent);
    renderPersonalStats();
    await loadOpponents();
    selectOpponent(opponent.uid);
  } catch (error) {
    console.error('PVP 전투 실패', error);
    setLoadingState('전투를 실행하지 못했습니다.');
  } finally {
    state.battleAnimating = false;
    ensureChallengeButtonState();
  }
}

async function resetPvpData() {
  if ((state.user?.role || '').toLowerCase() !== 'admin') return;
  if (!window.confirm('모든 플레이어의 PVP 전적과 랭킹을 초기화하시겠습니까?')) return;
  if (els.resetPvpBtn) els.resetPvpBtn.disabled = true;
  try {
    const snapshot = await get(ref(db, 'users'));
    const data = snapshot.exists() ? snapshot.val() : {};
    const updates = { pvpMatches: null, pvpRegistrations: null };
    Object.keys(data).forEach((uid) => {
      updates[`users/${uid}/pvpStats`] = createEmptyPvpStats();
    });
    await update(ref(db), updates);
    state.profile.pvpStats = createEmptyPvpStats();
    state.registration = null;
    state.selectedOpponent = null;
    setLoadingState('랭킹과 전적이 초기화되었습니다.');
    renderPersonalStats();
    await loadOpponents();
  } catch (error) {
    console.error('PVP 초기화 실패', error);
    setLoadingState('초기화 중 오류가 발생했습니다.');
  } finally {
    if (els.resetPvpBtn) els.resetPvpBtn.disabled = false;
  }
}

function normalizeRegistration(raw, uid, fallbackName) {
  if (!raw || typeof raw !== 'object') return null;
  const stats = ensureStats(raw.stats);
  const equipment = Array.isArray(raw.equipment) ? raw.equipment.map((item) => ({ ...item })) : [];
  const combat = raw.combat && typeof raw.combat === 'object' ? { ...raw.combat } : {};
  const characterId = raw.characterId || null;
  const characterDef = characterId ? getCharacterDefinition(characterId) : null;
  let characterName = raw.characterName || null;
  if (!characterName && characterDef) {
    characterName = characterDef.name || null;
  }
  const characterTier = raw.characterTier || characterDef?.tier || null;
  const characterClass = raw.characterClass || characterDef?.classId || null;
  const rawMultiplier = Number(raw.skillMultiplier);
  const skillMultiplier = Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? rawMultiplier : 1;
  return {
    uid,
    displayName: raw.displayName || fallbackName,
    stats,
    equipment,
    combat,
    power: raw.power || combatPower(stats),
    registeredAt: raw.registeredAt || raw.updatedAt || 0,
    updatedAt: raw.updatedAt || raw.registeredAt || 0,
    characterId,
    characterName,
    characterTier,
    characterClass,
    petId: raw.petId || null,
    petName: raw.petName || null,
    petIcon: raw.petIcon || null,
    version: raw.version || 1,
    skillMultiplier
  };
}

function registrationToCombatant(reg, fallbackName) {
  if (!reg) return null;
  const regMultiplier = Number(reg.skillMultiplier);
  return {
    uid: reg.uid,
    displayName: reg.displayName || fallbackName || reg.characterName || 'Unknown',
    stats: ensureStats(reg.stats || {}),
    combat: reg.combat || {},
    characterId: reg.characterId || null,
    characterName: reg.characterName || null,
    characterTier: reg.characterTier || null,
    characterClass: reg.characterClass || null,
    petId: reg.petId || null,
    petName: reg.petName || null,
    petIcon: reg.petIcon || '🐾',
    skillMultiplier: Number.isFinite(regMultiplier) && regMultiplier > 0 ? regMultiplier : 1
  };
}

function renderSeasonHistory(history) {
  if (!els.seasonHistoryContent) return;
  const container = els.seasonHistoryContent;
  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'winner-line';
  const rewardGold = ensureNonNegativeInt(history.rewardGold);
  const rewardDiamonds = ensureNonNegativeInt(history.rewardDiamonds);
  const rewardPoints = ensureNonNegativeInt(history.rewardPoints);
  header.innerHTML = `<span>종료: ${formatTime(history.endedAt)}</span><span class="muted">총 상금 · 골드 ${formatNum(rewardGold)} / 포인트 ${formatNum(rewardPoints)} / 다이아 ${formatNum(rewardDiamonds)}</span>`;
  container.appendChild(header);
  const winners = Array.isArray(history.winners) ? history.winners.slice(0, 2) : [];
  if (!winners.length) {
    const empty = document.createElement('div');
    empty.className = 'season-history-empty';
    empty.textContent = '1, 2위 기록이 없습니다.';
    container.appendChild(empty);
    return;
  }
  winners.forEach((winner) => {
    const line = document.createElement('div');
    line.className = 'winner-line';
    const placeLabel = winner.placement === 1 ? '1위' : winner.placement === 2 ? '2위' : `${winner.placement}위`;
    const wins = ensureNumber(winner.wins || 0);
    const losses = ensureNumber(winner.losses || 0);
    const draws = ensureNumber(winner.draws || 0);
    const recordParts = [`${wins}승`, `${losses}패`];
    if (draws > 0) recordParts.push(`${draws}무`);
    line.innerHTML = `<strong>${placeLabel}</strong><span>${winner.displayName || '-'}</span><span class="muted">${recordParts.join(' ')}</span><span class="muted">골드 ${formatNum(ensureNonNegativeInt(winner.gold || 0))} · 포인트 ${formatNum(ensureNonNegativeInt(winner.points || 0))} · 다이아 ${formatNum(ensureNonNegativeInt(winner.diamonds || 0))}</span>`;
    container.appendChild(line);
  });
}

function updateSeasonUI() {
  const season = state.season || {};
  const status = season.status === 'active' ? 'active' : 'idle';
  const active = status === 'active';
  if (els.seasonBanner) {
    els.seasonBanner.classList.toggle('active', active);
  }
  if (els.seasonStatusText) {
    const base = active ? '시즌 진행중' : '시즌 대기중';
    let suffix = '';
    if (active && season.startedAt) {
      suffix = ` · ${formatTime(season.startedAt)}`;
    } else if (!active && season.endedAt) {
      suffix = ` · 마지막 종료 ${formatTime(season.endedAt)}`;
    }
    els.seasonStatusText.textContent = `${base}${suffix}`;
  }
  if (els.seasonRewardSummary) {
    const gold = ensureNonNegativeInt(season.rewardGold);
    const diamonds = ensureNonNegativeInt(season.rewardDiamonds);
    const points = ensureNonNegativeInt(season.rewardPoints);
    els.seasonRewardSummary.textContent = `상금: 골드 ${formatNum(gold)} / 포인트 ${formatNum(points)} / 다이아 ${formatNum(diamonds)}`;
  }
  if (els.seasonTiming) {
    let timing = '-';
    if (active && season.startedAt) {
      timing = `시작: ${formatTime(season.startedAt)} (${formatRelativeTime(season.startedAt)})`;
    } else if (season.endedAt) {
      timing = `마지막 종료: ${formatTime(season.endedAt)}`;
    }
    els.seasonTiming.textContent = timing;
  }
  const isAdmin = (state.user?.role || '').toLowerCase() === 'admin';
  if (els.seasonAdminPanel) {
    els.seasonAdminPanel.style.display = isAdmin ? '' : 'none';
    if (isAdmin) {
      if (els.seasonRewardGoldInput && document.activeElement !== els.seasonRewardGoldInput) {
        els.seasonRewardGoldInput.value = String(ensureNonNegativeInt(season.rewardGold));
      }
      if (els.seasonRewardDiamondsInput && document.activeElement !== els.seasonRewardDiamondsInput) {
        els.seasonRewardDiamondsInput.value = String(ensureNonNegativeInt(season.rewardDiamonds));
      }
      if (els.seasonRewardPointsInput && document.activeElement !== els.seasonRewardPointsInput) {
        els.seasonRewardPointsInput.value = String(ensureNonNegativeInt(season.rewardPoints));
      }
      if (els.seasonStartBtn) {
        els.seasonStartBtn.disabled = active;
      }
      if (els.seasonEndBtn) {
        els.seasonEndBtn.disabled = !active;
      }
    }
  }
  if (els.seasonHistoryPanel) {
    const history = season.lastSeason && season.lastSeason.endedAt ? season.lastSeason : null;
    if (history) {
      els.seasonHistoryPanel.style.display = '';
      renderSeasonHistory(history);
    } else {
      els.seasonHistoryPanel.style.display = 'none';
      if (els.seasonHistoryContent) {
        els.seasonHistoryContent.innerHTML = '<div class="season-history-empty">아직 시즌 기록이 없습니다.</div>';
      }
    }
  }
  ensureChallengeButtonState();
}

function subscribeSeason() {
  if (state.seasonListener) return;
  const seasonRef = ref(db, 'pvpSeason');
  state.seasonListener = onValue(
    seasonRef,
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      state.season = {
        status: data?.status === 'active' ? 'active' : 'idle',
        rewardGold: ensureNonNegativeInt(data?.rewardGold),
        rewardDiamonds: ensureNonNegativeInt(data?.rewardDiamonds),
        rewardPoints: ensureNonNegativeInt(data?.rewardPoints),
        startedAt: typeof data?.startedAt === 'number' ? data.startedAt : null,
        endedAt: typeof data?.endedAt === 'number' ? data.endedAt : null,
        lastSeason: data?.lastSeason || null
      };
      updateSeasonUI();
    },
    (error) => {
      console.warn('PVP 시즌 정보를 불러오지 못했습니다.', error);
    }
  );
}

async function startPvpSeason() {
  if ((state.user?.role || '').toLowerCase() !== 'admin') return;
  const gold = ensureNonNegativeInt(els.seasonRewardGoldInput?.value || 0);
  const diamonds = ensureNonNegativeInt(els.seasonRewardDiamondsInput?.value || 0);
  const points = ensureNonNegativeInt(els.seasonRewardPointsInput?.value || 0);
  if (gold <= 0 && points <= 0 && diamonds <= 0) {
    setSeasonAdminMessage('골드, 포인트, 다이아 중 하나 이상의 상금을 입력하세요.', 'warn');
    return;
  }
  if (state.season.status === 'active') {
    setSeasonAdminMessage('이미 시즌이 진행 중입니다.', 'warn');
    return;
  }
  try {
    const now = Date.now();
    const usersSnap = await get(ref(db, 'users'));
    const users = usersSnap.exists() ? usersSnap.val() : {};
    const updates = {
      pvpMatches: null,
      pvpRegistrations: null,
      'pvpSeason/status': 'active',
      'pvpSeason/startedAt': now,
      'pvpSeason/endedAt': null,
      'pvpSeason/rewardGold': gold,
      'pvpSeason/rewardDiamonds': diamonds,
      'pvpSeason/rewardPoints': points
    };
    const emptyStats = createEmptyPvpStats();
    Object.keys(users).forEach((uid) => {
      updates[`users/${uid}/pvpStats`] = { ...emptyStats };
    });
    await update(ref(db), updates);
    if (state.profile) state.profile.pvpStats = createEmptyPvpStats();
    state.registration = null;
    state.selectedOpponent = null;
    state.season.status = 'active';
    state.season.startedAt = now;
    state.season.endedAt = null;
    state.season.rewardGold = gold;
    state.season.rewardDiamonds = diamonds;
    state.season.rewardPoints = points;
    setSeasonAdminMessage('PVP 시즌을 선포했습니다.', 'ok');
    updateSeasonUI();
    updateRegistrationUI();
    await loadOpponents();
    populateStageForSelection(null);
    renderPersonalStats();
  } catch (error) {
    console.error('PVP 시즌 선포 실패', error);
    setSeasonAdminMessage('시즌 선포에 실패했습니다.', 'danger');
  }
}

async function endPvpSeason() {
  if ((state.user?.role || '').toLowerCase() !== 'admin') return;
  if (state.season.status !== 'active') {
    setSeasonAdminMessage('진행 중인 시즌이 없습니다.', 'warn');
    return;
  }
  setSeasonAdminMessage('시즌 종료 처리 중...', null);
  try {
    await loadOpponents();
    const usersSnap = await get(ref(db, 'users'));
    const users = usersSnap.exists() ? usersSnap.val() : {};
    const scoreboard = Array.isArray(state.scoreboard) ? state.scoreboard : [];
    const seen = new Set();
    const participants = [];
    scoreboard.forEach((entry) => {
      if (!entry || !entry.uid || seen.has(entry.uid)) return;
      const profile = users[entry.uid] || {};
      const stats = profile.pvpStats || {};
      const wins = ensureNumber(entry.wins ?? stats.wins);
      const losses = ensureNumber(entry.losses ?? stats.losses);
      const draws = ensureNumber(entry.draws ?? stats.draws);
      const matches = wins + losses + draws;
      if (matches <= 0) return;
      seen.add(entry.uid);
      participants.push({
        uid: entry.uid,
        displayName: entry.displayName || profile.username || `user-${entry.uid.slice(0, 4)}`,
        wins,
        losses,
        draws,
        matches
      });
    });
    Object.entries(users).forEach(([uid, profile]) => {
      if (seen.has(uid)) return;
      const stats = profile?.pvpStats || {};
      const wins = ensureNumber(stats.wins);
      const losses = ensureNumber(stats.losses);
      const draws = ensureNumber(stats.draws);
      const matches = wins + losses + draws;
      if (matches <= 0) return;
      seen.add(uid);
      participants.push({
        uid,
        displayName: profile?.username || `user-${uid.slice(0, 4)}`,
        wins,
        losses,
        draws,
        matches
      });
    });
    participants.sort((a, b) => {
      const scoreA = a.wins - a.losses;
      const scoreB = b.wins - b.losses;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.matches !== a.matches) return b.matches - a.matches;
      return (a.displayName || '').localeCompare(b.displayName || '', 'ko-KR', { sensitivity: 'base' });
    });
    if (participants.length === 0) {
      const updates = {
        pvpMatches: null,
        pvpRegistrations: null,
        'pvpSeason/status': 'idle',
        'pvpSeason/endedAt': Date.now()
      };
      updates['pvpSeason/rewardGold'] = ensureNonNegativeInt(state.season.rewardGold || 0);
      updates['pvpSeason/rewardDiamonds'] = ensureNonNegativeInt(state.season.rewardDiamonds || 0);
      updates['pvpSeason/rewardPoints'] = ensureNonNegativeInt(state.season.rewardPoints || 0);
      Object.keys(users).forEach((uid) => {
        updates[`users/${uid}/pvpStats`] = { ...createEmptyPvpStats() };
      });
      await update(ref(db), updates);
      if (state.profile) state.profile.pvpStats = createEmptyPvpStats();
      state.registration = null;
      state.selectedOpponent = null;
      state.season.status = 'idle';
      state.season.endedAt = updates['pvpSeason/endedAt'];
      state.season.rewardDiamonds = ensureNonNegativeInt(state.season.rewardDiamonds || 0);
      updateSeasonUI();
      renderPersonalStats();
      updateRegistrationUI();
      setSeasonAdminMessage('참가자가 없어 시즌을 종료했습니다.', 'warn');
      setLoadingState('시즌이 종료되었습니다. 새로운 시즌을 기다려주세요.');
      await loadOpponents();
      populateStageForSelection(null);
      return;
    }

    const now = Date.now();

    const goldRewards = allocateSeasonTotals(state.season.rewardGold || 0, participants.length);
    const diamondRewards = allocateSeasonTotals(state.season.rewardDiamonds || 0, participants.length);
    const pointRewards = allocateSeasonTotals(state.season.rewardPoints || 0, participants.length);

    const updates = {
      pvpMatches: null,
      pvpRegistrations: null,
      'pvpSeason/status': 'idle',
      'pvpSeason/endedAt': now,
      'pvpSeason/rewardGold': ensureNonNegativeInt(state.season.rewardGold || 0),
      'pvpSeason/rewardDiamonds': ensureNonNegativeInt(state.season.rewardDiamonds || 0),
      'pvpSeason/rewardPoints': ensureNonNegativeInt(state.season.rewardPoints || 0)
    };

    const resetStats = createEmptyPvpStats();
    const rewardRecords = [];

    participants.forEach((participant, index) => {
      const uid = participant.uid;
      const displayName = participant.displayName || (users[uid]?.username) || `user-${uid.slice(0, 4)}`;
      const goldAward = ensureNonNegativeInt(goldRewards[index] || 0);
      const diamondAward = ensureNonNegativeInt(diamondRewards[index] || 0);
      const pointAward = ensureNonNegativeInt(pointRewards[index] || 0);
      if (index < 2) {
        rewardRecords.push({
          placement: index + 1,
          uid,
          displayName,
          gold: goldAward,
          diamonds: diamondAward,
          points: pointAward,
          wins: participant.wins,
          losses: participant.losses,
          draws: participant.draws
        });
      }
      updates[`users/${uid}/pvpStats`] = { ...resetStats };
    });

    Object.keys(users).forEach((uid) => {
      if (!updates[`users/${uid}/pvpStats`]) {
        updates[`users/${uid}/pvpStats`] = { ...resetStats };
      }
    });

    updates['pvpSeason/lastSeason'] = {
      endedAt: now,
      rewardGold: ensureNonNegativeInt(state.season.rewardGold || 0),
      rewardDiamonds: ensureNonNegativeInt(state.season.rewardDiamonds || 0),
      rewardPoints: ensureNonNegativeInt(state.season.rewardPoints || 0),
      winners: rewardRecords
    };

    await update(ref(db), updates);

    await Promise.all(
      participants.map(async (participant, index) => {
        const goldAward = ensureNonNegativeInt(goldRewards[index] || 0);
        const diamondAward = ensureNonNegativeInt(diamondRewards[index] || 0);
        const pointAward = ensureNonNegativeInt(pointRewards[index] || 0);
        if (goldAward <= 0 && pointAward <= 0 && diamondAward <= 0) return;
        const title = `PVP 시즌 ${index + 1}위 보상`;
        const rewards = {};
        if (goldAward > 0) rewards.gold = goldAward;
        if (diamondAward > 0) rewards.diamonds = diamondAward;
        if (pointAward > 0) rewards.points = pointAward;
        const rewardParts = [];
        if (goldAward > 0) rewardParts.push(`골드 ${formatNum(goldAward)}`);
        if (diamondAward > 0) rewardParts.push(`다이아 ${formatNum(diamondAward)}`);
        if (pointAward > 0) rewardParts.push(`포인트 ${formatNum(pointAward)}`);
        const message = `이번 시즌 ${index + 1}위를 달성했습니다.
보상: ${rewardParts.join(', ')}`;
        try {
          await enqueueMail(participant.uid, {
            title,
            message,
            rewards,
            type: 'pvp_reward',
            metadata: {
              placement: index + 1,
              seasonEndedAt: now
            }
          });
        } catch (error) {
          console.error('시즌 보상 우편 발송 실패', error);
        }
      })
    );

    if (state.profile) state.profile.pvpStats = createEmptyPvpStats();
    state.registration = null;
    state.selectedOpponent = null;
    state.season.status = 'idle';
    state.season.endedAt = now;
    state.season.lastSeason = updates['pvpSeason/lastSeason'];
    setSeasonAdminMessage('시즌을 종료하고 보상을 지급했습니다.', 'ok');
    setLoadingState('시즌이 종료되었습니다. 새로운 시즌을 기다려주세요.');
    updateSeasonUI();
    renderPersonalStats();
    updateRegistrationUI();
    await loadOpponents();
    populateStageForSelection(null);
  } catch (error) {
    console.error('PVP 시즌 종료 실패', error);
    setSeasonAdminMessage('시즌 종료 중 오류가 발생했습니다.', 'danger');
  }
}

async function loadOpponents() {
  const [usersSnap, registrationsSnap] = await Promise.all([
    get(ref(db, 'users')),
    get(ref(db, 'pvpRegistrations'))
  ]);
  const users = usersSnap.exists() ? usersSnap.val() : {};
  const registrations = registrationsSnap.exists() ? registrationsSnap.val() : {};
  const myUid = state.user.uid;
  const opponents = [];
  const scoreboard = [];
  const previousSelection = state.selectedOpponent?.uid || null;

  Object.entries(registrations).forEach(([uid, rawReg]) => {
    const profile = users[uid] || {};
    const fallbackName = rawReg?.displayName || profile.username || `user-${uid.slice(0, 4)}`;
    const normalized = normalizeRegistration(rawReg, uid, fallbackName);
    if (!normalized) return;
    const pvpStats = profile.pvpStats || createEmptyPvpStats();
    if (uid === myUid) {
      state.registration = normalized;
    } else {
      opponents.push({
        uid,
        displayName: normalized.displayName,
        registration: normalized,
        rawStats: pvpStats,
        power: normalized.power
      });
    }
    scoreboard.push({
      uid,
      displayName: normalized.displayName,
      wins: ensureNumber(pvpStats.wins),
      losses: ensureNumber(pvpStats.losses),
      draws: ensureNumber(pvpStats.draws),
      power: normalized.power
    });
  });

  const myStats = state.profile?.pvpStats || createEmptyPvpStats();
  if (!scoreboard.some((entry) => entry.uid === myUid) && state.user) {
    const displayName = state.user.username || `user-${myUid.slice(0, 4)}`;
    const powerGuess = state.registration?.power || (state.playerStats ? combatPower(state.playerStats.stats || {}) : 0);
    scoreboard.push({
      uid: myUid,
      displayName,
      wins: ensureNumber(myStats.wins),
      losses: ensureNumber(myStats.losses),
      draws: ensureNumber(myStats.draws),
      power: powerGuess
    });
  }

  opponents.sort((a, b) => (b.power || 0) - (a.power || 0));
  scoreboard.sort((a, b) => {
    const scoreA = a.wins - a.losses;
    const scoreB = b.wins - b.losses;
    if (scoreA === scoreB) return (b.wins || 0) - (a.wins || 0);
    return scoreB - scoreA;
  });

  state.opponents = opponents;
  state.scoreboard = scoreboard;
  renderOpponents(opponents);
  renderRanking(scoreboard);
  updateRegistrationUI();

  if (previousSelection) {
    selectOpponent(previousSelection);
  } else {
    populateStageForSelection(null);
  }
}

async function hydrateProfile(firebaseUser) {
  const snapshot = await get(ref(db, `users/${firebaseUser.uid}`));
  const profile = snapshot.exists() ? snapshot.val() : null;
  if (!profile) throw new Error('사용자 프로필을 찾을 수 없습니다.');
  const equip = sanitizeEquipMap(profile.equip);
  const enhance = sanitizeEnhanceConfig(profile.enhance);
  const items = sanitizeItems(profile.items);
  const pets = sanitizePetState(profile.pets);
  const characters = sanitizeCharacterState(profile.characters);
  const config = sanitizeConfig(profile.config);
  const globalConfig = await fetchGlobalConfig();
  const effectiveConfig = globalConfig || config;
  const combatPrefs = {
    ...profile.combat,
    autoPotion: profile.combat?.autoPotion === true,
    autoHyper: profile.combat?.autoHyper === true
  };
  const defaultCharacters = createDefaultCharacterState();
  const activeCharacterId = characters?.active || defaultCharacters.active;

  // 캐릭터 강화 레벨 가져오기
  const baseStats = characterBaseStats(activeCharacterId) || {};
  const enhancements = characters?.enhancements || {};
  const enhancement = enhancements[activeCharacterId] || { level: 0, progress: 0 };
  const characterEnhancementLevel = typeof enhancement.level === 'number' && isFinite(enhancement.level)
    ? Math.max(0, Math.floor(enhancement.level))
    : 0;

  const activePetId = pets.active || null;
  const characterDef = getCharacterDefinition(activeCharacterId) || null;
  const derived = derivePlayerStats(
    equip,
    enhance,
    { ...baseStats },
    activePetId,
    {
      balance: effectiveConfig.characterBalance,
      characterId: activeCharacterId,
      classId: characterDef?.classId,
      character: characterDef,
      characterEnhancementLevel
    }
  );
  const displayName = profile.username || firebaseUser.email || firebaseUser.uid;
  const roleValue = (profile.role || 'user').toLowerCase() === 'admin' ? 'admin' : (profile.role || 'user');
  state.user = {
    uid: firebaseUser.uid,
    username: displayName,
    email: firebaseUser.email || '',
    role: roleValue
  };
  state.profile = {
    ...profile,
    equip,
    enhance,
    items,
    pets,
    characters,
    combat: combatPrefs,
    role: roleValue,
    pvpStats: profile.pvpStats || createEmptyPvpStats()
  };
  state.profile.config = effectiveConfig;
  state.config = effectiveConfig;
  state.playerStats = {
    stats: derived.stats,
    equipment: derived.equipment,
    displayName,
    combat: combatPrefs,
    pet: derived.pet || null,
    characterId: activeCharacterId,
    character: characterDef,
    power: combatPower(derived.stats),
    skillMultiplier: typeof derived.skillMultiplier === 'number' && isFinite(derived.skillMultiplier) && derived.skillMultiplier > 0
      ? derived.skillMultiplier
      : 1
  };
  renderEquipment(els.playerEquipment, state.playerStats.equipment);
  renderStats(els.playerStats, state.playerStats.stats);
  renderPersonalStats();
  if (els.whoami) els.whoami.textContent = `${displayName}`;
  if (els.resetPvpBtn) {
    const isAdminRole = (state.user.role || '').toLowerCase() === 'admin';
    els.resetPvpBtn.style.display = isAdminRole ? 'inline-flex' : 'none';
  }
  updateSeasonUI();
}

function setLoadingState(msg) {
  clearBattleLog();
  if (!els.battleLog) return;
  const div = document.createElement('div');
  div.className = 'muted';
  div.textContent = msg;
  els.battleLog.appendChild(div);
}

function initEventListeners() {
  els.toGacha?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  els.toBattle?.addEventListener('click', () => {
    window.location.href = 'battle.html';
  });
  els.logout?.addEventListener('click', async () => {
    await signOut(auth);
  });
  els.challengeBtn?.addEventListener('click', challengeSelectedOpponent);
  els.resetPvpBtn?.addEventListener('click', resetPvpData);
  els.registerBtn?.addEventListener('click', registerForPvp);
  els.unregisterBtn?.addEventListener('click', unregisterFromPvp);
  els.seasonStartBtn?.addEventListener('click', startPvpSeason);
  els.seasonEndBtn?.addEventListener('click', endPvpSeason);
}

updateSeasonUI();
subscribeSeason();

onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    window.location.href = 'login.html';
    return;
  }
  try {
    setLoadingState('데이터를 불러오는 중...');
    await hydrateProfile(firebaseUser);
    await loadOpponents();
    if (state.season.status !== 'active') {
      setLoadingState('시즌이 대기 중입니다. 관리자 선포를 기다려주세요.');
    } else if (state.registration) {
      setLoadingState('도전할 상대를 선택하세요.');
    } else {
      setLoadingState('출전 등록 후 상대에게 도전할 수 있습니다.');
    }
  } catch (error) {
    console.error(error);
    setLoadingState('PVP 데이터를 불러오지 못했습니다.');
  }
});

initEventListeners();
