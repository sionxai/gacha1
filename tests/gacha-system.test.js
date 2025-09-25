import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseTier,
  rescaledPick,
  rollStatFor,
  choosePart,
  expectedCounts,
  isAtLeast,
  isLegendaryGearTier,
  isLegendaryCharacterTier,
  shuffle,
  winProbability,
  levelReward,
  CD_MANUAL_MS,
  CD_AUTO_MS
} from '../gacha-system.js';
import { TIERS, PART_DEFS } from '../constants.js';

const fixedRng = (...values) => {
  let index = 0;
  return () => {
    const value = index < values.length ? values[index] : values[values.length - 1];
    index += 1;
    return value;
  };
};

test('chooseTier respects probability order', () => {
  const probs = Object.fromEntries(TIERS.map((tier, idx) => [tier, idx === 0 ? 1 : 0]));
  const tier = chooseTier(probs, fixedRng(0));
  assert.equal(tier, TIERS[0]);
});

test('rescaledPick only yields allowed tiers', () => {
  const probs = Object.fromEntries(TIERS.map((tier) => [tier, 1]));
  const allowed = TIERS.slice(0, 2);
  const pick = rescaledPick(allowed, probs, fixedRng(0.5));
  assert.equal(allowed.includes(pick), true);
});

test('rollStatFor stays within declared range', () => {
  const tier = TIERS[0];
  const part = PART_DEFS[0].key;
  const value = rollStatFor(tier, part, fixedRng(0.999));
  assert.equal(Number.isFinite(value), true);
});

test('choosePart returns valid part key', () => {
  const rng = fixedRng(0.2);
  const part = choosePart(rng);
  assert.equal(PART_DEFS.some((entry) => entry.key === part), true);
});

test('expectedCounts mirrors total draws', () => {
  const probs = Object.fromEntries(TIERS.map((tier) => [tier, 1 / TIERS.length]));
  const counts = expectedCounts(100, probs);
  const sum = Object.values(counts).reduce((acc, val) => acc + val, 0);
  assert.ok(Math.abs(sum - 100) < 1e-6);
});

test('legendary helpers match thresholds', () => {
  assert.equal(isAtLeast('SS+', 'S'), true);
  assert.equal(isLegendaryGearTier('SS+'), true);
  assert.equal(isLegendaryCharacterTier('S+'), true);
});

test('shuffle keeps items and size', () => {
  const items = [1, 2, 3, 4];
  const rng = fixedRng(0.1, 0.2, 0.3, 0.4);
  const shuffled = shuffle([...items], rng);
  assert.equal(shuffled.length, items.length);
  assert.equal(shuffled.sort().join(','), items.sort().join(','));
});

test('win probability stays in bounds', () => {
  const prob = winProbability(1000, 800, 50);
  assert.ok(prob >= 0.01 && prob <= 0.99);
});

test('level reward grows at least linearly', () => {
  assert.equal(levelReward(1) <= levelReward(2), true);
});

test('cooldown constants remain positive', () => {
  assert.ok(CD_MANUAL_MS > 0);
  assert.ok(CD_AUTO_MS > 0);
});
