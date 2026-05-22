/* =============================================
   DoTask — TaskFlow | app.js
   Modal + Board + Filtros + Drag-and-drop
============================================= */

/* ── Configuração de tags ──────────────────── */
const TAG_CONFIG = {
  dev:       { label: 'Dev',       cls: 'task-tag--dev' },
  design:    { label: 'Design',    cls: 'task-tag--design' },
  marketing: { label: 'Marketing', cls: 'task-tag--marketing' },
  qa:        { label: 'QA',        cls: 'task-tag--qa' },
  pm:        { label: 'PM',        cls: 'task-tag--pm' },
};

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* ── Estado inicial das tarefas ────────────── */
const tasks = [
  {
    id: 1, status: 'pending', tag: 'design', tagLabel: 'Design',
    title: 'Redesenhar tela de login',
    desc: 'Atualizar o fluxo de autenticação com novo sistema de design, incluindo suporte a modo escuro e acessibilidade WCAG 2.1.',
    assignees: ['AM', 'RK'], due: '18 Mai', progress: 30,
  },
  {
    id: 2, status: 'progress', tag: 'dev', tagLabel: 'Dev',
    title: 'Integrar API de pagamentos',
    desc: 'Conectar o gateway Stripe ao checkout, implementar webhooks e testes de unidade para coberturas críticas do fluxo.',
    assignees: ['CC'], due: '22 Mai', progress: 65,
  },
  {
    id: 3, status: 'progress', tag: 'qa', tagLabel: 'QA',
    title: 'Testes de regressão v2.4',
    desc: 'Validar todos os fluxos críticos após a atualização do motor de renderização. Foco em mobile e Safari.',
    assignees: ['LM', 'JP'], due: '25 Mai', progress: 40,
  },
  {
    id: 4, status: 'done', tag: 'pm', tagLabel: 'PM',
    title: 'Planejamento do sprint 12',
    desc: 'Definir escopo, prioridades e distribuição de capacidade para o próximo ciclo de duas semanas.',
    assignees: ['CC', 'AM'], due: '15 Mai', progress: 100,
  },
];

/* ── Estado da aplicação ───────────────────── */
let activeFilter = 'all';
let dragSrcId    = null;
let nextId       = 100;

/* ── Seletores — modal ─────────────────────── */
const overlay     = document.getElementById('modalOverlay');
const modal       = document.getElementById('modal');
const btnClose    = document.getElementById('modalClose');
const btnCancel   = document.getElementById('modalCancel');
const btnSubmit   = document.getElementById('modalSubmit');
const inputTitle  = document.getElementById('taskTitle');
const inputDesc   = document.getElementById('taskDesc');
const inputTag    = document.getElementById('taskTag');
const inputDue    = document.getElementById('taskDue');
const inputAssign = document.getElementById('taskAssignee');
const titleError  = document.getElementById('taskTitleError');

/* ── Seletores — board ─────────────────────── */
const filterBtns = document.querySelectorAll('.filter-btn');
const columns    = document.querySelectorAll('.column');
const addTaskBtn = document.getElementById('addTaskBtn');

/* ══════════════════════════════════════════════
   UTILITÁRIOS
══════════════════════════════════════════════ */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(raw) {
  if (!raw) return '';
  const [, m, d] = raw.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

/* ══════════════════════════════════════════════
   STATS & BADGES
══════════════════════════════════════════════ */

function countByStatus(status) {
  return tasks.filter(t => t.status === status).length;
}

function updateStats() {
  const total = tasks.length;
  const prog  = countByStatus('progress');
  const done  = countByStatus('done');
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statProg').textContent  = prog;
  document.getElementById('statDone').textContent  = done;
  document.getElementById('statPct').textContent   = pct + '%';
  document.getElementById('statBar').style.width   = pct + '%';

  document.getElementById('badge-all').textContent      = tasks.length;
  document.getElementById('badge-pending').textContent  = countByStatus('pending');
  document.getElementById('badge-progress').textContent = countByStatus('progress');
  document.getElementById('badge-done').textContent     = countByStatus('done');

  document.getElementById('colbadge-pending').textContent  = countByStatus('pending');
  document.getElementById('colbadge-progress').textContent = countByStatus('progress');
  document.getElementById('colbadge-done').textContent     = countByStatus('done');
}

/* ══════════════════════════════════════════════
   RENDERIZAÇÃO DO BOARD
══════════════════════════════════════════════ */

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
    <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
    ${task.desc ? `<p class="task-card__desc">${escapeHtml(task.desc)}</p>` : ''}
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

  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragend',   onDragEnd);
  return el;
}

function render() {
  ['pending', 'progress', 'done'].forEach(col => {
    const list = document.getElementById('list-' + col);
    list.innerHTML = '';

    const visible = tasks.filter(t =>
      t.status === col && (activeFilter === 'all' || activeFilter === col)
    );

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
}

/* ══════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════ */

function openModal() {
  resetForm();
  overlay.classList.add('modal-overlay--open');
  requestAnimationFrame(() => modal.classList.add('modal--open'));
  inputTitle.focus();
}

function closeModal() {
  modal.classList.remove('modal--open');
  modal.addEventListener('transitionend', () => {
    overlay.classList.remove('modal-overlay--open');
  }, { once: true });
}

/* ══════════════════════════════════════════════
   FORMULÁRIO
══════════════════════════════════════════════ */

function resetForm() {
  inputTitle.value  = '';
  inputDesc.value   = '';
  inputTag.value    = 'dev';
  inputDue.value    = '';
  inputAssign.value = '';
  clearTitleError();
}

function showTitleError() {
  inputTitle.classList.add('form-input--error');
  titleError.style.display = 'block';
}

function clearTitleError() {
  inputTitle.classList.remove('form-input--error');
  titleError.style.display = 'none';
}

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
   SPINNER
══════════════════════════════════════════════ */

function setSubmitLoading(isLoading) {
  if (isLoading) {
    btnSubmit.classList.add('btn-primary--loading');
    btnSubmit.innerHTML = '<span class="btn-spinner"></span> Criando…';
    btnSubmit.disabled = true;
  } else {
    btnSubmit.classList.remove('btn-primary--loading');
    btnSubmit.textContent = 'Criar Tarefa';
    btnSubmit.disabled = false;
  }
}

/* ══════════════════════════════════════════════
   CRIAÇÃO DE CARD
══════════════════════════════════════════════ */

function createCard() {
  if (!validate()) return;

  setSubmitLoading(true);

  setTimeout(() => {
    const tag = inputTag.value;

    tasks.push({
      id:        nextId++,
      status:    'pending',
      tag,
      tagLabel:  TAG_CONFIG[tag]?.label || tag,
      title:     inputTitle.value.trim(),
      desc:      inputDesc.value.trim(),
      assignees: inputAssign.value.trim()
        ? [inputAssign.value.trim().toUpperCase().slice(0, 3)]
        : [],
      due:       formatDate(inputDue.value),
      progress:  0,
    });

    if (activeFilter !== 'all' && activeFilter !== 'pending') {
      activeFilter = 'all';
      filterBtns.forEach(b => {
        b.classList.toggle('filter-btn--active', b.dataset.filter === 'all');
      });
    }

    render();
    setSubmitLoading(false);
    closeModal();
  }, 600);
}

/* ══════════════════════════════════════════════
   FILTROS
══════════════════════════════════════════════ */

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');
    render();
  });
});

/* ══════════════════════════════════════════════
   DRAG AND DROP
══════════════════════════════════════════════ */

function onDragStart(e) {
  dragSrcId = parseInt(this.dataset.id, 10);
  this.classList.add('task-card--dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}

function onDragEnd() {
  this.classList.remove('task-card--dragging');
  columns.forEach(c => c.classList.remove('column--drag-over'));
  document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
  dragSrcId = null;
}

columns.forEach(col => {
  col.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('column--drag-over');

    const list = col.querySelector('.task-list');
    if (!list.querySelector('.drop-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'drop-placeholder';
      list.appendChild(ph);
    }
  });

  col.addEventListener('dragleave', e => {
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
    if (newStatus === 'done' && task.progress < 100) task.progress = 100;

    render();
  });
});

/* ══════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════ */

addTaskBtn.addEventListener('click', openModal);

btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);

overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

btnSubmit.addEventListener('click', createCard);

inputTitle.addEventListener('input', () => {
  if (inputTitle.value.trim()) clearTitleError();
});

document.addEventListener('keydown', e => {
  const isOpen = overlay.classList.contains('modal-overlay--open');
  if (e.key === 'Escape' && isOpen) { closeModal(); return; }
  if (e.key === 'Enter'  && isOpen && e.target !== inputDesc) createCard();
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
render();