import { state, today } from './state.js';
import { db } from './firebase.js';
import {
  collection, doc, setDoc, writeBatch, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const FILENAME_REGEX = /^raices-backup-\d{4}-\d{2}-\d{2}\.json$/;

function validarNombreArchivo(nombre) {
  return FILENAME_REGEX.test(nombre);
}

function validarContenido(data) {
  if (typeof data !== 'object' || data === null) return 'El archivo no es un objeto JSON válido.';
  if (!data.version || !String(data.version).startsWith('raices-')) return 'No parece un backup de Raíces (campo version inválido).';
  if (!data.exportadoEn) return 'Falta el campo exportadoEn.';
  if (!data.perfil || typeof data.perfil !== 'object') return 'Falta o es inválido el campo perfil.';
  if (typeof data.perfil.xpTotal !== 'number') return 'El campo perfil.xpTotal debe ser un número.';
  if (typeof data.perfil.nivel !== 'number') return 'El campo perfil.nivel debe ser un número.';
  const habits = data.allHabits || data.habits || [];
  if (!Array.isArray(habits)) return 'Falta el array de hábitos.';
  for (const h of habits) {
    if (!h.id || !h.name) return `Hábito inválido: falta id o name.`;
  }
  if (!data.completions || typeof data.completions !== 'object') return 'Falta o es inválido el campo completions.';
  return null;
}

let _backupPendiente = null;

function mostrarStatus(msg, tipo) {
  const el = document.getElementById('backup-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = tipo === 'error' ? '#e05c5c' : tipo === 'ok' ? 'var(--accent)' : 'var(--muted)';
  el.textContent = msg;
}

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
    mostrarStatus(`✓ Archivo válido · ${habits.length} hábitos · exportado el ${data.exportadoEn.split('T')[0]}`, 'ok');
    if (btnRestaurar) btnRestaurar.style.display = 'block';
  };
  reader.onerror = () => { mostrarStatus('Error al leer el archivo.', 'error'); input.value = ''; };
  reader.readAsText(file);
}

export async function confirmarRestaurar() {
  if (!_backupPendiente) return;

  const ok = window.confirm('⚠️ Esto sobreescribirá TODOS tus datos actuales (hábitos, progreso y registros).\n\n¿Estás seguro?');
  if (!ok) return;

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
    const snap = await getDocs(habitsCol);
    const delBatch = writeBatch(db);
    snap.docs.forEach(d => delBatch.delete(d.ref));
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

    // 3. Completions y perfil
    await setDoc(doc(db, 'users', uid, 'completions', 'data'), data.completions);
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

export function descargarBackup() {
  const backup = {
    exportadoEn: new Date().toISOString(),
    version: 'raices-v54',
    perfil: state.perfil,
    habits: state.habits,
    allHabits: state.allHabits,
    completions: state.completions,
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
