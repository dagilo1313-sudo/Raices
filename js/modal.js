import { state, CATEGORIES, XP_VALUES, EMOJIS } from './state.js';
import { createHabit, editHabit } from './habits.js';
import { renderAll } from './render.js';
import { showToast } from './ui.js';

let editingId = null;
let selectedEmoji = '🌿';
let selectedCategory = 'disciplina';
let selectedXP = 10;

// ── Abrir modal nuevo ──
export function openCreateModal() {
  editingId = null;
  selectedEmoji = '🌿';
  selectedCategory = 'disciplina';
  selectedXP = 10;
  document.getElementById('modal-title').textContent = 'Planta un nuevo hábito';
  document.getElementById('habit-name-input').value = '';
  document.getElementById('btn-modal-submit').textContent = 'Plantar hábito 🌱';
  renderModalInternals();
  document.getElementById('modal').classList.add('open');
}

// ── Abrir modal editar ──
export function openEditModal(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  editingId = id;
  selectedEmoji = habit.emoji || '🌿';
  selectedCategory = habit.category || 'disciplina';
  selectedXP = habit.xp || 10;
  document.getElementById('modal-title').textContent = 'Editar hábito';
  document.getElementById('habit-name-input').value = habit.name;
  document.getElementById('btn-modal-submit').textContent = 'Guardar cambios ✓';
  renderModalInternals();
  document.getElementById('modal').classList.add('open');
}

// ── Cerrar modal ──
export function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

export function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ── Submit ──
export async function submitModal() {
  const name = document.getElementById('habit-name-input').value.trim();
  if (!name) {
    const input = document.getElementById('habit-name-input');
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const btn = document.getElementById('btn-modal-submit');
  btn.disabled = true;
  btn.textContent = '...';

  try {
    if (editingId) {
      await editHabit(editingId, { name, emoji: selectedEmoji, category: selectedCategory, xp: selectedXP });
      showToast('Hábito actualizado ✓');
    } else {
      await createHabit({ name, emoji: selectedEmoji, category: selectedCategory, xp: selectedXP });
      showToast('¡Hábito plantado! 🌱');
    }
    closeModal();
    renderAll();
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Guardar cambios ✓' : 'Plantar hábito 🌱';
  }
}

// ── Selecciones ──
export function selectEmoji(el, emoji) {
  selectedEmoji = emoji;
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

export function selectCategory(el, cat) {
  selectedCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(c => {
    c.className = `chip cat-chip`;
  });
  el.classList.add(`selected-${cat}`);
}

export function selectXP(el, xp) {
  selectedXP = xp;
  document.querySelectorAll('.xp-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Render internals ──
function renderModalInternals() {
  // Emojis
  document.getElementById('emoji-grid').innerHTML = EMOJIS.map(e =>
    `<div class="emoji-btn ${e === selectedEmoji ? 'selected' : ''}" onclick="window.onSelectEmoji(this,'${e}')">${e}</div>`
  ).join('');

  // Categorías
  document.getElementById('cat-chips').innerHTML = Object.entries(CATEGORIES).map(([key, cat]) =>
    `<div class="chip cat-chip ${selectedCategory === key ? `selected-${key}` : ''}" onclick="window.onSelectCategory(this,'${key}')">${cat.emoji} ${cat.label}</div>`
  ).join('');

  // XP
  document.getElementById('xp-chips').innerHTML = XP_VALUES.map(xp =>
    `<div class="chip xp-chip ${selectedXP === xp ? 'selected' : ''}" onclick="window.onSelectXP(this,${xp})">
      <span class="xp-${xp}" style="font-weight:700">+${xp} XP</span>
      <span style="font-size:11px;color:var(--muted);margin-left:4px">${xpLabel(xp)}</span>
    </div>`
  ).join('');
}

function xpLabel(xp) {
  if (xp === 10) return '· Fácil';
  if (xp === 25) return '· Medio';
  return '· Difícil';
}
