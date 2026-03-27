import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions, resetAllData } from './habits.js';
import { renderAll, renderHabitsList } from './render.js';
import { showToast, showConfetti, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectCategory, selectXP, toggleDay } from './modal.js';
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
window.onSelectCategory   = selectCategory;
window.onSelectXP         = selectXP;
window.onToggleDay        = toggleDay;

window.switchView = (view) => {
  switchView(view);
  renderAll();
};

window.setFilter = (filter) => {
  state.activeFilter = filter;
  renderAll();
};

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

window.onDeleteHabit = async (id) => {
  await deleteHabit(id);
  renderAll();
  showToast('Hábito eliminado 🍂');
};

// ── Navegar calendario de estadísticas ──
window.selectDate = (dateStr) => {
  state.selectedDate = dateStr;
  renderAll();
};

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
  // No permitir navegar al futuro
  const todayDate = new Date(today() + 'T12:00:00');
  if (d <= todayDate) {
    state.selectedDate = d.toISOString().split('T')[0];
    renderAll();
  }
};

window.calGoToday = () => {
  state.selectedDate = null;
  renderAll();
};

// ── Reset de datos con doble confirmación ──
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
  btn.disabled = true;
  btn.textContent = 'Borrando...';
  try {
    await resetAllData();
    renderAll();
    showToast('Datos eliminados 🍂');
    document.getElementById('reset-confirm-1').style.display = 'block';
    document.getElementById('reset-confirm-2').style.display = 'none';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sí, borrar todo';
  }
};

// ── Arrancar ──
initAuth();
