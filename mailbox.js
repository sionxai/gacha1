import {
  auth,
  db,
  onAuthStateChanged,
  ref,
  get,
  update,
  onValue,
  remove
} from './firebase.js';
import {
  buildMailEntry,
  sanitizeMailRewards,
  sanitizeFirebaseKey
} from './mail-service.js';

const sanitizeKey = sanitizeFirebaseKey;

const MAILBOX_STYLE = `
:root {
  --mailbox-btn-bg: rgba(12, 16, 26, 0.9);
  --mailbox-btn-hover: rgba(30, 40, 60, 0.95);
  --mailbox-accent: #6aa9ff;
  --mailbox-danger: #ff6b6b;
  --mailbox-ok: #43c383;
  --mailbox-warn: #f6c34a;
}

.mailbox-widget {
  position: fixed;
  top: 16px;
  right: 18px;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.mailbox-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(142, 238, 255, 0.2);
  background: var(--mailbox-btn-bg);
  color: #e7ecf3;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
}

.mailbox-button:hover {
  transform: translateY(-1px);
  background: var(--mailbox-btn-hover);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.32);
}

.mailbox-button .icon {
  font-size: 18px;
}

.mailbox-badge {
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--mailbox-accent);
  color: #06122a;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.mailbox-badge.hidden {
  display: none;
}

.mailbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 5, 9, 0.72);
  display: none;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 80px 24px 24px;
  z-index: 1150;
  pointer-events: none;
}

.mailbox-overlay.open {
  display: flex;
  pointer-events: auto;
}

.mailbox-panel {
  width: min(420px, 95vw);
  max-height: calc(100vh - 120px);
  background: rgba(14, 18, 28, 0.95);
  border-radius: 18px;
  border: 1px solid rgba(142, 238, 255, 0.25);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mailbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(142, 238, 255, 0.2);
}

.mailbox-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--mailbox-accent);
}

.mailbox-close {
  background: rgba(18, 24, 36, 0.85);
  border: none;
  color: #c9d6e9;
  font-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  cursor: pointer;
}

.mailbox-close:hover {
  background: rgba(32, 44, 68, 0.9);
}

.mailbox-status {
  padding: 10px 20px;
  font-size: 12px;
  color: #aeb7c6;
  border-bottom: 1px solid rgba(142, 238, 255, 0.08);
}

.mailbox-status.ok { color: var(--mailbox-ok); }
.mailbox-status.warn { color: var(--mailbox-warn); }
.mailbox-status.danger { color: var(--mailbox-danger); }

.mailbox-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mailbox-item {
  border: 1px solid rgba(142, 238, 255, 0.18);
  border-radius: 14px;
  padding: 14px 16px;
  background: rgba(10, 14, 24, 0.75);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mailbox-item.expiring-soon {
  border-color: rgba(246, 195, 74, 0.6);
}

.mailbox-item h3 {
  margin: 0;
  font-size: 15px;
  color: #e7ecf3;
}

.mailbox-meta {
  font-size: 12px;
  color: #8993a8;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mailbox-message {
  font-size: 13px;
  color: #cfd7e5;
  white-space: pre-line;
}

.mailbox-rewards {
  font-size: 13px;
  color: var(--mailbox-accent);
  display: flex;
  gap: 10px;
}

.mailbox-actions {
  display: flex;
  gap: 8px;
}

.mailbox-actions button {
  flex: 1;
  border-radius: 10px;
  border: 1px solid rgba(142, 238, 255, 0.25);
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}

.mailbox-actions button.claim {
  background: var(--mailbox-accent);
  color: #06122a;
}

.mailbox-actions button.delete {
  background: rgba(30, 40, 60, 0.9);
  color: #d9e3f5;
}

.mailbox-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mailbox-empty {
  text-align: center;
  font-size: 13px;
  color: #8390a8;
  padding: 30px 0;
}
`;

let currentUser = null;
let mailboxListener = null;
let mailboxItems = [];
let mailboxInitialized = false;

let widgetEl = null;
let buttonEl = null;
let badgeEl = null;
let overlayEl = null;
let panelEl = null;
let listEl = null;
let statusEl = null;
let closeEl = null;

function ensureStyleInjected() {
  if (document.getElementById('global-mailbox-styles')) return;
  const style = document.createElement('style');
  style.id = 'global-mailbox-styles';
  style.textContent = MAILBOX_STYLE;
  document.head.appendChild(style);
}

function buildMailboxUI() {
  if (mailboxInitialized || typeof document === 'undefined') return;
  ensureStyleInjected();
  widgetEl = document.createElement('div');
  widgetEl.className = 'mailbox-widget';
  widgetEl.style.display = 'none';

  buttonEl = document.createElement('button');
  buttonEl.type = 'button';
  buttonEl.className = 'mailbox-button';
  buttonEl.innerHTML = '<span class="icon">📬</span><span>우편함</span>';

  badgeEl = document.createElement('span');
  badgeEl.className = 'mailbox-badge hidden';
  badgeEl.textContent = '0';
  buttonEl.appendChild(badgeEl);

  widgetEl.appendChild(buttonEl);
  document.body.appendChild(widgetEl);

  overlayEl = document.createElement('div');
  overlayEl.className = 'mailbox-overlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-modal', 'true');

  panelEl = document.createElement('div');
  panelEl.className = 'mailbox-panel';

  const header = document.createElement('div');
  header.className = 'mailbox-header';
  const title = document.createElement('h2');
  title.textContent = '우편함';
  closeEl = document.createElement('button');
  closeEl.className = 'mailbox-close';
  closeEl.innerHTML = '&times;';
  header.appendChild(title);
  header.appendChild(closeEl);

  statusEl = document.createElement('div');
  statusEl.className = 'mailbox-status';

  listEl = document.createElement('div');
  listEl.className = 'mailbox-list';

  panelEl.appendChild(header);
  panelEl.appendChild(statusEl);
  panelEl.appendChild(listEl);
  overlayEl.appendChild(panelEl);
  document.body.appendChild(overlayEl);

  buttonEl.addEventListener('click', () => {
    toggleMailbox(true);
  });
  closeEl.addEventListener('click', () => toggleMailbox(false));
  overlayEl.addEventListener('click', (event) => {
    if (event.target === overlayEl) {
      toggleMailbox(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleMailbox(false);
    }
  });

  mailboxInitialized = true;
}

function toggleMailbox(open) {
  if (!overlayEl) return;
  overlayEl.classList.toggle('open', open);
  if (widgetEl) {
    widgetEl.style.opacity = open ? '0' : '1';
    widgetEl.style.pointerEvents = open ? 'none' : 'auto';
  }
  if (open) {
    setMailboxStatus(mailboxItems.length ? `${mailboxItems.length}개의 우편이 도착했습니다.` : '우편함이 비어 있습니다.');
  }
}

function setMailboxStatus(message, tone = null) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.remove('ok', 'warn', 'danger');
  if (tone === 'ok') statusEl.classList.add('ok');
  else if (tone === 'warn') statusEl.classList.add('warn');
  else if (tone === 'danger') statusEl.classList.add('danger');
}

function updateBadge() {
  if (!badgeEl) return;
  const activeCount = mailboxItems.length;
  if (activeCount <= 0) {
    badgeEl.classList.add('hidden');
    badgeEl.textContent = '0';
  } else {
    badgeEl.classList.remove('hidden');
    badgeEl.textContent = String(activeCount);
  }
}

function formatDate(ts) {
  if (!ts) return '-';
  const date = new Date(ts);
  return date.toLocaleString('ko-KR');
}

function formatRelative(ts) {
  if (!ts) return '-';
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60000);
  if (diff < 0) {
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  }
  if (minutes < 60) return `${minutes}분 후 만료`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 후 만료`;
  const days = Math.floor(hours / 24);
  return `${days}일 후 만료`;
}

async function claimMail(mail) {
  if (!currentUser || !mail) return;
  try {
    console.log('🎁 [claimMail] 시작 - 메일 데이터:', mail);
    console.log('🔍 [claimMail] 즉시 쿠폰 검사:', {
      hasCoupon: !!mail.coupon,
      coupon: mail.coupon,
      allMailKeys: Object.keys(mail)
    });
    setMailboxStatus('우편을 수령하는 중입니다...', null);

    const userRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      setMailboxStatus('사용자 정보를 찾을 수 없습니다.', 'danger');
      return;
    }

    const data = snapshot.val() || {};
    console.log('👤 [claimMail] 현재 사용자 데이터:', data);

    const rewards = sanitizeMailRewards(mail.rewards);
    console.log('🏆 [claimMail] 정제된 보상:', rewards);

    const updates = {};
    if (rewards.points) {
      const base = Number.isFinite(data.wallet) ? data.wallet : 0;
      updates.wallet = Math.max(0, base + rewards.points);
      console.log(`💰 [claimMail] 포인트 업데이트: ${base} + ${rewards.points} = ${updates.wallet}`);
    }
    if (rewards.gold) {
      const base = Number.isFinite(data.gold) ? data.gold : 0;
      updates.gold = Math.max(0, base + rewards.gold);
      console.log(`🥇 [claimMail] 골드 업데이트: ${base} + ${rewards.gold} = ${updates.gold}`);
    }
    if (rewards.diamonds) {
      const base = Number.isFinite(data.diamonds) ? data.diamonds : 0;
      updates.diamonds = Math.max(0, base + rewards.diamonds);
      console.log(`💎 [claimMail] 다이아 업데이트: ${base} + ${rewards.diamonds} = ${updates.diamonds}`);
    }
    if (rewards.petTickets) {
      // Fix: Firebase nested path update 수정
      const items = data.items && typeof data.items === 'object' ? { ...data.items } : {};
      const nextTickets = Math.max(0, (Number.isFinite(items.petTicket) ? items.petTicket : 0) + rewards.petTickets);
      // items 객체 전체를 업데이트하도록 수정
      updates.items = { ...(data.items || {}), petTicket: nextTickets };
      console.log(`🎫 [claimMail] 펫 티켓 업데이트: ${items.petTicket || 0} + ${rewards.petTickets} = ${nextTickets}`);
    }

    console.log('📝 [claimMail] 최종 업데이트 데이터:', updates);

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await update(userRef, updates);
      console.log('✅ [claimMail] Firebase 업데이트 완료');

      // 성공적으로 업데이트된 후 UI 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new window.CustomEvent('walletUpdated', {
        detail: {
          wallet: updates.wallet,
          gold: updates.gold,
          diamonds: updates.diamonds,
          items: updates.items
        }
      }));
    } else {
      console.warn('⚠️ [claimMail] 업데이트할 데이터가 없습니다');
    }

    // 🎁 직접 아이템 지급 처리 - rewards에 직접 아이템이 포함된 경우
    if (mail.rewards && (mail.rewards.directGear || mail.rewards.directCharacter || mail.rewards.directPet)) {
      try {
        console.log('🎁 [claimMail] 직접 아이템 지급 처리 시작:', mail.rewards);

        if (mail.rewards.directGear) {
          // 장비 직접 지급
          const gearData = mail.rewards.directGear;
          const item = gearData.item;

          console.log('⚔️ [claimMail] 장비 지급:', item);

          if (window.applyEquipAndInventory) {
            // app.js의 applyEquipAndInventory 함수 호출
            window.applyEquipAndInventory(item);
            console.log('✅ [claimMail] 장비가 인벤토리에 추가됨');
          }
        }

        if (mail.rewards.directCharacter) {
          // 캐릭터 직접 지급
          const charData = mail.rewards.directCharacter;

          console.log('👤 [claimMail] 캐릭터 지급:', charData);

          // 사용자 데이터 다시 가져오기
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val() || {};
            const characters = userData.characters || { owned: {}, active: null };

            // 캐릭터 수량 증가
            const characterId = charData.characterId;
            if (!characters.owned[characterId]) {
              characters.owned[characterId] = 0;
            }
            characters.owned[characterId] += 1;

            // 첫 번째 획득한 캐릭터라면 대표 캐릭터로 설정
            if (characters.owned[characterId] === 1 && !characters.active) {
              characters.active = characterId;
            }

            await update(userRef, { characters });
            console.log('✅ [claimMail] 캐릭터가 추가됨');
          }
        }

        if (mail.rewards.directPet) {
          // 펫 직접 지급
          const petData = mail.rewards.directPet;

          console.log('🐾 [claimMail] 펫 지급:', petData);

          // 사용자 데이터 다시 가져오기
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val() || {};
            const pets = userData.pets || { owned: {}, active: null };

            // 펫 수량 증가
            const petId = petData.petId;
            if (!pets.owned[petId]) {
              pets.owned[petId] = 0;
            }
            pets.owned[petId] += 1;

            // 첫 번째 획득한 펫이라면 활성 펫으로 설정
            if (pets.owned[petId] === 1 && !pets.active) {
              pets.active = petId;
            }

            await update(userRef, { pets });
            console.log('✅ [claimMail] 펫이 추가됨');
          }
        }

        // UI 업데이트 이벤트 발생
        window.dispatchEvent(new window.CustomEvent('directItemGranted', {
          detail: {
            gear: mail.rewards.directGear,
            character: mail.rewards.directCharacter,
            pet: mail.rewards.directPet
          }
        }));

        setMailboxStatus('아이템이 성공적으로 지급되었습니다!', 'ok');
      } catch (error) {
        console.error('❌ [claimMail] 직접 아이템 지급 중 오류:', error);
        setMailboxStatus(`아이템 지급 중 오류가 발생했습니다: ${error.message}`, 'danger');
      }
    }

    // 🎟️ 쿠폰 처리 - 쿠폰 우편인 경우 100% 확률 뽑기 실행 (기존 시스템 - 사용 안함)
    if (mail.coupon || (mail.coupon_type && mail.coupon_targetKey)) {
      try {
        let coupon = mail.coupon;

        // 호환성을 위해 개별 필드에서 쿠폰 객체 구성
        if (!coupon && mail.coupon_type && mail.coupon_targetKey) {
          coupon = {
            type: mail.coupon_type,
            targetKey: mail.coupon_targetKey,
            tier: mail.coupon_tier || 'SSS+'
          };
        }

        console.log('🎟️ [claimMail] 쿠폰 처리 시작:', coupon);

        // app.js에서 노출된 쿠폰 처리 함수 호출
        if (window.processCouponRedemption) {
          const result = await window.processCouponRedemption(coupon);

          if (result) {
            console.log('✅ [claimMail] 쿠폰 처리 성공:', result);

            // 쿠폰으로 획득한 아이템 메시지 표시
            const successMessage = result.message || '쿠폰이 성공적으로 사용되었습니다!';
            setMailboxStatus(successMessage, 'ok');

            // UI 업데이트를 위한 이벤트 발생
            window.dispatchEvent(new window.CustomEvent('couponRedeemed', {
              detail: {
                coupon,
                result,
                type: result.type
              }
            }));
          } else {
            console.error('❌ [claimMail] 쿠폰 처리 실패 - 결과 없음');
            setMailboxStatus('쿠폰 처리에 실패했습니다.', 'danger');
          }
        } else {
          console.error('❌ [claimMail] processCouponRedemption 함수를 찾을 수 없습니다');
          setMailboxStatus('쿠폰 처리 시스템을 찾을 수 없습니다.', 'danger');
        }
      } catch (couponError) {
        console.error('❌ [claimMail] 쿠폰 처리 중 오류:', couponError);
        setMailboxStatus(`쿠폰 처리 중 오류가 발생했습니다: ${couponError.message}`, 'danger');
      }
    }

    // Use the source path stored in the mail object, fallback to default if not available
    const mailPath = mail._sourcePath || `mailbox/${sanitizeKey(currentUser.uid)}`;
    console.log(`🗑️ [claimMail] 메일 삭제 경로: ${mailPath}/${mail.id}`);
    await remove(ref(db, `${mailPath}/${mail.id}`));
    setMailboxStatus('우편을 수령했습니다.', 'ok');

    console.log('🎉 [claimMail] 우편 수령 완료');
  } catch (error) {
    console.error('❌ [claimMail] 우편 수령 실패:', error);
    setMailboxStatus(`우편 수령에 실패했습니다: ${error.message}`, 'danger');
  }
}

async function deleteMail(mail) {
  if (!currentUser || !mail) return;
  try {
    // Use the source path stored in the mail object, fallback to default if not available
    const mailPath = mail._sourcePath || `mailbox/${sanitizeKey(currentUser.uid)}`;
    await remove(ref(db, `${mailPath}/${mail.id}`));
    setMailboxStatus('우편을 삭제했습니다.', 'warn');
  } catch (error) {
    console.error('우편 삭제 실패', error);
    setMailboxStatus('우편 삭제 중 오류가 발생했습니다.', 'danger');
  }
}

function renderMailboxList() {
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!mailboxItems.length) {
    const empty = document.createElement('div');
    empty.className = 'mailbox-empty';
    empty.textContent = '받은 우편이 없습니다.';
    listEl.appendChild(empty);
    updateBadge();
    return;
  }

  mailboxItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  mailboxItems.forEach((mail) => {
    const item = document.createElement('div');
    item.className = 'mailbox-item';
    if (mail.expiresAt && mail.expiresAt - Date.now() < 3 * 24 * 60 * 60 * 1000) {
      item.classList.add('expiring-soon');
    }
    const title = document.createElement('h3');
    title.textContent = mail.title || '발신된 우편';
    const meta = document.createElement('div');
    meta.className = 'mailbox-meta';
    meta.innerHTML = `<span>${formatDate(mail.createdAt)}</span>`;
    if (mail.expiresAt) {
      meta.innerHTML += `<span>만료: ${formatDate(mail.expiresAt)} (${formatRelative(mail.expiresAt)})</span>`;
    }
    const message = document.createElement('div');
    message.className = 'mailbox-message';
    message.textContent = mail.message || '';

    const rewards = sanitizeMailRewards(mail.rewards);
    if (Object.keys(rewards).length) {
      const rewardEl = document.createElement('div');
      rewardEl.className = 'mailbox-rewards';
      const parts = [];
      if (rewards.gold) parts.push(`골드 ${rewards.gold.toLocaleString('ko-KR')}`);
      if (rewards.points) parts.push(`포인트 ${rewards.points.toLocaleString('ko-KR')}`);
      if (rewards.diamonds) parts.push(`다이아 ${rewards.diamonds.toLocaleString('ko-KR')}`);
      if (rewards.petTickets) parts.push(`펫 뽑기권 ${rewards.petTickets.toLocaleString('ko-KR')}`);
      rewardEl.textContent = parts.join(' · ');
      item.appendChild(rewardEl);
    }

    // 🎟️ 쿠폰 표시 - 쿠폰 우편인 경우 쿠폰 정보 표시
    if (mail.coupon || (mail.coupon_type && mail.coupon_targetKey)) {
      let coupon = mail.coupon;

      // 호환성을 위해 개별 필드에서 쿠폰 객체 구성
      if (!coupon && mail.coupon_type && mail.coupon_targetKey) {
        coupon = {
          type: mail.coupon_type,
          targetKey: mail.coupon_targetKey,
          tier: mail.coupon_tier || 'SSS+'
        };
      }

      const couponEl = document.createElement('div');
      couponEl.className = 'mailbox-coupon';

      let couponText = '';
      let couponIcon = '🎟️';

      if (coupon.type === 'gear') {
        const gearNames = {
          head: '투구', body: '갑옷', main: '주무기', off: '보조무기', boots: '신발'
        };
        const gearIcons = {
          head: '🪖', body: '🛡️', main: '⚔️', off: '🗡️', boots: '🥾'
        };
        couponIcon = gearIcons[coupon.targetKey] || '⚔️';
        couponText = `${coupon.tier} ${gearNames[coupon.targetKey] || coupon.targetKey} 쿠폰`;
      } else if (coupon.type === 'character') {
        const classNames = {
          warrior: '전사', mage: '마법사', archer: '궁수', rogue: '도적', goddess: '여신'
        };
        const classIcons = {
          warrior: '⚔️', mage: '🔮', archer: '🏹', rogue: '🗡️', goddess: '✨'
        };
        couponIcon = classIcons[coupon.targetKey] || '⚔️';
        couponText = `${coupon.tier} ${classNames[coupon.targetKey] || coupon.targetKey} 쿠폰`;
      } else if (coupon.type === 'pet') {
        const petNames = {
          pet_ant: '사막 개미 수호병', pet_deer: '신속 사슴', pet_goat: '암석 산양',
          pet_tiger: '백호', pet_horang: '호랭찡'
        };
        couponIcon = '🐾';
        couponText = `${petNames[coupon.targetKey] || coupon.targetKey} 쿠폰`;
      }

      couponEl.innerHTML = `<span class="coupon-icon">${couponIcon}</span> ${couponText}`;
      couponEl.style.cssText = `
        background: linear-gradient(135deg, #ffd700, #ffed4a);
        color: #1a1a1a;
        padding: 8px 12px;
        border-radius: 6px;
        font-weight: 600;
        margin: 8px 0;
        display: flex;
        align-items: center;
        gap: 6px;
        border: 2px solid #ffaa00;
        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
      `;

      item.appendChild(couponEl);
    }

    const actions = document.createElement('div');
    actions.className = 'mailbox-actions';
    const claimBtn = document.createElement('button');
    claimBtn.className = 'claim';
    claimBtn.textContent = '수령';
    claimBtn.addEventListener('click', () => {
      claimBtn.disabled = true;
      deleteBtn.disabled = true;
      claimMail(mail).finally(() => {
        claimBtn.disabled = false;
        deleteBtn.disabled = false;
      });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => {
      deleteBtn.disabled = true;
      claimBtn.disabled = true;
      deleteMail(mail).finally(() => {
        deleteBtn.disabled = false;
        claimBtn.disabled = false;
      });
    });

    actions.appendChild(claimBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(title);
    item.appendChild(meta);
    if (mail.message) item.appendChild(message);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
  updateBadge();
}

function subscribeMailbox(user) {
  if (mailboxListener) {
    mailboxListener();
    mailboxListener = null;
  }
  mailboxItems = [];
  updateBadge();
  if (!user) {
    if (widgetEl) widgetEl.style.display = 'none';
    if (listEl) listEl.innerHTML = '<div class="mailbox-empty">로그인이 필요합니다.</div>';
    toggleMailbox(false);
    return;
  }
  if (widgetEl) widgetEl.style.display = 'flex';

  // Listen to multiple paths where mails might be stored
  const sanitizedUid = sanitizeKey(user.uid);
  if (!sanitizedUid) {
    console.error('❌ [mailbox] UID를 정제할 수 없습니다. 우편함을 비활성화합니다.', { uid: user.uid });
    if (widgetEl) widgetEl.style.display = 'none';
    if (listEl) listEl.innerHTML = '<div class="mailbox-empty">우편함을 불러올 수 없습니다.</div>';
    toggleMailbox(false);
    return;
  }
  const mailPaths = [
    `mailbox/${sanitizedUid}`,
    `user_mail/${sanitizedUid}`,
    `test_mail/${sanitizedUid}`
  ];

  let listeners = [];
  let combinedData = {};
  let pathsLoaded = 0;

  const processAllMails = () => {
    const entries = [];
    const expired = [];

    Object.entries(combinedData).forEach(([id, mailWithPath]) => {
      const mail = buildMailEntry(id, mailWithPath.data);
      if (!mail) return;

      // Add path info to mail for proper cleanup
      mail._sourcePath = mailWithPath.path;

      if (mail.expiresAt && mail.expiresAt < Date.now()) {
        expired.push({ id, path: mailWithPath.path });
        return;
      }
      entries.push(mail);
    });

    mailboxItems = entries;
    renderMailboxList();

    if (expired.length) {
      expired.forEach(({ id: mailId, path }) => {
        remove(ref(db, `${path}/${mailId}`)).catch((error) => {
          console.warn('만료 우편 삭제 실패', error);
        });
      });
    }
  };

  mailPaths.forEach((path) => {
    const mailRef = ref(db, path);
    const listener = onValue(mailRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};

      // Remove old entries from this path
      Object.keys(combinedData).forEach(key => {
        if (combinedData[key].path === path) {
          delete combinedData[key];
        }
      });

      // Add new entries from this path
      Object.entries(data).forEach(([id, payload]) => {
        combinedData[id] = { data: payload, path };
      });

      pathsLoaded++;
      if (pathsLoaded >= mailPaths.length) {
        processAllMails();
      }
    }, (error) => {
      console.error(`우편함 수신 실패 (${path}):`, error);
      pathsLoaded++;
      if (pathsLoaded >= mailPaths.length) {
        processAllMails();
      }
    });

    listeners.push(listener);
  });

  // Store cleanup function
  mailboxListener = () => {
    listeners.forEach(cleanup => cleanup());
    listeners = [];
    combinedData = {};
    pathsLoaded = 0;
  };
}

onAuthStateChanged(auth, (firebaseUser) => {
  if (typeof document === 'undefined') return;
  buildMailboxUI();
  currentUser = firebaseUser || null;
  if (!currentUser) {
    subscribeMailbox(null);
    return;
  }
  subscribeMailbox(currentUser);
});

export function getMailboxState() {
  return {
    user: currentUser,
    items: mailboxItems.slice()
  };
}
