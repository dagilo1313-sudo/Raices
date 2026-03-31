import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { state } from './state.js';
import { loadData } from './habits.js';
import { renderAll } from './render.js';
import { showMsg, clearMsg } from './ui.js';

let authMode = 'login';

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    document.getElementById('loading-screen').style.display = 'none';
    if (user) {
      state.currentUser = user;
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('profile-email').textContent = user.email;
      await loadData();
      renderAll();
    } else {
      state.currentUser = null;
      state.habits = [];
      state.completions = {};
      state.perfil = { xpTotal: 0, nivel: 1, clase: 0 };
      document.getElementById('app').style.display = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      const btn = document.getElementById('auth-btn');
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
  });
}

export function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('auth-title').textContent =
    authMode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta';
  document.getElementById('auth-btn').textContent =
    authMode === 'login' ? 'Entrar' : 'Registrarse';
  document.getElementById('auth-switch').innerHTML = authMode === 'login'
    ? '¿Sin cuenta? <span onclick="window.toggleAuthMode()">Regístrate</span>'
    : '¿Ya tienes cuenta? <span onclick="window.toggleAuthMode()">Entra</span>';
  clearMsg('auth-error');
  clearMsg('auth-success');
}

export async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('auth-btn');
  clearMsg('auth-error');
  clearMsg('auth-success');
  if (!email || !password) { showMsg('auth-error', 'Rellena todos los campos.'); return; }
  btn.disabled = true; btn.textContent = '...';
  try {
    if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
    else await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Entrar' : 'Registrarse';
    const msgs = {
      'auth/user-not-found': 'No existe cuenta con ese email.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/email-already-in-use': 'Ese email ya está registrado.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/invalid-email': 'Email no válido.',
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
    };
    showMsg('auth-error', msgs[e.code] || 'Error: ' + e.message);
  }
}

export function showForgotPassword() {
  document.getElementById('auth-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'block';
  document.getElementById('auth-title').textContent = 'Recuperar contraseña';
  clearMsg('auth-error'); clearMsg('auth-success');
}

export function showLoginForm() {
  document.getElementById('auth-form').style.display = 'block';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('auth-title').textContent = authMode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta';
}

export async function sendResetEmail() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg('auth-success', '✓ Email enviado. Revisa tu bandeja de entrada.');
  } catch { showMsg('auth-error', 'No encontramos ese email.'); }
}

export function showChangePassword() {
  document.getElementById('change-password-card').style.display = 'block';
}

export function hideChangePassword() {
  document.getElementById('change-password-card').style.display = 'none';
  ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => document.getElementById(id).value = '');
  clearMsg('cp-error'); clearMsg('cp-success');
}

export async function changePassword() {
  const cur = document.getElementById('cp-current').value;
  const nw = document.getElementById('cp-new').value;
  const conf = document.getElementById('cp-confirm').value;
  clearMsg('cp-error'); clearMsg('cp-success');
  if (!cur || !nw || !conf) { showMsg('cp-error', 'Rellena todos los campos.'); return; }
  if (nw !== conf) { showMsg('cp-error', 'Las contraseñas no coinciden.'); return; }
  if (nw.length < 6) { showMsg('cp-error', 'Mínimo 6 caracteres.'); return; }
  try {
    const credential = EmailAuthProvider.credential(state.currentUser.email, cur);
    await reauthenticateWithCredential(state.currentUser, credential);
    await updatePassword(state.currentUser, nw);
    showMsg('cp-success', '✓ Contraseña actualizada correctamente');
    setTimeout(() => hideChangePassword(), 2000);
  } catch (e) {
    const msgs = { 'auth/wrong-password': 'La contraseña actual es incorrecta.', 'auth/invalid-credential': 'La contraseña actual es incorrecta.' };
    showMsg('cp-error', msgs[e.code] || 'Error al cambiar contraseña.');
  }
}

export async function logout() { await signOut(auth); }
