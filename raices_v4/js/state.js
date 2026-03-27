// ── Estado global ──
export const state = {
  currentUser: null,
  habits: [],
  completions: {},
  activeFilter: 'all',
  selectedDate: null,
};

// ── Constantes ──
export const CATEGORIES = {
  fisico:       { label: 'Físico',       color: 'var(--cat-fisico)' },
  disciplina:   { label: 'Disciplina',   color: 'var(--cat-disciplina)' },
  energia:      { label: 'Energía',      color: 'var(--cat-energia)' },
  inteligencia: { label: 'Inteligencia', color: 'var(--cat-inteligencia)' },
  identidad:    { label: 'Identidad',    color: 'var(--cat-identidad)' },
};

export const XP_VALUES = [10, 25, 50];

export const DAYS_OF_WEEK = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mie', label: 'X' },
  { key: 'jue', label: 'J' },
  { key: 'vie', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

export const JS_DAY_TO_KEY = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

export const EMOJIS = [
  '🏃','💧','📚','🧘','🍎','💪','✍️','🎸',
  '🌿','😴','🧠','🥗','☕','🎨','🚴','🏊',
  '🧹','📝','💊','🌞','🎯','🤸','🏋️','🫁',
  '❤️','🧴','🌳','🍵','⚡','🔥','🎵','🌊',
];

// ── Tema activo ──
export const getTheme = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('theme') || 'raices';
};

export const isFantasyTheme = () => getTheme() === 'fantasy';

// ── Textos por tema ──
export const THEME_TEXTS = {
  raices: {
    logo: 'Raíces',
    logoSub: 'Tu jardín de hábitos',
    tagline: 'Tu jardín de hábitos',
    loadingIcon: '🌿',
    authIcon: '🌿',
    streakIcon: '🌿',
    habitBtn: '+ Nuevo',
    habitToast: '¡Hábito plantado! 🌱',
    deleteToast: 'Hábito eliminado 🍂',
    statsTitle: 'Estadísticas',
    habitosTitle: 'Hábitos',
    perfilTitle: 'Perfil',
    perfilSub: 'Tu cuenta',
    emptyHabits: 'Tu jardín está vacío.<br>Planta tu primer hábito.',
    emptySection: 'Sin hábitos programados para hoy.',
  },
  fantasy: {
    logo: 'Raíces',
    logoSub: 'El jardín del viajero',
    tagline: 'El jardín del viajero',
    loadingIcon: '🗡️',
    authIcon: '⚔️',
    streakIcon: '🔥',
    habitBtn: '+ Nueva misión',
    habitToast: '¡Misión forjada! ⚔️',
    deleteToast: 'Misión abandonada 🍂',
    statsTitle: 'Crónicas',
    habitosTitle: 'Misiones',
    perfilTitle: 'Viajero',
    perfilSub: 'Tu saga',
    emptyHabits: 'El libro de misiones está vacío.<br>Forja tu primera misión.',
    emptySection: 'Sin misiones para hoy, viajero.',
  },
};

export const T = () => THEME_TEXTS[getTheme()] || THEME_TEXTS.raices;

// ── Viajero ──
export const VIAJERO = {
  nombre: 'Viajero',
  clase: 'Iniciado',
  nivel: 1,
  avatar: '🧙',
};

// ── Helpers de fecha ──
export const today = () => new Date().toISOString().split('T')[0];
export const getActiveDate = () => state.selectedDate || today();

export const isScheduledForDate = (habit, dateStr) => {
  if (!habit.days || habit.days.length === 0) return true;
  const d = new Date(dateStr + 'T12:00:00');
  const dayKey = JS_DAY_TO_KEY[d.getDay()];
  return habit.days.includes(dayKey);
};

export const isCompleted = (habitId, date) =>
  state.completions[date] && state.completions[date].includes(habitId);

export const getHabitStreak = (habitId) => {
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (state.completions[ds] && state.completions[ds].includes(habitId)) {
      streak++; d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
};

export const getGlobalStreak = () => {
  if (!state.habits.length) return 0;
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (state.completions[ds] && state.completions[ds].length > 0) {
      streak++; d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
};

export const getXPForDate = (dateStr) => {
  const completedIds = state.completions[dateStr] || [];
  return state.habits
    .filter(h => completedIds.includes(h.id))
    .reduce((sum, h) => sum + (h.xp || 10), 0);
};

export const getTodayXP = () => getXPForDate(today());

export const getTotalXP = () => {
  let total = 0;
  Object.keys(state.completions).forEach(date => {
    const ids = state.completions[date] || [];
    ids.forEach(id => {
      const habit = state.habits.find(h => h.id === id);
      if (habit) total += habit.xp || 10;
    });
  });
  return total;
};

export const getInsight = () => {
  const todayStr = today();
  const todayHabits = state.habits.filter(h => isScheduledForDate(h, todayStr));
  const total = todayHabits.length;
  const done = todayHabits.filter(h => isCompleted(h.id, todayStr)).length;
  const xp = getTodayXP();
  const fantasy = isFantasyTheme();

  if (!total) return {
    icon: fantasy ? '📜' : '🌱',
    text: fantasy
      ? 'El libro de misiones aguarda. Forja tu primer hábito, viajero.'
      : 'Los pequeños pasos de hoy son las raíces del mañana. ¡Empieza tu primer hábito!',
  };
  if (done === total) return {
    icon: fantasy ? '⚔️' : '🌳',
    text: fantasy
      ? `¡Todas las misiones completadas! +${xp} XP ganados hoy.`
      : `¡Perfecto! +${xp} XP ganados hoy. Tus raíces crecen profundo.`,
  };
  if (!done) return {
    icon: fantasy ? '🗡️' : '🌿',
    text: fantasy
      ? `${total} misión${total > 1 ? 'es' : ''} te aguardan. ¡El destino llama!`
      : `Tienes ${total} hábito${total > 1 ? 's' : ''} esperando. ¡Cada acción suma XP!`,
  };
  return {
    icon: fantasy ? '🔥' : '💧',
    text: fantasy
      ? `${done} de ${total} misiones completadas · +${xp} XP. ¡Sigue adelante!`
      : `${done} de ${total} completados · +${xp} XP. Riega tus hábitos.`,
  };
};

export const getCompletionMessage = () => {
  const fantasy = isFantasyTheme();
  const msgs = fantasy
    ? ['¡Gloria al viajero! ⚔️', '¡El destino se inclina! 🗡️', '¡Hazaña completada! 🔥', '¡La leyenda crece! ✨', '¡Imparable! 💀']
    : ['¡Raíz más profunda! 🌿', '¡Creciendo! 🌱', '¡Brillante! ✨', '¡Un paso más! 💚', '¡Extraordinario! 🎯'];
  return msgs[Math.floor(Math.random() * msgs.length)];
};
