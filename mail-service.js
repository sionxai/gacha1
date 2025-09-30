import { db, ref, set, push } from './firebase.js';

export const MAIL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function sanitizeFirebaseKey(key) {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeMailRewards(rewards) {
  const map = {};
  if (!rewards || typeof rewards !== 'object') return map;
  ['gold', 'points', 'diamonds', 'petTickets'].forEach((key) => {
    const value = Number(rewards[key]);
    if (Number.isFinite(value) && value !== 0) {
      map[key] = Math.trunc(value);
    }
  });
  return map;
}

export function sanitizeMailCoupon(coupon) {
  if (!coupon || typeof coupon !== 'object') return null;

  const type = coupon.type;
  const targetKey = coupon.targetKey;

  // 유효한 쿠폰 타입인지 확인
  if (!['gear', 'character', 'pet'].includes(type)) return null;
  if (!targetKey || typeof targetKey !== 'string') return null;

  return {
    type,
    targetKey: targetKey.trim(),
    tier: coupon.tier || 'SSS+' // 기본값은 SSS+
  };
}

export function buildMailEntry(id, payload = {}) {
  const now = Date.now();
  const createdAt = typeof payload.createdAt === 'number' ? payload.createdAt : now;
  const expiresAt = typeof payload.expiresAt === 'number' ? payload.expiresAt : createdAt + MAIL_EXPIRY_MS;

  // payload가 null이나 undefined인 경우를 안전하게 처리
  const safePayload = payload || {};

  // rewards 객체 재구성 - 개별 필드(reward_*)를 rewards 객체로 변환
  let rewards = {};
  if (safePayload.rewards && typeof safePayload.rewards === 'object') {
    // 기존 rewards 객체가 있는 경우
    rewards = sanitizeMailRewards(safePayload.rewards);
  } else {
    // reward_ 접두어가 붙은 개별 필드들을 찾아서 rewards 객체로 변환
    Object.keys(safePayload).forEach(key => {
      if (key.startsWith('reward_')) {
        const rewardType = key.substring(7); // 'reward_' 제거
        const value = safePayload[key];
        if (typeof value === 'number' && value > 0) {
          rewards[rewardType] = value;
        }
      }
    });
  }

  // metadata 객체 재구성 - 개별 필드(meta_*)를 metadata 객체로 변환
  let metadata = {};
  if (safePayload.metadata && typeof safePayload.metadata === 'object') {
    metadata = safePayload.metadata;
  } else {
    Object.keys(safePayload).forEach(key => {
      if (key.startsWith('meta_')) {
        const metaType = key.substring(5); // 'meta_' 제거
        metadata[metaType] = safePayload[key];
      }
    });
  }

  // 쿠폰 처리
  let coupon = null;
  if (safePayload.coupon) {
    coupon = sanitizeMailCoupon(safePayload.coupon);
  }

  return {
    id: id || 'unknown',
    title: safePayload.title || '우편',
    message: safePayload.message || '',
    rewards: rewards,
    metadata: metadata,
    coupon: coupon,
    type: safePayload.type || 'general',
    createdAt,
    expiresAt,
    read: !!safePayload.read
  };
}

export async function enqueueMail(uid, payload = {}) {
  if (!uid) throw new Error('uid가 필요합니다.');

  console.log('📧 [enqueueMail] 입력 데이터:', {
    uid,
    payload: JSON.stringify(payload, null, 2)
  });

  const now = Date.now();

  const safeUid = sanitizeFirebaseKey(uid);
  if (!safeUid) {
    const error = new Error('잘못된 UID입니다. 메일을 전송할 수 없습니다.');
    error.code = 'invalid-uid';
    console.error('❌ [enqueueMail] UID 검증 실패:', { uid });
    throw error;
  }

  console.log('📧 [enqueueMail] uid 검사', { uid, safeUid });

  const mailboxRef = push(ref(db, `mailbox/${safeUid}`));
  const entry = buildMailEntry(mailboxRef.key, {
    ...payload,
    createdAt: payload.createdAt ?? now,
    expiresAt: payload.expiresAt ?? now + MAIL_EXPIRY_MS
  });

  console.log('📧 [enqueueMail] buildMailEntry 결과:', JSON.stringify(entry, null, 2));

  // Firebase validation을 위해 null/undefined 값을 안전하게 처리
  const safeTitle = (entry.title && typeof entry.title === 'string' && entry.title.trim()) ? entry.title.trim() : '우편';
  const safeMessage = (entry.message && typeof entry.message === 'string' && entry.message.trim()) ? entry.message.trim() : '내용이 없습니다.';
  const safeType = (entry.type && typeof entry.type === 'string' && entry.type.trim()) ? entry.type.trim() : 'general';

  // rewards와 metadata 객체를 더 안전하게 처리
  const safeRewards = {};
  if (entry.rewards && typeof entry.rewards === 'object') {
    Object.keys(entry.rewards).forEach(key => {
      const value = entry.rewards[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        safeRewards[key] = value;
      }
    });
  }

  const safeMetadata = {};
  if (entry.metadata && typeof entry.metadata === 'object') {
    Object.keys(entry.metadata).forEach(key => {
      const value = entry.metadata[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'string' && value.trim()) {
          safeMetadata[key] = value.trim();
        } else if (typeof value === 'number' && Number.isFinite(value)) {
          safeMetadata[key] = value;
        } else if (typeof value === 'boolean') {
          safeMetadata[key] = value;
        }
      }
    });
  }

  const safeData = {
    title: safeTitle,
    message: safeMessage,
    // 빈 객체 대신 최소한의 기본값 제공
    rewards: Object.keys(safeRewards).length > 0 ? safeRewards : { points: 0 },
    metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : { source: 'system' },
    type: safeType,
    createdAt: entry.createdAt || now,
    expiresAt: entry.expiresAt || (now + MAIL_EXPIRY_MS),
    read: !!entry.read
  };

  console.log('📧 [enqueueMail] Firebase로 전송할 데이터:', JSON.stringify(safeData, null, 2));
  console.log('📧 [enqueueMail] 각 필드 타입 확인:', {
    title: typeof safeData.title,
    message: typeof safeData.message,
    rewards: typeof safeData.rewards,
    metadata: typeof safeData.metadata,
    type: typeof safeData.type,
    createdAt: typeof safeData.createdAt,
    expiresAt: typeof safeData.expiresAt,
    read: typeof safeData.read
  });

  // 먼저 mailbox 경로에 직접 저장 시도
  try {
    console.log('📧 [enqueueMail] mailbox 경로 시도:', `mailbox/${safeUid}`);

    const minimalData = {
      title: safeTitle,
      message: safeMessage,
      type: safeType,
      createdAt: entry.createdAt || now,
      expiresAt: entry.expiresAt || (now + MAIL_EXPIRY_MS),
      read: false
    };

    // rewards를 개별 필드로 추가
    if (Object.keys(safeRewards).length > 0) {
      Object.keys(safeRewards).forEach(key => {
        minimalData[`reward_${key}`] = safeRewards[key];
      });
    }

    // metadata를 개별 필드로 추가
    if (Object.keys(safeMetadata).length > 0) {
      Object.keys(safeMetadata).forEach(key => {
        if (typeof safeMetadata[key] === 'string') {
          minimalData[`meta_${key}`] = safeMetadata[key];
        } else if (typeof safeMetadata[key] === 'number') {
          minimalData[`meta_${key}`] = safeMetadata[key];
        }
      });
    }

    // 쿠폰 데이터 추가
    if (entry.coupon) {
      minimalData.coupon_type = entry.coupon.type;
      minimalData.coupon_targetKey = entry.coupon.targetKey;
      minimalData.coupon_tier = entry.coupon.tier;
    }

    console.log('📧 [enqueueMail] mailbox에 저장할 데이터:', JSON.stringify(minimalData, null, 2));

    await set(mailboxRef, minimalData);
    console.log('✅ [enqueueMail] mailbox 경로에 성공적으로 저장됨!');

    return mailboxRef.key;
  } catch (error) {
    console.error('❌ [enqueueMail] mailbox 경로 저장 실패:', error);
    console.error('Error details:', error.code, error.message);

    // fallback: user_mail 경로 시도
    try {
      console.log('📧 [enqueueMail] user_mail 경로로 fallback...');
      const userMailRef = push(ref(db, `user_mail/${safeUid}`));

      const fallbackData = {
        title: safeTitle || '관리자 보상',
        message: safeMessage || '보상이 지급되었습니다.',
        type: safeType || 'admin_grant',
        createdAt: now,
        expiresAt: now + MAIL_EXPIRY_MS,
        read: false
      };

      // rewards 추가
      if (Object.keys(safeRewards).length > 0) {
        Object.keys(safeRewards).forEach(key => {
          fallbackData[`reward_${key}`] = safeRewards[key];
        });
      }

      await set(userMailRef, fallbackData);
      console.log('✅ [enqueueMail] user_mail 경로에 저장 성공');

      return userMailRef.key;
    } catch (fallbackError) {
      console.error('❌ [enqueueMail] user_mail 경로도 실패:', fallbackError);
      throw new Error(`메일 저장에 실패했습니다: ${fallbackError.message}`);
    }
  }
}
