/* eslint-disable no-loss-of-precision */
import { TIERS, TIER_INDEX, PART_DEFS } from './constants.js';

export const TIER_ATK = {
  'SSS+': '1000000-2500000',
  'SS+': '200000-650000',
  'S+': '80000-200000',
  S: '30000-80000',
  A: '8000-30000',
  B: '1500-8000',
  C: '400-1500',
  D: '50-400'
};

export const TIER_DEF = {
  'SSS+': '400000-900000',
  'SS+': '100000-350000',
  'S+': '40000-100000',
  S: '15000-40000',
  A: '4000-15000',
  B: '800-4000',
  C: '200-800',
  D: '20-200'
};

export const LEGENDARY_GEAR_FLOOR = 'SS+';
export const LEGENDARY_CHARACTER_FLOOR = 'S+';

export const CD_MANUAL_MS = 10_000;
export const CD_AUTO_MS = 20_000;

export function chooseTier(probs, rng) {
  let u = rng();
  let acc = 0;
  for (const tier of TIERS) {
    acc += probs[tier];
    if (u < acc) {
      return tier;
    }
  }
  return 'D';
}

export function rescaledPick(allowed, probs, rng) {
  const total = allowed.reduce((sum, tier) => sum + probs[tier], 0);
  let u = rng() * total;
  let acc = 0;
  for (const tier of allowed) {
    acc += probs[tier];
    if (u < acc) {
      return tier;
    }
  }
  return allowed[allowed.length - 1];
}

export function rollRange(rangeText, rng) {
  const [lo, hi] = rangeText.split('-').map((value) => parseInt(value, 10));
  const u = rng();
  return Math.floor(lo + u * (hi - lo + 1));
}

export function rollStatFor(tier, partKey, rng) {
  const part = PART_DEFS.find((entry) => entry.key === partKey);
  if (!part) {
    return 0;
  }
  const table = part.type === 'atk' ? TIER_ATK : TIER_DEF;
  return rollRange(table[tier], rng);
}

export function choosePart(rng) {
  const index = Math.floor(rng() * PART_DEFS.length);
  return PART_DEFS[index].key;
}

export function threshold(level) {
  return 100 * Math.pow(level, 1.3);
}

export function winProbability(atk, def, level) {
  const th = threshold(level);
  const pAtk = atk / (atk + th);
  const pDef = def / (def + th * 0.8);
  const p = 0.5 * pAtk + 0.5 * pDef;
  return Math.max(0.01, Math.min(0.99, p));
}

export function levelReward(level) {
  return Math.max(1, 2 * level - 1);
}

export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function isAtLeast(tier, floor) {
  return TIER_INDEX[tier] <= TIER_INDEX[floor];
}

export function isLegendaryGearTier(tier) {
  return !!tier && isAtLeast(tier, LEGENDARY_GEAR_FLOOR);
}

export function isLegendaryCharacterTier(tier) {
  return !!tier && isAtLeast(tier, LEGENDARY_CHARACTER_FLOOR);
}

export function expectedCounts(drawCount, probs) {
  return Object.fromEntries(TIERS.map((tier) => [tier, drawCount * probs[tier]]));
}

// Chi-square helpers
export function gammaln(z) {
  const coefficients = [
    57.1562356658629235,
    -59.5979603554754912,
    14.1360979747417471,
    -0.491913816097620199,
    0.339946499848118887e-4,
    0.465236289270485756e-4,
    -0.983744753048795646e-4,
    0.158088703224912494e-3,
    -0.210264441724104883e-3,
    0.217439618115212643e-3,
    -0.164318106536763890e-3,
    0.844182239838527433e-4,
    -0.261908384015814087e-4,
    0.368991826595316234e-5
  ];

  let x = 0.999999999999997092;
  for (let i = 0; i < coefficients.length; i += 1) {
    x += coefficients[i] / (z + i + 1);
  }
  const t = z + coefficients.length - 0.5;
  return 0.9189385332046727 + Math.log(x) + (z + 0.5) * Math.log(t) - t;
}

export function lowerGamma(s, x) {
  let sum = 1 / s;
  let term = sum;
  for (let k = 1; k < 200; k += 1) {
    term *= x / (s + k);
    sum += term;
    if (term < 1e-12) {
      break;
    }
  }
  return Math.pow(x, s) * Math.exp(-x) * sum;
}

export function gammaincP(s, x) {
  if (x <= 0) {
    return 0;
  }
  if (x < s + 1) {
    return lowerGamma(s, x) / Math.exp(gammaln(s));
  }

  const eps = 1e-12;
  let b = x + 1 - s;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i += 1) {
    const an = -i * (i - s);
    b += 2;
    d = (an * d + b);
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = b + an / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) {
      break;
    }
  }
  const Q = Math.exp(s * Math.log(x) - x - gammaln(s)) * h;
  return 1 - Q;
}

export function chiSquarePValue(chi2, dof) {
  if (dof <= 0) {
    return Number.NaN;
  }
  const x = chi2 / 2;
  const s = dof / 2;
  const P = gammaincP(s, x);
  return 1 - P;
}
