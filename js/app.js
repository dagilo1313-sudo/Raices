import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions, resetAllData, resetProgress, createTarea, toggleTarea, borrarTareasCompletadas, getCompletadosForDate } from './habits.js';
import { renderAll, renderHabitsList, renderRangosPanel, renderTareas } from './render.js';
import { showToast, showConfetti, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectNoIcon, selectCategory, selectXP, toggleDay, selectAllDays } from './modal.js';
import { state, getCompletionMessage, today, CLASES } from './state.js';

// ── Exponer funciones al HTML ──
window.toggleAuthMode     = toggleAuthMode;
window.handleAuth         = handleAuth;
window.showForgotPassword = showForgotPassword;
window.showLoginForm      = showLoginForm;
window.sendResetEmail     = sendResetEmail;
window.showChangePassword = showChangePassword;
window.hideChangePassword = hideChangePassword;
window.changePassword     = changePassword;
window.logout             = logout;

window.openCreateModal    = openCreateModal;
window.closeModal         = closeModal;
window.closeModalOutside  = closeModalOutside;
window.submitModal        = submitModal;
window.onSelectEmoji      = selectEmoji;
window.onSelectNoIcon     = selectNoIcon;
window.onSelectCategory   = selectCategory;
window.onSelectXP         = selectXP;
window.onToggleDay        = toggleDay;
window.onSelectAllDays    = selectAllDays;

window.switchView = (view) => { switchView(view); renderAll(); };
window.setFilter  = (filter) => { state.activeFilter = filter; renderAll(); };

// ── Toggle hábito con notificación de subida ──
window.onToggleHabit = async (id) => {
  const result = await toggleHabit(id);
  if (result.xpGanado > 0) {
    showConfetti();

    // Comprobar si se acaban de completar TODOS los hábitos de hoy
    const { isScheduledForDate, today } = await import('./state.js');
    const todayStr = today();
    const scheduled = state.habits.filter(h => isScheduledForDate(h, todayStr));
    const completedToday = getCompletadosForDate(todayStr);
    const diaPerfecto = scheduled.length > 0 && scheduled.every(h => completedToday.includes(h.id));

    if (diaPerfecto && result.subioNivel) {
      // Primero mensaje día perfecto, luego nivel
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
      showDiaPerfectoNotif(null);
    } else if (result.subioRango) {
      const claseData = CLASES[result.calcDespues.clase];
      showLevelUpNotif('¡Nuevo rango desbloqueado!', `${claseData.emoji} ${claseData.nombre}`, `Has alcanzado el rango ${claseData.nombre}. ¡Increíble!`, claseData.color);
    } else if (result.subioNivel) {
      const claseData = CLASES[result.calcDespues.clase];
      showLevelUpNotif(`¡Subiste al nivel ${result.calcDespues.nivel}!`, `${claseData.emoji} ${claseData.nombre}`, `+${result.xpGanado} XP · Sigue así, viajero.`, claseData.color);
    } else {
      showToast(`${getCompletionMessage()} +${result.xpGanado} XP`);
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
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s ease';
  overlay.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;animation:slideIn 0.3s cubic-bezier(0.34,1.2,0.64,1)">
      <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 20px"></div>
      <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:10px">¿Eliminar hábito?</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:24px;line-height:1.5">
        Vas a eliminar <strong style="color:var(--text)">"${habit.name}"</strong>.<br>Esta acción no se puede deshacer.
      </div>
      <button id="btn-confirm-del" style="width:100%;background:var(--danger);color:white;border:none;border-radius:var(--radius-md);padding:14px;font-size:15px;font-weight:600;font-family:var(--font-body);cursor:pointer;margin-bottom:10px">Eliminar</button>
      <button id="btn-cancel-del" style="width:100%;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;font-size:15px;font-family:var(--font-body);cursor:pointer">Cancelar</button>
    </div>`;
  const close = () => overlay.remove();
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
window.calPrevMonth = () => {
  const base = state.selectedDate || today();
  const d = new Date(base + 'T12:00:00');
  d.setMonth(d.getMonth() - 1);
  state.selectedDate = d.toISOString().split('T')[0];
  renderAll();
};
window.calNextMonth = () => {
  const base = state.selectedDate || today();
  const d = new Date(base + 'T12:00:00');
  d.setMonth(d.getMonth() + 1);
  if (d <= new Date(today() + 'T12:00:00')) {
    state.selectedDate = d.toISOString().split('T')[0];
    renderAll();
  }
};
window.calGoToday = () => { state.selectedDate = null; renderAll(); };

// ── Reset solo progreso ──
window.showResetProgressConfirm = () => {
  document.getElementById('reset-progress-1').style.display = 'none';
  document.getElementById('reset-progress-2').style.display = 'block';
  document.getElementById('confirm-progress-input').value = '';
};
window.cancelResetProgress = () => {
  document.getElementById('reset-progress-1').style.display = 'block';
  document.getElementById('reset-progress-2').style.display = 'none';
};
window.confirmResetProgress = async () => {
  const val = document.getElementById('confirm-progress-input').value.trim();
  if (val !== 'Confirmar') { showToast('Escribe "Confirmar" exactamente'); return; }
  const btn = document.getElementById('btn-confirm-progress-reset');
  btn.disabled = true; btn.textContent = 'Borrando...';
  try {
    await resetProgress();
    renderAll();
    showToast('Progreso eliminado 🍂');
    document.getElementById('reset-progress-1').style.display = 'block';
    document.getElementById('reset-progress-2').style.display = 'none';
  } finally { btn.disabled = false; btn.textContent = 'Borrar progreso'; }
};

// ── Reset todo ──
window.showResetConfirm1 = () => {
  document.getElementById('reset-confirm-1').style.display = 'none';
  document.getElementById('reset-confirm-2').style.display = 'block';
  document.getElementById('confirm-all-input').value = '';
};
window.cancelReset = () => {
  document.getElementById('reset-confirm-1').style.display = 'block';
  document.getElementById('reset-confirm-2').style.display = 'none';
};
window.confirmReset = async () => {
  const val = document.getElementById('confirm-all-input').value.trim();
  if (val !== 'Confirmar') { showToast('Escribe "Confirmar" exactamente'); return; }
  const btn = document.getElementById('btn-confirm-reset');
  btn.disabled = true; btn.textContent = 'Borrando...';
  try {
    await resetAllData();
    renderAll();
    showToast('Datos eliminados 🍂');
    document.getElementById('reset-confirm-1').style.display = 'block';
    document.getElementById('reset-confirm-2').style.display = 'none';
  } finally { btn.disabled = false; btn.textContent = 'Sí, borrar todo'; }
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
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s ease';
  overlay.innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:24px 24px 0 0;padding:24px 24px 40px;width:100%;max-width:480px;animation:slideIn 0.3s cubic-bezier(0.34,1.2,0.64,1)">
      <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 20px"></div>
      <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:16px">Nueva tarea</div>
      <input class="input-field" id="nueva-tarea-input" placeholder="Nombre de la tarea..." maxlength="80" style="margin-bottom:12px">
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button id="btn-normal" onclick="setUrgencia(false)" style="flex:1;padding:10px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--glow);color:var(--accent);font-family:var(--font-body);font-size:13px;cursor:pointer;font-weight:600">Normal</button>
        <button id="btn-urgente" onclick="setUrgencia(true)" style="flex:1;padding:10px;border-radius:var(--radius-md);border:1px solid rgba(179,92,79,0.3);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:13px;cursor:pointer">Urgente</button>
      </div>
      <button onclick="submitTarea()" style="width:100%;background:var(--accent);color:var(--bg);border:none;border-radius:var(--radius-md);padding:14px;font-size:15px;font-weight:600;font-family:var(--font-body);cursor:pointer;margin-bottom:10px">Añadir tarea</button>
      <button onclick="this.closest('[data-overlay]').remove()" style="width:100%;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;font-size:15px;font-family:var(--font-body);cursor:pointer">Cancelar</button>
    </div>`;
  overlay.dataset.overlay = '1';
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
    overlay.remove();
    // Asegurar panel abierto
    const panel = document.getElementById('tareas-panel');
    if (panel && panel.style.display === 'none') window.onToggleTareas();
    renderTareas();
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
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
        <button onclick="this.closest('[data-overlay]').remove()" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;font-size:13px;color:var(--muted);font-family:var(--font-body);cursor:pointer">Cancelar</button>
        <button id="btn-ok-borrar" style="flex:1;background:rgba(179,92,79,0.15);border:1px solid rgba(179,92,79,0.4);border-radius:var(--radius-md);padding:10px;font-size:13px;font-weight:600;color:#b35c4f;font-family:var(--font-body);cursor:pointer">Borrar</button>
      </div>
    </div>`;
  overlay.dataset.overlay = '1';
  overlay.querySelector('#btn-ok-borrar').addEventListener('click', async () => {
    await borrarTareasCompletadas();
    overlay.remove();
    renderTareas();
    showToast('Tareas eliminadas 🍂');
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
};

// ── Viajero compacto al scroll ──
function initScrollCompact() {
  const view = document.getElementById('view-hoy');
  if (!view) return;
  const viajeroCard = view.querySelector('.viajero-card');
  const viajeroCompact = document.getElementById('viajero-compact');
  if (!viajeroCard || !viajeroCompact) return;

  view.addEventListener('scroll', () => {
    const scrollY = view.scrollTop;
    if (scrollY > 60) {
      viajeroCard.style.opacity = Math.max(0, 1 - (scrollY - 60) / 40) + '';
      viajeroCard.style.transform = `translateY(-${Math.min(scrollY - 60, 20)}px)`;
      viajeroCompact.style.opacity = Math.min(1, (scrollY - 80) / 30) + '';
      viajeroCompact.style.pointerEvents = scrollY > 100 ? 'auto' : 'none';
    } else {
      viajeroCard.style.opacity = '1';
      viajeroCard.style.transform = '';
      viajeroCompact.style.opacity = '0';
      viajeroCompact.style.pointerEvents = 'none';
    }
  }, { passive: true });
}

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

window.onDebugDateChange = (dateStr) => {
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

  renderAll();
};

// ── Arrancar ──
initAuth();
setTimeout(initScrollCompact, 500);
