import { db } from './firebase.js';
import {
  collection, doc, addDoc, getDocs, deleteDoc,
  setDoc, getDoc, updateDoc, orderBy, query, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { state, today, calcularNivel } from './state.js';

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

  // Cargar perfil del viajero
  try {
    const p = await getDoc(profileRef());
    console.log('Profile exists:', p.exists(), 'Path:', profileRef().path);
    if (p.exists()) {
      const data = p.data();
      state.perfil.xpTotal = data.xpTotal || 0;
      state.perfil.nivel   = data.nivel   || 1;
      state.perfil.clase   = data.clase   || 0;
      console.log('Perfil cargado:', state.perfil);
    } else {
      console.log('Creando perfil nuevo...');
      await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0 });
      console.log('Perfil creado OK');
      state.perfil = { xpTotal: 0, nivel: 1, clase: 0 };
    }
  } catch(e) {
    console.error('Error con perfil (posiblemente reglas de Firestore):', e);
  }
}

// ── Guardar completions ──
export async function saveCompletions() {
  await setDoc(compsRef(), state.completions);
}

// ── Guardar perfil ──
export async function saveProfile() {
  await setDoc(profileRef(), {
    xpTotal: state.perfil.xpTotal,
    nivel:   state.perfil.nivel,
    clase:   state.perfil.clase,
  }, { merge: true });
}

// ── Toggle completado ── (devuelve xpGanado o 0 si se desmarca)
export async function toggleHabit(id) {
  const date = today();
  if (!state.completions[date]) state.completions[date] = [];
  const idx = state.completions[date].indexOf(id);

  if (idx === -1) {
    // Completar — sumar XP
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
    await saveProfile();

    return { xpGanado, subioNivel, subioRango, calcDespues };
  } else {
    // Desmarcar — restar XP
    state.completions[date].splice(idx, 1);
    const habit = state.habits.find(h => h.id === id);
    const xpGanado = habit ? (habit.xp || 10) : 10;
    state.perfil.xpTotal = Math.max(0, state.perfil.xpTotal - xpGanado);
    const calc = calcularNivel(state.perfil.xpTotal);
    state.perfil.nivel = calc.nivel;
    state.perfil.clase = calc.clase;
    await saveProfile();
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
  await setDoc(profileRef(), { xpTotal: 0, nivel: 1, clase: 0 });
  state.habits = [];
  state.completions = {};
  state.perfil = { xpTotal: 0, nivel: 1, clase: 0 };
}
