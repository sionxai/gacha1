import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIERS,
  TIER_INDEX,
  TIER_RANK,
  DEFAULT_DROP_RATES,
  PART_DEFS,
  PART_KEYS,
  PART_ICONS,
  ALL_USERS_OPTION,
  defaultWeights,
  cfgVersion
} from '../constants.js';

test('tier arrays and maps stay consistent', () => {
  assert.equal(Array.isArray(TIERS), true);
  assert.equal(TIERS.length > 0, true);
  assert.equal(Object.keys(TIER_INDEX).length, TIERS.length);
  assert.equal(Object.keys(TIER_RANK).length, TIERS.length);
  // Ensure ordering metadata aligns
  const tiers = [...TIERS];
  tiers.reduce((prev, curr) => {
    assert.equal(typeof TIER_INDEX[curr], 'number');
    assert.equal(typeof TIER_RANK[curr], 'number');
    assert.equal(TIER_INDEX[curr] >= prev, true);
    return TIER_INDEX[curr];
  }, -1);
});

test('default drop rates include expected keys', () => {
  const expected = ['potion', 'hyperPotion', 'protect', 'enhance', 'battleRes'];
  expected.forEach((key) => {
    const entry = DEFAULT_DROP_RATES[key];
    assert.ok(entry, `missing drop rate: ${key}`);
    assert.equal(typeof entry.base, 'number');
    assert.equal(typeof entry.max, 'number');
  });
});

test('parts metadata remains aligned', () => {
  assert.equal(PART_DEFS.length, PART_KEYS.length);
  PART_DEFS.forEach((part) => {
    assert.equal(PART_KEYS.includes(part.key), true, `missing key ${part.key}`);
    assert.equal(typeof PART_ICONS[part.key], 'string');
  });
});

test('utility constants keep baseline contract', () => {
  assert.equal(typeof ALL_USERS_OPTION, 'string');
  assert.equal(typeof defaultWeights, 'object');
  assert.equal(typeof cfgVersion, 'string');
});
