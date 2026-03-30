import { state, today } from './state.js';

// ── Backup completo ───────────────────────────────────────────────────────────

export function descargarBackup() {
  const backup = {
    exportadoEn: new Date().toISOString(),
    version: 'raices-v53',
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
