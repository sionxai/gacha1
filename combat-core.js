// Shared combat utilities used by battle and PVP pages.
export const TIERS = ['SSS+', 'SS+', 'S+', 'S', 'A', 'B', 'C', 'D'];
export const TIER_INDEX = Object.fromEntries(TIERS.map((tier, idx) => [tier, idx]));

export const PART_DEFS = [
  { key: 'head', name: '투구', type: 'def' },
  { key: 'body', name: '갑옷', type: 'def' },
  { key: 'main', name: '주무기', type: 'atk' },
  { key: 'off', name: '보조무기', type: 'atk' },
  { key: 'boots', name: '신발', type: 'def' }
];
export const PART_KEYS = PART_DEFS.map((part) => part.key);
export const PART_ICONS = { head: '🪖', body: '🛡️', main: '⚔️', off: '🗡️', boots: '🥾' };

export const DEFAULT_DROP_RATES = {
  potion: { base: 0.04, perLevel: 0.000045, max: 0.25 },
  hyperPotion: { base: 0.01, perLevel: 0.00005, max: 0.12 },
  protect: { base: 0.02, perLevel: 0.00003, max: 0.18 },
  enhance: { base: 0.75, perLevel: 0.0002, max: 1.0 },
  battleRes: { base: 0.01, perLevel: 0.00002, max: 0.08 }
};
export const DEFAULT_GOLD_SCALING = { minLow: 120, maxLow: 250, minHigh: 900, maxHigh: 1400 };
export const DEFAULT_POTION_SETTINGS = { durationMs: 60000, manualCdMs: 1000, autoCdMs: 2000, speedMultiplier: 2 };
export const DEFAULT_HYPER_POTION_SETTINGS = { durationMs: 60000, manualCdMs: 200, autoCdMs: 200, speedMultiplier: 4 };
export const DEFAULT_MONSTER_SCALING = {
  basePower: 500,
  maxPower: 50000000,
  curve: 1.6,
  difficultyMultiplier: 2,
  attackShare: 0.32,
  defenseShare: 0.22,
  hpMultiplier: 6.5,
  speedBase: 100,
  speedMax: 260,
  critRateBase: 5,
  critRateMax: 55,
  critDmgBase: 160,
  critDmgMax: 420,
  dodgeBase: 3,
  dodgeMax: 40
};

export const DEFAULT_DIFFICULTY_ADJUSTMENTS = {
  easy: -50,
  hard: 100
};

export const DEFAULT_USER_SETTINGS = {
  effects: {
    characterUltimateGif: true,
    petUltimateGif: true
  }
};

export function sanitizeUserSettings(raw) {
  const result = {
    effects: {
      characterUltimateGif: DEFAULT_USER_SETTINGS.effects.characterUltimateGif,
      petUltimateGif: DEFAULT_USER_SETTINGS.effects.petUltimateGif
    }
  };

  if (raw && typeof raw === 'object') {
    const sourceEffects = raw.effects && typeof raw.effects === 'object' ? raw.effects : raw;
    if (Object.prototype.hasOwnProperty.call(sourceEffects, 'characterUltimateGif')) {
      const value = sourceEffects.characterUltimateGif;
      if (typeof value === 'boolean') {
        result.effects.characterUltimateGif = value;
      } else if (typeof value === 'string') {
        result.effects.characterUltimateGif = value !== 'false';
      }
    }
    if (Object.prototype.hasOwnProperty.call(sourceEffects, 'petUltimateGif')) {
      const value = sourceEffects.petUltimateGif;
      if (typeof value === 'boolean') {
        result.effects.petUltimateGif = value;
      } else if (typeof value === 'string') {
        result.effects.petUltimateGif = value !== 'false';
      }
    }
  }

  return result;
}
export const DEFAULT_SHOP_PRICES = {
  potion: 500,
  hyperPotion: 2000,
  protect: 1200,
  enhance: 800,
  battleRes: 2000,
  starterPack: 5000
};

export function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || !isFinite(value)) return fallback;
  let n = Math.floor(value);
  if (typeof min === 'number' && n < min) n = min;
  if (typeof max === 'number' && n > max) n = max;
  return n;
}

export function defaultEnhance() {
  const multipliers = [
    1,
    1.1,
    1.1990,
    1.2949,
    1.3856,
    1.4687,
    1.5421,
    1.6192,
    1.6840,
    1.7514,
    1.8039,
    1.8580,
    1.9138,
    1.9616,
    2.0107,
    2.0609,
    2.1021,
    2.1442,
    3.0,
    5.0,
    12.0
  ];
  const probs = [
    0,
    0.99,
    0.97,
    0.95,
    0.92,
    0.9,
    0.8,
    0.7,
    0.6,
    0.5,
    0.45,
    0.35,
    0.3,
    0.25,
    0.2,
    0.15,
    0.05,
    0.04,
    0.03,
    0.02,
    0.01
  ];
  return { multipliers, probs };
}

export const ENHANCEMENT_RULES = Object.freeze([
  { level: 1, cost: 1, bonus: 0.10 },
  { level: 2, cost: 1, bonus: 0.10 },
  { level: 3, cost: 1, bonus: 0.10 },
  { level: 4, cost: 3, bonus: 0.30 },
  { level: 5, cost: 3, bonus: 0.30 },
  { level: 6, cost: 3, bonus: 0.30 },
  { level: 7, cost: 5, bonus: 0.50, label: 'MAX' }
]);

export const MAX_ENHANCEMENT_LEVEL = ENHANCEMENT_RULES[ENHANCEMENT_RULES.length - 1].level;

const enhancementRuleMap = new Map();
const enhancementCumulativeBonus = [];
let enhancementBonusTotal = 0;

ENHANCEMENT_RULES.forEach((rule) => {
  enhancementRuleMap.set(rule.level, rule);
  enhancementBonusTotal += rule.bonus;
  enhancementCumulativeBonus[rule.level] = enhancementBonusTotal;
});

export function clampEnhancementLevel(level) {
  const numeric = typeof level === 'number' && isFinite(level) ? level : 0;
  if (numeric <= 0) return 0;
  if (numeric >= MAX_ENHANCEMENT_LEVEL) return MAX_ENHANCEMENT_LEVEL;
  return Math.floor(numeric);
}

export function getEnhancementRule(level) {
  return enhancementRuleMap.get(level) || null;
}

export function getEnhancementRequirement(currentLevel) {
  const nextLevel = clampEnhancementLevel(currentLevel) + 1;
  return getEnhancementRule(nextLevel);
}

export function getEnhancementMultiplier(level) {
  const clamped = clampEnhancementLevel(level);
  if (clamped <= 0) {
    return 1;
  }
  const bonus = enhancementCumulativeBonus[clamped] || 0;
  return 1 + bonus;
}

export function clampEnhancementProgress(currentLevel, progress) {
  if (!(typeof progress === 'number' && isFinite(progress))) {
    return 0;
  }
  const requirement = getEnhancementRequirement(currentLevel);
  if (!requirement) {
    return 0;
  }
  const max = Math.max(0, requirement.cost - 1);
  return clampNumber(progress, 0, max, 0);
}

export function sanitizeEquipItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const tier = TIERS.includes(raw.tier) ? raw.tier : null;
  const part = PART_KEYS.includes(raw.part) ? raw.part : null;
  if (!tier || !part) return null;
  const type = raw.type === 'def' ? 'def' : 'atk';
  const lvl = clampEnhancementLevel(raw.lvl ?? raw.enhanceLevel ?? 0);
  const progressRaw = raw.progress ?? raw.enhanceProgress ?? 0;
  return {
    id: clampNumber(raw.id, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    tier,
    part,
    base: clampNumber(raw.base ?? raw.stat, 0, Number.MAX_SAFE_INTEGER, 0),
    lvl,
    progress: clampEnhancementProgress(lvl, progressRaw),
    type
  };
}

export function sanitizeEquipMap(raw) {
  const result = { head: null, body: null, main: null, off: null, boots: null };
  if (raw && typeof raw === 'object') {
    PART_KEYS.forEach((key) => {
      result[key] = sanitizeEquipItem(raw[key]);
    });
  }
  return result;
}

export const PET_IDS = ['pet_ant', 'pet_deer', 'pet_goat', 'pet_tiger', 'pet_horang'];

export const PET_DEFS = {
  pet_ant: {
    id: 'pet_ant',
    name: '사막 개미 수호병',
    icon: '🐜',
    passive: {
      flat: { def: 320, hp: 900 },
      pct: { def: 0.08 }
    },
    active: {
      type: 'shield',
      chance: 0.32,
      amountPct: 0.12,
      maxPct: 0.3,
      message: '보호막을 전개해 피해를 흡수합니다.'
    }
  },
  pet_deer: {
    id: 'pet_deer',
    name: '서리 숲 순록',
    icon: '🦌',
    passive: {
      flat: { hp: 700, dodge: 4 },
      pct: { hp: 0.05 }
    },
    active: {
      type: 'heal',
      chance: 0.28,
      amountPct: 0.09,
      message: '자연의 힘으로 체력을 회복합니다.'
    }
  },
  pet_goat: {
    id: 'pet_goat',
    name: '화염 산양왕',
    icon: '🐐',
    passive: {
      flat: { atk: 220, critDmg: 12 }
    },
    active: {
      type: 'attackBuff',
      chance: 0.22,
      attackPct: 0.18,
      critRateBonus: 5,
      message: '염화의 격노로 공격력이 상승합니다.'
    }
  },
  pet_tiger: {
    id: 'pet_tiger',
    name: '호령의 그림자',
    icon: '🐅',
    passive: {
      flat: { atk: 260, speed: 10, critRate: 4 }
    },
    active: {
      type: 'strike',
      chance: 0.18,
      ratio: 0.28,
      minDamage: 150,
      message: '그림자 일격으로 선제 피해를 가합니다.'
    }
  },
  pet_horang: {
    id: 'pet_horang',
    name: '호랭찡',
    icon: '🐯',
    passive: {
      flat: { atk: 420, def: 320, hp: 2400 },
      pct: { atk: 0.08, def: 0.08 }
    },
    active: {
      type: 'tigerLegend',
      killChance: 0.05,
      blockChance: 0.15,
      reflectChance: 0.05,
      message: '5% 즉사, 15% 전방위 방어, 5% 피해 반사'
    }
  }
};

export function getPetDefinition(petId) {
  if (!petId) return null;
  return PET_DEFS[petId] || null;
}

export function createDefaultPetState() {
  const owned = {};
  PET_IDS.forEach((id) => {
    owned[id] = 0;
  });
  return { owned, active: null, pity: 0 };
}

export function sanitizePetState(raw) {
  const state = createDefaultPetState();
  if (raw && typeof raw === 'object') {
    if (raw.owned && typeof raw.owned === 'object') {
      PET_IDS.forEach((petId) => {
        state.owned[petId] = clampNumber(raw.owned[petId], 0, Number.MAX_SAFE_INTEGER, 0);
      });
    }
    if (typeof raw.active === 'string' && PET_IDS.includes(raw.active)) {
      state.active = raw.active;
    }
    state.pity = clampNumber(raw.pity, 0, Number.MAX_SAFE_INTEGER, 0);
  }
  return state;
}

export function sanitizePetWeights(raw) {
  const defaults = {};
  PET_IDS.forEach((petId) => {
    defaults[petId] = 1;
  });
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const weights = { ...defaults };
  PET_IDS.forEach((petId) => {
    const value = raw[petId];
    if (typeof value === 'number' && isFinite(value) && value >= 0) {
      weights[petId] = value;
    }
  });
  return weights;
}

const PET_STAT_LABELS = {
  atk: '공격력',
  def: '방어력',
  hp: '체력',
  critRate: '크리티컬 확률',
  critDmg: '크리티컬 피해',
  dodge: '회피',
  speed: '속도'
};

const CHARACTER_CLASS_INFO = Object.freeze({
  warrior: { code: 'wa', name: '전사', assetDir: 'warrior', assetPrefix: 'wa' },
  mage: { code: 'ma', name: '마법사', assetDir: 'wizard', assetPrefix: 'wi' },
  archer: { code: 'ar', name: '궁수', assetDir: 'archer', assetPrefix: 'ar' },
  rogue: { code: 'ro', name: '도적', assetDir: 'rogue', assetPrefix: 'ro' },
  goddess: { code: 'go', name: '여신', assetDir: 'goddess', assetPrefix: 'god' }
});

export const CHARACTER_CLASS_IDS = Object.freeze(Object.keys(CHARACTER_CLASS_INFO));

const BALANCE_STAT_KEYS = Object.freeze(['hp', 'atk', 'def', 'critRate', 'critDmg', 'dodge', 'speed']);

export const DEFAULT_CHARACTER_BALANCE = CHARACTER_CLASS_IDS.reduce((acc, classId) => {
  acc[classId] = {
    skill: 1,
    stats: BALANCE_STAT_KEYS.reduce((statsAcc, key) => {
      statsAcc[key] = 1;
      return statsAcc;
    }, {}),
    offsets: BALANCE_STAT_KEYS.reduce((offsetAcc, key) => {
      offsetAcc[key] = 0;
      return offsetAcc;
    }, {})
  };
  return acc;
}, {});

export function sanitizeCharacterBalance(raw) {
  const result = JSON.parse(JSON.stringify(DEFAULT_CHARACTER_BALANCE));
  if (!raw || typeof raw !== 'object') {
    return result;
  }
  CHARACTER_CLASS_IDS.forEach((classId) => {
    const entry = raw[classId];
    if (!entry || typeof entry !== 'object') return;
    const safe = result[classId];
    if (typeof entry.skill === 'number' && isFinite(entry.skill) && entry.skill >= 0) {
      safe.skill = entry.skill;
    }
    if (entry.stats && typeof entry.stats === 'object') {
      BALANCE_STAT_KEYS.forEach((key) => {
        const value = entry.stats[key];
        if (typeof value === 'number' && isFinite(value) && value >= 0) {
          safe.stats[key] = value;
        }
      });
    }
    if (entry.offsets && typeof entry.offsets === 'object') {
      BALANCE_STAT_KEYS.forEach((key) => {
        const value = entry.offsets[key];
        if (typeof value === 'number' && isFinite(value)) {
          safe.offsets[key] = value;
        }
      });
    }
  });
  return result;
}

const CHARACTER_TIER_POWER_BONUS = Object.freeze({
  D: 0,
  C: 40000,
  B: 250000,
  A: 1000000,
  S: 3000000,
  'S+': 8000000,
  'SS+': 13000000,
  'SSS+': 20000000
});

const CHARACTER_DEFS = {};
const CHARACTER_IDS = [];
const CHARACTER_IDS_BY_TIER = TIERS.reduce((acc, tier) => {
  acc[tier] = [];
  return acc;
}, {});
const CHARACTER_ULTIMATE_DEFS = {};

const TIER_SEQUENCE = ['D', 'C', 'B', 'A', 'S', 'S+', 'SS+', 'SSS+'];

function tierAtLeast(tier, threshold) {
  const currentIndex = TIER_SEQUENCE.indexOf(tier);
  const requiredIndex = TIER_SEQUENCE.indexOf(threshold);
  if (currentIndex === -1 || requiredIndex === -1) return false;
  return currentIndex >= requiredIndex;
}

const DEFAULT_ULTIMATE_CHANCE = 0.05;

function createUltimateDefinition(classId, tier) {
  if (classId === 'goddess') {
    if (!tierAtLeast(tier, 'S+')) return null;
  } else {
    if (!tierAtLeast(tier, 'SS+')) return null;
  }
  const base = {
    chance: DEFAULT_ULTIMATE_CHANCE,
    oncePerBattle: true,
    classId,
    tier
  };
  switch (classId) {
    case 'warrior':
      return tier === 'SSS+'
        ? { ...base, name: '파멸의 낙뢰도', variant: 'warrior-sssplus' }
        : { ...base, name: '천룡 파쇄격', variant: 'warrior-ssplus' };
    case 'mage':
      return tier === 'SSS+'
        ? { ...base, name: '라그나로크 오브', variant: 'mage-sssplus' }
        : { ...base, name: '마나 초신성', variant: 'mage-ssplus' };
    case 'archer':
      return tier === 'SSS+'
        ? { ...base, name: '운석 낙하 사격', variant: 'archer-sssplus' }
        : { ...base, name: '섬광의 연사', variant: 'archer-ssplus' };
    case 'rogue':
      return tier === 'SSS+'
        ? { ...base, name: '혈월 난무', variant: 'rogue-sssplus' }
        : { ...base, name: '그림자 찌르기', variant: 'rogue-ssplus' };
    case 'goddess': {
      if (tier === 'SSS+') {
        return { ...base, name: '창세의 빛', variant: 'goddess-sssplus' };
      }
      if (tier === 'SS+') {
        return { ...base, name: '시간의 기도', variant: 'goddess-ssplus' };
      }
      return { ...base, name: '천상의 축복', variant: 'goddess-splus' };
    }
    default:
      return null;
  }
}

function characterImageCandidates(classInfo, tier) {
  const dir = classInfo.assetDir || classInfo.code;
  const prefix = classInfo.assetPrefix || classInfo.code;
  const variants = [];
  if (typeof tier === 'string' && tier.length) {
    variants.push(tier);
    const noPlus = tier.replace(/\+/g, '');
    if (noPlus !== tier) {
      variants.push(noPlus);
    }
    const lower = tier.toLowerCase();
    if (lower !== tier && !variants.includes(lower)) {
      variants.push(lower);
    }
    const upper = tier.toUpperCase();
    if (upper !== tier && !variants.includes(upper)) {
      variants.push(upper);
    }
  }
  const filenames = [];
  variants.forEach((variant) => {
    if (!variant) return;
    const base = `${prefix}${variant}`;
    filenames.push(`${base}.png`);
    const lowerName = base.toLowerCase();
    if (!filenames.includes(`${lowerName}.png`)) {
      filenames.push(`${lowerName}.png`);
    }
    const upperName = base.toUpperCase();
    if (!filenames.includes(`${upperName}.png`)) {
      filenames.push(`${upperName}.png`);
    }
  });
  filenames.push(`${prefix}.png`);
  const unique = Array.from(new Set(filenames.filter(Boolean)));
  return unique.map((name) => `assets/me/${dir}/${name}`);
}

function registerCharacter(def) {
  const { classId, tier } = def;
  const classInfo = CHARACTER_CLASS_INFO[classId];
  if (!classInfo || !TIERS.includes(tier)) return;
  const id = `${classInfo.code}${tier}`;
  const stats = { ...def.stats };
  const bonusPower = CHARACTER_TIER_POWER_BONUS[tier] || 0;
  if (bonusPower > 0) {
    stats.atk = (stats.atk || 0) + Math.round(bonusPower * 0.65);
    stats.def = (stats.def || 0) + Math.round(bonusPower * 0.15);
    stats.hp = (stats.hp || 0) + Math.round(bonusPower * 0.5);
  }
  const imageVariants = characterImageCandidates(classInfo, tier);
  CHARACTER_DEFS[id] = {
    id,
    tier,
    classId,
    className: classInfo.name,
    name: `${tier} ${classInfo.name}`,
    stats,
    image: imageVariants[0] || '',
    imageVariants
  };
  CHARACTER_IDS.push(id);
  CHARACTER_IDS_BY_TIER[tier].push(id);
  const ultimate = createUltimateDefinition(classId, tier);
  if (ultimate) {
    CHARACTER_ULTIMATE_DEFS[id] = ultimate;
  }
}

[
  { tier: 'D', stats: { hp: 6500, atk: 100, def: 120, critRate: 4, critDmg: 160, dodge: 4, speed: 98 } },
  { tier: 'C', stats: { hp: 7800, atk: 180, def: 144, critRate: 5, critDmg: 165, dodge: 5, speed: 99 } },
  { tier: 'B', stats: { hp: 9750, atk: 300, def: 180, critRate: 6, critDmg: 175, dodge: 6, speed: 101 } },
  { tier: 'A', stats: { hp: 13000, atk: 500, def: 240, critRate: 8, critDmg: 190, dodge: 7, speed: 103 } },
  { tier: 'S', stats: { hp: 19500, atk: 800, def: 360, critRate: 10, critDmg: 210, dodge: 8, speed: 106 } },
  { tier: 'S+', stats: { hp: 32500, atk: 1500, def: 600, critRate: 13, critDmg: 235, dodge: 10, speed: 110 } },
  { tier: 'SS+', stats: { hp: 52000, atk: 3000, def: 960, critRate: 17, critDmg: 260, dodge: 12, speed: 114 } },
  { tier: 'SSS+', stats: { hp: 78000, atk: 6000, def: 1440, critRate: 22, critDmg: 290, dodge: 15, speed: 120 } }
].forEach((entry) => registerCharacter({ classId: 'warrior', ...entry }));

[
  { tier: 'D', stats: { hp: 4500, atk: 150, def: 20, critRate: 7, critDmg: 170, dodge: 5, speed: 102 } },
  { tier: 'C', stats: { hp: 5400, atk: 270, def: 24, critRate: 8, critDmg: 180, dodge: 6, speed: 103 } },
  { tier: 'B', stats: { hp: 6750, atk: 450, def: 30, critRate: 10, critDmg: 195, dodge: 7, speed: 105 } },
  { tier: 'A', stats: { hp: 9000, atk: 750, def: 40, critRate: 13, critDmg: 215, dodge: 8, speed: 108 } },
  { tier: 'S', stats: { hp: 13500, atk: 1200, def: 60, critRate: 17, critDmg: 240, dodge: 10, speed: 111 } },
  { tier: 'S+', stats: { hp: 22500, atk: 2250, def: 100, critRate: 22, critDmg: 270, dodge: 12, speed: 115 } },
  { tier: 'SS+', stats: { hp: 36000, atk: 4500, def: 160, critRate: 28, critDmg: 300, dodge: 15, speed: 119 } },
  { tier: 'SSS+', stats: { hp: 54000, atk: 9000, def: 240, critRate: 35, critDmg: 340, dodge: 18, speed: 124 } }
].forEach((entry) => registerCharacter({ classId: 'mage', ...entry }));

[
  { tier: 'D', stats: { hp: 5200, atk: 130, def: 40, critRate: 8, critDmg: 165, dodge: 6, speed: 105 } },
  { tier: 'C', stats: { hp: 6240, atk: 234, def: 48, critRate: 10, critDmg: 175, dodge: 7, speed: 106 } },
  { tier: 'B', stats: { hp: 7800, atk: 390, def: 60, critRate: 13, critDmg: 190, dodge: 9, speed: 108 } },
  { tier: 'A', stats: { hp: 10400, atk: 650, def: 80, critRate: 17, critDmg: 210, dodge: 11, speed: 111 } },
  { tier: 'S', stats: { hp: 15600, atk: 1040, def: 120, critRate: 22, critDmg: 235, dodge: 14, speed: 114 } },
  { tier: 'S+', stats: { hp: 26000, atk: 1950, def: 200, critRate: 28, critDmg: 265, dodge: 18, speed: 118 } },
  { tier: 'SS+', stats: { hp: 41600, atk: 3900, def: 320, critRate: 35, critDmg: 295, dodge: 22, speed: 122 } },
  { tier: 'SSS+', stats: { hp: 62400, atk: 7800, def: 480, critRate: 43, critDmg: 330, dodge: 27, speed: 127 } }
].forEach((entry) => registerCharacter({ classId: 'archer', ...entry }));

[
  { tier: 'D', stats: { hp: 4800, atk: 120, def: 30, critRate: 10, critDmg: 160, dodge: 8, speed: 108 } },
  { tier: 'C', stats: { hp: 5760, atk: 216, def: 36, critRate: 13, critDmg: 170, dodge: 10, speed: 110 } },
  { tier: 'B', stats: { hp: 7200, atk: 360, def: 45, critRate: 17, critDmg: 185, dodge: 13, speed: 113 } },
  { tier: 'A', stats: { hp: 9600, atk: 600, def: 60, critRate: 22, critDmg: 205, dodge: 16, speed: 116 } },
  { tier: 'S', stats: { hp: 14400, atk: 960, def: 90, critRate: 28, critDmg: 230, dodge: 20, speed: 120 } },
  { tier: 'S+', stats: { hp: 24000, atk: 1800, def: 150, critRate: 36, critDmg: 260, dodge: 25, speed: 125 } },
  { tier: 'SS+', stats: { hp: 38400, atk: 3600, def: 240, critRate: 45, critDmg: 295, dodge: 31, speed: 130 } },
  { tier: 'SSS+', stats: { hp: 57600, atk: 7200, def: 360, critRate: 55, critDmg: 335, dodge: 38, speed: 136 } }
].forEach((entry) => registerCharacter({ classId: 'rogue', ...entry }));

[
  { tier: 'S+', stats: { hp: 35000, atk: 2700, def: 500, critRate: 15, critDmg: 190, dodge: 10, speed: 110 } },
  { tier: 'SS+', stats: { hp: 56000, atk: 5400, def: 800, critRate: 22, critDmg: 220, dodge: 14, speed: 116 } },
  { tier: 'SSS+', stats: { hp: 84000, atk: 10800, def: 1200, critRate: 30, critDmg: 260, dodge: 20, speed: 123 } }
].forEach((entry) => registerCharacter({ classId: 'goddess', ...entry }));

CHARACTER_IDS.sort((a, b) => a.localeCompare(b));
TIERS.forEach((tier) => {
  CHARACTER_IDS_BY_TIER[tier] = CHARACTER_IDS_BY_TIER[tier] || [];
});

export function sanitizeItems(raw) {
  const template = { potion: 0, hyperPotion: 0, protect: 0, enhance: 0, revive: 0, battleRes: 0, holyWater: 0, petTicket: 0 };
  const result = { ...template };
  if (raw && typeof raw === 'object') {
    Object.keys(template).forEach((key) => {
      result[key] = clampNumber(raw[key], 0, Number.MAX_SAFE_INTEGER, 0);
    });
  }
  return result;
}

export function createDefaultCharacterState() {
  const owned = {};
  const enhancements = {};
  CHARACTER_IDS.forEach((id) => {
    owned[id] = 0;
    enhancements[id] = { level: 0, progress: 0 };
  });
  if (owned.waD !== undefined) {
    owned.waD = Math.max(1, owned.waD);
  }
  const active = CHARACTER_IDS.includes('waD') ? 'waD' : CHARACTER_IDS[0];
  return { owned, active, enhancements };
}

export function sanitizeCharacterState(raw) {
  const defaults = createDefaultCharacterState();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const owned = { ...defaults.owned };
  const enhancements = {};
  CHARACTER_IDS.forEach((id) => {
    const base = defaults.enhancements[id] || { level: 0, progress: 0 };
    enhancements[id] = { level: base.level || 0, progress: base.progress || 0 };
  });
  if (raw.owned && typeof raw.owned === 'object') {
    CHARACTER_IDS.forEach((id) => {
      const value = raw.owned[id];
      owned[id] = clampNumber(value, 0, Number.MAX_SAFE_INTEGER, owned[id]);
    });
  }
  if (owned.waD === 0 && owned.waD !== undefined) {
    owned.waD = 1;
  }
  if (raw.enhancements && typeof raw.enhancements === 'object') {
    CHARACTER_IDS.forEach((id) => {
      const entry = raw.enhancements[id];
      if (entry && typeof entry === 'object') {
        const level = clampEnhancementLevel(entry.level ?? entry.lvl ?? 0);
        enhancements[id] = {
          level,
          progress: clampEnhancementProgress(level, entry.progress ?? entry.shards ?? 0)
        };
      }
    });
  }
  let active = typeof raw.active === 'string' && CHARACTER_IDS.includes(raw.active) ? raw.active : defaults.active;
  if (!owned[active] || owned[active] <= 0) {
    active = defaults.active;
  }
  return { owned, active, enhancements };
}

export function getCharacterDefinition(id) {
  return CHARACTER_DEFS[id] || null;
}

export function getCharacterImageVariants(id) {
  const def = getCharacterDefinition(id);
  if (!def) return [];
  if (Array.isArray(def.imageVariants)) {
    return [...def.imageVariants];
  }
  if (def.image) {
    return [def.image];
  }
  return [];
}

export function characterIdsByTier(tier) {
  return CHARACTER_IDS_BY_TIER[tier] ? [...CHARACTER_IDS_BY_TIER[tier]] : [];
}

export function characterBaseStats(id) {
  const def = getCharacterDefinition(id);
  if (!def) return null;
  return { ...def.stats };
}

export function sanitizeEnhanceConfig(raw) {
  const base = defaultEnhance();
  if (!raw || typeof raw !== 'object') return base;

  const validMultipliers = Array.isArray(raw.multipliers) && raw.multipliers.length >= 21 && typeof raw.multipliers[20] === 'number' && raw.multipliers[20] <= 12.0001;
  if (validMultipliers) {
    base.multipliers = base.multipliers.map((def, idx) => {
      const val = raw.multipliers[idx];
      return typeof val === 'number' && isFinite(val) && val > 0 ? val : def;
    });
  }

  const validProbs = Array.isArray(raw.probs) && raw.probs.length >= 21;
  if (validProbs) {
    base.probs = base.probs.map((def, idx) => {
      const val = raw.probs[idx];
      if (typeof val === 'number' && isFinite(val) && val >= 0 && val <= 1) {
        return val;
      }
      return def;
    });
  }

  return base;
}

function cloneDropRates(src) {
  return JSON.parse(JSON.stringify(src || DEFAULT_DROP_RATES));
}

export function normalizeDropRates(raw) {
  const base = cloneDropRates(DEFAULT_DROP_RATES);
  if (!raw) return base;
  const out = cloneDropRates(base);
  Object.keys(base).forEach((key) => {
    const item = raw[key];
    if (item && typeof item === 'object') {
      if (typeof item.base === 'number') out[key].base = item.base;
      if (typeof item.perLevel === 'number') out[key].perLevel = item.perLevel;
      if (typeof item.max === 'number') out[key].max = item.max;
    } else if (typeof item === 'number') {
      out[key].base = item;
      out[key].perLevel = 0;
      out[key].max = item;
    }
    out[key].base = Math.max(0, Math.min(1, out[key].base));
    out[key].perLevel = Math.max(0, out[key].perLevel);
    out[key].max = Math.max(out[key].base, Math.min(1, out[key].max));
  });
  return out;
}

export function normalizeGoldScaling(raw) {
  const base = { ...DEFAULT_GOLD_SCALING };
  const coerce = (val) => (typeof val === 'number' && isFinite(val) ? val : null);
  if (raw) {
    const a = coerce(raw.minLow);
    const b = coerce(raw.maxLow);
    const c = coerce(raw.minHigh);
    const d = coerce(raw.maxHigh);
    if (a !== null) base.minLow = a;
    if (b !== null) base.maxLow = b;
    if (c !== null) base.minHigh = c;
    if (d !== null) base.maxHigh = d;
  }
  if (base.maxLow < base.minLow) base.maxLow = base.minLow;
  if (base.minHigh < base.minLow) base.minHigh = base.minLow;
  if (base.maxHigh < base.minHigh) base.maxHigh = base.minHigh;
  return base;
}

export function normalizePotionSettings(raw, defaults) {
  const base = { ...defaults };
  if (raw && typeof raw === 'object') {
    const coerce = (val, fallback) => (typeof val === 'number' && isFinite(val) && val >= 0 ? Math.round(val) : fallback);
    const coerceMult = (val, fallback) => (typeof val === 'number' && isFinite(val) && val > 0 ? val : fallback);
    base.durationMs = coerce(raw.durationMs, base.durationMs);
    base.manualCdMs = coerce(raw.manualCdMs, base.manualCdMs);
    base.autoCdMs = coerce(raw.autoCdMs, base.autoCdMs);
    base.speedMultiplier = coerceMult(raw.speedMultiplier, base.speedMultiplier ?? 1);
  }
  return base;
}

export function normalizeMonsterScaling(raw) {
  const base = { ...DEFAULT_MONSTER_SCALING };
  const num = (val, fallback, min, max) => {
    if (typeof val === 'number' && isFinite(val)) {
      let v = val;
      if (typeof min === 'number' && v < min) v = min;
      if (typeof max === 'number' && v > max) v = max;
      return v;
    }
    return fallback;
  };
  if (raw && typeof raw === 'object') {
    base.basePower = num(raw.basePower, base.basePower, 1, 1e12);
    base.maxPower = num(raw.maxPower, base.maxPower, base.basePower, 1e15);
    base.curve = num(raw.curve, base.curve, 0.1, 10);
    base.difficultyMultiplier = num(raw.difficultyMultiplier, base.difficultyMultiplier, 0.1, 10);
    base.attackShare = num(raw.attackShare, base.attackShare, 0.05, 0.9);
    base.defenseShare = num(raw.defenseShare, base.defenseShare, 0.05, 0.9);
    base.hpMultiplier = num(raw.hpMultiplier, base.hpMultiplier, 0.1, 100);
    base.speedBase = num(raw.speedBase, base.speedBase, 1, 1000);
    base.speedMax = num(raw.speedMax, base.speedMax, base.speedBase, 2000);
    base.critRateBase = num(raw.critRateBase, base.critRateBase, 0, 100);
    base.critRateMax = num(raw.critRateMax, base.critRateMax, base.critRateBase, 100);
    base.critDmgBase = num(raw.critDmgBase, base.critDmgBase, 100, 1000);
    base.critDmgMax = num(raw.critDmgMax, base.critDmgMax, base.critDmgBase, 1000);
    base.dodgeBase = num(raw.dodgeBase, base.dodgeBase, 0, 100);
    base.dodgeMax = num(raw.dodgeMax, base.dodgeMax, base.dodgeBase, 95);
  }
  const share = base.attackShare + base.defenseShare;
  if (share >= 0.95) {
    base.attackShare = (base.attackShare / share) * 0.9;
    base.defenseShare = (base.defenseShare / share) * 0.9;
  }
  return base;
}

const clampPercent = (value, min, max, fallback) => {
  const numVal = Number(value);
  if (!Number.isFinite(numVal)) return fallback;
  let next = numVal;
  if (typeof min === 'number' && next < min) next = min;
  if (typeof max === 'number' && next > max) next = max;
  return Math.round(next * 100) / 100;
};

export function sanitizeDifficultyAdjustments(raw) {
  const defaults = DEFAULT_DIFFICULTY_ADJUSTMENTS;
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }
  return {
    easy: clampPercent(raw.easy, -90, 0, defaults.easy),
    hard: clampPercent(raw.hard, 0, 1000, defaults.hard)
  };
}

function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
  if (!(total > 0)) {
    return TIERS.reduce((acc, tier) => {
      acc[tier] = 0;
      return acc;
    }, {});
  }
  return TIERS.reduce((acc, tier) => {
    acc[tier] = weights[tier] / total;
    return acc;
  }, {});
}

export function sanitizeConfig(raw) {
  const weights = TIERS.reduce((acc, tier) => {
    acc[tier] = 0;
    return acc;
  }, {});
  const baseWeights = { ...weights, ...(raw && raw.weights ? raw.weights : {}) };
  const cfgWeights = TIERS.reduce((acc, tier) => {
    const val = baseWeights[tier];
    acc[tier] = typeof val === 'number' && isFinite(val) && val >= 0 ? val : 0;
    return acc;
  }, {});
  const config = {
    weights: cfgWeights,
    probs: normalizeWeights(cfgWeights),
    seed: raw && typeof raw.seed === 'string' ? raw.seed : '',
    locked: !!(raw && raw.locked),
    version: raw && typeof raw.version === 'string' ? raw.version : 'v1',
    pity: {
      enabled: !!(raw && raw.pity && raw.pity.enabled),
      floorTier: raw && raw.pity && TIERS.includes(raw.pity.floorTier) ? raw.pity.floorTier : 'S',
      span: clampNumber(raw && raw.pity && raw.pity.span, 1, 9999, 90)
    },
    minGuarantee10: {
      enabled: !!(raw && raw.minGuarantee10 && raw.minGuarantee10.enabled),
      tier: raw && raw.minGuarantee10 && TIERS.includes(raw.minGuarantee10.tier) ? raw.minGuarantee10.tier : 'A'
    },
    dropRates: normalizeDropRates(raw && raw.dropRates),
    goldScaling: normalizeGoldScaling(raw && raw.goldScaling),
    shopPrices: raw && raw.shopPrices ? { ...DEFAULT_SHOP_PRICES, ...raw.shopPrices } : { ...DEFAULT_SHOP_PRICES },
    potionSettings: normalizePotionSettings(raw && raw.potionSettings, DEFAULT_POTION_SETTINGS),
    hyperPotionSettings: normalizePotionSettings(raw && raw.hyperPotionSettings, DEFAULT_HYPER_POTION_SETTINGS),
    monsterScaling: normalizeMonsterScaling(raw && raw.monsterScaling)
  };
  config.petWeights = sanitizePetWeights(raw && raw.petWeights);
  config.characterBalance = sanitizeCharacterBalance(raw && raw.characterBalance);
  let difficultyAdjustments = sanitizeDifficultyAdjustments(raw && raw.difficultyAdjustments);
  if (!raw || raw.difficultyAdjustments === undefined) {
    const rawMultiplier = raw && raw.monsterScaling && raw.monsterScaling.difficultyMultiplier;
    if (rawMultiplier === 1 && config.monsterScaling.difficultyMultiplier === 1) {
      config.monsterScaling.difficultyMultiplier = DEFAULT_MONSTER_SCALING.difficultyMultiplier;
      difficultyAdjustments = { ...DEFAULT_DIFFICULTY_ADJUSTMENTS };
    }
  }
  config.difficultyAdjustments = difficultyAdjustments;
  return config;
}

export function formatNum(value, locale = 'ko-KR') {
  return Number(value || 0).toLocaleString(locale);
}

export function formatMultiplier(value) {
  const rounded = Math.round((value ?? 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toString();
}

function formatPassiveSegments(passive = {}) {
  const segments = [];
  const flat = passive.flat || {};
  Object.entries(flat).forEach(([key, value]) => {
    if (!(typeof value === 'number' && isFinite(value) && value !== 0)) return;
    const label = PET_STAT_LABELS[key] || key.toUpperCase();
    segments.push(`${label} +${formatNum(value)}`);
  });
  const pct = passive.pct || {};
  Object.entries(pct).forEach(([key, value]) => {
    if (!(typeof value === 'number' && isFinite(value) && value !== 0)) return;
    const label = PET_STAT_LABELS[key] || key.toUpperCase();
    const percent = Math.round(value * 1000) / 10;
    segments.push(`${label} +${percent.toFixed(percent % 1 === 0 ? 0 : 1)}%`);
  });
  return segments;
}

export function describePetAbilities(pet) {
  if (!pet) return { passive: '', active: '' };
  const passiveSegments = formatPassiveSegments(pet.passive);
  const passive = passiveSegments.length ? `패시브: ${passiveSegments.join(', ')}` : '';
  let active = '';
  if (pet.active) {
    const chance = typeof pet.active.chance === 'number' && pet.active.chance > 0 ? `${(Math.round(pet.active.chance * 1000) / 10).toFixed(pet.active.chance * 100 % 1 === 0 ? 0 : 1)}%` : '';
    const message = pet.active.message || '';
    if (message && chance) {
      active = `발동(${chance}): ${message}`;
    } else if (message) {
      active = `발동: ${message}`;
    } else if (chance) {
      active = `발동 확률 ${chance}`;
    }
  }
  return { passive, active };
}

export const TIER_VALUE = {
  'SSS+': 6,
  'SS+': 5,
  'S+': 4,
  S: 3,
  A: 2,
  B: 1.2,
  C: 0.8,
  D: 0.4
};

export function tierScore(tier) {
  return TIER_VALUE[tier] || 1;
}

export function effectiveStat(item, _enhance = defaultEnhance()) {
  if (!item) return 0;
  const lvl = clampEnhancementLevel(item.lvl || 0);
  const mul = getEnhancementMultiplier(lvl);
  return Math.floor((item.base || 0) * mul);
}

function applyPetPassive(stats, passive) {
  if (!passive) return;
  const flat = passive.flat || {};
  Object.entries(flat).forEach(([key, value]) => {
    if (typeof value !== 'number' || !isFinite(value)) return;
    if (typeof stats[key] !== 'number') stats[key] = 0;
    stats[key] += value;
  });
  const pct = passive.pct || {};
  Object.entries(pct).forEach(([key, value]) => {
    if (typeof value !== 'number' || !isFinite(value)) return;
    if (typeof stats[key] !== 'number') stats[key] = 0;
    stats[key] += stats[key] * value;
  });
}

export function computePlayerStats(equipMap, enhanceConfig, baseStats = {}, activePet = null, options = {}) {
  const stats = {
    atk: 0,
    def: 0,
    hp: 5000,
    critRate: 5,
    critDmg: 150,
    dodge: 5,
    speed: 100,
    ...baseStats
  };
  const equipment = [];
  const enhance = enhanceConfig || defaultEnhance();
  PART_DEFS.forEach((def) => {
    const item = equipMap ? equipMap[def.key] : null;
    if (!item) return;
    const eff = effectiveStat(item, enhance);
    const score = tierScore(item.tier);
    equipment.push({ ...item, effective: eff });
    if (item.type === 'atk') {
      stats.atk += eff;
      stats.critRate += 2 + score;
      stats.critDmg += 10 + score * 6;
      stats.speed += score * 1.5;
    } else {
      stats.def += eff;
      stats.hp += eff * (4 + score);
      stats.dodge += 1 + score;
      if (item.part === 'boots') {
        stats.speed += 5 + score * 2;
      }
    }
  });
  const petDef = typeof activePet === 'string' ? getPetDefinition(activePet) : activePet || null;
  if (petDef?.passive) {
    applyPetPassive(stats, petDef.passive);
  }

  const balance = options.balance && typeof options.balance === 'object'
    ? options.balance
    : DEFAULT_CHARACTER_BALANCE;
  let classId = options.classId || null;
  if (!classId && options.characterId) {
    const def = getCharacterDefinition(options.characterId);
    classId = def?.classId || null;
  }
  if (!classId && options.character) {
    classId = options.character.classId || null;
  }
  if (!classId) {
    classId = 'warrior';
  }
  const classBalance = balance[classId] || DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior;
  const statBalance = classBalance.stats || {};
  const statOffsets = classBalance.offsets || {};
  const applyStatMultiplier = (key) => {
    const mult = Number(statBalance[key]);
    if (typeof mult === 'number' && isFinite(mult) && mult > 0 && mult !== 1) {
      stats[key] = stats[key] * mult;
    }
  };
  BALANCE_STAT_KEYS.forEach(applyStatMultiplier);
  BALANCE_STAT_KEYS.forEach((key) => {
    const offset = Number(statOffsets[key]);
    if (typeof offset === 'number' && isFinite(offset) && offset !== 0) {
      stats[key] = (stats[key] || 0) + offset;
    }
  });

  // 캐릭터 강화 배율 적용 (밸런스 배율 이후)
  const characterEnhancementLevel = options.characterEnhancementLevel || 0;
  if (characterEnhancementLevel > 0) {
    const enhancementMultiplier = getEnhancementMultiplier(characterEnhancementLevel);
    if (enhancementMultiplier > 1) {
      BALANCE_STAT_KEYS.forEach((key) => {
        if (typeof stats[key] === 'number') {
          stats[key] = stats[key] * enhancementMultiplier;
        }
      });
    }
  }

  const rawSkillMultiplier = Number(classBalance?.skill);
  const skillMultiplier = typeof rawSkillMultiplier === 'number' && isFinite(rawSkillMultiplier) && rawSkillMultiplier > 0
    ? rawSkillMultiplier
    : 1;

  stats.critRate = Math.min(90, stats.critRate);
  stats.critDmg = Math.min(400, stats.critDmg);
  stats.dodge = Math.min(60, stats.dodge);
  stats.hp = Math.max(1, Math.round(stats.hp));
  stats.speed = Math.max(1, Math.round(stats.speed));
  stats.atk = Math.max(1, Math.round(stats.atk));
  stats.def = Math.max(0, Math.round(stats.def));
  return { stats, equipment, pet: petDef || null, skillMultiplier };
}

export function combatPower(stats) {
  const critFactor = ((stats.critRate || 0) * (stats.critDmg || 100)) / 100;
  const dodgeFactor = (stats.dodge || 0) * 20;
  const speedFactor = (stats.speed || 100) * 2;
  return Math.floor((stats.atk || 0) + (stats.def || 0) * 2 + (stats.hp || 0) / 10 + critFactor + dodgeFactor + speedFactor);
}

export function calculateDamage(attacker, defender, isSkill = false, rng = Math.random) {
  let baseDamage = attacker.atk || attacker.stats?.atk || 100;
  if (isSkill) baseDamage *= 2;
  let isCritical = false;
  const critRate = attacker.critRate || attacker.stats?.critRate || 5;
  if (rng() * 100 < critRate) {
    isCritical = true;
    const critDmg = attacker.critDmg || attacker.stats?.critDmg || 150;
    baseDamage *= critDmg / 100;
  }
  const dodgeRate = defender.dodge || defender.stats?.dodge || 5;
  const accuracyPenalty = Math.max(0, Math.min(0.95, attacker.accuracyPenalty || 0));
  const effectiveDodge = Math.min(95, dodgeRate + accuracyPenalty * 100);
  if (rng() * 100 < effectiveDodge) {
    return { damage: 0, type: 'MISS' };
  }
  const defense = defender.def || defender.stats?.def || 0;
  let finalDamage = Math.max(1, baseDamage - defense * 0.5);
  if (defender.defending) {
    finalDamage *= 0.35;
    defender.defending = false;
  }
  return { damage: Math.floor(finalDamage), type: isCritical ? 'CRITICAL' : 'NORMAL' };
}

export {
  CHARACTER_CLASS_INFO,
  CHARACTER_DEFS,
  CHARACTER_IDS,
  CHARACTER_IDS_BY_TIER,
  CHARACTER_ULTIMATE_DEFS
};

function createCombatant(config) {
  const name = config.displayName || config.name || 'Unknown';
  const stats = { ...config.stats };
  const maxHp = Math.max(1, stats.hp || 1);
  return {
    uid: config.uid || null,
    name,
    stats,
    maxHp,
    hp: maxHp,
    defending: false,
    skillCooldown: 0,
    combat: config.combat || { autoPotion: false, autoHyper: false }
  };
}

function decideAutoAction(combatant, rng) {
  if (combatant.skillCooldown <= 0 && rng() < 0.32) return 'skill';
  if (rng() < 0.18) return 'defend';
  return 'attack';
}

export function simulateTurnBattle({ player, opponent, rng = Math.random, maxTurns = 200 } = {}) {
  const actorA = createCombatant(player);
  const actorB = createCombatant(opponent);
  const logs = [];
  const timeline = [];
  let attacker = actorA;
  let defender = actorB;
  let turn = 1;

  const runAction = (actor, target, action) => {
    const event = {
      turn,
      action,
      actor: { uid: actor.uid, name: actor.name },
      target: target ? { uid: target.uid, name: target.name } : null,
      outcome: 'none',
      damage: 0,
      targetHpBefore: target ? Math.max(0, Math.floor(target.hp)) : null,
      targetHpAfter: target ? Math.max(0, Math.floor(target.hp)) : null,
      log: ''
    };

    switch (action) {
      case 'defend': {
        actor.defending = true;
        event.outcome = 'defend';
        event.log = `[턴 ${turn}] ${actor.name}이(가) 방어 자세를 취했습니다.`;
        logs.push(event.log);
        break;
      }
      case 'skill':
      case 'attack': {
        const isSkill = action === 'skill';
        const result = calculateDamage(actor.stats, target, isSkill, rng);
        const label = isSkill ? '필살기! ' : '';
        if (result.type === 'MISS') {
          event.outcome = 'miss';
          event.log = `[턴 ${turn}] ${actor.name}의 공격이 빗나갔습니다.`;
          logs.push(event.log);
        } else {
          const preHp = target.hp;
          const appliedDamage = Math.min(result.damage, Math.max(0, target.hp));
          target.hp -= appliedDamage;
          const critLabel = result.type === 'CRITICAL' ? ' 크리티컬!' : '';
          event.outcome = result.type === 'CRITICAL' ? 'critical' : 'hit';
          event.damage = appliedDamage;
          event.targetHpBefore = Math.max(0, Math.floor(preHp));
          event.targetHpAfter = Math.max(0, Math.floor(target.hp));
          event.log = `[턴 ${turn}] ${actor.name} ${label}-> ${target.name}: ${formatNum(appliedDamage)} 피해${critLabel}`;
          event.defenderDefeated = target.hp <= 0;
          logs.push(event.log);
        }
        event.isSkill = isSkill;
        if (isSkill) {
          actor.skillCooldown = 3;
        }
        break;
      }
      default:
        event.outcome = 'none';
        break;
    }

    if (actor.skillCooldown > 0) {
      actor.skillCooldown -= 1;
    }

    event.actorHpAfter = Math.max(0, Math.floor(actor.hp));
    timeline.push(event);
    return event;
  };

  while (attacker.hp > 0 && defender.hp > 0 && turn <= maxTurns) {
    const action = decideAutoAction(attacker, rng);
    runAction(attacker, defender, action);
    if (defender.hp <= 0) break;
    [attacker, defender] = [defender, attacker];
    turn += 1;
  }

  let winner = null;
  let loser = null;
  let outcomeLog = '';
  if (actorA.hp <= 0 && actorB.hp <= 0) {
    outcomeLog = '전투가 무승부로 종료되었습니다.';
    logs.push(outcomeLog);
  } else if (actorA.hp <= 0) {
    winner = actorB;
    loser = actorA;
    outcomeLog = `${winner.name} 승리!`;
    logs.push(outcomeLog);
  } else if (actorB.hp <= 0) {
    winner = actorA;
    loser = actorB;
    outcomeLog = `${winner.name} 승리!`;
    logs.push(outcomeLog);
  } else {
    outcomeLog = '턴 제한으로 전투가 무승부로 종료되었습니다.';
    logs.push(outcomeLog);
  }

  timeline.push({
    turn,
    action: 'result',
    actor: winner ? { uid: winner.uid, name: winner.name } : null,
    target: loser ? { uid: loser.uid, name: loser.name } : null,
    outcome: winner ? 'victory' : actorA.hp <= 0 && actorB.hp <= 0 ? 'draw' : 'timeout',
    log: outcomeLog,
    remaining: {
      A: Math.max(0, Math.floor(actorA.hp)),
      B: Math.max(0, Math.floor(actorB.hp))
    }
  });

  return {
    logs,
    timeline,
    winner: winner
      ? { uid: winner.uid, name: winner.name, stats: { ...winner.stats }, remainingHp: Math.max(0, Math.floor(winner.hp)) }
      : null,
    loser: loser
      ? { uid: loser.uid, name: loser.name, stats: { ...loser.stats }, remainingHp: Math.max(0, Math.floor(loser.hp)) }
      : null,
    turns: turn,
    remaining: { A: Math.max(0, Math.floor(actorA.hp)), B: Math.max(0, Math.floor(actorB.hp)) }
  };
}
