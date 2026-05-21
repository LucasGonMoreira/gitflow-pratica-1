/* =============================================
   DoTask — TaskFlow | app.js
   Filtros, badges e drag-and-drop
============================================= */

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