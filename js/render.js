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

  // Días perfectos y buenos — siempre dorados, desde perfil
  const vDiasPerfectos = state.perfil.diasPerfectos || 0;
  const vDiasBuenos    = state.perfil.diasBuenos    || 0;
  set('viajero-stat-perfectos', vDiasPerfectos);
  set('viajero-stat-buenos', vDiasBuenos);

  // Rachas actuales — recorrer días hacia atrás desde hoy (solo mes en memoria)
  let rachaPerfActual = 0, rachaBuenosActual = 0;
  let perfStop = false, buenosStop = false;
  for (let i = 0; i <= 90; i++) {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayData = state.completions[ds];
    if (!dayData || Array.isArray(dayData)) {
      if (ds === todayStr) continue; // hoy puede no tener snapshot aún
      if (!perfStop) perfStop = true;
      if (!buenosStop) buenosStop = true;
      if (perfStop && buenosStop) break;
      continue;
    }
    const comp = Array.isArray(dayData.completados) ? dayData.completados.length : 0;
    const plan = Array.isArray(dayData.planificados) ? dayData.planificados.length : 0;
    const xpG = dayData.xpGanadoPorCat ? Object.values(dayData.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = dayData.xpMaxPorCat    ? Object.values(dayData.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    if (!perfStop) {
      if (plan > 0 && comp === plan) rachaPerfActual++;
      else { perfStop = true; }
    }
    if (!buenosStop) {
      if (xpM > 0 && xpG / xpM >= 0.8) rachaBuenosActual++;
      else { buenosStop = true; }
    }
    if (perfStop && buenosStop) break;
  }
  set('viajero-racha-perfectos', rachaPerfActual);
  set('viajero-racha-buenos', rachaBuenosActual);

  // Color dinámico según día perfecto
  const accentColor = isPerfectToday ? 'var(--accent2)' : 'var(--accent)';

  // Eficiencia XP y consistencia — solo del mes actual
  const currentMonthPrefix = today().substring(0, 7);
  let vRatioSum=0, vRatioDays=0, vXpEficSum=0, vXpEficDays=0;
  Object.entries(state.completions).forEach(([k, d]) => {
    if (!k.startsWith(currentMonthPrefix) || !d || Array.isArray(d)) return;
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    if (plan > 0) { vRatioSum += comp/plan; vRatioDays++; }
    if (xpM > 0)  { vXpEficSum += xpG/xpM; vXpEficDays++; }
  });
  const vConsistencia = vRatioDays > 0 ? Math.round(vRatioSum/vRatioDays*100) : 0;
  const vEficiencia   = vXpEficDays > 0 ? Math.round(vXpEficSum/vXpEficDays*100) : 0;

  // Eficiencia y consistencia — doradas en día perfecto
  const eficienciaEl = document.getElementById('viajero-stat-eficiencia');
  const consistenciaEl = document.getElementById('viajero-stat-consistencia');
  if (eficienciaEl)   { eficienciaEl.textContent = vEficiencia + '%';   eficienciaEl.style.color = accentColor; }
  if (consistenciaEl) { consistenciaEl.textContent = vConsistencia + '%'; consistenciaEl.style.color = accentColor; }

  // Navbar HOY gold solo cuando estamos en la vista hoy
  const navHoy = document.getElementById('nav-hoy');
  const enHoy = document.getElementById('view-hoy')?.classList.contains('active');
  if (navHoy) navHoy.style.color = (isPerfectToday && enHoy) ? 'var(--accent2)' : '';

  // Cuadrado 3en1 de HOY
  const xpHoyTriple = xpHoy;
  const pctTriple = exitoPct;
  const completadosHoy = scheduledHoy.filter(h => isCompleted(h.id, todayStr)).length;
  const setTriple = (id, val, color) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val; el.style.color = color || ''; }
  };
  setTriple('hoy-stat-done', `${completadosHoy}/${scheduledHoy.length}`, accentColor);
  setTriple('hoy-stat-xp', `+${xpHoyTriple} XP`, accentColor);
  setTriple('hoy-stat-pct', `${pctTriple}%`, accentColor);
  const triple = document.getElementById('hoy-triple');
  if (triple) {
    triple.style.borderColor = isPerfectToday ? 'rgba(196,168,79,0.35)' : '';
  }
  // XP label — dorado en día perfecto
  const xpLabelEl = document.getElementById('viajero-xp-label');
  if (xpLabelEl) xpLabelEl.style.color = accentColor;

  // Barra XP fill — dorada en día perfecto
  const xpFillEl = document.getElementById('viajero-xp-fill');
  if (xpFillEl) xpFillEl.style.background = accentColor;

  // Barra lateral del viajero — dorada en día perfecto
  const viajeroCard = document.querySelector('.viajero-card');
  if (viajeroCard) {
    viajeroCard.style.borderColor = isPerfectToday ? 'rgba(196,168,79,0.4)' : '';
    // Barra lateral via style tag
    let latStyle = document.getElementById('viajero-lat-style');
    if (!latStyle) { latStyle = document.createElement('style'); latStyle.id = 'viajero-lat-style'; document.head.appendChild(latStyle); }
    latStyle.textContent = isPerfectToday
      ? '.viajero-card::before { background: var(--accent2) !important; }'
      : '.viajero-card::before { background: var(--accent) !important; }';
  }

  // Tareas toggle — dorado en día perfecto
  const tareasToggle = document.getElementById('tareas-toggle');
  if (tareasToggle) {
    tareasToggle.style.borderColor = isPerfectToday ? 'rgba(196,168,79,0.35)' : '';
    const tareasTitle = document.getElementById('tareas-titulo');
    if (tareasTitle) tareasTitle.style.color = accentColor;
  }


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
const CAT_ICONS = {
  fisico:       'assets/icons/fisico.svg',
  disciplina:   'assets/icons/disciplina.svg',
  energia:      'assets/icons/energia.svg',
  inteligencia: 'assets/icons/inteligencia.svg',
  identidad:    'assets/icons/identidad.svg',
};

function habitIconHTML(h) {
  const catKey = h.category || 'disciplina';
  const cat = CATEGORIES[catKey] || CATEGORIES.disciplina;
  if (h.emoji) {
    return `<div class="habit-emoji habit-emoji-cat"
      style="background:var(--cat-${catKey}-bg);border:1px solid var(--cat-${catKey}-border);color:var(--cat-${catKey})">
      <span style="font-size:15px;line-height:1;font-variant-emoji:text">${h.emoji}\uFE0E</span>
    </div>`;
  }
  const iconUrl = CAT_ICONS[catKey];
  const iconContent = iconUrl
    ? `<span class="habit-cat-icon" style="background-color:var(--cat-${catKey});-webkit-mask:url(${iconUrl}) center/contain no-repeat;mask:url(${iconUrl}) center/contain no-repeat;"></span>`
    : cat.label.charAt(0).toUpperCase();
  return `<div class="habit-emoji habit-emoji-cat"
    style="background:var(--cat-${catKey}-bg);border:1px solid var(--cat-${catKey}-border);color:var(--cat-${catKey})">
    ${iconContent}
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

  // Ordenar por XP de mayor a menor
  scheduled.sort((a, b) => (b.xp || 10) - (a.xp || 10));

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
  const sorted = [...state.habits].filter(h => !h.archivado).sort((a, b) => (b.xp || 10) - (a.xp || 10));
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
export async function renderStats() {
  if (!state.statsLoaded) {
    const statsView = document.getElementById('view-stats');
    const header = statsView?.querySelector('header');
    if (header && !document.getElementById('stats-loader')) {
      const loader = document.createElement('div');
      loader.id = 'stats-loader';
      loader.innerHTML = `
        <style>
          @keyframes shimmer-gold{0%{background-position:-600px 0}100%{background-position:600px 0}}
          @keyframes shimmer-green{0%{background-position:-600px 0}100%{background-position:600px 0}}
          .sk-gold{border-radius:7px;background:linear-gradient(90deg,#1a1508 0%,#2e2410 40%,#5a4520 50%,#2e2410 60%,#1a1508 100%);background-size:1200px 100%;animation:shimmer-gold 1.3s infinite linear;}
          .sk-green{border-radius:7px;background:linear-gradient(90deg,#0e1209 0%,#1a2810 40%,#2e4a1a 50%,#1a2810 60%,#0e1209 100%);background-size:1200px 100%;animation:shimmer-green 1.3s infinite linear;}
          .sk-card{background:var(--card);border:1px solid #1e2d12;border-radius:14px;padding:15px 17px;margin:0 24px 8px;position:relative;}
          .sk-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:3px 0 0 3px;}
          .sk-card.gold-card::before{background:#2e2410;}
          .sk-card.green-card::before{background:#1e2d12;}
          .sk-sep{display:flex;align-items:center;gap:10px;margin:20px 24px 10px;}
          .sk-sep-line{flex:1;height:1px;background:#1e2d12;}
          .sk-triple{display:flex;border-top:1px solid #1a2010;padding-top:12px;margin-top:12px;}
          .sk-ti{flex:1;display:flex;flex-direction:column;gap:5px;}
          .sk-ti+.sk-ti{border-left:1px solid #1a2010;padding-left:12px;}
          .sk-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 24px 8px;}
          .sk-half{background:var(--card2);border-radius:10px;padding:12px 14px;border:1px solid #1e2d12;}
        </style>

        <!-- Sep Días perfectos -->
        <div class="sk-sep"><div class="sk-sep-line"></div><div class="sk-gold" style="width:100px;height:10px"></div><div class="sk-sep-line"></div></div>
        <div class="sk-grid2">
          <div class="sk-half">
            <div class="sk-gold" style="width:80px;height:9px;margin-bottom:8px"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end">
              <div><div class="sk-gold" style="width:28px;height:9px;margin-bottom:4px"></div><div class="sk-gold" style="width:44px;height:26px;border-radius:8px"></div></div>
              <div style="text-align:right"><div class="sk-gold" style="width:28px;height:9px;margin-bottom:4px;margin-left:auto"></div><div class="sk-gold" style="width:32px;height:20px;border-radius:8px"></div></div>
            </div>
          </div>
          <div class="sk-half">
            <div class="sk-green" style="width:80px;height:9px;margin-bottom:8px"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end">
              <div><div class="sk-green" style="width:28px;height:9px;margin-bottom:4px"></div><div class="sk-green" style="width:44px;height:26px;border-radius:8px"></div></div>
              <div style="text-align:right"><div class="sk-green" style="width:28px;height:9px;margin-bottom:4px;margin-left:auto"></div><div class="sk-green" style="width:32px;height:20px;border-radius:8px"></div></div>
            </div>
          </div>
        </div>

        <!-- Sep Experiencia -->
        <div class="sk-sep"><div class="sk-sep-line"></div><div class="sk-green" style="width:90px;height:10px"></div><div class="sk-sep-line"></div></div>
        <div class="sk-card green-card">
          <div style="display:flex;justify-content:space-between;margin-bottom:13px">
            <div class="sk-green" style="width:100px;height:10px"></div><div class="sk-green" style="width:50px;height:10px"></div>
          </div>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:13px">
            <div class="sk-green" style="width:70px;height:46px;border-radius:10px"></div>
            <div class="sk-green" style="width:48px;height:30px;border-radius:10px"></div>
          </div>
          <div class="sk-triple">
            <div class="sk-ti"><div class="sk-green" style="height:20px;width:36px;border-radius:7px"></div><div class="sk-green" style="height:9px;width:54px;margin-top:4px"></div></div>
            <div class="sk-ti"><div class="sk-green" style="height:20px;width:36px;border-radius:7px"></div><div class="sk-green" style="height:9px;width:54px;margin-top:4px"></div></div>
            <div class="sk-ti"><div class="sk-green" style="height:20px;width:36px;border-radius:7px"></div><div class="sk-green" style="height:9px;width:54px;margin-top:4px"></div></div>
          </div>
        </div>

        <!-- Gráfica barras -->
        <div style="background:var(--card);border:1px solid #1e2d12;border-radius:14px;padding:15px 17px;margin:0 24px 8px;">
          <div class="sk-green" style="width:140px;height:10px;margin-bottom:14px"></div>
          <div style="display:flex;gap:5px;align-items:flex-end;height:68px;margin-bottom:8px">
            <div class="sk-green" style="flex:1;height:45px;border-radius:4px"></div>
            <div class="sk-green" style="flex:1;height:30px;border-radius:4px"></div>
            <div class="sk-green" style="flex:1;height:58px;border-radius:4px"></div>
            <div class="sk-green" style="flex:1;height:22px;border-radius:4px"></div>
            <div class="sk-green" style="flex:1;height:52px;border-radius:4px"></div>
            <div class="sk-green" style="flex:1;height:38px;border-radius:4px"></div>
            <div class="sk-green" style="flex:1;height:62px;border-radius:4px"></div>
          </div>
          <div style="display:flex;justify-content:space-around">
            ${[1,2,3,4,5,6,7].map(()=>'<div class="sk-green" style="width:12px;height:9px;border-radius:3px"></div>').join('')}
          </div>
        </div>

        <!-- Sep Hábitos -->
        <div class="sk-sep"><div class="sk-sep-line"></div><div class="sk-green" style="width:80px;height:10px"></div><div class="sk-sep-line"></div></div>
        <div class="sk-card green-card">
          <div style="display:flex;justify-content:space-between;margin-bottom:13px">
            <div class="sk-green" style="width:100px;height:10px"></div><div class="sk-green" style="width:50px;height:10px"></div>
          </div>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:13px">
            <div class="sk-green" style="width:70px;height:46px;border-radius:10px"></div>
            <div class="sk-green" style="width:48px;height:30px;border-radius:10px"></div>
          </div>
          <div class="sk-triple">
            <div class="sk-ti"><div class="sk-green" style="height:20px;width:36px;border-radius:7px"></div><div class="sk-green" style="height:9px;width:54px;margin-top:4px"></div></div>
            <div class="sk-ti"><div class="sk-green" style="height:20px;width:36px;border-radius:7px"></div><div class="sk-green" style="height:9px;width:54px;margin-top:4px"></div></div>
            <div class="sk-ti"><div class="sk-green" style="height:20px;width:36px;border-radius:7px"></div><div class="sk-green" style="height:9px;width:54px;margin-top:4px"></div></div>
          </div>
        </div>`;
      header.insertAdjacentElement('afterend', loader);
    }
    const { loadAllCompletions } = await import('./habits.js');
    await loadAllCompletions();
    document.getElementById('stats-loader')?.remove();
  }
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
  // Usar statsCompletions (histórico completo) si está disponible
  const comps = state.statsLoaded ? state.statsCompletions : state.completions;
  const xpTotal = state.perfil.xpTotal || 0;
  const habActivos = state.habits.filter(h => !h.archivado).length;
  const nivelActual = state.perfil.nivel || 1;
  const claseIdx = state.perfil.clase || 0;

  set('stat-habits-count', habActivos);
  set('stat-xp-total-lifetime', xpTotal.toLocaleString('es-ES'));
  set('stat-nivel-actual', 'Nv.' + nivelActual);

  // Rango debajo del nivel
  const CLASES_LABELS = ['Iniciado','Aprendiz','Guardán','Maestro','Sabio','Eterno'];
  const CLASES_COLORS = ['#6b7560','#8fb339','#5c8ae0','#c4a84f','#a05ce0','#e05c5c'];
  const claseLabel = CLASES_LABELS[claseIdx] || 'Iniciado';
  const claseColor = CLASES_COLORS[claseIdx] || '#6b7560';
  const rangoEl = document.getElementById('stat-rango-actual');
  const nivelEl = document.getElementById('stat-nivel-actual');
  if (rangoEl) { rangoEl.textContent = claseLabel; rangoEl.style.color = claseColor; }
  if (nivelEl) { nivelEl.style.color = claseColor; }

  // ── Progreso al siguiente nivel ──
  const calc = calcularNivel(xpTotal);
  const nivelCard = document.getElementById('stat-nivel-card');
  if (nivelCard) {
    if (calc.esMaximo) {
      set('stat-nivel-titulo', 'Nivel máximo alcanzado');
      set('stat-nivel-subtitulo', claseLabel + ' · Nv.' + calc.nivel);
      set('stat-nivel-pct', '100%');
      set('stat-nivel-xp-actual', xpTotal.toLocaleString('es-ES') + ' XP totales');
      set('stat-nivel-dias-restantes', '¡Eres un Eterno! 🌳');
      const bar = document.getElementById('stat-nivel-bar');
      if (bar) { bar.style.width = '100%'; bar.style.background = claseColor; }
    } else {
      const xpFalta = calc.xpSiguiente - calc.xpActual;
      const pct = calc.pct;
      const hace30 = (() => { const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; })();
      let xp30 = 0, dias30 = 0;
      Object.keys(comps).forEach(k => {
        if (k < hace30 || k === 'updatedAt' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
        const d = comps[k];
        if (!d || Array.isArray(d)) return;
        const g = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
        xp30 += g; dias30++;
      });
      const xpDia30 = dias30 > 0 ? xp30 / dias30 : 0;
      const diasEstimados = xpDia30 > 0 ? Math.ceil(xpFalta / xpDia30) : null;
      set('stat-nivel-titulo', 'Nv.' + calc.nivel + ' → Nv.' + (calc.nivel + 1));
      set('stat-nivel-subtitulo', claseLabel + ' · ' + calc.xpActual.toLocaleString('es-ES') + ' / ' + calc.xpSiguiente.toLocaleString('es-ES') + ' XP');
      set('stat-nivel-pct', pct + '%');
      set('stat-nivel-xp-actual', 'Faltan ' + xpFalta.toLocaleString('es-ES') + ' XP');
      const diasEl = document.getElementById('stat-nivel-dias-restantes');
      if (diasEl) {
        if (diasEstimados !== null) {
          diasEl.textContent = diasEstimados <= 1 ? '¡Hoy puedes subir! ⚡' : '~' + diasEstimados + ' días a este ritmo';
          diasEl.style.color = diasEstimados <= 3 ? claseColor : 'var(--muted)';
        } else {
          diasEl.textContent = 'Sin datos de ritmo';
          diasEl.style.color = 'var(--muted)';
        }
      }
      const bar = document.getElementById('stat-nivel-bar');
      if (bar) {
        bar.style.width = pct + '%';
        bar.style.background = pct >= 80 ? '#c4a84f' : claseColor;
      }
    }
  }

  const keys = Object.keys(comps).filter(k => k !== 'updatedAt' && /^\d{4}-\d{2}-\d{2}$/.test(k));
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
    const d = comps[k];
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
    const d=comps[k];
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
      const dayData = comps[ds];
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

  // IDs directos — sin sincronización necesaria

  const consistGlobal = ratioDays>0 ? Math.round(ratioSum/ratioDays*100) : 0;
  const xpEficGlobal  = xpEficDays>0 ? Math.round(xpEficSum/xpEficDays*100) : 0;
  set('stat-consistencia-global', consistGlobal+'%');
  set('stat-eficiencia-big', xpEficGlobal+'%');
  set('stat-eficiencia-pill', xpEficGlobal+'% eficiencia');

  // Eficiencia XP y consistencia hábitos últimos 30 días
  const hace30str = (() => { const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; })();
  let xpEfic30Sum=0, xpEfic30Days=0;
  let hab30Sum=0, hab30Days=0, habCount30=0, habDays30=0;
  sorted.forEach(k => {
    if (k < hace30str) return;
    const d = comps[k];
    if (!d || Array.isArray(d)) return;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    if (xpM > 0) { xpEfic30Sum += xpG/xpM; xpEfic30Days++; }
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    if (plan > 0) { hab30Sum += comp/plan; hab30Days++; habCount30 += comp; habDays30++; }
  });
  const xpEfic30 = xpEfic30Days>0 ? Math.round(xpEfic30Sum/xpEfic30Days*100) : xpEficGlobal;
  const hab30 = hab30Days>0 ? Math.round(hab30Sum/hab30Days*100) : consistGlobal;
  const mediaHab30 = habDays30>0 ? (habCount30/habDays30).toFixed(1) : '—';
  set('stat-media-habitos-30d', mediaHab30);

  // Eficiencia XP y consistencia del mes actual (desde state.completions — siempre cargado)
  const mesActualPrefix = today().substring(0, 7);
  let xpMesSum=0, xpMesDays=0, habMesSum=0, habMesDays=0;
  Object.entries(state.completions).forEach(([k, d]) => {
    if (!k.startsWith(mesActualPrefix) || !d || Array.isArray(d)) return;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    if (xpM > 0) { xpMesSum += xpG/xpM; xpMesDays++; }
    if (plan > 0) { habMesSum += comp/plan; habMesDays++; }
  });
  const eficienciaMes  = xpMesDays  > 0 ? Math.round(xpMesSum/xpMesDays*100)  : 0;
  const consistenciaMes = habMesDays > 0 ? Math.round(habMesSum/habMesDays*100) : 0;
  set('stat-eficiencia-mes',   eficienciaMes + '%');
  set('stat-consistencia-mes', consistenciaMes + '%');
  set('stat-media-habitos', habitosDays>0 ? (habitosSum/habitosDays).toFixed(1) : '—');
  set('stat-total-completados', totalCompletados.toLocaleString('es-ES'));
  set('stat-xp-media-dia-pill', Math.round(xpTotal/diffDays).toLocaleString('es-ES'));
  // XP por día últimos 30 días
  let xp30Sum=0, xp30Count=0;
  sorted.forEach(k => {
    if (k < hace30str) return;
    const d = comps[k];
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
  // Tendencia basada en últimos 30 días vs 30 anteriores
  const hace60str = (() => { const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-60); return d.toISOString().split('T')[0]; })();
  let habAnt30Sum=0, habAnt30Days=0, xpAnt30Sum=0, xpAnt30Days=0;
  sorted.forEach(k => {
    if (k < hace60str || k >= hace30str) return;
    const d = comps[k];
    if (!d || Array.isArray(d)) return;
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    if (plan > 0) { habAnt30Sum += comp/plan; habAnt30Days++; }
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    if (xpM > 0) { xpAnt30Sum += xpG/xpM; xpAnt30Days++; }
  });
  const setTrend30 = (elId, actual, actualDays, prev, prevDays) => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!actualDays || !prevDays) { el.style.display='none'; return; }
    const pctActual = Math.round(actual/actualDays*100);
    const pctPrev   = Math.round(prev/prevDays*100);
    const delta = pctActual - pctPrev;
    el.style.display='';
    if (delta > 0)       { el.textContent=`↑ +${delta}%`; el.className='snarr-trend up'; }
    else if (delta < 0)  { el.textContent=`↓ ${delta}%`;  el.className='snarr-trend dn'; }
    else                 { el.textContent='= sin cambio';   el.className='snarr-trend flat'; }
  };
  setTrend30('stat-tendencia-hab', hab30Sum, hab30Days, habAnt30Sum, habAnt30Days);
  setTrend30('stat-tendencia-xp',  xpEfic30Sum, xpEfic30Days, xpAnt30Sum, xpAnt30Days);

  // Gráfica XP últimos 7 días — % real (no normalizado)
  const diasGrid = document.getElementById('stat-dias-semana');
  if (diasGrid) {
    const last7=[];
    for (let i=6; i>=0; i--) {
      const d=new Date(today()+'T12:00:00'); d.setDate(d.getDate()-i);
      const ds=d.toISOString().split('T')[0];
      const dayData=comps[ds];
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
