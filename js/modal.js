import { state, CATEGORIES, XP_VALUES, SYMBOL_CATEGORIES, DAYS_OF_WEEK } from './state.js';
import { createHabit, editHabit } from './habits.js';
import { renderAll } from './render.js';
import { showToast } from './ui.js';

let editingId = null;
let selectedEmoji = '★';
let selectedCategory = 'disciplina';
let selectedXP = 10;
let selectedDays = []; // [] = todos los días

const NO_ICON = '__none__';

// ── Abrir modal nuevo ──
export function openCreateModal() {
  editingId = null;
  selectedEmoji = '★';
  selectedCategory = 'disciplina';
  selectedXP = 10;
  selectedDays = [];
  
  document.getElementById('modal-title').textContent = 'Nuevo hábito';
  document.getElementById('habit-name-input').value = '';
  document.getElementById('btn-modal-submit').textContent = 'Crear';
  renderModalInternals();
  window._lockScroll && window._lockScroll();
  document.getElementById('modal').classList.add('open');
}

// ── Abrir modal editar ──
export function openEditModal(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  editingId = id;
  selectedEmoji = habit.emoji || NO_ICON;
  selectedCategory = habit.category || 'disciplina';
  selectedXP = habit.xp || 10;
  selectedDays = habit.days ? [...habit.days] : [];
  document.getElementById('modal-title').textContent = 'Editar hábito';
  document.getElementById('habit-name-input').value = habit.name;
  document.getElementById('btn-modal-submit').textContent = 'Guardar cambios ✓';
  renderModalInternals();
  window._lockScroll && window._lockScroll();
  document.getElementById('modal').classList.add('open');
}

// ── Cerrar modal ──
export function closeModal() {
  window._unlockScroll && window._unlockScroll();
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
    const emojiToSave = selectedEmoji === NO_ICON ? null : selectedEmoji;
    if (editingId) {
      await editHabit(editingId, { name, emoji: emojiToSave, category: selectedCategory, xp: selectedXP, days: selectedDays });
      showToast('Hábito actualizado ✓');
    } else {
      await createHabit({ name, emoji: emojiToSave, category: selectedCategory, xp: selectedXP, days: selectedDays });
      showToast('¡Hábito plantado! 🌱');
    }
    closeModal();
    renderAll();
  } finally {
    btn.disabled = false;
    
    btn.textContent = editingId ? 'Guardar cambios ✓' : 'Crear';
  }
}

// ── Selecciones ──
export function selectEmoji(el, emoji) {
  selectedEmoji = emoji;
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

export function selectNoIcon(el) {
  selectedEmoji = NO_ICON;
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

export function selectCategory(el, cat) {
  selectedCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(c => { c.className = 'chip cat-chip'; });
  el.classList.add(`selected-${cat}`);
}

export function selectXP(el, xp) {
  selectedXP = xp;
  document.querySelectorAll('.xp-chip').forEach(c => {
    c.classList.remove('selected', 'selected-xp10', 'selected-xp25', 'selected-xp50');
  });
  el.classList.add('selected', `selected-xp${xp}`);
}

export function toggleDay(el, dayKey) {
  const idx = selectedDays.indexOf(dayKey);
  if (idx === -1) {
    selectedDays.push(dayKey);
    el.classList.add('selected');
  } else {
    selectedDays.splice(idx, 1);
    el.classList.remove('selected');
  }
  // Actualizar botón Todos
  const todosBtn = document.querySelector('.chip.day-chip:last-child');
  if (todosBtn && todosBtn.textContent.trim() === 'Todos') {
    todosBtn.classList.toggle('selected', selectedDays.length === 0);
  }
  const label = document.getElementById('days-label');
  if (label) label.textContent = selectedDays.length === 0 ? 'Todos los días' : '';
}

export function selectAllDays() {
  selectedDays = [];
  renderModalInternals();
}

// ── Render internals ──
function renderModalInternals() {
  // Emojis (con botón Sin Icono al principio)
  // Actualizar display del input de icono
  const iconPreview = document.getElementById('icon-preview-display');
  if (iconPreview) iconPreview.textContent = (selectedEmoji && selectedEmoji !== NO_ICON) ? selectedEmoji : '—';
  const iconLabel = document.querySelector('.icon-input-label');
  if (iconLabel) iconLabel.textContent = (selectedEmoji && selectedEmoji !== NO_ICON) ? selectedEmoji : 'Toca para elegir símbolo';

  // Categorías
  document.getElementById('cat-chips').innerHTML = Object.entries(CATEGORIES).map(([key, cat]) =>
    `<div class="chip cat-chip ${selectedCategory === key ? `selected-${key}` : ''}" onclick="window.onSelectCategory(this,'${key}')">${cat.label}</div>`
  ).join('');

  // XP
  document.getElementById('xp-chips').innerHTML = XP_VALUES.map(xp =>
    `<div class="chip xp-chip ${selectedXP === xp ? `selected selected-xp${xp}` : ''}" onclick="window.onSelectXP(this,${xp})">
      <span class="xp-${xp}" style="font-weight:700">+${xp} XP</span>
      <span style="font-size:11px;color:var(--muted);margin-left:4px">${xpLabel(xp)}</span>
    </div>`
  ).join('');

  // Días de semana + botón Todos
  const todosSelected = selectedDays.length === 0;
  document.getElementById('days-chips').innerHTML =
    DAYS_OF_WEEK.map(d =>
      `<div class="chip day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}" onclick="window.onToggleDay(this,'${d.key}')">${d.label}</div>`
    ).join('') +
    `<div class="chip day-chip ${todosSelected ? 'selected' : ''}" onclick="window.onSelectAllDays()" style="margin-left:4px">Todos</div>`;

  const label = document.getElementById('days-label');
  if (label) label.textContent = selectedDays.length === 0 ? 'Todos los días' : '';
}

function xpLabel(xp) {
  if (xp === 10) return '· Fácil';
  if (xp === 25) return '· Medio';
  if (xp === 50) return '· Difícil';
  return '· Legendario';
}


// ── Icon picker popup ──
let _pickerTempIcon = null;

export function openIconPicker() {
  _pickerTempIcon = selectedEmoji;
  const overlay = document.getElementById('icon-picker-overlay');
  if (!overlay) return;
  window._lockScroll && window._lockScroll();
  overlay.classList.add('open');
  _renderIconPickerTabs();
  _updateIconPickerFooter();
}

export function closeIconPicker() {
  const overlay = document.getElementById('icon-picker-overlay');
  if (overlay) overlay.classList.remove('open');
  window._unlockScroll && window._unlockScroll();
}

export function confirmIconPicker() {
  selectedEmoji = _pickerTempIcon;
  _updateIconInputDisplay();
  closeIconPicker();
}

export function clearIconPicker() {
  _pickerTempIcon = null;
  _updateIconPickerFooter();
}

function _updateIconInputDisplay() {
  const preview = document.getElementById('icon-preview-display');
  if (!preview) return;
  // Mostrar en círculo del color de la categoría
  if (selectedEmoji && selectedEmoji !== '—') {
    preview.textContent = selectedEmoji;
    preview.style.fontSize = '18px';
  } else {
    preview.textContent = '—';
  }
  const label = document.querySelector('.icon-input-label');
  if (label) label.textContent = selectedEmoji && selectedEmoji !== '—' ? selectedEmoji : 'Toca para elegir símbolo';
}

function _updateIconPickerFooter() {
  const prev = document.getElementById('icon-picker-preview');
  const lbl  = document.getElementById('icon-picker-lbl');
  if (prev) prev.textContent = _pickerTempIcon || '—';
  if (lbl)  lbl.textContent  = _pickerTempIcon || 'Sin icono seleccionado';
  // Actualizar selected en grid
  document.querySelectorAll('.icon-sym-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.sym === _pickerTempIcon);
  });
}

let _activeIconCat = null;

function _renderIconPickerTabs() {
  const tabsEl  = document.getElementById('icon-picker-tabs');
  const gridEl  = document.getElementById('icon-picker-grid');
  if (!tabsEl || !gridEl) return;
  const catNames = Object.keys(SYMBOL_CATEGORIES);
  if (!_activeIconCat) _activeIconCat = catNames[0];

  tabsEl.innerHTML = catNames.map(c =>
    `<div class="symbol-tab ${c === _activeIconCat ? 'active' : ''}" onclick="window._iconPickerSwitchCat('${c}')">${c}</div>`
  ).join('');

  _renderIconPickerGrid(_activeIconCat);
}

function _renderIconPickerGrid(cat) {
  _activeIconCat = cat;
  const gridEl = document.getElementById('icon-picker-grid');
  const tabsEl = document.getElementById('icon-picker-tabs');
  if (!gridEl) return;
  // Actualizar tab activa
  if (tabsEl) {
    tabsEl.querySelectorAll('.symbol-tab').forEach(t => {
      t.classList.toggle('active', t.textContent === cat);
    });
  }
  const syms = SYMBOL_CATEGORIES[cat] || [];
  gridEl.innerHTML = syms.map(s =>
    `<div class="icon-sym-btn ${s === _pickerTempIcon ? 'selected' : ''}" data-sym="${s}"
      onclick="window._iconPickerSelect('${s.replace(/'/g,"\'")}')">
      ${s}
    </div>`
  ).join('');
}

window._iconPickerSwitchCat = (cat) => _renderIconPickerGrid(cat);
window._iconPickerSelect = (sym) => {
  _pickerTempIcon = sym;
  _updateIconPickerFooter();
};
