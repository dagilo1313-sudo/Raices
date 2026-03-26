// ── Estado global ──
export const state = {
  currentUser: null,
  habits: [],
  completions: {},      // { 'YYYY-MM-DD': [habitId, ...] }
  activeFilter: 'all',  // 'all' | categoria
};

// ── Constantes ──
export const CATEGORIES = {
  cuerpo:       { label: 'Cuerpo',        emoji: '💪', color: 'var(--cat-cuerpo)' },
  disciplina:   { label: 'Disciplina',    emoji: '🎯', color: 'var(--cat-disciplina)' },
  energia:      { label: 'Energía',       emoji: '⚡', color: 'var(--cat-energia)' },
  inteligencia: { label: 'Inteligencia',  emoji: '🧠', color: 'var(--cat-inteligencia)' },
  identidad:    { label: 'Identidad',     emoji: '🌿', color: 'var(--cat-identidad)' },
};

export const XP_VALUES = [10, 25, 50];

export const EMOJIS = [
  '🏃','💧','📚','🧘','🍎','💪','✍️','🎸',
  '🌿','😴','🧠','🥗','☕','🎨','🚴','🏊',
  '🧹','📝','💊','🌞','🎯','🤸','🏋️','🫁',
  '❤️','🧴','🌳','🍵','⚡','🔥','🎵','🌊',
];

// ── Helpers de fecha ──
export const today = () => new Date().toISOString().split('T')[0];

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

export const getTodayXP = () => {
  const todayStr = today();
  const completedIds = state.completions[todayStr] || [];
  return state.habits
    .filter(h => completedIds.includes(h.id))
    .reduce((sum, h) => sum + (h.xp || 10), 0);
};

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
  const total = state.habits.length;
  const done = state.habits.filter(h => isCompleted(h.id, todayStr)).length;
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
  const msgs = [
    '¡Raíz más profunda! 🌿',
    '¡Creciendo! 🌱',
    '¡Brillante! ✨',
    '¡Un paso más! 💚',
    '¡Extraordinario! 🎯',
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};
