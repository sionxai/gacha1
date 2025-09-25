export function initializeLegacyBridge({ getUserProfile, setUserProfile, announceRareDrop }) {
  if (typeof window === 'undefined') return;

  const bridge = window.__LEGACY_BRIDGE__ || {};
  Object.assign(bridge, {
    userProfile: () => (typeof getUserProfile === 'function' ? getUserProfile() : null),
    setUserProfile: (profile) => {
      if (typeof setUserProfile === 'function') {
        setUserProfile(profile || null);
      }
    },
    announceRareDrop: (payload) => {
      if (!payload || typeof announceRareDrop !== 'function') return;
      announceRareDrop(payload);
    }
  });
  window.__LEGACY_BRIDGE__ = bridge;
}
