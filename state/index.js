import {
  context,
  setCurrentFirebaseUser,
  setUserProfile,
  setProfileSaveTimer,
  setForgeEffectTimer
} from '../app-context.js';

export function getCurrentUser() {
  return context.currentFirebaseUser || null;
}

export function setCurrentUser(user) {
  setCurrentFirebaseUser(user || null);
}

export function getUserProfile() {
  return context.userProfile || null;
}

export function setUserProfileState(profile) {
  setUserProfile(profile || null);
}

export function getProfileSaveTimer() {
  return context.profileSaveTimer || null;
}

export function setProfileSaveTimerState(timer) {
  setProfileSaveTimer(timer || null);
}

export function getForgeEffectTimer() {
  return context.forgeEffectTimer || null;
}

export function setForgeEffectTimerState(timer) {
  setForgeEffectTimer(timer || null);
}
