import { state, today, isScheduledForDate, isCompleted } from './state.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fechaHace30() {
  const d = new Date(today() + 'T12:00:00');
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function formatDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Calcular resumen del último mes ──────────────────────────────────────────

function calcularResumen() {
  const desde = fechaHace30();
  const hasta = today();
  const keys = Object.keys(state.completions)
    .filter(k => k !== 'updatedAt' && /^\d{4}-\d{2}-\d{2}$/.test(k) && k >= desde && k <= hasta)
    .sort();

  let diasPerfectos = 0, diasBuenos = 0;
  let xpGanado = 0, xpMax = 0;
  let ratioSum = 0, ratioDays = 0;
  let rachaPerfActual = 0, rachaBuenosActual = 0;
  let rachaPerfMejor = 0, rachaBuenosMejor = 0;
  let rachaPerfTemp = 0, rachaBuenosTemp = 0;

  // Por hábito
  const habComp = {}, habPlan = {};

  keys.forEach(k => {
    const d = state.completions[k];
    if (!d || Array.isArray(d)) { rachaPerfTemp = 0; rachaBuenosTemp = 0; return; }
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    const xpG  = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM  = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    xpGanado += xpG; xpMax += xpM;
    const esPerfecto = plan > 0 && comp === plan;
    const esBueno    = xpM > 0 && xpG / xpM >= 0.8;
    if (esPerfecto) { diasPerfectos++; rachaPerfTemp++; rachaPerfMejor = Math.max(rachaPerfMejor, rachaPerfTemp); }
    else rachaPerfTemp = 0;
    if (esBueno) { diasBuenos++; rachaBuenosTemp++; rachaBuenosMejor = Math.max(rachaBuenosMejor, rachaBuenosTemp); }
    else rachaBuenosTemp = 0;
    if (plan > 0) { ratioSum += comp / plan; ratioDays++; }
    if (Array.isArray(d.planificados) && Array.isArray(d.completados)) {
      d.planificados.forEach(id => {
        habPlan[id] = (habPlan[id] || 0) + 1;
        if (d.completados.includes(id)) habComp[id] = (habComp[id] || 0) + 1;
      });
    }
  });

  // Rachas actuales (desde hoy hacia atrás)
  let pStop = false, bStop = false;
  for (let i = keys.length - 1; i >= 0; i--) {
    const d = state.completions[keys[i]];
    if (!d || Array.isArray(d)) break;
    const comp = Array.isArray(d.completados) ? d.completados.length : 0;
    const plan = Array.isArray(d.planificados) ? d.planificados.length : 0;
    const xpG  = d.xpGanadoPorCat ? Object.values(d.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM  = d.xpMaxPorCat    ? Object.values(d.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    if (!pStop) { if (plan > 0 && comp === plan) rachaPerfActual++; else pStop = true; }
    if (!bStop) { if (xpM > 0 && xpG / xpM >= 0.8) rachaBuenosActual++; else bStop = true; }
    if (pStop && bStop) break;
  }

  const eficiencia   = xpMax > 0 ? Math.round(xpGanado / xpMax * 100) : 0;
  const consistencia = ratioDays > 0 ? Math.round(ratioSum / ratioDays * 100) : 0;

  // Hábitos top/flop
  const habStats = state.habits
    .filter(h => !h.archivado && habPlan[h.id] > 0)
    .map(h => ({ name: h.name, pct: Math.round((habComp[h.id] || 0) / habPlan[h.id] * 100) }))
    .sort((a, b) => b.pct - a.pct);
  const top2  = habStats.slice(0, 2);
  const flop2 = habStats.slice(-2).reverse();

  return {
    desde, hasta, diasRegistrados: keys.length,
    diasPerfectos, diasBuenos,
    eficiencia, consistencia,
    xpGanado,
    rachaPerfActual, rachaPerfMejor,
    rachaBuenosActual, rachaBuenosMejor,
    top2, flop2,
    nombre: state.perfil.nombre || 'Raíces',
  };
}

// ── Generar texto del email ───────────────────────────────────────────────────

function generarTextoEmail(r) {
  const sep = '─────────────────────────────';
  const linea = (label, val) => `  ${label.padEnd(24)} ${val}`;

  const tops  = r.top2.map(h  => `  ✦ ${h.name} (${h.pct}%)`).join('\n');
  const flops = r.flop2.map(h => `  ✕ ${h.name} (${h.pct}%)`).join('\n');

  return [
    `RESUMEN DE RAÍCES — ${formatDate(r.desde)} al ${formatDate(r.hasta)}`,
    `Hola ${r.nombre} 👋`,
    '',
    sep,
    'RENDIMIENTO GENERAL',
    sep,
    linea('Días registrados', `${r.diasRegistrados} días`),
    linea('Eficiencia XP', `${r.eficiencia}%`),
    linea('Consistencia hábitos', `${r.consistencia}%`),
    linea('XP ganado', `${r.xpGanado.toLocaleString('es-ES')} XP`),
    '',
    sep,
    'DÍAS ESPECIALES',
    sep,
    linea('Días perfectos ✦', `${r.diasPerfectos}  (racha actual: ${r.rachaPerfActual} · mejor: ${r.rachaPerfMejor})`),
    linea('Días buenos ≥80% XP', `${r.diasBuenos}  (racha actual: ${r.rachaBuenosActual} · mejor: ${r.rachaBuenosMejor})`),
    '',
    sep,
    'HÁBITOS DESTACADOS',
    sep,
    'Más consistentes:',
    tops || '  (sin datos)',
    '',
    'Más abandonados:',
    flops || '  (sin datos)',
    '',
    sep,
    'Generado por Raíces · raices.app',
    sep,
  ].join('\n');
}

// ── Función principal: enviar resumen ────────────────────────────────────────

export function enviarResumenMensual() {
  const input  = document.getElementById('resumen-email-input');
  const okEl   = document.getElementById('resumen-ok');
  const errEl  = document.getElementById('resumen-err');
  const email  = input?.value?.trim();

  if (okEl)  okEl.style.display  = 'none';
  if (errEl) errEl.style.display = 'none';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) errEl.style.display = 'block';
    return;
  }

  const r       = calcularResumen();
  const subject = encodeURIComponent(`Resumen Raíces — ${formatDate(r.desde)} al ${formatDate(r.hasta)}`);
  const body    = encodeURIComponent(generarTextoEmail(r));
  const mailto  = `mailto:${email}?subject=${subject}&body=${body}`;

  window.location.href = mailto;

  if (okEl) {
    okEl.style.display = 'block';
    setTimeout(() => { okEl.style.display = 'none'; }, 3000);
  }
}

// ── Función backup ────────────────────────────────────────────────────────────

export function descargarBackup() {
  const backup = {
    exportadoEn: new Date().toISOString(),
    version: 'raices-v52',
    perfil: state.perfil,
    habits: state.habits,
    allHabits: state.allHabits,
    completions: state.completions,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `raices-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
