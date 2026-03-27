// ── Estado global ──
export const state = {
  currentUser: null,
  habits: [],
  completions: {},      // { 'YYYY-MM-DD': [habitId, ...] }
  activeFilter: 'all',  // 'all' | categoria
  selectedDate: null,   // fecha seleccionada en estadísticas (null = hoy)
};

// ── Constantes ──
export const CATEGORIES = {
  fisico:       { label: 'Físico',         olor: 'var(--cat-fisico)' },
  disciplina:   { label: 'Disciplina',    emoji: '🎯', color: 'var(--cat-disciplina)' },
  energia:      { label: 'Energía',       emoji: '⚡', color: 'var(--cat-energia)' },
  inteligencia: { label: 'Inteligencia',  emoji: '🧠', color: 'var(--cat-inteligencia)' },
  identidad:    { label: 'Identidad',     emoji: '🌿', color: 'var(--cat-identidad)' },
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

// Mapeo JS getDay() → key (0=domingo)
export const JS_DAY_TO_KEY = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

export const EMOJIS = [
  '🏃','💧','📚','🧘','🍎','💪','✍️','🎸',
  '🌿','😴','🧠','🥗','☕','🎨','🚴','🏊',
  '🧹','📝','💊','🌞','🎯','🤸','🏋️','🫁',
  '❤️','🧴','🌳','🍵','⚡','🔥','🎵','🌊',
];

// ── Helpers de fecha ──
export const today = () => new Date().toISOString().split('T')[0];
export const getActiveDate = () => state.selectedDate || today();

// Comprueba si un hábito está programado para una fecha
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
      streak++;
      d.setDate(d.getDate() - 1);
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
      streak++;
      d.setDate(d.getDate() - 1);
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

  if (!total) return { icon: '🌱', text: 'Los pequeños pasos de hoy son las raíces del mañana. ¡Empieza tu primer hábito!' };
  if (done === total) return { icon: '🌳', text: `¡Perfecto! +${xp} XP ganados hoy. Tus raíces crecen profundo.` };
  if (!done) return { icon: '🌿', text: `Tienes ${total} hábito${total > 1 ? 's' : ''} esperando. ¡Cada acción suma XP!` };
  const pct = Math.round(done / total * 100);
  return pct >= 50
    ? { icon: '🌻', text: `${pct}% completado · +${xp} XP hoy. ¡Sigue!` }
    : { icon: '💧', text: `${done} de ${total} completados · +${xp} XP. Riega tus hábitos.` };
};

export const getCompletionMessage = () => {
  const msgs = ['¡Raíz más profunda! 🌿','¡Creciendo! 🌱','¡Brillante! ✨','¡Un paso más! 💚','¡Extraordinario! 🎯'];
  return msgs[Math.floor(Math.random() * msgs.length)];
};
