import {
  state, today, isCompleted, isScheduledForDate, getHabitStreak,
  getTodayXP, getXPForDate, getMaxXPForDate,
  CATEGORIES, CLASES, calcularNivel, xpParaNivel, xpTotalClase, NIVELES_POR_CLASE,
} from './state.js';
import { getCompletadosForDate, getPlanificadosForDate, getXPTotalSnapshot, getXPGanadoPorCat, getXPMaxPorCat } from './habits.js';

// ── Universal flash glow utility ──
function flashGlow(el, color, duration = 400) {
  if (!el) return;
  const rgba = color || 'rgba(143,179,57,0.5)';
  el.animate([
    { filter: 'brightness(1)', boxShadow: '0 0 0 transparent' },
    { filter: 'brightness(1.8)', boxShadow: `0 0 14px ${rgba}` },
    { filter: 'brightness(1)', boxShadow: '0 0 0 transparent' }
  ], { duration, easing: 'ease-out' });
}

function flashText(el, color, duration = 500) {
  if (!el) return;
  const c = color || 'rgba(143,179,57,0.7)';
  el.animate([
    { textShadow: 'none' },
    { textShadow: `0 0 12px ${c}, 0 0 24px ${c}` },
    { textShadow: 'none' }
  ], { duration, easing: 'ease-out' });
}

function getCatColor(category) {
  const el = document.createElement('div');
  el.style.color = `var(--cat-${category})`;
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c;
}

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
}

// ── Fecha ──
function renderDate() {
  const el = document.getElementById('date-display');
  if (!el) return;
  const d = new Date(today() + 'T12:00:00'); // respeta modo debug
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('es-ES', { month: 'short' });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
  el.textContent = `${capitalized}, ${day} ${monthCap}`;
}

// ── Viajero ──
export function renderViajero() {
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
  
  const perfectColor = 'rgba(123,79,207,';
  const gold = isPerfectToday ? 'var(--accent2)' : '';
  const goldBorder = isPerfectToday ? perfectColor + '0.4)' : '';
  const goldBg = isPerfectToday ? perfectColor + '0.1)' : '';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Nombre, clase y nivel — SIEMPRE color de rango, nunca cambian con día perfecto
  const nombreEl = document.getElementById('viajero-nombre');
  if (nombreEl) {
    nombreEl.textContent = state.perfil.nombre || 'David';
    nombreEl.style.color = 'var(--accent)';
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
  const buenosEl = document.getElementById('viajero-stat-buenos');
  if (buenosEl) { buenosEl.textContent = vDiasBuenos; buenosEl.style.color = 'var(--accent)'; }

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

  // Color dinámico según día perfecto
  const accentColor = isPerfectToday ? 'var(--accent2)' : 'var(--accent)';

  // Días sin fumar
  const nofumarEl = document.getElementById('viajero-stat-nofumar');
  if (nofumarEl) {
    const dsf = state.perfil.diasSinFumar || 0;
    nofumarEl.textContent = dsf;
    nofumarEl.style.color = accentColor;
  }

  // Eficiencia XP y consistencia — mes actual + últimos 7 días
  const hace7 = (() => { const d = new Date(todayStr+'T12:00:00'); d.setDate(d.getDate()-6); return d.toISOString().split('T')[0]; })();
  let vRatioSum=0, vRatioDays=0, vXpEficSum=0, vXpEficDays=0;
  let v7RatioSum=0, v7RatioDays=0, v7XpEficSum=0, v7XpEficDays=0;
  const mesActualPrefix = todayStr.substring(0, 7);
  Object.entries(state.completions).forEach(([k, d]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !d || Array.isArray(d)) return;
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    // Media del mes — solo días del mes actual
    if (k.startsWith(mesActualPrefix)) {
      if (plan > 0) { vRatioSum += comp/plan; vRatioDays++; }
      if (xpM > 0)  { vXpEficSum += xpG/xpM; vXpEficDays++; }
    }
    // Media 7 días — cualquier día dentro de la ventana (incluye mes anterior)
    if (k >= hace7 && k <= todayStr) {
      v7RatioSum  += plan > 0 ? comp/plan : 0;
      v7XpEficSum += xpM  > 0 ? xpG/xpM  : 0;
      v7RatioDays++;
      v7XpEficDays++;
    }
  });
  const vConsistencia   = vRatioDays   > 0 ? Math.round(vRatioSum/vRatioDays*100)     : 0;
  const vEficiencia     = vXpEficDays  > 0 ? Math.round(vXpEficSum/vXpEficDays*100)   : 0;
  // Siempre dividir entre 7 — los días sin datos cuentan como 0%
  const vConsistencia7d = Math.round(v7RatioSum  / 7 * 100);
  const vEficiencia7d   = Math.round(v7XpEficSum / 7 * 100);

  // Eficiencia y consistencia — doradas en día perfecto
  const eficienciaEl = document.getElementById('viajero-stat-eficiencia');
  const consistenciaEl = document.getElementById('viajero-stat-consistencia');
  const eficiencia7dEl = document.getElementById('viajero-stat-eficiencia-7d');
  const consistencia7dEl = document.getElementById('viajero-stat-consistencia-7d');
  if (eficienciaEl)    { eficienciaEl.textContent    = vEficiencia + '%';    eficienciaEl.style.color    = accentColor; }
  if (consistenciaEl)  { consistenciaEl.textContent  = vConsistencia + '%';  consistenciaEl.style.color  = accentColor; }
  if (eficiencia7dEl)  { eficiencia7dEl.textContent  = vEficiencia7d + '%';  eficiencia7dEl.style.color  = accentColor; }
  if (consistencia7dEl){ consistencia7dEl.textContent= vConsistencia7d + '%';consistencia7dEl.style.color= accentColor; }

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
    triple.style.borderColor = isPerfectToday ? perfectColor + '0.35)' : '';
  }
  // XP label — dorado en día perfecto
  const xpLabelEl = document.getElementById('viajero-xp-label');
  if (xpLabelEl) xpLabelEl.style.color = accentColor;

  // Calcular porcentaje de nivel
  const xpPct = calc.esMaximo ? 100 : (calc.xpSiguiente > 0 ? Math.round(calc.xpActual / calc.xpSiguiente * 100) : 0);

  // Barra XP fill — width según progreso al siguiente nivel + dorada en día perfecto
  const xpFillEl = document.getElementById('viajero-xp-fill');
  if (xpFillEl) {
    xpFillEl.style.width = xpPct + '%';
    if (isPerfectToday) {
      xpFillEl.style.background = 'var(--accent2)';
    } else {
      const gradEnd = xpPct > 0 ? Math.round(100 / xpPct * 100) : 200;
      xpFillEl.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent2) ${gradEnd}%)`;
    }
  }
  // Label XP — xpActual / xpSiguiente · pct%
  const xpLabelEl2 = document.getElementById('viajero-xp-label');
  if (xpLabelEl2) {
    xpLabelEl2.textContent = calc.esMaximo
      ? 'Máximo alcanzado'
      : `${calc.xpActual.toLocaleString('es-ES')} / ${calc.xpSiguiente.toLocaleString('es-ES')} · ${xpPct}%`;
    xpLabelEl2.style.color = accentColor;
  }

  // Barra lateral del viajero — dorada en día perfecto
  const viajeroCard = document.querySelector('.viajero-card');
  if (viajeroCard) {
    viajeroCard.style.borderColor = isPerfectToday ? perfectColor + '0.4)' : '';
    // Barra lateral via style tag
    let latStyle = document.getElementById('viajero-lat-style');
    if (!latStyle) { latStyle = document.createElement('style'); latStyle.id = 'viajero-lat-style'; document.head.appendChild(latStyle); }
    latStyle.textContent = isPerfectToday
      ? '.viajero-card::before { background: var(--accent2) !important; }'
      : '.viajero-card::before { background: var(--accent) !important; }';
    // Fantasy: viajero card purple border on perfect day
    viajeroCard.classList.toggle('fantasy-perfect-viajero', isPerfectToday);
  }

  // Fantasy: avatar glow — gold normal, purple on perfect day
  const avatarWrap = document.querySelector('.viajero-avatar-wrap');
  if (avatarWrap) {
    avatarWrap.classList.toggle('fantasy-perfect-avatar', isPerfectToday);
  }

  // Fantasy: separator swords
  const sepIcon = document.getElementById('hoy-sep-icon');
  if (sepIcon) sepIcon.textContent = '⚔';

  // Separator lines + icon — purple on perfect day, gold otherwise
  const sepContainer = document.querySelector('.hoy-separator');
  if (sepContainer) {
    const lines = sepContainer.querySelectorAll('div[style*="height:3px"]');
    const icon = sepContainer.querySelector('.hoy-separator-icon');
    const sepColor = isPerfectToday ? 'rgba(123,79,207,0.5)' : '#a8862abd';
    lines.forEach(l => l.style.background = sepColor);
    if (icon) icon.style.color = sepColor;
  }

  // Tareas toggle — dorado por CSS, púrpura en día perfecto
  const tareasToggle = document.getElementById('tareas-toggle');
  if (tareasToggle) {
    const tareasTitle = document.getElementById('tareas-titulo');
    const tareasPanel = document.getElementById('tareas-panel');

    if (isPerfectToday) {
      // Perfect day: purple borders and title
      tareasToggle.style.borderColor = perfectColor + '0.5)';
      if (tareasPanel) tareasPanel.style.borderColor = perfectColor + '0.5)';
      tareasToggle.dataset.glowColor = perfectColor + '0.4)';
    } else {
      // Normal: reset to CSS defaults (gold via --accent)
      tareasToggle.style.borderColor = '';
      if (tareasPanel) tareasPanel.style.borderColor = '';
      tareasToggle.dataset.glowColor = 'rgba(201,168,76,0.4)';
    }

    // Botón Nueva — púrpura solo en día perfecto
    const btnNuevaReal = document.querySelector('#tareas-panel .btn-primary');
    if (btnNuevaReal) {
      if (isPerfectToday) {
        btnNuevaReal.style.background = '#7b4fcf';
        btnNuevaReal.style.borderColor = '#7b4fcf';
        btnNuevaReal.style.color = 'var(--bg)';
      } else {
        btnNuevaReal.style.background = '';
        btnNuevaReal.style.borderColor = '';
        btnNuevaReal.style.color = '';
      }
    }
    // Fantasy: toggle purple class on tareas
    const fantasyPerfectTareas = isPerfectToday;
    tareasToggle.classList.toggle('fantasy-perfect-tareas', fantasyPerfectTareas);
    if (tareasPanel) tareasPanel.classList.toggle('fantasy-perfect-tareas', fantasyPerfectTareas);
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

export function renderWeek() {
  const strip = document.getElementById('week-strip');
  if (!strip) return;
  const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  // Track previous today state to flash on change
  const prevTodayState = strip.dataset.todayState || '';
  let todayState = '';

  const now = new Date(today() + 'T12:00:00'); // respeta modo debug
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

    if (isToday) todayState = isPerfect ? 'golden' : isGood ? 'green' : 'normal';

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
  strip.dataset.todayState = todayState;

  // Flash today's day cell if state changed
  if (prevTodayState && prevTodayState !== todayState) {
    const todayCell = strip.querySelector('.day-num.today');
    if (todayCell) {
      const glowColor = todayState === 'golden' ? 'rgba(196,168,79,0.6)' : todayState === 'green' ? 'rgba(143,179,57,0.6)' : 'rgba(143,179,57,0.4)';
      flashGlow(todayCell, glowColor, 500);
    }
  }
}

// ── XP Bar ──
export function renderXPBar() {
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
export function renderProgress() {
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
  const barColor = isPerfect
    ? 'linear-gradient(to right,#5a3a9e,#7b4fcf)'
    : 'var(--accent)';
  const latColor = isPerfect
    ? 'var(--accent2)'
    : 'var(--accent)';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setColor = (id, c) => { const el = document.getElementById(id); if (el) el.style.color = c; };
  const setBg = (id, bg) => { const el = document.getElementById(id); if (el) el.style.background = bg; };

  // Hábitos card
  const prevDone = document.getElementById('hoy-sc-hab-val')?.textContent;
  set('hoy-sc-hab-val', total ? `${done}/${total}` : '0/0');
  set('hoy-sc-hab-pct', `${pct}%`);
  setColor('hoy-sc-hab-val', color);
  setColor('hoy-sc-hab-pct', color);
  setBg('hoy-sc-bar-lat-hab', latColor);
  setBg('hoy-sc-hab-bar', barColor);
  const habBar = document.getElementById('hoy-sc-hab-bar');
  if (habBar) habBar.style.width = pct + '%';

  // Flash on change
  const newDone = total ? `${done}/${total}` : '0/0';
  if (prevDone && prevDone !== newDone) {
    const glowColor = isPerfect ? 'rgba(196,168,79,0.5)' : 'rgba(143,179,57,0.5)';
    flashText(document.getElementById('hoy-sc-hab-val'), glowColor, 500);
    flashGlow(habBar, glowColor, 500);
  }

  // XP card
  const prevXP = document.getElementById('hoy-sc-xp-val')?.textContent;
  set('hoy-sc-xp-val', `+${xpHoy}`);
  set('hoy-sc-xp-pct', `${xpPct}%`);
  setColor('hoy-sc-xp-val', color);
  setColor('hoy-sc-xp-pct', color);
  setBg('hoy-sc-bar-lat-xp', latColor);
  setBg('hoy-sc-xp-bar', barColor);
  const xpBar = document.getElementById('hoy-sc-xp-bar');
  if (xpBar) xpBar.style.width = xpPct + '%';

  // Flash on change
  if (prevXP && prevXP !== `+${xpHoy}`) {
    const glowColor = isPerfect ? 'rgba(196,168,79,0.5)' : 'rgba(143,179,57,0.5)';
    flashText(document.getElementById('hoy-sc-xp-val'), glowColor, 500);
    flashGlow(xpBar, glowColor, 500);
  }

  // Fantasy perfect day: toggle class on hoy-sc-cards and viajero xp fill
  const habCard = document.getElementById('hoy-sc-hab');
  const xpCard = document.getElementById('hoy-sc-xp');
  const xpFill = document.querySelector('.viajero-xp-fill');
  const fantasyPerfect = isPerfect;
  if (habCard) habCard.classList.toggle('fantasy-perfect', fantasyPerfect);
  if (xpCard) xpCard.classList.toggle('fantasy-perfect', fantasyPerfect);
  if (xpFill) xpFill.classList.toggle('fantasy-perfect', fantasyPerfect);
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
  tabs.classList.toggle('perfect-day', allDone);
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

  // Día perfecto: se calcula sobre TODOS los hábitos del día, no solo los del filtro
  const allScheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
  const allCompleted = allScheduled.length > 0 && allScheduled.every(h => isCompleted(h.id, todayStr));
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

  // Ordenar por categoría (fisico→disciplina→energia→inteligencia→identidad), luego XP desc
  const _CAT_HOY = ['fisico','disciplina','energia','inteligencia','identidad'];
  scheduled.sort((a, b) => {
    const ca = _CAT_HOY.includes(a.category) ? _CAT_HOY.indexOf(a.category) : 99;
    const cb = _CAT_HOY.includes(b.category) ? _CAT_HOY.indexOf(b.category) : 99;
    if (ca !== cb) return ca - cb;
    return (b.xp || 10) - (a.xp || 10);
  });

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
      <div class="habit-card ${done ? 'done' : ''}" id="habit-${h.id}" data-cat="${h.category || 'disciplina'}" onclick="window.onToggleHabit('${h.id}')">
        ${habitIconHTML(h)}
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
        </div>
        <span class="xp-badge xp-${h.xp || 10}">+${h.xp || 10}</span>
        <div class="check-circle"><svg class="check-svg" width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#07090a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>`;
  });
  list.innerHTML = html;
}


// ── Toggle visual de un hábito sin regenerar la lista ──
export function renderHabitToggle(id, isDone) {
  const card = document.getElementById('habit-' + id);
  if (!card) return;

  if (isDone) {
    card.classList.add('done');

    // XP badge pop + rising sparks + emoji & name glow (all themes)
    const badge = card.querySelector('.xp-badge');
    if (badge) {
      badge.style.animation = 'none';
      badge.offsetHeight;
      badge.style.animation = 'xpBadgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)';
      // Rising sparks
      
      const habit = state.habits.find(h => h.id === id);
      const xpVal = habit ? (habit.xp || 10) : 10;
      const color = xpVal >= 50 ? '#d4a843' : xpVal >= 25 ? '#aab4c8' : '#cd7f50';
      const rect = badge.getBoundingClientRect();
      for (let i = 0; i < 10; i++) {
        const spark = document.createElement('div');
        const size = 2.5 + Math.random() * 3.5;
        spark.style.cssText = `position:fixed;width:${size}px;height:${size}px;border-radius:50%;background:${color};pointer-events:none;z-index:9999;left:${rect.left+rect.width/2}px;top:${rect.top+rect.height/2}px`;
        document.body.appendChild(spark);
        const dx = (Math.random() - 0.5) * 40;
        const dy = -(18 + Math.random() * 28);
        const dur = 450 + Math.random() * 350;
        spark.animate([
          { transform: 'translate(0,0) scale(1.2)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) scale(0)`, opacity: 0 }
        ], { duration: dur, easing: 'ease-out', fill: 'forwards' });
        setTimeout(() => spark.remove(), dur + 50);
      }
    }
    // Emoji glow shine (category color)
    const emoji = card.querySelector('.habit-emoji');
    if (emoji) {
      const habit = state.habits.find(h => h.id === id);
      const catColor = habit ? getCatColor(habit.category || 'disciplina') : null;
      const catRgba = catColor ? catColor.replace('rgb(', 'rgba(').replace(')', ',0.6)') : 'rgba(143,179,57,0.6)';
      emoji.animate([
        { filter: 'brightness(1)', transform: 'scale(1)' },
        { filter: 'brightness(2.2) saturate(1.8)', transform: 'scale(1.12)' },
        { filter: 'brightness(1)', transform: 'scale(1)' }
      ], { duration: 400, easing: 'ease-out' });
      flashGlow(emoji, catRgba, 400);
    }
    // Name glow shine — use filter to avoid overflow clipping
    const nameEl = card.querySelector('.habit-name');
    if (nameEl) {
      nameEl.animate([
        { filter: 'brightness(1)' },
        { filter: 'brightness(2.2)' },
        { filter: 'brightness(1)' }
      ], { duration: 500, easing: 'ease-out' });
    }
  } else {
    card.classList.remove('done');
  }
  // Recalcular si el día es perfecto
  const todayStr = today();
  const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, todayStr));
  const allCompleted = scheduled.length > 0 && scheduled.every(h => isCompleted(h.id, todayStr));
  const list = document.getElementById('habits-list');
  const tabs = document.getElementById('cat-tabs');
  if (list) list.classList.toggle('perfect-day', allCompleted);
  if (tabs) tabs.classList.toggle('perfect-day', allCompleted);

  // Redibujar los tabs para actualizar clase active-all-perfect
  renderCatTabs();

  // Si el día YA NO es perfecto, resetear check-circle de todas las cards done
  if (!allCompleted && list) {
    list.querySelectorAll('.habit-card.done .check-circle').forEach(cc => {
      cc.style.background = '';
      cc.style.borderColor = '';
    });
  }
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
  const _CAT_LIST = ['fisico','disciplina','energia','inteligencia','identidad'];
  const sorted = [...state.habits].filter(h => !h.archivado).sort((a, b) => {
    const ca = _CAT_LIST.includes(a.category) ? _CAT_LIST.indexOf(a.category) : 99;
    const cb = _CAT_LIST.includes(b.category) ? _CAT_LIST.indexOf(b.category) : 99;
    if (ca !== cb) return ca - cb;
    return (b.xp || 10) - (a.xp || 10);
  });
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
    if (!document.getElementById('stats-loader')) {
      const statsView = document.getElementById('view-stats');

      // Ocultar todos los hijos de stats excepto el header con display:none
      if (statsView) {
        Array.from(statsView.children).forEach(el => {
          if (el.tagName !== 'HEADER') el.style.display = 'none';
        });
      }

      const loader = document.createElement('div');
      loader.id = 'stats-loader';
      loader.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:18px';

      
      const lRing1 = 'rgba(123,79,207,0.25)';
      const lRing2 = 'rgba(123,79,207,0.12)';
      const lGlow  = 'rgba(123,79,207,0.05)';
      const lEmoji = '⚔';
      const lText  = 'Invocando registros';
      const lColor = 'var(--accent)';
      const lFont  = "font-family:'Cinzel Decorative',serif;font-size:11px;letter-spacing:4px;color:#c9a84c";

      loader.innerHTML = `
        <style>
          @keyframes stats-txt-fade{0%,100%{opacity:0.3}50%{opacity:1}}
          @keyframes stats-leaf-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
          @keyframes stats-ring1{0%,100%{opacity:0.08;transform:scale(1)}50%{opacity:0.2;transform:scale(1.07)}}
          @keyframes stats-ring2{0%,100%{opacity:0.05;transform:scale(1)}50%{opacity:0.12;transform:scale(1.13)}}
        </style>
        <div style="position:relative;width:100px;height:100px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;inset:0;border-radius:50%;border:1px solid ${lRing1};animation:stats-ring1 2s ease-in-out infinite"></div>
          <div style="position:absolute;inset:-14px;border-radius:50%;border:1px solid ${lRing2};animation:stats-ring2 2s ease-in-out infinite 0.5s"></div>
          <div style="position:absolute;inset:8px;border-radius:50%;background:${lGlow}"></div>
          <canvas id="stats-orbit-canvas" width="200" height="200" style="position:absolute;inset:-50px;width:200px;height:200px;pointer-events:none"></canvas>
          <div style="font-size:30px;position:relative;z-index:2;animation:stats-leaf-bounce 2s ease-in-out infinite">${lEmoji}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px">
          <div style="${lFont};text-transform:uppercase;animation:stats-txt-fade 1.8s ease-in-out infinite">${lText}</div>
        </div>`;

      header?.insertAdjacentElement('afterend', loader);

      // Lanzar animación orbital
      requestAnimationFrame(() => {
        const cv = document.getElementById('stats-orbit-canvas');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = 200, H = 200, cx = W/2, cy = H/2;

        
        const orbits = [
              { r: 38, n: 5,  speed: 0.014,  offset: 0,          size: 2.0, hue: 270, alpha: 0.9 },
              { r: 54, n: 8,  speed: -0.009, offset: Math.PI/4,  size: 1.5, hue: 44, alpha: 0.6 },
            ];
        const orbitStrokeColor = 'rgba(123,79,207,0.06)';

        // Inicializar ángulos
        const particles = [];
        orbits.forEach(o => {
          for (let i = 0; i < o.n; i++) {
            particles.push({
              orbit: o,
              angle: (i / o.n) * Math.PI * 2 + o.offset,
              trail: [],
            });
          }
        });

        let animId = null;
        let active = true;
        window._statsOrbitStop = () => { active = false; if (animId) cancelAnimationFrame(animId); };

        function frame() {
          if (!active) return;
          ctx.clearRect(0, 0, W, H);

          // Anillo guía tenue
          orbits.forEach(o => {
            ctx.beginPath();
            ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
            ctx.strokeStyle = orbitStrokeColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          });

          particles.forEach(p => {
            p.angle += p.orbit.speed;
            const x = cx + Math.cos(p.angle) * p.orbit.r;
            const y = cy + Math.sin(p.angle) * p.orbit.r;

            // Trail
            p.trail.push({x, y});
            if (p.trail.length > 8) p.trail.shift();

            // Dibujar trail
            p.trail.forEach((pt, ti) => {
              const a = (ti / p.trail.length) * p.orbit.alpha * 0.4;
              const s = p.orbit.size * (ti / p.trail.length) * 0.7;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, s, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${p.orbit.hue}, 90%, 65%, ${a})`;
              ctx.fill();
            });

            // Partícula principal con glow
            const g = ctx.createRadialGradient(x, y, 0, x, y, p.orbit.size * 3);
            g.addColorStop(0, `hsla(${p.orbit.hue + 8}, 100%, 88%, ${p.orbit.alpha})`);
            g.addColorStop(0.4, `hsla(${p.orbit.hue}, 95%, 66%, ${p.orbit.alpha * 0.7})`);
            g.addColorStop(1, `hsla(${p.orbit.hue - 8}, 80%, 40%, 0)`);
            ctx.beginPath();
            ctx.arc(x, y, p.orbit.size, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
          });

          animId = requestAnimationFrame(frame);
        }
        frame();
      });
    }
    const { loadAllCompletions } = await import('./habits.js');
    await loadAllCompletions();
    // Parar animación orbital y restaurar contenido
    if (window._statsOrbitStop) { window._statsOrbitStop(); window._statsOrbitStop = null; }
    const statsView2 = document.getElementById('view-stats');
    if (statsView2) {
      Array.from(statsView2.children).forEach(el => { el.style.display = ''; });
    }
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
  // Usar statsCompletions (histórico completo) si está disponible, filtrado por <= hoy
  const _todayStr = today();
  const _rawComps = state.statsLoaded ? state.statsCompletions : state.completions;
  const comps = Object.fromEntries(
    Object.entries(_rawComps).filter(([k]) => !/^\d{4}-\d{2}-\d{2}$/.test(k) || k <= _todayStr)
  );
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
     'stat-dias-raices','stat-mejor-dia','stat-peor-dia','stat-xp-perdido',
     'stat-rec-eficiencia','stat-rec-habdia'].forEach(id => set(id,'—'));
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
      dot.style.background = active ? dotColor : 'var(--border)';
      dot.style.border = active ? 'none' : '1px solid var(--border)';
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
  renderDots('rc-dots-perf', 'var(--accent2)', 'var(--card)', (ds, dayData) => {
    if (!dayData || Array.isArray(dayData)) return false;
    const comp = Array.isArray(dayData.completados) ? dayData.completados.length : 0;
    const plan = Array.isArray(dayData.planificados) ? dayData.planificados.length : 0;
    return plan > 0 && comp === plan;
  });

  // Buenos: ≥80% XP
  renderDots('rc-dots-buenos', 'var(--accent)', 'var(--card)', (ds, dayData) => {
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

  // Eficiencia XP y consistencia hábitos últimos 30 y 7 días — denominador fijo
  const hace30str = (() => { const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; })();
  const hace7stats = (() => { const d = new Date(today()+'T12:00:00'); d.setDate(d.getDate()-6);  return d.toISOString().split('T')[0]; })();
  let xpEfic30Sum=0, xpEfic30Days=0, hab30Sum=0, hab30Days=0, habCount30=0, habDays30=0;
  let xpEfic7Sum=0,  hab7Sum=0;
  const todayForStats = today();
  sorted.forEach(k => {
    if (k < hace30str || k > todayForStats) return;
    const d = comps[k];
    if (!d || Array.isArray(d)) return;
    const xpG = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    // 30d — siempre suma (0 si no hay datos)
    xpEfic30Sum += xpM > 0 ? xpG/xpM : 0;
    if (xpM > 0) xpEfic30Days++;
    hab30Sum    += plan > 0 ? comp/plan : 0;
    if (plan > 0) { hab30Days++; habCount30 += comp; habDays30++; }
    // 7d
    if (k >= hace7stats) {
      xpEfic7Sum += xpM > 0 ? xpG/xpM : 0;
      hab7Sum    += plan > 0 ? comp/plan : 0;
    }
  });
  // Dividir siempre entre 30 y 7
  const xpEfic30 = Math.round(xpEfic30Sum / 30 * 100);
  const hab30    = Math.round(hab30Sum    / 30 * 100);
  const xpEfic7  = Math.round(xpEfic7Sum / 7  * 100);
  const hab7     = Math.round(hab7Sum     / 7  * 100);
  const mediaHab30 = habDays30>0 ? (habCount30/habDays30).toFixed(1) : '—';
  set('stat-media-habitos-30d', mediaHab30);
  set('stat-eficiencia-7d',   xpEfic7 + '%');
  set('stat-consistencia-7d', hab7 + '%');

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
        const h=Math.max(4, d.ratio*100);
        bars[i].style.height=h+'%';
        const r=Math.round(201+(123-201)*d.ratio);
        const g=Math.round(168+(79-168)*d.ratio);
        const b=Math.round(76+(207-76)*d.ratio);
        const op=0.4+d.ratio*0.6;
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

  // Recorrido — campos extra
  set('stat-rec-eficiencia', xpEficGlobal+'%');
  set('stat-rec-habdia', habitosDays>0 ? (habitosSum/habitosDays).toFixed(1) : '—');


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
      : state.allHabits.filter(h => !h.archivado && isScheduledForDate(h, dateStr));
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
  // Barras de progreso del score card — doradas si día perfecto (púrpura en fantasy)
  
  const barColor = isPerfectStats
    ? 'linear-gradient(to right,#5a3a9e,#7b4fcf)'
    : 'var(--accent)';
  const barHab = document.getElementById('stat-day-bar');
  const barXp  = document.getElementById('stat-xp-bar');
  if (barHab) { barHab.style.width = pct + '%'; barHab.style.background = barColor; barHab.classList.toggle('fantasy-perfect-bar', isPerfectStats); }
  if (barXp)  { barXp.style.width  = xpPct + '%'; barXp.style.background = barColor; barXp.classList.toggle('fantasy-perfect-bar', isPerfectStats); }

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
        <div class="check-circle" style="flex-shrink:0"><svg class="check-svg" width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#07090a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
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

  // Construir filas estilo B — una sola card con filas por categoría
  const catRows = Object.entries(CATEGORIES).map(([key, cat]) => {
    const catHabits = habitsSource.filter(h => h.category === key && isScheduledForDate(h, dateStr));
    if (!catHabits.length && !snapMax?.[key]) return '';
    const done = catHabits.filter(h => completedIds.includes(h.id)).length;
    const total = catHabits.length;
    const xpEarned = snapGanado ? (snapGanado[key] || 0) : catHabits.filter(h => completedIds.includes(h.id)).reduce((s, h) => s + (h.xp||10), 0);
    const xpMax    = snapMax    ? (snapMax[key]    || 0) : catHabits.reduce((s, h) => s + (h.xp||10), 0);
    if (xpMax === 0 && !total) return '';
    const pct = xpMax > 0 ? Math.round(xpEarned / xpMax * 100) : 0;
    const isLast = key === 'identidad';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
        <span class="cat-group-label cat-${key}" style="margin:0;min-width:115px;flex-shrink:0;text-align:center;justify-content:center">${cat.label}</span>
        <div style="flex:1;display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;color:var(--muted)">${done} / ${total}</span>
            <span style="font-size:13px;font-weight:700;color:var(--cat-${key})">${pct}%</span>
          </div>
          <div style="height:3px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--cat-${key});border-radius:3px;transition:width 0.6s"></div>
          </div>
        </div>
        <span style="font-size:11px;color:var(--muted);min-width:50px;text-align:right;flex-shrink:0">${xpEarned > 0 ? '+'+xpEarned+' XP' : ''}</span>
      </div>`;
  }).filter(Boolean).join('');

  cl.innerHTML = catRows
    ? `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px">${catRows}</div>`
    : '';

  // Todos los hábitos del día debajo: completados primero, luego pendientes
  // Cada bloque ordenado por categoría: fisico → disciplina → energia → inteligencia → identidad
  const allScheduled = habitsSource.filter(h => isScheduledForDate(h, dateStr));
  const _cdAll = getCompletadosForDate(dateStr);
  const _CAT = ['fisico','disciplina','energia','inteligencia','identidad'];
  const _sortCat = (a, b) => {
    const ia = _CAT.indexOf(a.category); const ib = _CAT.indexOf(b.category);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  };
  const allOrdenados = [
    ...allScheduled.filter(h =>  _cdAll.includes(h.id)).sort(_sortCat),
    ...allScheduled.filter(h => !_cdAll.includes(h.id)).sort(_sortCat),
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
          <div class="check-circle" style="flex-shrink:0"><svg class="check-svg" width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#07090a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
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
          <span>50 XP → ${xpParaNivel(30).toLocaleString()} XP</span>
        </div>`;
    }

    html += `</div></div>`;
  });

  el.innerHTML = html;
}
