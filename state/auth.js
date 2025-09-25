export function attachAuthObserver({ auth, onAuthStateChanged }, handlers = {}) {
  const {
    beforeSwitch,
    onLogin,
    onLogout,
    onError
  } = handlers;

  if (typeof onAuthStateChanged !== 'function') {
    throw new Error('onAuthStateChanged function is required');
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      if (typeof beforeSwitch === 'function') {
        await beforeSwitch(firebaseUser);
      }
      if (!firebaseUser) {
        if (typeof onLogout === 'function') {
          await onLogout();
        }
        return;
      }
      if (typeof onLogin === 'function') {
        await onLogin(firebaseUser);
      }
    } catch (error) {
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.error('Authentication observer error', error);
      }
    }
  });
}
