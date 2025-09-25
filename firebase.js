import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
  push,
  remove,
  query,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiWYAFsDFivmWBoJzbziWN9jAZt9gME-U",
  authDomain: "gacha-870fa.firebaseapp.com",
  projectId: "gacha-870fa",
  storageBucket: "gacha-870fa.firebasestorage.app",
  messagingSenderId: "464289315548",
  appId: "1:464289315548:web:ed4d78970c7d4298b09219",
  databaseURL: "https://gacha-870fa-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const functions = getFunctions(app, 'asia-southeast1');

export {
  app,
  auth,
  db,
  functions,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  ref,
  get,
  set,
  update,
  onValue,
  push,
  remove,
  query,
  limitToLast,
  httpsCallable
};
