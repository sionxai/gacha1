import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  get,
  update,
  onValue
} from './firebase.js';
import {
  PART_DEFS,
  PART_ICONS,
  DEFAULT_DROP_RATES,
  DEFAULT_POTION_SETTINGS,
  DEFAULT_HYPER_POTION_SETTINGS,
  DEFAULT_MONSTER_SCALING,
  DEFAULT_DIFFICULTY_ADJUSTMENTS,
  clampNumber,
  sanitizeEquipMap,
  sanitizeItems,
  sanitizeEnhanceConfig,
  normalizeGoldScaling,
  normalizeMonsterScaling,
  sanitizeConfig,
  sanitizeDifficultyAdjustments,
  formatNum,
  formatMultiplier,
  computePlayerStats as derivePlayerStats,
  combatPower,
  calculateDamage,
  createDefaultPetState,
  sanitizePetState,
  getPetDefinition,
  describePetAbilities,
  createDefaultCharacterState,
  sanitizeCharacterState,
  getCharacterDefinition,
  getCharacterImageVariants,
  CHARACTER_ULTIMATE_DEFS,
  sanitizeUserSettings
} from './combat-core.js';
import {
  QUEST_LOOKUP,
  createDefaultQuestState,
  sanitizeQuestState
} from './quest-core.js';

const qs = (selector) => document.querySelector(selector);

const els = {
  whoami: qs('#whoamiBattle'),
  points: qs('#pointsBattle'),
  gold: qs('#goldBattle'),
  petTickets: qs('#petTicketBattle'),
  toGacha: qs('#toGacha'),
  toPvp: qs('#toPvp'),
  logout: qs('#logoutBtn'),
  playerEquipment: qs('#playerEquipment'),
  playerTotalStats: qs('#playerTotalStats'),
  playerPower: qs('#playerPower'),
  enemyPower: qs('#enemyPower'),
  winProbability: qs('#winProbability'),
  winProbIndicator: qs('#winProbIndicator'),
  playerHpBar: qs('#playerHpBar'),
  playerHpText: qs('#playerHpText'),
  enemyHpBar: qs('#enemyHpBar'),
  enemyHpText: qs('#enemyHpText'),
  playerAtk: qs('#playerAtk'),
  playerDef: qs('#playerDef'),
  playerCrit: qs('#playerCrit'),
  playerDodge: qs('#playerDodge'),
  enemyLevel: qs('#enemyLevel'),
  enemyAtk: qs('#enemyAtk'),
  enemyDef: qs('#enemyDef'),
  enemySpeed: qs('#enemySpeed'),
  playerSprite: qs('#playerSprite'),
  playerCharacterImage: qs('#playerCharacterImage'),
  monsterSprite: qs('#monsterSprite'),
  monsterSvg: qs('#monsterSvg'),
  battleLog: qs('#battleLog'),
  attackBtn: qs('#attackBtn'),
  defendBtn: qs('#defendBtn'),
  skillBtn: qs('#skillBtn'),
  potionBtn: qs('#potionBtn'),
  hyperPotionBtn: qs('#hyperPotionBtn'),
  newBattleBtn: qs('#newBattleBtn'),
  generateEquipBtn: qs('#generateEquipBtn'),
  autoPlayBtn: qs('#autoPlayBtn'),
  monsterLevel: qs('#monsterLevel'),
  levelDisplay: qs('#levelDisplay'),
  monsterLevelMinus: qs('#monsterLevelMinus'),
  monsterLevelPlus: qs('#monsterLevelPlus'),
  monsterLevelInput: qs('#monsterLevelInput'),
  skillCooldownView: qs('#skillCooldownView'),
  potionStock: qs('#potionStock'),
  hyperPotionStock: qs('#hyperPotionStock'),
  battleResToggle: qs('#battleResToggle'),
  autoPotionToggle: qs('#autoPotionToggle'),
  autoHyperToggle: qs('#autoHyperToggle'),
  battleResCount: qs('#battleResCount'),
  battleResInline: qs('#battleResInline'),
  holyWaterStock: qs('#holyWaterStock'),
  speedStatus: qs('#speedStatus'),
  autoStatsPanel: qs('#autoStatsPanel'),
  autoStatsDuration: qs('#autoStatsDuration'),
  autoStatsBattles: qs('#autoStatsBattles'),
  autoStatsPoints: qs('#autoStatsPoints'),
  autoStatsGold: qs('#autoStatsGold'),
  autoStatsEnhance: qs('#autoStatsEnhance'),
  autoStatsPotion: qs('#autoStatsPotion'),
  autoStatsHyperPotion: qs('#autoStatsHyperPotion'),
  autoStatsProtect: qs('#autoStatsProtect'),
  autoStatsBattleRes: qs('#autoStatsBattleRes'),
  difficultyButtons: qs('#difficultyButtons'),
  difficultyStatus: qs('#difficultyStatus'),
  autoTimerStatus: qs('#autoTimerStatus'),
  hellStatus: qs('#hellStatus'),
  holyWaterPreloadStatus: qs('#holyWaterPreloadStatus'),
  timeAccelStatus: qs('#timeAccelStatus'),
  useHolyWaterBtn: qs('#useHolyWaterBtn'),
  adminTimeAccelBtn: qs('#adminTimeAccelBtn'),
  bossList: qs('#bossList'),
  startBossBtn: qs('#startBossBtn'),
  resetBossSelection: qs('#resetBossSelection'),
  bossInfo: qs('#bossInfo'),
  petCompanion: qs('#petCompanion'),
  petCompanionImg: qs('#petCompanionImg'),
  bossIntroOverlay: qs('#bossIntroOverlay'),
  bossIntroVideo: qs('#bossIntroVideo'),
  bossIntroVideoWrap: qs('#bossIntroVideoWrap'),
  bossIntroTitle: qs('#bossIntroTitle'),
  bossIntroSkip: qs('#bossIntroSkip'),
  tigerKillOverlay: qs('#tigerKillOverlay'),
  tigerKillImage: qs('#tigerKillImage'),
  ultimateOverlay: qs('#ultimateOverlay'),
  ultimateTitle: qs('#ultimateTitle'),
  ultimateGifWrap: qs('#ultimateGifWrap'),
  ultimateGif: qs('#ultimateGif'),
  characterGifToggle: qs('#battleCharacterGifToggle'),
  petGifToggle: qs('#battlePetGifToggle')
};

const CHARACTER_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2210%22%20ry%3D%2210%22%20fill%3D%22%23d0d0d0%22/%3E%3Cpath%20d%3D%22M32%2018a10%2010%200%201%201%200%2020a10%2010%200%200%201%200-20zm0%2024c10.5%200%2019%206.3%2019%2014v4H13v-4c0-7.7%208.5-14%2019-14z%22%20fill%3D%22%23808080%22/%3E%3C/svg%3E';

function applyCharacterImageFallback(img, sources) {
  if (!(img instanceof HTMLImageElement)) return;
  img.onerror = null;
  const list = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const unique = Array.from(new Set(list));
  let index = 0;
  const applyNext = () => {
    while (index < unique.length) {
      const candidate = unique[index++];
      if (candidate) {
        img.src = candidate;
        return;
      }
    }
    img.onerror = null;
    img.src = CHARACTER_IMAGE_PLACEHOLDER;
  };
  const handleError = () => {
    applyNext();
  };
  img.onerror = handleError;
  if (unique.length === 0) {
    img.src = CHARACTER_IMAGE_PLACEHOLDER;
    return;
  }
  applyNext();
}

const MAX_LEVEL = 999;
const GLOBAL_CONFIG_PATH = 'config/global';
const AUTO_DROP_KEYS = ['enhance', 'potion', 'hyperPotion', 'protect', 'battleRes'];
const AUTO_DROP_LABELS = {
  enhance: '강화권',
  potion: '가속 물약',
  hyperPotion: '초 가속 물약',
  protect: '보호권',
  battleRes: '전투부활권'
};

const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];
const DIFFICULTY_PRESETS = {
  easy: { id: 'easy', label: '이지', rewardMultiplier: 1, defaultPercent: DEFAULT_DIFFICULTY_ADJUSTMENTS.easy },
  normal: { id: 'normal', label: '노멀', rewardMultiplier: 3, defaultPercent: 0 },
  hard: { id: 'hard', label: '하드', rewardMultiplier: 5, defaultPercent: DEFAULT_DIFFICULTY_ADJUSTMENTS.hard }
};

const AUTO_BASE_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours
const AUTO_HELL_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const HOLY_WATER_EXTENSION_MS = 60 * 60 * 1000; // 1 hour per item
const HOLY_WATER_MAX_PRELOAD = 2;
const AUTO_STOP_REASON_LABELS = {
  manual: '사용자 중지',
  defeat: '패배',
  boss: '보스 도전',
  other: '중지'
};
const AUTO_SESSION_STORAGE_PREFIX = 'gacha:autoSession:';
const FIRST_BOSS_INTRO_VIDEO_URL = 'https://firebasestorage.googleapis.com/v0/b/gacha-870fa.firebasestorage.app/o/kling_20250920_Image_to_Video__3595_0.mp4?alt=media&token=6ab78f59-2753-4c22-bfd0-14d21739b6f0';
const TIGER_KILL_GIF_URL = 'https://firebasestorage.googleapis.com/v0/b/gacha-870fa.firebasestorage.app/o/new4.gif?alt=media&token=3d395ec5-a922-45e0-9486-524b0a3f07aa';
const ULTIMATE_TEXT_DURATION_MS = 1000;
const PLAYER_ULTIMATE_DEFAULT_CHANCE = 0.05;
const BOSS_IDS = ['boss150', 'boss300', 'boss450', 'boss550', 'boss800'];

const BOSS_UNLOCK_LEVELS = {
  boss150: 200,
  boss300: 400,
  boss450: 600,
  boss550: 800,
  boss800: 900
};

const PET_EFFECT_CLASSES = ['effect-kill', 'effect-guard', 'effect-reflect'];

const BOSS_CONFIG = {
  boss150: {
    id: 'boss150',
    level: 150,
    title: 'Lv.150 — 「해무의 도깨비 장수」',
    name: '해무의 도깨비 장수',
    stats: { hpScale: 6.5, atkScale: 1.2, defScale: 1.1 },
    drop: { firstTicket: 1, chance: 0.2 },
    summary: '연속 회피와 긴급 회복 패턴 대응'
  },
  boss300: {
    id: 'boss300',
    level: 300,
    title: 'Lv.300 — 「녹우 수호자」',
    name: '녹우 수호자',
    stats: { hpScale: 8, atkScale: 1.25, defScale: 1.2 },
    drop: { firstTicket: 1, chance: 0.28 },
    summary: '청동피갑 반사와 우레각인을 주의'
  },
  boss450: {
    id: 'boss450',
    level: 450,
    title: 'Lv.450 — 「염풍 산양왕」',
    name: '염풍 산양왕',
    stats: { hpScale: 9, atkScale: 1.35, defScale: 1.25 },
    drop: { firstTicket: 1, chance: 0.35 },
    summary: '모래눈보라와 갑옷파쇄에 대비'
  },
  boss550: {
    id: 'boss550',
    level: 550,
    title: 'Lv.550 — 「사막의 여왕 개미」',
    name: '사막의 여왕 개미',
    stats: { hpScale: 10, atkScale: 1.4, defScale: 1.3 },
    drop: { firstTicket: 1, chance: 0.42 },
    summary: '병정 소환과 왕실 코쿤으로 장기전 양상'
  },
  boss800: {
    id: 'boss800',
    level: 800,
    title: 'Lv.800 — 「호랑의 그림자」',
    name: '호랑의 그림자',
    stats: { hpScale: 12, atkScale: 1.55, defScale: 1.35 },
    drop: { firstTicket: 1, chance: 0.55 },
    summary: '무적과 반격 스택을 관리해야 합니다'
  }
};

const BOSS_IMAGE_MAP = {
  boss150: 'assets/boss/boss1.png',
  boss300: 'assets/boss/boss2.png',
  boss450: 'assets/boss/boss3.png',
  boss550: 'assets/boss/boss4.png',
  boss800: 'assets/boss/boss5.png'
};

const MONSTER_IMAGE_DIR = 'assets/xp';
const MONSTER_IMAGE_MAX_INDEX = 10;

const BOSS_BEHAVIORS = {
  boss150: {
    name: '해무 회복',
    chance: 0.35,
    cooldown: 2,
    execute: ({ state }) => {
      const healAmount = Math.max(1, Math.round(gameState.enemy.maxHp * 0.12));
      return {
        animation: 'attacking',
        delay: 320,
        pre() {
          addBattleLog('[보스] 해무의 장수가 안개를 두르고 기력을 회복합니다.', 'warn');
        },
        post() {
          const before = gameState.enemy.hp;
          gameState.enemy.hp = Math.min(gameState.enemy.maxHp, gameState.enemy.hp + healAmount);
          const healed = Math.max(0, gameState.enemy.hp - before);
          if (healed > 0) {
            addBattleLog(`[보스 스킬] 해무 회복! ${formatNum(healed)} 체력 회복`, 'heal');
          }
          applyBossDodgeBuff(state, 18, 2);
        }
      };
    }
  },
  boss300: {
    name: '우레각인',
    chance: 0.3,
    cooldown: 3,
    execute: ({ state }) => {
      return {
        animation: 'attacking',
        delay: 360,
        pre() {
          addBattleLog('[보스] 청동피갑이 번쩍이며 우레각인이 발동됩니다!', 'warn');
        },
        post() {
          const result = calculateDamage(getEnemyOffensiveStats(), getPlayerDefensiveStats(), true);
          let damage = result.damage;
          if (!damage || result.type === 'MISS') {
            damage = Math.max(1, Math.round(gameState.enemy.stats.atk * 1.6));
          }
          triggerAnimation('playerSprite', 'hurt');
          const dealt = applyDamageToPlayer(damage, { source: 'bossSkill', critical: true });
          addBattleLog(`[보스 스킬] 우레각인! ${formatNum(dealt)} 피해`, 'critical');
          state.reflectHits = Math.max(state.reflectHits || 0, 2);
          state.reflectRatio = Math.max(state.reflectRatio || 0.25, 0.25);
          addBattleLog('[보스] 청동피갑 반격이 활성화됐습니다. (2회)', 'warn');
        }
      };
    }
  },
  boss450: {
    name: '모래눈보라',
    chance: 0.28,
    cooldown: 3,
    execute: ({ state }) => {
      return {
        animation: 'attacking',
        delay: 360,
        pre() {
          addBattleLog('[보스] 모래눈보라가 몰아치며 갑옷 파쇄를 준비합니다!', 'warn');
        },
        post() {
          const result = calculateDamage(getEnemyOffensiveStats(), getPlayerDefensiveStats(), true);
          let damage = result.damage;
          const crit = result.type === 'CRITICAL';
          if (!damage || result.type === 'MISS') {
            damage = Math.max(1, Math.round(gameState.enemy.stats.atk * 1.45));
          }
          triggerAnimation('playerSprite', 'hurt');
          const dealt = applyDamageToPlayer(damage, { source: 'bossSkill', critical: crit });
          addBattleLog(`[보스 스킬] 모래눈보라! ${formatNum(dealt)} 피해`, 'critical');
          applyPlayerArmorBreak(state, 0.2, 2);
        }
      };
    }
  },
  boss550: {
    name: '왕실 코쿤',
    chance: 0.26,
    cooldown: 4,
    execute: ({ state }) => {
      return {
        animation: 'attacking',
        delay: 300,
        pre() {
          addBattleLog('[보스] 여왕 개미가 왕실 코쿤을 전개합니다!', 'warn');
        },
        post() {
          const shieldValue = Math.max(1, Math.round(gameState.enemy.maxHp * 0.18));
          applyBossShield(state, shieldValue, 3);
        }
      };
    }
  },
  boss800: {
    name: '그림자 포효',
    chance: 0.24,
    cooldown: 4,
    execute: ({ state }) => {
      return {
        animation: 'attacking',
        delay: 380,
        pre() {
          addBattleLog('[보스] 호랑의 그림자가 응축되어 폭발합니다!', 'warn');
        },
        post() {
          const baseDamage = Math.max(1, Math.round(gameState.enemy.stats.atk * 2.2));
          triggerAnimation('playerSprite', 'hurt');
          const dealt = applyDamageToPlayer(baseDamage, { source: 'bossSkill', critical: true });
          addBattleLog(`[보스 스킬] 그림자 포효! ${formatNum(dealt)} 피해`, 'critical');
          applyBossEnrage(state, { atkBonusPct: 0.3, speedBonus: 12, turns: 2 });
          state.reflectHits = Math.max(state.reflectHits || 0, 1);
          state.reflectRatio = Math.max(state.reflectRatio || 0.35, 0.35);
          addBattleLog('[보스] 반격 자세! 다음 공격 시 강력한 반격이 가해집니다.', 'warn');
        }
      };
    }
  }
};

const USERNAME_NAMESPACE = '@gacha.local';

let detachGlobalConfigListener = null;

const state = {
  user: null,
  profile: null,
  config: null,
  items: null,
  equip: null,
  enhance: null,
  wallet: 0,
  gold: 0,
  combat: { useBattleRes: true, prefBattleRes: true, autoPotion: false, autoHyper: false },
  saveTimer: null,
  pendingUpdates: {},
  autoSessionDirty: false,
  autoSessionPersistTimer: null,
  buffs: { accelUntil: 0, accelMultiplier: 1, hyperUntil: 0, hyperMultiplier: 1 },
  autoNextTimer: null,
  autoPlayerTimer: null,
  buffTicker: null,
  autoStats: {
    active: false,
    battles: 0,
    points: 0,
    gold: 0,
    drops: { enhance: 0, potion: 0, hyperPotion: 0, protect: 0, battleRes: 0 },
    startTime: 0
  },
  timeAccel: { multiplier: 1, until: 0 },
  quests: createDefaultQuestState(),
  bossProgress: sanitizeBossProgress(null),
  battleProgress: sanitizeBattleProgress(null),
  difficultyState: sanitizeDifficultyState(null),
  autoSession: sanitizeAutoSession(null),
  pets: createDefaultPetState(),
  characters: createDefaultCharacterState(),
  settings: sanitizeUserSettings(null),
  selectedBossId: null,
  lastNormalLevel: 1,
  petEffectTimers: [],
  petEffectTimer: null,
  bossImageTimer: null,
  pendingBossIntro: null,
  tigerKillTimer: null,
  tigerKillPending: false,
  playerUltimateUsed: false,
  ultimateActive: false,
  ultimatePending: null,
  ultimateTimers: []
};

const gameState = {
  player: {
    hp: 0,
    maxHp: 0,
    equipment: [],
    totalStats: {},
    defending: false,
    skillCooldown: 0,
    skillMultiplier: 1,
    classId: 'warrior',
    character: null,
    activePet: null,
    petShield: 0,
    petAttackBonus: 0,
    petAttackMultiplier: 1,
    petCritBonus: 0,
    petTigerGuard: false,
    petTigerReflect: false
  },
  enemy: {
    level: 1,
    hp: 0,
    maxHp: 0,
    stats: {},
    baseStats: {},
    status: {},
    defending: false
  },
  battle: {
    turn: 0,
    isPlayerTurn: true,
    ongoing: false,
    autoPlay: false,
    lastLevel: 1,
    actionLock: false,
    bossFight: null
  }
};

const DEFAULT_CHARACTER_ID = createDefaultCharacterState().active;

function applyGlobalConfigSnapshot(raw) {
  if (!raw || typeof raw !== 'object') {
    return;
  }
  const payload = raw.config && typeof raw.config === 'object' ? raw.config : raw;
  const nextConfig = sanitizeConfig(payload);
  const prevMultiplier = state.config?.monsterScaling?.difficultyMultiplier;
  state.config = nextConfig;
  state.profile = state.profile || {};
  state.profile.config = nextConfig;
  state.config.monsterScaling = normalizeMonsterScaling(state.config.monsterScaling);
  const nextMultiplier = state.config.monsterScaling?.difficultyMultiplier ?? DEFAULT_MONSTER_SCALING.difficultyMultiplier;
  if (Number.isFinite(prevMultiplier) && Math.abs(prevMultiplier - nextMultiplier) > 1e-6) {
    addBattleLog(`전역 난이도 배율이 ${formatMultiplier(prevMultiplier)}× → ${formatMultiplier(nextMultiplier)}×로 변경되었습니다.`, 'warn');
  }
  updateEnemyStats(gameState.enemy.level || 1);
  updateDifficultyUi();
}

function attachGlobalConfigListener() {
  if (detachGlobalConfigListener) {
    detachGlobalConfigListener();
    detachGlobalConfigListener = null;
  }
  try {
    detachGlobalConfigListener = onValue(ref(db, GLOBAL_CONFIG_PATH), (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      applyGlobalConfigSnapshot(snapshot.val());
    }, (error) => {
      console.error('전역 설정 실시간 수신 실패', error);
    });
  } catch (error) {
    console.error('전역 설정 리스너 초기화 실패', error);
  }
}

function ensureCharacterState() {
  if (!state.characters || typeof state.characters !== 'object') {
    state.characters = createDefaultCharacterState();
  }
  if (!state.characters.owned || typeof state.characters.owned !== 'object') {
    state.characters.owned = createDefaultCharacterState().owned;
  }
  Object.keys(createDefaultCharacterState().owned).forEach((id) => {
    if (typeof state.characters.owned[id] !== 'number' || !isFinite(state.characters.owned[id])) {
      state.characters.owned[id] = 0;
    }
  });
  if (DEFAULT_CHARACTER_ID && (state.characters.owned[DEFAULT_CHARACTER_ID] || 0) <= 0) {
    state.characters.owned[DEFAULT_CHARACTER_ID] = 1;
  }
  if (!state.characters.active || (state.characters.owned[state.characters.active] || 0) <= 0) {
    state.characters.active = DEFAULT_CHARACTER_ID;
  }
  return state.characters;
}

function getActiveCharacterId() {
  const characters = ensureCharacterState();
  return characters.active || DEFAULT_CHARACTER_ID;
}

function getActiveCharacterDefinition() {
  const id = getActiveCharacterId();
  return id ? getCharacterDefinition(id) : null;
}

function getActiveCharacterBaseStats() {
  const def = getActiveCharacterDefinition();
  if (def && def.stats) {
    return { ...def.stats };
  }
  return { atk: 0, def: 0, hp: 5000, critRate: 5, critDmg: 150, dodge: 5, speed: 100 };
}

function updatePlayerCharacterSprite() {
  ensureCharacterState();
  const imgEl = els.playerCharacterImage;
  if (!imgEl) return;
  const def = getActiveCharacterDefinition();
  const svg = els.playerSprite ? els.playerSprite.querySelector('svg') : null;
  if (def) {
    const sources = getCharacterImageVariants(def.id || getActiveCharacterId());
    if (def.image && !sources.includes(def.image)) {
      sources.unshift(def.image);
    }
    applyCharacterImageFallback(imgEl, sources);
    imgEl.alt = def.name || '캐릭터';
    imgEl.style.display = 'block';
    if (svg) svg.style.display = 'none';
  } else {
    imgEl.style.display = 'none';
    if (svg) svg.style.display = '';
  }
}
function sanitizeUsername(raw, fallback) {
  if (typeof raw === 'string' && raw.trim().length) {
    return raw.trim();
  }
  return fallback || '';
}

function deriveUsernameFromUser(firebaseUser) {
  if (!firebaseUser) return '';
  const email = firebaseUser.email || '';
  if (email.endsWith(USERNAME_NAMESPACE)) {
    return email.slice(0, -USERNAME_NAMESPACE.length);
  }
  const at = email.indexOf('@');
  if (at > 0) {
    return email.slice(0, at);
  }
  return email || firebaseUser.displayName || '';
}

function sanitizeBossProgress(raw) {
  const progress = {};
  BOSS_IDS.forEach((id) => {
    const entry = raw && typeof raw === 'object' ? raw[id] : null;
    progress[id] = {
      clears: clampNumber(entry?.clears, 0, Number.MAX_SAFE_INTEGER, 0),
      firstRewardClaimed: !!(entry && entry.firstRewardClaimed),
      introShown: !!(entry && entry.introShown)
    };
  });
  return progress;
}

function sanitizeBattleProgress(raw) {
  const progress = { highestLevel: 1, lastLevel: 1 };
  if (raw && typeof raw === 'object') {
    progress.highestLevel = clampNumber(raw.highestLevel, 1, MAX_LEVEL, 1);
    const fallback = progress.highestLevel || 1;
    progress.lastLevel = clampNumber(raw.lastLevel, 1, MAX_LEVEL, fallback);
  }
  if (progress.lastLevel < 1 || !Number.isFinite(progress.lastLevel)) {
    progress.lastLevel = 1;
  }
  return progress;
}

function createDefaultDifficultyState() {
  const progress = {};
  DIFFICULTY_ORDER.forEach((id) => {
    progress[id] = { highest: 1 };
  });
  return {
    unlocked: { easy: true, normal: false, hard: false },
    manualSelection: 'easy',
    progress
  };
}

function sanitizeDifficultyState(raw) {
  const defaults = createDefaultDifficultyState();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const unlocked = { ...defaults.unlocked };
  DIFFICULTY_ORDER.forEach((id) => {
    unlocked[id] = raw.unlocked && typeof raw.unlocked === 'object' ? !!raw.unlocked[id] : unlocked[id];
  });
  const manual = typeof raw.manualSelection === 'string' && DIFFICULTY_ORDER.includes(raw.manualSelection)
    ? raw.manualSelection
    : defaults.manualSelection;
  const progress = {};
  DIFFICULTY_ORDER.forEach((id) => {
    const source = raw.progress && raw.progress[id];
    const highest = clampNumber(source?.highest, 1, MAX_LEVEL, defaults.progress[id].highest);
    progress[id] = { highest };
  });
  return { unlocked, manualSelection: manual, progress };
}

function createDefaultAutoSession() {
  return {
    accumulatedMs: 0,
    lastUpdate: 0,
    preloaded: 0,
    hellActive: false,
    hellStartedAt: 0,
    hellEndsAt: 0,
    forcedDifficulty: null
  };
}

function sanitizeAutoSession(raw) {
  const defaults = createDefaultAutoSession();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  return {
    accumulatedMs: clampNumber(raw.accumulatedMs, 0, Number.MAX_SAFE_INTEGER, defaults.accumulatedMs),
    lastUpdate: clampNumber(raw.lastUpdate, 0, Number.MAX_SAFE_INTEGER, defaults.lastUpdate),
    preloaded: clampNumber(raw.preloaded, 0, HOLY_WATER_MAX_PRELOAD, defaults.preloaded),
    hellActive: !!raw.hellActive,
    hellStartedAt: clampNumber(raw.hellStartedAt, 0, Number.MAX_SAFE_INTEGER, defaults.hellStartedAt),
    hellEndsAt: clampNumber(raw.hellEndsAt, 0, Number.MAX_SAFE_INTEGER, defaults.hellEndsAt),
    forcedDifficulty: DIFFICULTY_ORDER.includes(raw.forcedDifficulty) ? raw.forcedDifficulty : null
  };
}

function setLastNormalLevel(level, options = {}) {
  const lvl = clampMonsterLevel(level);
  if (!state.battleProgress) {
    state.battleProgress = sanitizeBattleProgress(null);
  }
  const prev = state.battleProgress.lastLevel || state.lastNormalLevel;
  state.lastNormalLevel = lvl;
  if (state.battleProgress.lastLevel !== lvl) {
    state.battleProgress.lastLevel = lvl;
  }
  if (state.profile) {
    state.profile.battleProgress = { ...state.battleProgress };
  }
  if (options.persist === false || prev === lvl) {
    return;
  }
  queueProfileUpdate({ battleProgress: { ...state.battleProgress } });
}

function getHighestClearedLevel() {
  if (state.user?.role === 'admin') return MAX_LEVEL;
  return clampNumber(state.battleProgress?.highestLevel, 1, MAX_LEVEL, 1);
}

function registerLevelClear(level) {
  const lvl = clampMonsterLevel(level);
  if (!state.battleProgress) state.battleProgress = sanitizeBattleProgress(null);
  if (lvl <= (state.battleProgress.highestLevel || 1)) return;
  state.battleProgress.highestLevel = lvl;
  if (state.profile) {
    state.profile.battleProgress = { ...state.battleProgress };
  }
  queueProfileUpdate({ battleProgress: { ...state.battleProgress } });
  updateBossUi();
}

function difficultyConfig(id) {
  const preset = DIFFICULTY_PRESETS[id] || DIFFICULTY_PRESETS.easy;
  const adjustments = sanitizeDifficultyAdjustments(state.config?.difficultyAdjustments);
  if (!state.config.difficultyAdjustments || state.config.difficultyAdjustments.easy !== adjustments.easy || state.config.difficultyAdjustments.hard !== adjustments.hard) {
    state.config.difficultyAdjustments = adjustments;
  }
  const percent = preset.id === 'easy' ? adjustments.easy : (preset.id === 'hard' ? adjustments.hard : 0);
  const ratio = Math.max(0.05, 1 + percent / 100);
  return {
    id: preset.id,
    label: preset.label,
    rewardMultiplier: preset.rewardMultiplier,
    percent,
    difficultyMultiplier: ratio
  };
}

function difficultyLabel(id) {
  return difficultyConfig(id).label || id;
}

function getManualDifficulty() {
  if (state.user?.role === 'admin') return state.difficultyState?.manualSelection || 'easy';
  return state.difficultyState?.manualSelection || 'easy';
}

function isDifficultyUnlocked(id) {
  if (state.user?.role === 'admin') return true;
  return !!(state.difficultyState?.unlocked?.[id]);
}

function getActiveDifficulty() {
  const forced = state.autoSession?.hellActive && state.autoSession?.forcedDifficulty;
  return forced || getManualDifficulty();
}

function computeNextDifficulty(current) {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  if (idx < 0) return 'normal';
  const nextIdx = Math.min(DIFFICULTY_ORDER.length - 1, idx + 1);
  return DIFFICULTY_ORDER[nextIdx] || 'hard';
}

function setManualDifficulty(id, { silent } = {}) {
  if (!DIFFICULTY_ORDER.includes(id)) return;
  if (!isDifficultyUnlocked(id)) {
    if (!silent) addBattleLog(`[난이도] ${difficultyLabel(id)} 난이도는 아직 해금되지 않았습니다.`, 'warn');
    updateDifficultyUi();
    return;
  }
  if (!state.difficultyState) state.difficultyState = sanitizeDifficultyState(null);
  if (state.difficultyState.manualSelection === id) {
    updateDifficultyUi();
    return;
  }
  state.difficultyState.manualSelection = id;
  persistDifficultyState();
  addBattleLog(`[난이도] ${difficultyLabel(id)} 난이도로 전환합니다.`, 'warn');
  updateDifficultyUi();
  updateEnemyStats(gameState.enemy.level || 1);
  updateAutoSessionUi();
}

function unlockDifficulty(id) {
  if (!state.difficultyState) state.difficultyState = sanitizeDifficultyState(null);
  if (!DIFFICULTY_ORDER.includes(id)) return;
  if (state.difficultyState.unlocked[id]) return;
  state.difficultyState.unlocked[id] = true;
  persistDifficultyState();
  addBattleLog(`[난이도] ${difficultyLabel(id)} 난이도가 해금되었습니다!`, 'heal');
  updateDifficultyUi();
}

function recordDifficultyProgress(difficultyId, level) {
  if (!state.difficultyState) state.difficultyState = sanitizeDifficultyState(null);
  if (!DIFFICULTY_ORDER.includes(difficultyId)) return;
  const progress = state.difficultyState.progress[difficultyId] || { highest: 1 };
  if (level > (progress.highest || 1)) {
    progress.highest = level;
    state.difficultyState.progress[difficultyId] = progress;
    persistDifficultyState();
  }
  if (level >= 999) {
    if (difficultyId === 'easy') {
      unlockDifficulty('normal');
    } else if (difficultyId === 'normal') {
      unlockDifficulty('hard');
    }
  }
}

function bossUnlockRequirement(bossId) {
  if (!bossId) return null;
  return typeof BOSS_UNLOCK_LEVELS[bossId] === 'number' ? BOSS_UNLOCK_LEVELS[bossId] : null;
}

function isBossUnlocked(bossId) {
  if (!bossId || !BOSS_IDS.includes(bossId)) return false;
  if (state.user?.role === 'admin') return true;
  const required = bossUnlockRequirement(bossId);
  if (!required) return true;
  return getHighestClearedLevel() >= required;
}

function getBossConfig(bossId) {
  if (!bossId) return null;
  return BOSS_CONFIG[bossId] || null;
}

function getBossProgress(bossId) {
  if (!bossId) return null;
  const entry = state.bossProgress?.[bossId];
  if (entry) return entry;
  state.bossProgress[bossId] = { clears: 0, firstRewardClaimed: false, introShown: false };
  return state.bossProgress[bossId];
}

function shouldShowBossIntro(boss) {
  if (!boss) return false;
  if (boss.id !== 'boss150') return false;
  const progress = getBossProgress(boss.id);
  return !progress.introShown;
}

function markBossIntroSeen(bossId) {
  if (!bossId) return;
  const progress = getBossProgress(bossId);
  if (progress.introShown) return;
  progress.introShown = true;
  if (state.profile) {
    state.profile.bossProgress = JSON.parse(JSON.stringify(state.bossProgress));
  }
  queueProfileUpdate({ bossProgress: state.bossProgress });
}

function detachBossIntroListeners() {
  if (!state.pendingBossIntro || !Array.isArray(state.pendingBossIntro.listeners)) return;
  if (!els.bossIntroVideo) return;
  state.pendingBossIntro.listeners.forEach(({ event, handler }) => {
    try {
      els.bossIntroVideo.removeEventListener(event, handler);
    } catch {
      // ignore removal errors
    }
  });
  state.pendingBossIntro.listeners.length = 0;
}

function teardownBossIntroOverlay() {
  detachBossIntroListeners();
  if (els.bossIntroVideo) {
    try { els.bossIntroVideo.pause(); } catch {}
    els.bossIntroVideo.removeAttribute('src');
    if (typeof els.bossIntroVideo.load === 'function') {
      try { els.bossIntroVideo.load(); } catch {}
    }
  }
  if (els.bossIntroVideoWrap) {
    els.bossIntroVideoWrap.classList.remove('visible');
  }
  if (els.bossIntroOverlay) {
    els.bossIntroOverlay.classList.remove('show', 'preloading', 'is-ready');
    els.bossIntroOverlay.hidden = true;
  }
  document.body.classList.remove('boss-intro-active');
}

function launchBossIntro(boss) {
  if (!els.bossIntroOverlay || !els.bossIntroVideo) {
    return false;
  }
  detachBossIntroListeners();
  state.pendingBossIntro = { bossId: boss.id, listeners: [] };
  document.body.classList.add('boss-intro-active');
  const overlay = els.bossIntroOverlay;
  const video = els.bossIntroVideo;
  const title = els.bossIntroTitle;
  const wrap = els.bossIntroVideoWrap;

  overlay.hidden = false;
  overlay.classList.remove('is-ready');
  overlay.classList.add('show', 'preloading');
  if (wrap) {
    wrap.classList.remove('visible');
  }
  if (title) {
    title.textContent = '첫번째 보스 등장!';
  }

  video.pause();
  try {
    video.removeAttribute('src');
    video.load();
  } catch {}
  video.preload = 'auto';
  video.src = FIRST_BOSS_INTRO_VIDEO_URL;
  video.currentTime = 0;

  const finalizeReady = () => {
    overlay.classList.remove('preloading');
    overlay.classList.add('is-ready');
    if (wrap) {
      wrap.classList.add('visible');
    }
    const playResult = video.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        // 자동 재생이 막혀도 사용자 조작 시 재생 가능
      });
    }
  };

  const handleCanPlay = () => {
    detachBossIntroListeners();
    finalizeReady();
  };

  const handleLoadedData = () => {
    if (!overlay.classList.contains('is-ready')) {
      detachBossIntroListeners();
      finalizeReady();
    }
  };

  const handleError = () => {
    detachBossIntroListeners();
    if (title) {
      title.textContent = '영상 로딩에 실패했습니다. 전투를 시작합니다...';
    }
    setTimeout(() => completeBossIntro(), 600);
  };

  video.addEventListener('canplaythrough', handleCanPlay);
  video.addEventListener('loadeddata', handleLoadedData);
  video.addEventListener('error', handleError);

  state.pendingBossIntro.listeners.push(
    { event: 'canplaythrough', handler: handleCanPlay },
    { event: 'loadeddata', handler: handleLoadedData },
    { event: 'error', handler: handleError }
  );

  return true;
}

function completeBossIntro() {
  const pending = state.pendingBossIntro;
  detachBossIntroListeners();
  teardownBossIntroOverlay();
  state.pendingBossIntro = null;
  if (!pending || !pending.bossId) return;
  markBossIntroSeen(pending.bossId);
  const boss = getBossConfig(pending.bossId);
  if (boss) {
    beginBossBattle(boss);
  }
}

function ensureBossState(bossContext) {
  if (!bossContext) return null;
  if (!bossContext.state) {
    bossContext.state = {
      skillCooldown: 0,
      dodgeBuffTurns: 0,
      dodgeBonusApplied: 0,
      armorBreakTurns: 0,
      armorBreakPenalty: 0,
      shieldHp: 0,
      shieldTurns: 0,
      reflectHits: 0,
      reflectRatio: 0,
      enrageTurns: 0,
      enrageAtkBonus: 0,
      enrageSpeedBonus: 0
    };
  }
  return bossContext.state;
}

function applyBossDodgeBuff(state, bonus, turns) {
  if (!state) return;
  removeBossDodgeBuff(state, true);
  const amount = Math.max(0, Math.round(bonus || 0));
  const duration = Math.max(0, Math.floor(turns || 0));
  if (amount <= 0 || duration <= 0) return;
  state.dodgeBuffTurns = duration;
  state.dodgeBonusApplied = amount;
  gameState.enemy.stats.dodge = Math.max(0, (gameState.enemy.stats.dodge || 0) + amount);
  addBattleLog(`[보스] 회피율이 ${formatNum(amount)}% 상승했습니다. (${duration}턴)`, 'warn');
  updateCombatPowerUI();
}

function removeBossDodgeBuff(state, silent = false) {
  if (!state) return;
  if (state.dodgeBonusApplied) {
    gameState.enemy.stats.dodge = Math.max(0, (gameState.enemy.stats.dodge || 0) - state.dodgeBonusApplied);
    state.dodgeBonusApplied = 0;
    if (!silent) addBattleLog('[보스] 회피 버프가 사라졌습니다.', 'warn');
    updateCombatPowerUI();
  }
  state.dodgeBuffTurns = 0;
}

function applyPlayerArmorBreak(state, percent, turns) {
  if (!state) return;
  removePlayerArmorBreak(state, true);
  const baseDef = gameState.player.totalStats.def || 0;
  const ratio = Math.max(0, Math.min(1, percent || 0));
  const penalty = Math.max(0, Math.round(baseDef * ratio));
  const duration = Math.max(0, Math.floor(turns || 0));
  if (penalty <= 0 || duration <= 0) return;
  state.armorBreakTurns = duration;
  state.armorBreakPenalty = penalty;
  gameState.player.totalStats.def = Math.max(0, baseDef - penalty);
  addBattleLog(`[보스] 방어력이 ${formatNum(penalty)} 감소했습니다. (${duration}턴)`, 'damage');
  renderTotalStats();
  updateCombatPowerUI();
}

function removePlayerArmorBreak(state, silent = false) {
  if (!state) return;
  if (state.armorBreakPenalty) {
    gameState.player.totalStats.def = Math.max(0, gameState.player.totalStats.def + state.armorBreakPenalty);
    state.armorBreakPenalty = 0;
    renderTotalStats();
    updateCombatPowerUI();
    if (!silent) addBattleLog('플레이어의 방어력 저하 효과가 해제되었습니다.', 'heal');
  }
  state.armorBreakTurns = 0;
}

function applyBossShield(state, shieldValue, turns) {
  if (!state) return;
  const amount = Math.max(0, Math.round(shieldValue || 0));
  const duration = Math.max(0, Math.floor(turns || 0));
  if (amount <= 0 || duration <= 0) return;
  state.shieldHp = Math.min(gameState.enemy.maxHp, (state.shieldHp || 0) + amount);
  state.shieldTurns = duration;
  addBattleLog(`[보스] 보호막 ${formatNum(amount)} 생성! (총 ${formatNum(state.shieldHp)} 유지)`, 'warn');
}

function applyBossEnrage(state, { atkBonusPct = 0, speedBonus = 0, turns = 0 } = {}) {
  if (!state) return;
  removeBossEnrage(state, true);
  const baseAtk = gameState.enemy.stats.atk || 0;
  const atkBonus = Math.max(0, Math.round(baseAtk * Math.max(0, atkBonusPct)));
  const speedAdd = Math.max(0, Math.round(speedBonus || 0));
  const duration = Math.max(0, Math.floor(turns || 0));
  if ((atkBonus <= 0 && speedAdd <= 0) || duration <= 0) return;
  state.enrageTurns = duration;
  state.enrageAtkBonus = atkBonus;
  state.enrageSpeedBonus = speedAdd;
  if (atkBonus > 0) gameState.enemy.stats.atk += atkBonus;
  if (speedAdd > 0) gameState.enemy.stats.speed = (gameState.enemy.stats.speed || 0) + speedAdd;
  addBattleLog(`[보스] 공격력 +${formatNum(atkBonus)} / 속도 +${formatNum(speedAdd)} 증가! (${duration}턴)`, 'warn');
  updateCombatPowerUI();
}

function removeBossEnrage(state, silent = false) {
  if (!state) return;
  let changed = false;
  if (state.enrageAtkBonus) {
    gameState.enemy.stats.atk = Math.max(1, gameState.enemy.stats.atk - state.enrageAtkBonus);
    state.enrageAtkBonus = 0;
    changed = true;
  }
  if (state.enrageSpeedBonus) {
    gameState.enemy.stats.speed = Math.max(1, (gameState.enemy.stats.speed || 0) - state.enrageSpeedBonus);
    state.enrageSpeedBonus = 0;
    changed = true;
  }
  state.enrageTurns = 0;
  if (changed) {
    if (!silent) addBattleLog('[보스] 분노 효과가 사라졌습니다.', 'warn');
    updateCombatPowerUI();
  }
}

function tickBossStateBeforeAction(bossContext) {
  if (!bossContext) return null;
  const state = ensureBossState(bossContext);
  if (state.skillCooldown > 0) {
    state.skillCooldown -= 1;
    if (state.skillCooldown < 0) state.skillCooldown = 0;
  }
  if (state.dodgeBuffTurns > 0) {
    state.dodgeBuffTurns -= 1;
    if (state.dodgeBuffTurns <= 0 && state.dodgeBonusApplied) {
      removeBossDodgeBuff(state);
    }
  }
  if (state.armorBreakTurns > 0) {
    state.armorBreakTurns -= 1;
    if (state.armorBreakTurns <= 0) {
      removePlayerArmorBreak(state);
    }
  }
  if (state.enrageTurns > 0) {
    state.enrageTurns -= 1;
    if (state.enrageTurns <= 0) {
      removeBossEnrage(state);
    }
  }
  if (state.shieldTurns > 0) {
    state.shieldTurns -= 1;
    if (state.shieldTurns <= 0 && state.shieldHp > 0) {
      state.shieldHp = 0;
      addBattleLog('[보스] 보호막이 사라졌습니다.', 'warn');
    }
  }
  return state;
}

function maybeExecuteBossSkill(bossContext, delayFn, postAction) {
  if (!bossContext) return false;
  const behavior = BOSS_BEHAVIORS[bossContext.id];
  if (!behavior) return false;
  const state = ensureBossState(bossContext);
  if (state.skillCooldown > 0) {
    return false;
  }
  const chance = Math.max(0, Math.min(1, behavior.chance ?? 0));
  if (Math.random() > chance) return false;
  const action = behavior.execute({ state, boss: bossContext });
  if (!action) return false;
  state.skillCooldown = Math.max(1, behavior.cooldown || 1);
  if (typeof action.pre === 'function') action.pre();
  const animation = action.animation === null ? null : action.animation || 'attacking';
  if (animation) {
    triggerAnimation('monsterSprite', animation);
  }
  const delayMs = typeof action.delay === 'number' ? action.delay : 360;
  setTimeout(() => {
    if (typeof action.post === 'function') action.post();
    updateHpBars();
    updateCombatPowerUI();
    postAction();
  }, delayFn(delayMs));
  return true;
}

function clearBossStateEffects(bossContext) {
  if (!bossContext?.state) return;
  const state = bossContext.state;
  removeBossDodgeBuff(state, true);
  removePlayerArmorBreak(state, true);
  removeBossEnrage(state, true);
  state.reflectHits = 0;
  state.reflectRatio = 0;
  state.shieldHp = 0;
  state.shieldTurns = 0;
  state.skillCooldown = 0;
}

function setBossControlsDisabled(disabled) {
  const controls = [
    els.monsterLevel,
    els.monsterLevelInput,
    els.monsterLevelMinus,
    els.monsterLevelPlus,
    els.newBattleBtn
  ].filter(Boolean);
  controls.forEach((control) => {
    control.disabled = !!disabled;
  });
}

function updateBossUi() {
  if (state.selectedBossId && !isBossUnlocked(state.selectedBossId)) {
    state.selectedBossId = null;
  }

  if (els.bossList) {
    const buttons = Array.from(els.bossList.querySelectorAll('.boss-btn'));
    buttons.forEach((btn) => {
      const bossId = btn?.dataset?.boss;
      if (!bossId) return;
      const progress = getBossProgress(bossId);
      const unlocked = isBossUnlocked(bossId);
      const requirement = bossUnlockRequirement(bossId);
      btn.classList.toggle('active', unlocked && bossId === state.selectedBossId);
      btn.classList.toggle('locked', !unlocked);
      btn.dataset.clears = String(progress?.clears || 0);
      btn.dataset.first = progress?.firstRewardClaimed ? '1' : '0';
      btn.dataset.locked = unlocked ? '0' : '1';
      btn.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
      if (requirement) {
        btn.setAttribute(
          'title',
          unlocked
            ? `레벨 ${formatNum(requirement)} 몬스터 처치로 해금 완료`
            : `레벨 ${formatNum(requirement)} 몬스터 처치 시 해금`
        );
      } else {
        btn.removeAttribute('title');
      }
    });
  }

  const boss = getBossConfig(state.selectedBossId);
  const bossInBattle = !!(gameState.battle.bossFight && gameState.battle.ongoing);
  if (els.startBossBtn) {
    if (!boss) {
      els.startBossBtn.disabled = true;
      els.startBossBtn.textContent = '보스 도전';
      els.startBossBtn.removeAttribute('title');
    } else if (!isBossUnlocked(boss.id) && state.user?.role !== 'admin') {
      const requirement = bossUnlockRequirement(boss.id);
      const requiredLabel = requirement ? `레벨 ${formatNum(requirement)} 클리어 필요` : '해금 필요';
      els.startBossBtn.disabled = true;
      els.startBossBtn.textContent = requiredLabel;
      els.startBossBtn.title = requiredLabel;
    } else if (bossInBattle) {
      els.startBossBtn.disabled = true;
      els.startBossBtn.textContent = '전투 진행중...';
      els.startBossBtn.removeAttribute('title');
    } else {
      const firstRewardPending = !getBossProgress(boss.id)?.firstRewardClaimed;
      els.startBossBtn.disabled = false;
      els.startBossBtn.textContent = firstRewardPending ? '보스 도전 (첫 보상 보장)' : '보스 도전';
      const requirement = bossUnlockRequirement(boss.id);
      if (requirement) {
        els.startBossBtn.title = `레벨 ${formatNum(requirement)} 몬스터 처치로 해금됨`;
      } else {
        els.startBossBtn.removeAttribute('title');
      }
    }
  }
  if (els.resetBossSelection) {
    els.resetBossSelection.disabled = !boss || bossInBattle;
  }
  if (els.bossInfo) {
    if (!boss) {
      els.bossInfo.textContent = '도전할 보스를 선택하세요.';
    } else {
      const progress = getBossProgress(boss.id) || { clears: 0, firstRewardClaimed: false };
      const drop = boss.drop || {};
      const chance = Math.max(0, Math.min(1, drop.chance || 0));
      const chancePercent = Math.round(chance * 1000) / 10;
      const firstRewardCount = drop.firstTicket || 0;
      const requirement = bossUnlockRequirement(boss.id);
      const unlocked = isBossUnlocked(boss.id) || state.user?.role === 'admin';
      const highest = getHighestClearedLevel();
      const firstRewardLabel = progress.firstRewardClaimed
        ? '첫 보상 수령 완료'
        : `첫 처치 ${firstRewardCount}장 보장`;
      const clearsLabel = progress.clears ? `${formatNum(progress.clears)}회 클리어` : '클리어 기록 없음';
      const requirementLabel = requirement
        ? state.user?.role === 'admin'
          ? `해금 조건: 레벨 ${formatNum(requirement)} (관리자 해금)`
          : unlocked
            ? `해금 조건: 레벨 ${formatNum(requirement)} (달성)`
            : `해금 조건: 레벨 ${formatNum(requirement)} (현재 ${formatNum(highest)})`
        : '';
      const parts = [boss.title, requirementLabel, firstRewardLabel, `일반 드랍 ${chancePercent}%`, clearsLabel];
      els.bossInfo.textContent = parts.filter(Boolean).join(' · ');
      if (!unlocked && requirement) {
        const remaining = Math.max(0, requirement - highest);
        if (remaining > 0) {
          els.bossInfo.textContent += ` · ${formatNum(remaining)}레벨 더 필요`;
        }
      }
    }
  }
}

function setBossSelection(bossId) {
  if (!bossId || !BOSS_IDS.includes(bossId)) {
    state.selectedBossId = null;
    updateBossUi();
    return;
  }
  if (!isBossUnlocked(bossId) && state.user?.role !== 'admin') {
    const requirement = bossUnlockRequirement(bossId);
    const highest = getHighestClearedLevel();
    const boss = getBossConfig(bossId);
    if (els.bossInfo) {
      const title = boss?.title || '보스';
      const reqLabel = requirement
        ? `해금 조건: 레벨 ${formatNum(requirement)} (현재 ${formatNum(highest)})`
        : '해금 조건 미지정';
      els.bossInfo.textContent = `${title} · ${reqLabel}`;
    }
    addBattleLog(
      requirement
        ? `[보스] 레벨 ${formatNum(requirement)} 몬스터를 처치해야 도전 가능합니다.`
        : '[보스] 아직 도전할 수 없습니다.',
      'warn'
    );
    updateBossUi();
    return;
  }
  state.selectedBossId = bossId;
  updateBossUi();
}

function resetBossSelection() {
  if (gameState.battle.ongoing && gameState.battle.bossFight) return;
  state.selectedBossId = null;
  updateBossUi();
}

function applyBossScaling(boss) {
  if (!boss) return;
  const { stats } = boss;
  if (stats?.hpScale && stats.hpScale !== 1) {
    gameState.enemy.maxHp = Math.round(gameState.enemy.maxHp * stats.hpScale);
    gameState.enemy.hp = gameState.enemy.maxHp;
  }
  if (stats?.atkScale && stats.atkScale !== 1) {
    gameState.enemy.stats.atk = Math.round(gameState.enemy.stats.atk * stats.atkScale);
  }
  if (stats?.defScale && stats.defScale !== 1) {
    gameState.enemy.stats.def = Math.round(gameState.enemy.stats.def * stats.defScale);
  }
  if (els.enemyAtk) els.enemyAtk.textContent = formatNum(gameState.enemy.stats.atk);
  if (els.enemyDef) els.enemyDef.textContent = formatNum(gameState.enemy.stats.def);
  updateCombatPowerUI();
  updateHpBars();
}

function endBossEncounter(result = 'neutral') {
  const bossContext = gameState.battle.bossFight;
  if (!bossContext) {
    updateBossUi();
    return;
  }
  clearBossStateEffects(bossContext);
  gameState.battle.bossFight = null;
  setBossControlsDisabled(false);
  if (result === 'victory') {
    addBattleLog('보스를 처치했습니다! 다음 도전에 대비하세요.', 'critical');
  } else if (result === 'defeat') {
    addBattleLog('보스에게 패배했습니다. 장비와 전술을 정비해 다시 도전하세요.', 'warn');
  }
  updateBossUi();
  const restoreLevel = clampMonsterLevel(state.lastNormalLevel || 1);
  updateMonsterLevelUI(restoreLevel);
  updateEnemyStats(restoreLevel);
}

function applyBossRewards(bossContext, rng = Math.random) {
  if (!bossContext) return null;
  const boss = bossContext.config || getBossConfig(bossContext.id);
  if (!boss) return null;
  const progress = getBossProgress(boss.id);
  progress.clears += 1;
  const isAdmin = state.user?.role === 'admin';
  const drop = boss.drop || {};
  const result = {
    bossId: boss.id,
    clears: progress.clears,
    firstRewardGranted: false,
    extraRewardGranted: false,
    tickets: 0
  };
  if (!progress.firstRewardClaimed) {
    progress.firstRewardClaimed = true;
    if (!isAdmin && (drop.firstTicket || 0) > 0) {
      result.firstRewardGranted = true;
      result.tickets += drop.firstTicket;
    }
  }
  const chance = Math.max(0, Math.min(1, drop.chance || 0));
  if (!isAdmin && chance > 0 && rng() < chance) {
    result.extraRewardGranted = true;
    result.tickets += 1;
  }
  if (!isAdmin && result.tickets > 0) {
    state.items.petTicket = (state.items.petTicket || 0) + result.tickets;
    persistItems();
    updateResourceSummary();
  }
  state.profile.bossProgress = JSON.parse(JSON.stringify(state.bossProgress));
  queueProfileUpdate({ bossProgress: state.bossProgress });
  updateBossUi();
  return result;
}

function startBossBattle() {
  const boss = getBossConfig(state.selectedBossId);
  if (!boss) return;
  if (!isBossUnlocked(boss.id) && state.user?.role !== 'admin') {
    const requirement = bossUnlockRequirement(boss.id);
    addBattleLog(
      requirement
        ? `[보스] 레벨 ${formatNum(requirement)} 몬스터를 처치해야 합니다.`
        : '[보스] 아직 도전할 수 없습니다.',
      'warn'
    );
    updateBossUi();
    return;
  }
  if (gameState.battle.bossFight) {
    addBattleLog('이미 보스 전투가 진행 중입니다.', 'warn');
    return;
  }
  if (gameState.battle.ongoing) {
    forceEndCurrentBattle('boss');
  }
  const needsIntro = shouldShowBossIntro(boss);
  setBossControlsDisabled(true);
  updateBossUi();
  if (needsIntro && launchBossIntro(boss)) {
    return;
  }
  if (needsIntro) {
    markBossIntroSeen(boss.id);
  }
  beginBossBattle(boss);
}

function beginBossBattle(boss) {
  if (!boss) return;
  const currentLevel = clampMonsterLevel(els.monsterLevelInput?.value || els.monsterLevel?.value || state.lastNormalLevel || 1);
  setLastNormalLevel(currentLevel);
  clearAutoSchedules();
  if (els.battleLog) els.battleLog.innerHTML = '';
  resetPetCombatState();
  gameState.player.status = {};
  resetUltimateState();
  updateMonsterLevelUI(boss.level);
  updateEnemyStats(boss.level);
  applyBossScaling(boss);
  gameState.battle.bossFight = { id: boss.id, level: boss.level, config: boss };
  ensureBossState(gameState.battle.bossFight);
  updateMonsterImage(boss.level);
  updateBossUi();
  gameState.battle.ongoing = true;
  gameState.battle.actionLock = false;
  gameState.player.defending = false;
  gameState.player.skillCooldown = 0;
  gameState.player.hp = gameState.player.maxHp;
  gameState.enemy.defending = false;
  gameState.battle.turn = 0;
  addBattleLog(`=== 보스 ${boss.name}과의 전투 시작! ===`, 'warn');
  const drop = boss.drop || {};
  if (drop.firstTicket) {
    addBattleLog(`첫 처치 보상: 펫 뽑기권 ${formatNum(drop.firstTicket)}장 보장`, 'warn');
  }
  if (drop.chance) {
    addBattleLog(`추가 드랍 확률: ${(Math.round(drop.chance * 1000) / 10).toFixed(1)}%`, 'warn');
  }
  updateHpBars();
  updateCombatPowerUI();
  beginPlayerTurn('battleStart');
}

function activePetDefinition() {
  if (!state.pets || !state.pets.active) return null;
  return getPetDefinition(state.pets.active);
}

function resetPetCombatState() {
  gameState.player.petShield = 0;
  gameState.player.petAttackBonus = 0;
  gameState.player.petAttackMultiplier = 1;
  gameState.player.petCritBonus = 0;
  gameState.player.petTigerGuard = false;
  gameState.player.petTigerReflect = false;
  clearPetEffectAnimations();
  updatePetCompanion();
}

function clearPetEffectAnimations() {
  if (!state.petEffectTimers) state.petEffectTimers = [];
  state.petEffectTimers.forEach((timer) => clearTimeout(timer));
  state.petEffectTimers.length = 0;
  if (state.petEffectTimer) {
    clearTimeout(state.petEffectTimer);
    state.petEffectTimer = null;
  }
  if (els.petCompanion) {
    els.petCompanion.classList.remove(...PET_EFFECT_CLASSES);
  }
  hideTigerKillOverlay();
}

function hideTigerKillOverlay({ resume = false } = {}) {
  if (state.tigerKillTimer) {
    clearTimeout(state.tigerKillTimer);
    state.tigerKillTimer = null;
  }
  if (els.tigerKillOverlay) {
    els.tigerKillOverlay.classList.remove('visible');
    els.tigerKillOverlay.hidden = true;
  }
  if (els.tigerKillImage) {
    els.tigerKillImage.removeAttribute('src');
  }
  const wasPending = state.tigerKillPending;
  state.tigerKillPending = false;
  if (wasPending) {
    gameState.battle.actionLock = false;
    if (resume) {
      if (gameState.player.hp <= 0 || gameState.enemy.hp <= 0) {
        concludeTurn();
      } else if (gameState.battle.autoPlay && gameState.battle.isPlayerTurn) {
        queueAutoPlayerAction(350);
      }
    }
  }
}

function showTigerKillOverlay() {
  if (!els.tigerKillOverlay || !els.tigerKillImage) return;
  if (state.tigerKillTimer) {
    clearTimeout(state.tigerKillTimer);
    state.tigerKillTimer = null;
  }
  state.tigerKillPending = true;
  gameState.battle.actionLock = true;
  els.tigerKillImage.src = TIGER_KILL_GIF_URL;
  els.tigerKillOverlay.hidden = false;
  els.tigerKillOverlay.classList.add('visible');
  state.tigerKillTimer = setTimeout(() => {
    hideTigerKillOverlay({ resume: true });
  }, 3000);
}

function cancelUltimateTimers() {
  if (state.ultimateTimers && state.ultimateTimers.length) {
    state.ultimateTimers.forEach((timerId) => clearTimeout(timerId));
  }
  state.ultimateTimers = [];
}

function hideUltimateOverlay() {
  if (!els.ultimateOverlay) return;
  cancelUltimateTimers();
  els.ultimateOverlay.classList.remove('show', 'gif-visible');
  els.ultimateOverlay.hidden = true;
}

function resetUltimateState() {
  cancelUltimateTimers();
  hideUltimateOverlay();
  state.playerUltimateUsed = false;
  state.ultimateActive = false;
  state.ultimatePending = null;
}

function ensurePlayerStatus() {
  if (!gameState.player.status || typeof gameState.player.status !== 'object') {
    gameState.player.status = {};
  }
  return gameState.player.status;
}

function applyPlayerAttackBuff(percent, turns, opts = {}) {
  if (!(percent > 0) || !(turns > 0)) return;
  const status = ensurePlayerStatus();
  status.atkBuff = { percent, turns };
  if (!opts.silent) addBattleLog(`[버프] 공격력 +${Math.round(percent * 100)}% (${turns}턴)`, 'heal');
  updateCombatPowerUI();
  renderTotalStats();
}

function applyPlayerDefenseBuff(percent, turns, opts = {}) {
  if (!(percent > 0) || !(turns > 0)) return;
  const status = ensurePlayerStatus();
  status.defBuff = { percent, turns };
  if (!opts.silent) addBattleLog(`[버프] 방어력 +${Math.round(percent * 100)}% (${turns}턴)`, 'heal');
  updateCombatPowerUI();
  renderTotalStats();
}

function applyPlayerDamageReduction(percent, turns, opts = {}) {
  if (!(percent > 0) || !(turns > 0)) return;
  const status = ensurePlayerStatus();
  status.damageReduction = { percent, turns };
  if (!opts.silent) addBattleLog(`[버프] 피해 ${Math.round(percent * 100)}% 감소 (${turns}턴)`, 'heal');
}

function applyPlayerDodgeBuff(amount, turns, opts = {}) {
  if (!(amount > 0) || !(turns > 0)) return;
  const status = ensurePlayerStatus();
  status.dodgeBuff = { amount, turns };
  if (!opts.silent) addBattleLog(`[버프] 회피율 +${Math.round(amount * 100)}% (${turns}턴)`, 'heal');
  updateCombatPowerUI();
  renderTotalStats();
}

function applyPlayerSpeedBuff(amount, turns, opts = {}) {
  if (!(amount > 0) || !(turns > 0)) return;
  const status = ensurePlayerStatus();
  status.speedBuff = { amount, turns };
  if (!opts.silent) addBattleLog(`[버프] 속도 +${formatNum(amount)} (${turns}턴)`, 'heal');
  updateCombatPowerUI();
  renderTotalStats();
}

function reducePlayerSkillCooldown(amount) {
  if (!(amount > 0)) return;
  const current = Number.isFinite(gameState.player.skillCooldown) ? gameState.player.skillCooldown : 0;
  gameState.player.skillCooldown = Math.max(0, current - amount);
}

function resetPlayerSkillCooldown() {
  gameState.player.skillCooldown = 0;
}

function tickPlayerStatus() {
  const status = ensurePlayerStatus();
  const expired = [];
  const decrement = (key, label) => {
    const entry = status[key];
    if (!entry) return;
    entry.turns -= 1;
    if (entry.turns <= 0) {
      delete status[key];
      expired.push(label);
    }
  };
  decrement('atkBuff', '공격력 버프');
  decrement('defBuff', '방어력 버프');
  decrement('damageReduction', '피해 감소 버프');
  decrement('dodgeBuff', '회피 버프');
  decrement('speedBuff', '속도 버프');
  if (expired.length) {
    addBattleLog(`[버프 종료] ${expired.join(', ')}`, 'warn');
    updateCombatPowerUI();
    renderTotalStats();
  }
}

function showUltimateOverlay(def, onComplete) {
  const overlay = els.ultimateOverlay;
  if (!overlay) {
    onComplete?.();
    return;
  }
  cancelUltimateTimers();
  overlay.hidden = false;
  overlay.classList.add('show');
  if (els.ultimateTitle) {
    els.ultimateTitle.textContent = def.name || '필살기';
  }
  const endTimer = setTimeout(() => {
    hideUltimateOverlay();
    onComplete?.();
  }, ULTIMATE_TEXT_DURATION_MS);
  state.ultimateTimers.push(endTimer);
}

function skipUltimateOverlay() {
  if (!state.ultimateActive || !state.ultimatePending) return;
  const pending = state.ultimatePending;
  cancelUltimateTimers();
  hideUltimateOverlay();
  pending.onComplete?.();
}

function dealUltimateDamage(amount, message = null) {
  const scaled = scaleSkillDamage(amount);
  const dmg = Math.max(0, Math.round(scaled || 0));
  if (dmg <= 0) return 0;
  return applyDamageToEnemy(dmg, message);
}

function applyEnemyDefBreak(percent, turns) {
  if (!(percent > 0) || !(turns > 0)) return;
  const status = ensureEnemyStatus();
  const baseDef = gameState.enemy.stats?.def || 0;
  const amount = Math.max(1, Math.round(baseDef * percent));
  status.defBreak = { turns, amount };
  refreshEnemyDerivedStats(true);
  addBattleLog(`[디버프] 적 방어력 -${Math.round(percent * 100)}% (${turns}턴)`, 'warn');
}

function applyEnemyDamageTakenUp(percent, turns, label = '받는 피해') {
  if (!(percent > 0) || !(turns > 0)) return;
  const status = ensureEnemyStatus();
  status.damageTakenUp = { amount: percent, turns };
  addBattleLog(`[디버프] 적 ${label} +${Math.round(percent * 100)}% (${turns}턴)`, 'warn');
}

function applyEnemyAccuracyDown(amount, turns) {
  if (!(amount > 0) || !(turns > 0)) return;
  const status = ensureEnemyStatus();
  status.accuracyDown = { amount, turns };
  addBattleLog(`[디버프] 적 명중률 -${Math.round(amount * 100)}% (${turns}턴)`, 'warn');
}

function applyEnemyBleed(damage, turns, message) {
  if (!(damage > 0) || !(turns > 0)) return;
  const status = ensureEnemyStatus();
  status.bleed = { turns, damage: Math.round(damage), message: message || `출혈 피해! {dmg}` };
  addBattleLog(`[디버프] 적이 ${turns}턴 동안 출혈 피해를 입습니다.`, 'warn');
}

function applyEnemyTimeStop(turns) {
  if (!(turns > 0)) return;
  const status = ensureEnemyStatus();
  status.timeStop = Math.max(status.timeStop || 0, turns);
  addBattleLog(`[필살기] 적이 ${turns}턴 동안 행동하지 못합니다!`, 'critical');
}

function triggerPlayerUltimate(def) {
  state.playerUltimateUsed = true;
  if (!ultimateGifEnabled('character')) {
    addBattleLog(`[필살기 준비] ${def.name}`, 'critical');
    applyUltimateEffect(def);
    finalizeUltimateTurn();
    return;
  }
  state.ultimateActive = true;
  state.ultimatePending = { def, resolved: false };
  gameState.battle.actionLock = true;
  addBattleLog(`[필살기 준비] ${def.name}`, 'critical');
  const finalize = () => {
    if (!state.ultimatePending || state.ultimatePending.resolved) return;
    state.ultimatePending.resolved = true;
    applyUltimateEffect(def);
    finalizeUltimateTurn();
  };
  state.ultimatePending.onComplete = finalize;
  showUltimateOverlay(def, finalize);
}

function finalizeUltimateTurn() {
  state.ultimateActive = false;
  state.ultimatePending = null;
  cancelUltimateTimers();
  hideUltimateOverlay();
  gameState.battle.actionLock = false;
  updateHpBars();
  updateCombatPowerUI();
  if (gameState.enemy.hp <= 0 || gameState.player.hp <= 0) {
    concludeTurn();
    return;
  }
  if (gameState.battle.autoPlay && gameState.battle.isPlayerTurn && !state.tigerKillPending) {
    queueAutoPlayerAction(350);
  }
}

function applyUltimateEffect(def) {
  const variant = def.variant || `${def.classId}-${def.tier}`;
  const offensive = getPlayerOffensiveStats();
  switch (variant) {
    case 'warrior-sssplus': {
      const baseDamage = Math.round(offensive.atk * 5.5);
      dealUltimateDamage(baseDamage, `[필살기] ${def.name}! {dmg} 피해`);
      if (gameState.enemy.hp > 0) {
        const trueDamage = Math.max(1, Math.round(gameState.enemy.hp * 0.15));
        gameState.enemy.hp = Math.max(0, gameState.enemy.hp - trueDamage);
        addBattleLog(`[필살기] 추가 진실 피해 ${formatNum(trueDamage)}!`, 'critical');
      }
      applyEnemyDefBreak(0.45, 2);
      applyPlayerDamageReduction(0.3, 2);
      break;
    }
    case 'warrior-ssplus': {
      dealUltimateDamage(Math.round(offensive.atk * 4.2), `[필살기] ${def.name}! {dmg} 피해`);
      applyEnemyDefBreak(0.35, 2);
      applyPlayerDamageReduction(0.2, 2);
      break;
    }
    case 'mage-sssplus': {
      dealUltimateDamage(Math.round(offensive.atk * 5.2), `[필살기] ${def.name}! {dmg} 피해`);
      if (gameState.enemy.hp > 0) {
        const trueDamage = Math.max(1, Math.round(gameState.enemy.hp * 0.12));
        gameState.enemy.hp = Math.max(0, gameState.enemy.hp - trueDamage);
        addBattleLog(`[필살기] 추가 폭발 피해 ${formatNum(trueDamage)}!`, 'critical');
      }
      applyEnemyDamageTakenUp(0.4, 3, '마법 피해');
      reducePlayerSkillCooldown(1);
      addBattleLog('스킬 쿨다운이 1턴 감소했습니다.', 'heal');
      break;
    }
    case 'mage-ssplus': {
      dealUltimateDamage(Math.round(offensive.atk * 3.8), `[필살기] ${def.name}! {dmg} 피해`);
      applyEnemyDamageTakenUp(0.25, 3, '마법 피해');
      healPlayer(Math.round(gameState.player.maxHp * 0.25), `마나 회복! 체력 {heal} 회복`);
      break;
    }
    case 'archer-sssplus': {
      const hits = 7;
      const multiplier = 0.9;
      const accuracyDebuff = { amount: 0.15, turns: 2 };
      let total = 0;
      let allHit = true;
      const critRate = Math.min(100, (offensive.critRate || 0) + 0);
      for (let i = 0; i < hits; i += 1) {
        const isCrit = Math.random() * 100 < critRate;
        let dmg = Math.max(1, Math.round(offensive.atk * multiplier));
        if (isCrit) {
          dmg = Math.max(1, Math.round(dmg * (offensive.critDmg || 150) / 100));
          applyEnemyAccuracyDown(accuracyDebuff.amount, accuracyDebuff.turns);
        }
        const dealt = dealUltimateDamage(dmg, null);
        if (dealt <= 0) allHit = false;
        total += dealt;
      }
      addBattleLog(`[필살기] ${def.name}! 총 ${formatNum(total)} 피해`, 'critical');
      if (allHit) {
        reducePlayerSkillCooldown(1);
        addBattleLog('모든 화살이 명중! 스킬 쿨다운 1턴 감소', 'heal');
      }
      break;
    }
    case 'archer-ssplus': {
      const hits = 5;
      const multiplier = 0.8;
      const accuracyDebuff = { amount: 0.1, turns: 1 };
      let total = 0;
      const critRate = offensive.critRate || 0;
      for (let i = 0; i < hits; i += 1) {
        const isCrit = Math.random() * 100 < critRate;
        let dmg = Math.max(1, Math.round(offensive.atk * multiplier));
        if (isCrit) {
          dmg = Math.max(1, Math.round(dmg * (offensive.critDmg || 150) / 100));
          applyEnemyAccuracyDown(accuracyDebuff.amount, accuracyDebuff.turns);
        }
        total += dealUltimateDamage(dmg, null);
      }
      addBattleLog(`[필살기] ${def.name}! 총 ${formatNum(total)} 피해`, 'critical');
      break;
    }
    case 'rogue-sssplus': {
      const hits = 2;
      const multiplier = 2.4;
      const bonusCrit = 30;
      let total = 0;
      for (let i = 0; i < hits; i += 1) {
        const critRate = Math.min(100, (offensive.critRate || 0) + bonusCrit);
        const isCrit = Math.random() * 100 < critRate;
        let dmg = Math.max(1, Math.round(offensive.atk * multiplier));
        if (isCrit) {
          dmg = Math.max(1, Math.round(dmg * (offensive.critDmg || 150) / 100));
        }
        total += dealUltimateDamage(dmg, null);
      }
      addBattleLog(`[필살기] ${def.name}! 총 ${formatNum(total)} 피해`, 'critical');
      const bleedDamage = Math.max(1, Math.round(scaleSkillDamage(offensive.atk * 1.2)));
      applyEnemyBleed(bleedDamage, 4, `출혈 피해! {dmg}`);
      applyPlayerDodgeBuff(0.25, 2);
      applyPlayerSpeedBuff(15, 2);
      break;
    }
    case 'rogue-ssplus': {
      const damage = Math.round(offensive.atk * 3.0);
      dealUltimateDamage(damage, `[필살기] ${def.name}! {dmg} 피해`);
      const bleedDamage = Math.max(1, Math.round(scaleSkillDamage(offensive.atk * 0.9)));
      applyEnemyBleed(bleedDamage, 3, `출혈 피해! {dmg}`);
      applyPlayerDodgeBuff(0.2, 1);
      break;
    }
    case 'goddess-sssplus': {
      gameState.player.hp = gameState.player.maxHp;
      addBattleLog('[필살기] 창세의 빛! 체력이 완전히 회복되었습니다.', 'heal');
      addBattleLog('아군 전체가 신성한 빛으로 되살아납니다!', 'heal');
      const damage = Math.round(offensive.atk * 6.5);
      dealUltimateDamage(damage, `[필살기] ${def.name}! {dmg} 피해`);
      if (gameState.enemy.hp > 0) {
        const trueDamage = Math.max(1, Math.round(gameState.enemy.hp * 0.2));
        gameState.enemy.hp = Math.max(0, gameState.enemy.hp - trueDamage);
        addBattleLog(`[필살기] 거대한 빛이 ${formatNum(trueDamage)}의 추가 피해를 입혔습니다!`, 'critical');
      }
      applyPlayerAttackBuff(0.35, 3, { silent: true });
      applyPlayerDefenseBuff(0.35, 3, { silent: true });
      applyPlayerSpeedBuff(25, 3, { silent: true });
      addBattleLog('[버프] 공격/방어/속도 +35% (3턴)', 'heal');
      applyEnemyDamageTakenUp(0.3, 2, '받는 피해');
      break;
    }
    case 'goddess-ssplus': {
      healPlayer(Math.round(gameState.player.maxHp * 0.5), `천상의 빛! 체력 {heal} 회복`);
      const shield = Math.max(1, Math.round(offensive.atk * 2.0));
      gameState.player.petShield = (gameState.player.petShield || 0) + shield;
      addBattleLog(`[필살기] 신성 보호막이 ${formatNum(shield)} 피해를 흡수합니다.`, 'heal');
      applyEnemyTimeStop(1);
      resetPlayerSkillCooldown();
      addBattleLog('스킬 쿨다운이 초기화되었습니다.', 'heal');
      dealUltimateDamage(Math.round(offensive.atk * 3.2), `[필살기] ${def.name}! {dmg} 피해`);
      break;
    }
    case 'goddess-splus': {
      healPlayer(Math.round(gameState.player.maxHp * 0.4), `천상의 축복! 체력 {heal} 회복`);
      applyPlayerAttackBuff(0.25, 2, { silent: true });
      applyPlayerDefenseBuff(0.25, 2, { silent: true });
      addBattleLog('[버프] 공격/방어 +25% (2턴)', 'heal');
      dealUltimateDamage(Math.round(offensive.atk * 2.8), `[필살기] ${def.name}! {dmg} 피해`);
      break;
    }
    default: {
      dealUltimateDamage(Math.round(offensive.atk * 3.5), `[필살기] ${def.name}! {dmg} 피해`);
    }
  }
}

function maybeTriggerCharacterUltimate() {
  if (state.ultimateActive || state.ultimatePending || state.tigerKillPending) return false;
  if (state.playerUltimateUsed) return false;
  if (gameState.player.hp <= 0 || gameState.enemy.hp <= 0) return false;
  const character = gameState.player.character;
  if (!character) return false;
  const ultimateDef = CHARACTER_ULTIMATE_DEFS[character.id];
  if (!ultimateDef) return false;
  const chance = typeof ultimateDef.chance === 'number' ? ultimateDef.chance : PLAYER_ULTIMATE_DEFAULT_CHANCE;
  if (!(chance > 0)) return false;
  if (Math.random() >= chance) return false;
  const preparedDef = {
    ...ultimateDef,
    gif: ''
  };
  triggerPlayerUltimate(preparedDef);
  return true;
}

function triggerPetAnimation(effect) {
  if (!ultimateGifEnabled('pet')) return;
  const el = els.petCompanion;
  if (!el || !el.classList.contains('show')) return;
  const className = `effect-${effect}`;
  if (!PET_EFFECT_CLASSES.includes(className)) return;
  el.classList.remove(...PET_EFFECT_CLASSES);
  void el.offsetWidth; // restart animation
  el.classList.add(className);
  if (effect === 'kill') {
    showTigerKillOverlay();
  }
  if (state.petEffectTimer) {
    clearTimeout(state.petEffectTimer);
  }
  state.petEffectTimer = setTimeout(() => {
    el.classList.remove(className);
    state.petEffectTimer = null;
  }, effect === 'guard' ? 1100 : 900);
}

function schedulePetEffect(effect, delay = 0) {
  if (!state.petEffectTimers) state.petEffectTimers = [];
  if (delay <= 0) {
    triggerPetAnimation(effect);
    return;
  }
  const timer = setTimeout(() => {
    triggerPetAnimation(effect);
    state.petEffectTimers = state.petEffectTimers.filter((id) => id !== timer);
  }, delay);
  state.petEffectTimers.push(timer);
}

function updatePetCompanion() {
  if (!els.petCompanion) return;
  const activePet = gameState.player.activePet;
  const isHorang = activePet?.id === 'pet_horang';
  if (!isHorang) {
    els.petCompanion.classList.remove('show');
    clearPetEffectAnimations();
    return;
  }
  if (els.petCompanionImg) {
    els.petCompanionImg.src = 'assets/pet/ho1.png';
    els.petCompanionImg.alt = activePet?.name || '호랭찡';
  }
  els.petCompanion.classList.add('show');
}

function getPlayerSkillMultiplier() {
  const value = gameState.player?.skillMultiplier;
  return typeof value === 'number' && isFinite(value) && value > 0 ? value : 1;
}

function scaleSkillDamage(value, multiplier = getPlayerSkillMultiplier()) {
  if (!(typeof value === 'number' && isFinite(value))) return 0;
  const mult = typeof multiplier === 'number' && isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return value * mult;
}

function getPlayerOffensiveStats() {
  const base = { ...gameState.player.totalStats };
  const status = ensurePlayerStatus();
  if (status.atkBuff && status.atkBuff.turns > 0) {
    base.atk = Math.max(1, Math.round(base.atk * (1 + status.atkBuff.percent)));
  }
  if (status.defBuff && status.defBuff.turns > 0) {
    base.def = Math.max(0, Math.round(base.def * (1 + status.defBuff.percent)));
  }
  if (status.speedBuff && status.speedBuff.turns > 0) {
    base.speed = Math.max(1, Math.round((base.speed || 0) + status.speedBuff.amount));
  }
  if (status.dodgeBuff && status.dodgeBuff.turns > 0) {
    base.dodge = Math.min(95, Math.round((base.dodge || 0) + status.dodgeBuff.amount * 100));
  }
  if (gameState.player.petAttackMultiplier && gameState.player.petAttackMultiplier !== 1) {
    base.atk = Math.max(1, Math.round(base.atk * gameState.player.petAttackMultiplier));
  }
  if (gameState.player.petAttackBonus) {
    base.atk = Math.max(1, base.atk + Math.round(gameState.player.petAttackBonus));
  }
  if (gameState.player.petCritBonus) {
    base.critRate = Math.min(100, (base.critRate || 0) + gameState.player.petCritBonus);
  }
  return base;
}

function getPlayerDefensiveStats() {
  const base = { ...gameState.player.totalStats };
  const status = ensurePlayerStatus();
  if (status.defBuff && status.defBuff.turns > 0) {
    base.def = Math.max(0, Math.round(base.def * (1 + status.defBuff.percent)));
  }
  if (status.atkBuff && status.atkBuff.turns > 0) {
    base.atk = Math.max(1, Math.round(base.atk * (1 + status.atkBuff.percent)));
  }
  if (status.speedBuff && status.speedBuff.turns > 0) {
    base.speed = Math.max(1, Math.round((base.speed || 0) + status.speedBuff.amount));
  }
  if (status.dodgeBuff && status.dodgeBuff.turns > 0) {
    base.dodge = Math.min(95, Math.round((base.dodge || 0) + status.dodgeBuff.amount * 100));
  }
  return base;
}

function applyDamageToPlayer(amount, options = {}) {
  let remaining = Math.max(0, Math.round(amount || 0));
  if (remaining <= 0) return 0;
  if (gameState.player.petShield > 0) {
    const absorbed = Math.min(gameState.player.petShield, remaining);
    gameState.player.petShield -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) {
      addBattleLog(`[펫] 보호막이 ${formatNum(absorbed)} 피해를 흡수했습니다.`, 'heal');
    }
  }
  if (remaining > 0 && gameState.player.petTigerGuard) {
    gameState.player.petTigerGuard = false;
    gameState.player.petTigerReflect = false;
    addBattleLog('[펫] 호랭찡이 공격을 완전히 막아냈습니다!', 'heal');
    triggerPetAnimation('guard');
    return 0;
  }
  if (remaining <= 0) return 0;
  const playerStatus = ensurePlayerStatus();
  if (playerStatus.damageReduction && playerStatus.damageReduction.turns > 0) {
    const reduction = Math.min(0.9, Math.max(0, playerStatus.damageReduction.percent || 0));
    if (reduction > 0) {
      const reduced = Math.max(0, Math.round(remaining * reduction));
      remaining = Math.max(0, remaining - reduced);
      addBattleLog(`[버프] 피해 ${Math.round(reduction * 100)}% 감소!`, 'heal');
    }
  }
  gameState.player.hp -= remaining;
  if (gameState.player.petTigerReflect && remaining > 0) {
    gameState.player.petTigerReflect = false;
    triggerPetAnimation('reflect');
    applyDamageToEnemy(remaining, '[펫] 호랭찡의 복수! {dmg} 반사 피해');
  }
  if (remaining > 0) {
    const sourceLabel = options.source ? `[${options.source}]` : '[피해]';
    const tone = options.critical ? 'critical' : 'damage';
    addBattleLog(`${sourceLabel} ${formatNum(remaining)} 피해를 받았습니다.`, tone);
  }
  return remaining;
}

function applyDamageToEnemy(amount, message = '') {
  let incoming = Math.max(0, Math.round(amount || 0));
  if (incoming <= 0) return 0;
  const status = ensureEnemyStatus();
  if (status.damageTakenUp && status.damageTakenUp.turns > 0) {
    incoming = Math.max(0, Math.round(incoming * (1 + status.damageTakenUp.amount)));
  }
  const bossContext = gameState.battle.bossFight;
  const state = bossContext ? ensureBossState(bossContext) : null;
  if (state?.shieldHp > 0) {
    const absorbed = Math.min(incoming, state.shieldHp);
    if (absorbed > 0) {
      state.shieldHp -= absorbed;
      incoming -= absorbed;
      addBattleLog(`[보스] 보호막이 ${formatNum(absorbed)} 피해를 흡수했습니다.`, 'warn');
      if (state.shieldHp <= 0) {
        state.shieldHp = 0;
        addBattleLog('[보스] 보호막이 붕괴되었습니다!', 'damage');
      }
    }
  }
  const actual = Math.min(incoming, Math.max(0, Math.round(gameState.enemy.hp)));
  gameState.enemy.hp = Math.max(0, gameState.enemy.hp - actual);
  triggerAnimation('monsterSprite', 'hurt');
  const damageLabel = actual > 0 ? formatNum(actual) : '0';
  if (message !== null) {
    if (message) {
      addBattleLog(message.replace('{dmg}', damageLabel), actual > 0 ? 'damage' : 'warn');
    } else if (actual > 0) {
      addBattleLog(`펫의 공격이 ${formatNum(actual)} 피해를 입혔습니다.`, 'damage');
    } else {
      addBattleLog('펫의 공격이 보호막에 모두 흡수되었습니다.', 'warn');
    }
  }
  if (state && state.reflectHits > 0 && actual > 0) {
    const ratio = Math.max(0.05, Math.min(1, state.reflectRatio || 0));
    const reflected = Math.max(1, Math.round(actual * ratio));
    state.reflectHits -= 1;
    if (state.reflectHits < 0) state.reflectHits = 0;
    const tag = bossContext.id === 'boss800' ? '그림자 반격' : '청동피갑 반격';
    addBattleLog(`[보스] ${tag}! ${formatNum(reflected)} 피해 반사`, 'damage');
    applyDamageToPlayer(reflected, { source: 'reflect', critical: false });
    if (state.reflectHits <= 0) {
      addBattleLog('[보스] 반격 효과가 종료되었습니다.', 'warn');
    } else {
      addBattleLog(`[보스] 반격 ${formatNum(state.reflectHits)}회 남음`, 'warn');
    }
  }
  updateHpBars();
  return actual;
}

function ensureEnemyStatus() {
  if (!gameState.enemy.status || typeof gameState.enemy.status !== 'object') {
    gameState.enemy.status = {};
  }
  return gameState.enemy.status;
}

function getEnemyOffensiveStats() {
  const stats = { ...gameState.enemy.stats };
  const status = ensureEnemyStatus();
  if (status.accuracyDown && status.accuracyDown.turns > 0) {
    stats.accuracyPenalty = Math.min(0.9, Math.max(0, status.accuracyDown.amount || 0));
  }
  return stats;
}

function refreshEnemyDerivedStats(updateUi = true) {
  const base = gameState.enemy.baseStats ? { ...gameState.enemy.baseStats } : { ...gameState.enemy.stats };
  const status = ensureEnemyStatus();
  let def = base.def || 0;
  if (status.defBreak && status.defBreak.turns > 0) {
    def = Math.max(0, def - status.defBreak.amount);
  }
  gameState.enemy.stats = {
    ...base,
    def
  };
  if (updateUi) {
    if (els.enemyAtk) els.enemyAtk.textContent = formatNum(gameState.enemy.stats.atk || 0);
    if (els.enemyDef) els.enemyDef.textContent = formatNum(gameState.enemy.stats.def || 0);
    if (els.enemySpeed) els.enemySpeed.textContent = Math.round(gameState.enemy.stats.speed || 0);
    updateCombatPowerUI();
  }
}

function clearEnemyStatusEffects() {
  gameState.enemy.status = {};
  refreshEnemyDerivedStats(true);
}

function tickEnemyStatusBeforeEnemyAction() {
  const status = ensureEnemyStatus();
  let battleEnded = false;
  if (status.bleed && status.bleed.turns > 0) {
    const bleedDamage = Math.max(1, Math.round(status.bleed.damage || 0));
    const dealt = applyDamageToEnemy(bleedDamage, status.bleed.message || `출혈 피해! {dmg}`);
    status.bleed.turns -= 1;
    if (status.bleed.turns <= 0) {
      delete status.bleed;
      addBattleLog('출혈 효과가 사라졌습니다.', 'warn');
    }
    if (dealt > 0 && gameState.enemy.hp <= 0) {
      battleEnded = true;
    }
  }
  if (status.defBreak && status.defBreak.turns > 0) {
    status.defBreak.turns -= 1;
    if (status.defBreak.turns <= 0) {
      delete status.defBreak;
      refreshEnemyDerivedStats(true);
      addBattleLog('마법 방어 약화가 해제되었습니다.', 'warn');
    }
  }
  if (status.damageTakenUp && status.damageTakenUp.turns > 0) {
    status.damageTakenUp.turns -= 1;
    if (status.damageTakenUp.turns <= 0) {
      delete status.damageTakenUp;
      addBattleLog('적의 약점 노출이 종료되었습니다.', 'warn');
    }
  }
  if (status.accuracyDown && status.accuracyDown.turns > 0) {
    status.accuracyDown.turns -= 1;
    if (status.accuracyDown.turns <= 0) {
      delete status.accuracyDown;
      addBattleLog('적의 명중률 감소 효과가 사라졌습니다.', 'warn');
    }
  }
  return battleEnded;
}

function healPlayer(amount, message = '') {
  const healValue = Math.max(0, Math.round(amount || 0));
  if (healValue <= 0) return 0;
  const before = gameState.player.hp;
  gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + healValue);
  const actual = Math.max(0, Math.round(gameState.player.hp - before));
  if (actual > 0) {
    if (message) {
      addBattleLog(message.replace('{heal}', formatNum(actual)), 'heal');
    } else {
      addBattleLog(`체력이 ${formatNum(actual)} 회복되었습니다.`, 'heal');
    }
    updateHpBars();
  }
  return actual;
}

function getClassSkillCooldown(classId = 'warrior') {
  switch (classId) {
    case 'archer':
      return 2;
    case 'mage':
      return 4;
    case 'rogue':
      return 3;
    case 'goddess':
      return 4;
    default:
      return 3;
  }
}

function performClassSkill(classId = 'warrior') {
  const offensive = getPlayerOffensiveStats();
  const skillMultiplier = getPlayerSkillMultiplier();
  let cooldown = getClassSkillCooldown(classId);
  switch (classId) {
    case 'warrior': {
      const result = calculateDamage(offensive, gameState.enemy, true);
      const damage = Math.max(1, Math.round(scaleSkillDamage(result.damage * 1.5, skillMultiplier)));
      const dealt = applyDamageToEnemy(damage, `강철의 격타! {dmg} 피해`);
      const shield = Math.max(1, Math.round((gameState.player.totalStats.def || 0) * 2.4));
      gameState.player.petShield = (gameState.player.petShield || 0) + shield;
      addBattleLog(`강철 방패! ${formatNum(shield)} 피해를 흡수합니다.`, 'heal');
      if (dealt <= 0) {
        addBattleLog('강철의 격타가 막혀 피해를 주지 못했습니다.', 'warn');
      }
      cooldown = 3;
      break;
    }
    case 'mage': {
      const rawBurst = (offensive.atk || 0) * 1.6 + (offensive.critDmg || 0) * 25;
      const burstDamage = Math.max(1, Math.round(scaleSkillDamage(rawBurst, skillMultiplier)));
      const dealt = applyDamageToEnemy(burstDamage, `마나 폭발! {dmg} 피해`);
      if (dealt > 0) {
        const healAmount = Math.max(1, Math.round(dealt * 0.35));
        healPlayer(healAmount, `아케인 회복! 체력 {heal} 회복`);
      } else {
        addBattleLog('마나 폭발이 적의 방어에 막혔습니다.', 'warn');
      }
      const baseDef = gameState.enemy.baseStats?.def || gameState.enemy.stats.def || 0;
      if (baseDef > 0) {
        const amount = Math.max(1, Math.round(baseDef * 0.35));
        const status = ensureEnemyStatus();
        status.defBreak = { turns: 2, amount };
        refreshEnemyDerivedStats(true);
        addBattleLog('마법 방어가 2턴 동안 크게 약화되었습니다!', 'warn');
      }
      cooldown = 4;
      break;
    }
    case 'archer': {
      let total = 0;
      let hits = 0;
      let misses = 0;
      for (let i = 0; i < 3; i += 1) {
        const result = calculateDamage(offensive, gameState.enemy, false);
        if (result.type === 'MISS') {
          misses += 1;
          continue;
        }
        const damage = Math.max(1, Math.round(scaleSkillDamage(result.damage * 0.75, skillMultiplier)));
        const dealt = applyDamageToEnemy(damage, null);
        if (dealt > 0) {
          total += dealt;
          hits += 1;
        }
      }
      if (total > 0) {
        addBattleLog(`연속 사격! ${hits}회 명중, 총 ${formatNum(total)} 피해!`, 'critical');
      }
      if (misses > 0) {
        const message = hits === 0 ? '연속 사격이 모두 빗나갔습니다...' : `${misses}발이 빗나갔습니다.`;
        addBattleLog(message, 'warn');
      }
      cooldown = 2;
      break;
    }
    case 'rogue': {
      const result = calculateDamage(offensive, gameState.enemy, true);
      const damage = Math.max(1, Math.round(scaleSkillDamage(result.damage * 1.1, skillMultiplier)));
      applyDamageToEnemy(damage, `그림자 일격! {dmg} 피해`);
      const bleedDamage = Math.max(1, Math.round(scaleSkillDamage((gameState.player.totalStats.atk || 0) * 0.5, skillMultiplier)));
      const status = ensureEnemyStatus();
      status.bleed = { turns: 3, damage: bleedDamage, message: `출혈 피해! {dmg}` };
      addBattleLog(`적이 깊은 출혈을 입었습니다! 3턴 동안 매턴 ${formatNum(bleedDamage)} 피해`, 'warn');
      cooldown = 3;
      break;
    }
    case 'goddess': {
      const rawHoly = (offensive.atk || 0) * 1.05 + (gameState.player.totalStats.def || 0) * 1.35;
      const holyDamage = Math.max(1, Math.round(scaleSkillDamage(rawHoly, skillMultiplier)));
      applyDamageToEnemy(holyDamage, `여신의 심판! {dmg} 피해`);
      const healAmount = Math.max(1, Math.round(gameState.player.maxHp * 0.28));
      const healed = healPlayer(healAmount, `여신의 은총! 체력 {heal} 회복`);
      const shield = Math.max(1, Math.round((gameState.player.totalStats.def || 0) * 2.0));
      gameState.player.petShield = (gameState.player.petShield || 0) + shield;
      addBattleLog(`여신의 보호막! ${formatNum(shield)} 피해 흡수`, 'heal');
      if (healed === 0) {
        addBattleLog('이미 체력이 가득 차 있어 회복 효과가 무효화되었습니다.', 'warn');
      }
      cooldown = 4;
      break;
    }
    default: {
      const result = calculateDamage(offensive, gameState.enemy, true);
      const damage = Math.max(0, Math.round(scaleSkillDamage(result.damage, skillMultiplier)));
      applyDamageToEnemy(damage, `필살기! {dmg} 피해`);
      cooldown = 3;
      break;
    }
  }
  gameState.player.skillCooldown = cooldown;
}

function handlePetTurnStart() {
  const pet = activePetDefinition();
  gameState.player.petAttackMultiplier = 1;
  gameState.player.petAttackBonus = 0;
  gameState.player.petCritBonus = 0;
  // 호랭찡 효과는 한 턴 지속 후 소멸
  gameState.player.petTigerGuard = false;
  gameState.player.petTigerReflect = false;
  if (!pet || !pet.active) return;
  const { active } = pet;
  const type = active.type;
  if (type !== 'tigerLegend') {
    const chance = typeof active.chance === 'number' ? active.chance : 0;
    if (!(chance > 0) || Math.random() > chance) return;
  }
  switch (type) {
    case 'shield': {
      const maxHp = Math.max(1, gameState.player.maxHp || 1);
      const amountPct = Math.max(0, active.amountPct || 0);
      const gained = Math.round(maxHp * amountPct);
      if (gained <= 0) break;
      const capPct = Math.max(0.1, Math.min(1, active.maxPct || 0.4));
      const maxShield = Math.round(maxHp * capPct);
      gameState.player.petShield = Math.min(maxShield, gameState.player.petShield + gained);
      const total = gameState.player.petShield;
      addBattleLog(`[펫] ${pet.name} 보호막 발동! +${formatNum(gained)} (총 ${formatNum(total)})`, 'heal');
      break;
    }
    case 'heal': {
      const maxHp = Math.max(1, gameState.player.maxHp || 1);
      const amountPct = Math.max(0, active.amountPct || 0);
      const heal = Math.max(1, Math.round(maxHp * amountPct));
      const before = gameState.player.hp;
      gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + heal);
      const actual = Math.max(0, Math.round(gameState.player.hp - before));
      if (actual > 0) {
        addBattleLog(`[펫] ${pet.name}이(가) ${formatNum(actual)} 체력을 회복시켰습니다.`, 'heal');
      }
      break;
    }
    case 'attackBuff': {
      const atkPct = Math.max(0, active.attackPct || 0);
      const critBonus = Math.max(0, active.critRateBonus || 0);
      const atkBonus = Math.max(0, active.attackFlat || 0);
      gameState.player.petAttackMultiplier = 1 + atkPct;
      gameState.player.petAttackBonus = atkBonus;
      gameState.player.petCritBonus = critBonus;
      addBattleLog(`[펫] ${pet.name}의 격노! 공격력이 상승했습니다.`, 'heal');
      break;
    }
    case 'strike': {
      const ratio = Math.max(0, active.ratio || 0);
      const baseAtk = gameState.player.totalStats.atk || 0;
      const minDamage = Math.max(0, active.minDamage || 0);
      const damage = Math.max(minDamage, Math.round(baseAtk * ratio));
      if (damage > 0) {
        applyDamageToEnemy(damage, `[펫] ${pet.name}의 그림자 일격! {dmg} 피해`);
      }
      break;
    }
    case 'tigerLegend': {
      const baseKillChance = Math.max(0, Math.min(1, active.killChance ?? 0.05));
      const isBossFight = !!gameState.battle.bossFight;
      const killChance = isBossFight ? 0 : baseKillChance;
      const blockChance = Math.max(0, Math.min(1, active.blockChance ?? 0.15));
      const reflectChance = Math.max(0, Math.min(1, active.reflectChance ?? 0.05));
      const effects = [];
      if (killChance > 0 && gameState.enemy.hp > 0 && Math.random() < killChance) {
        gameState.enemy.hp = 0;
        triggerAnimation('monsterSprite', 'hurt');
        addBattleLog('[펫] 호랭찡의 포효! 적이 즉시 쓰러졌습니다.', 'critical');
        effects.push('kill');
      } else if (isBossFight && baseKillChance > 0 && gameState.enemy.hp > 0) {
        addBattleLog('[펫] 보스에게는 호랭찡의 즉사 효과가 통하지 않습니다.', 'warn');
      }
      if (Math.random() < blockChance) {
        gameState.player.petTigerGuard = true;
        addBattleLog('[펫] 호랭찡이 모든 공격을 막을 태세를 갖추었습니다! (1턴)', 'heal');
        effects.push('guard');
      }
      if (Math.random() < reflectChance) {
        gameState.player.petTigerReflect = true;
        addBattleLog('[펫] 호랭찡이 반격 태세에 돌입했습니다. (다음 피해 반사)', 'warn');
        effects.push('reflect');
      }
      effects.forEach((effect, index) => schedulePetEffect(effect, index * 240));
      break;
    }
    default:
      break;
  }
}

function computePlayerStats() {
  const petDef = activePetDefinition();
  const charDef = getActiveCharacterDefinition();
  const baseStats = charDef?.stats ? { ...charDef.stats } : getActiveCharacterBaseStats();
  const derived = derivePlayerStats(
    state.equip || {},
    state.enhance,
    baseStats,
    petDef,
    {
      balance: state.config?.characterBalance,
      characterId: charDef?.id || getActiveCharacterId(),
      classId: charDef?.classId,
      character: charDef || null
    }
  );
  const { stats, equipment, skillMultiplier } = derived;
  const previousHp = gameState.player.hp;
  gameState.player.equipment = equipment;
  gameState.player.character = charDef || null;
  gameState.player.classId = charDef?.classId || 'warrior';
  const prevPetId = gameState.player.activePet?.id || null;
  gameState.player.totalStats = stats;
  const resolvedMultiplier = typeof skillMultiplier === 'number' && isFinite(skillMultiplier) && skillMultiplier > 0
    ? skillMultiplier
    : 1;
  gameState.player.skillMultiplier = resolvedMultiplier;
  if ((petDef?.id || null) !== prevPetId) {
    resetPetCombatState();
  }
  gameState.player.activePet = petDef || null;
  gameState.player.maxHp = stats.hp;
  const desiredCooldown = getClassSkillCooldown(gameState.player.classId);
  if (gameState.player.skillCooldown > desiredCooldown) {
    gameState.player.skillCooldown = desiredCooldown;
  }
  updatePetCompanion();
  updatePlayerCharacterSprite();
  if (!previousHp) {
    gameState.player.hp = stats.hp;
  } else {
    gameState.player.hp = Math.min(previousHp, stats.hp);
  }
}

function dropRateForLevel(type, level) {
  const cfg = state.config?.dropRates || DEFAULT_DROP_RATES;
  const item = cfg[type] || DEFAULT_DROP_RATES[type];
  if (!item) return 0;
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level || 1));
  let rate = item.base + item.perLevel * (lvl - 1);
  if (rate > item.max) rate = item.max;
  if (rate < 0) rate = 0;
  return rate;
}

function calcGoldReward(level, rng) {
  const cfg = normalizeGoldScaling(state.config?.goldScaling);
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level || 1));
  const ratio = (lvl - 1) / (MAX_LEVEL - 1 || 1);
  const minVal = Math.round(cfg.minLow + ratio * (cfg.minHigh - cfg.minLow));
  const maxVal = Math.round(cfg.maxLow + ratio * (cfg.maxHigh - cfg.maxLow));
  const low = Math.min(minVal, maxVal);
  const high = Math.max(minVal, maxVal);
  const span = Math.max(0, high - low);
  const rand = Math.floor((rng ? rng() : Math.random()) * (span + 1));
  return Math.max(1, low + rand);
}

function levelReward(level) {
  return Math.max(1, 2 * level - 1);
}

function ultimateGifEnabled(kind) {
  const effects = state.settings?.effects || {};
  if (kind === 'character') {
    return effects.characterUltimateGif !== false;
  }
  if (kind === 'pet') {
    return effects.petUltimateGif !== false;
  }
  return true;
}

function queueProfileUpdate(partial) {
  if (!state.user) return;
  state.pendingUpdates = { ...state.pendingUpdates, ...partial };
  if (state.saveTimer) return;
  state.saveTimer = setTimeout(async () => {
    state.saveTimer = null;
    await flushProfileUpdates();
  }, 800);
}

function ensureQuestState() {
  state.quests = sanitizeQuestState(state.quests);
  return state.quests;
}

function ensureQuestStatus(questId) {
  const quests = ensureQuestState();
  if (!quests.statuses[questId]) {
    quests.statuses[questId] = {
      completed: false,
      rewardGranted: false,
      completedAt: null,
      rewardAt: null
    };
  }
  return quests.statuses[questId];
}

function markQuestCompleted(questId, options) {
  if (state.user?.role === 'admin') return false;
  const quest = QUEST_LOOKUP[questId];
  if (!quest) return false;
  const status = ensureQuestStatus(questId);
  if (status.completed) return false;
  status.completed = true;
  status.completedAt = Date.now();
  state.quests = sanitizeQuestState(state.quests);
  if (state.profile) {
    state.profile.quests = state.quests;
  }
  queueProfileUpdate({ quests: state.quests });
  if (options?.log !== false) {
    addBattleLog(`[퀘스트] ${quest.title} 완료! 퀘스트 창에서 보상을 수령하세요.`, 'heal');
  }
  return true;
}

async function flushProfileUpdates() {
  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
  }
  if (!state.user) return;
  const payload = { ...state.pendingUpdates };
  state.pendingUpdates = {};
  if (!Object.keys(payload).length) return;
  if (!Object.prototype.hasOwnProperty.call(payload, 'updatedAt')) {
    payload.updatedAt = Date.now();
  }
  try {
    await update(ref(db, `users/${state.user.uid}`), payload);
  } catch (error) {
    console.error('프로필 저장 실패', error);
  }
}

function updateResourceSummary() {
  if (els.points) els.points.textContent = state.user?.role === 'admin' ? '∞' : formatNum(state.wallet);
  if (els.gold) els.gold.textContent = state.user?.role === 'admin' ? '∞' : formatNum(state.gold);
  if (els.petTickets) els.petTickets.textContent = state.user?.role === 'admin' ? '∞' : formatNum(state.items?.petTicket || 0);
  if (els.potionStock) els.potionStock.textContent = formatNum(state.items?.potion || 0);
  if (els.hyperPotionStock) els.hyperPotionStock.textContent = formatNum(state.items?.hyperPotion || 0);
  if (els.holyWaterStock) {
    const holyWaterDisplay = state.user?.role === 'admin' ? '∞' : formatNum(state.items?.holyWater || 0);
    els.holyWaterStock.textContent = holyWaterDisplay;
  }
  updateBattleResUi();
  updateAutoConsumableUi();
  updateSpeedStatus();
  updateAutoStatsDuration();
}

function updateBattleResUi() {
  const brCount = state.items?.battleRes || 0;
  const display = state.user?.role === 'admin' ? '∞' : formatNum(brCount);
  if (els.battleResCount) els.battleResCount.textContent = display;
  if (els.battleResInline) els.battleResInline.textContent = display;
  if (els.battleResToggle) {
    const hasStock = state.user?.role === 'admin' || brCount > 0;
    els.battleResToggle.checked = !!state.combat.useBattleRes && hasStock;
    els.battleResToggle.disabled = !hasStock;
  }
}

function updateAutoConsumableUi() {
  const isAdmin = state.user?.role === 'admin';
  const potionStock = state.items?.potion || 0;
  const hyperStock = state.items?.hyperPotion || 0;
  if (els.autoPotionToggle) {
    const disabled = !isAdmin && potionStock <= 0;
    els.autoPotionToggle.checked = !!state.combat.autoPotion;
    els.autoPotionToggle.disabled = disabled;
    els.autoPotionToggle.title = disabled ? '가속 물약이 부족합니다.' : '';
  }
  if (els.autoHyperToggle) {
    const disabled = !isAdmin && hyperStock <= 0;
    els.autoHyperToggle.checked = !!state.combat.autoHyper;
    els.autoHyperToggle.disabled = disabled;
    els.autoHyperToggle.title = disabled ? '초 가속 물약이 부족합니다.' : '';
  }
}

function snapshotItems() {
  return {
    potion: state.items?.potion || 0,
    hyperPotion: state.items?.hyperPotion || 0,
    protect: state.items?.protect || 0,
    enhance: state.items?.enhance || 0,
    revive: state.items?.revive || 0,
    battleRes: state.items?.battleRes || 0,
    holyWater: state.items?.holyWater || 0,
    petTicket: state.items?.petTicket || 0
  };
}

function persistItems() {
  const itemsPayload = snapshotItems();
  state.profile.items = { ...itemsPayload };
  queueProfileUpdate({ items: itemsPayload });
}

function persistCombatPreferences() {
  const combatPayload = {
    useBattleRes: !!state.combat.useBattleRes,
    prefBattleRes: state.combat.prefBattleRes !== false,
    autoPotion: !!state.combat.autoPotion,
    autoHyper: !!state.combat.autoHyper
  };
  state.profile.combat = { ...combatPayload };
  queueProfileUpdate({ combat: combatPayload });
}

function persistUserSettings() {
  const payload = sanitizeUserSettings(state.settings);
  state.settings = payload;
  if (state.profile) {
    state.profile.settings = payload;
  }
  queueProfileUpdate({ settings: payload });
}

function syncGifToggleControls() {
  const effects = state.settings?.effects || {};
  if (els.characterGifToggle) {
    els.characterGifToggle.checked = effects.characterUltimateGif !== false;
  }
  if (els.petGifToggle) {
    els.petGifToggle.checked = effects.petUltimateGif !== false;
  }
}

function setGifPreference(kind, enabled) {
  const current = sanitizeUserSettings(state.settings);
  current.effects = { ...current.effects };
  const currentEnabled = kind === 'character'
    ? current.effects.characterUltimateGif !== false
    : current.effects.petUltimateGif !== false;
  if (enabled === currentEnabled) {
    syncGifToggleControls();
    return;
  }
  if (kind === 'character') {
    if (enabled) {
      delete current.effects.characterUltimateGif;
    } else {
      current.effects.characterUltimateGif = false;
    }
  } else if (kind === 'pet') {
    if (enabled) {
      delete current.effects.petUltimateGif;
    } else {
      current.effects.petUltimateGif = false;
    }
  }
  state.settings = current;
  if (state.profile) {
    state.profile.settings = current;
  }
  persistUserSettings();
  syncGifToggleControls();
}

function persistDifficultyState() {
  if (!state.difficultyState) {
    state.difficultyState = sanitizeDifficultyState(null);
  }
  const payload = {
    unlocked: { ...state.difficultyState.unlocked },
    manualSelection: state.difficultyState.manualSelection,
    progress: {}
  };
  DIFFICULTY_ORDER.forEach((id) => {
    payload.progress[id] = { highest: state.difficultyState.progress?.[id]?.highest || 1 };
  });
  if (state.profile) {
    state.profile.difficultyState = {
      unlocked: { ...payload.unlocked },
      manualSelection: payload.manualSelection,
      progress: { ...payload.progress }
    };
  }
  queueProfileUpdate({ difficultyState: payload });
}

function autoSessionStorageKey() {
  const uid = state.user?.uid;
  if (!uid) return null;
  return `${AUTO_SESSION_STORAGE_PREFIX}${uid}`;
}

function rememberAutoSessionSnapshot(payload) {
  if (!payload) return;
  const key = autoSessionStorageKey();
  if (!key || typeof localStorage === 'undefined') return;
  try {
    const snapshot = { ...payload, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
}

function readAutoSessionSnapshot() {
  const key = autoSessionStorageKey();
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizeAutoSession(parsed);
  } catch {
    return null;
  }
}

function clearAutoSessionSnapshot() {
  const key = autoSessionStorageKey();
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function mergeAutoSessionSnapshot() {
  const snapshot = readAutoSessionSnapshot();
  if (!snapshot) return;
  const current = state.autoSession || sanitizeAutoSession(null);
  const currentStamp = Math.max(0, current.lastUpdate || 0);
  const snapshotStamp = Math.max(0, snapshot.lastUpdate || 0);
  if (snapshotStamp <= currentStamp) {
    return;
  }
  state.autoSession = sanitizeAutoSession({
    ...current,
    ...snapshot
  });
  persistAutoSession();
}

function buildAutoSessionPayload(session = state.autoSession) {
  const source = session || sanitizeAutoSession(null);
  return {
    accumulatedMs: Math.max(0, Math.round(source.accumulatedMs || 0)),
    lastUpdate: Math.max(0, Math.round(source.lastUpdate || 0)),
    preloaded: clampNumber(source.preloaded, 0, HOLY_WATER_MAX_PRELOAD, 0),
    hellActive: !!source.hellActive,
    hellStartedAt: Math.max(0, Math.round(source.hellStartedAt || 0)),
    hellEndsAt: Math.max(0, Math.round(source.hellEndsAt || 0)),
    forcedDifficulty: DIFFICULTY_ORDER.includes(source.forcedDifficulty)
      ? source.forcedDifficulty
      : null
  };
}

function persistAutoSession(options = {}) {
  if (!state.autoSession) {
    state.autoSession = sanitizeAutoSession(null);
  }
  const payload = buildAutoSessionPayload(state.autoSession);
  if (state.profile) {
    state.profile.autoSession = { ...payload };
  }
  if (options.persist !== false) {
    queueProfileUpdate({ autoSession: payload });
  }
  if (options.snapshot !== false) {
    rememberAutoSessionSnapshot(payload);
  }
  state.autoSessionDirty = false;
  if (state.autoSessionPersistTimer) {
    clearTimeout(state.autoSessionPersistTimer);
    state.autoSessionPersistTimer = null;
  }
  return payload;
}

function persistAutoSessionImmediate(payload) {
  if (!state.user) return;
  const prepared = payload || buildAutoSessionPayload(state.autoSession);
  rememberAutoSessionSnapshot(prepared);
  try {
    const immediatePayload = {
      autoSession: prepared,
      updatedAt: Date.now()
    };
    update(ref(db, `users/${state.user.uid}`), immediatePayload).catch((error) => {
      console.error('자동 전투 상태 즉시 저장 실패', error);
    });
  } catch (error) {
    console.error('자동 전투 상태 즉시 저장 중 오류', error);
  }
}

function scheduleAutoSessionPersist({ immediate = false } = {}) {
  if (!state.autoSession) {
    state.autoSession = sanitizeAutoSession(null);
  }
  if (immediate) {
    if (state.autoSessionPersistTimer) {
      clearTimeout(state.autoSessionPersistTimer);
      state.autoSessionPersistTimer = null;
    }
    state.autoSessionDirty = false;
    const payload = persistAutoSession({ persist: false, snapshot: false });
    if (!state.user) return;
    persistAutoSessionImmediate(payload);
    return;
  }
  state.autoSessionDirty = true;
  if (state.autoSessionPersistTimer) return;
  state.autoSessionPersistTimer = setTimeout(() => {
    state.autoSessionPersistTimer = null;
    if (!state.autoSessionDirty) return;
    state.autoSessionDirty = false;
    persistAutoSession();
  }, 5000);
}

function syncAutoSessionNow() {
  if (!state.user) return;
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  state.autoSession.lastUpdate = Date.now();
  scheduleAutoSessionPersist({ immediate: true });
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    syncAutoSessionNow();
  }
}

function handlePageHide() {
  syncAutoSessionNow();
}

function buildEquipmentList() {
  if (!els.playerEquipment) return;
  els.playerEquipment.innerHTML = '';
  const pet = gameState.player.activePet || activePetDefinition();
  if (pet) {
    const slot = document.createElement('div');
    slot.className = 'equipment-slot pet-slot';
    const header = document.createElement('div');
    header.className = 'equipment-name';
    header.innerHTML = `<span>${pet.icon || '🐾'} <span class="tier-S">펫</span></span><span>${pet.name}</span>`;
    slot.appendChild(header);
    const ability = describePetAbilities(pet);
    const abilityText = [ability.passive, ability.active].filter(Boolean).join('<br />');
    if (abilityText) {
      const abilityEl = document.createElement('div');
      abilityEl.className = 'equipment-stats pet-ability';
      abilityEl.innerHTML = abilityText;
      slot.appendChild(abilityEl);
    }
    els.playerEquipment.appendChild(slot);
  }
  gameState.player.equipment.forEach((item) => {
    const slot = document.createElement('div');
    slot.className = 'equipment-slot';
    const tierClass = `tier-${item.tier.replace('+', '')}`;
    slot.innerHTML = `
      <div class="equipment-name">
        <span>${PART_ICONS[item.part] || '🎁'} <span class="${tierClass}">${item.tier}</span></span>
        <span>Lv.${item.lvl || 0}</span>
      </div>
      <div class="equipment-stats">
        ${item.type === 'atk' ? 'ATK' : 'DEF'} ${formatNum(item.effective)} · 기본 ${formatNum(item.base || 0)}
      </div>
    `;
    els.playerEquipment.appendChild(slot);
  });
}

function renderTotalStats() {
  if (!els.playerTotalStats) return;
  els.playerTotalStats.innerHTML = '';
  const stats = gameState.player.totalStats;
  const entries = [
    ['atk', '공격력'],
    ['def', '방어력'],
    ['hp', '체력'],
    ['critRate', '크리티컬'],
    ['critDmg', '크리티컬 데미지'],
    ['dodge', '회피'],
    ['speed', '속도']
  ];
  entries.forEach(([key, label]) => {
    const value = stats[key] || 0;
    const formatted = key === 'critRate' || key === 'dodge' ? `${Math.round(value)}%` : formatNum(Math.round(value));
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `<span class="stat-name">${label}</span><span class="stat-value">${formatted}</span>`;
    els.playerTotalStats.appendChild(item);
  });
}

function updateCombatPowerUI() {
  const playerPower = combatPower({ ...gameState.player.totalStats, hp: gameState.player.maxHp });
  const enemyPower = combatPower({ ...gameState.enemy.stats, hp: gameState.enemy.maxHp });
  if (els.playerPower) els.playerPower.textContent = formatNum(playerPower);
  if (els.enemyPower) els.enemyPower.textContent = formatNum(enemyPower);
  const probability = calculateWinProbability();
  const percent = Math.round(probability * 100);
  if (els.winProbability) {
    els.winProbability.textContent = `${percent}%`;
    if (percent >= 70) els.winProbability.style.color = 'var(--ok)';
    else if (percent >= 40) els.winProbability.style.color = 'var(--warn)';
    else els.winProbability.style.color = 'var(--danger)';
  }
  if (els.winProbIndicator) {
    els.winProbIndicator.style.left = `${percent}%`;
  }
}

function updateHpBars() {
  if (els.playerHpBar) {
    const pct = Math.max(0, Math.min(100, (gameState.player.hp / gameState.player.maxHp) * 100));
    els.playerHpBar.style.width = `${pct}%`;
  }
  if (els.playerHpText) {
    els.playerHpText.textContent = `${Math.max(0, Math.round(gameState.player.hp))} / ${Math.round(gameState.player.maxHp)}`;
  }
  if (els.enemyHpBar) {
    const pct = Math.max(0, Math.min(100, (gameState.enemy.hp / gameState.enemy.maxHp) * 100));
    els.enemyHpBar.style.width = `${pct}%`;
  }
  if (els.enemyHpText) {
    els.enemyHpText.textContent = `${Math.max(0, Math.round(gameState.enemy.hp))} / ${Math.round(gameState.enemy.maxHp)}`;
  }
  if (els.skillCooldownView) {
    els.skillCooldownView.textContent = gameState.player.skillCooldown;
  }
  updateSpeedStatus();
}

function currentSpeedMultiplier(now = Date.now()) {
  let multiplier = 1;
  if (state.buffs.hyperUntil > now) {
    multiplier = Math.max(multiplier, state.buffs.hyperMultiplier || DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier || 4);
  }
  if (state.buffs.accelUntil > now) {
    multiplier = Math.max(multiplier, state.buffs.accelMultiplier || DEFAULT_POTION_SETTINGS.speedMultiplier || 2);
  }
  return multiplier;
}

function updateSpeedStatus() {
  if (!els.speedStatus) return;
  const now = Date.now();
  const multiplier = currentSpeedMultiplier(now);
  let remain = 0;
  let labelMultiplier = multiplier;
  if (state.buffs.hyperUntil > now && multiplier === (state.buffs.hyperMultiplier || DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier || 4)) {
    remain = state.buffs.hyperUntil - now;
    labelMultiplier = state.buffs.hyperMultiplier || multiplier;
  } else if (state.buffs.accelUntil > now && multiplier > 1) {
    remain = state.buffs.accelUntil - now;
    labelMultiplier = Math.max(multiplier, state.buffs.accelMultiplier || multiplier);
  }
  const displayMultiplier = formatMultiplier(labelMultiplier);
  let text = `배속 ${displayMultiplier}×`;
  if (remain > 0) {
    text += ` (${Math.ceil(remain / 1000)}s)`;
  }
  els.speedStatus.textContent = text;
  document.documentElement.style.setProperty('--speed-scale', multiplier.toString());
}

function startBuffTicker() {
  if (state.buffTicker) clearInterval(state.buffTicker);
  const tick = () => {
    const now = Date.now();
    updateSpeedStatus();
    updateAutoStatsDuration();
    updateAutoSession(now);
    updateAutoSessionUi();
  };
  tick();
  state.buffTicker = setInterval(tick, 500);
}

function clearAutoPlayerTimer() {
  if (state.autoPlayerTimer) {
    clearTimeout(state.autoPlayerTimer);
    state.autoPlayerTimer = null;
  }
}

function clearAutoNextTimer() {
  if (state.autoNextTimer) {
    clearTimeout(state.autoNextTimer);
    state.autoNextTimer = null;
  }
}

function clearAutoSchedules() {
  clearAutoPlayerTimer();
  clearAutoNextTimer();
}

function forceEndCurrentBattle(reason = 'manual') {
  if (!gameState.battle.ongoing) return;
  gameState.battle.ongoing = false;
  gameState.battle.actionLock = false;
  clearAutoSchedules();
  if (gameState.battle.autoPlay) {
    gameState.battle.autoPlay = false;
    updateAutoPlayUi();
    if (state.autoStats.active) {
      endAutoStatsSession(reason === 'boss' ? 'boss' : 'manual');
    }
  }
  gameState.player.defending = false;
  gameState.enemy.defending = false;
  gameState.player.skillCooldown = 0;
  if (gameState.battle.bossFight) {
    clearBossStateEffects(gameState.battle.bossFight);
    if (reason !== 'boss') {
      gameState.battle.bossFight = null;
      updateBossUi();
    }
  }
  resetUltimateState();
  updateHpBars();
  if (reason === 'boss') {
    addBattleLog('보스 전에 기존 전투를 종료했습니다.', 'warn');
  }
}

function resetAutoStatsValues() {
  state.autoStats.battles = 0;
  state.autoStats.points = 0;
  state.autoStats.gold = 0;
  state.autoStats.startTime = 0;
  const drops = {};
  AUTO_DROP_KEYS.forEach((key) => {
    drops[key] = 0;
  });
  state.autoStats.drops = drops;
}

function updateAutoStatsUi() {
  if (!els.autoStatsPanel) return;
  const stats = state.autoStats;
  els.autoStatsPanel.style.display = stats.active ? 'block' : 'none';
  if (els.autoStatsBattles) els.autoStatsBattles.textContent = formatNum(stats.battles || 0);
  if (els.autoStatsPoints) els.autoStatsPoints.textContent = formatNum(stats.points || 0);
  if (els.autoStatsGold) els.autoStatsGold.textContent = formatNum(stats.gold || 0);
  const dropElements = {
    enhance: els.autoStatsEnhance,
    potion: els.autoStatsPotion,
    hyperPotion: els.autoStatsHyperPotion,
    protect: els.autoStatsProtect,
    battleRes: els.autoStatsBattleRes
  };
  AUTO_DROP_KEYS.forEach((key) => {
    const el = dropElements[key];
    if (el) el.textContent = formatNum(stats.drops?.[key] || 0);
  });
  updateAutoStatsDuration();
}

function formatAutoDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function updateAutoStatsDuration() {
  if (!els.autoStatsDuration) return;
  if (!state.autoStats.active || !state.autoStats.startTime) {
    els.autoStatsDuration.textContent = '경과 시간: 00:00:00';
    return;
  }
  const elapsed = Date.now() - state.autoStats.startTime;
  els.autoStatsDuration.textContent = `경과 시간: ${formatAutoDuration(elapsed)}`;
}

function computeAutoThresholdMs(session = state.autoSession) {
  const base = AUTO_BASE_THRESHOLD_MS;
  const preloaded = clampNumber(session?.preloaded, 0, HOLY_WATER_MAX_PRELOAD, 0);
  return base + preloaded * HOLY_WATER_EXTENSION_MS;
}

function formatTimePair(elapsed, total) {
  return `${formatAutoDuration(elapsed)} / ${formatAutoDuration(total)}`;
}

function ensureDifficultyButtons() {
  if (!els.difficultyButtons || els.difficultyButtons.dataset.initialized) return;
  const fragment = document.createDocumentFragment();
  DIFFICULTY_ORDER.forEach((id) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'difficulty-btn';
    btn.dataset.difficulty = id;
    btn.textContent = difficultyLabel(id);
    fragment.appendChild(btn);
  });
  els.difficultyButtons.appendChild(fragment);
  els.difficultyButtons.dataset.initialized = '1';
  els.difficultyButtons.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest('.difficulty-btn') : null;
    if (!target) return;
    const id = target.dataset.difficulty;
    if (!id) return;
    setManualDifficulty(id);
  });
}

function applyDifficultyTheme(id) {
  const difficultyId = DIFFICULTY_ORDER.includes(id) ? id : 'easy';
  if (els.monsterSprite) {
    els.monsterSprite.dataset.difficulty = difficultyId;
  }
  document.body.dataset.difficulty = difficultyId;
}

function ensureTimeAccel(now = Date.now()) {
  if (!state.timeAccel) {
    state.timeAccel = { multiplier: 1, until: 0 };
  }
  if (state.timeAccel.multiplier > 1 && state.timeAccel.until <= now) {
    state.timeAccel.multiplier = 1;
    state.timeAccel.until = 0;
  }
  return state.timeAccel;
}

function currentTimeAccelMultiplier(now = Date.now()) {
  return ensureTimeAccel(now).multiplier || 1;
}

function timeAccelRemaining(now = Date.now()) {
  const accel = ensureTimeAccel(now);
  return Math.max(0, (accel.until || 0) - now);
}

function applyTimeAccel(multiplier, durationMs) {
  if (state.user?.role !== 'admin') return;
  const safeMultiplier = Math.max(1, multiplier || 1);
  const safeDuration = Math.max(1, durationMs || 0);
  const now = Date.now();
  ensureTimeAccel(now);
  if (!state.timeAccel) state.timeAccel = { multiplier: 1, until: 0 };
  state.timeAccel.multiplier = safeMultiplier;
  state.timeAccel.until = now + safeDuration;
  addBattleLog(`[시간 가속] ${safeMultiplier}배 속도로 ${formatAutoDuration(safeDuration)} 동안 진행됩니다.`, 'heal');
  updateAutoSessionUi();
}

function updateAutoSessionUi() {
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  const session = state.autoSession;
  const now = Date.now();
  const threshold = computeAutoThresholdMs(session);
  const accumulated = Math.max(0, Math.min(session.accumulatedMs || 0, threshold + AUTO_HELL_DURATION_MS));
  ensureDifficultyButtons();
  if (els.autoTimerStatus) {
    if (session.hellActive) {
      const remain = Math.max(0, (session.hellEndsAt || now) - now);
      els.autoTimerStatus.textContent = `지옥 개방 진행 중 · 남은 시간 ${formatAutoDuration(remain)}`;
    } else {
      els.autoTimerStatus.textContent = `평화 구간 경과: ${formatTimePair(accumulated, threshold)}`;
    }
  }
  if (els.hellStatus) {
    if (session.hellActive) {
      const forced = session.forcedDifficulty || getManualDifficulty();
      const remain = Math.max(0, (session.hellEndsAt || now) - now);
      els.hellStatus.textContent = `지옥문 개방 — 강제 난이도 ${difficultyLabel(forced)} · 남은 ${formatAutoDuration(remain)}`;
    } else {
      els.hellStatus.textContent = '지옥문 닫힘 (평화 상태)';
    }
  }
  if (els.holyWaterPreloadStatus) {
    const preloaded = clampNumber(session.preloaded, 0, HOLY_WATER_MAX_PRELOAD, 0);
    els.holyWaterPreloadStatus.textContent = `사전 성수 사용: ${preloaded}/${HOLY_WATER_MAX_PRELOAD}`;
  }
  if (els.useHolyWaterBtn) {
    const hasStock = state.user?.role === 'admin' || (state.items?.holyWater || 0) > 0;
    els.useHolyWaterBtn.disabled = !hasStock;
    els.useHolyWaterBtn.title = hasStock ? '' : '성수가 부족합니다.';
  }
  if (els.adminTimeAccelBtn) {
    els.adminTimeAccelBtn.style.display = state.user?.role === 'admin' ? '' : 'none';
  }
  if (els.timeAccelStatus) {
    const multiplier = currentTimeAccelMultiplier(now);
    if (multiplier > 1) {
      const remain = timeAccelRemaining(now);
      els.timeAccelStatus.textContent = `시간 가속: x${multiplier} (남은 ${formatAutoDuration(remain)})`;
    } else {
      els.timeAccelStatus.textContent = '시간 가속: 없음';
    }
  }
  updateDifficultyUi();
}

function updateAutoSession(now = Date.now()) {
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  const session = state.autoSession;
  if (!session.lastUpdate) {
    session.lastUpdate = now;
  }
  let delta = now - session.lastUpdate;
  if (!Number.isFinite(delta) || delta < 0) {
    delta = 0;
  }
  const hadDelta = delta > 0;
  session.lastUpdate = now;

  if (session.hellActive) {
    if (session.hellEndsAt && now >= session.hellEndsAt) {
      closeHell('duration');
      updateAutoSessionUi();
      return;
    }
  }

  if (gameState.battle.autoPlay) {
    const accelMultiplier = currentTimeAccelMultiplier(now);
    session.accumulatedMs = Math.max(0, (session.accumulatedMs || 0) + delta * accelMultiplier);
  } else if (session.accumulatedMs > 0) {
    ensureTimeAccel(now);
    session.accumulatedMs = Math.max(0, session.accumulatedMs - delta);
    if (!session.hellActive && session.accumulatedMs === 0 && session.preloaded > 0) {
      session.preloaded = 0;
      persistAutoSession();
    }
  } else {
    ensureTimeAccel(now);
  }

  if (session.hellActive) {
    if (session.accumulatedMs <= 0) {
      closeHell('cooldown');
      updateAutoSessionUi();
    }
    if (hadDelta) {
      scheduleAutoSessionPersist();
    }
    return;
  }

  const threshold = computeAutoThresholdMs(session);
  if (threshold > 0 && session.accumulatedMs >= threshold) {
    openHell('threshold');
  } else if (hadDelta) {
    scheduleAutoSessionPersist();
  }
}

function openHell(reason = 'threshold') {
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  const session = state.autoSession;
  if (session.hellActive) return;
  const now = Date.now();
  const manual = getManualDifficulty();
  const forced = computeNextDifficulty(manual);
  session.hellActive = true;
  session.hellStartedAt = now;
  session.hellEndsAt = now + AUTO_HELL_DURATION_MS;
  session.forcedDifficulty = forced;
  session.preloaded = 0;
  session.accumulatedMs = computeAutoThresholdMs(session);
  session.lastUpdate = now;
  const label = forced === manual ? difficultyLabel(forced) : `${difficultyLabel(forced)} (기존 ${difficultyLabel(manual)})`;
  const reasonLabel = reason === 'threshold'
    ? '자동 전투 임계치 도달'
    : reason === 'manual'
      ? '사용자 요청'
      : '조건 충족';
  addBattleLog(`[지옥문 개방] ${reasonLabel}으로 ${label} 난이도가 강제 적용됩니다.`, 'damage');
  persistAutoSession();
  updateAutoSessionUi();
  updateEnemyStats(gameState.enemy.level || 1);
}

function closeHell(reason = 'duration') {
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  const session = state.autoSession;
  if (!session.hellActive) return;
  session.hellActive = false;
  session.forcedDifficulty = null;
  session.hellStartedAt = 0;
  session.hellEndsAt = 0;
  session.accumulatedMs = 0;
  session.preloaded = 0;
  session.lastUpdate = Date.now();
  const reasonLabel = reason === 'duration'
    ? '지정된 시간이 경과했습니다.'
    : reason === 'cooldown'
      ? '자동 전투가 멈추어 열기가 식었습니다.'
      : reason === 'holyWater'
        ? '성수의 힘으로 지옥문이 닫혔습니다.'
        : '조건이 해소되었습니다.';
  addBattleLog(`[지옥문 종료] ${reasonLabel}`, 'warn');
  persistAutoSession();
  updateAutoSessionUi();
  updateEnemyStats(gameState.enemy.level || 1);
}

function updateDifficultyUi() {
  if (!state.difficultyState) state.difficultyState = sanitizeDifficultyState(null);
  const manual = getManualDifficulty();
  const active = getActiveDifficulty();
  ensureDifficultyButtons();
  if (els.difficultyButtons) {
    const forced = state.autoSession?.hellActive && state.autoSession?.forcedDifficulty;
    const isAdmin = state.user?.role === 'admin';
    const buttons = els.difficultyButtons.querySelectorAll('.difficulty-btn');
    buttons.forEach((btn) => {
      const id = btn.dataset.difficulty;
      const unlocked = isDifficultyUnlocked(id) || isAdmin;
      btn.textContent = difficultyLabel(id);
      btn.disabled = !unlocked;
      const isActiveManual = id === manual;
      const isForcedActive = forced && id === active;
      btn.classList.toggle('active', isActiveManual);
      btn.classList.toggle('forced', !!isForcedActive);
    });
    if (!isAdmin && state.autoSession?.hellActive) {
      buttons.forEach((btn) => {
        btn.disabled = btn.dataset.difficulty !== active;
      });
    }
  }
  if (els.difficultyStatus) {
    const display = state.autoSession?.hellActive && state.autoSession?.forcedDifficulty
      ? `${difficultyLabel(active)} (강제)`
      : difficultyLabel(active);
    els.difficultyStatus.textContent = `현재 난이도: ${display}`;
  }
  applyDifficultyTheme(active);
}

function startAutoStatsSession() {
  if (state.autoStats.active) return;
  resetAutoStatsValues();
  state.autoStats.active = true;
  state.autoStats.startTime = Date.now();
  updateAutoStatsDuration();
  updateAutoStatsUi();
}

function onAutoPlayStarted() {
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  state.autoSession.lastUpdate = Date.now();
  persistAutoSession();
  updateAutoSessionUi();
}

function onAutoPlayStopped(reason = 'manual') {
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  state.autoSession.lastUpdate = Date.now();
  persistAutoSession();
  if (reason === 'manual' && state.autoSession.hellActive) {
    addBattleLog('자동 전투를 중지했습니다. 지옥문이 서서히 닫힙니다.', 'warn');
  }
  updateAutoSessionUi();
}

function recordAutoStats(rewards = {}) {
  if (!state.autoStats.active) return;
  state.autoStats.battles += 1;
  state.autoStats.points += rewards.points || 0;
  state.autoStats.gold += rewards.gold || 0;
  const dropCounts = rewards.dropCounts || {};
  AUTO_DROP_KEYS.forEach((key) => {
    const gain = dropCounts[key] || 0;
    if (!state.autoStats.drops[key]) state.autoStats.drops[key] = 0;
    state.autoStats.drops[key] += gain;
  });
  updateAutoStatsUi();
}

function endAutoStatsSession(reason = 'manual') {
  if (!state.autoStats.active) return;
  const summary = {
    battles: state.autoStats.battles,
    points: state.autoStats.points,
    gold: state.autoStats.gold,
    drops: { ...state.autoStats.drops },
    startTime: state.autoStats.startTime
  };
  state.autoStats.active = false;
  onAutoPlayStopped(reason);
  const durationMs = summary.startTime ? Date.now() - summary.startTime : 0;
  const durationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;
  const reasonLabel = AUTO_STOP_REASON_LABELS[reason] || AUTO_STOP_REASON_LABELS.other;
  const hasDrops = AUTO_DROP_KEYS.some((key) => summary.drops[key] > 0);
  if (summary.battles > 0 || summary.points > 0 || summary.gold > 0 || hasDrops) {
    let line = `[자동전투 종료] ${reasonLabel} · 전투 ${formatNum(summary.battles)}회`;
    if (durationSec > 0) {
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      const durationText = minutes ? `${minutes}분 ${seconds}초` : `${seconds}초`;
      line += ` · ${durationText}`;
    }
    addBattleLog(line, 'warn');
    addBattleLog(`획득 포인트: +${formatNum(summary.points)}, 골드: +${formatNum(summary.gold)}`);
    if (hasDrops) {
      const dropDetails = AUTO_DROP_KEYS.filter((key) => summary.drops[key] > 0).map(
        (key) => `${AUTO_DROP_LABELS[key]} ${formatNum(summary.drops[key])}개`
      );
      addBattleLog(`획득 아이템: ${dropDetails.join(', ')}`, 'ok');
    }
  } else {
    addBattleLog(`자동 전투가 종료되었습니다 (${reasonLabel}). 획득한 보상이 없습니다.`, 'warn');
  }
  resetAutoStatsValues();
  updateAutoStatsUi();
}

function hasItemStock(type) {
  if (state.user?.role === 'admin') return true;
  return (state.items?.[type] || 0) > 0;
}

function isHyperActive(now = Date.now()) {
  return state.buffs.hyperUntil > now;
}

function isAccelActive(now = Date.now()) {
  return state.buffs.accelUntil > now;
}

function shouldAutoUseHyper(now = Date.now()) {
  if (!state.combat.autoHyper) return false;
  if (isHyperActive(now)) return false;
  return hasItemStock('hyperPotion');
}

function shouldAutoUsePotion(now = Date.now()) {
  if (!state.combat.autoPotion) return false;
  if (isHyperActive(now)) return false;
  if (isAccelActive(now)) return false;
  return hasItemStock('potion');
}

function pickAutoAction() {
  const now = Date.now();
  if (shouldAutoUseHyper(now)) return 'hyperPotion';
  if (shouldAutoUsePotion(now)) return 'potion';
  if (gameState.player.skillCooldown <= 0 && Math.random() < 0.32) return 'skill';
  if (Math.random() < 0.18) return 'defend';
  return 'attack';
}

function queueAutoPlayerAction(delayMs = 500) {
  clearAutoPlayerTimer();
  if (!gameState.battle.autoPlay || !gameState.battle.ongoing || !gameState.battle.isPlayerTurn) return;
  const delay = Math.max(150, Math.round(delayMs / currentSpeedMultiplier()));
  state.autoPlayerTimer = setTimeout(() => {
    state.autoPlayerTimer = null;
    if (!gameState.battle.autoPlay || !gameState.battle.ongoing || !gameState.battle.isPlayerTurn) return;
    const action = pickAutoAction();
    playerAction(action);
  }, delay);
}

function scheduleNextAutoBattle(result = 'victory') {
  clearAutoNextTimer();
  if (!gameState.battle.autoPlay) return;
  let baseDelay = 1700;
  if (result === 'manual') baseDelay = 600;
  else if (result !== 'victory') baseDelay = 2200;
  const delay = Math.max(400, Math.round(baseDelay / currentSpeedMultiplier()));
  state.autoNextTimer = setTimeout(() => {
    state.autoNextTimer = null;
    if (!gameState.battle.autoPlay) return;
    startNewBattle();
  }, delay);
}

function beginPlayerTurn(context = 'default') {
  if (!gameState.battle.ongoing) return;
  gameState.battle.isPlayerTurn = true;
  gameState.battle.actionLock = false;
  gameState.player.defending = false;
  tickPlayerStatus();
  handlePetTurnStart();
  if (maybeTriggerCharacterUltimate()) {
    return;
  }
  updateHpBars();
  updateCombatPowerUI();
  if (!state.tigerKillPending && (gameState.player.hp <= 0 || gameState.enemy.hp <= 0)) {
    if (concludeTurn()) return;
  }
  if (state.tigerKillPending) {
    return;
  }
  if (gameState.battle.autoPlay) {
    const initialDelay = context === 'battleStart' ? 500 : 350;
    queueAutoPlayerAction(initialDelay);
  }
}

function updateAutoPlayUi() {
  if (!els.autoPlayBtn) return;
  els.autoPlayBtn.textContent = gameState.battle.autoPlay ? '자동 전투 ON' : '자동 전투 OFF';
  els.autoPlayBtn.classList.toggle('ok', gameState.battle.autoPlay);
  updateAutoSessionUi();
}

function addBattleLog(message, type = '') {
  if (!els.battleLog) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  if (type === 'damage') {
    entry.innerHTML = `<span class="log-damage">${message}</span>`;
  } else if (type === 'critical') {
    entry.innerHTML = `<span class="log-critical">💥 ${message}</span>`;
  } else if (type === 'miss') {
    entry.innerHTML = `<span class="log-miss">${message}</span>`;
  } else if (type === 'heal') {
    entry.innerHTML = `<span class="log-heal">${message}</span>`;
  } else if (type === 'warn') {
    entry.innerHTML = `<span class="log-warn">${message}</span>`;
  } else {
    entry.textContent = message;
  }
  els.battleLog.prepend(entry);
  while (els.battleLog.childElementCount > 80) {
    els.battleLog.removeChild(els.battleLog.lastElementChild);
  }
}

function triggerAnimation(elementId, className) {
  const el = qs(`#${elementId}`);
  if (!el) return;
  el.classList.remove('attacking', 'defending', 'hurt', 'death-animation');
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), 600);
}

function createExplosionEffect(container) {
  const explosion = document.createElement('div');
  explosion.className = 'explosion-effect';
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.className = 'explosion-ring';
    ring.style.animationDelay = `${i * 0.1}s`;
    explosion.appendChild(ring);
  }
  container.appendChild(explosion);
  setTimeout(() => explosion.remove(), 1000);
}

function createDeathParticles(container) {
  const particlesDiv = document.createElement('div');
  particlesDiv.className = 'death-particles';
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'death-particle';
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 50 + Math.random() * 100;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.setProperty('--x', `${x}px`);
    particle.style.setProperty('--y', `${y}px`);
    particle.style.animationDelay = `${Math.random() * 0.3}s`;
    const colors = ['#ff6b6b', '#ff9966', '#ffb366', '#fff'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particlesDiv.appendChild(particle);
  }
  container.appendChild(particlesDiv);
  setTimeout(() => particlesDiv.remove(), 2000);
}

function createSoulEffect(container) {
  const soul = document.createElement('div');
  soul.className = 'soul-effect';
  soul.innerHTML = `
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="25" fill="rgba(255,255,255,0.3)" />
      <circle cx="30" cy="30" r="15" fill="rgba(135,206,250,0.5)" />
      <circle cx="30" cy="30" r="8" fill="rgba(255,255,255,0.8)" />
    </svg>
  `;
  container.appendChild(soul);
  setTimeout(() => soul.classList.add('show'), 200);
  setTimeout(() => soul.remove(), 2500);
}

function showBattleResultBanner(victory) {
  const arena = qs('.battle-arena');
  if (!arena) return;
  const banner = document.createElement('div');
  banner.className = 'battle-result-banner';
  banner.classList.add(victory ? 'victory' : 'defeat');
  banner.textContent = victory ? 'VICTORY!' : 'DEFEAT';
  arena.appendChild(banner);
  setTimeout(() => {
    banner.style.transition = 'opacity 1s';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 1000);
  }, 2000);
}

function triggerDeathAnimation(type) {
  const spriteId = type === 'player' ? 'playerSprite' : 'monsterSprite';
  const sprite = qs(`#${spriteId}`);
  if (!sprite) return;
  const container = sprite.parentElement;
  sprite.classList.add('death-animation');
  createExplosionEffect(container);
  createDeathParticles(container);
  if (type === 'player') {
    createSoulEffect(container);
  }
  setTimeout(() => showBattleResultBanner(type !== 'player'), 800);
}

function calculateWinProbability() {
  const playerPower = combatPower({ ...gameState.player.totalStats, hp: gameState.player.maxHp });
  const enemyPower = combatPower({ ...gameState.enemy.stats, hp: gameState.enemy.maxHp });
  const powerRatio = playerPower / Math.max(1, playerPower + enemyPower);
  const levelPenalty = Math.max(0, gameState.enemy.level - 100) * 0.0001;
  let prob = powerRatio - levelPenalty;
  prob = Math.max(0.01, Math.min(0.99, prob));
  return prob;
}

function clampMonsterLevel(value) {
  let lvl = typeof value === 'number' ? value : parseInt(value, 10);
  if (!Number.isFinite(lvl)) lvl = 1;
  lvl = Math.floor(lvl);
  if (lvl < 1) lvl = 1;
  if (lvl > MAX_LEVEL) lvl = MAX_LEVEL;
  return lvl;
}

function updateMonsterLevelUI(level) {
  const lvl = clampMonsterLevel(level);
  if (els.monsterLevel) els.monsterLevel.value = String(lvl);
  if (els.monsterLevelInput) els.monsterLevelInput.value = String(lvl);
  if (els.levelDisplay) els.levelDisplay.textContent = lvl;
  return lvl;
}

function updateEnemyStats(level) {
  const lvl = updateMonsterLevelUI(level);
  gameState.enemy.level = lvl;
  const scaling = normalizeMonsterScaling(state.config?.monsterScaling);
  const activeDifficulty = difficultyConfig(getActiveDifficulty());
  const difficulty = (scaling.difficultyMultiplier || 1) * (activeDifficulty.difficultyMultiplier || 1);
  const norm = Math.min(1, Math.max(0, (lvl - 1) / (MAX_LEVEL - 1 || 1)));
  const basePower = Math.max(1, scaling.basePower || DEFAULT_MONSTER_SCALING.basePower);
  const maxPower = Math.max(basePower, scaling.maxPower || DEFAULT_MONSTER_SCALING.maxPower);
  const power = ((maxPower - basePower) * Math.pow(norm, scaling.curve || 1) + basePower) * difficulty;
  const atkShare = scaling.attackShare || DEFAULT_MONSTER_SCALING.attackShare;
  const defShare = scaling.defenseShare || DEFAULT_MONSTER_SCALING.defenseShare;
  const atk = Math.max(1, Math.round(power * atkShare));
  const def = Math.max(1, Math.round(power * defShare));
  const hp = Math.max(lvl * 150, Math.round(power * (scaling.hpMultiplier || DEFAULT_MONSTER_SCALING.hpMultiplier)));
  const speedBase = scaling.speedBase || DEFAULT_MONSTER_SCALING.speedBase;
  const speedMax = Math.max(speedBase, scaling.speedMax || DEFAULT_MONSTER_SCALING.speedMax);
  const speed = Math.round(speedBase + (speedMax - speedBase) * Math.pow(norm, 0.7));
  const critRateBase = scaling.critRateBase || DEFAULT_MONSTER_SCALING.critRateBase;
  const critRateMax = Math.max(critRateBase, scaling.critRateMax || DEFAULT_MONSTER_SCALING.critRateMax);
  const critRate = Math.min(critRateMax, critRateBase + (critRateMax - critRateBase) * Math.pow(norm, 0.9));
  const critDmgBase = scaling.critDmgBase || DEFAULT_MONSTER_SCALING.critDmgBase;
  const critDmgMax = Math.max(critDmgBase, scaling.critDmgMax || DEFAULT_MONSTER_SCALING.critDmgMax);
  const critDmg = Math.min(critDmgMax, critDmgBase + (critDmgMax - critDmgBase) * Math.pow(norm, 1.05));
  const dodgeBase = scaling.dodgeBase || DEFAULT_MONSTER_SCALING.dodgeBase;
  const dodgeMax = Math.max(dodgeBase, scaling.dodgeMax || DEFAULT_MONSTER_SCALING.dodgeMax);
  const dodge = Math.min(dodgeMax, dodgeBase + (dodgeMax - dodgeBase) * Math.pow(norm, 0.95));
  gameState.enemy.maxHp = hp;
  gameState.enemy.hp = gameState.enemy.maxHp;
  gameState.enemy.baseStats = {
    atk,
    def,
    speed,
    critRate,
    critDmg,
    dodge
  };
  clearEnemyStatusEffects();
  gameState.enemy.power = power;
  gameState.battle.lastLevel = lvl;
  gameState.enemy.defending = false;
  if (els.enemyLevel) els.enemyLevel.textContent = String(lvl);
  updateMonsterImage(lvl);
  updateHpBars();
  applyDifficultyTheme(getActiveDifficulty());
}

function damageEquipmentAfterDefeat() {
  const candidates = PART_DEFS.map((def) => ({ def, item: state.equip[def.key] })).filter((entry) => entry.item);
  if (candidates.length === 0) {
    addBattleLog('손상될 장비가 없어 피해를 면했습니다.', 'warn');
    return;
  }
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  const item = selected.item;
  let message = '';
  if (item.lvl && item.lvl > 0) {
    const before = item.lvl;
    item.lvl = Math.max(0, item.lvl - 1);
    if (item.lvl <= 0) {
      state.equip[selected.def.key] = null;
      message = `${selected.def.name} 장비가 심하게 손상되어 파괴되었습니다. (Lv.${before})`;
    } else {
      message = `${selected.def.name}의 강화 레벨이 감소했습니다. (Lv.${before} → Lv.${item.lvl})`;
    }
  } else if ((item.base || 0) > 1) {
    const before = item.base || 1;
    const reduction = Math.max(1, Math.floor(before * 0.2));
    const after = Math.max(1, before - reduction);
    item.base = after;
    message = `${selected.def.name}이(가) 손상되어 기본 수치가 감소했습니다. (${formatNum(before)} → ${formatNum(after)})`;
  } else {
    state.equip[selected.def.key] = null;
    message = `${selected.def.name} 장비가 파괴되었습니다.`;
  }
  addBattleLog(message, 'damage');
  ensurePlayerReady();
  const sanitizedEquip = sanitizeEquipMap(state.equip);
  const sanitizedSpares = sanitizeEquipMap(state.spares);
  queueProfileUpdate({
    equip: sanitizedEquip,
    spares: sanitizedSpares
  });
  if (state.profile) {
    state.profile.equip = sanitizedEquip;
    state.profile.spares = sanitizedSpares;
  }
}

function monsterImageForLevel(level) {
  const lvl = clampMonsterLevel(level || 1);
  let index;
  if (lvl < 100) {
    index = 1;
  } else {
    index = Math.floor((lvl - 100) / 100) + 2;
  }
  index = Math.min(MONSTER_IMAGE_MAX_INDEX, Math.max(1, index));
  return `${MONSTER_IMAGE_DIR}/lv${index}.png`;
}

function updateMonsterImage(level) {
  if (!els.monsterSvg) return;
  if (els.monsterSprite) {
    els.monsterSprite.classList.remove('death-animation', 'hurt', 'attacking', 'defending');
  }
  const bossContext = gameState.battle.bossFight;
  if (bossContext) {
    const bossImage = BOSS_IMAGE_MAP[bossContext.id] || BOSS_IMAGE_MAP[bossContext.config?.id] || BOSS_IMAGE_MAP.boss150;
    if (els.monsterSprite) {
      els.monsterSprite.classList.add('boss-mode');
      els.monsterSprite.classList.remove('entering');
    }
    els.monsterSvg.classList.add('boss-active');
    els.monsterSvg.innerHTML = `
      <image href="${bossImage}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet" class="boss-image" />
    `;
    if (state.bossImageTimer) {
      clearTimeout(state.bossImageTimer);
      state.bossImageTimer = null;
    }
    els.monsterSvg.classList.add('boss-enter');
    state.bossImageTimer = setTimeout(() => {
      els.monsterSvg?.classList.remove('boss-enter');
      state.bossImageTimer = null;
    }, 900);
    return;
  }
  if (state.bossImageTimer) {
    clearTimeout(state.bossImageTimer);
    state.bossImageTimer = null;
  }
  if (els.monsterSprite) {
    els.monsterSprite.classList.remove('boss-mode');
  }
  els.monsterSvg.classList.remove('boss-active', 'boss-enter');
  const imagePath = monsterImageForLevel(level);
  els.monsterSvg.innerHTML = `
    <image href="${imagePath}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet" class="monster-image" />
  `;
  if (els.monsterSprite) {
    els.monsterSprite.classList.remove('entering');
    void els.monsterSprite.offsetWidth;
    els.monsterSprite.classList.add('entering');
    setTimeout(() => {
      els.monsterSprite?.classList.remove('entering');
    }, 700);
  }
}

function ensurePlayerReady() {
  computePlayerStats();
  buildEquipmentList();
  renderTotalStats();
  if (els.playerAtk) els.playerAtk.textContent = formatNum(gameState.player.totalStats.atk || 0);
  if (els.playerDef) els.playerDef.textContent = formatNum(gameState.player.totalStats.def || 0);
  if (els.playerCrit) els.playerCrit.textContent = `${Math.round(gameState.player.totalStats.critRate || 0)}%`;
  if (els.playerDodge) els.playerDodge.textContent = `${Math.round(gameState.player.totalStats.dodge || 0)}%`;
  updateResourceSummary();
  updateCombatPowerUI();
  updateHpBars();
}

function startNewBattle() {
  clearAutoNextTimer();
  clearAutoPlayerTimer();
  if (gameState.battle.bossFight) {
    clearBossStateEffects(gameState.battle.bossFight);
    gameState.battle.bossFight = null;
    setBossControlsDisabled(false);
    updateBossUi();
  }
  resetPetCombatState();
  const level = clampMonsterLevel(els.monsterLevel?.value || gameState.battle.lastLevel || 1);
  setLastNormalLevel(level);
  updateMonsterLevelUI(level);
  if (gameState.battle.ongoing) return;
  gameState.player.status = {};
  resetUltimateState();
  gameState.battle.ongoing = true;
  gameState.battle.actionLock = false;
  gameState.player.defending = false;
  gameState.player.skillCooldown = 0;
  gameState.player.hp = gameState.player.maxHp;
  gameState.enemy.defending = false;
  updateEnemyStats(level);
  gameState.battle.turn = 0;
  if (els.battleLog) els.battleLog.innerHTML = '';
  addBattleLog(`=== 레벨 ${level} 몬스터와 전투 시작! ===`);
  updateHpBars();
  updateCombatPowerUI();
  const enemyPower = combatPower({ ...gameState.enemy.stats, hp: gameState.enemy.maxHp });
  addBattleLog(`몬스터 전투력: ${formatNum(enemyPower)}`, 'warn');
  updateAutoPlayUi();
  beginPlayerTurn('battleStart');
}

function applyRewards(level, rng = Math.random) {
  if (state.user?.role === 'admin') return;
  const difficultyId = getActiveDifficulty();
  const diffCfg = difficultyConfig(difficultyId);
  const rewardMultiplier = Math.max(1, diffCfg.rewardMultiplier || 1);
  const points = Math.max(1, Math.round(levelReward(level) * rewardMultiplier));
  const gold = Math.max(1, Math.round(calcGoldReward(level, rng) * rewardMultiplier));
  state.wallet += points;
  state.gold += gold;
  const drops = [];
  const dropCounts = { enhance: 0, potion: 0, hyperPotion: 0, protect: 0, battleRes: 0 };
  const iterations = Math.max(1, Math.floor(rewardMultiplier));
  const extraChance = Math.max(0, rewardMultiplier - iterations);
  const applyDropRolls = () => {
    if (maybeDropItem('enhance', level, rng)) {
      drops.push('강화권 +1');
      dropCounts.enhance += 1;
    }
    if (maybeDropItem('potion', level, rng)) {
      drops.push('가속 물약 +1');
      dropCounts.potion += 1;
    }
    if (maybeDropItem('hyperPotion', level, rng)) {
      drops.push('초 가속 물약 +1');
      dropCounts.hyperPotion += 1;
    }
    if (maybeDropItem('protect', level, rng)) {
      drops.push('보호권 +1');
      dropCounts.protect += 1;
    }
    if (maybeDropItem('battleRes', level, rng)) {
      drops.push('전투부활권 +1');
      dropCounts.battleRes += 1;
    }
  };
  for (let i = 0; i < iterations; i += 1) {
    applyDropRolls();
  }
  if (extraChance > 0 && rng() < extraChance) {
    applyDropRolls();
  }
  state.profile.wallet = state.wallet;
  state.profile.gold = state.gold;
  persistItems();
  updateResourceSummary();
  queueProfileUpdate({ wallet: state.wallet, gold: state.gold });
  return { points, gold, drops, dropCounts };
}

function maybeDropItem(type, level, rng = Math.random) {
  const rate = dropRateForLevel(type, level);
  if (rng() < rate) {
    state.items[type] = (state.items[type] || 0) + 1;
    return true;
  }
  return false;
}

function consumePotion() {
  if (state.user?.role !== 'admin' && !(state.items.potion > 0)) return false;
  if (state.user?.role !== 'admin') {
    state.items.potion -= 1;
    if (state.items.potion < 0) state.items.potion = 0;
  }
  const duration = state.config?.potionSettings?.durationMs ?? DEFAULT_POTION_SETTINGS.durationMs;
  const now = Date.now();
  state.buffs.accelUntil = Math.max(state.buffs.accelUntil, now + duration);
  const potionMult = state.config?.potionSettings?.speedMultiplier ?? DEFAULT_POTION_SETTINGS.speedMultiplier ?? 2;
  state.buffs.accelMultiplier = Math.max(1, potionMult);
  addBattleLog(`가속 물약 사용! ${formatMultiplier(potionMult)}배 속도가 발동했습니다.`, 'heal');
  updateHpBars();
  updateResourceSummary();
  updateCombatPowerUI();
  persistItems();
  startBuffTicker();
  return true;
}

function consumeHyperPotion() {
  if (state.user?.role !== 'admin' && !(state.items.hyperPotion > 0)) return false;
  if (state.user?.role !== 'admin') {
    state.items.hyperPotion -= 1;
    if (state.items.hyperPotion < 0) state.items.hyperPotion = 0;
  }
  const duration = state.config?.hyperPotionSettings?.durationMs ?? DEFAULT_HYPER_POTION_SETTINGS.durationMs;
  const now = Date.now();
  state.buffs.hyperUntil = Math.max(state.buffs.hyperUntil, now + duration);
  const hyperMult = state.config?.hyperPotionSettings?.speedMultiplier ?? DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier ?? 4;
  state.buffs.hyperMultiplier = Math.max(1, hyperMult);
  state.buffs.accelUntil = Math.max(state.buffs.accelUntil, state.buffs.hyperUntil);
  state.buffs.accelMultiplier = Math.max(state.buffs.accelMultiplier || 1, state.buffs.hyperMultiplier);
  addBattleLog(`초 가속 물약 사용! ${formatMultiplier(hyperMult)}배 속도가 발동했습니다.`, 'heal');
  updateCombatPowerUI();
  updateResourceSummary();
  persistItems();
  startBuffTicker();
  return true;
}

function hasHolyWaterStock() {
  if (state.user?.role === 'admin') return true;
  return (state.items?.holyWater || 0) > 0;
}

function adjustHolyWaterStock(delta) {
  if (state.user?.role === 'admin') return true;
  const current = state.items?.holyWater || 0;
  if (current + delta < 0) return false;
  state.items.holyWater = current + delta;
  if (state.items.holyWater < 0) state.items.holyWater = 0;
  return true;
}

function useHolyWater() {
  if (!hasHolyWaterStock()) {
    addBattleLog('성수가 부족합니다.', 'warn');
    return;
  }
  if (!state.autoSession) state.autoSession = sanitizeAutoSession(null);
  const session = state.autoSession;
  const now = Date.now();
  if (!session.hellActive) {
    if (session.preloaded >= HOLY_WATER_MAX_PRELOAD) {
      addBattleLog('성수는 최대 2개까지만 사전 사용이 가능합니다.', 'warn');
      return;
    }
    if (!adjustHolyWaterStock(-1)) {
      addBattleLog('성수를 사용할 수 없습니다.', 'warn');
      return;
    }
    session.preloaded = clampNumber((session.preloaded || 0) + 1, 0, HOLY_WATER_MAX_PRELOAD, session.preloaded || 0);
    session.lastUpdate = now;
    persistItems();
    persistAutoSession();
    updateResourceSummary();
    updateAutoSessionUi();
    addBattleLog(`[성수] 평화 구간을 ${formatAutoDuration(HOLY_WATER_EXTENSION_MS)} 연장했습니다.`, 'heal');
    return;
  }
  // hell active: reduce accumulated time and remaining duration
  if (!adjustHolyWaterStock(-1)) {
    addBattleLog('성수를 사용할 수 없습니다.', 'warn');
    return;
  }
  session.accumulatedMs = Math.max(0, (session.accumulatedMs || 0) - HOLY_WATER_EXTENSION_MS);
  if (session.hellEndsAt) {
    session.hellEndsAt = Math.max(now, session.hellEndsAt - HOLY_WATER_EXTENSION_MS);
  }
  session.lastUpdate = now;
  persistItems();
  persistAutoSession();
  updateResourceSummary();
  updateAutoSessionUi();
  addBattleLog('[성수] 지옥문이 진정되었습니다. 지속 시간이 단축됩니다.', 'heal');
  if (session.hellEndsAt && now >= session.hellEndsAt) {
    closeHell('holyWater');
  } else if (session.accumulatedMs <= 0) {
    closeHell('holyWater');
  }
}

function useBattleResTicket(level, context) {
  if (!state.combat.useBattleRes) return false;
  const isAdmin = state.user?.role === 'admin';
  const current = state.items?.battleRes || 0;
  if (!isAdmin && current <= 0) return false;
  if (!isAdmin) {
    state.items.battleRes = Math.max(0, current - 1);
  }
  addBattleLog(`전투부활권이 발동되어 패배 페널티가 면제되었습니다. (${context})`, 'heal');
  if (!isAdmin && state.items.battleRes <= 0) {
    state.combat.useBattleRes = false;
    state.combat.prefBattleRes = false;
    persistCombatPreferences();
  }
  updateResourceSummary();
  persistItems();
  return true;
}

function handleVictory(level) {
  const bossContext = gameState.battle.bossFight;
  const rng = Math.random;
  const rewards = applyRewards(level, rng);
  const bossRewards = bossContext ? applyBossRewards(bossContext, rng) : null;
  registerLevelClear(level);
  recordDifficultyProgress(getActiveDifficulty(), level);
  triggerDeathAnimation('monster');
  addBattleLog('=== 승리! ===', 'heal');
  if (rewards) {
    addBattleLog(`보상: +${formatNum(rewards.points)} 포인트, +${formatNum(rewards.gold)} 골드`);
    if (rewards.drops.length) {
      addBattleLog(rewards.drops.join(', '));
    }
  }
  if (bossRewards) {
    const tags = [];
    if (bossRewards.firstRewardGranted) tags.push('첫 보상');
    if (bossRewards.extraRewardGranted) tags.push('추가 드랍');
    if (bossRewards.tickets > 0) {
      const label = tags.length ? ` (${tags.join(', ')})` : '';
      addBattleLog(`[보스 보상] 펫 뽑기권 +${formatNum(bossRewards.tickets)}${label}`, 'heal');
    } else {
      addBattleLog('[보스 보상] 펫 뽑기권 획득 실패', 'warn');
    }
    addBattleLog(`[보스 현황] 누적 클리어 ${formatNum(bossRewards.clears)}회`, 'warn');
  }
  if (state.autoStats.active && !bossContext) {
    recordAutoStats(rewards);
  }
  if (bossContext) {
    endBossEncounter('victory');
  }
  markQuestCompleted('firstBattleWin', { log: !bossContext });
  const questLevel = bossContext ? bossContext.level : level;
  if (questLevel >= 100) {
    markQuestCompleted('slayLevel100', { log: !bossContext });
  }
  resetUltimateState();
  if (gameState.battle.autoPlay && !bossContext) {
    scheduleNextAutoBattle('victory');
  }
}

function handleDefeat(level, context) {
  const bossContext = gameState.battle.bossFight;
  const resurrected = useBattleResTicket(level, context);
  triggerDeathAnimation('player');
  gameState.battle.actionLock = false;
  if (resurrected) {
    if (bossContext) endBossEncounter('defeat');
    resetUltimateState();
    if (gameState.battle.autoPlay) scheduleNextAutoBattle('defeat');
    return;
  }
  addBattleLog('=== 패배... ===', 'damage');
  if (state.user?.role !== 'admin') {
    damageEquipmentAfterDefeat();
    if (state.wallet > 0) {
      const loss = Math.max(1, Math.floor(state.wallet * 0.2));
      state.wallet = Math.max(0, state.wallet - loss);
      state.profile.wallet = state.wallet;
      addBattleLog(`패배 페널티: 포인트 ${formatNum(loss)} 감소`, 'damage');
    }
    queueProfileUpdate({ wallet: state.wallet });
    updateResourceSummary();
  }
  if (bossContext) {
    endBossEncounter('defeat');
  }
  if (gameState.battle.autoPlay) {
    gameState.battle.autoPlay = false;
    clearAutoSchedules();
    updateAutoPlayUi();
    endAutoStatsSession('defeat');
  }
}

function concludeTurn() {
  updateHpBars();
  updateCombatPowerUI();
  if (gameState.player.hp <= 0) {
    gameState.battle.ongoing = false;
    gameState.battle.actionLock = false;
    handleDefeat(gameState.enemy.level, 'manual');
    return true;
  }
  if (gameState.enemy.hp <= 0) {
    gameState.battle.ongoing = false;
    gameState.battle.actionLock = false;
    handleVictory(gameState.enemy.level);
    return true;
  }
  return false;
}

function playerAction(action) {
  if (!gameState.battle.ongoing || !gameState.battle.isPlayerTurn) return;
  if (gameState.battle.actionLock) return;
  gameState.battle.actionLock = true;
  clearAutoPlayerTimer();
  gameState.player.defending = false;
  const speedMul = currentSpeedMultiplier();
  const delay = (ms) => Math.max(120, Math.round(ms / speedMul));

  const postPlayerAction = () => {
    if (gameState.player.skillCooldown > 0) {
      gameState.player.skillCooldown -= 1;
      if (gameState.player.skillCooldown < 0) gameState.player.skillCooldown = 0;
    }
    updateHpBars();
    if (concludeTurn()) return;
    gameState.battle.isPlayerTurn = false;
    setTimeout(enemyAction, delay(900));
  };

  switch (action) {
    case 'attack': {
      gameState.battle.turn += 1;
      triggerAnimation('playerSprite', 'attacking');
      setTimeout(() => {
        const result = calculateDamage(getPlayerOffensiveStats(), gameState.enemy, false);
        if (result.type === 'MISS') {
          addBattleLog('플레이어의 공격이 빗나갔습니다!', 'miss');
        } else {
          const dealt = applyDamageToEnemy(result.damage, null);
          if (dealt > 0) {
            addBattleLog(`몬스터에게 ${formatNum(dealt)} 피해!`, result.type === 'CRITICAL' ? 'critical' : 'damage');
          } else {
            addBattleLog('몬스터가 피해를 받지 않았습니다.', 'warn');
          }
        }
        postPlayerAction();
      }, delay(320));
      break;
    }
    case 'defend': {
      gameState.battle.turn += 1;
      gameState.player.defending = true;
      addBattleLog('플레이어가 방어 자세를 취했습니다.');
      setTimeout(postPlayerAction, delay(200));
      break;
    }
    case 'skill': {
      if (gameState.player.skillCooldown > 0) {
        addBattleLog(`스킬 쿨다운 ${gameState.player.skillCooldown}턴 남음`, 'warn');
        gameState.battle.actionLock = false;
        if (gameState.battle.autoPlay) {
          queueAutoPlayerAction(350);
        }
        return;
      }
      gameState.battle.turn += 1;
      triggerAnimation('playerSprite', 'attacking');
      setTimeout(() => {
        performClassSkill(gameState.player.classId || 'warrior');
        postPlayerAction();
      }, delay(320));
      break;
    }
    case 'potion': {
      if (!consumePotion()) {
        addBattleLog('가속 물약이 부족합니다.', 'warn');
        gameState.battle.actionLock = false;
        if (gameState.battle.autoPlay) {
          queueAutoPlayerAction(350);
        }
        return;
      }
      gameState.battle.turn += 1;
      setTimeout(postPlayerAction, delay(200));
      break;
    }
    case 'hyperPotion': {
      if (!consumeHyperPotion()) {
        addBattleLog('초 가속 물약이 부족합니다.', 'warn');
        gameState.battle.actionLock = false;
        if (gameState.battle.autoPlay) {
          queueAutoPlayerAction(350);
        }
        return;
      }
      gameState.battle.turn += 1;
      setTimeout(postPlayerAction, delay(200));
      break;
    }
    default:
      break;
  }
}

function enemyAction() {
  if (!gameState.battle.ongoing) return;
  const bossContext = gameState.battle.bossFight;
  if (bossContext) {
    tickBossStateBeforeAction(bossContext);
  }
  if (tickEnemyStatusBeforeEnemyAction()) {
    if (concludeTurn()) return;
    if (!gameState.battle.ongoing) return;
  }
  const status = ensureEnemyStatus();
  if (status.timeStop && status.timeStop > 0) {
    status.timeStop -= 1;
    addBattleLog('적이 시간 정지로 행동하지 못했습니다!', 'heal');
    if (status.timeStop <= 0) {
      delete status.timeStop;
      addBattleLog('적이 다시 움직일 수 있게 되었습니다.', 'warn');
    }
    beginPlayerTurn('afterEnemy');
    return;
  }
  const choice = Math.random();
  gameState.enemy.defending = false;
  const speedMul = currentSpeedMultiplier();
  const delay = (ms) => Math.max(120, Math.round(ms / speedMul));
  const postEnemyAction = () => {
    if (concludeTurn()) return;
    beginPlayerTurn('afterEnemy');
  };

  if (bossContext && maybeExecuteBossSkill(bossContext, delay, postEnemyAction)) {
    return;
  }
  if (choice < 0.7) {
    triggerAnimation('monsterSprite', 'attacking');
    setTimeout(() => {
      const result = calculateDamage(getEnemyOffensiveStats(), getPlayerDefensiveStats(), false);
      if (result.type === 'MISS') {
        addBattleLog('몬스터의 공격이 빗나갔습니다!', 'miss');
      } else {
        triggerAnimation('playerSprite', 'hurt');
        const dealt = applyDamageToPlayer(result.damage, { source: 'attack', critical: result.type === 'CRITICAL' });
        if (dealt > 0) {
          addBattleLog(`몬스터의 공격! ${formatNum(dealt)} 피해!`, result.type === 'CRITICAL' ? 'critical' : 'damage');
        } else {
          addBattleLog('몬스터의 공격! 보호막이 피해를 모두 막았습니다.', 'heal');
        }
      }
      updateHpBars();
      postEnemyAction();
    }, delay(320));
  } else if (choice < 0.9) {
    triggerAnimation('monsterSprite', 'attacking');
    setTimeout(() => {
      const result = calculateDamage(getEnemyOffensiveStats(), getPlayerDefensiveStats(), true);
      triggerAnimation('playerSprite', 'hurt');
      const dealt = applyDamageToPlayer(result.damage, { source: 'skill', critical: true });
      if (dealt > 0) {
        addBattleLog(`몬스터의 강력한 일격! ${formatNum(dealt)} 피해!`, 'critical');
      } else {
        addBattleLog('몬스터의 강력한 일격! 보호막이 피해를 흡수했습니다.', 'heal');
      }
      updateHpBars();
      postEnemyAction();
    }, delay(360));
  } else {
    gameState.enemy.defending = true;
    addBattleLog('몬스터가 방어 자세를 취했습니다.');
    triggerAnimation('monsterSprite', 'defending');
    setTimeout(postEnemyAction, delay(220));
  }
}

function initEventListeners() {
  updateBossUi();
  els.characterGifToggle?.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    setGifPreference('character', !!event.target.checked);
  });
  els.petGifToggle?.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    setGifPreference('pet', !!event.target.checked);
  });
  els.attackBtn?.addEventListener('click', () => playerAction('attack'));
  els.defendBtn?.addEventListener('click', () => playerAction('defend'));
  els.skillBtn?.addEventListener('click', () => playerAction('skill'));
  els.potionBtn?.addEventListener('click', () => playerAction('potion'));
  els.hyperPotionBtn?.addEventListener('click', () => playerAction('hyperPotion'));
  els.newBattleBtn?.addEventListener('click', startNewBattle);
  els.generateEquipBtn?.addEventListener('click', () => {
    ensurePlayerReady();
    addBattleLog('장비 정보를 갱신했습니다.');
  });
  els.autoPlayBtn?.addEventListener('click', () => {
    gameState.battle.autoPlay = !gameState.battle.autoPlay;
    updateAutoPlayUi();
    if (gameState.battle.autoPlay) {
      startAutoStatsSession();
      onAutoPlayStarted();
      if (gameState.battle.ongoing && gameState.battle.isPlayerTurn) {
        queueAutoPlayerAction(450);
      } else if (!gameState.battle.ongoing) {
        scheduleNextAutoBattle('manual');
      }
    } else {
      endAutoStatsSession('manual');
      clearAutoSchedules();
    }
  });
  els.battleResToggle?.addEventListener('change', (e) => {
    const enabled = !!e.target.checked;
    state.combat.useBattleRes = enabled;
    state.combat.prefBattleRes = enabled;
    persistCombatPreferences();
    updateBattleResUi();
  });
  els.autoPotionToggle?.addEventListener('change', (e) => {
    state.combat.autoPotion = !!e.target.checked;
    persistCombatPreferences();
    updateAutoConsumableUi();
  });
  els.autoHyperToggle?.addEventListener('change', (e) => {
    state.combat.autoHyper = !!e.target.checked;
    persistCombatPreferences();
    updateAutoConsumableUi();
  });
  els.useHolyWaterBtn?.addEventListener('click', () => {
    useHolyWater();
  });
  els.adminTimeAccelBtn?.addEventListener('click', () => {
    if (state.user?.role === 'admin') {
      applyTimeAccel(100, 5 * 60 * 1000);
    }
  });
  els.bossList?.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest('.boss-btn') : null;
    if (!target) return;
    const bossId = target.dataset.boss;
    if (!bossId) return;
    if (gameState.battle.ongoing && gameState.battle.bossFight) return;
    setBossSelection(bossId);
  });
  els.startBossBtn?.addEventListener('click', () => {
    if (!state.selectedBossId) return;
    startBossBattle();
  });
  els.resetBossSelection?.addEventListener('click', () => {
    resetBossSelection();
  });
  els.bossIntroSkip?.addEventListener('click', () => {
    completeBossIntro();
  });
  if (els.bossIntroVideo) {
    els.bossIntroVideo.addEventListener('ended', () => {
      completeBossIntro();
    });
    els.bossIntroVideo.addEventListener('error', () => {
      completeBossIntro();
    });
  }
  if (els.bossIntroOverlay) {
    els.bossIntroOverlay.addEventListener('click', (event) => {
      if (event.target === els.bossIntroOverlay) {
        completeBossIntro();
      }
    });
  }
  if (els.ultimateOverlay) {
    els.ultimateOverlay.addEventListener('click', () => {
      if (state.ultimateActive && state.ultimatePending) {
        skipUltimateOverlay();
      }
    });
  }
  if (els.ultimateGif) {
    els.ultimateGif.addEventListener('error', () => {
      if (state.ultimateActive && state.ultimatePending) {
        skipUltimateOverlay();
      }
    });
  }
  els.monsterLevel?.addEventListener('input', (e) => {
    const level = clampMonsterLevel(e.target.value);
    updateMonsterLevelUI(level);
    setLastNormalLevel(level);
    updateEnemyStats(level);
  });
  els.monsterLevelInput?.addEventListener('change', (e) => {
    const level = clampMonsterLevel(e.target.value);
    updateMonsterLevelUI(level);
    setLastNormalLevel(level);
    updateEnemyStats(level);
  });
  els.monsterLevelInput?.addEventListener('input', (e) => {
    const level = clampMonsterLevel(e.target.value);
    updateMonsterLevelUI(level);
    setLastNormalLevel(level);
  });
  els.monsterLevelMinus?.addEventListener('click', () => {
    const current = clampMonsterLevel(els.monsterLevelInput?.value || els.monsterLevel?.value || 1);
    const next = clampMonsterLevel(current - 1);
    updateMonsterLevelUI(next);
    setLastNormalLevel(next);
    updateEnemyStats(next);
  });
  els.monsterLevelPlus?.addEventListener('click', () => {
    const current = clampMonsterLevel(els.monsterLevelInput?.value || els.monsterLevel?.value || 1);
    const next = clampMonsterLevel(current + 1);
    updateMonsterLevelUI(next);
    setLastNormalLevel(next);
    updateEnemyStats(next);
  });
  els.toGacha?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  els.toPvp?.addEventListener('click', () => {
    window.location.href = 'pvp.html';
  });
  els.logout?.addEventListener('click', async () => {
    clearAutoSessionSnapshot();
    await signOut(auth);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'n' && event.key !== 'N') return;
    const tag = (event.target && event.target.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    event.preventDefault();
    startNewBattle();
  });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('beforeunload', handlePageHide);
}

function maybeApplyAutoPlayPreference() {
  gameState.battle.autoPlay = false;
  clearAutoSchedules();
  updateAutoPlayUi();
}

async function loadGlobalConfig() {
  try {
    const snapshot = await get(ref(db, GLOBAL_CONFIG_PATH));
    if (!snapshot.exists()) return null;
    const raw = snapshot.val();
    if (raw && typeof raw === 'object') {
      if (raw.config) {
        return sanitizeConfig(raw.config);
      }
      return sanitizeConfig(raw);
    }
  } catch (error) {
    console.error('전역 설정을 불러오지 못했습니다.', error);
  }
  return null;
}

async function loadOrInitializeProfile(firebaseUser) {
  const uid = firebaseUser.uid;
  const profileRef = ref(db, `users/${uid}`);
  let snapshot;
  try {
    snapshot = await get(profileRef);
  } catch (error) {
    console.error('프로필 로드 실패', error);
    throw error;
  }
  if (!snapshot.exists()) {
    const missingError = new Error('Profile not found');
    missingError.code = 'PROFILE_NOT_FOUND';
    throw missingError;
  }
  let data = snapshot.val() || null;
  const fallbackName = sanitizeUsername(deriveUsernameFromUser(firebaseUser), `user-${uid.slice(0, 6)}`);
  if (!data.username) {
    data.username = fallbackName;
    await update(profileRef, { username: fallbackName, updatedAt: Date.now() });
  }
  return data;
}

async function hydrateProfile(firebaseUser) {
  const rawProfile = await loadOrInitializeProfile(firebaseUser);
  const globalConfig = await loadGlobalConfig();
  const fallbackName = sanitizeUsername(rawProfile.username, deriveUsernameFromUser(firebaseUser));
  const role = rawProfile.role === 'admin' || fallbackName === 'admin' ? 'admin' : 'user';
  state.user = {
    uid: firebaseUser.uid,
    username: fallbackName,
    role,
    email: firebaseUser.email || ''
  };
  document.body.dataset.role = role;
  state.items = sanitizeItems(rawProfile.items);
  state.equip = sanitizeEquipMap(rawProfile.equip);
  state.enhance = sanitizeEnhanceConfig(rawProfile.enhance);
  state.bossProgress = sanitizeBossProgress(rawProfile.bossProgress);
  state.battleProgress = sanitizeBattleProgress(rawProfile.battleProgress);
  state.difficultyState = sanitizeDifficultyState(rawProfile.difficultyState);
  state.autoSession = sanitizeAutoSession(rawProfile.autoSession);
  mergeAutoSessionSnapshot();
  state.pets = sanitizePetState(rawProfile.pets);
  state.characters = sanitizeCharacterState(rawProfile.characters);
  ensureCharacterState();
  state.settings = sanitizeUserSettings(rawProfile.settings);
  state.quests = sanitizeQuestState(rawProfile.quests);

  if (!rawProfile.settings || typeof rawProfile.settings !== 'object') {
    rawProfile.settings = state.settings;
  }
  if (!rawProfile.quests || typeof rawProfile.quests !== 'object') {
    rawProfile.quests = state.quests;
  }
  state.wallet = role === 'admin' ? Number.POSITIVE_INFINITY : clampNumber(rawProfile.wallet, 0, Number.MAX_SAFE_INTEGER, 1000);
  state.gold = role === 'admin' ? Number.POSITIVE_INFINITY : clampNumber(rawProfile.gold, 0, Number.MAX_SAFE_INTEGER, 10000);
  state.combat = {
    useBattleRes: rawProfile.combat?.useBattleRes !== false,
    prefBattleRes: rawProfile.combat?.prefBattleRes !== false,
    autoPotion: rawProfile.combat?.autoPotion === true,
    autoHyper: rawProfile.combat?.autoHyper === true
  };
  if (role !== 'admin' && (state.items?.battleRes || 0) <= 0) {
    state.combat.useBattleRes = false;
  }
  state.buffs = { accelUntil: 0, accelMultiplier: 1, hyperUntil: 0, hyperMultiplier: 1 };
  state.timeAccel = { multiplier: 1, until: 0 };
  state.profile = {
    ...rawProfile,
    username: fallbackName,
    role,
    items: state.items,
    equip: state.equip,
    enhance: state.enhance,
    wallet: state.wallet,
    gold: state.gold,
    combat: { ...state.combat },
    pets: state.pets,
    characters: state.characters,
    quests: state.quests,
    bossProgress: state.bossProgress,
    battleProgress: state.battleProgress,
    difficultyState: state.difficultyState,
    autoSession: state.autoSession,
    settings: state.settings
  };
  const personalConfig = sanitizeConfig(rawProfile.config);
  const effectiveConfig = globalConfig || personalConfig;
  state.config = effectiveConfig;
  state.profile.config = effectiveConfig;
  syncGifToggleControls();
  state.config.monsterScaling = normalizeMonsterScaling(state.config.monsterScaling);
  ensurePlayerReady();
  gameState.player.status = {};
  resetUltimateState();
  const savedLevel = clampMonsterLevel(state.battleProgress?.lastLevel || 1);
  updateMonsterLevelUI(savedLevel);
  setLastNormalLevel(savedLevel, { persist: false });
  updateEnemyStats(savedLevel);
  updateResourceSummary();
  updateBattleResUi();
  updateAutoPlayUi();
  updateAutoSessionUi();
  attachGlobalConfigListener();
  startBuffTicker();
  if (els.whoami) els.whoami.textContent = `${fallbackName} (${role === 'admin' ? '관리자' : '회원'})`;
  updateBossUi();
}

function attachAuthListener() {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      window.location.href = 'login.html';
      return;
    }
    try {
      await hydrateProfile(firebaseUser);
      maybeApplyAutoPlayPreference();
      startNewBattle();
    } catch (error) {
      console.error('전투 페이지 초기화 실패', error);
      if (error?.code === 'PROFILE_NOT_FOUND') {
        addBattleLog('프로필 정보를 찾을 수 없습니다. 다시 로그인해주세요.', 'damage');
        await signOut(auth);
        window.location.href = 'login.html';
        return;
      }
      addBattleLog('프로필을 불러오는 중 오류가 발생했습니다.', 'damage');
    }
  });
}

(function init() {
  initEventListeners();
  attachAuthListener();
})();
