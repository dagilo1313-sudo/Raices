import { db } from './firebase.js';
import {
  collection, doc, addDoc, getDocs, deleteDoc,
  setDoc, getDoc, updateDoc, orderBy, query,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { state, today } from './state.js';

// ── Refs ──
const habitsRef  = () => collection(db, 'users', state.currentUser.uid, 'habits');
const compsRef   = () => doc(db, 'users', state.currentUser.uid, 'completions', 'data');

// ── Cargar datos ──
export async function loadData() {
  const snap = await getDocs(query(habitsRef(), orderBy('created', 'asc')));
  state.habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const c = await getDoc(compsRef());
  state.completions = c.exists() ? c.data() : {};
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
    state.completions[date].push(id);
    return true; // completado
  } else {
    state.completions[date].splice(idx, 1);
    return false; // descompletado
  }
}

// ── Crear hábito ──
export async function createHabit({ name, emoji, category, xp }) {
  const data = {
    name,
    emoji,
    category,
    xp,
    created: today(),
  };
  const ref = await addDoc(habitsRef(), data);
  state.habits.push({ id: ref.id, ...data });
}

// ── Editar hábito ──
export async function editHabit(id, { name, emoji, category, xp }) {
  const idx = state.habits.findIndex(h => h.id === id);
  if (idx === -1) return;
  const updates = { name, emoji, category, xp };
  state.habits[idx] = { ...state.habits[idx], ...updates };
  await updateDoc(doc(db, 'users', state.currentUser.uid, 'habits', id), updates);
}

// ── Eliminar hábito ──
export async function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  // Limpiar completions
  Object.keys(state.completions).forEach(date => {
    state.completions[date] = state.completions[date].filter(hid => hid !== id);
  });
  await deleteDoc(doc(db, 'users', state.currentUser.uid, 'habits', id));
  await saveCompletions();
}
