// ── Estado global ──
export const state = {
  currentUser: null,
  habits: [],
  completions: {},
  activeFilter: 'all',
  selectedDate: null,
  perfil: {
    xpTotal: 0,
    nivel: 1,
    clase: 0,
    diasPerfectos: 0,
  },
  tareas: [], // { id, nombre, urgente, done }
};

// ── Sistema de niveles ──
export const CLASES = [
  { nombre: 'Iniciado',  emoji: '🌱', color: '#6b7560' },
  { nombre: 'Aprendiz',  emoji: '🌿', color: '#8fb339' },
  { nombre: 'Guardián',  emoji: '🛡️', color: '#5c8ae0' },
  { nombre: 'Maestro',   emoji: '⚡', color: '#c4a84f' },
  { nombre: 'Sabio',     emoji: '🔮', color: '#a05ce0' },
  { nombre: 'Eterno',    emoji: '🌳', color: '#e05c5c' },
];

export const NIVELES_POR_CLASE = 30;

// Fórmula: 100 * n^1.260 → suma total ~100.075 en 30 niveles
// Nivel 1→2: 100 XP · Nivel 30→31: 7.264 XP
export const xpParaNivel = (n) => Math.round(100 * Math.pow(n, 1.260));

// XP total para completar una clase entera (niveles 1→30)
export const xpTotalClase = () => {
  let total = 0;
  for (let n = 1; n <= NIVELES_POR_CLASE; n++) total += xpParaNivel(n);
  return total; // ~100.075
};

// Calcula clase, nivel y xp actual a partir del xpTotal acumulado
export const calcularNivel = (xpTotal) => {
  const xpClase = xpTotalClase();
  let clase = Math.min(Math.floor(xpTotal / xpClase), CLASES.length - 1);
  let xpRestante = xpTotal - clase * xpClase;

  let nivel = 1;
  while (nivel < NIVELES_POR_CLASE) {
    const coste = xpParaNivel(nivel);
    if (xpRestante < coste) break;
    xpRestante -= coste;
    nivel++;
  }

  const xpParaSiguiente = nivel < NIVELES_POR_CLASE
    ? xpParaNivel(nivel)
    : xpParaNivel(NIVELES_POR_CLASE);

  const esMaximo = clase === CLASES.length - 1 && nivel === NIVELES_POR_CLASE;

  return {
    clase,
    nivel,
    xpActual: xpRestante,
    xpSiguiente: xpParaSiguiente,
    pct: esMaximo ? 100 : Math.round(xpRestante / xpParaSiguiente * 100),
    esMaximo,
  };
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

// ── Días perfectos: días donde se completaron TODOS los hábitos programados ──
export const getDiasPerfectos = () => {
  let perfectos = 0;
  Object.keys(state.completions).forEach(dateStr => {
    const completedIds = state.completions[dateStr] || [];
    const scheduled = state.habits.filter(h => isScheduledForDate(h, dateStr));
    if (scheduled.length > 0 && scheduled.every(h => completedIds.includes(h.id))) {
      perfectos++;
    }
  });
  return perfectos;
};

export const getXPForDate = (dateStr) => {
  const completedIds = state.completions[dateStr] || [];
  return state.habits
    .filter(h => completedIds.includes(h.id))
    .reduce((sum, h) => sum + (h.xp || 10), 0);
};

export const getTodayXP = () => getXPForDate(today());

export const getMaxXPForDate = (dateStr) => {
  return state.habits
    .filter(h => isScheduledForDate(h, dateStr))
    .reduce((sum, h) => sum + (h.xp || 10), 0);
};

export const getInsight = () => {
  const todayStr = today();
  const todayHabits = state.habits.filter(h => isScheduledForDate(h, todayStr));
  const total = todayHabits.length;
  const done = todayHabits.filter(h => isCompleted(h.id, todayStr)).length;
  const xp = getTodayXP();
  if (!total) return { icon: '🌱', text: 'Los pequeños pasos de hoy son las raíces del mañana. ¡Empieza tu primer hábito!' };
  if (done === total) return { icon: '🌳', text: `¡Día perfecto! +${xp} XP ganados hoy. Tus raíces crecen profundo.` };
  if (!done) return { icon: '🌿', text: `Tienes ${total} hábito${total > 1 ? 's' : ''} esperando. ¡Cada acción suma XP!` };
  return { icon: '💧', text: `${done} de ${total} completados · +${xp} XP. Riega tus hábitos.` };
};

export const getCompletionMessage = () => {
  const msgs = ['¡Raíz más profunda! 🌿', '¡Creciendo! 🌱', '¡Brillante! ✨', '¡Un paso más! 💚', '¡Extraordinario! 🎯'];
  return msgs[Math.floor(Math.random() * msgs.length)];
};
