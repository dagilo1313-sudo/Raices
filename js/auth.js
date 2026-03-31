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
import { loadData, rellenarDiasVacios } from './habits.js';
import { renderAll } from './render.js';
import { showMsg, clearMsg } from './ui.js';

let authMode = 'login';

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (window._stopLoader) window._stopLoader();
    if (user) {
      state.currentUser = user;
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('profile-email').textContent = user.email;
      // Cargar datos ANTES de mostrar la app
      await loadData();
      await rellenarDiasVacios();
      // Solo ahora ocultamos loading y mostramos la app
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      renderAll();
    } else {
      state.currentUser = null;
      state.habits = [];
      state.allHabits = [];
      state.completions = {};
      state.perfil = { xpTotal: 0, nivel: 1, clase: 0 };
      document.getElementById('loading-screen').style.display = 'none';
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
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Entrar';
    const msgs = {
      'auth/user-not-found': 'No existe cuenta con ese email.',
      'auth/wrong-password': 'Contraseña incorrecta.',
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
  const ov = document.createElement('div');
  ov.id = 'change-password-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  ov.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:28px 24px;max-width:320px;width:100%;animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:18px;text-align:center">Cambiar contraseña</div>
      <div class="msg-error" id="cp-error" style="margin-bottom:8px"></div>
      <div class="msg-success" id="cp-success" style="margin-bottom:8px"></div>
      <input class="input-field" id="cp-current" type="password" placeholder="Contraseña actual">
      <input class="input-field" id="cp-new" type="password" placeholder="Nueva contraseña">
      <input class="input-field" id="cp-confirm" type="password" placeholder="Confirmar nueva contraseña">
      <button class="btn btn-primary" onclick="changePassword()" style="width:100%;margin-bottom:8px">Guardar</button>
      <button class="btn btn-secondary" onclick="hideChangePassword()" style="width:100%;margin-bottom:0">Cancelar</button>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>`;
  ov.addEventListener('click', e => { if (e.target === ov) hideChangePassword(); });
  window._lockScroll && window._lockScroll();
  document.body.appendChild(ov);
}

export function hideChangePassword() {
  const ov = document.getElementById('change-password-overlay');
  if (ov) ov.remove();
  window._unlockScroll && window._unlockScroll();
}

export async function changePassword() {
  const cur = document.getElementById('cp-current')?.value;
  const nw = document.getElementById('cp-new')?.value;
  const conf = document.getElementById('cp-confirm')?.value;
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
