const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const REGION = 'asia-southeast1';
const backupConfig = functions.config().backups || {};
const PART_KEYS = ['head', 'body', 'main', 'off', 'boots'];
const PART_TYPES = { head: 'def', body: 'def', main: 'atk', off: 'atk', boots: 'def' };
const VALID_TIERS = ['D', 'C', 'B', 'A', 'S', 'S+', 'SS+', 'SSS+'];
const SNAPSHOT_RETENTION_HOURS = parseInt(
  backupConfig.retention_hours ?? process.env.SNAPSHOT_RETENTION_HOURS ?? '48',
  10
);
const SNAPSHOT_RETENTION_MS = SNAPSHOT_RETENTION_HOURS * 60 * 60 * 1000;
const SNAPSHOT_MAX_PER_USER = parseInt(
  backupConfig.max_per_user ?? process.env.SNAPSHOT_MAX_PER_USER ?? '96',
  10
);

function cloneData(data) {
  if (data === null || data === undefined) return null;
  return JSON.parse(JSON.stringify(data));
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function normalizeTier(value) {
  if (typeof value !== 'string') return null;
  const tier = value.trim().toUpperCase();
  if (VALID_TIERS.includes(tier)) return tier;
  return null;
}

function normalizeEquipItem(raw, fallbackPart) {
  if (!raw || typeof raw !== 'object') return null;
  const tier = normalizeTier(raw.tier || raw.rank || raw.grade);
  const part = PART_KEYS.includes(raw.part) ? raw.part : (PART_KEYS.includes(fallbackPart) ? fallbackPart : null);
  if (!tier || !part) return null;
  const base = toFiniteNumber(raw.base != null ? raw.base : raw.stat, 0);
  const lvl = Math.max(0, Math.min(20, toFiniteNumber(raw.lvl, 0)));
  const id = toFiniteNumber(raw.id, Date.now());
  const type = raw.type === 'def' || raw.type === 'atk' ? raw.type : (PART_TYPES[part] || 'atk');
  return { id, tier, part, base, lvl, type };
}

function normalizeEquipMap(raw, fallbackList) {
  const map = Array.isArray(raw) ? raw : null;
  const fallback = Array.isArray(fallbackList) ? fallbackList : null;
  const result = {};
  PART_KEYS.forEach((part) => {
    let source = null;
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw[part]) {
      source = raw[part];
    } else if (map) {
      source = map.find((item) => item && item.part === part);
    } else if (fallback) {
      source = fallback.find((item) => item && item.part === part);
    }
    result[part] = normalizeEquipItem(source, part);
  });
  return result;
}

function normalizeItems(raw) {
  const defaults = {
    potion: 0,
    hyperPotion: 0,
    protect: 0,
    enhance: 0,
    revive: 0,
    battleRes: 0,
    holyWater: 0,
    petTicket: 0
  };
  const result = { ...defaults };
  if (raw && typeof raw === 'object') {
    Object.keys(defaults).forEach((key) => {
      result[key] = Math.max(0, toFiniteNumber(raw[key], defaults[key]));
    });
  }
  return result;
}

function isoKeyFromTimestamp(ts) {
  return new Date(ts).toISOString().replace(/[:.]/g, '-');
}

async function ensureAdminRequest(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const requesterUid = context.auth.uid;
  const roleSnap = await admin.database().ref(`/users/${requesterUid}/role`).get();
  const role = roleSnap.exists() ? roleSnap.val() : 'user';
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  return requesterUid;
}

exports.mirrorUserProfile = functions
  .region(REGION)
  .database.ref('/users/{uid}')
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const after = change.after.val();
    const db = admin.database();
    const mirrorRef = db.ref(`/mirrors/${uid}`);

    if (after === null || after === undefined) {
      await mirrorRef.remove();
      return null;
    }

    const payload = cloneData(after) || {};
    payload.mirroredAt = admin.database.ServerValue.TIMESTAMP;
    await mirrorRef.set(payload);
    return null;
  });

exports.snapshotUsersHourly = functions
  .region(REGION)
  .pubsub.schedule('every 1 hours')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.database();
    const usersSnap = await db.ref('/users').get();
    if (!usersSnap.exists()) {
      return null;
    }

    const now = Date.now();
    const key = isoKeyFromTimestamp(now);
    const tasks = [];

    usersSnap.forEach((childSnap) => {
      const uid = childSnap.key;
      const data = cloneData(childSnap.val()) || {};
      data.snapshotAt = now;
      data.snapshotKey = key;
      const snapshotRef = db.ref(`/snapshots/${uid}/${key}`);
      tasks.push(snapshotRef.set(data));
    });

    await Promise.all(tasks);

    const removalTasks = [];
    const cutoff = now - SNAPSHOT_RETENTION_MS;

    usersSnap.forEach((childSnap) => {
      const uid = childSnap.key;
      const userSnapshotsRef = db.ref(`/snapshots/${uid}`);
      removalTasks.push(
        userSnapshotsRef
          .orderByChild('snapshotAt')
          .endAt(cutoff)
          .get()
          .then((expiredSnap) => {
            if (!expiredSnap.exists()) return null;
            const updates = {};
            expiredSnap.forEach((snap) => {
              updates[snap.key] = null;
            });
            if (Object.keys(updates).length === 0) return null;
            return userSnapshotsRef.update(updates);
          })
          .then(async () => {
            const allSnap = await userSnapshotsRef.orderByChild('snapshotAt').get();
            if (!allSnap.exists()) return null;
            const keys = [];
            allSnap.forEach((snap) => {
              keys.push({ key: snap.key, snapshotAt: snap.child('snapshotAt').val() || 0 });
            });
            if (keys.length <= SNAPSHOT_MAX_PER_USER) return null;
            keys.sort((a, b) => a.snapshotAt - b.snapshotAt);
            const removeKeys = keys.slice(0, keys.length - SNAPSHOT_MAX_PER_USER);
            const trimUpdates = {};
            removeKeys.forEach(({ key: snapKey }) => {
              trimUpdates[snapKey] = null;
            });
            if (!Object.keys(trimUpdates).length) return null;
            return userSnapshotsRef.update(trimUpdates);
          })
      );
    });

    await Promise.all(removalTasks);
    return null;
  });

exports.restoreUserProfile = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    await ensureAdminRequest(context);

    if (!data || typeof data !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', '요청 형식이 잘못되었습니다.');
    }

    const targetUid = typeof data.targetUid === 'string' && data.targetUid.trim().length
      ? data.targetUid.trim()
      : null;
    const source = data.source === 'mirror' ? 'mirror' : 'snapshot';
    const snapshotId = typeof data.snapshotId === 'string' ? data.snapshotId.trim() : null;

    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', '대상 사용자를 지정해주세요.');
    }
    if (source === 'snapshot' && !snapshotId) {
      throw new functions.https.HttpsError('invalid-argument', '스냅샷 ID가 필요합니다.');
    }

    const db = admin.database();
    const targetRef = db.ref(`/users/${targetUid}`);
    const sourceRef = source === 'mirror'
      ? db.ref(`/mirrors/${targetUid}`)
      : db.ref(`/snapshots/${targetUid}/${snapshotId}`);

    const sourceSnap = await sourceRef.get();
    if (!sourceSnap.exists()) {
      throw new functions.https.HttpsError('not-found', '백업 데이터를 찾을 수 없습니다.');
    }

    const payload = cloneData(sourceSnap.val());
    if (!payload) {
      throw new functions.https.HttpsError('data-loss', '백업 데이터가 비어 있습니다.');
    }

    const now = Date.now();
    const backupKey = `pre-restore-${isoKeyFromTimestamp(now)}`;
    const currentSnap = await targetRef.get();
    if (currentSnap.exists()) {
      const currentData = cloneData(currentSnap.val()) || {};
      currentData.snapshotAt = now;
      currentData.snapshotKey = backupKey;
      currentData.note = `자동 백업 (복원 이전 상태)`;
      await db.ref(`/snapshots/${targetUid}/${backupKey}`).set(currentData);
    }

    delete payload.snapshotKey;
    delete payload.snapshotAt;
    delete payload.restoredAt;
    delete payload.restoredFrom;
    delete payload.mirroredAt;
    payload.equip = normalizeEquipMap(payload.equip, payload.inventory);
    payload.spares = normalizeEquipMap(payload.spares, payload.inventory);
    payload.items = normalizeItems(payload.items);
    delete payload.inventory;
    if (!payload.pets || typeof payload.pets !== 'object') {
      payload.pets = {};
    }
    if (!payload.characters || typeof payload.characters !== 'object') {
      payload.characters = {};
    }
    if (!payload.settings || typeof payload.settings !== 'object') {
      payload.settings = {};
    }
    payload.restoredAt = admin.database.ServerValue.TIMESTAMP;
    payload.restoredFrom = source === 'mirror' ? 'mirror' : snapshotId;

    await targetRef.set(payload);

    return {
      status: 'ok',
      restoredFrom: source,
      snapshotId: source === 'mirror' ? null : snapshotId
    };
  });
