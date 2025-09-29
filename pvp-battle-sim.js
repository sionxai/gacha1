import {
  calculateDamage,
  formatNum,
  getCharacterDefinition,
  getPetDefinition,
  CHARACTER_ULTIMATE_DEFS
} from './combat-core.js';

function sanitizeStats(stats = {}) {
  const keys = ['atk', 'def', 'hp', 'critRate', 'critDmg', 'dodge', 'speed'];
  const out = {};
  keys.forEach((key) => {
    const value = stats[key];
    out[key] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  });
  out.hp = Math.max(1, out.hp || 1);
  out.critRate = Math.max(0, out.critRate || 0);
  out.critDmg = Math.max(0, out.critDmg || 0);
  out.dodge = Math.max(0, Math.min(95, out.dodge || 0));
  out.speed = Math.max(1, out.speed || 1);
  return out;
}

function getSkillMultiplier(entity) {
  const value = entity?.skillMultiplier;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
}

function scaleSkillDamage(value, entity) {
  if (!(typeof value === 'number' && Number.isFinite(value))) return 0;
  const multiplier = getSkillMultiplier(entity);
  return value * multiplier;
}

function createEntity(payload = {}, side = 'left') {
  const stats = sanitizeStats(payload.stats || {});
  const baseStats = { ...stats };
  const charDef = payload.characterId ? getCharacterDefinition(payload.characterId) : null;
  const classId = payload.classId || charDef?.classId || 'warrior';
  const tier = payload.characterTier || charDef?.tier || 'D';
  const characterName = charDef?.name || payload.characterName || `${tier} ${classId}`;
  const petDef = payload.petId ? getPetDefinition(payload.petId) : null;
  const rawMultiplier = Number(payload.skillMultiplier);
  const skillMultiplier = Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? rawMultiplier : 1;

  return {
    side,
    uid: payload.uid || side,
    name: payload.displayName || payload.name || characterName || side,
    characterId: payload.characterId || charDef?.id || null,
    characterName,
    classId,
    tier,
    stats,
    baseStats,
    hp: Math.max(1, stats.hp),
    maxHp: Math.max(1, stats.hp),
    defending: false,
    shield: 0,
    pet: petDef,
    petName: payload.petName || petDef?.name || null,
    petIcon: payload.petIcon || petDef?.icon || '🐾',
    petAttackMultiplier: 1,
    petAttackBonus: 0,
    petCritBonus: 0,
    tigerGuard: false,
    tigerReflect: false,
    skillCooldown: 0,
    ultimateUsed: false,
    statuses: {},
    timelineTag: side,
    skillMultiplier
  };
}

function addLog(state, message, tone = '') {
  if (!message) return;
  state.logs.push({ message, tone });
}

function pushEvent(state, event) {
  state.timeline.push({ ...event });
}

function getStatus(entity, key) {
  const status = entity.statuses;
  if (!status[key]) return null;
  return status[key];
}

function setStatus(entity, key, value) {
  if (value === null || value === undefined) {
    delete entity.statuses[key];
  } else {
    entity.statuses[key] = value;
  }
}

function decrementStatus(entity, key) {
  const status = getStatus(entity, key);
  if (!status) return;
  status.turns -= 1;
  if (status.turns <= 0) {
    delete entity.statuses[key];
  }
}

function decrementStatuses(entity) {
  ['atkBuff', 'defBuff', 'damageReduction', 'dodgeBuff', 'speedBuff', 'damageTakenUp', 'defBreak', 'accuracyDown', 'bleed']
    .forEach((key) => decrementStatus(entity, key));
}

function sanitizeChance(value, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function getEffectiveStats(entity) {
  const stats = { ...entity.baseStats };
  const atkBuff = getStatus(entity, 'atkBuff');
  const defBuff = getStatus(entity, 'defBuff');
  const speedBuff = getStatus(entity, 'speedBuff');
  const dodgeBuff = getStatus(entity, 'dodgeBuff');

  if (atkBuff) {
    stats.atk = Math.max(1, Math.round(stats.atk * (1 + (atkBuff.percent || 0))));
  }
  if (defBuff) {
    stats.def = Math.max(0, Math.round(stats.def * (1 + (defBuff.percent || 0))));
  }
  if (speedBuff) {
    stats.speed = Math.max(1, Math.round(stats.speed + (speedBuff.amount || 0)));
  }
  if (dodgeBuff) {
    const bonus = Math.min(95, Math.max(0, (dodgeBuff.amount || 0) * 100));
    stats.dodge = Math.min(95, stats.dodge + bonus);
  }
  stats.atk = Math.max(1, Math.round(stats.atk * (entity.petAttackMultiplier || 1)) + Math.round(entity.petAttackBonus || 0));
  stats.critRate = Math.min(100, Math.max(0, (stats.critRate || 0) + (entity.petCritBonus || 0)));
  const defBreak = getStatus(entity, 'defBreak');
  if (defBreak) {
    stats.def = Math.max(0, stats.def - Math.round(defBreak.amount || 0));
  }
  const accuracyDown = getStatus(entity, 'accuracyDown');
  if (accuracyDown) {
    stats.accuracyPenalty = Math.min(0.95, Math.max(0, accuracyDown.amount || 0));
  }
  return stats;
}

function applyDamage(state, attacker, defender, baseDamage, options = {}) {
  let incoming = Math.max(0, Math.round(baseDamage || 0));
  const event = {
    turn: state.turnCounter,
    action: options.action || 'attack',
    actor: { uid: attacker.uid, name: attacker.name, side: attacker.side },
    target: { uid: defender.uid, name: defender.name, side: defender.side },
    outcome: options.outcome || 'hit',
    log: null,
    damage: 0
  };

  if (incoming <= 0) {
    if (options.logMessage) addLog(state, options.logMessage.replace('{dmg}', '0'), options.logTone || 'warn');
    event.outcome = 'none';
    event.tone = options.logTone || '';
    event.targetHpAfter = Math.max(0, Math.round(defender.hp));
    event.actorHpAfter = Math.max(0, Math.round(attacker.hp));
    pushEvent(state, event);
    return 0;
  }

  const damageTakenUp = getStatus(defender, 'damageTakenUp');
  if (damageTakenUp) {
    const bonus = Math.max(0, damageTakenUp.amount || 0);
    incoming = Math.max(0, Math.round(incoming * (1 + bonus)));
  }

  if (defender.shield > 0) {
    const absorbed = Math.min(defender.shield, incoming);
    if (absorbed > 0) {
      defender.shield -= absorbed;
      incoming -= absorbed;
      addLog(state, `${defender.name}의 보호막이 ${formatNum(absorbed)} 피해를 흡수했습니다.`, 'warn');
    }
  }

  if (incoming > 0 && defender.tigerGuard) {
    defender.tigerGuard = false;
    defender.tigerReflect = false;
    addLog(state, `[펫] ${defender.petName || '호랭찡'}이 공격을 완전히 막았습니다!`, 'heal');
    event.outcome = 'blocked';
    event.tone = 'heal';
    event.targetHpAfter = Math.max(0, Math.round(defender.hp));
    event.actorHpAfter = Math.max(0, Math.round(attacker.hp));
    pushEvent(state, event);
    return 0;
  }

  const damageReduction = getStatus(defender, 'damageReduction');
  if (damageReduction) {
    const reduction = Math.min(0.9, Math.max(0, damageReduction.percent || 0));
    if (reduction > 0) {
      const reduced = Math.round(incoming * reduction);
      incoming = Math.max(0, incoming - reduced);
      addLog(state, `${defender.name}의 피해 감소 효과로 ${formatNum(reduced)} 피해가 감소했습니다.`, 'heal');
    }
  }

  const actual = Math.min(incoming, defender.hp);
  defender.hp = Math.max(0, defender.hp - actual);
  event.damage = actual;
  event.log = options.logMessage ? options.logMessage.replace('{dmg}', formatNum(actual)) : null;
  event.tone = options.logTone || (actual > 0 ? 'damage' : 'warn');
  event.targetHpAfter = Math.max(0, Math.round(defender.hp));
  event.actorHpAfter = Math.max(0, Math.round(attacker.hp));
  if (!options.silent) {
    if (event.log) {
      addLog(state, event.log, options.logTone || (actual > 0 ? 'damage' : 'warn'));
    } else if (actual > 0) {
      addLog(state, `${attacker.name}가 ${defender.name}에게 ${formatNum(actual)} 피해를 입혔습니다.`, options.logTone || 'damage');
    }
  }

  pushEvent(state, event);

  if (defender.tigerReflect && actual > 0 && !options.isReflect) {
    defender.tigerReflect = false;
    addLog(state, `[펫] ${defender.petName || '호랭찡'}이 ${formatNum(actual)} 피해를 반사했습니다!`, 'warn');
    pushEvent(state, {
      turn: state.turnCounter,
      action: 'reflect',
      actor: { uid: defender.uid, name: defender.name, side: defender.side },
      target: { uid: attacker.uid, name: attacker.name, side: attacker.side },
      outcome: 'reflect',
      tone: 'warn',
      damage: actual,
      log: `[반사] ${formatNum(actual)} 피해`,
      targetHpAfter: Math.max(0, Math.round(attacker.hp)),
      actorHpAfter: Math.max(0, Math.round(defender.hp))
    });
    applyDamage(state, defender, attacker, actual, {
      action: 'reflect',
      outcome: 'hit',
      logMessage: `[반사] ${formatNum(actual)} 피해`,
      logTone: 'damage',
      silent: false,
      isReflect: true
    });
  }

  return actual;
}

function applySelfDamage(state, entity, amount, message, tone = 'damage') {
  const actual = Math.min(entity.hp, Math.max(0, Math.round(amount || 0)));
  if (actual <= 0) return 0;
  entity.hp = Math.max(0, entity.hp - actual);
  if (message) addLog(state, message.replace('{dmg}', formatNum(actual)), tone);
  pushEvent(state, {
    turn: state.turnCounter,
    action: 'status',
    actor: { uid: entity.uid, name: entity.name, side: entity.side },
    target: { uid: entity.uid, name: entity.name, side: entity.side },
    outcome: 'status',
    damage: actual,
    log: message ? message.replace('{dmg}', formatNum(actual)) : null,
    tone,
    targetHpAfter: Math.max(0, Math.round(entity.hp)),
    actorHpAfter: Math.max(0, Math.round(entity.hp))
  });
  return actual;
}

function healEntity(state, entity, amount, message = null) {
  const healValue = Math.max(0, Math.round(amount || 0));
  if (healValue <= 0) return 0;
  const before = entity.hp;
  entity.hp = Math.min(entity.maxHp, entity.hp + healValue);
  const actual = entity.hp - before;
  if (actual > 0) {
    const line = message ? message.replace('{heal}', formatNum(actual)) : `${entity.name}의 체력이 ${formatNum(actual)} 회복되었습니다.`;
    addLog(state, line, 'heal');
    pushEvent(state, {
      turn: state.turnCounter,
      action: 'heal',
      actor: { uid: entity.uid, name: entity.name, side: entity.side },
      target: { uid: entity.uid, name: entity.name, side: entity.side },
      outcome: 'heal',
      damage: -actual,
      log: line,
      tone: 'heal',
      targetHpAfter: Math.max(0, Math.round(entity.hp)),
      actorHpAfter: Math.max(0, Math.round(entity.hp))
    });
  }
  return actual;
}

function addShield(state, entity, amount) {
  const value = Math.max(0, Math.round(amount || 0));
  if (value <= 0) return 0;
  entity.shield += value;
  addLog(state, `${entity.name}의 보호막이 ${formatNum(value)} 증가했습니다. (총 ${formatNum(entity.shield)})`, 'heal');
  pushEvent(state, {
    turn: state.turnCounter,
    action: 'shield',
    actor: { uid: entity.uid, name: entity.name, side: entity.side },
    target: { uid: entity.uid, name: entity.name, side: entity.side },
    outcome: 'shield',
    damage: -value,
    log: `보호막 +${formatNum(value)}`,
    tone: 'heal',
    targetHpAfter: Math.max(0, Math.round(entity.hp)),
    actorHpAfter: Math.max(0, Math.round(entity.hp))
  });
  return value;
}

function applyAttackBuff(state, entity, percent, turns, opts = {}) {
  const pct = Math.max(0, percent || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'atkBuff', { percent: pct, turns: dur });
  if (!opts.silent) addLog(state, `${entity.name}의 공격력이 ${Math.round(pct * 100)}% 상승 (${dur}턴)`, 'heal');
}

function applyDefenseBuff(state, entity, percent, turns, opts = {}) {
  const pct = Math.max(0, percent || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'defBuff', { percent: pct, turns: dur });
  if (!opts.silent) addLog(state, `${entity.name}의 방어력이 ${Math.round(pct * 100)}% 상승 (${dur}턴)`, 'heal');
}

function applyDamageReductionBuff(state, entity, percent, turns, opts = {}) {
  const pct = Math.min(0.9, Math.max(0, percent || 0));
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'damageReduction', { percent: pct, turns: dur });
  if (!opts.silent) addLog(state, `${entity.name}의 받는 피해가 ${Math.round(pct * 100)}% 감소 (${dur}턴)`, 'heal');
}

function applyDodgeBuff(state, entity, amount, turns, opts = {}) {
  const val = Math.max(0, amount || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'dodgeBuff', { amount: val, turns: dur });
  if (!opts.silent) addLog(state, `${entity.name}의 회피율이 ${Math.round(val * 100)}% 상승 (${dur}턴)`, 'heal');
}

function applySpeedBuff(state, entity, amount, turns, opts = {}) {
  const val = Math.max(0, amount || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'speedBuff', { amount: val, turns: dur });
  if (!opts.silent) addLog(state, `${entity.name}의 속도가 ${formatNum(val)} 증가 (${dur}턴)`, 'heal');
}

function applyDamageTakenUp(state, entity, percent, turns, label = '받는 피해 증가') {
  const pct = Math.max(0, percent || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'damageTakenUp', { amount: pct, turns: dur });
  addLog(state, `${entity.name} ${label} +${Math.round(pct * 100)}% (${dur}턴)`, 'warn');
}

function applyDefBreak(state, entity, amount, turns) {
  const val = Math.max(0, amount || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'defBreak', { amount: val, turns: dur });
  addLog(state, `${entity.name}의 방어력이 ${formatNum(val)} 감소 (${dur}턴)`, 'warn');
}

function applyAccuracyDown(state, entity, amount, turns) {
  const val = sanitizeChance(amount, 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'accuracyDown', { amount: val, turns: dur });
  addLog(state, `${entity.name}의 명중률이 ${Math.round(val * 100)}% 감소 (${dur}턴)`, 'warn');
}

function applyBleed(state, entity, damage, turns, message = '[출혈] {dmg} 피해') {
  const dmg = Math.max(0, damage || 0);
  const dur = Math.max(1, Math.round(turns || 1));
  setStatus(entity, 'bleed', { damage: dmg, turns: dur, message });
  addLog(state, `${entity.name}이(가) 출혈 상태가 되었습니다. (${dur}턴)`, 'warn');
}

function applyTimeStop(state, entity, turns) {
  const dur = Math.max(1, Math.round(turns || 1));
  const current = getStatus(entity, 'timeStop');
  const next = { turns: Math.max(current?.turns || 0, dur) };
  setStatus(entity, 'timeStop', next);
  addLog(state, `${entity.name}이(가) ${dur}턴 동안 행동 불가 상태가 되었습니다.`, 'critical');
}

function resetSkillCooldown(entity) {
  entity.skillCooldown = 0;
}

function handlePetTurn(state, actor, defender) {
  actor.petAttackMultiplier = 1;
  actor.petAttackBonus = 0;
  actor.petCritBonus = 0;
  actor.tigerGuard = false;
  actor.tigerReflect = false;

  const pet = actor.pet;
  if (!pet || !pet.active) return;
  const active = pet.active;
  const type = active.type;
  const chance = type === 'tigerLegend' ? 1 : sanitizeChance(active.chance, 0);
  if (chance <= 0 || state.rng() > chance) return;

  switch (type) {
    case 'shield': {
      const amountPct = Math.max(0, active.amountPct || 0);
      if (amountPct <= 0) break;
      const gained = Math.round(actor.maxHp * amountPct);
      const capPct = Math.max(0.1, Math.min(1, active.maxPct || 0.4));
      const maxShield = Math.round(actor.maxHp * capPct);
      actor.shield = Math.min(maxShield, actor.shield + gained);
      addLog(state, `[펫] ${pet.name} 보호막 발동! +${formatNum(gained)} (총 ${formatNum(actor.shield)})`, 'heal');
      pushEvent(state, {
        turn: state.turnCounter,
        action: 'pet',
        actor: { uid: actor.uid, name: actor.name, side: actor.side },
        target: { uid: actor.uid, name: actor.name, side: actor.side },
        outcome: 'shield',
        log: `보호막 +${formatNum(gained)}`,
        damage: -gained
      });
      break;
    }
    case 'heal': {
      const amountPct = Math.max(0, active.amountPct || 0);
      const heal = Math.max(1, Math.round(actor.maxHp * amountPct));
      healEntity(state, actor, heal, `[펫] ${pet.name} 회복! 체력 {heal}`);
      break;
    }
    case 'attackBuff': {
      const atkPct = Math.max(0, active.attackPct || 0);
      const atkBonus = Math.max(0, active.attackFlat || 0);
      const critBonus = Math.max(0, active.critRateBonus || 0);
      actor.petAttackMultiplier = 1 + atkPct;
      actor.petAttackBonus = atkBonus;
      actor.petCritBonus = critBonus;
      addLog(state, `[펫] ${pet.name}이(가) 공격 버프를 부여했습니다.`, 'heal');
      break;
    }
    case 'strike': {
      const ratio = Math.max(0, active.ratio || 0);
      const minDamage = Math.max(0, active.minDamage || 0);
      const baseAtk = actor.baseStats.atk || 0;
      const damage = Math.max(minDamage, Math.round(baseAtk * ratio));
      if (damage > 0) {
        const dealt = applyDamage(state, actor, defender, damage, {
          action: 'pet',
          outcome: 'hit',
          logMessage: `[펫] ${pet.name}의 일격! {dmg} 피해`
        });
        if (dealt <= 0) {
          addLog(state, `[펫] ${pet.name}의 일격이 피해를 주지 못했습니다.`, 'warn');
        }
      }
      break;
    }
    case 'tigerLegend': {
      const isBoss = false;
      const killChance = sanitizeChance(active.killChance ?? 0.05, 0.05);
      if (!isBoss && state.rng() < killChance && defender.hp > 0) {
        defender.hp = 0;
        addLog(state, `[펫] ${pet.name}의 즉사 발동! ${defender.name}이 쓰러졌습니다.`, 'critical');
        pushEvent(state, {
          turn: state.turnCounter,
          action: 'pet',
          actor: { uid: actor.uid, name: actor.name, side: actor.side },
          target: { uid: defender.uid, name: defender.name, side: defender.side },
          outcome: 'kill',
          log: '즉사 발동',
          damage: defender.maxHp
        });
      }
      const blockChance = sanitizeChance(active.blockChance ?? 0.15, 0.15);
      if (state.rng() < blockChance) {
        actor.tigerGuard = true;
        addLog(state, `[펫] ${pet.name}이 모든 공격을 막을 태세입니다!`, 'heal');
      }
      const reflectChance = sanitizeChance(active.reflectChance ?? 0.05, 0.05);
      if (state.rng() < reflectChance) {
        actor.tigerReflect = true;
        addLog(state, `[펫] ${pet.name}이 반격 태세에 들어갔습니다.`, 'warn');
      }
      break;
    }
    default:
      break;
  }
}

function calculateAttack(state, attacker, defender, isSkill = false) {
  const attackerStats = getEffectiveStats(attacker);
  const defenderStats = getEffectiveStats(defender);
  const attackPayload = { stats: attackerStats, atk: attackerStats.atk };
  const defendPayload = {
    stats: defenderStats,
    def: defenderStats.def,
    dodge: defenderStats.dodge,
    defending: defender.defending
  };
  if (attackerStats.accuracyPenalty) {
    attackPayload.accuracyPenalty = attackerStats.accuracyPenalty;
  }
  return calculateDamage(attackPayload, defendPayload, isSkill);
}

function performAttack(state, attacker, defender) {
  const result = calculateAttack(state, attacker, defender, false);
  if (result.type === 'MISS') {
    addLog(state, `${attacker.name}의 공격이 빗나갔습니다.`, 'warn');
    pushEvent(state, {
      turn: state.turnCounter,
      action: 'attack',
      actor: { uid: attacker.uid, name: attacker.name, side: attacker.side },
      target: { uid: defender.uid, name: defender.name, side: defender.side },
      outcome: 'miss',
      damage: 0,
      log: `${attacker.name}의 공격이 빗나갔습니다.`
    });
    return;
  }
  const damage = result.damage;
  const logMessage = `${attacker.name}의 공격! {dmg} 피해`;
  applyDamage(state, attacker, defender, damage, {
    action: 'attack',
    outcome: result.type === 'CRITICAL' ? 'critical' : 'hit',
    logMessage,
    logTone: result.type === 'CRITICAL' ? 'critical' : 'damage'
  });
}

function getSkillCooldown(classId = 'warrior') {
  switch (classId) {
    case 'archer':
      return 2;
    case 'mage':
    case 'goddess':
      return 4;
    case 'rogue':
      return 3;
    default:
      return 3;
  }
}

function performSkill(state, attacker, defender) {
  const classId = attacker.classId || 'warrior';
  const offensive = getEffectiveStats(attacker);
  const result = calculateAttack(state, attacker, defender, true);
  const logPrefix = `${attacker.name}의 스킬`;
  switch (classId) {
    case 'warrior': {
      if (result.type === 'MISS') {
        addLog(state, `${logPrefix}이 빗나갔습니다.`, 'warn');
        break;
      }
      const damage = Math.max(1, Math.round(scaleSkillDamage(result.damage * 1.5, attacker)));
      applyDamage(state, attacker, defender, damage, {
        action: 'skill',
        outcome: result.type === 'CRITICAL' ? 'critical' : 'hit',
        logMessage: `${attacker.name}의 강철의 격타! {dmg} 피해`,
        logTone: 'damage'
      });
      const shield = Math.max(1, Math.round((attacker.baseStats.def || 0) * 2.4));
      addShield(state, attacker, shield);
      break;
    }
    case 'mage': {
      if (result.type !== 'MISS') {
        const rawBurst = (offensive.atk || 0) * 1.6 + (offensive.critDmg || 0) * 25;
        const burst = Math.max(1, Math.round(scaleSkillDamage(rawBurst, attacker)));
        const dealt = applyDamage(state, attacker, defender, burst, {
          action: 'skill',
          outcome: result.type === 'CRITICAL' ? 'critical' : 'hit',
          logMessage: `${attacker.name}의 마나 폭발! {dmg} 피해`,
          logTone: 'damage'
        });
        if (dealt > 0) {
          const healAmount = Math.max(1, Math.round(dealt * 0.35));
          healEntity(state, attacker, healAmount, `${attacker.name}이(가) 마력을 수복! 체력 {heal}`);
        }
      } else {
        addLog(state, `${logPrefix}이 적중하지 못했습니다.`, 'warn');
      }
      const baseDef = defender.baseStats.def || defender.stats.def || 0;
      if (baseDef > 0) {
        const amount = Math.max(1, Math.round(baseDef * 0.35));
        applyDefBreak(state, defender, amount, 2);
      }
      break;
    }
    case 'archer': {
      let total = 0;
      let hits = 0;
      let misses = 0;
      for (let i = 0; i < 3; i += 1) {
        const volley = calculateAttack(state, attacker, defender, false);
        if (volley.type === 'MISS') {
          misses += 1;
          continue;
        }
        const baseDamage = Math.max(1, Math.round(volley.damage * 0.75));
        const scaledDamage = Math.max(1, Math.round(scaleSkillDamage(baseDamage, attacker)));
        total += applyDamage(state, attacker, defender, scaledDamage, {
          action: 'skill',
          outcome: volley.type === 'CRITICAL' ? 'critical' : 'hit',
          logMessage: `${attacker.name}의 연속 사격! {dmg} 피해`,
          logTone: 'damage',
          silent: i > 0
        });
        hits += 1;
      }
      if (total > 0) {
        addLog(state, `${attacker.name}의 연속 사격! ${hits}회 명중, 총 ${formatNum(total)} 피해`, 'critical');
      }
      if (misses > 0) {
        addLog(state, `${misses}발이 빗나갔습니다.`, 'warn');
      }
      break;
    }
    case 'rogue': {
      if (result.type === 'MISS') {
        addLog(state, `${logPrefix}이 빗나갔습니다.`, 'warn');
        break;
      }
      const baseDamage = Math.max(1, Math.round(result.damage * 1.1));
      const scaledDamage = Math.max(1, Math.round(scaleSkillDamage(baseDamage, attacker)));
      applyDamage(state, attacker, defender, scaledDamage, {
        action: 'skill',
        outcome: result.type === 'CRITICAL' ? 'critical' : 'hit',
        logMessage: `${attacker.name}의 그림자 일격! {dmg} 피해`,
        logTone: 'damage'
      });
      const bleedDamage = Math.max(1, Math.round(scaleSkillDamage((attacker.baseStats.atk || 0) * 0.5, attacker)));
      applyBleed(state, defender, bleedDamage, 3, `출혈 피해! {dmg}`);
      break;
    }
    case 'goddess': {
      if (result.type !== 'MISS') {
        const rawHoly = (offensive.atk || 0) * 1.05 + (attacker.baseStats.def || 0) * 1.35;
        const holyDamage = Math.max(1, Math.round(scaleSkillDamage(rawHoly, attacker)));
        applyDamage(state, attacker, defender, holyDamage, {
          action: 'skill',
          outcome: result.type === 'CRITICAL' ? 'critical' : 'hit',
          logMessage: `${attacker.name}의 여신의 심판! {dmg} 피해`,
          logTone: 'critical'
        });
      } else {
        addLog(state, `${logPrefix}이 적중하지 못했습니다.`, 'warn');
      }
      const healAmount = Math.max(1, Math.round(attacker.maxHp * 0.28));
      healEntity(state, attacker, healAmount, `${attacker.name}의 여신의 은총! 체력 {heal}`);
      const shield = Math.max(1, Math.round((attacker.baseStats.def || 0) * 2.0));
      addShield(state, attacker, shield);
      break;
    }
    default: {
      if (result.type === 'MISS') {
        addLog(state, `${logPrefix}이 빗나갔습니다.`, 'warn');
        break;
      }
      const scaledDamage = Math.max(0, Math.round(scaleSkillDamage(result.damage, attacker)));
      applyDamage(state, attacker, defender, scaledDamage, {
        action: 'skill',
        outcome: result.type === 'CRITICAL' ? 'critical' : 'hit',
        logMessage: `${attacker.name}의 필살기! {dmg} 피해`,
        logTone: 'damage'
      });
    }
  }
  attacker.skillCooldown = getSkillCooldown(classId);
}

function applyUltimate(state, attacker, defender, def) {
  const variant = def.variant || `${attacker.classId}-${attacker.tier}`;
  const offensive = getEffectiveStats(attacker);
  switch (variant) {
    case 'warrior-sssplus': {
      const damage = Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 5.5, attacker)));
      applyDamage(state, attacker, defender, damage, {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      const shield = Math.max(1, Math.round((attacker.baseStats.def || 0) * 3.0));
      addShield(state, attacker, shield);
      applyDamageReductionBuff(state, attacker, 0.4, 2, { silent: false });
      break;
    }
    case 'warrior-ssplus': {
      const damage = Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 4.2, attacker)));
      applyDamage(state, attacker, defender, damage, {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      addShield(state, attacker, Math.round((attacker.baseStats.def || 0) * 2.5));
      applyDamageReductionBuff(state, attacker, 0.25, 2, { silent: false });
      break;
    }
    case 'mage-sssplus': {
      const rawDamage = offensive.atk * 5.2 + (offensive.critDmg || 0) * 30;
      const damage = Math.max(0, Math.round(scaleSkillDamage(rawDamage, attacker)));
      const dealt = applyDamage(state, attacker, defender, damage, {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      if (dealt > 0) {
        healEntity(state, attacker, Math.round(dealt * 0.4), `${attacker.name}이(가) 필살기 회복! 체력 {heal}`);
      }
      applyDefBreak(state, defender, Math.round((defender.baseStats.def || 0) * 0.4), 3);
      applyDamageTakenUp(state, defender, 0.25, 2, '받는 피해');
      break;
    }
    case 'mage-ssplus': {
      const rawDamage = offensive.atk * 4.4 + (offensive.critDmg || 0) * 18;
      const damage = Math.max(0, Math.round(scaleSkillDamage(rawDamage, attacker)));
      applyDamage(state, attacker, defender, damage, {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      applyDefBreak(state, defender, Math.round((defender.baseStats.def || 0) * 0.3), 2);
      applyDamageTakenUp(state, defender, 0.2, 2, '받는 피해');
      break;
    }
    case 'archer-sssplus': {
      let total = 0;
      for (let i = 0; i < 6; i += 1) {
        const isCrit = state.rng() < ((offensive.critRate || 0) / 100);
        let dmg = Math.max(1, Math.round(offensive.atk * 1.2));
        if (isCrit) {
          dmg = Math.round(dmg * (offensive.critDmg || 150) / 100);
        }
        const scaled = Math.max(1, Math.round(scaleSkillDamage(dmg, attacker)));
        total += applyDamage(state, attacker, defender, scaled, {
          action: 'ultimate',
          outcome: isCrit ? 'critical' : 'hit',
          logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
          logTone: isCrit ? 'critical' : 'damage',
          silent: true
        });
      }
      addLog(state, `[필살기] ${attacker.name}이(가) 연속 사격으로 ${formatNum(total)} 피해를 입혔습니다.`, 'critical');
      break;
    }
    case 'archer-ssplus': {
      let total = 0;
      for (let i = 0; i < 5; i += 1) {
        const isCrit = state.rng() < ((offensive.critRate || 0) / 100);
        let dmg = Math.max(1, Math.round(offensive.atk * 0.8));
        if (isCrit) {
          dmg = Math.round(dmg * (offensive.critDmg || 150) / 100);
          applyAccuracyDown(state, defender, 0.1, 1);
        }
        const scaled = Math.max(1, Math.round(scaleSkillDamage(dmg, attacker)));
        total += applyDamage(state, attacker, defender, scaled, {
          action: 'ultimate',
          outcome: isCrit ? 'critical' : 'hit',
          logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
          logTone: isCrit ? 'critical' : 'damage',
          silent: true
        });
      }
      addLog(state, `[필살기] ${attacker.name}이(가) ${formatNum(total)} 피해를 입혔습니다.`, 'critical');
      break;
    }
    case 'rogue-sssplus': {
      let total = 0;
      for (let i = 0; i < 2; i += 1) {
        const critRate = Math.min(100, (offensive.critRate || 0) + 30);
        const isCrit = state.rng() * 100 < critRate;
        let dmg = Math.max(1, Math.round(offensive.atk * 2.4));
        if (isCrit) {
          dmg = Math.round(dmg * (offensive.critDmg || 150) / 100);
        }
        const scaled = Math.max(1, Math.round(scaleSkillDamage(dmg, attacker)));
        total += applyDamage(state, attacker, defender, scaled, {
          action: 'ultimate',
          outcome: isCrit ? 'critical' : 'hit',
          logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
          logTone: isCrit ? 'critical' : 'damage',
          silent: true
        });
      }
      addLog(state, `[필살기] ${attacker.name}이(가) 총 ${formatNum(total)} 피해를 입혔습니다.`, 'critical');
      const bleed = Math.max(1, Math.round(scaleSkillDamage(offensive.atk * 1.2, attacker)));
      applyBleed(state, defender, bleed, 4, `출혈 피해! {dmg}`);
      applyDodgeBuff(state, attacker, 0.25, 2, { silent: true });
      applySpeedBuff(state, attacker, 15, 2, { silent: true });
      break;
    }
    case 'rogue-ssplus': {
      const damage = Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 3.0, attacker)));
      applyDamage(state, attacker, defender, damage, {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      const bleed = Math.max(1, Math.round(scaleSkillDamage(offensive.atk * 0.9, attacker)));
      applyBleed(state, defender, bleed, 3, `출혈 피해! {dmg}`);
      applyDodgeBuff(state, attacker, 0.2, 1, { silent: false });
      break;
    }
    case 'goddess-sssplus': {
      attacker.hp = attacker.maxHp;
      addLog(state, `[필살기] ${attacker.name}의 ${def.name}! 체력이 완전히 회복되었습니다.`, 'heal');
      const damage = Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 6.5, attacker)));
      applyDamage(state, attacker, defender, damage, {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      if (defender.hp > 0) {
        const trueDamage = Math.max(1, Math.round(defender.hp * 0.2));
        applyDamage(state, attacker, defender, trueDamage, {
          action: 'ultimate',
          outcome: 'hit',
          logMessage: '신성한 추가 피해! {dmg}',
          logTone: 'critical'
        });
      }
      applyAttackBuff(state, attacker, 0.35, 3, { silent: true });
      applyDefenseBuff(state, attacker, 0.35, 3, { silent: true });
      applySpeedBuff(state, attacker, 25, 3, { silent: true });
      addLog(state, `[버프] 공격/방어/속도 +35% (3턴)`, 'heal');
      applyDamageTakenUp(state, defender, 0.3, 2, '받는 피해');
      break;
    }
    case 'goddess-ssplus': {
      healEntity(state, attacker, Math.round(attacker.maxHp * 0.5), `${attacker.name}의 천상의 빛! 체력 {heal}`);
      addShield(state, attacker, Math.round(offensive.atk * 2.0));
      applyTimeStop(state, defender, 1);
      resetSkillCooldown(attacker);
      addLog(state, `${attacker.name}의 스킬 쿨다운이 초기화되었습니다.`, 'heal');
      applyDamage(state, attacker, defender, Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 3.2, attacker))), {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      break;
    }
    case 'goddess-splus': {
      healEntity(state, attacker, Math.round(attacker.maxHp * 0.4), `${attacker.name}의 천상의 축복! 체력 {heal}`);
      applyAttackBuff(state, attacker, 0.25, 2, { silent: true });
      applyDefenseBuff(state, attacker, 0.25, 2, { silent: true });
      addLog(state, `[버프] 공격/방어 +25% (2턴)`, 'heal');
      applyDamage(state, attacker, defender, Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 2.8, attacker))), {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
      break;
    }
    default: {
      applyDamage(state, attacker, defender, Math.max(0, Math.round(scaleSkillDamage(offensive.atk * 3.5, attacker))), {
        action: 'ultimate',
        outcome: 'hit',
        logMessage: `[필살기] ${attacker.name}의 ${def.name}! {dmg} 피해`,
        logTone: 'critical'
      });
    }
  }
}

function maybeTriggerUltimate(state, actor, defender) {
  if (actor.ultimateUsed) return false;
  if (actor.hp <= 0 || defender.hp <= 0) return false;
  const ultimate = actor.characterId ? CHARACTER_ULTIMATE_DEFS[actor.characterId] : null;
  if (!ultimate) return false;
  const chance = sanitizeChance(ultimate.chance ?? 0.05, 0.05);
  if (chance <= 0 || state.rng() >= chance) return false;
  addLog(state, `[필살기 준비] ${actor.name} - ${ultimate.name}`, 'critical');
  pushEvent(state, {
    turn: state.turnCounter,
    action: 'ultimate-start',
    actor: { uid: actor.uid, name: actor.name, side: actor.side },
    target: { uid: defender.uid, name: defender.name, side: defender.side },
    outcome: 'ultimate',
    log: `${actor.name}의 필살기 발동`
  });
  applyUltimate(state, actor, defender, ultimate);
  actor.ultimateUsed = true;
  return true;
}

function decideAction(state, actor) {
  if (actor.skillCooldown <= 0 && state.rng() < 0.32) return 'skill';
  if (state.rng() < 0.18) return 'defend';
  return 'attack';
}

function startTurn(state, actor, defender) {
  actor.defending = false;
  const bleed = getStatus(actor, 'bleed');
  if (bleed && bleed.turns > 0 && bleed.damage > 0) {
    applySelfDamage(state, actor, bleed.damage, `[출혈] ${actor.name}이(가) {dmg} 피해를 입었습니다.`);
    if (actor.hp <= 0) return { skip: true };
  }

  const timeStop = getStatus(actor, 'timeStop');
  if (timeStop && timeStop.turns > 0) {
    timeStop.turns -= 1;
    addLog(state, `${actor.name}은(는) 시간 정지 효과로 행동할 수 없습니다.`, 'warn');
    pushEvent(state, {
      turn: state.turnCounter,
      action: 'skip',
      actor: { uid: actor.uid, name: actor.name, side: actor.side },
      target: null,
      outcome: 'skip',
      log: `${actor.name} 행동 불가`
    });
    return { skip: true };
  }

  handlePetTurn(state, actor, defender);
  if (defender.hp <= 0 || actor.hp <= 0) {
    return { skip: true };
  }
  if (maybeTriggerUltimate(state, actor, defender)) {
    return { usedUltimate: true };
  }
  return { skip: false };
}

function endTurn(actor) {
  if (actor.skillCooldown > 0) {
    actor.skillCooldown -= 1;
    if (actor.skillCooldown < 0) actor.skillCooldown = 0;
  }
  decrementStatuses(actor);
}

function checkVictory(state) {
  const left = state.left;
  const right = state.right;
  if (left.hp <= 0 && right.hp <= 0) {
    state.finished = true;
    state.result.winner = null;
    state.result.outcome = 'draw';
    return true;
  }
  if (left.hp <= 0) {
    state.finished = true;
    state.result.winner = createResultEntity(right);
    state.result.loser = createResultEntity(left);
    state.result.outcome = 'right';
    return true;
  }
  if (right.hp <= 0) {
    state.finished = true;
    state.result.winner = createResultEntity(left);
    state.result.loser = createResultEntity(right);
    state.result.outcome = 'left';
    return true;
  }
  return false;
}

function createResultEntity(entity) {
  return {
    uid: entity.uid,
    name: entity.name,
    stats: { ...entity.stats },
    remainingHp: Math.max(0, Math.round(entity.hp))
  };
}

function finalize(state) {
  if (!state.finished) {
    state.result.outcome = 'timeout';
    state.result.winner = null;
  }
  state.result.logs = state.logs.map((entry) => ({ message: entry.message, tone: entry.tone || '' }));
  state.result.timeline = state.timeline;
  state.result.turns = state.turnCount;
  const leftRemaining = Math.max(0, Math.round(state.left.hp));
  const rightRemaining = Math.max(0, Math.round(state.right.hp));
  state.result.remaining = {
    left: leftRemaining,
    right: rightRemaining,
    A: leftRemaining,
    B: rightRemaining
  };
  if (state.result.outcome === 'left') {
    state.result.timeline.push({
      turn: state.turnCounter,
      action: 'result',
      actor: { uid: state.left.uid, name: state.left.name, side: state.left.side },
      target: { uid: state.right.uid, name: state.right.name, side: state.right.side },
      outcome: 'victory',
      log: `${state.left.name} 승리`,
      remaining: { left: leftRemaining, right: rightRemaining, A: leftRemaining, B: rightRemaining }
    });
  } else if (state.result.outcome === 'right') {
    state.result.timeline.push({
      turn: state.turnCounter,
      action: 'result',
      actor: { uid: state.right.uid, name: state.right.name, side: state.right.side },
      target: { uid: state.left.uid, name: state.left.name, side: state.left.side },
      outcome: 'victory',
      log: `${state.right.name} 승리`,
      remaining: { left: leftRemaining, right: rightRemaining, A: leftRemaining, B: rightRemaining }
    });
  } else {
    state.result.timeline.push({
      turn: state.turnCounter,
      action: 'result',
      actor: null,
      target: null,
      outcome: 'draw',
      log: '무승부',
      remaining: { left: leftRemaining, right: rightRemaining, A: leftRemaining, B: rightRemaining }
    });
  }
}

export function simulatePvpBattle({
  left: leftPayload,
  right: rightPayload,
  rng = Math.random,
  maxTurns = 200
} = {}) {
  const state = {
    rng,
    maxTurns: Math.max(1, maxTurns || 200),
    logs: [],
    timeline: [],
    turnCount: 0,
    finished: false,
    left: null,
    right: null,
    result: { logs: [], timeline: [], outcome: 'draw', turns: 0, winner: null, loser: null }
  };
  state.left = createEntity(leftPayload, 'left');
  state.right = createEntity(rightPayload, 'right');

  let turn = 1;
  while (!state.finished && turn <= state.maxTurns) {
    state.turnCounter = turn;
    const pre = startTurn(state, state.left, state.right);
    if (pre?.skip) {
      endTurn(state.left);
    } else if (pre?.usedUltimate) {
      endTurn(state.left);
    } else {
      const action = decideAction(state, state.left);
      if (action === 'defend') {
        state.left.defending = true;
        addLog(state, `${state.left.name}이(가) 방어 자세를 취했습니다.`, 'warn');
        pushEvent(state, {
          turn: state.turnCounter,
          action: 'defend',
          actor: { uid: state.left.uid, name: state.left.name, side: state.left.side },
          target: null,
          outcome: 'defend',
          log: `${state.left.name} 방어`
        });
      } else if (action === 'skill') {
        performSkill(state, state.left, state.right);
      } else {
        performAttack(state, state.left, state.right);
      }
      endTurn(state.left);
    }
    if (checkVictory(state)) break;

    state.turnCounter = turn + 0.5;
    const preRight = startTurn(state, state.right, state.left);
    if (preRight?.skip) {
      endTurn(state.right);
    } else if (preRight?.usedUltimate) {
      endTurn(state.right);
    } else {
      const action = decideAction(state, state.right);
      if (action === 'defend') {
        state.right.defending = true;
        addLog(state, `${state.right.name}이(가) 방어 자세를 취했습니다.`, 'warn');
        pushEvent(state, {
          turn: state.turnCounter,
          action: 'defend',
          actor: { uid: state.right.uid, name: state.right.name, side: state.right.side },
          target: null,
          outcome: 'defend',
          log: `${state.right.name} 방어`
        });
      } else if (action === 'skill') {
        performSkill(state, state.right, state.left);
      } else {
        performAttack(state, state.right, state.left);
      }
      endTurn(state.right);
    }
    if (checkVictory(state)) break;
    turn += 1;
  }

  state.turnCount = turn;
  if (!state.finished) {
    checkVictory(state);
  }
  finalize(state);
  return state.result;
}
