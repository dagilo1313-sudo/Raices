// ── Mensajes ──
export function showMsg(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
}

export function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Toast ──
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Confetti ──
export function showConfetti() {
  const colors = ['#8fb339', '#c4a84f', '#5c8a3c', '#d4d9c4', '#e05c5c', '#5c8ae0'];
  for (let i = 0; i < 14; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${25 + Math.random() * 50}vw;
        top: 40vh;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.3}s;
        transform: rotate(${Math.random() * 360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }, i * 35);
  }
}

// ── Router de vistas ──
export function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('nav-' + view).classList.add('active');
  // Resetear color gold del nav-hoy si salimos de hoy
  if (view !== 'hoy') {
    const navHoy = document.getElementById('nav-hoy');
    if (navHoy) navHoy.style.color = '';
  }
}
