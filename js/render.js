import {
  state, today, isCompleted, getHabitStreak,
  getGlobalStreak, getTodayXP, getTotalXP, getInsight,
  CATEGORIES, XP_VALUES,
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
  const today_xp = document.getElementById('today-xp');
  if (total) total.textContent = totalXP;
  if (today_xp) today_xp.textContent = todayXP > 0 ? `+${todayXP} hoy` : '';
}

// ── Progreso ──
function renderProgress() {
  const total = state.habits.length;
  const done = state.habits.filter(h => isCompleted(h.id, today())).length;
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
    html += `<div class="cat-tab ${active === key ? `active-${key}` : ''}" onclick="window.setFilter('${key}')">${cat.emoji} ${cat.label}</div>`;
  });
  tabs.innerHTML = html;
}

// ── Hábitos ──
function renderHabits() {
  const list = document.getElementById('habits-list');
  if (!list) return;

  const filtered = state.activeFilter === 'all'
    ? state.habits
    : state.habits.filter(h => h.category === state.activeFilter);

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <div class="empty-text">
          ${state.activeFilter === 'all'
            ? 'Tu jardín está vacío.<br>Planta tu primer hábito arriba.'
            : `Sin hábitos en ${CATEGORIES[state.activeFilter]?.label || 'esta categoría'}.`}
        </div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(h => habitCardHTML(h)).join('');
}

function habitCardHTML(h) {
  const done = isCompleted(h.id, today());
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
      <div class="habit-actions" onclick="event.stopPropagation()">
        <button class="btn-icon edit" onclick="window.onEditHabit('${h.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="window.onDeleteHabit('${h.id}')" title="Eliminar">✕</button>
      </div>
      <div class="check-circle">${done ? '✓' : ''}</div>
    </div>`;
}

// ── Stats ──
function renderStats() {
  let totalDone = 0;
  Object.values(state.completions).forEach(arr => totalDone += arr.length);
  const total = state.habits.length;
  const done = state.habits.filter(h => isCompleted(h.id, today())).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total-done', totalDone);
  set('stat-best-streak', getGlobalStreak());
  set('stat-habits-count', total);
  set('stat-rate', total ? Math.round(done / total * 100) + '%' : '0%');
  set('stat-total-xp', getTotalXP());

  renderStatsHabits();
  renderCatStats();
}

function renderStatsHabits() {
  const sl = document.getElementById('stats-habits-list');
  if (!sl) return;
  if (!state.habits.length) {
    sl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Sin datos aún.</div></div>`;
    return;
  }
  sl.innerHTML = state.habits.map(h => {
    const streak = getHabitStreak(h.id);
    const pct = Math.min(streak / 7 * 100, 100);
    const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
    return `
      <div class="habit-card" style="cursor:default">
        <div class="habit-emoji">${h.emoji || '🌿'}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            <span class="cat-badge cat-${h.category}">${cat.label}</span>
            <span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>
          </div>
          <div style="margin-top:8px;height:4px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px;transition:width 0.6s"></div>
          </div>
        </div>
        <div style="font-family:var(--font-display);color:var(--accent);font-size:18px;flex-shrink:0">${streak}d</div>
      </div>`;
  }).join('');
}

function renderCatStats() {
  const cl = document.getElementById('cat-stats-list');
  if (!cl) return;
  cl.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const catHabits = state.habits.filter(h => h.category === key);
    const done = catHabits.filter(h => isCompleted(h.id, today())).length;
    const total = catHabits.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const xpEarned = catHabits
      .filter(h => isCompleted(h.id, today()))
      .reduce((s, h) => s + (h.xp || 10), 0);
    return `
      <div class="habit-card" style="cursor:default">
        <div class="habit-emoji" style="font-size:20px">${cat.emoji}</div>
        <div class="habit-info">
          <div class="habit-name">${cat.label}</div>
          <div class="habit-meta">
            <span style="font-size:11px;color:var(--muted)">${done}/${total} hoy</span>
            ${xpEarned > 0 ? `<span class="xp-badge xp-50">+${xpEarned} XP</span>` : ''}
          </div>
          <div style="margin-top:8px;height:4px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--cat-${key});border-radius:4px;transition:width 0.6s"></div>
          </div>
        </div>
        <div style="font-size:18px;font-weight:700;color:var(--cat-${key});flex-shrink:0">${pct}%</div>
      </div>`;
  }).join('');
}
