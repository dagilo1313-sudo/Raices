import {
  state, today, isCompleted, isScheduledForDate, getHabitStreak,
  getGlobalStreak, getTodayXP, getTotalXP, getXPForDate, getInsight,
  CATEGORIES, JS_DAY_TO_KEY, T, VIAJERO, getTheme, isFantasyTheme,
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
  renderHabitsList();
  renderViajero();
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
  // Icono racha según tema
  const icon = document.getElementById('streak-icon');
  if (icon) icon.textContent = T().streakIcon;
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

// ── Category tabs ──
function renderCatTabs() {
  const tabs = document.getElementById('cat-tabs');
  if (!tabs) return;
  const active = state.activeFilter;
  let html = `<div class="cat-tab ${active === 'all' ? 'active-all' : ''}" onclick="window.setFilter('all')">Todos</div>`;
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    html += `<div class="cat-tab ${active === key ? `active-${key}` : ''}" onclick="window.setFilter('${key}')">${cat.label}</div>`;
  });
  tabs.innerHTML = html;
}

// ── Viajero card ──
function renderViajero() {
  const card = document.getElementById('viajero-card');
  if (!card) return;
  const streak = getGlobalStreak();
  const streakPct = Math.min(streak / 30 * 100, 100);

  card.innerHTML = `
    <div class="viajero-top">
      <div class="viajero-avatar">${VIAJERO.avatar}</div>
      <div style="flex:1;min-width:0">
        <div class="viajero-clase">${VIAJERO.clase}</div>
        <div class="viajero-nombre">${VIAJERO.nombre}</div>
        <div class="viajero-xp-text">Racha: <span>${streak} días</span></div>
      </div>
      <div class="viajero-nivel">Nivel ${VIAJERO.nivel}</div>
    </div>
    <div class="viajero-bars">
      <div class="viajero-bar-row">
        <div class="viajero-bar-icon">🔥</div>
        <div class="viajero-bar-track"><div class="viajero-bar-fill streak" style="width:${streakPct}%"></div></div>
        <div class="viajero-bar-val">${streak}d</div>
      </div>
    </div>`;
}

// ── Hábitos HOY (solo completar, agrupados por categoría) ──
function renderHabits() {
  const list = document.getElementById('habits-list');
  if (!list) return;
  const todayStr = today();
  let scheduled = state.habits.filter(h => isScheduledForDate(h, todayStr));
  if (state.activeFilter !== 'all') {
    scheduled = scheduled.filter(h => h.category === state.activeFilter);
  }
  if (!scheduled.length) {
    const msg = state.activeFilter === 'all' ? T().emptyHabits : T().emptySection;
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><div class="empty-text">${msg}</div></div>`;
    return;
  }
  const catOrder = Object.keys(CATEGORIES);
  scheduled.sort((a, b) => {
    return (catOrder.indexOf(a.category) ?? 99) - (catOrder.indexOf(b.category) ?? 99);
  });
  let html = '';
  let lastCat = null;
  scheduled.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) html += `<div class="cat-group-label cat-${h.category}">${cat.label}</div>`;
      lastCat = h.category;
    }
    html += habitCardTodayHTML(h, todayStr);
  });
  list.innerHTML = html;
}

function habitCardTodayHTML(h, dateStr) {
  const done = isCompleted(h.id, dateStr);
  const streak = getHabitStreak(h.id);
  const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
  return `
    <div class="habit-card ${done ? 'done' : ''}" onclick="window.onToggleHabit('${h.id}')">
      <div class="habit-emoji">${h.emoji || '🌿'}</div>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-meta">
          <span class="cat-badge cat-${h.category || 'disciplina'}">${cat.label}</span>
          <span class="xp-badge xp-${h.xp || 10}">+${h.xp || 10} XP</span>
          ${streak > 0 ? `<span class="habit-streak-mini">🔥 ${streak}d</span>` : ''}
        </div>
      </div>
      <div class="check-circle">${done ? '✓' : ''}</div>
    </div>`;
}

// ── Vista HÁBITOS (gestión) ──
export function renderHabitsList() {
  const list = document.getElementById('all-habits-list');
  if (!list) return;
  if (!state.habits.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><div class="empty-text">Sin hábitos aún.<br>Pulsa + para crear el primero.</div></div>`;
    return;
  }
  const catOrder = Object.keys(CATEGORIES);
  const sorted = [...state.habits].sort((a, b) =>
    (catOrder.indexOf(a.category) ?? 99) - (catOrder.indexOf(b.category) ?? 99)
  );
  let html = '';
  let lastCat = null;
  sorted.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) html += `<div class="cat-group-label cat-${h.category}">${cat.label}</div>`;
      lastCat = h.category;
    }
    html += habitCardManageHTML(h);
  });
  list.innerHTML = html;
}

function habitCardManageHTML(h) {
  const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
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
          <span class="xp-badge xp-${h.xp || 10}">+${h.xp || 10} XP</span>
        </div>
        <div class="habit-days-display">${days}</div>
      </div>
      <div class="habit-actions">
        <button class="btn-icon edit" onclick="window.onEditHabit('${h.id}')">✏️</button>
        <button class="btn-icon" onclick="window.onDeleteHabit('${h.id}')">✕</button>
      </div>
    </div>`;
}

// ── Stats ──
export function renderStats() {
  const activeDate = state.selectedDate || today();
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
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayStr = today();
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  let html = '';
  for (let i = 0; i < startDow; i++) html += '<div></div>';
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === activeDate;
    const hasDone = state.completions[dateStr] && state.completions[dateStr].length > 0;
    const isFuture = dateStr > todayStr;
    html += `
      <div class="cal-day ${isToday?'cal-today':''} ${isSelected?'cal-selected':''} ${hasDone&&!isFuture?'cal-has-done':''} ${isFuture?'cal-future':''}"
           onclick="${isFuture?'':` window.selectDate('${dateStr}')`}">
        ${day}
        ${hasDone&&!isFuture?'<div class="cal-dot"></div>':''}
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

  const completedIds = state.completions[dateStr] || [];
  const scheduledHabits = state.habits.filter(h => isScheduledForDate(h, dateStr));
  const done = scheduledHabits.filter(h => completedIds.includes(h.id)).length;
  const total = scheduledHabits.length;
  const xp = getXPForDate(dateStr);
  const pct = total ? Math.round(done / total * 100) : 0;

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
      <div class="habit-card ${done?'done':''}" style="cursor:default">
        <div class="habit-emoji">${h.emoji||'🌿'}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            <span class="cat-badge cat-${h.category}">${cat.label}</span>
            <span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>
          </div>
        </div>
        <div class="check-circle" style="flex-shrink:0">${done?'✓':''}</div>
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
    const xpEarned = catHabits.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp||10), 0);
    return `
      <div class="habit-card" style="cursor:default">
        <div class="habit-emoji" style="font-size:20px">${cat.label.charAt(0)}</div>
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
        <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--cat-${key});flex-shrink:0">${pct}%</div>
      </div>`;
  }).join('');
}
