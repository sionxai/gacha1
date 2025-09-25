import {
  auth,
  db,
  onAuthStateChanged,
  ref,
  get,
  push,
  set,
  remove,
  query,
  limitToLast,
  onValue
} from './firebase.js';

const CHAT_MESSAGES_PATH = 'chat/messages';
const CHAT_MESSAGE_LIMIT = 120;
const SYSTEM_USERNAME = '시스템';
const DEFAULT_USERNAME = '익명 용사';

let currentUser = null;
let messageUnsubscribe = null;
let lastMessages = [];
const userListeners = new Set();
const messageListeners = new Set();

function notifyListeners(setRef, payload) {
  setRef.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.warn('Chat listener error', error);
    }
  });
}

function sanitizeText(raw) {
  if (typeof raw !== 'string') return '';
  let text = raw.replace(/\s+/g, ' ').trim();
  const maxLength = 300;
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }
  return text;
}

function deriveUsername(firebaseUser, profileData) {
  if (profileData && typeof profileData.username === 'string' && profileData.username.trim()) {
    return profileData.username.trim();
  }
  if (firebaseUser) {
    const { displayName, email } = firebaseUser;
    if (typeof displayName === 'string' && displayName.trim()) {
      return displayName.trim();
    }
    if (typeof email === 'string' && email.includes('@')) {
      return email.split('@')[0] || '익명 용사';
    }
  }
  return DEFAULT_USERNAME;
}

function deriveRole(profileData) {
  const role = profileData && typeof profileData.role === 'string' ? profileData.role : 'user';
  return role === 'admin' ? 'admin' : 'user';
}

async function loadUserProfile(firebaseUser) {
  if (!firebaseUser) return null;
  const uid = firebaseUser.uid;
  try {
    const snapshot = await get(ref(db, `users/${uid}`));
    const data = snapshot.exists() ? snapshot.val() : {};
    const username = deriveUsername(firebaseUser, data);
    const role = deriveRole(data);
    return {
      uid,
      username,
      role
    };
  } catch (error) {
    console.warn('Failed to load chat profile', error);
    return {
      uid,
      username: deriveUsername(firebaseUser, null),
      role: 'user'
    };
  }
}

function setCurrentUser(profile) {
  currentUser = profile;
  notifyListeners(userListeners, currentUser);
}

onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    setCurrentUser(null);
    return;
  }
  const profile = await loadUserProfile(firebaseUser);
  setCurrentUser(profile);
});

function ensureMessageSubscription() {
  if (messageUnsubscribe) return;
  const chatQuery = query(ref(db, CHAT_MESSAGES_PATH), limitToLast(CHAT_MESSAGE_LIMIT));
  messageUnsubscribe = onValue(chatQuery, (snapshot) => {
    const items = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (!value || typeof value !== 'object') return;
      items.push({
        id: child.key,
        text: typeof value.text === 'string' ? value.text : '',
        username: typeof value.username === 'string' ? value.username : (value.kind === 'system' ? SYSTEM_USERNAME : DEFAULT_USERNAME),
        uid: typeof value.uid === 'string' ? value.uid : null,
        role: typeof value.role === 'string' ? value.role : null,
        createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
        kind: value.kind === 'system' ? 'system' : 'user',
        meta: value.meta && typeof value.meta === 'object' ? value.meta : null
      });
    });
    items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    lastMessages = items;
    notifyListeners(messageListeners, lastMessages.slice());
  }, (error) => {
    console.warn('Chat subscription failed', error);
  });
}

export function subscribeToChatMessages(callback) {
  if (typeof callback !== 'function') return () => {};
  ensureMessageSubscription();
  messageListeners.add(callback);
  callback(lastMessages.slice());
  return () => {
    messageListeners.delete(callback);
    if (messageListeners.size === 0 && messageUnsubscribe) {
      messageUnsubscribe();
      messageUnsubscribe = null;
      lastMessages = [];
    }
  };
}

export function subscribeToCurrentUser(callback) {
  if (typeof callback !== 'function') return () => {};
  userListeners.add(callback);
  callback(currentUser);
  return () => {
    userListeners.delete(callback);
  };
}

export function getCurrentUser() {
  return currentUser;
}

export async function sendChatMessage(rawText, options = {}) {
  const text = sanitizeText(rawText);
  if (!text) {
    return { success: false, reason: 'EMPTY' };
  }

  const user = options.user || currentUser;
  const timestamp = Date.now();
  const payload = {
    text,
    createdAt: timestamp,
    kind: options.kind === 'system' ? 'system' : 'user'
  };

  if (user) {
    payload.uid = user.uid;
    payload.username = user.username;
    payload.role = user.role;
  } else {
    payload.username = typeof options.fallbackName === 'string' && options.fallbackName.trim()
      ? options.fallbackName.trim()
      : DEFAULT_USERNAME;
  }

  if (options.meta && typeof options.meta === 'object') {
    payload.meta = options.meta;
  }

  const msgRef = push(ref(db, CHAT_MESSAGES_PATH));
  await set(msgRef, payload);
  return { success: true, id: msgRef.key };
}

export async function sendSystemMessage(rawText, meta) {
  const text = sanitizeText(rawText);
  if (!text) return { success: false, reason: 'EMPTY' };
  const timestamp = Date.now();
  const payload = {
    text,
    createdAt: timestamp,
    kind: 'system',
    system: true,
    username: SYSTEM_USERNAME,
    meta: meta && typeof meta === 'object' ? meta : null
  };
  const msgRef = push(ref(db, CHAT_MESSAGES_PATH));
  await set(msgRef, payload);
  return { success: true, id: msgRef.key };
}

export async function deleteAllChatMessages() {
  await remove(ref(db, CHAT_MESSAGES_PATH));
  lastMessages = [];
  notifyListeners(messageListeners, lastMessages.slice());
}

export function getCachedMessages() {
  return lastMessages;
}
