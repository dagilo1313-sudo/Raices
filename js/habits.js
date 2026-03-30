import { db } from './firebase.js';
import {
  collection, doc, addDoc, getDocs, deleteDoc,
  setDoc, getDoc, updateDoc, orderBy, query, writeBatch, increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { state, today, calcularNivel, isScheduledForDate } from './state.js';

// ── Helper: extraer completados de cualquier formato de completions ──
const completadosOf = (dateStr) => {
  const d = state.completions[dateStr];
  if (!d) return [];
  return Array.isArray(d) ? d : (d.completados || []);
};

// ── Refs ──
const habitsRef    = () => collection(db, 'users', state.currentUser.uid, 'habits');
const compsCol     = () => collection(db, 'users', state.currentUser.uid, 'completions');
const compsMonthRef = (monthKey) => doc(db, 'users', state.currentUser.uid, 'completions', monthKey);
const tareasRef    = () => doc(db, 'users', state.currentUser.uid, 'tareas', 'data');
const profileRef   = () => doc(db, 'users', state.currentUser.uid, 'profile', 'data');
const getMonthKey  = (dateStr) => dateStr.substring(0, 7);
const currentMonthKey = () => getMonthKey(today());

// ── Cargar datos iniciales (solo mes actual) ──
export async function loadData() {
  try {
    const snap = await getDocs(query(habitsRef(), orderBy('created', 'asc')));
    state.allHabits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.habits = state.allHabits.filter(h => !h.archivado);
  } catch(e) { console.error('Error cargando hábitos:', e); }

  try {
    const mk = currentMonthKey();
    state.currentMonthKey = mk;
    const snap = await getDoc(compsMonthRef(mk));
    state.completions = snap.exists() ? snap.data() : {};
  } catch(e) { console.error('Error cargando completions del mes:', e); }

  try {
    const p = await getDoc(profileRef());
    if (p.exists()) {
      const data = p.data();
      state.perfil.xpTotal       = data.xpTotal       || 0;
      state.perfil.nivel         = data.nivel         || 1;
      state.perfil.clase         = data.clase         || 0;
      state.perfil.diasPerfectos = data.diasPerfectos || 0;
      state.perfil.diasBuenos    = data.diasBuenos    || 0;
      state.perfil.nombre        = data.nombre        || 'David';
    } else {
      await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 });
      state.perfil = { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 };
    }
  } catch(e) {
    console.error('Error con perfil:', e);
  }

  // Cargar tareas
  try {
    const t = await getDoc(tareasRef());
    state.tareas = t.exists() ? (t.data().lista || []) : [];
  } catch(e) { console.error('Error cargando tareas:', e); state.tareas = []; }
}


// ── Cargar histórico completo para Stats ──
export async function loadAllCompletions() {
  if (state.statsLoaded) return; // ya cargado
  try {
    const snap = await getDocs(compsCol());
    state.statsCompletions = {};
    snap.docs.forEach(d => {
      Object.assign(state.statsCompletions, d.data());
    });
    // Incluir también el mes actual que ya tenemos en memoria
    Object.assign(state.statsCompletions, state.completions);
    state.statsLoaded = true;
  } catch(e) { console.error('Error cargando histórico completo:', e); }
}

// ── Cargar un mes específico para Histórico ──
export async function loadMonthCompletions(monthKey) {
  if (state.historicMonthKey === monthKey) return; // ya cargado
  try {
    const snap = await getDoc(compsMonthRef(monthKey));
    const monthData = snap.exists() ? snap.data() : {};
    // Si es el mes actual, usar state.completions; si no, sustituir
    if (monthKey === state.currentMonthKey) {
      state.historicMonthKey = monthKey;
      return state.completions;
    }
    // Merge en completions solo los días de ese mes
    // Primero limpiar días de otros meses que no sea el actual ni el histórico
    Object.keys(state.completions).forEach(k => {
      if (k.startsWith(monthKey) === false && k.startsWith(state.currentMonthKey) === false) {
        delete state.completions[k];
      }
    });
    Object.assign(state.completions, monthData);
    state.historicMonthKey = monthKey;
  } catch(e) { console.error('Error cargando mes:', monthKey, e); }
}

// ── Helper: leer completados (compatible con formato antiguo array y nuevo objeto) ──
export function getCompletadosForDate(dateStr) {
  return completadosOf(dateStr);
}

// ── Helper: leer planificados para un día (null si no hay snapshot) ──
export function getPlanificadosForDate(dateStr) {
  const d = state.completions[dateStr];
  if (!d || Array.isArray(d)) return null;
  return d.planificados || null;
}


// ── Actualizar snapshot del día actual ──
async function actualizarSnapshotHoy() {
  const date = today();
  const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
  const planificados = scheduled.map(h => h.id);
  const completados = getCompletadosForDate(date);
  const updatedAt = new Date().toISOString();

  // XP snapshot: ganado y máximo por categoría + total
  const xpGanadoPorCat = {};
  const xpMaxPorCat = {};
  let xpTotal = 0;
  scheduled.forEach(h => {
    const cat = h.category || 'disciplina';
    const xp = h.xp || 10;
    xpMaxPorCat[cat] = (xpMaxPorCat[cat] || 0) + xp;
    if (completados.includes(h.id)) {
      xpGanadoPorCat[cat] = (xpGanadoPorCat[cat] || 0) + xp;
      xpTotal += xp;
    }
  });

  state.completions[date] = { completados, planificados, xpTotal, xpGanadoPorCat, xpMaxPorCat, updatedAt };
  // Escribir solo el documento del mes actual
  const mk = currentMonthKey();
  const monthData = {};
  Object.entries(state.completions).forEach(([k, v]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) monthData[k] = v;
  });
  await setDoc(compsMonthRef(mk), monthData);
}

// ── Helpers de lectura snapshot XP ──
export function getXPTotalSnapshot(dateStr) {
  const d = state.completions[dateStr];
  if (!d || Array.isArray(d) || d.xpTotal === undefined) return null;
  return d.xpTotal;
}
export function getXPGanadoPorCat(dateStr) {
  const d = state.completions[dateStr];
  if (!d || Array.isArray(d)) return null;
  return d.xpGanadoPorCat || null;
}
export function getXPMaxPorCat(dateStr) {
  const d = state.completions[dateStr];
  if (!d || Array.isArray(d)) return null;
  return d.xpMaxPorCat || null;
}

// ── Recalcular XP snapshot del día actual (se llama tras cada toggle) ──
function recalcularXPSnapshot(date) {
  const dayData = state.completions[date];
  if (!dayData || Array.isArray(dayData)) return;
  const completados = dayData.completados || [];
  const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
  const xpGanadoPorCat = {};
  const xpMaxPorCat = {};
  let xpTotal = 0;
  scheduled.forEach(h => {
    const cat = h.category || 'disciplina';
    const xp = h.xp || 10;
    xpMaxPorCat[cat] = (xpMaxPorCat[cat] || 0) + xp;
    if (completados.includes(h.id)) {
      xpGanadoPorCat[cat] = (xpGanadoPorCat[cat] || 0) + xp;
      xpTotal += xp;
    }
  });
  dayData.xpTotal = xpTotal;
  dayData.xpGanadoPorCat = xpGanadoPorCat;
  dayData.xpMaxPorCat = xpMaxPorCat;
}

// ── Guardar completions ──
export async function saveCompletions() {
  // Guardar solo el mes actual
  const mk = currentMonthKey();
  const monthData = {};
  Object.entries(state.completions).forEach(([k, v]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) monthData[k] = v;
  });
  await setDoc(compsMonthRef(mk), monthData);
}

// ── Toggle completado ──
export async function toggleHabit(id) {
  const date = today();
  // Inicializar con nueva estructura si no existe
  if (!state.completions[date]) {
    const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
    state.completions[date] = { completados: [], planificados: scheduled.map(h => h.id) };
  }
  // Compatibilidad: migrar formato antiguo (array) a nuevo (objeto)
  if (Array.isArray(state.completions[date])) {
    const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
    state.completions[date] = {
      completados: state.completions[date],
      planificados: scheduled.map(h => h.id),
    };
  }
  // Actualizar planificados y XP snapshot siempre
  const scheduledNow = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
  state.completions[date].planificados = scheduledNow.map(h => h.id);
  state.completions[date].updatedAt = new Date().toISOString();
  state.completions.updatedAt = new Date().toISOString();

  const idx = state.completions[date].completados.indexOf(id);

  if (idx === -1) {
    // Completar — sumar XP con increment atómico
    state.completions[date].completados.push(id);
    const habit = state.habits.find(h => h.id === id);
    const xpGanado = habit ? (habit.xp || 10) : 10;

    const calcAntes = calcularNivel(state.perfil.xpTotal);
    state.perfil.xpTotal += xpGanado;
    const calcDespues = calcularNivel(state.perfil.xpTotal);

    const subioNivel = calcDespues.nivel > calcAntes.nivel || calcDespues.clase > calcAntes.clase;
    const subioRango = calcDespues.clase > calcAntes.clase;

    state.perfil.nivel = calcDespues.nivel;
    state.perfil.clase = calcDespues.clase;

    // Actualizar XP snapshot del día
    recalcularXPSnapshot(date);

    // Comprobar si hoy es día perfecto y día bueno tras completar
    const scheduled = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
    const todayIsPerfect = scheduled.length > 0 && scheduled.every(h => state.completions[date].completados.includes(h.id));
    const dayData = state.completions[date];
    const xpG = dayData.xpGanadoPorCat ? Object.values(dayData.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpM = dayData.xpMaxPorCat    ? Object.values(dayData.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    const todayIsBueno = xpM > 0 && xpG / xpM >= 0.8;

    // Guardar: XP con increment atómico, nivel/clase y días especiales
    const updates = {
      xpTotal: increment(xpGanado),
      nivel: calcDespues.nivel,
      clase: calcDespues.clase,
    };

    if (todayIsPerfect) {
      state.perfil.diasPerfectos += 1;
      updates.diasPerfectos = increment(1);
    }
    if (todayIsBueno) {
      state.perfil.diasBuenos = (state.perfil.diasBuenos || 0) + 1;
      updates.diasBuenos = increment(1);
    }

    await updateDoc(profileRef(), updates);

    return { xpGanado, subioNivel, subioRango, calcDespues };

  } else {
    // Desmarcar — restar XP con increment negativo
    state.completions[date].completados.splice(idx, 1);
    const habit = state.habits.find(h => h.id === id);
    const xpGanado = habit ? (habit.xp || 10) : 10;

    state.perfil.xpTotal = Math.max(0, state.perfil.xpTotal - xpGanado);
    const calc = calcularNivel(state.perfil.xpTotal);
    state.perfil.nivel = calc.nivel;
    state.perfil.clase = calc.clase;

    // Actualizar XP snapshot del día
    recalcularXPSnapshot(date);

    // Comprobar si hoy sigue siendo día perfecto y día bueno tras desmarcar
    const scheduledDes = state.habits.filter(h => !h.archivado && isScheduledForDate(h, date));
    const siguePerf = scheduledDes.length > 0 && scheduledDes.every(h => state.completions[date].completados.includes(h.id));
    const dayDataDes = state.completions[date];
    const xpGdes = dayDataDes.xpGanadoPorCat ? Object.values(dayDataDes.xpGanadoPorCat).reduce((s,v)=>s+v,0) : 0;
    const xpMdes = dayDataDes.xpMaxPorCat    ? Object.values(dayDataDes.xpMaxPorCat).reduce((s,v)=>s+v,0)    : 0;
    const sigueBueno = xpMdes > 0 && xpGdes / xpMdes >= 0.8;

    const dpUpdates = {};
    if (!siguePerf && state.perfil.diasPerfectos > 0) {
      state.perfil.diasPerfectos -= 1;
      dpUpdates.diasPerfectos = increment(-1);
    }
    if (!sigueBueno && (state.perfil.diasBuenos || 0) > 0) {
      state.perfil.diasBuenos -= 1;
      dpUpdates.diasBuenos = increment(-1);
    }

    await updateDoc(profileRef(), {
      xpTotal: increment(-xpGanado),
      nivel: calc.nivel,
      clase: calc.clase,
      ...dpUpdates,
    });

    return { xpGanado: 0, subioNivel: false, subioRango: false, calcDespues: calc };
  }
}

// ── Crear hábito ──
export async function createHabit({ name, emoji, category, xp, days }) {
  const data = { name, emoji, category, xp, days: days || [], created: today() };
  const ref = await addDoc(habitsRef(), data);
  const newHabit = { id: ref.id, ...data };
  state.habits.push(newHabit);
  state.allHabits.push(newHabit);
  // Si el nuevo hábito aplica para hoy, actualizar snapshot
  if (isScheduledForDate(newHabit, today())) await actualizarSnapshotHoy();
}

// ── Editar hábito ──
export async function editHabit(id, { name, emoji, category, xp, days }) {
  const idx = state.habits.findIndex(h => h.id === id);
  if (idx === -1) return;
  const updates = { name, emoji, category, xp, days: days || [] };
  state.habits[idx] = { ...state.habits[idx], ...updates };
  const idxAll = state.allHabits.findIndex(h => h.id === id);
  if (idxAll !== -1) state.allHabits[idxAll] = { ...state.allHabits[idxAll], ...updates };
  await updateDoc(doc(db, 'users', state.currentUser.uid, 'habits', id), updates);
  // Actualizar snapshot por si cambiaron los días programados
  await actualizarSnapshotHoy();
}

// ── Archivar hábito (soft delete — conserva historial) ──
export async function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  const idxAll = state.allHabits.findIndex(h => h.id === id);
  if (idxAll !== -1) state.allHabits[idxAll].archivado = true;
  await updateDoc(doc(db, 'users', state.currentUser.uid, 'habits', id), { archivado: true });
  // Actualizar snapshot por si estaba planificado para hoy
  await actualizarSnapshotHoy();
}

// ── Guardar tareas ──
async function saveTareas() {
  await setDoc(tareasRef(), { lista: state.tareas });
}

// ── Crear tarea ──
export async function createTarea(nombre, urgente = false) {
  const tarea = { id: Date.now().toString(), nombre, urgente, done: false };
  state.tareas.push(tarea);
  await saveTareas();
  return tarea;
}

// ── Toggle tarea ──
export async function toggleTarea(id) {
  const t = state.tareas.find(t => t.id === id);
  if (t) { t.done = !t.done; await saveTareas(); }
}

// ── Borrar tareas completadas ──
export async function borrarTareasCompletadas() {
  state.tareas = state.tareas.filter(t => !t.done);
  await saveTareas();
}

// ── Resetear solo el progreso ──
export async function resetProgress() {
  { const _cs = await getDocs(compsCol()); await Promise.all(_cs.docs.map(d => deleteDoc(d.ref))); }
  await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 });
  state.completions = {};
  state.perfil = { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 };
}

// ── Resetear todos los datos ──
export async function resetAllData() {
  const snap = await getDocs(habitsRef());
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  { const _cs = await getDocs(compsCol()); await Promise.all(_cs.docs.map(d => deleteDoc(d.ref))); }
  await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 });
  state.habits = [];
  state.allHabits = [];
  state.completions = {};
  state.perfil = { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 };
}
