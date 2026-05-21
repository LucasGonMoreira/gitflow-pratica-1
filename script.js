/* =============================================
   DoTask — TaskFlow | main.js
   Lógica do modal de criação de tarefas

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
   DoTask — TaskFlow | app.js
   Filtros, badges e drag-and-drop

// --- Estado inicial das tarefas -----------------------------------
const tasks = [
  {
    id: 1,
    status: 'pending',
    tag: 'design',
    tagLabel: 'Design',
    title: 'Redesenhar tela de login',
    desc: 'Atualizar o fluxo de autenticação com novo sistema de design, incluindo suporte a modo escuro e acessibilidade WCAG 2.1.',
    assignees: ['AM', 'RK'],
    due: '18 Mai',
    progress: 30,
  },
  {
    id: 2,
    status: 'progress',
    tag: 'dev',
    tagLabel: 'Dev',
    title: 'Integrar API de pagamentos',
    desc: 'Conectar o gateway Stripe ao checkout, implementar webhooks e testes de unidade para coberturas críticas do fluxo.',
    assignees: ['CC'],
    due: '22 Mai',
    progress: 65,
  },
  {
    id: 3,
    status: 'progress',
    tag: 'qa',
    tagLabel: 'QA',
    title: 'Testes de regressão v2.4',
    desc: 'Validar todos os fluxos críticos após a atualização do motor de renderização. Foco em mobile e Safari.',
    assignees: ['LM', 'JP'],
    due: '25 Mai',
    progress: 40,
  },
  {
    id: 4,
    status: 'done',
    tag: 'pm',
    tagLabel: 'PM',
    title: 'Planejamento do sprint 12',
    desc: 'Definir escopo, prioridades e distribuição de capacidade para o próximo ciclo de duas semanas.',
    assignees: ['CC', 'AM'],
    due: '15 Mai',
    progress: 100,
  },
];

// --- Estado da aplicação ------------------------------------------
let activeFilter = 'all';
let dragSrcId    = null;
let nextId       = 100;

// --- Seletores ----------------------------------------------------
const filterBtns    = document.querySelectorAll('.filter-btn');
const columns       = document.querySelectorAll('.column');
const addTaskBtn    = document.getElementById('addTaskBtn');

// --- Renderização -------------------------------------------------

/**
 * Constrói o HTML de um card de tarefa.
 */
function buildCard(task) {
  const el = document.createElement('article');
  el.className = 'task-card';
  el.setAttribute('data-id', task.id);
  el.setAttribute('data-status', task.status);
  el.draggable = true;

  const avatarsHTML = task.assignees
    .map(a => `<div class="avatar">${a}</div>`)
    .join('');

  el.innerHTML = `
    <div class="task-card__top">
      <span class="task-tag task-tag--${task.tag}">${task.tagLabel}</span>
      <button class="task-menu" aria-label="Mais opções">⋯</button>
    </div>
    <h3 class="task-card__title">${task.title}</h3>
    <p class="task-card__desc">${task.desc}</p>
    <div class="task-card__meta">
      <div class="task-card__assignees">${avatarsHTML}</div>
      <div class="task-card__due">
        <span class="due-icon">◷</span>
        <span>${task.due}</span>
      </div>
    </div>
    <div class="task-card__progress">
      <div class="progress-bar">
        <div class="progress-bar__fill" style="width: ${task.progress}%"></div>
      </div>
      <span class="progress-label">${task.progress}%</span>
    </div>
  `;

  // Drag events
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragend',   onDragEnd);

  return el;
}

/**
 * Renderiza as listas de tarefas respeitando o filtro ativo.
 */
function render() {
  ['pending', 'progress', 'done'].forEach(col => {
    const list = document.getElementById('list-' + col);
    list.innerHTML = '';

    const visible = tasks.filter(t => {
      const matchesCol    = t.status === col;
      const matchesFilter = activeFilter === 'all' || activeFilter === col;
      return matchesCol && matchesFilter;
    });

    if (visible.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<span class="empty-state__icon">✦</span><p>Nenhuma tarefa aqui.</p>`;
      list.appendChild(empty);
    } else {
      visible.forEach(t => list.appendChild(buildCard(t)));
    }
  });

  updateStats();
  updateBadges();
}

// --- Stats --------------------------------------------------------

function updateStats() {
  const total = tasks.length;
  const prog  = tasks.filter(t => t.status === 'progress').length;
  const done  = tasks.filter(t => t.status === 'done').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statProg').textContent  = prog;
  document.getElementById('statDone').textContent  = done;
  document.getElementById('statPct').textContent   = pct + '%';
  document.getElementById('statBar').style.width   = pct + '%';
}

// --- Badges -------------------------------------------------------

function countByStatus(status) {
  return tasks.filter(t => t.status === status).length;
}

function updateBadges() {
  // Badges nos botões de filtro
  document.getElementById('badge-all').textContent      = tasks.length;
  document.getElementById('badge-pending').textContent  = countByStatus('pending');
  document.getElementById('badge-progress').textContent = countByStatus('progress');
  document.getElementById('badge-done').textContent     = countByStatus('done');

  // Badges nos cabeçalhos das colunas
  document.getElementById('colbadge-pending').textContent  = countByStatus('pending');
  document.getElementById('colbadge-progress').textContent = countByStatus('progress');
  document.getElementById('colbadge-done').textContent     = countByStatus('done');
}

// --- Filtros ------------------------------------------------------

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;

    filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');

    render();
  });
});

// --- Drag and Drop ------------------------------------------------

function onDragStart(e) {
  dragSrcId = parseInt(this.dataset.id, 10);
  this.classList.add('task-card--dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}

function onDragEnd() {
  this.classList.remove('task-card--dragging');
  // Remove drag-over de todas as colunas
  columns.forEach(c => c.classList.remove('column--drag-over'));
  // Remove placeholders
  document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
  dragSrcId = null;
}

columns.forEach(col => {
  col.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('column--drag-over');

    // Placeholder visual
    const list = col.querySelector('.task-list');
    if (!list.querySelector('.drop-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'drop-placeholder';
      list.appendChild(ph);
    }
  });

  col.addEventListener('dragleave', e => {
    // Só remove se realmente saiu da coluna (e não entrou num filho)
    if (!col.contains(e.relatedTarget)) {
      col.classList.remove('column--drag-over');
      col.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
    }
  });

  col.addEventListener('drop', e => {
    e.preventDefault();
    col.classList.remove('column--drag-over');
    col.querySelectorAll('.drop-placeholder').forEach(p => p.remove());

    const id        = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const newStatus = col.dataset.col;
    const task      = tasks.find(t => t.id === id);

    if (!task || task.status === newStatus) return;

    task.status = newStatus;

    // Auto-completa progresso ao mover para "Concluído"
    if (newStatus === 'done' && task.progress < 100) {
      task.progress = 100;
    }

    render();
  });
});

// --- Nova Tarefa --------------------------------------------------

const tagPool = [
  { tag: 'dev',    label: 'Dev'    },
  { tag: 'design', label: 'Design' },
  { tag: 'qa',     label: 'QA'     },
  { tag: 'pm',     label: 'PM'     },
];

const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

addTaskBtn.addEventListener('click', () => {
  const pick = tagPool[Math.floor(Math.random() * tagPool.length)];
  const due  = new Date();
  due.setDate(due.getDate() + Math.floor(Math.random() * 14) + 3);

  const taskNumber = tasks.length + 1;

  tasks.push({
    id:       nextId++,
    status:   'pending',
    tag:      pick.tag,
    tagLabel: pick.label,
    title:    `Nova tarefa #${taskNumber}`,
    desc:     'Tarefa criada via painel. Edite os detalhes conforme necessário.',
    assignees: ['CC'],
    due:      `${due.getDate()} ${months[due.getMonth()]}`,
    progress: 0,
  });

  // Muda o filtro para "Todas" ou "Pendente" para que o card apareça
  if (activeFilter !== 'all' && activeFilter !== 'pending') {
    activeFilter = 'all';
    filterBtns.forEach(b => {
      b.classList.toggle('filter-btn--active', b.dataset.filter === 'all');
    });
  }

  render();
});

// --- Init ---------------------------------------------------------
render();
