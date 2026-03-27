import {
  state, today, isCompleted, isScheduledForDate, getHabitStreak,
  getGlobalStreak, getTodayXP, getTotalXP, getXPForDate, getInsight,
  CATEGORIES, JS_DAY_TO_KEY,
} from './state.js';

export function renderAll() {
  renderDate();
  renderWeek();
  renderStreak();
  renderXPBar();
  renderProgress();
  renderInsight();
  renderCatTabs();
  renderHabits();
  renderHabitsList();  // vista hábitos (gestión)
  renderStats();
}

// ── Fecha ──
function renderDate() {
  const el = document.getElementById('date-display');
  if (el) el.textContent = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
}

// ── Semana ──
function renderWeek() {
  const strip = document.getElementById('week-strip');
  if (!strip) return;
  const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const now = new Date();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const isToday = ds === today();
    const hasDone = state.completions[ds] && state.completions[ds].length > 0;
    const isPast = d < now && !isToday;
    html += `
      <div class="day-cell">
        <div class="day-name">${days[d.getDay()]}</div>
        <div class="day-num ${isToday ? 'today' : ''} ${isPast && hasDone ? 'past-done' : ''}">${d.getDate()}</div>
        <div class="day-dot ${hasDone ? 'filled' : ''}"></div>
      </div>`;
  }
  strip.innerHTML = html;
}

// ── Racha ──
function renderStreak() {
  const streak = getGlobalStreak();
  const el = document.getElementById('global-streak');
  if (el) el.textContent = streak;
  const dots = document.getElementById('streak-dots');
  if (!dots) return;
  let html = '';
  for (let i = 0; i < 7; i++) {
    const filled = i < Math.min(streak, 6);
    const isLast = i === Math.min(streak - 1, 5);
    html += `<div class="dot ${filled ? (isLast ? 'today' : 'active') : ''}"></div>`;
  }
  dots.innerHTML = html;
}

// ── XP Bar ──
function renderXPBar() {
  const totalXP = getTotalXP();
  const todayXP = getTodayXP();
  const total = document.getElementById('total-xp');
  const todayEl = document.getElementById('today-xp');
  if (total) total.textContent = totalXP;
  if (todayEl) todayEl.textContent = todayXP > 0 ? `+${todayXP} hoy` : '';
}

// ── Progreso ──
function renderProgress() {
  const todayStr = today();
  const todayHabits = state.habits.filter(h => isScheduledForDate(h, todayStr));
  const total = todayHabits.length;
  const done = todayHabits.filter(h => isCompleted(h.id, todayStr)).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const text = document.getElementById('progress-text');
  const bar = document.getElementById('progress-bar');
  if (text) text.textContent = `${done} / ${total}`;
  if (bar) bar.style.width = pct + '%';
}

// ── Insight ──
function renderInsight() {
  const ins = getInsight();
  const icon = document.getElementById('insight-icon');
  const text = document.getElementById('insight-text');
  if (icon) icon.textContent = ins.icon;
  if (text) text.textContent = ins.text;
}

// ── Category tabs (vista HOY) ──
function renderCatTabs() {
  const tabs = document.getElementById('cat-tabs');
  if (!tabs) return;
  const active = state.activeFilter;
  let html = `<div class="cat-tab ${active === 'all' ? 'active-all' : ''}" onclick="window.setFilter('all')">Todos</div>`;
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    html += `<div class="cat-tab ${active === key ? `active-${key}` : ''}" onclick="window.setFilter('${key}')">${cat.emoji} ${cat.label}</div>`;
  });
  tabs.innerHTML = html;
}

// ── Hábitos de HOY (solo completar, ordenados por categoría) ──
function renderHabits() {
  const list = document.getElementById('habits-list');
  if (!list) return;

  const todayStr = today();

  // Solo hábitos programados para hoy
  let scheduled = state.habits.filter(h => isScheduledForDate(h, todayStr));

  // Filtro de categoría
  if (state.activeFilter !== 'all') {
    scheduled = scheduled.filter(h => h.category === state.activeFilter);
  }

  if (!scheduled.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <div class="empty-text">
          ${state.activeFilter === 'all'
            ? 'No hay hábitos para hoy.<br>Añádelos en la pestaña Hábitos.'
            : `Sin hábitos de ${CATEGORIES[state.activeFilter]?.label || ''} para hoy.`}
        </div>
      </div>`;
    return;
  }

  // Ordenar por categoría
  const catOrder = Object.keys(CATEGORIES);
  scheduled.sort((a, b) => {
    const ai = catOrder.indexOf(a.category);
    const bi = catOrder.indexOf(b.category);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Agrupar por categoría y renderizar con separadores
  let html = '';
  let lastCat = null;
  scheduled.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) {
        html += `<div class="cat-group-label cat-${h.category}">${cat.emoji} ${cat.label}</div>`;
      }
      lastCat = h.category;
    }
    html += habitCardTodayHTML(h, todayStr);
  });

  list.innerHTML = html;
}

// Tarjeta de hábito en HOY (solo completar, sin editar/borrar)
function habitCardTodayHTML(h, dateStr) {
  const done = isCompleted(h.id, dateStr);
  const streak = getHabitStreak(h.id);
  const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
  const xpClass = `xp-${h.xp || 10}`;

  return `
    <div class="habit-card ${done ? 'done' : ''}" onclick="window.onToggleHabit('${h.id}')">
      <div class="habit-emoji">${h.emoji || '🌿'}</div>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-meta">
          <span class="cat-badge cat-${h.category || 'disciplina'}">${cat.label}</span>
          <span class="xp-badge ${xpClass}">+${h.xp || 10} XP</span>
          ${streak > 0 ? `<span class="habit-streak-mini">🔥 ${streak}d</span>` : ''}
        </div>
      </div>
      <div class="check-circle">${done ? '✓' : ''}</div>
    </div>`;
}

// ── Vista HÁBITOS (gestión: editar, borrar) ──
export function renderHabitsList() {
  const list = document.getElementById('all-habits-list');
  if (!list) return;

  if (!state.habits.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <div class="empty-text">Sin hábitos aún.<br>Pulsa + para crear el primero.</div>
      </div>`;
    return;
  }

  // Ordenar por categoría
  const catOrder = Object.keys(CATEGORIES);
  const sorted = [...state.habits].sort((a, b) => {
    const ai = catOrder.indexOf(a.category);
    const bi = catOrder.indexOf(b.category);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let html = '';
  let lastCat = null;
  sorted.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) html += `<div class="cat-group-label cat-${h.category}">${cat.emoji} ${cat.label}</div>`;
      lastCat = h.category;
    }
    html += habitCardManageHTML(h);
  });

  list.innerHTML = html;
}

function habitCardManageHTML(h) {
  const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
  const xpClass = `xp-${h.xp || 10}`;
  const days = h.days && h.days.length > 0
    ? h.days.map(d => ({ lun:'L',mar:'M',mie:'X',jue:'J',vie:'V',sab:'S',dom:'D' }[d] || d)).join(' ')
    : 'Todos los días';

  return `
    <div class="habit-card" style="cursor:default">
      <div class="habit-emoji">${h.emoji || '🌿'}</div>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-meta">
          <span class="cat-badge cat-${h.category || 'disciplina'}">${cat.label}</span>
          <span class="xp-badge ${xpClass}">+${h.xp || 10} XP</span>
        </div>
        <div class="habit-days-display">${days}</div>
      </div>
      <div class="habit-actions">
        <button class="btn-icon edit" onclick="window.onEditHabit('${h.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="window.onDeleteHabit('${h.id}')" title="Eliminar">✕</button>
      </div>
    </div>`;
}

// ── Stats con calendario ──
export function renderStats() {
  const activeDate = state.selectedDate || today();

  // Actualizar título del calendario
  const calTitle = document.getElementById('cal-title');
  if (calTitle) {
    const d = new Date(activeDate + 'T12:00:00');
    calTitle.textContent = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  renderCalendar(activeDate);
  renderStatsForDate(activeDate);
}

function renderCalendar(activeDate) {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  const d = new Date(activeDate + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();

  // Primer día del mes
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayStr = today();

  // Día de la semana del primer día (lunes = 0)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  let html = '';
  // Días vacíos al inicio
  for (let i = 0; i < startDow; i++) html += '<div></div>';

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === activeDate;
    const hasDone = state.completions[dateStr] && state.completions[dateStr].length > 0;
    const isFuture = dateStr > todayStr;

    html += `
      <div class="cal-day ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${hasDone && !isFuture ? 'cal-has-done' : ''} ${isFuture ? 'cal-future' : ''}"
           onclick="${isFuture ? '' : `window.selectDate('${dateStr}')`}">
        ${day}
        ${hasDone && !isFuture ? '<div class="cal-dot"></div>' : ''}
      </div>`;
  }

  grid.innerHTML = html;
}

function renderStatsForDate(dateStr) {
  const isToday = dateStr === today();
  const d = new Date(dateStr + 'T12:00:00');
  const dateLabel = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const statsDateLabel = document.getElementById('stats-date-label');
  if (statsDateLabel) statsDateLabel.textContent = isToday ? 'Hoy' : dateLabel;

  // Hábitos completados ese día
  const completedIds = state.completions[dateStr] || [];
  const scheduledHabits = state.habits.filter(h => isScheduledForDate(h, dateStr));
  const done = scheduledHabits.filter(h => completedIds.includes(h.id)).length;
  const total = scheduledHabits.length;
  const xp = getXPForDate(dateStr);
  const pct = total ? Math.round(done / total * 100) : 0;

  // Totales globales
  let totalDone = 0;
  Object.values(state.completions).forEach(arr => totalDone += arr.length);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total-done', totalDone);
  set('stat-best-streak', getGlobalStreak());
  set('stat-habits-count', state.habits.length);
  set('stat-total-xp', getTotalXP());
  set('stat-day-done', `${done}/${total}`);
  set('stat-day-xp', `+${xp} XP`);
  set('stat-day-pct', `${pct}%`);

  // Lista de hábitos de ese día
  renderStatsDayHabits(dateStr, completedIds, scheduledHabits);
  renderCatStats(dateStr);
}

function renderStatsDayHabits(dateStr, completedIds, scheduledHabits) {
  const sl = document.getElementById('stats-day-habits');
  if (!sl) return;

  if (!scheduledHabits.length) {
    sl.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">Sin hábitos programados para este día.</div></div>`;
    return;
  }

  sl.innerHTML = scheduledHabits.map(h => {
    const done = completedIds.includes(h.id);
    const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
    return `
      <div class="habit-card ${done ? 'done' : ''}" style="cursor:default">
        <div class="habit-emoji">${h.emoji || '🌿'}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            <span class="cat-badge cat-${h.category}">${cat.label}</span>
            <span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>
          </div>
        </div>
        <div class="check-circle" style="flex-shrink:0">${done ? '✓' : ''}</div>
      </div>`;
  }).join('');
}

function renderCatStats(dateStr) {
  const cl = document.getElementById('cat-stats-list');
  if (!cl) return;
  const completedIds = state.completions[dateStr] || [];
  cl.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const catHabits = state.habits.filter(h => h.category === key && isScheduledForDate(h, dateStr));
    const done = catHabits.filter(h => completedIds.includes(h.id)).length;
    const total = catHabits.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const xpEarned = catHabits.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp || 10), 0);
    return `
      <div class="habit-card" style="cursor:default">
        <div class="habit-emoji" style="font-size:20px">${cat.emoji}</div>
        <div class="habit-info">
          <div class="habit-name">${cat.label}</div>
          <div class="habit-meta">
            <span style="font-size:11px;color:var(--muted)">${done}/${total}</span>
            ${xpEarned > 0 ? `<span class="xp-badge xp-50">+${xpEarned} XP</span>` : ''}
          </div>
          <div style="margin-top:8px;height:4px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--cat-${key});border-radius:4px;transition:width 0.6s"></div>
          </div>
        </div>
        <div style="font-family:var(--font-body);font-size:18px;font-weight:700;color:var(--cat-${key});flex-shrink:0">${pct}%</div>
      </div>`;
  }).join('');
}
