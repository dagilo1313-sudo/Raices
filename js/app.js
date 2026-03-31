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
import { toggleHabit, deleteHabit, saveCompletions, resetAllData, resetProgress, createTarea, toggleTarea, borrarTareasCompletadas, getCompletadosForDate, loadAllCompletions, loadMonthCompletions, rellenarDiasVacios } from './habits.js';
import { renderAll, renderHabitsList, renderTareas, renderHistorico, renderStats, renderRangosPanel } from './render.js';
import { showToast, showConfetti, showXPFloat, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectNoIcon, selectCategory, selectXP, toggleDay, selectAllDays, openIconPicker, closeIconPicker, confirmIconPicker, clearIconPicker } from './modal.js';
import { state, getCompletionMessage, today, CLASES } from './state.js';
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
window.setFilter  = (filter) => { state.activeFilter = filter; renderAll(); };

// ── Toggle hábito con notificación de subida ──
window.onToggleHabit = async (id) => {
  const result = await toggleHabit(id);
  if (result.xpGanado > 0) {
    // Animación ligera + XP flotante sobre el hábito
    showXPFloat(id, result.xpGanado);

    // Comprobar si se acaban de completar TODOS los hábitos de hoy
    const { isScheduledForDate, today } = await import('./state.js');
    const todayStr = today();
    const scheduled = state.habits.filter(h => isScheduledForDate(h, todayStr));
    const completedToday = getCompletadosForDate(todayStr);
    const diaPerfecto = scheduled.length > 0 && scheduled.every(h => completedToday.includes(h.id));

    if (diaPerfecto && result.subioNivel) {
      showConfetti();
      showDiaPerfectoNotif(() => {
        const claseData = result.subioRango ? CLASES[result.calcDespues.clase] : CLASES[result.calcDespues.clase];
        showLevelUpNotif(
          result.subioRango ? '¡Nuevo rango desbloqueado!' : `¡Subiste al nivel ${result.calcDespues.nivel}!`,
          `${claseData.emoji} ${claseData.nombre}`,
          `+${result.xpGanado} XP · Sigue así, viajero.`,
          claseData.color,
        );
      });
    } else if (diaPerfecto) {
      showConfetti();
      showDiaPerfectoNotif(null);
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
  renderAll();
  await saveCompletions();
};

function showDiaPerfectoNotif(onClose) {
  const el = document.createElement('div');
  el.id = 'dia-perfecto-notif';
  el.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
  el.innerHTML = `
    <div style="background:var(--card2);border:1.5px solid var(--accent2);border-radius:20px;padding:28px 24px;text-align:center;max-width:300px;width:100%;animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 0 32px rgba(196,168,79,0.12)">
      <div style="font-size:40px;margin-bottom:10px">🌳</div>
      <div style="font-size:18px;color:var(--accent2);margin-bottom:6px;font-weight:700">¡Día perfecto!</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5">Has completado todos tus hábitos de hoy. ¡Tus raíces crecen profundo!</div>
      <button id="btn-dia-perfecto-ok" style="background:rgba(196,168,79,0.15);color:var(--accent2);border:1.5px solid var(--accent2);border-radius:var(--radius-full);padding:10px 28px;font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:background 0.2s">¡Genial!</button>
    </div>
    <style>@keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
  el.querySelector('#btn-dia-perfecto-ok').addEventListener('click', () => {
    el.remove();
    if (onClose) onClose();
  });
  el.addEventListener('click', e => { if (e.target === el) { el.remove(); if (onClose) onClose(); } });
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
      <button onclick="document.getElementById('levelup-notif').remove()" style="background:${color};color:#0d0f0a;border:none;border-radius:var(--radius-full);padding:12px 32px;font-size:14px;font-weight:700;font-family:var(--font-body);cursor:pointer">¡A seguir!</button>
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
window.selectDate = (dateStr) => { state.selectedDate = dateStr; renderAll(); };
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

window.showResetProgressConfirm = () => showConfirmPopup({
  title: 'Reiniciar progreso',
  desc: 'Se borrará tu XP, nivel y días perfectos. Los hábitos se conservan.',
  btnLabel: 'Borrar progreso',
  btnClass: 'btn btn-danger',
  keyword: 'reiniciar progreso',
  onConfirm: async () => { await resetProgress(); renderAll(); showToast('Progreso eliminado 🍂'); }
});

window.showResetConfirm1 = () => showConfirmPopup({
  title: 'Reiniciar todo',
  desc: 'Se borrarán todos tus hábitos y progreso de forma permanente. Esta acción es irreversible.',
  btnLabel: 'Sí, borrar todo',
  btnClass: 'btn btn-danger',
  keyword: 'reiniciar todo',
  onConfirm: async () => { await resetAllData(); renderAll(); showToast('Datos eliminados 🍂'); }
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
};

window.onToggleTarea = async (id) => {
  await toggleTarea(id);
  renderTareas();
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
window.onToggleDebug = () => {
  const toggle = document.getElementById('debug-toggle');
  const wrap = document.getElementById('debug-date-wrap');
  const isOn = toggle.classList.contains('on');

  if (isOn) {
    // Desactivar
    toggle.classList.remove('on');
    wrap.style.display = 'none';
    state.debugDate = null;
    document.getElementById('debug-active-banner').style.display = 'none';
    document.getElementById('debug-banner').style.display = 'none';
    document.getElementById('debug-date-input').value = '';
    renderAll();
  } else {
    // Activar — mostrar selector de fecha
    toggle.classList.add('on');
    wrap.style.display = 'block';
    // Poner fecha de ayer por defecto
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().split('T')[0];
    document.getElementById('debug-date-input').value = ayerStr;
    window.onDebugDateChange(ayerStr);
  }
};

window.onDebugDateChange = async (dateStr) => {
  if (!dateStr) return;
  state.debugDate = dateStr;

  // Formatear fecha para mostrar
  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Banner en perfil
  document.getElementById('debug-active-banner').style.display = 'block';
  document.getElementById('debug-date-label').textContent = label;

  // Banner en vista HOY
  document.getElementById('debug-banner').style.display = 'block';
  document.getElementById('debug-banner-date').textContent = label;

  // Rellenar días vacíos hasta la fecha de debug y luego renderizar
  await rellenarDiasVacios();
  renderAll();
};

// ── Arrancar ──
initAuth();
