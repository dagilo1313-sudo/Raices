import { initAuth, toggleAuthMode, handleAuth, showForgotPassword, showLoginForm, sendResetEmail, showChangePassword, hideChangePassword, changePassword, logout } from './auth.js';
import { toggleHabit, deleteHabit, saveCompletions, resetAllData } from './habits.js';
import { renderAll, renderHabitsList } from './render.js';
import { showToast, showConfetti, switchView } from './ui.js';
import { openCreateModal, openEditModal, closeModal, closeModalOutside, submitModal, selectEmoji, selectCategory, selectXP, toggleDay } from './modal.js';
import { state, getCompletionMessage, today, getTheme, T } from './state.js';

// ── Inicializar tema ──
function initTheme() {
  const theme = getTheme();
  document.body.setAttribute('data-theme', theme);

  // Cargar fuentes del tema
  const fontLink = document.getElementById('theme-fonts');
  if (theme === 'fantasy') {
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap';
  } else {
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap';
  }

  // Aplicar textos del tema
  const t = T();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
  set('loading-logo', t.loadingIcon);
  set('auth-logo-el', t.authIcon);
  set('auth-tagline-el', t.tagline);
  set('logo-text', t.logo);
  set('logo-sub-text', t.logoSub);
  set('nav-habitos-label', t.habitosTitle);
  set('nav-stats-label', t.statsTitle);
  set('nav-perfil-label', t.perfilTitle);
  set('stats-view-title', t.statsTitle);
  set('habitos-view-title', t.habitosTitle);

  // Theme color meta
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'fantasy' ? '#c9a84c' : '#8fb339');
  document.title = `${t.logo} — Tus Hábitos`;
}

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

window.onEditHabit   = (id) => openEditModal(id);

window.onDeleteHabit = async (id) => {
  await deleteHabit(id);
  renderAll();
  showToast(T().deleteToast);
};

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
initTheme();
initAuth();
