export const state = {};
export const els = {};

export const context = {
  currentFirebaseUser: null,
  userProfile: null,
  profileSaveTimer: null,
  forgeEffectTimer: null
};

export const PROFILE_SAVE_DELAY = 1500;
export const PROFILE_SAVE_RETRY_DELAYS = [1000, 2000, 4000];
export const USERNAME_NAMESPACE = '@gacha.local';

export function initializeState(initialState) {
  if (!initialState || typeof initialState !== 'object') {
    throw new Error('initializeState requires an object');
  }
  Object.assign(state, initialState);
}

export function initializeElements(initialElements) {
  if (!initialElements || typeof initialElements !== 'object') {
    throw new Error('initializeElements requires an object');
  }
  Object.assign(els, initialElements);
}

export function addListener(target, type, handler) {
  if (!target || typeof target.addEventListener !== 'function') {
    return false;
  }
  target.addEventListener(type, handler);
  return true;
}

export function setInputValue(target, value) {
  if (!target) return;
  target.value = value;
}

export function setCheckboxState(target, checked) {
  if (!target) return;
  target.checked = !!checked;
}

export function setTextContent(target, value) {
  if (!target) return;
  target.textContent = value;
}

export function setCurrentFirebaseUser(user) {
  context.currentFirebaseUser = user || null;
}

export function setUserProfile(profile) {
  context.userProfile = profile || null;
}

export function setProfileSaveTimer(timer) {
  context.profileSaveTimer = timer || null;
}

export function setForgeEffectTimer(timer) {
  context.forgeEffectTimer = timer || null;
}
