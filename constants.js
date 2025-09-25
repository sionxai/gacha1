export const TIERS = ["SSS+","SS+","S+","S","A","B","C","D"];
export const TIER_INDEX = Object.fromEntries(TIERS.map((tier, index) => [tier, index]));
export const TIER_RANK = Object.fromEntries(TIERS.map((tier, index) => [tier, TIERS.length - index]));

export const MAX_LEVEL = 999;

export const DEFAULT_DROP_RATES = {
  potion: { base: 0.04, perLevel: 0.000045, max: 0.25 },
  hyperPotion: { base: 0.01, perLevel: 0.00005, max: 0.12 },
  protect: { base: 0.02, perLevel: 0.00003, max: 0.18 },
  enhance: { base: 0.75, perLevel: 0.0002, max: 1.0 },
  battleRes: { base: 0.01, perLevel: 0.00002, max: 0.08 }
};

export const DEFAULT_POTION_P = DEFAULT_DROP_RATES.potion.base;
export const DEFAULT_HYPER_P = DEFAULT_DROP_RATES.hyperPotion.base;
export const DEFAULT_PROTECT_P = DEFAULT_DROP_RATES.protect.base;
export const DEFAULT_ENHANCE_P = DEFAULT_DROP_RATES.enhance.base;
export const DEFAULT_BATTLERES_P = DEFAULT_DROP_RATES.battleRes.base;

export const DEFAULT_GOLD_SCALING = {
  minLow: 120,
  maxLow: 250,
  minHigh: 900,
  maxHigh: 1400
};

export const DEFAULT_POTION_SETTINGS = {
  durationMs: 60000,
  manualCdMs: 1000,
  autoCdMs: 2000,
  speedMultiplier: 2
};

export const DEFAULT_HYPER_POTION_SETTINGS = {
  durationMs: 60000,
  manualCdMs: 200,
  autoCdMs: 200,
  speedMultiplier: 4
};

export const RARE_ANIMATION_DURATION_MS = 3600;
export const RARE_ANIMATION_FADE_MS = 220;

export const DEFAULT_SHOP_PRICES = {
  potion: 500,
  hyperPotion: 2000,
  protect: 1200,
  enhance: 800,
  battleRes: 2000,
  holyWater: 1000000,
  starterPack: 5000
};

export const DIAMOND_SHOP_PACKS = Object.freeze([
  { id: 'diamondPack10', label: '초소형 충전팩', bonus: '입문 패키지', diamonds: 10, points: 100_000, gold: 100_000 },
  { id: 'diamondPack100', label: '소형 충전팩', bonus: '기본 제공', diamonds: 100, points: 1_000_000, gold: 1_000_000 },
  { id: 'diamondPack250', label: '가성비 충전팩', bonus: '+10% 보너스', diamonds: 250, points: 2_800_000, gold: 2_800_000 },
  { id: 'diamondPack500', label: '고급 충전팩', bonus: '+20% 보너스', diamonds: 500, points: 6_000_000, gold: 6_000_000 },
  { id: 'diamondPack1000', label: '에픽 충전팩', bonus: '+35% 보너스', diamonds: 1_000, points: 13_500_000, gold: 13_500_000 },
  { id: 'diamondPack2000', label: '전설 충전팩', bonus: '+50% 보너스', diamonds: 2_000, points: 30_000_000, gold: 30_000_000 }
]);

export const DIAMOND_PACK_LOOKUP = Object.freeze(
  Object.fromEntries(DIAMOND_SHOP_PACKS.map((pack) => [pack.id, pack]))
);

export const ENHANCE_TICKET_COST = Object.freeze([
  0, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 20, 20, 29, 60, 118
]);

export const ENHANCE_PROTECT_COST = Object.freeze([
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 4, 4
]);

export const ENHANCE_EXPECTED_GOLD = Object.freeze([
  0,
  2828,
  2887,
  2947,
  3043,
  3111,
  3500,
  5143,
  6000,
  8800,
  9778,
  14857,
  17333,
  24000,
  34000,
  50667,
  400000,
  500000,
  906667,
  2800000,
  10240000
]);

export const DEFAULT_FLAGS = Object.freeze({
  animationsEnabled: true,
  bannersEnabled: false,
  rewardsPreset: 'default'
});

export const GEAR_SSPLUS_GIF = 'https://firebasestorage.googleapis.com/v0/b/gacha-870fa.firebasestorage.app/o/SS%2B%20item.gif?alt=media&token=d614c7c7-eff3-4509-b1d6-a732b75936c4';
export const GEAR_SSSPLUS_GIF = 'https://firebasestorage.googleapis.com/v0/b/gacha-870fa.firebasestorage.app/o/SSS%2B%20item.gif?alt=media&token=e8ae9b0c-5891-4653-8c4c-fe2155d6473d';
export const LEGACY_GEAR_RARE_GIF = 'https://firebasestorage.googleapis.com/v0/b/gacha-870fa.firebasestorage.app/o/Carss%2B.gif?alt=media&token=d668d79b-7740-4986-b32e-11027a0453ac';
export const CHARACTER_SSPLUS_GIF = GEAR_SSPLUS_GIF;
export const CHARACTER_SSSPLUS_GIF = GEAR_SSSPLUS_GIF;
export const LEGACY_CHARACTER_RARE_GIF = LEGACY_GEAR_RARE_GIF;

export const DEFAULT_RARE_ANIMATIONS = {
  gear: [
    {
      tier: 'SS+',
      src: GEAR_SSPLUS_GIF,
      label: 'SS+ 장비 획득!',
      duration: RARE_ANIMATION_DURATION_MS
    },
    {
      tier: 'SSS+',
      src: GEAR_SSSPLUS_GIF,
      label: 'SSS+ 장비 획득!',
      duration: RARE_ANIMATION_DURATION_MS
    }
  ],
  character: [
    {
      tier: 'SS+',
      src: CHARACTER_SSPLUS_GIF,
      label: 'SS+ 캐릭터 획득!',
      duration: RARE_ANIMATION_DURATION_MS
    },
    {
      tier: 'SSS+',
      src: CHARACTER_SSSPLUS_GIF,
      label: 'SSS+ 캐릭터 획득!',
      duration: RARE_ANIMATION_DURATION_MS
    }
  ]
};

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

export const CHARACTER_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2210%22%20ry%3D%2210%22%20fill%3D%22%23d0d0d0%22/%3E%3Cpath%20d%3D%22M32%2018a10%2010%200%201%201%200%2020a10%2010%200%200%201%200-20zm0%2024c10.5%200%2019%206.3%2019%2014v4H13v-4c0-7.7%208.5-14%2019-14z%22%20fill%3D%22%23808080%22/%3E%3C/svg%3E';

export const GLOBAL_CONFIG_PATH = 'config/global';

export const PART_DEFS = [
  { key: 'head', name: '투구', type: 'def' },
  { key: 'body', name: '갑옷', type: 'def' },
  { key: 'main', name: '주무기', type: 'atk' },
  { key: 'off', name: '보조무기', type: 'atk' },
  { key: 'boots', name: '신발', type: 'def' }
];

export const PART_KEYS = PART_DEFS.map((part) => part.key);

export const PART_ICONS = {
  head: '🪖',
  body: '🛡️',
  main: '⚔️',
  off: '🗡️',
  boots: '🥾'
};

export const ALL_USERS_OPTION = '__ALL_USERS__';

export const defaultWeights = { "SSS+": 5, "SS+": 15, "S+": 35, "S": 80, "A": 120, "B": 200, "C": 300, "D": 245 };

export const cfgVersion = 'v1';

export const CLASS_LABELS = {
  warrior: '전사',
  mage: '마법사',
  archer: '궁수',
  rogue: '도적',
  goddess: '여신'
};
