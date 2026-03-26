import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions } from './habits.js';
import { renderAll } from './render.js';
import { showToast, showConfetti, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectCategory, selectXP } from './modal.js';
import { state, getCompletionMessage } from './state.js';

// ── Exponer funciones al HTML (window) ──
window.toggleAuthMode    = toggleAuthMode;
window.handleAuth        = handleAuth;
window.showForgotPassword= showForgotPassword;
window.showLoginForm     = showLoginForm;
window.sendResetEmail    = sendResetEmail;
window.showChangePassword= showChangePassword;
window.hideChangePassword= hideChangePassword;
window.changePassword    = changePassword;
window.logout            = logout;

window.openCreateModal   = openCreateModal;
window.closeModal        = closeModal;
window.closeModalOutside = closeModalOutside;
window.submitModal       = submitModal;
window.onSelectEmoji     = selectEmoji;
window.onSelectCategory  = selectCategory;
window.onSelectXP        = selectXP;

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

window.onEditHabit = (id) => {
  openEditModal(id);
};

window.onDeleteHabit = async (id) => {
  await deleteHabit(id);
  renderAll();
  showToast('Hábito eliminado 🍂');
};

// ── Arrancar ──
initAuth();
