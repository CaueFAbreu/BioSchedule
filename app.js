/* Interface da grade e inicialização da aplicação. */
(function (root) {
  'use strict';

  const { courses, slots, breaks, semester } = root.BIO_DATA;
  const core = root.BIO_CORE;
  const { esc, formatMinutes: fmt } = core;
  const $ = (id) => document.getElementById(id);

  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const byId = new Map(courses.map((c) => [c.id, c]));
  const tint = new Map(courses.map((c, i) => [c.id, i % 4]));
  const courseName = (id) => esc(byId.get(id)?.name || id);
  const hoursText = (h) => h.toLocaleString('pt-BR');

  const store = root.BIO_STORE.createStore({
    core,
    courses,
    semester,
    config: root.BIO_CONFIG,
    keys: { plan: 'bioschedule:2026-2:v1', agenda: 'bioschedule:agenda:v1' },
  });
  const plan = () => store.state.plan;
  const agendaUI = root.BIO_AGENDA_UI.create({ store, core, courses, $ });
  const authUI = root.BIO_AUTH_UI.create({ store, $ });

  // ------------------------------------------------------------ Catálogo

  function courseMeta(c) {
    const parts = [esc(c.short)];
    if (c.sections.length) {
      const section = c.sections.find((s) => s.id === plan().selected[c.id]) || c.sections[0];
      parts.push(`${fmt(core.weeklyMinutes(section.meetings))} / semana`);
    }
    parts.push(c.hours === null ? 'CH não informada' : `${c.hours}h`);
    if (c.modality === 'online') parts.push('Online');
    if (!c.offered) parts.push('Não ofertada');
    return parts.join(' · ');
  }

  function courseInfo(c) {
    const prerequisites = c.prerequisites === null
      ? 'não informados'
      : c.prerequisites.length ? c.prerequisites.map(courseName).join(', ') : 'nenhum';
    return `<p>${esc(c.id)}. Pré-requisitos: ${prerequisites}.</p>`
      + (c.corequisites?.length ? `<p>Co-requisitos (concluídos ou na mesma grade): ${c.corequisites.map(courseName).join(', ')}.</p>` : '')
      + (c.minCompletedHours ? `<p>Mínimo: ${hoursText(c.minCompletedHours)}h curriculares concluídas.</p>` : '')
      + (c.note ? `<p>${esc(c.note)}</p>` : '');
  }

  function agendaLabel(items) {
    if (!items?.length) return 'Agenda';
    const pending = items.filter((item) => !item.done).length;
    const s = core.scoreSummary(items);
    const points = s.distributed ? ` · ${core.formatNumber(s.obtained)}/${core.formatNumber(s.distributed)} pts` : '';
    return `Agenda · ${pending} pendente(s)${points}`;
  }

  function courseCard(c, agendaByCourse, openNotes) {
    const selected = !!plan().selected[c.id];
    const done = plan().completed.includes(c.id);
    const id = esc(c.id);
    const name = esc(c.name);
    const sectionControl = c.sections.length
      ? `<select data-action="section" data-id="${id}" data-focus="section-${id}" aria-label="Turma de ${name}" ${done ? 'disabled' : ''}>
          ${c.sections.map((s) => `<option value="${esc(s.id)}" ${plan().selected[c.id] === s.id ? 'selected' : ''}>Turma ${esc(s.id)}</option>`).join('')}
        </select>`
      : '<span class="course-meta">Sem horário fixo</span>';
    return `<article class="course ${selected ? 'selected' : ''} ${done ? 'done' : ''}">
      <label class="course-title">
        <input type="checkbox" data-action="select" data-id="${id}" data-focus="check-${id}" ${selected ? 'checked' : ''} ${done || !c.offered ? 'disabled' : ''}>
        <span>${name}</span>
      </label>
      <p class="course-meta">${courseMeta(c)}</p>
      <div class="course-actions">
        ${sectionControl}
        <button type="button" class="complete" data-action="complete" data-id="${id}" data-focus="complete-${id}" aria-pressed="${done}" aria-label="${done ? 'Desmarcar conclusão de' : 'Marcar como concluída:'} ${name}">${done ? '✓ Concluída' : 'Concluída?'}</button>
      </div>
      <button type="button" class="agenda-link" data-action="agenda" data-id="${id}" data-focus="agenda-${id}">${agendaLabel(agendaByCourse.get(c.id))}</button>
      <details class="course-note" data-note="${id}" ${openNotes.has(c.id) ? 'open' : ''}><summary>Informações</summary>${courseInfo(c)}</details>
    </article>`;
  }

  function renderCatalog() {
    const container = $('courses');
    const first = !container.children.length;
    // Preserva o que estava aberto e o foco, já que o catálogo é redesenhado por completo.
    const openPeriods = new Set([...container.querySelectorAll('.period[open]')].map((el) => el.dataset.period));
    const openNotes = new Set([...container.querySelectorAll('.course-note[open]')].map((el) => el.dataset.note));
    const focus = document.activeElement?.dataset?.focus;
    const agendaByCourse = new Map();
    for (const item of store.state.agenda) agendaByCourse.set(item.courseId, [...(agendaByCourse.get(item.courseId) || []), item]);

    $('catalog-count').textContent = `${courses.length} no catálogo`;
    container.innerHTML = [...new Set(courses.map((c) => c.period))].map((period) => {
      const list = courses.filter((c) => c.period === period);
      const open = openPeriods.has(String(period)) || (first && period === 1);
      return `<details class="period" data-period="${esc(period)}" ${open ? 'open' : ''}>
        <summary>${esc(period)}º período<span class="period-count">${list.length} matérias</span></summary>
        ${list.map((c) => courseCard(c, agendaByCourse, openNotes)).join('')}
      </details>`;
    }).join('');
    if (focus) container.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ Resumo e alertas

  const hoursValue = ({ known, unknown }) => (unknown ? (known ? `${known}h + ?` : '—') : `${known}h`);

  function renderStats(t) {
    $('count').textContent = t.count;
    $('weekly').textContent = fmt(t.minutes);
    $('hours').textContent = hoursValue(t.selected);
    $('hours-note').textContent = t.selected.unknown ? `CH não informada em ${t.selected.unknown} matéria(s)` : 'carga curricular total';
    $('completed').textContent = hoursValue(t.completed);
    $('completed-note').textContent = `${t.completedCount} concluída(s)${t.completed.unknown ? ' · CH pendente' : ''}`;
  }

  function conflictGroups(pairs) {
    const groups = new Map();
    for (const p of pairs) {
      const key = [p.a.course.id, p.b.course.id].sort().join('|');
      if (!groups.has(key)) groups.set(key, { names: [p.a.course.name, p.b.course.name], potential: p.potential, days: new Set() });
      const g = groups.get(key);
      g.days.add(DAYS[p.a.day]);
      g.potential = g.potential && p.potential;
    }
    return [...groups.values()];
  }

  function requirementText(r) {
    return (r.missing.length ? `<br>Pré-requisito: concluir ${r.missing.map(courseName).join(', ')}.` : '')
      + (r.missingCorequisites.length ? `<br>Co-requisito: selecionar ou já ter concluído ${r.missingCorequisites.map(courseName).join(', ')}.` : '')
      + (r.hoursShortfall
        ? `<br>Exige ${hoursText(r.minimumHours)}h concluídas; ${hoursText(r.completedHours)}h registradas. Faltam ${hoursText(r.hoursShortfall)}h${r.unknownCompletedHours ? ' (há cargas não informadas)' : ''}.`
        : '');
  }

  let lastAnnouncement = '';
  function announce(text) {
    // Anuncia só um resumo e só quando muda, em vez de reler todos os alertas a cada clique.
    if (text === lastAnnouncement) return;
    lastAnnouncement = text;
    $('announcer').textContent = text;
  }

  function renderAlerts(pairs) {
    const groups = conflictGroups(pairs);
    const reqs = core.requirements(courses, plan());
    const missing = reqs.filter((r) => r.missing.length || r.missingCorequisites.length || r.hoursShortfall);
    const unknown = reqs.filter((r) => r.unknown).length;
    const notes = courses.filter((c) => plan().selected[c.id] && c.note);
    const html = [];

    if (groups.length) {
      html.push(`<details class="alert" open>
        <summary>${groups.length} ${groups.length === 1 ? 'par de matérias com sobreposição' : 'pares de matérias com sobreposição'}</summary>
        <ul>${groups.map((g) => `<li>${esc(g.names.join(' + '))} · ${[...g.days].join(', ')}${g.potential ? ' (potencial; aula quinzenal)' : ''}</li>`).join('')}</ul>
      </details>`);
    }
    if (missing.length) {
      html.push(`<div class="alert"><strong>Requisitos a conferir</strong>
        <ul>${missing.map((r) => `<li><b>${esc(r.course.name)}</b>${requirementText(r)}</li>`).join('')}</ul>
      </div>`);
    }
    if (unknown) {
      html.push(`<div class="alert info">Pré-requisitos não informados para ${unknown} matéria(s) selecionada(s). Ainda não é possível verificar a elegibilidade.</div>`);
    }
    if (notes.length) {
      html.push(`<details class="alert info"><summary>Observações de ${notes.length} matéria(s) selecionada(s)</summary>
        <ul>${notes.map((c) => `<li><b>${esc(c.short)}:</b> ${esc(c.note)}</li>`).join('')}</ul>
      </details>`);
    }
    $('alerts').innerHTML = html.join('');

    const summary = [];
    if (groups.length) summary.push(`${groups.length} conflito(s) de horário`);
    if (missing.length) summary.push(`${missing.length} requisito(s) a conferir`);
    announce(summary.length ? summary.join(', ') + '.' : 'Nenhum conflito ou requisito pendente.');
  }

  // ------------------------------------------------------------ Grade semanal

  function scheduleCell(list, day, start, end) {
    const cell = list.filter((m) => m.day === day && core.minute(m.start) < core.minute(end) && core.minute(start) < core.minute(m.end));
    const conflict = cell.some((a) => cell.some((b) => a.course.id !== b.course.id && core.overlap(a, b)));
    const blocks = cell.map((m) => {
      const biweekly = m.frequency === 2;
      return `<span class="class-block tint-${tint.get(m.course.id)}" title="${esc(m.course.name)} · ${esc(m.start)}–${esc(m.end)}${biweekly ? ' · Quinzenal' : ''}">
        <b>${conflict ? '! ' : ''}${esc(m.course.short)}${biweekly ? ' · Q' : ''}</b><span>Turma ${esc(m.section)}</span>
      </span>`;
    }).join('');
    return `<td class="${conflict ? 'conflict' : ''}">${blocks}</td>`;
  }

  function renderSchedule(list) {
    const breakBefore = new Map(breaks.map((b) => [b.before, b]));
    let html = `<caption class="sr-only">Grade semanal de segunda a sábado</caption>
      <thead><tr><th scope="col">Horário</th>${DAYS.map((d) => `<th scope="col">${d.slice(0, 3)}</th>`).join('')}</tr></thead><tbody>`;
    for (const [start, end] of slots) {
      const pause = breakBefore.get(start);
      if (pause) html += `<tr class="break"><th scope="row">${esc(pause.label)}</th><td colspan="6">${esc(pause.name)}</td></tr>`;
      html += `<tr><th scope="row">${start}–${end}</th>${DAYS.map((_, day) => scheduleCell(list, day, start, end)).join('')}</tr>`;
    }
    $('schedule').innerHTML = html + '</tbody>';
    $('empty-message').hidden = Object.keys(plan().selected).length > 0;
  }

  // ------------------------------------------------------------ Estado de salvamento

  const SYNC_TEXT = {
    local: { saved: 'Salvo neste navegador', unavailable: 'Não foi possível salvar neste navegador' },
    cloud: { loading: 'Carregando sua conta…', saving: 'Sincronizando…', saved: 'Salvo na sua conta', error: 'Erro ao sincronizar' },
  };

  function renderSaveState() {
    const { mode, user, sync } = store.status;
    const accountFailed = !!user && mode === 'local';
    let text = accountFailed
      ? (sync === 'loading' ? SYNC_TEXT.cloud.loading : 'Conta indisponível · salvo neste navegador')
      : SYNC_TEXT[mode][sync] || SYNC_TEXT.local.saved;
    if (accountFailed && sync === 'unavailable') text = 'Conta indisponível · não foi possível salvar';
    $('save-state').textContent = text;
    $('save-state').classList.toggle('error', sync === 'error' || sync === 'unavailable' || (accountFailed && sync !== 'loading'));
    $('sync-retry').hidden = !(sync === 'error' || (accountFailed && sync !== 'loading'));
    $('storage-note').textContent = mode === 'cloud' ? 'Suas escolhas ficam na sua conta.' : 'Suas escolhas ficam neste navegador.';
  }

  // ------------------------------------------------------------ Render e ações

  function renderPlan() {
    const list = core.meetings(courses, plan());
    renderStats(core.totals(courses, plan()));
    renderAlerts(core.conflicts(list));
    renderSchedule(list);
  }

  function renderAll() {
    renderCatalog();
    renderPlan();
    agendaUI.render();
  }

  /** Aplica uma ação do catálogo. Ações inválidas são ignoradas e a tela volta ao estado real. */
  function change(action, id, value) {
    const c = byId.get(id);
    if (!c) return false;
    const next = { selected: { ...plan().selected }, completed: [...plan().completed] };
    const done = next.completed.includes(id);
    if (action === 'complete') {
      if (done) next.completed = next.completed.filter((x) => x !== id);
      else {
        next.completed.push(id);
        delete next.selected[id];
      }
    } else if (action === 'select') {
      if (!value) delete next.selected[id];
      else if (c.offered && !done) next.selected[id] = c.sections[0]?.id || 'none';
      else return false;
    } else if (action === 'section') {
      if (!c.offered || done || !c.sections.some((s) => s.id === value)) return false;
      next.selected[id] = value;
    } else {
      return false;
    }
    store.setPlan(next);
    return true;
  }

  $('courses').addEventListener('change', (e) => {
    const { action, id } = e.target.dataset;
    if (!action) return;
    const ok = change(action, id, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    if (!ok) renderCatalog();
  });

  $('courses').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'agenda') agendaUI.showCourse(button.dataset.id);
    else if (!change(button.dataset.action, button.dataset.id)) renderCatalog();
  });

  $('sync-retry').addEventListener('click', () => store.retry());
  root.addEventListener('online', () => store.retry());
  root.addEventListener('beforeunload', (e) => {
    if (!store.pending()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  store.subscribe((reason) => {
    if (reason === 'state') renderAll();
    renderSaveState();
    authUI.render();
  });

  renderAll();
  renderSaveState();
  authUI.render();
  store.init();

  // Ferramenta somente leitura para agentes do navegador (WebMCP), quando disponível.
  if (document.modelContext?.registerTool) {
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'read_bioschedule',
        description: 'Lê as disciplinas selecionadas, concluídas e totais da grade atual.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: (input) => {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw Error('Esperado um objeto vazio');
          return { selected: { ...plan().selected }, completed: [...plan().completed], totals: core.totals(courses, plan()) };
        },
      })).catch(() => {});
    } catch {
      // API experimental: ausência ou falha não afeta a aplicação.
    }
  }
})(window);
