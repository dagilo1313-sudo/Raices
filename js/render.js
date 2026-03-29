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
  // Ratio basado en XP ganado vs XP máximo
  const xpRatio = xpMax > 0 ? xpGanado / xpMax : 0;
  // Sin completion o 0 completados → hasRecord=false
  const hasRecord = scheduled.length > 0 && (hasDone || xpMax > 0);
  // Estados por ratio XP
  const isGray      = hasRecord && !hasDone;                              // registrado pero 0 completados
  const isGrayDot   = hasDone && xpRatio < 0.5;                          // <50% XP — gris+punto gris
  const isGrayGreen = !isPerfect && hasDone && xpRatio >= 0.5 && xpRatio < 0.8; // 50-79% — gris+punto verde
  const isGood      = !isPerfect && hasDone && xpRatio >= 0.8;            // 80-99% — verde+punto verde
  return { hasDone, isPerfect, isGood, isGray, isGrayDot, isGrayGreen, completedIds, scheduled };
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
    const { hasDone, isPerfect, isGood, isGray, isGrayDot, isGrayGreen } = getDayState(ds, habSrcWeek);

    // Clases del círculo del día
    let numClass = isToday ? 'today' : '';
    if (isPast || isToday) {
      if (isPerfect)         numClass += ' day-golden';
      else if (isGood)       numClass += ' day-green';
      else if (isGrayGreen)  numClass += ' day-gray';
      else if (isGrayDot)    numClass += ' day-gray';
      else if (isGray)       numClass += ' day-gray';
    }

    // Clase del punto (sin punto si isGray — 0 completados)
    let dotClass = '';
    if (isPerfect)        dotClass = 'perfect';
    else if (isGood)      dotClass = 'filled';
    else if (isGrayGreen) dotClass = 'filled';
    else if (isGrayDot)   dotClass = 'gray';
    // isGray → sin punto

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

  const xpHoy = getTodayXP();
  const xpMax = getMaxXPForDate(todayStr);
  const xpPct = xpMax > 0 ? Math.round(xpHoy / xpMax * 100) : 0;

  const color = isPerfect ? 'var(--accent2)' : 'var(--accent)';
  const barColor = isPerfect ? 'linear-gradient(to right,#c4a84f,#e8c96e)' : 'var(--accent)';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setColor = (id, c) => { const el = document.getElementById(id); if (el) el.style.color = c; };
  const setBg = (id, bg) => { const el = document.getElementById(id); if (el) el.style.background = bg; };

  // Hábitos card
  set('hoy-sc-hab-val', total ? `${done}/${total}` : '0/0');
  set('hoy-sc-hab-pct', `${pct}% completado`);
  setColor('hoy-sc-hab-val', color);
  setColor('hoy-sc-hab-pct', color);
  setBg('hoy-sc-bar-lat-hab', isPerfect ? '#c4a84f' : 'var(--accent)');
  setBg('hoy-sc-hab-bar', barColor);
  const habBar = document.getElementById('hoy-sc-hab-bar');
  if (habBar) habBar.style.width = pct + '%';

  // XP card
  set('hoy-sc-xp-val', `+${xpHoy}`);
  set('hoy-sc-xp-pct', `${xpPct}% del máximo`);
  setColor('hoy-sc-xp-val', color);
  setColor('hoy-sc-xp-pct', color);
  setBg('hoy-sc-bar-lat-xp', isPerfect ? '#c4a84f' : 'var(--accent)');
  setBg('hoy-sc-xp-bar', barColor);
  const xpBar = document.getElementById('hoy-sc-xp-bar');
  if (xpBar) xpBar.style.width = xpPct + '%';
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
    const { hasDone, isPerfect, isGood, isGray, isGrayDot, isGrayGreen } = getDayState(dateStr, habSrc);

    let stateClass = '';
    let dotColor = '';
    if (!isFuture) {
      if (isPerfect)        { stateClass = 'cal-golden'; dotColor = 'gold'; }
      else if (isGood)      { stateClass = 'cal-green';  dotColor = 'green'; }
      else if (isGrayGreen) { stateClass = 'cal-gray';   dotColor = 'green'; }
      else if (isGrayDot)   { stateClass = 'cal-gray';   dotColor = 'gray'; }
      else if (isGray)      { stateClass = 'cal-gray'; } // sin punto
    }

    // Punto: solo si hay xp ganado (no para isGray=0 completados)
    const dotHtml = (!isFuture && dotColor)
      ? `<div class="cal-dot cal-dot-${dotColor}"></div>`
      : '';

    html += `
      <div class="cal-day ${isToday?'cal-today':''} ${isSelected?'cal-selected':''} ${stateClass} ${isFuture?'cal-future':''}"
           onclick="${isFuture?'':` window.selectDate('${dateStr}')`}">
        <div class="cal-day-inner">${day}</div>
        ${dotHtml}
      </div>`;
  }
  grid.innerHTML = html;
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
  const habActivos = state.habits.filter(h => !h.archivado).length;
  const nivelActual = state.perfil.nivel || 1;
  const claseIdx = state.perfil.clase || 0;

  set('stat-habits-count', habActivos);
  set('stat-xp-total-lifetime', xpTotal.toLocaleString('es-ES'));
  set('stat-nivel-actual', 'Nv.' + nivelActual);

  // Rango debajo del nivel
  const CLASES_LABELS = ['Iniciado','Aprendiz','Guardián','Maestro','Sabio','Eterno'];
  const CLASES_COLORS = ['#6b7560','#8fb339','#5c8ae0','#c4a84f','#a05ce0','#e05c5c'];
  const claseLabel = CLASES_LABELS[claseIdx] || 'Iniciado';
  const claseColor = CLASES_COLORS[claseIdx] || '#6b7560';
  const rangoEl = document.getElementById('stat-rango-actual');
  const nivelEl = document.getElementById('stat-nivel-actual');
  if (rangoEl) { rangoEl.textContent = claseLabel; rangoEl.style.color = claseColor; }
  if (nivelEl) { nivelEl.style.color = claseColor; }

  const keys = Object.keys(state.completions).filter(k => k !== 'updatedAt' && /^\d{4}-\d{2}-\d{2}$/.test(k));
  const sorted = keys.sort();

  if (!keys.length) {
    ['stat-dias-perfectos','stat-perf-racha-actual','stat-perf-racha-mejor',
     'stat-perfectos-semana','stat-perfectos-mes',
     'stat-dias-buenos','stat-buenos-racha-actual','stat-buenos-racha-mejor',
     'stat-buenos-semana','stat-buenos-mes',
     'stat-consistencia-global','stat-media-habitos','stat-total-completados',
     'stat-xp-media-dia-pill','stat-eficiencia-big',
     'stat-dias-raices','stat-mejor-dia','stat-peor-dia','stat-xp-perdido'].forEach(id => set(id,'—'));
    return;
  }

  const firstDate = new Date(sorted[0] + 'T12:00:00');
  const todayDate = new Date(today() + 'T12:00:00');
  const diffDays = Math.max(1, Math.round((todayDate - firstDate) / (1000*60*60*24)) + 1);
  const diffWeeks = Math.max(1, diffDays / 7);
  const diffMonths = Math.max(1, diffDays / 30.44);

  // Ventanas temporales para tendencia
  const hoy = new Date(today() + 'T12:00:00');
  const hace7str  = (() => { const d = new Date(hoy); d.setDate(d.getDate()-7);  return d.toISOString().split('T')[0]; })();
  const hace14str = (() => { const d = new Date(hoy); d.setDate(d.getDate()-14); return d.toISOString().split('T')[0]; })();
  const hace21str = (() => { const d = new Date(hoy); d.setDate(d.getDate()-21); return d.toISOString().split('T')[0]; })();
  const hace28str = (() => { const d = new Date(hoy); d.setDate(d.getDate()-28); return d.toISOString().split('T')[0]; })();

  // Acumuladores
  let diasPerfectos=0, diasBuenos=0;
  let rachaPerfTemp=0, rachaPerfMejor=0;
  let rachaBuenosTemp=0, rachaBuenosMejor=0;
  let ratioSum=0, ratioDays=0, habitosSum=0, habitosDays=0, totalCompletados=0;
  let xpEficSum=0, xpEficDays=0;
  let xpTotalLost=0;

  // Tendencia: semana actual vs media 3 anteriores
  let habSemActual=0, habDiasSemActual=0;
  let habSem1=0, habDiasSem1=0, habSem2=0, habDiasSem2=0, habSem3=0, habDiasSem3=0;
  let xpSemActual=0, xpDiasSemActual=0;
  let xpSem1=0, xpDiasSem1=0, xpSem2=0, xpDiasSem2=0, xpSem3=0, xpDiasSem3=0;

  const xpCatSum={}, xpCatDays={};
  const catComp={}, catPlan={};
  const diaSum=[0,0,0,0,0,0,0], diaDays=[0,0,0,0,0,0,0];

  // Por hábito: completados y planificados
  const habComp={}, habPlan={};

  sorted.forEach(k => {
    const d = state.completions[k];
    if (!d || Array.isArray(d)) { rachaPerfTemp=0; rachaBuenosTemp=0; return; }

    const completados = Array.isArray(d.completados) ? d.completados.length : 0;
    const planificados = Array.isArray(d.planificados) ? d.planificados.length : 0;
    totalCompletados += completados;

    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    const xpRatio = xpM > 0 ? xpG/xpM : 0;
    xpTotalLost += (xpM - xpG);

    const esPerfecto = planificados>0 && completados===planificados;
    const esBueno = xpRatio >= 0.8;

    if (esPerfecto) { diasPerfectos++; rachaPerfTemp++; rachaPerfMejor=Math.max(rachaPerfMejor,rachaPerfTemp); }
    else rachaPerfTemp=0;
    if (esBueno) { diasBuenos++; rachaBuenosTemp++; rachaBuenosMejor=Math.max(rachaBuenosMejor,rachaBuenosTemp); }
    else rachaBuenosTemp=0;

    if (planificados>0) {
      const ratio = completados/planificados;
      ratioSum+=ratio; ratioDays++;
      habitosSum+=completados; habitosDays++;
      xpEficSum+=xpRatio; xpEficDays++;

      // Tendencia hábitos por ventana
      if (k>=hace7str) { habSemActual+=ratio; habDiasSemActual++; xpSemActual+=xpRatio; xpDiasSemActual++; }
      else if (k>=hace14str) { habSem1+=ratio; habDiasSem1++; xpSem1+=xpRatio; xpDiasSem1++; }
      else if (k>=hace21str) { habSem2+=ratio; habDiasSem2++; xpSem2+=xpRatio; xpDiasSem2++; }
      else if (k>=hace28str) { habSem3+=ratio; habDiasSem3++; xpSem3+=xpRatio; xpDiasSem3++; }
    }

    if (d.xpGanadoPorCat) {
      Object.entries(d.xpGanadoPorCat).forEach(([cat,xp]) => {
        xpCatSum[cat]=(xpCatSum[cat]||0)+xp; xpCatDays[cat]=(xpCatDays[cat]||0)+1;
      });
    }

    if (Array.isArray(d.planificados) && Array.isArray(d.completados)) {
      const habsDelDia = state.allHabits.filter(h => d.planificados.includes(h.id));
      habsDelDia.forEach(h => {
        const cat = h.category||'disciplina';
        catPlan[cat]=(catPlan[cat]||0)+1;
        if (d.completados.includes(h.id)) catComp[cat]=(catComp[cat]||0)+1;
        // Por hábito
        habPlan[h.id]=(habPlan[h.id]||0)+1;
        if (d.completados.includes(h.id)) habComp[h.id]=(habComp[h.id]||0)+1;
      });
    }

    const dow = new Date(k+'T12:00:00').getDay();
    const idx = dow===0 ? 6 : dow-1;
    if (planificados>0) { diaSum[idx]+=completados/planificados; diaDays[idx]++; }
  });

  // Rachas actuales (desde el final)
  let rachaPerfActual=0, rachaBuenosActual=0;
  let perfStop=false, buenosStop=false;
  for (let i=sorted.length-1; i>=0; i--) {
    const k=sorted[i];
    const d=state.completions[k];
    if (!d||Array.isArray(d)) break;
    const comp=Array.isArray(d.completados)?d.completados.length:0;
    const plan=Array.isArray(d.planificados)?d.planificados.length:0;
    const xpG=d.xpGanadoPorCat?Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0):0;
    const xpM=d.xpMaxPorCat?Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0):0;
    if (!perfStop) { if(plan>0&&comp===plan) rachaPerfActual++; else perfStop=true; }
    if (!buenosStop) { if(xpM>0&&xpG/xpM>=0.8) rachaBuenosActual++; else buenosStop=true; }
    if (perfStop&&buenosStop) break;
  }

  // ── Set valores ──
  set('stat-dias-perfectos', diasPerfectos);
  set('stat-perf-racha-actual', rachaPerfActual);
  set('stat-perf-racha-mejor', rachaPerfMejor);
  set('stat-perfectos-semana', (diasPerfectos/diffWeeks).toFixed(1));
  set('stat-perfectos-mes', (diasPerfectos/diffMonths).toFixed(1));
  set('stat-dias-buenos', diasBuenos);
  set('stat-buenos-racha-actual', rachaBuenosActual);
  set('stat-buenos-racha-mejor', rachaBuenosMejor);
  set('stat-buenos-semana', (diasBuenos/diffWeeks).toFixed(1));
  set('stat-buenos-mes', (diasBuenos/diffMonths).toFixed(1));

  // Badges de total
  const perfBadge = document.getElementById('stat-dias-perfectos-badge');
  if (perfBadge) perfBadge.textContent = diasPerfectos + ' total';
  const buenosBadge = document.getElementById('stat-dias-buenos-badge');
  if (buenosBadge) buenosBadge.textContent = diasBuenos + ' total';

  // Puntos de los últimos 7 días
  const renderDots = (containerId, dotColor, dotEmptyColor, checkFn) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today()+'T12:00:00');
      d.setDate(d.getDate()-i);
      const ds = d.toISOString().split('T')[0];
      const dayData = state.completions[ds];
      const active = checkFn(ds, dayData);
      const dot = document.createElement('div');
      dot.className = 'rc-dot';
      dot.style.background = active ? dotColor : '#1a1f10';
      dot.style.border = active ? 'none' : '1px solid #2a3020';
      dot.title = d.toLocaleDateString('es-ES', {weekday:'short', day:'numeric'});
      dots.push(dot);
    }
    const lbl = document.createElement('div');
    lbl.className = 'rc-dot-lbl';
    lbl.textContent = 'últimos 7 días';
    el.innerHTML = '';
    dots.forEach(d => el.appendChild(d));
    el.appendChild(lbl);
  };

  // Perfectos: 100% hábitos completados
  renderDots('rc-dots-perf', 'var(--accent2)', '#1a1f10', (ds, dayData) => {
    if (!dayData || Array.isArray(dayData)) return false;
    const comp = Array.isArray(dayData.completados) ? dayData.completados.length : 0;
    const plan = Array.isArray(dayData.planificados) ? dayData.planificados.length : 0;
    return plan > 0 && comp === plan;
  });

  // Buenos: ≥80% XP
  renderDots('rc-dots-buenos', 'var(--accent)', '#1a1f10', (ds, dayData) => {
    if (!dayData || Array.isArray(dayData)) {
      if (ds === today()) {
        const sched = state.habits.filter(h => !h.archivado && isScheduledForDate(h, ds));
        const xpG = sched.filter(h => isCompleted(h.id, ds)).reduce((s,h)=>s+(h.xp||10),0);
        const xpM = sched.reduce((s,h)=>s+(h.xp||10),0);
        return xpM > 0 && xpG/xpM >= 0.8;
      }
      return false;
    }
    const xpG = dayData.xpGanadoPorCat ? Object.values(dayData.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = dayData.xpMaxPorCat    ? Object.values(dayData.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    return xpM > 0 && xpG/xpM >= 0.8;
  });

  const consistGlobal = ratioDays>0 ? Math.round(ratioSum/ratioDays*100) : 0;
  const xpEficGlobal  = xpEficDays>0 ? Math.round(xpEficSum/xpEficDays*100) : 0;
  set('stat-consistencia-global', consistGlobal+'%');
  set('stat-eficiencia-big', xpEficGlobal+'%');
  set('stat-eficiencia-pill', xpEficGlobal+'% eficiencia');

  // Eficiencia XP últimos 30 días (ventana deslizante)
  const hace30str = (() => { const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; })();
  let xpEfic30Sum=0, xpEfic30Days=0;
  sorted.forEach(k => {
    if (k < hace30str) return; // solo últimos 30 días
    const d = state.completions[k];
    if (!d || Array.isArray(d)) return;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    if (xpM > 0) { xpEfic30Sum += xpG/xpM; xpEfic30Days++; }
  });
  const xpEfic30 = xpEfic30Days>0 ? Math.round(xpEfic30Sum/xpEfic30Days*100) : xpEficGlobal;
  set('stat-eficiencia-30d', xpEfic30+'%');
  set('stat-media-habitos', habitosDays>0 ? (habitosSum/habitosDays).toFixed(1) : '—');
  set('stat-total-completados', totalCompletados.toLocaleString('es-ES'));
  set('stat-xp-media-dia-pill', Math.round(xpTotal/diffDays).toLocaleString('es-ES'));
  // XP por día últimos 30 días
  let xp30Sum=0, xp30Count=0;
  sorted.forEach(k => {
    if (k < hace30str) return;
    const d = state.completions[k];
    if (!d||Array.isArray(d)) return;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    xp30Sum += xpG; xp30Count++;
  });
  const xpDia30 = Math.round(xp30Sum / Math.min(30, diffDays));
  set('stat-xp-dia-30d', xpDia30.toLocaleString('es-ES'));

  // Tendencia hábitos
  const setTrend = (elId, semActualSum, semActualDays, s1sum, s1d, s2sum, s2d, s3sum, s3d) => {
    const el = document.getElementById(elId);
    if (!el) return;
    const actual = semActualDays>0 ? Math.round(semActualSum/semActualDays*100) : null;
    const prevDays = s1d+s2d+s3d;
    const prevSum  = s1sum+s2sum+s3sum;
    const prev = prevDays>0 ? Math.round(prevSum/prevDays*100) : null;
    if (actual===null || prev===null) { el.style.display='none'; return; }
    const delta = actual-prev;
    el.style.display='';
    if (delta>0)       { el.textContent=`↑ +${delta}%`; el.className='snarr-trend up'; }
    else if (delta<0)  { el.textContent=`↓ ${delta}%`;  el.className='snarr-trend dn'; }
    else               { el.textContent='= sin cambio';  el.className='snarr-trend flat'; }
  };
  setTrend('stat-tendencia-hab',
    habSemActual, habDiasSemActual,
    habSem1, habDiasSem1, habSem2, habDiasSem2, habSem3, habDiasSem3);
  setTrend('stat-tendencia-xp',
    xpSemActual, xpDiasSemActual,
    xpSem1, xpDiasSem1, xpSem2, xpDiasSem2, xpSem3, xpDiasSem3);

  // Gráfica XP últimos 7 días — % real (no normalizado)
  const diasGrid = document.getElementById('stat-dias-semana');
  if (diasGrid) {
    const last7=[];
    for (let i=6; i>=0; i--) {
      const d=new Date(today()+'T12:00:00'); d.setDate(d.getDate()-i);
      const ds=d.toISOString().split('T')[0];
      const dayData=state.completions[ds];
      let ratio=0;
      if (dayData&&!Array.isArray(dayData)&&dayData.xpMaxPorCat) {
        const g=Object.values(dayData.xpGanadoPorCat||{}).reduce((s,v)=>s+v,0);
        const m=Object.values(dayData.xpMaxPorCat||{}).reduce((s,v)=>s+v,0);
        ratio=m>0?g/m:0;
      } else if (ds===today()) {
        const sc=state.habits.filter(h=>!h.archivado&&isScheduledForDate(h,ds));
        const xg=sc.filter(h=>isCompleted(h.id,ds)).reduce((s,h)=>s+(h.xp||10),0);
        const xm=sc.reduce((s,h)=>s+(h.xp||10),0);
        ratio=xm>0?xg/xm:0;
      }
      last7.push({ ratio, label: d.toLocaleDateString('es-ES',{weekday:'short'}).slice(0,1).toUpperCase() });
    }
    const bars=diasGrid.querySelectorAll('.sdia-bar');
    const labels=diasGrid.querySelectorAll('.sdia-name');
    last7.forEach((d,i)=>{
      if (bars[i]) {
        const h=Math.max(4, d.ratio*100); // % real, no normalizado
        bars[i].style.height=h+'%';
        const r=Math.round(143+(196-143)*d.ratio);
        const g=Math.round(179+(168-179)*d.ratio);
        const b=Math.round(57+(79-57)*d.ratio);
        const op=0.35+d.ratio*0.65;
        bars[i].style.background=`rgba(${r},${g},${b},${op})`;
      }
      if (labels[i]) labels[i].textContent=d.label;
    });
  }

  // Insights: 2 mejores + 2 peores hábitos por % completado
  const insightsEl = document.getElementById('stat-insights-hab');
  if (insightsEl) {
    const habStats = state.habits.filter(h=>!h.archivado && habPlan[h.id]>0).map(h => ({
      name: h.name,
      pct: Math.round((habComp[h.id]||0)/habPlan[h.id]*100),
      id: h.id
    })).sort((a,b)=>b.pct-a.pct);
    const top2 = habStats.slice(0,2);
    const bot2 = habStats.slice(-2).reverse();
    const makeRow = (h, isGood) => `
      <div class="insight-row">
        <div class="insight-left">
          <div class="insight-dot" style="background:${isGood?'var(--accent)':'#e05c5c'}"></div>
          <div>
            <div class="insight-lbl">${isGood?'Más consistente':'Más abandonado'}</div>
            <div class="insight-name">${h.name}</div>
          </div>
        </div>
        <div>
          <div class="insight-val" style="color:${isGood?'var(--accent)':'#e05c5c'}">${h.pct}%</div>
          <div class="insight-sub">de los días</div>
        </div>
      </div>`;
    insightsEl.innerHTML = top2.map(h=>makeRow(h,true)).join('') + (habStats.length>2 ? '<div style="height:1px;background:var(--border);margin:0"></div>' : '') + bot2.map(h=>makeRow(h,false)).join('');
  }

  // Hábitos en riesgo: activos que llevan MÁS DE 7 días sin completarse
  const riesgoCard = document.getElementById('stat-riesgo-card');
  const riesgoList = document.getElementById('stat-riesgo-list');
  if (riesgoCard && riesgoList) {
    const habRiesgo = state.habits.filter(h => !h.archivado).map(h => {
      // Contar días consecutivos sin completar desde hoy hacia atrás
      let diasSin = 0;
      for (let i = 0; i <= 90; i++) {
        const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-i);
        const ds = d.toISOString().split('T')[0];
        if (isCompleted(h.id, ds)) break; // encontrado → parar
        diasSin = i;
      }
      return { ...h, diasSin };
    }).filter(h => h.diasSin > 7) // solo los que llevan MÁS de 7 días
      .sort((a,b) => b.diasSin - a.diasSin);

    if (habRiesgo.length > 0) {
      riesgoCard.style.display = '';
      riesgoList.innerHTML = habRiesgo.map(h => `
        <div class="riesgo-row">
          <div class="riesgo-left">
            <div class="riesgo-dot"></div>
            <div class="riesgo-name">${h.name}</div>
          </div>
          <div class="riesgo-dias">${h.diasSin}d sin completar</div>
        </div>`).join('');
    } else {
      riesgoCard.style.display = 'none';
    }
  }

  // Consistencia por categoría
  const CATS={
    fisico:{label:'Físico',color:'#e05c5c'},
    disciplina:{label:'Disciplina',color:'#5c8ae0'},
    energia:{label:'Energía',color:'#8fb339'},
    inteligencia:{label:'Inteligencia',color:'#c4a84f'},
    identidad:{label:'Identidad',color:'#a05ce0'},
  };
  const catConsEl=document.getElementById('stat-consistencia-cats');
  if (catConsEl) {
    const entries=Object.entries(CATS).map(([k,c])=>({k,c,pct:catPlan[k]>0?Math.round((catComp[k]||0)/catPlan[k]*100):0})).sort((a,b)=>b.pct-a.pct);
    catConsEl.innerHTML=entries.map(({k,c,pct})=>`<div class="scat-row"><div class="scat-pill" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.label}</div><div class="scat-bar-wrap"><div class="scat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div><div class="scat-val" style="color:${c.color}">${pct}%</div></div>`).join('');
  }

  // XP medio diario por categoría
  const xpCatEl=document.getElementById('stat-xp-cats');
  if (xpCatEl) {
    const entries=Object.entries(CATS).map(([k,c])=>({k,c,media:xpCatDays[k]>0?Math.round((xpCatSum[k]||0)/diffDays):0})).sort((a,b)=>b.media-a.media);
    const maxXP=Math.max(...entries.map(e=>e.media),1);
    xpCatEl.innerHTML=entries.map(({k,c,media})=>`<div class="scat-row"><div class="scat-pill" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.label}</div><div class="scat-bar-wrap"><div class="scat-bar-fill" style="width:${Math.round(media/maxXP*100)}%;background:${c.color}"></div></div><div class="scat-val" style="color:${c.color}">${media} xp</div></div>`).join('');
  }

  // Recorrido
  const DIAS_ES=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mejorIdx=diaSum.map((s,i)=>diaDays[i]>0?s/diaDays[i]:0).reduce((mi,v,i,a)=>v>a[mi]?i:mi,0);
  const peorIdx=diaSum.map((s,i)=>diaDays[i]>0?s/diaDays[i]:1).reduce((mi,v,i,a)=>v<a[mi]?i:mi,0);
  const diasSemana=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const mejorPct=diaDays[mejorIdx]>0?Math.round(diaSum[mejorIdx]/diaDays[mejorIdx]*100):0;
  const peorPct=diaDays[peorIdx]>0?Math.round(diaSum[peorIdx]/diaDays[peorIdx]*100):0;

  set('stat-dias-raices', diffDays+' días');
  set('stat-mejor-dia', diasSemana[mejorIdx]||'—');
  const mejorSubEl=document.getElementById('stat-mejor-dia-pct'); if(mejorSubEl) mejorSubEl.textContent=mejorPct+'% de media';
  set('stat-peor-dia', diasSemana[peorIdx]||'—');
  const peorSubEl=document.getElementById('stat-peor-dia-pct'); if(peorSubEl) peorSubEl.textContent=peorPct+'% de media';
  set('stat-xp-perdido', '–'+Math.round(xpTotalLost).toLocaleString('es-ES')+' xp');


  // ── MOMENTUM SCORE ──
  // Ventana: 90 días, decaimiento exponencial proporcional a datos disponibles
  (function() {
    const WINDOW = 90;
    const allDays = []; // { dateStr, xpRatio, hábitos completados/fallados por peso }
    const todayStr = today();

    // Recopilar datos de los últimos 90 días
    for (let i = 0; i < WINDOW; i++) {
      const d = new Date(todayStr + 'T12:00:00');
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayData = state.completions[ds];

      let xpRatio = 0, difNet = 0, difMax = 0, hasData = false;

      if (dayData && !Array.isArray(dayData)) {
        hasData = true;
        const xpG = dayData.xpGanadoPorCat ? Object.values(dayData.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
        const xpM = dayData.xpMaxPorCat    ? Object.values(dayData.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
        xpRatio = xpM > 0 ? xpG / xpM : 0;

        // Dificultad neta: completados suman XP, fallados restan XP
        if (Array.isArray(dayData.planificados) && Array.isArray(dayData.completados)) {
          const habsDelDia = state.allHabits.filter(h => dayData.planificados.includes(h.id));
          habsDelDia.forEach(h => {
            const xp = h.xp || 10;
            difMax += xp;
            if (dayData.completados.includes(h.id)) difNet += xp;
            else difNet -= xp;
          });
        }
      } else if (ds === todayStr) {
        // Hoy: calcular en tiempo real
        const sched = state.habits.filter(h => !h.archivado && isScheduledForDate(h, ds));
        const xpG = sched.filter(h => isCompleted(h.id, ds)).reduce((s,h)=>s+(h.xp||10),0);
        const xpM = sched.reduce((s,h)=>s+(h.xp||10),0);
        xpRatio = xpM > 0 ? xpG / xpM : 0;
        sched.forEach(h => {
          const xp = h.xp || 10;
          difMax += xp;
          if (isCompleted(h.id, ds)) difNet += xp; else difNet -= xp;
        });
        hasData = sched.length > 0;
      } else {
        // Día sin registro: penaliza
        const habActivos = state.habits.filter(h => !h.archivado);
        habActivos.forEach(h => { const xp = h.xp||10; difMax += xp; difNet -= xp; });
        xpRatio = 0;
        hasData = false;
      }

      allDays.push({ ds, xpRatio, difNet, difMax, i }); // i=0 es hoy
    }

    if (!allDays.length) return;

    // Decaimiento exponencial proporcional: el día más antiguo disponible recibe
    // el mismo peso relativo independientemente de cuántos días haya
    const N = allDays.length; // días disponibles (máx 90)
    const getWeight = (idx) => Math.pow(0.5, (idx / N) * 6); // 6 halvings en el rango completo

    // Componente 1: Eficiencia XP ponderada (0-10)
    let xpWeightedSum = 0, xpWeightTotal = 0;
    allDays.forEach(({ xpRatio, i }) => {
      const w = getWeight(i);
      xpWeightedSum += xpRatio * w;
      xpWeightTotal += w;
    });
    const eficienciaXP = xpWeightTotal > 0 ? (xpWeightedSum / xpWeightTotal) * 10 : 0;

    // Componente 2: Racha (0-10), máx 14 días = 10
    // Ya calculada arriba: rachaBuenosActual
    const rachaScore = Math.min(rachaBuenosActual / 14, 1) * 10;

    // Componente 3: Dificultad neta ponderada (0-10)
    let difWeightedNet = 0, difWeightedMax = 0;
    allDays.forEach(({ difNet, difMax, i }) => {
      const w = getWeight(i);
      difWeightedNet += difNet * w;
      difWeightedMax += difMax * w;
    });
    // Normalizar: máximo teórico es difWeightedMax, mínimo es -difWeightedMax
    // Llevar rango [-1, 1] a [0, 10]
    const difRatio = difWeightedMax > 0 ? difWeightedNet / difWeightedMax : 0;
    const difScore = ((difRatio + 1) / 2) * 10; // [-1,1] → [0,10]

    // Bonus racha perfecta
    let bonusPerfectos = 0;
    if (rachaPerfActual >= 3) bonusPerfectos = 1.0;
    else if (rachaPerfActual === 2) bonusPerfectos = 0.75;
    else if (rachaPerfActual === 1) bonusPerfectos = 0.5;

    // Momentum final
    const rawMomentum = (eficienciaXP * 0.4) + (rachaScore * 0.3) + (difScore * 0.3) + bonusPerfectos;
    const momentum = Math.min(10, Math.max(0, rawMomentum));
    const momentumDisplay = momentum.toFixed(1);

    // Etiqueta
    const tag = momentum === 10 ? 'Imparable'
      : momentum >= 8 ? 'En racha'
      : momentum >= 6 ? 'En forma'
      : momentum >= 4 ? 'Estable'
      : momentum >= 2 ? 'Recuperándose'
      : 'En crisis';

    // Color según etiqueta
    const color = momentum >= 8 ? 'var(--gold)'
      : momentum >= 6 ? 'var(--accent)'
      : momentum >= 4 ? 'var(--accent)'
      : momentum >= 2 ? '#6b7560'
      : '#e05c5c';

    // Setear UI
    const scoreEl = document.getElementById('momentum-score');
    const tagEl   = document.getElementById('momentum-tag');
    const cardEl  = document.getElementById('momentum-card');

    if (scoreEl) { scoreEl.textContent = momentumDisplay; scoreEl.style.color = color; }
    if (tagEl)   { tagEl.textContent = tag; tagEl.style.color = color; }
    if (cardEl)  { cardEl.style.borderColor = color + '44'; }
    const barBefore = cardEl?.style;
    if (cardEl) cardEl.style.setProperty('--momentum-color', color);

    // Barras componentes
    const setMC = (barId, valId, score) => {
      const bar = document.getElementById(barId);
      const val = document.getElementById(valId);
      if (bar) { bar.style.width = (score/10*100)+'%'; bar.style.background = color; }
      if (val) { val.textContent = score.toFixed(1); val.style.color = color; }
    };
    setMC('mc-bar-xp',    'mc-val-xp',    eficienciaXP);
    setMC('mc-bar-racha', 'mc-val-racha', rachaScore + bonusPerfectos);
    setMC('mc-bar-dif',   'mc-val-dif',   difScore);

    // Barra lateral de la card
    if (cardEl) {
      const pseudo = cardEl.querySelector('.momentum-bar-lat');
      // Usamos el ::before via CSS variable
    }
    // Actualizar color de la barra lateral via inline style en el primer hijo
    const latBar = document.createElement('style');
    latBar.id = 'momentum-lat-style';
    const existingStyle = document.getElementById('momentum-lat-style');
    if (existingStyle) existingStyle.remove();
    latBar.textContent = `.momentum-card::before { background: ${color} !important; }`;
    document.head.appendChild(latBar);
  })();

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

  // % XP ganado vs máximo posible ese día
  const xpMax = getMaxXPForDate(dateStr);
  const xpPct = xpMax > 0 ? Math.round(xp / xpMax * 100) : 0;

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
  setGold('stat-day-xp', `+${xp} xp`);
  setGold('stat-day-pct', `${pct}% completado`);
  setGold('stat-day-xp-pct', `${xpPct}% del máximo`);
  // Barras de progreso del score card — doradas si día perfecto
  const barColor = isPerfectStats ? 'linear-gradient(to right,#c4a84f,#e8c96e)' : 'var(--accent)';
  const barHab = document.getElementById('stat-day-bar');
  const barXp  = document.getElementById('stat-xp-bar');
  if (barHab) { barHab.style.width = pct + '%'; barHab.style.background = barColor; }
  if (barXp)  { barXp.style.width  = xpPct + '%'; barXp.style.background = barColor; }

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
