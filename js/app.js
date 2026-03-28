import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions, resetAllData } from './habits.js';
import { renderAll, renderHabitsList, renderRangosPanel } from './render.js';
import { showToast, showConfetti, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectNoIcon, selectCategory, selectXP, toggleDay } from './modal.js';
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

window.switchView = (view) => { switchView(view); renderAll(); };
window.setFilter  = (filter) => { state.activeFilter = filter; renderAll(); };

// ── Toggle hábito con notificación de subida ──
window.onToggleHabit = async (id) => {
  const result = await toggleHabit(id);
  if (result.xpGanado > 0) {
    showConfetti();
    if (result.subioRango) {
      const claseData = CLASES[result.calcDespues.clase];
      showLevelUpNotif(
        '¡Nuevo rango desbloqueado!',
        `${claseData.emoji} ${claseData.nombre}`,
        `Has alcanzado el rango ${claseData.nombre}. ¡Increíble!`,
        claseData.color,
      );
    } else if (result.subioNivel) {
      const claseData = CLASES[result.calcDespues.clase];
      showLevelUpNotif(
        `¡Subiste al nivel ${result.calcDespues.nivel}!`,
        `${claseData.emoji} ${claseData.nombre}`,
        `+${result.xpGanado} XP · Sigue así, viajero.`,
        claseData.color,
      );
    } else {
      showToast(`${getCompletionMessage()} +${result.xpGanado} XP`);
    }
  }
  renderAll();
  await saveCompletions();
};

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

// ── Reset ──
window.showResetConfirm1 = () => {
  document.getElementById('reset-confirm-1').style.display = 'none';
  document.getElementById('reset-confirm-2').style.display = 'block';
};
window.cancelReset = () => {
  document.getElementById('reset-confirm-1').style.display = 'block';
  document.getElementById('reset-confirm-2').style.display = 'none';
};
window.confirmReset = async () => {
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

// ── Arrancar ──
initAuth();
