import { db } from './firebase.js';
import {
  collection, doc, addDoc, getDocs, deleteDoc,
  setDoc, getDoc, updateDoc, orderBy, query, writeBatch, increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { state, today, calcularNivel, isScheduledForDate, getDiasPerfectos } from './state.js';

// ── Refs ──
const habitsRef  = () => collection(db, 'users', state.currentUser.uid, 'habits');
const compsRef   = () => doc(db, 'users', state.currentUser.uid, 'completions', 'data');
const profileRef = () => doc(db, 'users', state.currentUser.uid, 'profile', 'data');

// ── Cargar datos ──
export async function loadData() {
  try {
    const snap = await getDocs(query(habitsRef(), orderBy('created', 'asc')));
    state.habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('Error cargando hábitos:', e); }

  try {
    const c = await getDoc(compsRef());
    state.completions = c.exists() ? c.data() : {};
  } catch(e) { console.error('Error cargando completions:', e); }

  try {
    const p = await getDoc(profileRef());
    if (p.exists()) {
      const data = p.data();
      state.perfil.xpTotal       = data.xpTotal       || 0;
      state.perfil.nivel         = data.nivel         || 1;
      state.perfil.clase         = data.clase         || 0;
      state.perfil.diasPerfectos = data.diasPerfectos || 0;
    } else {
      await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 });
      state.perfil = { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 };
    }
  } catch(e) {
    console.error('Error con perfil:', e);
  }
}

// ── Guardar completions ──
export async function saveCompletions() {
  await setDoc(compsRef(), state.completions);
}

// ── Toggle completado ──
export async function toggleHabit(id) {
  const date = today();
  if (!state.completions[date]) state.completions[date] = [];
  const idx = state.completions[date].indexOf(id);

  if (idx === -1) {
    // Completar — sumar XP con increment atómico
    state.completions[date].push(id);
    const habit = state.habits.find(h => h.id === id);
    const xpGanado = habit ? (habit.xp || 10) : 10;

    const calcAntes = calcularNivel(state.perfil.xpTotal);
    state.perfil.xpTotal += xpGanado;
    const calcDespues = calcularNivel(state.perfil.xpTotal);

    const subioNivel = calcDespues.nivel > calcAntes.nivel || calcDespues.clase > calcAntes.clase;
    const subioRango = calcDespues.clase > calcAntes.clase;

    state.perfil.nivel = calcDespues.nivel;
    state.perfil.clase = calcDespues.clase;

    // Comprobar si hoy es día perfecto tras completar
    const scheduled = state.habits.filter(h => isScheduledForDate(h, date));
    const todayIsPerfect = scheduled.length > 0 && scheduled.every(h => state.completions[date].includes(h.id));

    // Guardar: XP con increment atómico, nivel/clase y diasPerfectos
    const updates = {
      xpTotal: increment(xpGanado),
      nivel: calcDespues.nivel,
      clase: calcDespues.clase,
    };

    // Recalcular días perfectos desde el historial y guardar
    // (solo cuando cambia — al terminar todos los hábitos del día)
    if (todayIsPerfect) {
      state.perfil.diasPerfectos = getDiasPerfectos();
      updates.diasPerfectos = state.perfil.diasPerfectos;
    }

    await updateDoc(profileRef(), updates);

    return { xpGanado, subioNivel, subioRango, calcDespues };

  } else {
    // Desmarcar — restar XP con increment negativo
    state.completions[date].splice(idx, 1);
    const habit = state.habits.find(h => h.id === id);
    const xpGanado = habit ? (habit.xp || 10) : 10;

    state.perfil.xpTotal = Math.max(0, state.perfil.xpTotal - xpGanado);
    const calc = calcularNivel(state.perfil.xpTotal);
    state.perfil.nivel = calc.nivel;
    state.perfil.clase = calc.clase;

    // Recalcular días perfectos (puede que hoy ya no sea perfecto)
    state.perfil.diasPerfectos = getDiasPerfectos();

    await updateDoc(profileRef(), {
      xpTotal: increment(-xpGanado),
      nivel: calc.nivel,
      clase: calc.clase,
      diasPerfectos: state.perfil.diasPerfectos,
    });

    return { xpGanado: 0, subioNivel: false, subioRango: false, calcDespues: calc };
  }
}

// ── Crear hábito ──
export async function createHabit({ name, emoji, category, xp, days }) {
  const data = { name, emoji, category, xp, days: days || [], created: today() };
  const ref = await addDoc(habitsRef(), data);
  state.habits.push({ id: ref.id, ...data });
}

// ── Editar hábito ──
export async function editHabit(id, { name, emoji, category, xp, days }) {
  const idx = state.habits.findIndex(h => h.id === id);
  if (idx === -1) return;
  const updates = { name, emoji, category, xp, days: days || [] };
  state.habits[idx] = { ...state.habits[idx], ...updates };
  await updateDoc(doc(db, 'users', state.currentUser.uid, 'habits', id), updates);
}

// ── Eliminar hábito ──
export async function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  Object.keys(state.completions).forEach(date => {
    state.completions[date] = state.completions[date].filter(hid => hid !== id);
  });
  await deleteDoc(doc(db, 'users', state.currentUser.uid, 'habits', id));
  await saveCompletions();
}

// ── Resetear todos los datos ──
export async function resetAllData() {
  const snap = await getDocs(habitsRef());
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  await setDoc(compsRef(), {});
  await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 });
  state.habits = [];
  state.completions = {};
  state.perfil = { xpTotal: 0, nivel: 1, clase: 0, diasPerfectos: 0 };
}
