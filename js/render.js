import {
  state, today, isCompleted, isScheduledForDate, getHabitStreak,
  getTodayXP, getXPForDate, getMaxXPForDate,
  CATEGORIES, CLASES, calcularNivel, xpParaNivel, xpTotalClase, NIVELES_POR_CLASE,
} from './state.js';

export function renderAll() {
  renderDate();
  renderWeek();
  renderViajero();
  renderXPBar();
  renderProgress();
  renderTareas();
  renderCatTabs();
  renderHabits();
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
  set('viajero-clase', claseData.nombre);
  set('viajero-nivel-badge', `Nivel ${calc.nivel}`);
  set('viajero-stat-perfectos', diasPerfectos);
  set('viajero-stat-xphoy', `+${xpHoy}`);
  set('viajero-stat-exito', exitoPct + '%');

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
    // Día perfecto: todos los hábitos programados completados
    const scheduled = state.habits.filter(h => isScheduledForDate(h, ds));
    const isPerfect = scheduled.length > 0 && scheduled.every(h => (state.completions[ds] || []).includes(h.id));
    html += `
      <div class="day-cell">
        <div class="day-name">${days[d.getDay()]}</div>
        <div class="day-num ${isToday ? 'today' : ''} ${isPast && isPerfect ? 'past-perfect' : isPast && hasDone ? 'past-done' : ''}">${d.getDate()}</div>
        <div class="day-dot ${isPerfect ? 'perfect' : hasDone ? 'filled' : ''}"></div>
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
  const todayHabits = state.habits.filter(h => isScheduledForDate(h, todayStr));
  const total = todayHabits.length;
  const done = todayHabits.filter(h => isCompleted(h.id, todayStr)).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const text = document.getElementById('progress-text');
  const bar = document.getElementById('progress-bar');
  if (text) text.textContent = total ? `${done} / ${total} · ${pct}%` : '0 / 0';
  if (bar) bar.style.width = pct + '%';
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
  let scheduled = state.habits.filter(h => isScheduledForDate(h, todayStr));
  if (state.activeFilter !== 'all') scheduled = scheduled.filter(h => h.category === state.activeFilter);

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
  const sorted = [...state.habits].sort((a, b) => (catOrder.indexOf(a.category) ?? 99) - (catOrder.indexOf(b.category) ?? 99));
  let html = '', lastCat = null;
  sorted.forEach(h => {
    if (h.category !== lastCat) {
      const cat = CATEGORIES[h.category];
      if (cat) html += `<div class="cat-group-label cat-${h.category}">${cat.label}</div>`;
      lastCat = h.category;
    }
    const days = h.days && h.days.length > 0
      ? h.days.map(d => ({ lun:'L',mar:'M',mie:'X',jue:'J',vie:'V',sab:'S',dom:'D' }[d] || d)).join(' ')
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
    const completedIds = state.completions[dateStr] || [];
    const scheduled = state.habits.filter(h => isScheduledForDate(h, dateStr));
    const hasDone = completedIds.length > 0;
    const isPerfect = scheduled.length > 0 && scheduled.every(h => completedIds.includes(h.id));
    html += `
      <div class="cal-day ${isToday?'cal-today':''} ${isSelected?'cal-selected':''} ${isPerfect&&!isFuture?'cal-perfect':hasDone&&!isFuture?'cal-has-done':''} ${isFuture?'cal-future':''}"
           onclick="${isFuture?'':` window.selectDate('${dateStr}')`}">
        ${day}
        ${(hasDone||isPerfect)&&!isFuture?'<div class="cal-dot"></div>':''}
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

  const diasPerfectos = state.perfil.diasPerfectos;
  const xpHoyStats = getXPForDate(today());
  const xpMaxHoyStats = getMaxXPForDate(today());
  const exitoPct = xpMaxHoyStats > 0 ? Math.round(xpHoyStats / xpMaxHoyStats * 100) : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-dias-perfectos', diasPerfectos);
  set('stat-total-xp', `+${xpHoyStats}`);
  set('stat-exito-xp', exitoPct + '%');
  set('stat-habits-count', state.habits.length);
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

function renderCatStats(dateStr) {
  const cl = document.getElementById('cat-stats-list');
  if (!cl) return;
  const completedIds = state.completions[dateStr] || [];
  cl.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const catHabits = state.habits.filter(h => h.category === key && isScheduledForDate(h, dateStr));
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
  const allScheduled = state.habits.filter(h => isScheduledForDate(h, dateStr));
  const allOrdenados = [
    ...allScheduled.filter(h => (state.completions[dateStr]||[]).includes(h.id)),
    ...allScheduled.filter(h => !(state.completions[dateStr]||[]).includes(h.id)),
  ];
  const completedIds2 = state.completions[dateStr] || [];
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
            ${isCurrentClase ? `<div class="rango-badge-actual">Nivel ${calc.nivel}</div>` : ''}
            ${isPastClase ? '<div class="rango-badge-completado">✓</div>' : ''}
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
            <span class="nivel-tag" style="${isCurrent?`background:${clase.color};color:#0d0f0a`:isPast?`color:${clase.color}`:''}">
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
