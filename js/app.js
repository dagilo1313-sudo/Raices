import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions, resetAllData } from './habits.js';
import { renderAll, renderHabitsList } from './render.js';
import { showToast, showConfetti, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectNoIcon, selectCategory, selectXP, toggleDay } from './modal.js';
import { state, getCompletionMessage, today } from './state.js';

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

window.onToggleHabit = async (id) => {
  const completed = await toggleHabit(id);
  if (completed) {
    showConfetti();
    const habit = state.habits.find(h => h.id === id);
    const xp = habit ? habit.xp : 10;
    showToast(`${getCompletionMessage()} +${xp} XP`);
  }
  renderAll();
  await saveCompletions();
};

window.onEditHabit = (id) => openEditModal(id);

// ── Borrar con confirmación ──
window.onDeleteHabit = (id) => {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  showDeleteConfirm(id, habit.name);
};

function showDeleteConfirm(id, name) {
  // Crear overlay de confirmación
  const existing = document.getElementById('delete-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'delete-confirm-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background: var(--card2); border: 1px solid var(--border);
      border-radius: 24px 24px 0 0; padding: 28px 24px 40px;
      width: 100%; max-width: 480px;
      animation: slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1);
    ">
      <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 20px;"></div>
      <div style="font-family:var(--font-display);font-size:20px;color:var(--text);margin-bottom:10px;">¿Eliminar hábito?</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:24px;line-height:1.5;">
        Vas a eliminar <strong style="color:var(--text)">"${name}"</strong>. Esta acción no se puede deshacer.
      </div>
      <button onclick="window.confirmDeleteHabit('${id}')" style="
        width:100%; background:var(--danger); color:white; border:none;
        border-radius:var(--radius-md); padding:14px; font-size:15px;
        font-weight:600; font-family:var(--font-body); cursor:pointer;
        margin-bottom:10px; transition:all 0.2s;
      ">Eliminar</button>
      <button onclick="window.cancelDeleteHabit()" style="
        width:100%; background:transparent; color:var(--muted);
        border:1px solid var(--border); border-radius:var(--radius-md);
        padding:14px; font-size:15px; font-family:var(--font-body);
        cursor:pointer; transition:all 0.2s;
      ">Cancelar</button>
    </div>
    <style>
      @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    </style>
  `;

  // Cerrar al pulsar fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) window.cancelDeleteHabit();
  });

  document.body.appendChild(overlay);
}

window.confirmDeleteHabit = async (id) => {
  window.cancelDeleteHabit();
  await deleteHabit(id);
  renderAll();
  showToast('Hábito eliminado 🍂');
};

window.cancelDeleteHabit = () => {
  const overlay = document.getElementById('delete-confirm-overlay');
  if (overlay) overlay.remove();
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
  } finally {
    btn.disabled = false; btn.textContent = 'Sí, borrar todo';
  }
};

// ── Arrancar ──
initAuth();
