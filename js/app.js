// ── Scroll lock para popups ──
function lockScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}
function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}
window._lockScroll   = lockScroll;
window._unlockScroll = unlockScroll;

import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions, resetAllData, resetProgress, createTarea, toggleTarea, borrarTareasCompletadas, getCompletadosForDate, loadAllCompletions, loadMonthCompletions, rellenarDiasVacios, loadMonthsForDate, saveDebugDate, clearDebugDate } from './habits.js';
import { renderAll, renderHabitsList, renderTareas, renderHistorico, renderStats, renderRangosPanel, renderHabitToggle, renderProgress, renderViajero, renderXPBar, renderWeek } from './render.js';
import { showToast, showConfetti, showXPFloat, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectNoIcon, selectCategory, selectXP, toggleDay, selectAllDays, openIconPicker, closeIconPicker, confirmIconPicker, clearIconPicker } from './modal.js';
import { state, getCompletionMessage, today, CLASES, isScheduledForDate } from './state.js';
import { descargarBackup, onBackupFileSelected, confirmarRestaurar } from './resumen.js';

// ── Exponer funciones al HTML ──
window.toggleAuthMode     = toggleAuthMode;
window.handleAuth         = handleAuth;
window.showForgotPassword = showForgotPassword;
window.showLoginForm      = showLoginForm;
window.sendResetEmail     = sendResetEmail;
window.showChangePassword = showChangePassword;
window.hideChangePassword = hideChangePassword;
window.changePassword     = changePassword;
window.logout                = logout;
window.descargarBackup       = descargarBackup;
window.onBackupFileSelected  = onBackupFileSelected;
window.confirmarRestaurar    = confirmarRestaurar;
window.confirmarRestaurarPopup = window.confirmarRestaurarPopup || (() => {});

window.openCreateModal    = openCreateModal;
window.closeModal         = closeModal;
window.closeModalOutside  = closeModalOutside;
window.submitModal        = submitModal;
window.onSelectEmoji      = selectEmoji;
window.onSelectNoIcon     = selectNoIcon;
window.openIconPicker     = openIconPicker;
window.closeIconPicker    = closeIconPicker;
window.confirmIconPicker  = confirmIconPicker;
window.clearIconPicker    = clearIconPicker;
window.onSelectCategory   = selectCategory;
window.onSelectXP         = selectXP;
window.onToggleDay        = toggleDay;
window.onSelectAllDays    = selectAllDays;

window.switchView = (view) => {
  switchView(view);
  renderAll();
  if (view === 'perfil') {
    const display = document.getElementById('perfil-nombre-display');
    if (display) display.textContent = state.perfil.nombre || '—';
  }
  if (view === 'historico') renderHistorico();
  if (view === 'stats') {
    // Forzar recálculo completo cada vez que se abre Stats
    state.statsLoaded = false;
    renderStats();
  }
};
window.setFilter  = (filter) => {
  state.activeFilter = filter;
  renderAll();
  // Flash glow on the newly active tab with its category color
  const tabs = document.getElementById('cat-tabs');
  if (tabs) {
    const activeTab = tabs.querySelector('.cat-tab[class*="active-"]');
    if (activeTab) {
      // Resolve the tab's color for the glow
      const tabColor = getComputedStyle(activeTab).color;
      const rgbaColor = tabColor.replace('rgb(', 'rgba(').replace(')', ',0.5)');
      activeTab.animate([
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.8)' },
        { filter: 'brightness(1)' }
      ], { duration: 350, easing: 'ease-out' });
    }
  }
};

// ── Toggle hábito con notificación de subida ──

// ── Log de errores en Firestore ──
async function logError(context, error) {
  try {
    const { db } = await import('./firebase.js');
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const uid = state.currentUser?.uid;
    if (!uid) return;
    await addDoc(collection(db, 'users', uid, 'errors'), {
      context,
      message: error?.message || String(error),
      stack: error?.stack || null,
      timestamp: new Date().toISOString(),
      debugDate: state.debugDate || null,
    });
  } catch(e) { /* silencioso */ }
}
window.onToggleHabit = (id) => {
  // 1. Actualizar estado en memoria inmediatamente
  const todayStr = today();
  const completadosAntes = getCompletadosForDate(todayStr);
  const eraCompletado = completadosAntes.includes(id);

  toggleHabit(id).then(async result => {
    if (result.xpGanado > 0) {
      const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
      const completedToday = getCompletadosForDate(todayStr);
      const diaPerfecto = scheduled.length > 0 && scheduled.every(h => completedToday.includes(h.id));
      const nuevoBueno = result.despues && result.despues.esBueno && result.antes && !result.antes.esBueno && !diaPerfecto;

      
      const perfectHue = 270;

      if (diaPerfecto && result.subioNivel) {
        showConfetti(perfectHue);
        showDiaPerfectoNotif(() => {
          const claseData = CLASES[result.calcDespues.clase];
          showLevelUpNotif(result.subioRango ? '¡Nuevo rango desbloqueado!' : `¡Subiste al nivel ${result.calcDespues.nivel}!`, `${claseData.emoji} ${claseData.nombre}`, `+${result.xpGanado} XP · Sigue así, viajero.`, claseData.color);
        });
      } else if (diaPerfecto) {
        showConfetti(perfectHue); showDiaPerfectoNotif(null);
      } else if (nuevoBueno) {
        showConfetti(44); showDiaBuenoNotif();
      } else if (result.subioRango) {
        showConfetti();
        const claseData = CLASES[result.calcDespues.clase];
        showLevelUpNotif('¡Nuevo rango desbloqueado!', `${claseData.emoji} ${claseData.nombre}`, `Has alcanzado el rango ${claseData.nombre}. ¡Increíble!`, claseData.color);
      } else if (result.subioNivel) {
        showConfetti();
        const claseData = CLASES[result.calcDespues.clase];
        showLevelUpNotif(`¡Subiste al nivel ${result.calcDespues.nivel}!`, `${claseData.emoji} ${claseData.nombre}`, `+${result.xpGanado} XP · Sigue así, viajero.`, claseData.color);
      }
    }
  }).catch(err => logError('toggleHabit:' + id, err));

  // 2. Actualizar solo la card tocada — sin regenerar la lista
  const ahoraCompletado = !eraCompletado;
  renderHabitToggle(id, ahoraCompletado);

  // 4. Actualizar contadores (progreso, viajero, XP bar, week strip) — sin tocar la lista
  renderProgress();
  renderViajero();
  renderXPBar();
  renderWeek();

  // 5. Guardar en Firestore en background
  saveCompletions().catch(err => logError('saveCompletions', err));
};

function showDiaPerfectoNotif(onClose) {
  
  const borderColor = '#7b4fcf';
  const shadowColor = 'rgba(123,79,207,0.2)';
  const btnBg = 'rgba(123,79,207,0.15)';
  const btnColor = '#7b4fcf';
  const emoji = '⚔';
  const el = document.createElement('div');
  el.id = 'dia-perfecto-notif';
  el.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
  el.innerHTML = `
    <div style="background:var(--card2);border:1.5px solid ${borderColor};border-radius:20px;padding:28px 24px;text-align:center;max-width:300px;width:100%;animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 0 32px ${shadowColor}">
      <div style="font-size:40px;margin-bottom:10px">${emoji}</div>
      <div style="font-size:25px;color:${btnColor};margin-bottom:6px;font-weight:700">¡Día perfecto!</div>
      <div style="font-size:16px;color:var(--muted);margin-bottom:20px;line-height:1.5">Has completado todos tus hábitos de hoy. ¡Tus raíces crecen profundo!</div>
      <button id="btn-dia-perfecto-ok" style="background:${btnBg};color:${btnColor};border:1.5px solid ${borderColor};border-radius:var(--radius-full);padding:10px 28px;font-size:17px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:background 0.2s">¡Genial!</button>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
  el.querySelector('#btn-dia-perfecto-ok').addEventListener('click', () => {
    el.remove();
    if (onClose) onClose();
  });
  el.addEventListener('click', e => { if (e.target === el) { el.remove(); if (onClose) onClose(); } });
  document.body.appendChild(el);
}

function showDiaBuenoNotif() {
  const el = document.createElement('div');
  el.id = 'dia-bueno-notif';
  el.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
  el.innerHTML = `
    <div style="background:var(--card2);border:1.5px solid var(--accent);border-radius:20px;padding:28px 24px;text-align:center;max-width:300px;width:100%;animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 0 32px rgba(143,179,57,0.12)">
      <div style="font-size:40px;margin-bottom:10px">🌿</div>
      <div style="font-size:25px;color:var(--accent);margin-bottom:6px;font-weight:700">¡Día bueno!</div>
      <div style="font-size:16px;color:var(--muted);margin-bottom:20px;line-height:1.5">Has superado el 80% de eficiencia XP hoy. ¡Buen trabajo, viajero!</div>
      <button id="btn-dia-bueno-ok" style="background:rgba(143,179,57,0.15);color:var(--accent);border:1.5px solid var(--accent);border-radius:var(--radius-full);padding:10px 28px;font-size:17px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:background 0.2s">¡Sigue así!</button>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
  el.querySelector('#btn-dia-bueno-ok').addEventListener('click', () => el.remove());
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}

function showLevelUpNotif(titulo, subtitulo, desc, color) {
  const existing = document.getElementById('levelup-notif');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'levelup-notif';
  el.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
  el.innerHTML = `
    <div style="background:var(--card2);border:1px solid ${color};border-radius:20px;padding:32px 24px;text-align:center;max-width:320px;width:100%;animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 0 40px ${color}33">
      <div style="font-size:48px;margin-bottom:12px">${subtitulo.split(' ')[0]}</div>
      <div style="font-size:22px;color:${color};margin-bottom:8px;font-weight:700">${titulo}</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:6px;font-weight:600">${subtitulo}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:28px;line-height:1.5">${desc}</div>
      <button onclick="document.getElementById('levelup-notif').remove()" style="background:${color};color:#fff;border:none;border-radius:var(--radius-full);padding:12px 32px;font-size:14px;font-weight:700;font-family:var(--font-body);cursor:pointer">¡A seguir!</button>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}

window.onEditHabit = (id) => openEditModal(id);

window.onDeleteHabit = (id) => {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  overlay.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:28px 24px;max-width:320px;width:100%;text-align:center;animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-size:32px;margin-bottom:12px">🍂</div>
      <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px">¿Eliminar hábito?</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.5">
        Vas a archivar <strong style="color:var(--text)">"${habit.name}"</strong>.<br>El historial se conservará.
      </div>
      <div style="display:flex;gap:8px">
        <button id="btn-cancel-del" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;font-size:13px;color:var(--muted);font-family:var(--font-body);cursor:pointer">Cancelar</button>
        <button id="btn-confirm-del" style="flex:1;background:rgba(179,92,79,0.15);border:1.5px solid rgba(179,92,79,0.5);border-radius:var(--radius-md);padding:12px;font-size:13px;font-weight:700;color:#b35c4f;font-family:var(--font-body);cursor:pointer">Eliminar</button>
      </div>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
  const close = () => { overlay.remove(); unlockScroll(); };
  lockScroll();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#btn-cancel-del').addEventListener('click', close);
  overlay.querySelector('#btn-confirm-del').addEventListener('click', async () => {
    close();
    await deleteHabit(id);
    renderAll();
    showToast('Hábito eliminado 🍂');
  });
  document.body.appendChild(overlay);
};

// ── Toggle colapso de rangos ──
window.toggleRango = (headerEl) => {
  const body = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('.rango-chevron');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
};

// ── Panel de rangos — se abre desde el badge de nivel ──
window.openRangosPanel = () => {
  renderRangosPanel();
  document.getElementById('rangos-overlay').classList.add('open');
};
window.closeRangosPanel = () => {
  document.getElementById('rangos-overlay').classList.remove('open');
};

// ── Calendario ──
window.selectDate = (dateStr) => {
  state.selectedDate = dateStr;
  renderHistorico();
  // Flash the selected day cell
  const grid = document.getElementById('cal-grid');
  if (grid) {
    const selected = grid.querySelector('.cal-day.cal-selected .cal-day-inner');
    if (selected) {
      const isGolden = selected.closest('.cal-day')?.classList.contains('cal-golden');
      const isGreen = selected.closest('.cal-day')?.classList.contains('cal-green');
      const glowColor = isGolden ? 'rgba(196,168,79,0.5)' : isGreen ? 'rgba(143,179,57,0.5)' : 'rgba(143,179,57,0.3)';
      selected.animate([
        { filter: 'brightness(1)', boxShadow: 'none' },
        { filter: 'brightness(1.8)', boxShadow: `0 0 12px ${glowColor}` },
        { filter: 'brightness(1)', boxShadow: 'none' }
      ], { duration: 400, easing: 'ease-out' });
    }
  }
};
window.calPrevMonth = async () => {
  const base = state.selectedDate || today();
  const d = new Date(base + 'T12:00:00');
  d.setMonth(d.getMonth() - 1);
  state.selectedDate = d.toISOString().split('T')[0];
  const monthKey = state.selectedDate.substring(0, 7);
  const { loadMonthCompletions } = await import('./habits.js');
  await loadMonthCompletions(monthKey);
  renderHistorico();
};
window.calNextMonth = async () => {
  const base = state.selectedDate || today();
  const d = new Date(base + 'T12:00:00');
  d.setMonth(d.getMonth() + 1);
  if (d <= new Date(today() + 'T12:00:00')) {
    state.selectedDate = d.toISOString().split('T')[0];
    const monthKey = state.selectedDate.substring(0, 7);
    const { loadMonthCompletions } = await import('./habits.js');
    await loadMonthCompletions(monthKey);
    renderHistorico();
  }
};
window.calGoToday = () => { state.selectedDate = null; renderHistorico(); };

// ── Reset solo progreso ──
function showConfirmPopup({ title, desc, btnLabel, btnClass, keyword, onConfirm }) {
  const kw = keyword || 'Confirmar';
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  ov.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:28px 24px;max-width:320px;width:100%;text-align:center;animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px">${title}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px;line-height:1.5">${desc}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Para continuar escribe <em style="color:var(--text)">"${kw}"</em></div>
      <input id="popup-confirm-input" class="input-field" placeholder="${kw}" style="margin-bottom:14px;text-align:center">
      <div style="display:flex;gap:8px">
        <button id="popup-cancel-btn" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;font-size:13px;color:var(--muted);font-family:var(--font-body);cursor:pointer">Cancelar</button>
        <button id="popup-ok-btn" class="${btnClass}" style="flex:1;border-radius:var(--radius-md);padding:10px;font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer">${btnLabel}</button>
      </div>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
  ov.querySelector('#popup-cancel-btn').onclick = () => { ov.remove(); unlockScroll(); };
  ov.querySelector('#popup-ok-btn').onclick = async () => {
    const val = ov.querySelector('#popup-confirm-input').value.trim();
    if (val !== kw) { showToast(`Escribe "${kw}" exactamente`); return; }
    const btn = ov.querySelector('#popup-ok-btn');
    btn.disabled = true; btn.textContent = '...';
    await onConfirm();
    ov.remove(); unlockScroll();
  };
  ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); unlockScroll(); } });
  lockScroll();
  document.body.appendChild(ov);
  setTimeout(() => ov.querySelector('#popup-confirm-input').focus(), 100);
}


function showReloadPopup(emoji, title, msg) {
  lockScroll();
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px';
  popup.innerHTML = `
    <div style="background:var(--card2);border:1px solid rgba(229,92,92,0.3);border-radius:16px;padding:28px 24px;max-width:320px;width:100%;text-align:center">
      <div style="font-size:28px;margin-bottom:12px">${emoji}</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px">${title}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5">${msg}</div>
      <button onclick="this.closest('div[style]').remove(); window._unlockScroll && window._unlockScroll(); window.location.reload();" style="width:100%;background:rgba(229,92,92,0.12);border:1.5px solid rgba(229,92,92,0.4);border-radius:var(--radius-md);padding:12px;font-size:14px;font-weight:700;color:#e05c5c;font-family:var(--font-body);cursor:pointer">
        Pulsa para recargar ↻
      </button>
    </div>`;
  document.body.appendChild(popup);
}

// ── Confirmación con contraseña para acciones destructivas ──
function showPasswordConfirm({ title, desc, onConfirm }) {
  lockScroll();
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:24px';
  ov.innerHTML = `
    <div style="background:var(--card2);border:1px solid rgba(229,92,92,0.3);border-radius:20px;padding:28px 24px;max-width:320px;width:100%;text-align:center">
      <div style="font-size:22px;margin-bottom:12px">⚠️</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px">${title}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5">${desc}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;text-align:left">Introduce tu contraseña para confirmar</div>
      <input id="pwd-confirm-input" type="password" class="input-field" placeholder="Contraseña" style="margin-bottom:16px">
      <div id="pwd-confirm-error" style="font-size:12px;color:#e05c5c;margin-bottom:10px;display:none">Contraseña incorrecta</div>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('pwd-confirm-overlay').remove();unlockScroll();" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;font-size:13px;color:var(--muted);font-family:var(--font-body);cursor:pointer">Cancelar</button>
        <button id="pwd-confirm-ok" style="flex:1;background:rgba(229,92,92,0.15);border:1.5px solid rgba(229,92,92,0.4);border-radius:var(--radius-md);padding:10px;font-size:13px;font-weight:700;color:#e05c5c;font-family:var(--font-body);cursor:pointer">Confirmar</button>
      </div>
    </div>`;
  ov.id = 'pwd-confirm-overlay';
  document.body.appendChild(ov);

  const input = document.getElementById('pwd-confirm-input');
  const errEl = document.getElementById('pwd-confirm-error');
  const okBtn = document.getElementById('pwd-confirm-ok');

  input.focus();

  const verify = async () => {
    const pwd = input.value;
    if (!pwd) { errEl.style.display = 'block'; errEl.textContent = 'Introduce tu contraseña'; return; }
    okBtn.textContent = '...';
    okBtn.disabled = true;
    try {
      const { getAuth, EmailAuthProvider, reauthenticateWithCredential } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const user = getAuth().currentUser;
      const cred = EmailAuthProvider.credential(user.email, pwd);
      await reauthenticateWithCredential(user, cred);
      ov.remove();
      unlockScroll();
      onConfirm();
    } catch(e) {
      errEl.style.display = 'block';
      errEl.textContent = 'Contraseña incorrecta';
      okBtn.textContent = 'Confirmar';
      okBtn.disabled = false;
      input.value = '';
      input.focus();
    }
  };

  okBtn.addEventListener('click', verify);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
}

window.showResetProgressConfirm = () => showPasswordConfirm({
  title: 'Reiniciar progreso',
  desc: 'Se borrará tu XP, nivel y días perfectos. Los hábitos se conservan.',
  btnLabel: 'Borrar progreso',
  btnClass: 'btn btn-danger',
  keyword: 'reiniciar progreso',
  onConfirm: async () => { await resetProgress(); showReloadPopup('🍂', 'Progreso eliminado', 'Los datos de progreso han sido reiniciados.'); }
});

window.showResetConfirm1 = () => showConfirmPopup({
  title: 'Reiniciar todo',
  desc: 'Se borrarán todos tus hábitos y progreso de forma permanente. Esta acción es irreversible.',
  btnLabel: 'Sí, borrar todo',
  btnClass: 'btn btn-danger',
  keyword: 'reiniciar todo',
  onConfirm: async () => { await resetAllData(); showReloadPopup('🍂', 'Todo eliminado', 'Todos los datos han sido borrados permanentemente.'); }
});

// ── Restaurar backup con popup igual que resets ──
window.confirmarRestaurarPopup = () => showConfirmPopup({
  title: 'Restaurar backup',
  desc: 'Se sobreescribirán TODOS tus datos actuales (hábitos, progreso y registros). Esta acción es irreversible.',
  btnLabel: 'Restaurar',
  btnClass: 'btn btn-primary',
  keyword: 'restaurar backup',
  onConfirm: async () => { await confirmarRestaurar(); }
});


// ── Cambiar nombre (popup igual que cambiar contraseña) ──
window.showChangeNombre = () => {
  const ov = document.createElement('div');
  ov.id = 'change-nombre-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  const current = state.perfil.nombre || '';
  ov.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:28px 24px;max-width:320px;width:100%;animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:18px;text-align:center">Cambiar nombre</div>
      <div class="msg-error" id="cn-error" style="margin-bottom:8px;display:none"></div>
      <div class="msg-success" id="cn-success" style="margin-bottom:8px;display:none"></div>
      <input class="input-field" id="cn-input" type="text" placeholder="Tu nombre" value="${current}" maxlength="30">
      <button class="btn btn-primary" onclick="guardarNombrePopup()" style="width:100%;margin-bottom:8px">Guardar</button>
      <button class="btn btn-secondary" onclick="document.getElementById('change-nombre-overlay').remove(); window._unlockScroll && window._unlockScroll()" style="width:100%;margin-bottom:0">Cancelar</button>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>`;
  ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); unlockScroll(); } });
  lockScroll();
  document.body.appendChild(ov);
  setTimeout(() => { const i = document.getElementById('cn-input'); if(i){i.focus();i.select();} }, 100);
};

window.guardarNombrePopup = async () => {
  const input = document.getElementById('cn-input');
  const errEl = document.getElementById('cn-error');
  const okEl  = document.getElementById('cn-success');
  const nombre = input?.value?.trim();
  if (!nombre) { if(errEl){errEl.textContent='Escribe un nombre.';errEl.style.display='block';} return; }
  if(errEl) errEl.style.display='none';
  try {
    await guardarNombrePerfil(nombre);
    const display = document.getElementById('perfil-nombre-display');
    if (display) display.textContent = nombre;
    if(okEl){okEl.textContent='Nombre actualizado ✓';okEl.style.display='block';}
    setTimeout(() => { document.getElementById('change-nombre-overlay')?.remove(); window._unlockScroll && window._unlockScroll(); }, 1200);
  } catch(e) {
    if(errEl){errEl.textContent='Error al guardar.';errEl.style.display='block';}
  }
};
// ── Tareas ──
window.onToggleTareas = () => {
  const panel = document.getElementById('tareas-panel');
  const chevron = document.getElementById('tareas-chevron');
  const toggle = document.getElementById('tareas-toggle');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  if (toggle) toggle.classList.toggle('open', !isOpen);

  // Flash glow on open with correct color
  if (!isOpen) {
    const glowRgba = toggle.dataset.glowColor || 'rgba(196,168,79,0.3)';
    // Flash toggle
    if (toggle) {
      toggle.animate([
        { boxShadow: '0 0 0 transparent' },
        { boxShadow: `0 0 16px ${glowRgba}` },
        { boxShadow: '0 0 0 transparent' }
      ], { duration: 400, easing: 'ease-out' });
    }
    // Flash panel
    if (panel) {
      panel.animate([
        { boxShadow: '0 0 0 transparent' },
        { boxShadow: `0 0 16px ${glowRgba}` },
        { boxShadow: '0 0 0 transparent' }
      ], { duration: 500, easing: 'ease-out' });
    }
    // Flash title
    const title = document.getElementById('tareas-titulo');
    if (title) {
      title.animate([
        { textShadow: 'none' },
        { textShadow: `0 0 12px ${glowRgba}` },
        { textShadow: 'none' }
      ], { duration: 400, easing: 'ease-out' });
    }
  }
};

window.onToggleTarea = async (id) => {
  await toggleTarea(id);
  renderTareas();
  // Flash the counter badge
  const counter = document.getElementById('tareas-count');
  if (counter) {
    counter.animate([
      { filter: 'brightness(1)', boxShadow: 'none' },
      { filter: 'brightness(1.6)', boxShadow: '0 0 10px rgba(143,179,57,0.4)' },
      { filter: 'brightness(1)', boxShadow: 'none' }
    ], { duration: 400, easing: 'ease-out' });
  }
};

window.onAddTarea = () => {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  overlay.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:28px 24px;max-width:320px;width:100%;animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:18px;text-align:center">Nueva tarea</div>
      <input class="input-field" id="nueva-tarea-input" placeholder="Nombre de la tarea..." maxlength="80" style="margin-bottom:12px">
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button id="btn-normal" onclick="setUrgencia(false)" style="flex:1;padding:10px;border-radius:var(--radius-md);border:1px solid rgba(143,179,57,0.3);background:var(--glow);color:var(--accent);font-family:var(--font-body);font-size:13px;cursor:pointer;font-weight:600">Normal</button>
        <button id="btn-urgente" onclick="setUrgencia(true)" style="flex:1;padding:10px;border-radius:var(--radius-md);border:1px solid rgba(179,92,79,0.3);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:13px;cursor:pointer">Urgente</button>
      </div>
      <div style="display:flex;gap:8px">
        <button id="btn-cancel-tarea" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;font-size:13px;color:var(--muted);font-family:var(--font-body);cursor:pointer">Cancelar</button>
        <button onclick="submitTarea()" style="flex:1;background:rgba(143,179,57,0.15);color:var(--accent);border:1px solid rgba(143,179,57,0.4);border-radius:var(--radius-md);padding:10px;font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer">Añadir</button>
      </div>
      <style>@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}</style>
    </div>`;
  overlay.dataset.overlay = '1';
  lockScroll();
  overlay.querySelector('#btn-cancel-tarea').onclick = () => { overlay.remove(); unlockScroll(); };
  let esUrgente = false;
  window.setUrgencia = (u) => {
    esUrgente = u;
    document.getElementById('btn-normal').style.cssText = `flex:1;padding:10px;border-radius:var(--radius-md);border:1px solid ${u?'var(--border)':'rgba(143,179,57,0.3)'};background:${u?'transparent':'var(--glow)'};color:${u?'var(--muted)':'var(--accent)'};font-family:var(--font-body);font-size:13px;cursor:pointer;font-weight:${u?'400':'600'}`;
    document.getElementById('btn-urgente').style.cssText = `flex:1;padding:10px;border-radius:var(--radius-md);border:1px solid ${u?'rgba(179,92,79,0.5)':'rgba(179,92,79,0.3)'};background:${u?'rgba(179,92,79,0.1)':'transparent'};color:${u?'#b35c4f':'var(--muted)'};font-family:var(--font-body);font-size:13px;cursor:pointer;font-weight:${u?'600':'400'}`;
  };
  window.submitTarea = async () => {
    const nombre = document.getElementById('nueva-tarea-input').value.trim();
    if (!nombre) return;
    await createTarea(nombre, esUrgente);
    overlay.remove(); unlockScroll();
    // Asegurar panel abierto
    const panel = document.getElementById('tareas-panel');
    if (panel && panel.style.display === 'none') window.onToggleTareas();
    renderTareas();
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); unlockScroll(); } });
  // Enter para confirmar
  overlay.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Enter') window.submitTarea(); });
  document.body.appendChild(overlay);
  setTimeout(() => overlay.querySelector('input').focus(), 100);
};

window.onBorrarCompletadas = () => {
  const completadas = state.tareas.filter(t => t.done).length;
  if (!completadas) { showToast('No hay tareas completadas'); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  overlay.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:300px;width:100%;text-align:center">
      <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px">¿Borrar completadas?</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5">Se eliminarán ${completadas} tarea${completadas>1?'s':''} completada${completadas>1?'s':''}. Las pendientes se conservan.</div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[data-overlay]').remove(); window._unlockScroll && window._unlockScroll()" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;font-size:13px;color:var(--muted);font-family:var(--font-body);cursor:pointer">Cancelar</button>
        <button id="btn-ok-borrar" style="flex:1;background:rgba(179,92,79,0.15);border:1px solid rgba(179,92,79,0.4);border-radius:var(--radius-md);padding:10px;font-size:13px;font-weight:600;color:#b35c4f;font-family:var(--font-body);cursor:pointer">Borrar</button>
      </div>
    </div>`;
  overlay.dataset.overlay = '1';
  overlay.querySelector('#btn-ok-borrar').addEventListener('click', async () => {
    await borrarTareasCompletadas();
    overlay.remove(); unlockScroll();
    renderTareas();
    showToast('Tareas eliminadas 🍂');
  });
  lockScroll();
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); unlockScroll(); } });
  document.body.appendChild(overlay);
};

// ── Nombre perfil ──
window.guardarNombrePerfil = async (nombreParam) => {
  const nombre = nombreParam || document.getElementById('perfil-nombre-input')?.value.trim();
  if (!nombre) return;
  state.perfil.nombre = nombre;
  const { db } = await import('./firebase.js');
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  await updateDoc(doc(db, 'users', state.currentUser.uid, 'profile', 'data'), { nombre });
  renderAll();
};

// ── Modo testing ──
window.onToggleDebug = async () => {
  const toggle = document.getElementById('debug-toggle');
  const wrap = document.getElementById('debug-date-wrap');
  const isOn = toggle.classList.contains('on');

  if (isOn) {
    // Desactivar — borrar de Firestore y mostrar popup
    toggle.classList.remove('on');
    wrap.style.display = 'none';
    document.getElementById('debug-active-banner').style.display = 'none';
    document.getElementById('debug-date-input').value = '';
    await clearDebugDate();
    state.debugDate = null;
    // Popup de desactivación
    lockScroll();
    const realDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px';
    popup.innerHTML = `
      <div style="background:var(--card2);border:1px solid rgba(143,179,57,0.3);border-radius:16px;padding:28px 24px;max-width:320px;width:100%;text-align:center">
        <div style="font-size:28px;margin-bottom:12px">✅</div>
        <div style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:8px">Debugger desactivado</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Volvemos a la fecha actual</div>
        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:20px">${realDate}</div>
        <button onclick="this.closest('div[style]').remove(); window._unlockScroll && window._unlockScroll(); window.location.reload();" style="width:100%;background:rgba(143,179,57,0.15);border:1.5px solid rgba(143,179,57,0.4);border-radius:var(--radius-md);padding:12px;font-size:14px;font-weight:700;color:var(--accent);font-family:var(--font-body);cursor:pointer">
          Pulsa para recargar ↻
        </button>
      </div>`;
    document.body.appendChild(popup);
    return;
  } else {
    // Activar — mostrar selector sin fecha por defecto
    toggle.classList.add('on');
    wrap.style.display = 'block';
    document.getElementById('debug-date-input').value = '';
  }
};

window.onConfirmDebugDate = () => {
  const val = document.getElementById('debug-date-input').value;
  if (!val) { showToast('Selecciona una fecha primero'); return; }
  window.onDebugDateChange(val);
};

window.onDebugDateChange = async (dateStr) => {
  if (!dateStr) return;
  state.debugDate = dateStr;

  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Mostrar loader en el debug-card
  const debugCard = document.getElementById('debug-card');
  let loaderEl = document.getElementById('debug-fill-loader');
  if (!loaderEl) {
    loaderEl = document.createElement('div');
    loaderEl.id = 'debug-fill-loader';
    loaderEl.style.cssText = 'margin-top:12px;padding:12px 14px;background:rgba(143,179,57,0.08);border:1px solid rgba(143,179,57,0.2);border-radius:var(--radius-md);font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px';
    debugCard?.appendChild(loaderEl);
  }

  const setMsg = (msg) => {
    if (loaderEl) loaderEl.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;border:2px solid rgba(143,179,57,0.3);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0"></div><span>' + msg + '</span></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
  };
  const setSuccess = (msg) => {
    if (loaderEl) loaderEl.innerHTML = '<div style="color:var(--accent);font-size:12px">✓ ' + msg + '</div>';
    setTimeout(() => { if (loaderEl) { loaderEl.remove(); loaderEl = null; } }, 2500);
  };

  setMsg('Cargando meses...');

  // Cargar los 2 meses alrededor de la fecha de debug
  await loadMonthsForDate(dateStr);

  setMsg('Rellenando días vacíos...');

  // Guardar fecha debug en Firestore
  await saveDebugDate(dateStr);

  // Rellenar días vacíos hasta la fecha de debug
  await rellenarDiasVacios();

  // Banners
  document.getElementById('debug-active-banner').style.display = 'block';
  document.getElementById('debug-date-label').textContent = label;
  document.getElementById('debug-banner').style.display = 'block';
  document.getElementById('debug-banner-date').textContent = label;

  // Quitar loader
  if (loaderEl) loaderEl.remove();

  renderAll();

  // Popup de confirmación — sin opción de cancelar, fondo bloqueado
  lockScroll();
  const popup = document.createElement('div');
  popup.id = 'debug-done-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px';
  popup.innerHTML = `
    <div style="background:var(--card2);border:1px solid rgba(196,168,79,0.35);border-radius:16px;padding:28px 24px;max-width:320px;width:100%;text-align:center">
      <div style="font-size:28px;margin-bottom:12px">🧪</div>
      <div style="font-size:16px;font-weight:700;color:var(--accent2);margin-bottom:8px">Modo testing activo</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:6px">Ahora estamos en</div>
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:16px">${label}</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:20px;padding:10px 12px;background:rgba(143,179,57,0.06);border-radius:8px;border:1px solid rgba(143,179,57,0.12)">
        Se han rellenado los días vacíos entre el último día registrado y esta fecha con hábitos sin completar.
      </div>
      <button onclick="document.getElementById('debug-done-popup').remove(); window._unlockScroll && window._unlockScroll(); window.location.reload();" style="width:100%;background:rgba(196,168,79,0.15);border:1.5px solid rgba(196,168,79,0.5);border-radius:var(--radius-md);padding:12px;font-size:14px;font-weight:700;color:var(--accent2);font-family:var(--font-body);cursor:pointer">
        Pulsa para recargar ↻
      </button>
    </div>`;
  document.body.appendChild(popup);
};


// ── Indicador de conexión ──
function updateOfflineIndicator() {
  const el = document.getElementById('conn-indicator');
  if (!el) return;
  el.style.background = navigator.onLine ? '#8fb339' : '#e05c5c';
}
window.addEventListener('online',  updateOfflineIndicator);
window.addEventListener('offline', updateOfflineIndicator);
// Inicializar al arrancar
document.addEventListener('DOMContentLoaded', updateOfflineIndicator);



// ── Sistema de temas (auto / light / dark / fantasy) ──
const THEME_KEY = 'raices-theme';

function applyTheme() {
  // Fantasy is the only theme — always show particles
  const g1 = document.getElementById('df-glow1');
  const g2 = document.getElementById('df-glow2');
  if (g1) g1.style.display = 'block';
  if (g2) g2.style.display = 'block';
  const particles = document.getElementById('df-particles');
  if (particles && !particles.children.length) {
    initDFParticles();
  }
}

window.setTheme = async () => { applyTheme(); };

function initTheme() {
  applyTheme();
}

// ── Dark Fantasy — partículas de fondo ──
function initDFParticles() {
  const container = document.getElementById('df-particles');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#7b4fcf','#c9a84c','#a87fe8','#8b1a1a','#5a4090'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'df-p';
    const left  = 5 + Math.random() * 90;
    const dur   = 12 + Math.random() * 16;
    const delay = -Math.random() * 20;
    const dx    = (Math.random() - 0.5) * 70 + 'px';
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `left:${left}%;bottom:${Math.random()*20}%;animation-duration:${dur}s;animation-delay:${delay}s;--dx:${dx};background:${color}`;
    container.appendChild(p);
  }
}

// ── Arrancar ──
initTheme();
initAuth();
