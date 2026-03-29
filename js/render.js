import {
  state, today, isCompleted, isScheduledForDate, getHabitStreak,
  getTodayXP, getXPForDate, getMaxXPForDate,
  CATEGORIES, CLASES, calcularNivel, xpParaNivel, xpTotalClase, NIVELES_POR_CLASE,
} from './state.js';
import { getCompletadosForDate, getPlanificadosForDate, getXPTotalSnapshot, getXPGanadoPorCat, getXPMaxPorCat } from './habits.js';

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
  renderHistorico();
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

  // Comprobar si hoy es día perfecto
  const todayStr = today();
  const scheduledHoy = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
  const isPerfectToday = scheduledHoy.length > 0 && scheduledHoy.every(h => isCompleted(h.id, todayStr));
  const gold = isPerfectToday ? 'var(--accent2)' : '';
  const goldBorder = isPerfectToday ? 'rgba(196,168,79,0.4)' : '';
  const goldBg = isPerfectToday ? 'rgba(196,168,79,0.1)' : '';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Nombre, clase y nivel — SIEMPRE color de rango, nunca cambian con día perfecto
  const nombreEl = document.getElementById('viajero-nombre');
  if (nombreEl) {
    nombreEl.textContent = state.perfil.nombre || 'David';
    nombreEl.style.color = claseData.color;
  }
  const claseEl = document.getElementById('viajero-clase');
  if (claseEl) { claseEl.textContent = claseData.nombre; claseEl.style.color = claseData.color + '8c'; }

  // Badge nivel — siempre color de rango
  set('viajero-nivel-badge', `Nivel ${calc.nivel}`);
  const nivelBadgeEl = document.getElementById('viajero-nivel-badge');
  if (nivelBadgeEl) {
    nivelBadgeEl.style.color = claseData.color;
    nivelBadgeEl.style.borderColor = claseData.color + '44';
    nivelBadgeEl.style.background = claseData.color + '18';
  }

  // Stats
  set('viajero-stat-perfectos', diasPerfectos);
  const xpHoyEl = document.getElementById('viajero-stat-xphoy');
  if (xpHoyEl) { xpHoyEl.textContent = `+${xpHoy}`; xpHoyEl.style.color = gold || 'var(--accent)'; }
  const exitoEl = document.getElementById('viajero-stat-exito');
  if (exitoEl) { exitoEl.textContent = exitoPct + '%'; exitoEl.style.color = isPerfectToday ? 'var(--accent2)' : (exitoPct >= 100 ? 'var(--accent2)' : ''); }

  // Barra XP
  if (calc.esMaximo) {
    set('viajero-xp-label', 'Nivel máximo');
  } else {
    set('viajero-xp-label', `${calc.xpActual} / ${calc.xpSiguiente}`);
  }
  const fill = document.getElementById('viajero-xp-fill');
  if (fill) {
    fill.style.width = calc.pct + '%';
    fill.style.background = isPerfectToday
      ? 'linear-gradient(to right, #a07a1a, var(--accent2))'
      : '';
  }

  // Avatar border + animación dorada si día perfecto
  const avatarEl = document.getElementById('viajero-avatar-emoji');
  if (avatarEl) avatarEl.textContent = claseData.emoji;
  const avatarWrap = document.querySelector('.viajero-avatar-wrap');
  if (avatarWrap) {
    avatarWrap.style.borderColor = isPerfectToday ? 'var(--accent2)' : 'var(--accent)';
    // Inyectar animación dorada cuando día perfecto
    const styleId = 'avatar-perfect-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = styleId; document.head.appendChild(styleEl); }
    if (isPerfectToday) {
      styleEl.textContent = `.viajero-avatar-wrap { animation: avatarGlowGold 2s ease-in-out infinite !important; border-color: var(--accent2) !important; }
@keyframes avatarGlowGold {
  0%,100% { box-shadow: 0 0 0 0 rgba(196,168,79,0), 0 0 0 0 rgba(196,168,79,0); border-color: var(--accent2); }
  40%  { box-shadow: 0 0 0 6px rgba(196,168,79,0.25), 0 0 16px rgba(196,168,79,0.18); border-color: var(--accent2); }
  60%  { box-shadow: 0 0 0 9px rgba(196,168,79,0.12), 0 0 22px rgba(196,168,79,0.12); border-color: #e8c96e; }
}`;
    } else {
      styleEl.textContent = '';
    }
  }

  // Barrita lateral
  const viajeroCard = document.querySelector('.viajero-card');
  if (viajeroCard) viajeroCard.style.setProperty('--bar-color', isPerfectToday ? 'var(--accent2)' : 'var(--accent)');

  // Título canvas: partículas lentas normales, rápidas en día perfecto
  if (typeof window._titlePerfect !== 'undefined') window._titlePerfect = isPerfectToday;
  window._isPerfectToday = isPerfectToday;

  // Tareas — bordes, wording y botón nueva tarea en gold
  const tareasSpan = document.getElementById('tareas-titulo');
  if (tareasSpan) {
    tareasSpan.style.color = isPerfectToday ? 'var(--accent2)' : 'var(--accent)';
    tareasSpan.style.fontWeight = '700';
  }
  const tareasToggle = document.getElementById('tareas-toggle');
  if (tareasToggle) tareasToggle.style.borderColor = isPerfectToday ? 'rgba(196,168,79,0.5)' : '';
  const tareasPanel = document.getElementById('tareas-panel');
  if (tareasPanel) {
    tareasPanel.style.borderColor = isPerfectToday ? 'rgba(196,168,79,0.5)' : '';
    tareasPanel.style.borderTopColor = isPerfectToday ? 'var(--border)' : '';
  }
  const btnNueva = document.querySelector('.btn-nueva-tarea, .btn.btn-primary.btn-sm');
  if (btnNueva) {
    if (isPerfectToday) {
      btnNueva.style.background = 'var(--accent2)';
      btnNueva.style.borderColor = 'var(--accent2)';
      btnNueva.style.color = '#0d0f0a';
      btnNueva.onmouseenter = () => { btnNueva.style.boxShadow = '0 0 12px rgba(196,168,79,0.5)'; };
      btnNueva.onmouseleave = () => { btnNueva.style.boxShadow = ''; };
    } else {
      btnNueva.style.background = '';
      btnNueva.style.borderColor = '';
      btnNueva.style.color = '';
      btnNueva.onmouseenter = null;
      btnNueva.onmouseleave = null;
      btnNueva.style.boxShadow = '';
    }
  }
  // Navbar HOY gold solo cuando estamos en la vista hoy
  const navHoy = document.getElementById('nav-hoy');
  const enHoy = document.getElementById('view-hoy')?.classList.contains('active');
  if (navHoy) navHoy.style.color = (isPerfectToday && enHoy) ? 'var(--accent2)' : '';

  // Cuadrado 3en1 de HOY
  const xpHoyTriple = xpHoy;
  const xpMaxTriple = xpMaxHoy;
  const pctTriple = exitoPct;
  const completadosHoy = scheduledHoy.filter(h => isCompleted(h.id, todayStr)).length;
  const gold3 = isPerfectToday ? 'var(--accent2)' : 'var(--accent)';
  const setTriple = (id, val, color) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val; el.style.color = color || ''; }
  };
  setTriple('hoy-stat-done', `${completadosHoy}/${scheduledHoy.length}`, gold3);
  setTriple('hoy-stat-xp', `+${xpHoyTriple} XP`, gold3);
  setTriple('hoy-stat-pct', `${pctTriple}%`, gold3);
  const triple = document.getElementById('hoy-triple');
  if (triple) {
    triple.style.borderColor = isPerfectToday ? 'rgba(196,168,79,0.35)' : '';
  }
  // XP label gold
  const xpLabelEl = document.getElementById('viajero-xp-label');
  if (xpLabelEl) xpLabelEl.style.color = isPerfectToday ? 'var(--accent2)' : '';


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
  const todayStr = today();
  const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
  const allDone = scheduled.length > 0 && scheduled.every(h => isCompleted(h.id, todayStr));
  let html = `<div class="cat-tab ${active === 'all' ? (allDone ? 'active-all-perfect' : 'active-all') : ''}" onclick="window.setFilter('all')">Todos</div>`;
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
  renderLifetimeStats();
}

export function renderHistorico() {
  const activeDate = state.selectedDate || today();
  const calTitle = document.getElementById('cal-title');
  if (calTitle) {
    const d = new Date(activeDate + 'T12:00:00');
    calTitle.textContent = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  renderCalendar(activeDate);
  renderStatsForDate(activeDate);
}


function renderLifetimeStats() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const xpTotal = state.perfil.xpTotal || 0;
  const diasPerfectos = state.perfil.diasPerfectos || 0;
  const habActivos = state.habits.filter(h => !h.archivado).length;

  const keys = Object.keys(state.completions).filter(k => k !== 'updatedAt' && /^\d{4}-\d{2}-\d{2}$/.test(k));

  // Días perfectos
  const dpEl = document.getElementById('stat-dias-perfectos');
  if (dpEl) { dpEl.textContent = diasPerfectos; dpEl.style.color = window._isPerfectToday ? 'var(--accent2)' : 'var(--accent2)'; }
  set('stat-habits-count', habActivos);
  set('stat-xp-total-lifetime', xpTotal.toLocaleString('es-ES'));

  if (!keys.length) {
    ['stat-perfectos-semana','stat-perfectos-mes','stat-racha-actual','stat-racha-mejor',
     'stat-consistencia-global','stat-media-habitos','stat-total-completados',
     'stat-xp-media-dia-pill','stat-eficiencia-pill'].forEach(id => set(id,'—'));
    return;
  }

  const sorted = keys.sort();
  const firstDate = new Date(sorted[0] + 'T12:00:00');
  const todayDate = new Date(today() + 'T12:00:00');
  const diffDays = Math.max(1, Math.round((todayDate - firstDate) / (1000*60*60*24)) + 1);
  const diffWeeks = Math.max(1, diffDays / 7);
  const diffMonths = Math.max(1, diffDays / 30.44);

  set('stat-perfectos-semana', (diasPerfectos / diffWeeks).toFixed(1));
  set('stat-perfectos-mes', (diasPerfectos / diffMonths).toFixed(1));
  set('stat-xp-media-dia-pill', `${Math.round(xpTotal / diffDays)} XP / día`);

  // Racha actual y mejor racha
  let rachaActual = 0, rachaMejor = 0, rachaTemp = 0;
  const todayStr = today();
  [...sorted].reverse().forEach((k, i) => {
    const d = state.completions[k];
    if (!d || Array.isArray(d)) return;
    const completados = d.completados?.length || 0;
    const planificados = d.planificados?.length || 0;
    const perfecto = planificados > 0 && completados === planificados;
    if (i === 0 && perfecto) rachaActual = 1;
    else if (i === 0) rachaActual = 0;
  });
  sorted.forEach(k => {
    const d = state.completions[k];
    if (!d || Array.isArray(d)) { rachaTemp = 0; return; }
    const completados = d.completados?.length || 0;
    const planificados = d.planificados?.length || 0;
    const perfecto = planificados > 0 && completados === planificados;
    if (perfecto) { rachaTemp++; rachaMejor = Math.max(rachaMejor, rachaTemp); }
    else rachaTemp = 0;
  });
  set('stat-racha-actual', rachaActual);
  set('stat-racha-mejor', rachaMejor);

  // Consistencia global, total completados, media hábitos
  let ratioSum = 0, ratioDays = 0, habitosSum = 0, habitosDays = 0, totalCompletados = 0;
  // XP por categoría
  const xpCatSum = {}; const xpCatDays = {};
  // Consistencia por categoría: completados vs planificados
  const catComp = {}, catPlan = {};
  // Rendimiento por día de semana (0=L..6=D)
  const diaSum = [0,0,0,0,0,0,0], diaDays = [0,0,0,0,0,0,0];

  keys.forEach(k => {
    const d = state.completions[k];
    if (!d || Array.isArray(d)) return;
    const completados = Array.isArray(d.completados) ? d.completados.length : 0;
    const planificados = Array.isArray(d.planificados) ? d.planificados.length : 0;
    totalCompletados += completados;
    if (planificados > 0) {
      ratioSum += completados / planificados;
      ratioDays++;
      habitosSum += completados;
      habitosDays++;
    }
    // XP por cat
    if (d.xpGanadoPorCat) {
      Object.entries(d.xpGanadoPorCat).forEach(([cat, xp]) => {
        xpCatSum[cat] = (xpCatSum[cat] || 0) + xp;
        xpCatDays[cat] = (xpCatDays[cat] || 0) + 1;
      });
    }
    // Consistencia por cat usando allHabits para ese día
    if (Array.isArray(d.planificados) && Array.isArray(d.completados)) {
      const habsDelDia = state.allHabits.filter(h => d.planificados.includes(h.id));
      habsDelDia.forEach(h => {
        const cat = h.category || 'disciplina';
        catPlan[cat] = (catPlan[cat] || 0) + 1;
        if (d.completados.includes(h.id)) catComp[cat] = (catComp[cat] || 0) + 1;
      });
    }
    // Día de semana (JS: 0=D, ajustar a L=0)
    const dow = new Date(k + 'T12:00:00').getDay();
    const idx = dow === 0 ? 6 : dow - 1;
    if (planificados > 0) { diaSum[idx] += completados / planificados; diaDays[idx]++; }
  });

  const consistGlobal = ratioDays > 0 ? Math.round(ratioSum / ratioDays * 100) : 0;
  set('stat-consistencia-global', consistGlobal + '%');
  set('stat-eficiencia-pill', consistGlobal + '% eficiencia');
  set('stat-media-habitos', habitosDays > 0 ? (habitosSum / habitosDays).toFixed(1) : '—');
  set('stat-total-completados', totalCompletados.toLocaleString('es-ES'));

  // Barras últimos 7 días reales
  const diasGrid = document.getElementById('stat-dias-semana');
  if (diasGrid) {
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today() + 'T12:00:00');
      d.setDate(d.getDate() - i);
      const dateStr7 = d.toISOString().split('T')[0];
      const dayData = state.completions[dateStr7];
      let pct7 = 0;
      if (dayData && !Array.isArray(dayData)) {
        const comp = dayData.completados?.length || 0;
        const plan = dayData.planificados?.length || 0;
        pct7 = plan > 0 ? comp / plan : 0;
      } else if (dateStr7 === today()) {
        const sched7 = state.habits.filter(h => !h.archivado && isScheduledForDate(h, dateStr7));
        const done7 = sched7.filter(h => isCompleted(h.id, dateStr7)).length;
        pct7 = sched7.length > 0 ? done7 / sched7.length : 0;
      }
      const dayName = d.toLocaleDateString('es-ES', {weekday:'short'}).slice(0,1).toUpperCase();
      last7.push({ pct: pct7, label: dayName, dateStr: dateStr7 });
    }
    const dias = diasGrid.querySelectorAll('.sdia');
    const labels = diasGrid.querySelectorAll('.sdia-name');
    const bars = diasGrid.querySelectorAll('.sdia-bar');
    const maxPct7 = Math.max(...last7.map(d => d.pct), 0.01);
    last7.forEach((d, i) => {
      if (bars[i]) {
        const h = Math.max(4, (d.pct / maxPct7) * 100);
        const op = 0.2 + (d.pct / maxPct7) * 0.65;
        bars[i].style.height = h + '%';
        bars[i].style.background = d.dateStr === today()
          ? `rgba(196,168,79,${op})` : `rgba(143,179,57,${op})`;
      }
      if (labels[i]) labels[i].textContent = d.label;
    });
  }

  // Consistencia por categoría
  const CATS = {
    fisico:{label:'Físico',color:'#e05c5c'},
    disciplina:{label:'Disciplina',color:'#5c8ae0'},
    energia:{label:'Energía',color:'#8fb339'},
    inteligencia:{label:'Inteligencia',color:'#c4a84f'},
    identidad:{label:'Identidad',color:'#a05ce0'},
  };
  const catConsEl = document.getElementById('stat-consistencia-cats');
  if (catConsEl) {
    const entries = Object.entries(CATS).map(([k, c]) => {
      const pct = catPlan[k] > 0 ? Math.round((catComp[k]||0) / catPlan[k] * 100) : 0;
      return { k, c, pct };
    }).sort((a, b) => b.pct - a.pct);
    catConsEl.innerHTML = entries.map(({k, c, pct}) =>
      `<div class="scat-row">
        <div class="scat-pill" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.label}</div>
        <div class="scat-bar-wrap"><div class="scat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
        <div class="scat-val" style="color:${c.color}">${pct}%</div>
      </div>`
    ).join('');
  }

  // XP medio diario por categoría
  const xpCatEl = document.getElementById('stat-xp-cats');
  if (xpCatEl) {
    const entries = Object.entries(CATS).map(([k, c]) => {
      const media = xpCatDays[k] > 0 ? Math.round((xpCatSum[k]||0) / diffDays) : 0;
      return { k, c, media };
    }).sort((a, b) => b.media - a.media);
    const maxXP = Math.max(...entries.map(e => e.media), 1);
    xpCatEl.innerHTML = entries.map(({k, c, media}) =>
      `<div class="scat-row">
        <div class="scat-pill" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.label}</div>
        <div class="scat-bar-wrap"><div class="scat-bar-fill" style="width:${Math.round(media/maxXP*100)}%;background:${c.color}"></div></div>
        <div class="scat-val" style="color:${c.color}">${media} xp</div>
      </div>`
    ).join('');
  }
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
  // XP del día: usar snapshot si existe (inmutable), sino calcular live
  const xpSnap = getXPTotalSnapshot(dateStr);
  const xp = (xpSnap !== null && !isToday) ? xpSnap : getXPForDate(dateStr);
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
  const isPerfectStats = total > 0 && done === total;
  const goldColor = isPerfectStats ? 'var(--accent2)' : '';
  const setGold = (id, val) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val; el.style.color = goldColor; }
  };
  setGold('stat-day-done', `${done}/${total}`);
  setGold('stat-day-xp', `+${xp} XP`);
  setGold('stat-day-pct', `${pct}%`);

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
      noReg.innerHTML = '<div style="font-size:32px;margin-bottom:8px">🌱</div><div style="font-size:14px;color:var(--muted);font-style:italic">Día no registrado</div>';
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
  const isPerfectDay = scheduledHabits.length > 0 && scheduledHabits.every(h => completedIds.includes(h.id));
  sl.classList.toggle('perfect-day', isPerfectDay);
  const isToday = dateStr === today();
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
            ${isToday ? `<span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>` : ''}
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
  const isToday = dateStr === today();
  const completedIds = getCompletadosForDate(dateStr);
  // Día perfecto en stats: añadir clase al contenedor de categorías
  const allDoneStats = habitsSource.length > 0 && habitsSource.every(h => completedIds.includes(h.id));
  cl.classList.toggle('perfect-day-cats', allDoneStats);
  // Snapshot XP por categoría para días pasados
  const snapGanado = !isToday ? getXPGanadoPorCat(dateStr) : null;
  const snapMax    = !isToday ? getXPMaxPorCat(dateStr)    : null;

  cl.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const catHabits = habitsSource.filter(h => h.category === key && isScheduledForDate(h, dateStr));
    if (!catHabits.length && !snapMax?.[key]) return '';
    const done = catHabits.filter(h => completedIds.includes(h.id)).length;
    const total = catHabits.length;
    // Usar snapshot si existe, sino calcular live
    const xpEarned = snapGanado ? (snapGanado[key] || 0) : catHabits.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp||10), 0);
    const xpMax    = snapMax    ? (snapMax[key]    || 0) : catHabits.reduce((s, h) => s + (h.xp||10), 0);
    if (xpMax === 0 && !total) return '';
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
              ${isToday ? `<span class="xp-badge xp-${h.xp}">+${h.xp} XP</span>` : ''}
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
