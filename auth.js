import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  ref,
  get,
  set,
  update
} from './firebase.js';

const $ = (selector) => document.querySelector(selector);
const USERNAME_NAMESPACE = '@gacha.local';

const authMessageEl = $('#authMessage');

function setAuthMessage(message, tone) {
  if (!authMessageEl) return;
  authMessageEl.textContent = message || '';
  authMessageEl.classList.remove('ok', 'warn', 'error');
  if (tone) authMessageEl.classList.add(tone);
}

function normalizeUsername(raw) {
  return (raw || '').trim().toLowerCase();
}

function usernameToEmail(username) {
  if (!username) return '';
  if (username.includes('@')) return username;
  return `${username}${USERNAME_NAMESPACE}`;
}

async function usernameExists(username) {
  const snapshot = await get(ref(db, `usernameIndex/${username}`));
  return snapshot.exists();
}

async function saveUserProfile(uid, profile) {
  await set(ref(db, `users/${uid}`), profile);
  await set(ref(db, `usernameIndex/${profile.username}`), uid);
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');

  // 이미 인증된 사용자는 앱으로 이동
  if (auth.currentUser) {
    window.location.href = 'index.html';
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setAuthMessage('', null);
      const usernameInput = $('#loginUsername');
      const passwordInput = $('#loginPassword');
      const username = normalizeUsername(usernameInput?.value);
      const password = passwordInput?.value || '';

      if (!username || !password) {
        setAuthMessage('아이디와 비밀번호를 입력하세요.', 'warn');
        return;
      }

      try {
        const email = usernameToEmail(username);
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const user = credential.user;
        const profileRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(profileRef);
        if (!snapshot.exists()) {
          console.error('Profile missing for user login', user.uid);
          setAuthMessage('프로필 정보를 불러오지 못했습니다. 관리자에게 문의하세요.', 'error');
          await signOut(auth);
          return;
        }
        setAuthMessage('로그인 중...', 'ok');
        window.location.href = 'index.html';
      } catch (error) {
        switch (error.code) {
          case 'auth/user-not-found':
            setAuthMessage('존재하지 않는 아이디입니다.', 'error');
            break;
          case 'auth/wrong-password':
            setAuthMessage('비밀번호가 올바르지 않습니다.', 'error');
            break;
          case 'auth/too-many-requests':
            setAuthMessage('로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'error');
            break;
          default:
            console.error(error);
            setAuthMessage('로그인에 실패했습니다. 다시 시도해주세요.', 'error');
            break;
        }
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setAuthMessage('', null);
      const usernameInput = $('#signupUsername');
      const passwordInput = $('#signupPassword');
      const confirmInput = $('#signupPasswordConfirm');
      const username = normalizeUsername(usernameInput?.value);
      const password = passwordInput?.value || '';
      const confirmPassword = confirmInput?.value || '';

      if (!username || !password || !confirmPassword) {
        setAuthMessage('모든 필드를 입력하세요.', 'warn');
        return;
      }
      if (password.length < 6) {
        setAuthMessage('비밀번호는 6자 이상이어야 합니다.', 'warn');
        return;
      }
      if (password !== confirmPassword) {
        setAuthMessage('비밀번호가 일치하지 않습니다.', 'error');
        return;
      }

      try {
        if (await usernameExists(username)) {
          setAuthMessage('이미 존재하는 아이디입니다.', 'error');
          return;
        }
        const email = usernameToEmail(username);
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const user = credential.user;
        const profile = {
          username,
          role: username === 'admin' ? 'admin' : 'user',
          wallet: username === 'admin' ? null : 1000,
          gold: username === 'admin' ? null : 10000,
          diamonds: username === 'admin' ? null : 0,
          config: null,
          globalStats: null,
          equip: null,
          spares: null,
          items: null,
          enhance: null,
          presets: null,
          selectedPreset: null,
          createdAt: Date.now()
        };
        await saveUserProfile(user.uid, profile);
        setAuthMessage('가입 완료! 로그인 페이지로 이동합니다.', 'ok');
        await signOut(auth);
        setTimeout(() => { window.location.href = 'login.html'; }, 800);
      } catch (error) {
        console.error(error);
        switch (error.code) {
          case 'auth/email-already-in-use':
            setAuthMessage('이미 존재하는 아이디입니다.', 'error');
            break;
          case 'auth/weak-password':
            setAuthMessage('비밀번호가 너무 약합니다.', 'error');
            break;
          default:
            setAuthMessage('회원가입에 실패했습니다. 다시 시도해주세요.', 'error');
            break;
        }
      }
    });
  }
});
