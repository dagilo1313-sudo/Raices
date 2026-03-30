import { state, today } from './state.js';
import { db } from './firebase.js';
import {
  collection, doc, setDoc, writeBatch, getDocs, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Validaciones ──────────────────────────────────────────────────────────────

const FILENAME_REGEX = /^raices-backup-\d{4}-\d{2}-\d{2}\.json$/;

function validarNombreArchivo(nombre) {
  return FILENAME_REGEX.test(nombre);
}

function validarContenido(data) {
  if (typeof data !== 'object' || data === null)
    return 'El archivo no es un objeto JSON válido.';
  if (!data.version || !String(data.version).startsWith('raices-'))
    return 'No parece un backup de Raíces (campo version inválido).';
  if (!data.exportadoEn)
    return 'Falta el campo exportadoEn.';
  if (!data.perfil || typeof data.perfil !== 'object')
    return 'Falta o es inválido el campo perfil.';
  if (typeof data.perfil.xpTotal !== 'number')
    return 'El campo perfil.xpTotal debe ser un número.';
  if (typeof data.perfil.nivel !== 'number')
    return 'El campo perfil.nivel debe ser un número.';

  // habits
  const habits = data.allHabits || data.habits || [];
  if (!Array.isArray(habits))
    return 'Falta el array de hábitos.';
  for (const h of habits) {
    if (!h.id || !h.name) return 'Hábito inválido: falta id o name.';
  }

  // completions — formato nuevo: objeto de años { "2025": { "2025-01-01": {...} } }
  if (!data.completions || typeof data.completions !== 'object')
    return 'Falta o es inválido el campo completions.';
  for (const [yr, days] of Object.entries(data.completions)) {
    if (!/^\d{4}$/.test(yr))
      return `Año inválido en completions: "${yr}". Debe ser YYYY.`;
    if (typeof days !== 'object' || days === null)
      return `El año ${yr} en completions debe ser un objeto.`;
    for (const dateKey of Object.keys(days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))
        return `Fecha inválida en completions/${yr}: "${dateKey}".`;
    }
  }

  return null;
}

// ── Estado local ──────────────────────────────────────────────────────────────

let _backupPendiente = null;

function mostrarStatus(msg, tipo) {
  const el = document.getElementById('backup-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = tipo === 'error' ? '#e05c5c' : tipo === 'ok' ? 'var(--accent)' : 'var(--muted)';
  el.textContent = msg;
}

// ── Selección de archivo ──────────────────────────────────────────────────────

export function onBackupFileSelected(input) {
  _backupPendiente = null;
  const btnRestaurar = document.getElementById('btn-restaurar');
  const filenameEl   = document.getElementById('backup-filename');
  if (btnRestaurar) btnRestaurar.style.display = 'none';
  const el = document.getElementById('backup-status');
  if (el) el.style.display = 'none';

  const file = input.files[0];
  if (!file) return;

  if (!validarNombreArchivo(file.name)) {
    mostrarStatus(`Nombre inválido: "${file.name}". Debe ser raices-backup-YYYY-MM-DD.json`, 'error');
    if (filenameEl) filenameEl.style.display = 'none';
    input.value = '';
    return;
  }

  if (filenameEl) {
    filenameEl.textContent = `📄 ${file.name}`;
    filenameEl.style.display = 'block';
  }
  mostrarStatus('Leyendo archivo...', 'info');

  const reader = new FileReader();
  reader.onload = (e) => {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch { mostrarStatus('El archivo no es JSON válido.', 'error'); input.value = ''; return; }

    const error = validarContenido(data);
    if (error) {
      mostrarStatus(`Backup inválido: ${error}`, 'error');
      input.value = '';
      return;
    }

    _backupPendiente = data;
    const habits = data.allHabits || data.habits || [];
    const años = Object.keys(data.completions);
    const totalDias = Object.values(data.completions).reduce((s, yr) => s + Object.keys(yr).length, 0);
    mostrarStatus(`✓ Válido · ${habits.length} hábitos · ${totalDias} días (${años.join(', ')}) · exportado el ${data.exportadoEn.split('T')[0]}`, 'ok');
    if (btnRestaurar) btnRestaurar.style.display = 'block';
  };
  reader.onerror = () => { mostrarStatus('Error al leer el archivo.', 'error'); input.value = ''; };
  reader.readAsText(file);
}

// ── Restauración ──────────────────────────────────────────────────────────────

export async function confirmarRestaurar() {
  if (!_backupPendiente) return;
  // Sin confirm extra — el popup con keyword es suficiente

  const btnRestaurar = document.getElementById('btn-restaurar');
  if (btnRestaurar) { btnRestaurar.disabled = true; btnRestaurar.textContent = 'Restaurando...'; }
  mostrarStatus('Subiendo datos a Firebase...', 'info');

  try {
    const uid = state.currentUser?.uid;
    if (!uid) throw new Error('No hay usuario autenticado.');
    const data = _backupPendiente;
    const habits = data.allHabits || data.habits || [];

    // 1. Borrar hábitos existentes
    const habitsCol = collection(db, 'users', uid, 'habits');
    const habSnap = await getDocs(habitsCol);
    const delBatch = writeBatch(db);
    habSnap.docs.forEach(d => delBatch.delete(d.ref));
    await delBatch.commit();

    // 2. Subir hábitos en batches de 400
    for (let i = 0; i < habits.length; i += 400) {
      const batch = writeBatch(db);
      habits.slice(i, i + 400).forEach(h => {
        const { id, ...rest } = h;
        batch.set(doc(db, 'users', uid, 'habits', id), rest);
      });
      await batch.commit();
    }

    // 3. Borrar completions existentes (todos los años)
    const compsCol = collection(db, 'users', uid, 'completions');
    const compsSnap = await getDocs(compsCol);
    await Promise.all(compsSnap.docs.map(d => deleteDoc(d.ref)));

    // 4. Subir completions año por año (formato nuevo directo)
    await Promise.all(
      Object.entries(data.completions).map(([yr, days]) =>
        setDoc(doc(db, 'users', uid, 'completions', yr), days)
      )
    );

    // 5. Perfil
    await setDoc(doc(db, 'users', uid, 'profile', 'data'), data.perfil);

    mostrarStatus('✓ Backup restaurado. Recargando...', 'ok');
    if (btnRestaurar) btnRestaurar.style.display = 'none';
    _backupPendiente = null;
    setTimeout(() => window.location.reload(), 1500);

  } catch (err) {
    console.error('Error restaurando backup:', err);
    mostrarStatus(`Error al restaurar: ${err.message}`, 'error');
    if (btnRestaurar) { btnRestaurar.disabled = false; btnRestaurar.textContent = 'Restaurar backup ↑'; }
  }
}

// ── Descargar backup (formato nuevo: completions por año) ─────────────────────

export function descargarBackup() {
  // Agrupar completions por año
  const completionsByYear = {};
  Object.entries(state.completions).forEach(([k, v]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
    const yr = k.substring(0, 4);
    if (!completionsByYear[yr]) completionsByYear[yr] = {};
    completionsByYear[yr][k] = v;
  });

  const backup = {
    exportadoEn: new Date().toISOString(),
    version: 'raices-v56',
    perfil: state.perfil,
    habits: state.habits,
    allHabits: state.allHabits,
    completions: completionsByYear,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `raices-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
