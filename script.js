/* =============================================
   DoTask — TaskFlow | main.js
   Lógica do modal de criação de tarefas
============================================= */

/* ── Elementos ─────────────────────────────── */
const overlay     = document.getElementById('modalOverlay');
const modal       = document.getElementById('modal');
const btnNew      = document.querySelector('.btn-primary');
const btnClose    = document.getElementById('modalClose');
const btnCancel   = document.getElementById('modalCancel');
const btnSubmit   = document.getElementById('modalSubmit');
const inputTitle  = document.getElementById('taskTitle');
const inputDesc   = document.getElementById('taskDesc');
const inputTag    = document.getElementById('taskTag');
const inputDue    = document.getElementById('taskDue');
const inputAssign = document.getElementById('taskAssignee');
const titleError  = document.getElementById('taskTitleError');

/* ── Colunas do board ──────────────────────── */
const colPending  = document.querySelectorAll('.column')[0];

/* ── Referências de stats ──────────────────── */
const statTotal    = document.querySelectorAll('.stat-card__value')[0];
const statProgress = document.querySelectorAll('.stat-card__value')[1];
const statDone     = document.querySelectorAll('.stat-card__value')[2];
const statPct      = document.querySelectorAll('.stat-card__value')[3];
const statBar      = document.querySelector('.stat-card__bar-fill');

/* ── Configuração de tags ──────────────────── */
const TAG_CONFIG = {
  dev:       { label: 'Dev',       cls: 'task-tag--dev' },
  design:    { label: 'Design',    cls: 'task-tag--design' },
  marketing: { label: 'Marketing', cls: 'task-tag--marketing' },
  qa:        { label: 'QA',        cls: 'task-tag--qa' },
};

/* ── Meses em português ────────────────────── */
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* ══════════════════════════════════════════════
   UTILITÁRIOS
══════════════════════════════════════════════ */

/**
 * Escapa caracteres especiais HTML para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para "DD Mês".
 * @param {string} raw - Data no formato YYYY-MM-DD
 * @returns {string}
 */
function formatDate(raw) {
  if (!raw) return '';
  const [, m, d] = raw.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

/* ══════════════════════════════════════════════
   STATS
══════════════════════════════════════════════ */

/**
 * Recalcula e atualiza todos os contadores e a
 * barra de progresso geral com base nos cards existentes.
 */
function updateStats() {
  const total      = document.querySelectorAll('.task-card').length;
  const inProgress = document.querySelectorAll('.task-card--progress').length;
  const done       = document.querySelectorAll('.task-card--done').length;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

  statTotal.textContent    = total;
  statProgress.textContent = inProgress;
  statDone.textContent     = done;
  statPct.textContent      = pct + '%';
  statBar.style.width      = pct + '%';

  /* Contagens por coluna */
  document.querySelectorAll('.column').forEach((col, i) => {
    document.querySelectorAll('.column__count')[i].textContent =
      col.querySelectorAll('.task-card').length;
  });
}

/* ══════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════ */

/** Abre o modal e foca o primeiro campo. */
function openModal() {
  resetForm();
  overlay.classList.add('modal-overlay--open');
  requestAnimationFrame(() => modal.classList.add('modal--open'));
  inputTitle.focus();
}

/** Fecha o modal aguardando o fim da transição CSS. */
function closeModal() {
  modal.classList.remove('modal--open');
  modal.addEventListener('transitionend', () => {
    overlay.classList.remove('modal-overlay--open');
  }, { once: true });
}

/* ══════════════════════════════════════════════
   FORMULÁRIO
══════════════════════════════════════════════ */

/** Limpa todos os campos e remove estados de erro. */
function resetForm() {
  inputTitle.value  = '';
  inputDesc.value   = '';
  inputTag.value    = 'dev';
  inputDue.value    = '';
  inputAssign.value = '';
  clearTitleError();
}

/** Exibe o erro de título. */
function showTitleError() {
  inputTitle.classList.add('form-input--error');
  titleError.style.display = 'block';
}

/** Remove o erro de título. */
function clearTitleError() {
  inputTitle.classList.remove('form-input--error');
  titleError.style.display = 'none';
}

/**
 * Valida o formulário.
 * @returns {boolean} true se válido.
 */
function validate() {
  if (!inputTitle.value.trim()) {
    showTitleError();
    inputTitle.focus();
    return false;
  }
  clearTitleError();
  return true;
}

/* ══════════════════════════════════════════════
   CRIAÇÃO DE CARD
══════════════════════════════════════════════ */

/**
 * Constrói o HTML interno de um task card.
 * @param {{ title, desc, tag, due, assignee }} data
 * @returns {string}
 */
function buildCardHTML({ title, desc, tag, due, assignee }) {
  const { label, cls } = TAG_CONFIG[tag];

  return `
    <div class="task-card__top">
      <span class="task-tag ${cls}">${label}</span>
      <button class="task-menu" aria-label="Mais opções">⋯</button>
    </div>
    <h3 class="task-card__title">${escapeHtml(title)}</h3>
    ${desc ? `<p class="task-card__desc">${escapeHtml(desc)}</p>` : ''}
    <div class="task-card__meta">
      <div class="task-card__assignees">
        ${assignee ? `<div class="avatar">${escapeHtml(assignee)}</div>` : ''}
      </div>
      ${due ? `<div class="task-card__due"><span class="due-icon">◷</span><span>${due}</span></div>` : ''}
    </div>
    <div class="task-card__progress">
      <div class="progress-bar">
        <div class="progress-bar__fill" style="width:0%"></div>
      </div>
      <span class="progress-label">0%</span>
    </div>
  `;
}

/**
 * Lê o formulário, valida, cria o card na coluna
 * "Pendente" e atualiza as estatísticas.
 */
function createCard() {
  if (!validate()) return;

  const data = {
    title:    inputTitle.value.trim(),
    desc:     inputDesc.value.trim(),
    tag:      inputTag.value,
    due:      formatDate(inputDue.value),
    assignee: inputAssign.value.trim().toUpperCase().slice(0, 3),
  };

  const article = document.createElement('article');
  article.className   = 'task-card task-card--pending task-card--new';
  article.innerHTML   = buildCardHTML(data);

  /* Remove o empty-state se a coluna estiver vazia */
  const emptyState = colPending.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const list = colPending.querySelector('.task-list');
  list.classList.remove('task-list--empty');
  list.appendChild(article);

  /* Dispara a animação de entrada no próximo frame */
  requestAnimationFrame(() => article.classList.add('task-card--visible'));

  updateStats();
  closeModal();
}

/* ══════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════ */

/* Abrir modal */
btnNew.addEventListener('click', openModal);

/* Fechar modal */
btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

/* Submeter */
btnSubmit.addEventListener('click', createCard);

/* Limpar erro de título ao digitar */
inputTitle.addEventListener('input', () => {
  if (inputTitle.value.trim()) clearTitleError();
});

/* Atalhos de teclado globais */
document.addEventListener('keydown', (e) => {
  const isOpen = overlay.classList.contains('modal-overlay--open');

  if (e.key === 'Escape' && isOpen) {
    closeModal();
    return;
  }

  if (e.key === 'Enter' && isOpen && e.target !== inputDesc) {
    createCard();
  }
});