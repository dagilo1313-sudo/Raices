import {
  state, today, isCompleted, isScheduledForDate, getHabitStreak,
  getTodayXP, getXPForDate, getMaxXPForDate,
  CATEGORIES, CLASES, calcularNivel, xpParaNivel, xpTotalClase, NIVELES_POR_CLASE,
} from './state.js';
import { getCompletadosForDate, getPlanificadosForDate } from './habits.js';

export function renderAll() {
  renderDate();
  renderWeek();
  renderViajero();
  renderXPBar();
  renderProgress();
  renderTareas();
  renderCatTabs();
  renderHabits();
  renderLastSync();
  renderHabitsList();
  renderStats();
}

// ── Fecha ──
function renderDate() {
  const el = document.getElementById('date-display');
  if (!el) return;
  const d = new Date();
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('es-ES', { month: 'short' });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
  el.textContent = `${capitalized}, ${day} ${monthCap}`;
}

// ── Viajero ──
function renderViajero() {
  const { xpTotal } = state.perfil;
  const calc = calcularNivel(xpTotal);
  const claseData = CLASES[calc.clase] || CLASES[0];

  const diasPerfectos = state.perfil.diasPerfectos;
  const xpHoy = getTodayXP();
  const xpMaxHoy = getMaxXPForDate(today());
  const exitoPct = xpMaxHoy > 0 ? Math.round(xpHoy / xpMaxHoy * 100) : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const claseEl = document.getElementById('viajero-clase');
  if (claseEl) { claseEl.textContent = claseData.nombre; claseEl.style.color = claseData.color + '8c'; }
  const nombreEl = document.getElementById('viajero-nombre');
  if (nombreEl) nombreEl.style.color = claseData.color;
  // Badge nivel con color de clase
  set('viajero-nivel-badge', `Nivel ${calc.nivel}`);
  const nivelBadgeEl = document.getElementById('viajero-nivel-badge');
  if (nivelBadgeEl) {
    nivelBadgeEl.style.color = claseData.color;
    nivelBadgeEl.style.borderColor = claseData.color + '44';
    nivelBadgeEl.style.background = claseData.color + '18';
  }
  set('viajero-stat-perfectos', diasPerfectos);
  set('viajero-stat-xphoy', `+${xpHoy}`);
  const exitoEl = document.getElementById('viajero-stat-exito');
  if (exitoEl) {
    exitoEl.textContent = exitoPct + '%';
    exitoEl.style.color = exitoPct >= 100 ? 'var(--accent2)' : '';
  }

  if (calc.esMaximo) {
    set('viajero-xp-label', 'Nivel máximo');
  } else {
    set('viajero-xp-label', `${calc.xpActual} / ${calc.xpSiguiente}`);
  }

  const fill = document.getElementById('viajero-xp-fill');
  if (fill) fill.style.width = calc.pct + '%';

  const avatarEl = document.getElementById('viajero-avatar-emoji');
  if (avatarEl) avatarEl.textContent = claseData.emoji;

  // Sincronizar viajero compacto
  const setC = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setC('viajero-compact-emoji', claseData.emoji);
  setC('viajero-compact-clase', claseData.nombre);
  setC('viajero-compact-nivel', `Nivel ${calc.nivel}`);
  setC('viajero-compact-xp', `${calc.xpActual} / ${calc.xpSiguiente} XP`);
  const compactBar = document.getElementById('viajero-compact-bar');
  if (compactBar) compactBar.style.width = calc.pct + '%';
}

// ── Última sync ──
function renderLastSync() {
  const el = document.getElementById('last-sync');
  if (!el) return;
  const todayStr = today();
  const d = state.completions[todayStr];
  if (!d || Array.isArray(d) || !d.updatedAt) {
    el.textContent = '';
    return;
  }
  const fecha = new Date(d.updatedAt);
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  el.textContent = `Última sync: ${hora}`;
}

// ── Semana ──
function getDayState(ds, habitsSource) {
  const isToday = ds === today();
  const completedIds = getCompletadosForDate(ds);
  const planificadosIds = getPlanificadosForDate(ds);

  let scheduled, isPerfect, xpGanado, xpMax;

  if (!isToday && planificadosIds) {
    // Día pasado con snapshot — usar planificados de completions
    const planificadosHabits = state.allHabits.filter(h => planificadosIds.includes(h.id));
    scheduled = planificadosHabits;
    isPerfect = planificadosIds.length > 0 && planificadosIds.every(id => completedIds.includes(id));
    xpGanado = planificadosHabits.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp || 10), 0);
    xpMax = planificadosHabits.reduce((s, h) => s + (h.xp || 10), 0);
  } else {
    // Hoy o sin snapshot — usar habitsSource
    scheduled = habitsSource.filter(h => isScheduledForDate(h, ds));
    isPerfect = scheduled.length > 0 && scheduled.every(h => completedIds.includes(h.id));
    xpGanado = scheduled.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp || 10), 0);
    xpMax = scheduled.reduce((s, h) => s + (h.xp || 10), 0);
  }

  const hasDone = completedIds.length > 0;
  const isGood = !isPerfect && xpMax > 0 && (xpGanado / xpMax) >= 0.8;
  return { hasDone, isPerfect, isGood, completedIds, scheduled };
}

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
    const isPast = d < now && !isToday;
    const habSrcWeek = isToday ? state.habits : state.allHabits;
    const { hasDone, isPerfect, isGood } = getDayState(ds, habSrcWeek);

    // Clases del círculo del día
    let numClass = isToday ? 'today' : '';
    if (isPast || isToday) {
      if (isPerfect) numClass += ' day-golden';
      else if (isGood) numClass += ' day-green';
      else if (hasDone) numClass += ' day-partial';
    }

    // Clase del punto
    let dotClass = isPerfect ? 'perfect' : hasDone ? 'filled' : '';

    html += `
      <div class="day-cell">
        <div class="day-name">${days[d.getDay()]}</div>
        <div class="day-num ${numClass}">${d.getDate()}</div>
        <div class="day-dot ${dotClass}"></div>
      </div>`;
  }
  strip.innerHTML = html;
}

// ── XP Bar ──
function renderXPBar() {
  const xpTotal = state.perfil.xpTotal;
  const todayXP = getTodayXP();
  const todayStr = today();
  const maxXPToday = getMaxXPForDate(todayStr);
  const pctToday = maxXPToday > 0 ? Math.round(todayXP / maxXPToday * 100) : 0;

  const total = document.getElementById('total-xp');
  const todayEl = document.getElementById('today-xp');
  if (total) total.textContent = xpTotal;
  if (todayEl) todayEl.textContent = todayXP > 0 ? `+${todayXP} hoy · ${pctToday}%` : '';
}

// ── Progreso ──
function renderProgress() {
  const todayStr = today();
  const todayHabits = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
  const total = todayHabits.length;
  const done = todayHabits.filter(h => isCompleted(h.id, todayStr)).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const isPerfect = total > 0 && done === total;
  const text = document.getElementById('progress-text');
  const bar = document.getElementById('progress-bar');
  if (text) {
    text.textContent = total ? `${done} / ${total} · ${pct}%` : '0 / 0';
    text.style.color = isPerfect ? 'var(--accent2)' : 'var(--accent)';
  }
  if (bar) {
    bar.style.width = pct + '%';
    bar.style.background = isPerfect
      ? 'linear-gradient(to right, #c4a84f, #e8c96e)'
      : '';
  }
}

// ── Tareas ──
export function renderTareas() {
  const lista = document.getElementById('tareas-lista');
  if (!lista) return;

  const tareas = state.tareas;
  const pendientes = tareas.filter(t => !t.done);
  const completadas = tareas.filter(t => t.done);

  // Actualizar contador en el toggle
  const counter = document.getElementById('tareas-count');
  if (counter) {
    const txt = tareas.length === 0
      ? 'Sin tareas'
      : `${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''}${completadas.length > 0 ? ` · ${completadas.length} hecha${completadas.length !== 1 ? 's' : ''}` : ''}`;
    counter.textContent = txt;
  }

  if (tareas.length === 0) {
    lista.innerHTML = `<div style="padding:14px 12px;font-size:13px;color:var(--muted);font-style:italic;text-align:center">Sin tareas aún</div>`;
    return;
  }

  // Urgentes primero, luego normales, completadas al final
  const ordenadas = [
    ...tareas.filter(t => !t.done && t.urgente),
    ...tareas.filter(t => !t.done && !t.urgente),
    ...tareas.filter(t => t.done),
  ];

  lista.innerHTML = ordenadas.map(t => `
    <div class="tarea-item ${t.done ? 'done' : ''}" onclick="window.onToggleTarea('${t.id}')">
      <div class="tarea-check">${t.done ? '✓' : ''}</div>
      <div class="tarea-nombre">${t.nombre}</div>
      ${t.urgente && !t.done ? '<div class="tarea-urgente">Urgente</div>' : ''}
    </div>`).join('');
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

// ── Helper icono hábito ──
function habitIconHTML(h) {
  if (h.emoji) return `<div class="habit-emoji">${h.emoji}</div>`;
  const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
  const initial = cat.label.charAt(0).toUpperCase();
  return `<div class="habit-emoji habit-emoji-cat"
    style="background:var(--cat-${h.category || 'disciplina'}-bg);border:1px solid var(--cat-${h.category || 'disciplina'}-border);color:var(--cat-${h.category || 'disciplina'})">
    ${initial}
  </div>`;
}

// ── Hábitos HOY ──
function renderHabits() {
  const list = document.getElementById('habits-list');
  if (!list) return;
  const todayStr = today();
  let scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
  if (state.activeFilter !== 'all') scheduled = scheduled.filter(h => h.category === state.activeFilter);

  // Día perfecto: todos completados → clase golden en el contenedor
  const allCompleted = scheduled.length > 0 && scheduled.every(h => isCompleted(h.id, todayStr));
  list.classList.toggle('perfect-day', allCompleted);

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

  const catOrder = Object.keys(CATEGORIES);
  scheduled.sort((a, b) => (catOrder.indexOf(a.category) ?? 99) - (catOrder.indexOf(b.category) ?? 99));

  let html = '', lastCat = null;
  scheduled.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) html += `<div class="cat-group-label cat-${h.category}">${cat.label}</div>`;
      lastCat = h.category;
    }
    const done = isCompleted(h.id, todayStr);
    const streak = getHabitStreak(h.id);
    html += `
      <div class="habit-card ${done ? 'done' : ''}" onclick="window.onToggleHabit('${h.id}')">
        ${habitIconHTML(h)}
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            <span class="xp-badge xp-${h.xp || 10}">+${h.xp || 10} XP</span>
            ${streak > 0 ? `<span class="habit-streak-mini">🔥 ${streak}d</span>` : ''}
          </div>
        </div>
        <div class="check-circle">${done ? '✓' : ''}</div>
      </div>`;
  });
  list.innerHTML = html;
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
  const sorted = [...state.habits].filter(h => !h.archivado).sort((a, b) => (catOrder.indexOf(a.category) ?? 99) - (catOrder.indexOf(b.category) ?? 99));
  let html = '', lastCat = null;
  sorted.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) html += `<div class="cat-group-label cat-${h.category}">${cat.label}</div>`;
      lastCat = h.category;
    }
    const _dayOrder = ['lun','mar','mie','jue','vie','sab','dom'];
    const _dayLabel = { lun:'L', mar:'M', mie:'X', jue:'J', vie:'V', sab:'S', dom:'D' };
    const days = h.days && h.days.length > 0
      ? [...h.days].sort((a, b) => _dayOrder.indexOf(a) - _dayOrder.indexOf(b))
                   .map(d => _dayLabel[d] || d).join(' ')
      : 'Todos los días';
    html += `
      <div class="habit-card" style="cursor:default">
        ${habitIconHTML(h)}
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta"><span class="xp-badge xp-${h.xp || 10}">+${h.xp || 10} XP</span></div>
          <div class="habit-days-display">${days}</div>
        </div>
        <div class="habit-actions">
          <button class="btn-editar" onclick="window.onEditHabit('${h.id}')">Editar</button>
          <button class="btn-icon" onclick="window.onDeleteHabit('${h.id}')">✕</button>
        </div>
      </div>`;
  });
  list.innerHTML = html;
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
  const year = d.getFullYear(), month = d.getMonth();
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
    const isFuture = dateStr > todayStr;
    const habSrc = dateStr === todayStr ? state.habits : state.allHabits;
    const { hasDone, isPerfect, isGood } = getDayState(dateStr, habSrc);

    let stateClass = '';
    if (!isFuture) {
      if (isPerfect)   stateClass = 'cal-golden';
      else if (isGood) stateClass = 'cal-green';
      else if (hasDone) stateClass = 'cal-partial';
    }

    html += `
      <div class="cal-day ${isToday?'cal-today':''} ${isSelected?'cal-selected':''} ${stateClass} ${isFuture?'cal-future':''}"
           onclick="${isFuture?'':` window.selectDate('${dateStr}')`}">
        <div class="cal-day-inner">${day}</div>
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
  const calTitle = document.getElementById('cal-title');
  if (calTitle) calTitle.style.color = 'var(--accent)';

  // Hoy → solo activos; días pasados → snapshot planificados o allHabits como fallback
  const planificados = !isToday ? getPlanificadosForDate(dateStr) : null;
  const habitsSource = isToday
    ? state.habits
    : planificados
      ? state.allHabits.filter(h => planificados.includes(h.id))
      : state.allHabits.filter(h => isScheduledForDate(h, dateStr));
  const completedIds = getCompletadosForDate(dateStr);
  const scheduledHabits = isToday ? habitsSource.filter(h => isScheduledForDate(h, dateStr)) : habitsSource;
  const done = scheduledHabits.filter(h => completedIds.includes(h.id)).length;
  const total = scheduledHabits.length;
  const xp = getXPForDate(dateStr);
  const pct = total ? Math.round(done / total * 100) : 0;

  const diasPerfectos = state.perfil.diasPerfectos;
  const xpHoyStats = getXPForDate(today());
  const xpMaxHoyStats = getMaxXPForDate(today());
  const exitoPct = xpMaxHoyStats > 0 ? Math.round(xpHoyStats / xpMaxHoyStats * 100) : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-dias-perfectos', diasPerfectos);
  set('stat-total-xp', `+${xpHoyStats}`);
  set('stat-exito-xp', exitoPct + '%');
  set('stat-habits-count', state.habits.filter(h => !h.archivado).length);
  set('stat-day-done', `${done}/${total}`);
  set('stat-day-xp', `+${xp} XP`);
  set('stat-day-pct', `${pct}%`);

  // Si no es hoy y no hay ningún dato para ese día → Día no registrado
  const sinRegistro = !isToday && completedIds.length === 0 && !getPlanificadosForDate(dateStr);

  const elCat = document.getElementById('cat-stats-list');
  const elHab = document.getElementById('stats-day-habits');
  const catSection = elCat?.closest('.section');
  const habSection = elHab?.closest('.section');
  let noReg = document.getElementById('stats-no-registro');

  if (sinRegistro) {
    if (elCat) elCat.innerHTML = '';
    if (elHab) elHab.innerHTML = '';
    if (catSection) catSection.style.display = 'none';
    if (habSection) habSection.style.display = 'none';
    if (!noReg && elCat) {
      noReg = document.createElement('div');
      noReg.id = 'stats-no-registro';
      noReg.style.cssText = 'text-align:center;padding:32px 0;';
      elCat.parentElement.insertAdjacentElement('afterend', noReg);
    }
    if (noReg) {
      noReg.style.display = 'block';
      noReg.innerHTML = '<div style="font-size:32px;margin-bottom:8px">🌱</div><div style="font-size:14px;color:var(--muted)">Día no registrado</div>';
    }
    return;
  }

  // Restaurar secciones si estaban ocultas
  if (noReg) noReg.style.display = 'none';
  if (catSection) catSection.style.display = '';
  if (habSection) habSection.style.display = '';

  renderStatsDayHabits(dateStr, completedIds, scheduledHabits);
  renderCatStats(dateStr, habitsSource);
}

function renderStatsDayHabits(dateStr, completedIds, scheduledHabits) { // completedIds ya viene como array limpio
  const sl = document.getElementById('stats-day-habits');
  if (!sl) return;
  if (!scheduledHabits.length) {
    sl.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">Sin hábitos programados para este día.</div></div>`;
    return;
  }
  const catOrder = Object.keys(CATEGORIES);
  // Ordenar: por categoría, y dentro completados primero
  const ordenados = [...scheduledHabits].sort((a, b) => {
    const catA = catOrder.indexOf(a.category);
    const catB = catOrder.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    const doneA = completedIds.includes(a.id) ? 0 : 1;
    const doneB = completedIds.includes(b.id) ? 0 : 1;
    return doneA - doneB;
  });

  let html = '';
  let lastCat = null;
  ordenados.forEach(h => {
    const done = completedIds.includes(h.id);
    const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
    if (h.category !== lastCat) {
      if (lastCat !== null) html += '';
      html += `<div class="cat-group-label cat-${h.category}">${cat.label}</div>`;
      lastCat = h.category;
    }
    html += `
      <div class="habit-card ${done?'done':''}" style="cursor:default">
        ${habitIconHTML(h)}
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            <span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>
          </div>
        </div>
        <div class="check-circle" style="flex-shrink:0">${done?'✓':''}</div>
      </div>`;
  });
  sl.innerHTML = html;
}

function renderCatStats(dateStr, habitsSource) {
  const cl = document.getElementById('cat-stats-list');
  if (!cl) return;
  const completedIds = getCompletadosForDate(dateStr);
  cl.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const catHabits = habitsSource.filter(h => h.category === key && isScheduledForDate(h, dateStr));
    if (!catHabits.length) return '';
    const done = catHabits.filter(h => completedIds.includes(h.id)).length;
    const total = catHabits.length;
    const xpEarned = catHabits.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp||10), 0);
    const xpMax = catHabits.reduce((s, h) => s + (h.xp||10), 0);
    const pct = xpMax > 0 ? Math.round(xpEarned / xpMax * 100) : 0;
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px">
          <div class="cat-group-label cat-${key}" style="margin:0">${cat.label}</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${xpEarned > 0 ? `<span class="xp-badge xp-50">+${xpEarned} XP</span>` : ''}
            <span style="font-size:16px;font-weight:700;color:var(--cat-${key})">${pct}%</span>
          </div>
        </div>
        <div style="height:4px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:4px">
          <div style="height:100%;width:${pct}%;background:var(--cat-${key});border-radius:4px;transition:width 0.6s"></div>
        </div>
        <div style="font-size:11px;color:var(--muted);padding:0 2px;margin-bottom:8px">${done} / ${total} hábitos</div>
      </div>`;
  }).join('');

  // Todos los hábitos del día debajo: completados primero, luego pendientes, con cat-badge
  const allScheduled = habitsSource.filter(h => isScheduledForDate(h, dateStr));
  const _cdAll = getCompletadosForDate(dateStr);
  const allOrdenados = [
    ...allScheduled.filter(h => _cdAll.includes(h.id)),
    ...allScheduled.filter(h => !_cdAll.includes(h.id)),
  ];
  const completedIds2 = _cdAll;
  if (allOrdenados.length) {
    cl.innerHTML += allOrdenados.map(h => {
      const isDone = completedIds2.includes(h.id);
      const cat = CATEGORIES[h.category] || CATEGORIES.disciplina;
      return `
        <div class="habit-card ${isDone?'done':''}" style="cursor:default;margin-bottom:6px">
          ${habitIconHTML(h)}
          <div class="habit-info">
            <div class="habit-name">${h.name}</div>
            <div class="habit-meta">
              <span class="cat-badge cat-${h.category}">${cat.label}</span>
              <span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>
            </div>
          </div>
          <div class="check-circle" style="flex-shrink:0">${isDone?'✓':''}</div>
        </div>`;
    }).join('');
  }
}

// ── Panel de rangos ──
export function renderRangosPanel() {
  const el = document.getElementById('rangos-content');
  if (!el) return;

  const { xpTotal } = state.perfil;
  const calc = calcularNivel(xpTotal);

  const xpAcumuladoHasta = (n) => {
    let total = 0;
    for (let i = 1; i < n; i++) total += xpParaNivel(i);
    return total;
  };

  const xpTotalReal = xpTotalClase();
  const xpTotalStr = (Math.round(xpTotalReal / 1000) * 1000).toLocaleString();

  let html = '';
  CLASES.forEach((clase, ci) => {
    const isCurrentClase = ci === calc.clase;
    const isPastClase = ci < calc.clase;
    const isOpen = isCurrentClase;

    html += `
      <div class="rango-bloque ${isCurrentClase ? 'rango-activo' : ''} ${isPastClase ? 'rango-completado' : ''}">
        <div class="rango-header rango-toggle" onclick="toggleRango(this)" style="cursor:pointer">
          <span class="rango-emoji">${clase.emoji}</span>
          <div class="rango-info">
            <div class="rango-nombre" style="color:${clase.color}">${clase.nombre}</div>
            <div class="rango-sub">30 niveles · ~${xpTotalStr} XP</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
            ${isCurrentClase ? `<div class="rango-badge-actual" style="color:${clase.color};background:${clase.color}18;border-color:${clase.color}44">Nivel ${calc.nivel}</div>` : ''}
            ${isPastClase ? `<div class="rango-badge-completado" style="color:${clase.color};background:${clase.color}18;border:1px solid ${clase.color}33;border-radius:var(--radius-full);padding:2px 8px;font-size:10px">✓</div>` : ''}
            <span class="rango-chevron" style="color:var(--muted);font-size:11px;transition:transform 0.25s;display:inline-block;${isOpen ? 'transform:rotate(180deg)' : ''}">▼</span>
          </div>
        </div>
        <div class="rango-body" style="display:${isOpen ? 'block' : 'none'}">`;

    if (isCurrentClase || isPastClase) {
      html += `<div class="rango-niveles-tabla">
        <div class="rango-tabla-header">
          <span>Nivel</span><span>XP p/ subir</span><span>XP acum.</span>
        </div>`;
      for (let n = 1; n <= 30; n++) {
        const xpEste = xpParaNivel(n);
        const xpAcum = xpAcumuladoHasta(n);
        const isPast = isPastClase || (isCurrentClase && n < calc.nivel);
        const isCurrent = isCurrentClase && n === calc.nivel;
        html += `
          <div class="rango-nivel-row ${isPast?'nivel-past':''} ${isCurrent?'nivel-current':''}">
            <span class="nivel-tag" style="${
              isCurrent
                ? `background:${clase.color}28;color:${clase.color};border:1px solid ${clase.color}55`
                : isPast
                  ? `background:${clase.color}18;color:${clase.color};border:1px solid ${clase.color}33`
                  : ''
            }">
              ${isCurrent?'▹ ':isPast?'✓ ':''}Nv.${n}
            </span>
            <span>${xpEste.toLocaleString()} XP</span>
            <span style="color:var(--muted)">${xpAcum.toLocaleString()} XP</span>
          </div>`;
      }
      html += `</div>`;
    } else {
      html += `
        <div class="rango-futuro-info">
          <span>Nv.1 → Nv.30</span>
          <span>100 XP → ${xpParaNivel(30).toLocaleString()} XP</span>
        </div>`;
    }

    html += `</div></div>`;
  });

  el.innerHTML = html;
}
