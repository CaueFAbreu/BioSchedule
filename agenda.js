/* Interface da agenda: lista, calendário mensal e formulário de compromissos. */
(function (root) {
  'use strict';

  function uuid() {
    if (root.crypto?.randomUUID) return root.crypto.randomUUID();
    // Fallback para contextos não seguros (http em rede local), onde randomUUID não existe.
    const b = root.crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  const parseISO = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const dateFormat = (options) => {
    const f = new Intl.DateTimeFormat('pt-BR', options);
    return (iso) => f.format(parseISO(iso)).replace('.', '');
  };
  const monthShort = dateFormat({ month: 'short' });
  const weekdayShort = dateFormat({ weekday: 'short' });
  const dateLong = dateFormat({ weekday: 'long', day: 'numeric', month: 'long' });
  const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const GROUPS = [
    { key: 'overdue', title: 'Atrasados' },
    { key: 'today', title: 'Hoje' },
    { key: 'week', title: 'Próximos 7 dias' },
    { key: 'later', title: 'Mais adiante' },
    { key: 'done', title: 'Concluídos' },
  ];

  function create({ store, core, courses, $ }) {
    const { esc, AGENDA_KINDS } = core;
    const byId = new Map(courses.map((c) => [c.id, c]));
    const view = { mode: 'list', course: '', kind: '', status: 'open', month: null };
    const form = $('item-form');
    const dialog = $('item-dialog');
    let editing = null;

    const kindOptions = Object.entries(AGENDA_KINDS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    $('agenda-kind').insertAdjacentHTML('beforeend', kindOptions);
    form.elements.kind.innerHTML = kindOptions;

    /** Disciplinas da grade primeiro, depois as demais. */
    function courseOptions(selectedId) {
      const inPlan = (c) => !!store.state.plan.selected[c.id];
      const option = (c) => `<option value="${esc(c.id)}" ${c.id === selectedId ? 'selected' : ''}>${esc(c.short)} — ${esc(c.name)}</option>`;
      const group = (label, list) => (list.length ? `<optgroup label="${label}">${list.map(option).join('')}</optgroup>` : '');
      return group('Na grade', courses.filter(inPlan)) + group('Demais disciplinas', courses.filter((c) => !inPlan(c)));
    }

    function filtered() {
      const today = core.localISODate();
      return store.state.agenda
        .filter((item) => (!view.course || item.courseId === view.course) && (!view.kind || item.kind === view.kind))
        .filter((item) => view.status === 'all' || (view.status === 'done') === item.done)
        .map((item) => ({ item, status: core.agendaStatus(item, today) }))
        .sort((a, b) => core.compareAgenda(a.item, b.item));
    }

    // ------------------------------------------------------------ Resumo

    function renderSummary() {
      const all = store.state.agenda;
      const today = core.localISODate();
      if (view.course) {
        const course = byId.get(view.course);
        const items = all.filter((item) => item.courseId === view.course);
        const s = core.scoreSummary(items);
        const pct = s.gradedMax ? ` · aproveitamento de ${Math.round((s.obtained / s.gradedMax) * 100)}% no que já foi corrigido` : '';
        $('agenda-summary').innerHTML = `<strong>${esc(course.short)} — ${esc(course.name)}</strong>
          <span>${core.formatNumber(s.obtained)} de ${core.formatNumber(s.distributed)} pontos distribuídos · ${s.graded} de ${items.length} com nota${pct}</span>`;
        return;
      }
      const open = all.filter((item) => !item.done);
      const overdue = open.filter((item) => item.date < today).length;
      const week = open.filter((item) => item.date >= today && item.date <= core.addDays(today, 7)).length;
      $('agenda-summary').innerHTML = all.length
        ? `<span><b>${open.length}</b> pendente(s)</span><span><b>${overdue}</b> atrasado(s)</span><span><b>${week}</b> nos próximos 7 dias</span>`
        : '';
    }

    // ------------------------------------------------------------ Lista

    function scoreText(item) {
      if (item.maxScore === null && item.score === null) return '';
      const n = (v) => (v === null ? '—' : core.formatNumber(v));
      return `<p class="agenda-score">Nota ${n(item.score)} / ${n(item.maxScore)} pts</p>`;
    }

    function itemHTML({ item, status }) {
      const course = byId.get(item.courseId);
      return `<article class="agenda-item status-${status}">
        <time class="agenda-date" datetime="${item.date}"><strong>${Number(item.date.slice(8))}</strong><span>${monthShort(item.date)} · ${weekdayShort(item.date)}</span></time>
        <div class="agenda-body">
          <p class="agenda-tags"><span class="tag kind-${item.kind}">${AGENDA_KINDS[item.kind]}</span><span title="${esc(course.name)}">${esc(course.short)}</span>${item.time ? `<span>${item.time}</span>` : ''}${status === 'overdue' ? '<span class="tag late">Atrasado</span>' : ''}</p>
          <h3>${esc(item.title)}</h3>
          ${scoreText(item)}
          ${item.notes ? `<p class="agenda-notes">${esc(item.notes)}</p>` : ''}
        </div>
        <div class="agenda-actions">
          <button type="button" class="ghost" data-agenda="toggle" data-id="${item.id}" aria-pressed="${item.done}" aria-label="${item.done ? 'Reabrir' : 'Marcar como feito'}: ${esc(item.title)}">${item.done ? '✓ Feito' : 'Marcar feito'}</button>
          <button type="button" class="ghost" data-agenda="edit" data-id="${item.id}" aria-label="Editar ${esc(item.title)}">Editar</button>
        </div>
      </article>`;
    }

    function renderList(entries) {
      const today = core.localISODate();
      const weekEnd = core.addDays(today, 7);
      const groupOf = ({ item, status }) => {
        if (status !== 'upcoming') return status;
        return item.date <= weekEnd ? 'week' : 'later';
      };
      const html = GROUPS.map(({ key, title }) => {
        const list = entries.filter((e) => groupOf(e) === key);
        if (key === 'done') list.reverse();
        return list.length ? `<section class="agenda-group"><h3>${title} <span>${list.length}</span></h3>${list.map(itemHTML).join('')}</section>` : '';
      }).join('');
      const empty = store.state.agenda.length
        ? 'Nenhum compromisso com esses filtros.'
        : 'Nenhum compromisso ainda. Use “+ Novo compromisso” para registrar provas, trabalhos e entregas.';
      $('agenda-list').innerHTML = html || `<p class="empty-message">${empty}</p>`;
    }

    // ------------------------------------------------------------ Mês

    function renderMonth(entries) {
      const today = core.localISODate();
      if (!view.month) {
        const d = parseISO(today);
        view.month = { year: d.getFullYear(), month: d.getMonth() };
      }
      const { year, month } = view.month;
      const byDate = new Map();
      for (const e of entries) byDate.set(e.item.date, [...(byDate.get(e.item.date) || []), e]);
      const rows = core.monthGrid(year, month).map((week) => `<tr>${week.map((iso) => {
        const outside = parseISO(iso).getMonth() !== month;
        const chips = (byDate.get(iso) || []).map(({ item, status }) => {
          const course = byId.get(item.courseId);
          return `<button type="button" class="chip kind-${item.kind} status-${status}" data-agenda="edit" data-id="${item.id}" title="${esc(AGENDA_KINDS[item.kind])} · ${esc(course.name)}${item.time ? ' · ' + item.time : ''}">${esc(course.short)} · ${esc(item.title)}</button>`;
        }).join('');
        return `<td class="${outside ? 'outside' : ''} ${iso === today ? 'today' : ''}"><button type="button" class="day-number" data-agenda="new" data-date="${iso}" aria-label="Novo compromisso em ${dateLong(iso)}">${Number(iso.slice(8))}</button>${chips}</td>`;
      }).join('')}</tr>`).join('');
      $('agenda-month').innerHTML = `<div class="month-head">
          <button type="button" class="ghost" data-month="-1" aria-label="Mês anterior">‹</button>
          <h3>${monthTitle.format(new Date(year, month, 1))}</h3>
          <button type="button" class="ghost" data-month="1" aria-label="Próximo mês">›</button>
          <button type="button" class="ghost" data-month="0">Hoje</button>
        </div>
        <div class="table-scroll" role="region" tabindex="0" aria-label="Calendário mensal">
          <table class="month"><thead><tr>${WEEKDAYS.map((d) => `<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
        </div>`;
    }

    function render() {
      const courseFilter = $('agenda-course');
      if (view.course && !byId.has(view.course)) view.course = '';
      courseFilter.innerHTML = `<option value="">Todas</option>${courseOptions(view.course)}`;
      const entries = filtered();
      renderSummary();
      $('agenda-list').hidden = view.mode !== 'list';
      $('agenda-month').hidden = view.mode !== 'month';
      if (view.mode === 'list') renderList(entries);
      else renderMonth(entries);
    }

    // ------------------------------------------------------------ Formulário

    function showErrors(errors) {
      const list = form.querySelector('.form-errors');
      for (const el of form.elements) if (el.name) el.removeAttribute('aria-invalid');
      const entries = Object.entries(errors).filter(([field]) => field !== 'id');
      list.innerHTML = entries.map(([, message]) => `<li>${esc(message)}</li>`).join('');
      for (const [field] of entries) form.elements[field]?.setAttribute('aria-invalid', 'true');
      if (entries.length) form.elements[entries[0][0]]?.focus();
    }

    function openForm(item, defaults = {}) {
      editing = item || null;
      const data = item || {
        courseId: defaults.courseId || view.course || Object.keys(store.state.plan.selected)[0] || '',
        kind: 'prova', title: '', date: defaults.date || core.localISODate(), time: '',
        maxScore: null, score: null, notes: '', done: false,
      };
      $('item-dialog-title').textContent = item ? 'Editar compromisso' : 'Novo compromisso';
      form.elements.courseId.innerHTML = `${data.courseId ? '' : '<option value="" selected>Escolha a disciplina</option>'}${courseOptions(data.courseId)}`;
      form.elements.kind.value = data.kind;
      form.elements.title.value = data.title;
      form.elements.date.value = data.date;
      form.elements.time.value = data.time;
      form.elements.maxScore.value = data.maxScore === null ? '' : String(data.maxScore).replace('.', ',');
      form.elements.score.value = data.score === null ? '' : String(data.score).replace('.', ',');
      form.elements.notes.value = data.notes;
      form.elements.done.checked = data.done;
      form.querySelector('[data-item="delete"]').hidden = !item;
      showErrors({});
      dialog.showModal();
      form.elements[data.courseId ? 'title' : 'courseId'].focus();
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const f = form.elements;
      const result = store.saveItem({
        id: editing?.id || uuid(),
        courseId: f.courseId.value,
        kind: f.kind.value,
        title: f.title.value,
        date: f.date.value,
        time: f.time.value,
        maxScore: f.maxScore.value,
        score: f.score.value,
        notes: f.notes.value,
        done: f.done.checked,
      });
      if (!result.ok) return showErrors(result.errors);
      dialog.close();
    });

    form.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]')) dialog.close();
      if (event.target.closest('[data-item="delete"]') && editing && root.confirm(`Excluir “${editing.title}”?`)) {
        store.removeItem(editing.id);
        dialog.close();
      }
    });

    // ------------------------------------------------------------ Eventos

    $('agenda-new').addEventListener('click', () => openForm(null));
    $('agenda-course').addEventListener('change', (e) => { view.course = e.target.value; render(); });
    $('agenda-kind').addEventListener('change', (e) => { view.kind = e.target.value; render(); });
    $('agenda-status').addEventListener('change', (e) => { view.status = e.target.value; render(); });

    $('agenda').addEventListener('click', (event) => {
      const viewButton = event.target.closest('[data-view]');
      if (viewButton) {
        view.mode = viewButton.dataset.view;
        document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === viewButton)));
        return render();
      }
      const monthButton = event.target.closest('[data-month]');
      if (monthButton) {
        const step = Number(monthButton.dataset.month);
        const d = step === 0 ? new Date() : new Date(view.month.year, view.month.month + step, 1);
        view.month = { year: d.getFullYear(), month: d.getMonth() };
        return render();
      }
      const action = event.target.closest('[data-agenda]');
      if (!action) return;
      const item = store.state.agenda.find((x) => x.id === action.dataset.id);
      if (action.dataset.agenda === 'new') openForm(null, { date: action.dataset.date });
      else if (action.dataset.agenda === 'edit' && item) openForm(item);
      else if (action.dataset.agenda === 'toggle' && item) store.saveItem({ ...item, done: !item.done });
    });

    return {
      render,
      /** Mostra a agenda filtrada por uma disciplina (atalho dos cartões do catálogo). */
      showCourse(courseId) {
        view.course = courseId;
        view.status = 'all';
        $('agenda-status').value = 'all';
        render();
        const reduced = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        $('agenda').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        $('agenda-course').focus({ preventScroll: true });
      },
      openForm,
    };
  }

  root.BIO_AGENDA_UI = { create };
})(window);
