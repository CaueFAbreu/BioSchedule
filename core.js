/* Regras puras da grade e da agenda. Sem acesso a DOM, rede ou armazenamento. */
(function (root) {
  'use strict';

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // ---------------------------------------------------------------- Texto

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

  function formatMinutes(total) {
    const minutes = Math.round(total);
    const rest = minutes % 60;
    return `${Math.floor(minutes / 60)}h${rest ? ' ' + String(rest).padStart(2, '0') + 'min' : ''}`;
  }

  const formatNumber = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  // ---------------------------------------------------------------- Tempo

  const minute = (time) => {
    const [h, m] = time.split(':');
    return Number(h) * 60 + Number(m);
  };
  const duration = (meeting) => minute(meeting.end) - minute(meeting.start);
  /** Minutos semanais médios: aulas quinzenais contam pela metade. */
  const weeklyMinutes = (meetings) => meetings.reduce((n, m) => n + duration(m) / (m.frequency || 1), 0);

  // ---------------------------------------------------------------- Grade

  /** Aceita apenas IDs e turmas existentes no catálogo; o restante é descartado. */
  function normalize(raw, courses) {
    const state = { selected: {}, completed: [] };
    if (!raw || typeof raw !== 'object') return state;
    const completed = new Set(Array.isArray(raw.completed) ? raw.completed : []);
    state.completed = courses.filter((c) => completed.has(c.id)).map((c) => c.id);
    const done = new Set(state.completed);
    const selected = raw.selected && typeof raw.selected === 'object' ? raw.selected : {};
    for (const c of courses) {
      if (!hasOwn(selected, c.id) || !c.offered || done.has(c.id)) continue;
      const value = selected[c.id];
      if (c.sections.some((s) => s.id === value) || (value === 'none' && !c.sections.length)) state.selected[c.id] = value;
    }
    return state;
  }

  function meetings(courses, state) {
    return courses.flatMap((c) => {
      const sectionId = state.selected[c.id];
      if (!sectionId) return [];
      const section = c.sections.find((s) => s.id === sectionId);
      return (section?.meetings || []).map((m) => ({ ...m, course: c, section: sectionId }));
    });
  }

  function overlap(a, b) {
    if (a.day !== b.day || minute(a.start) >= minute(b.end) || minute(b.start) >= minute(a.end)) return false;
    // Duas quinzenais com início conhecido em semanas alternadas nunca se encontram.
    if (a.frequency === 2 && b.frequency === 2 && a.firstDate && b.firstDate) {
      const weeks = Math.round((Date.parse(a.firstDate) - Date.parse(b.firstDate)) / WEEK_MS);
      if (Math.abs(weeks) % 2 === 1) return false;
    }
    return true;
  }

  function conflicts(list) {
    const pairs = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.course.id !== b.course.id && overlap(a, b)) pairs.push({ a, b, potential: a.frequency === 2 || b.frequency === 2 });
      }
    }
    return pairs;
  }

  function requirements(courses, state) {
    const done = new Set(state.completed);
    const completed = courses.filter((c) => done.has(c.id));
    const completedHours = completed.reduce((sum, c) => sum + (c.hours ?? 0), 0);
    const unknownCompletedHours = completed.some((c) => c.hours === null);
    return courses.filter((c) => state.selected[c.id]).map((c) => ({
      course: c,
      unknown: c.prerequisites === null,
      missing: (c.prerequisites || []).filter((id) => !done.has(id)),
      missingCorequisites: (c.corequisites || []).filter((id) => !done.has(id) && !state.selected[id]),
      minimumHours: c.minCompletedHours || 0,
      completedHours,
      hoursShortfall: Math.max(0, (c.minCompletedHours || 0) - completedHours),
      unknownCompletedHours,
    }));
  }

  function totals(courses, state) {
    const done = new Set(state.completed);
    const selected = courses.filter((c) => state.selected[c.id]);
    const completed = courses.filter((c) => done.has(c.id));
    const total = (list) => ({
      known: list.reduce((n, c) => n + (c.hours ?? 0), 0),
      unknown: list.filter((c) => c.hours === null).length,
    });
    return {
      count: selected.length,
      minutes: weeklyMinutes(meetings(courses, state)),
      selected: total(selected),
      completed: total(completed),
      completedCount: completed.length,
    };
  }

  /** Une a grade da conta com a do navegador: concluídas somam; a conta prevalece na turma escolhida. */
  function mergePlans(account, guest, courses) {
    const a = normalize(account, courses);
    const g = normalize(guest, courses);
    return normalize({
      completed: [...a.completed, ...g.completed],
      selected: { ...g.selected, ...a.selected },
    }, courses);
  }

  // ---------------------------------------------------------------- Agenda

  const AGENDA_KINDS = { prova: 'Prova', trabalho: 'Trabalho', atividade: 'Atividade', outro: 'Outro' };
  const AGENDA_LIMITS = { title: 120, notes: 2000, score: 1000 };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }

  const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  /** null quando vazio; NaN quando inválido; caso contrário, número com até 2 casas. */
  function parseScore(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > AGENDA_LIMITS.score) return NaN;
    return Math.round(n * 100) / 100;
  }

  /** Valida e normaliza um compromisso. `courseIds` é um Set com os IDs do catálogo. */
  function validateAgendaItem(input, courseIds) {
    const src = input && typeof input === 'object' ? input : {};
    const text = (v) => (typeof v === 'string' ? v.trim() : '');
    const item = {
      id: text(src.id),
      courseId: text(src.courseId),
      kind: text(src.kind),
      title: text(src.title),
      date: text(src.date),
      time: text(src.time).slice(0, 5),
      maxScore: parseScore(src.maxScore),
      score: parseScore(src.score),
      notes: text(src.notes),
      done: src.done === true,
      updatedAt: text(src.updatedAt),
    };
    const errors = {};
    const scoreError = `Use um número entre 0 e ${AGENDA_LIMITS.score}.`;
    if (!UUID.test(item.id)) errors.id = 'Identificador inválido.';
    if (!courseIds.has(item.courseId)) errors.courseId = 'Escolha uma disciplina.';
    if (!hasOwn(AGENDA_KINDS, item.kind)) errors.kind = 'Escolha o tipo.';
    if (!item.title) errors.title = 'Informe um título.';
    else if (item.title.length > AGENDA_LIMITS.title) errors.title = `Use até ${AGENDA_LIMITS.title} caracteres no título.`;
    if (!isISODate(item.date)) errors.date = 'Informe uma data válida.';
    if (item.time && !isTime(item.time)) errors.time = 'Informe uma hora válida.';
    if (Number.isNaN(item.maxScore)) errors.maxScore = scoreError;
    if (Number.isNaN(item.score)) errors.score = scoreError;
    if (item.notes.length > AGENDA_LIMITS.notes) errors.notes = `Use até ${AGENDA_LIMITS.notes} caracteres nas anotações.`;
    return { item, errors, valid: Object.keys(errors).length === 0 };
  }

  /** Mantém apenas compromissos válidos e com ID único. */
  function normalizeAgenda(raw, courses) {
    if (!Array.isArray(raw)) return [];
    const courseIds = new Set(courses.map((c) => c.id));
    const byId = new Map();
    for (const entry of raw) {
      const { item, valid } = validateAgendaItem(entry, courseIds);
      if (valid && !byId.has(item.id)) byId.set(item.id, item);
    }
    return [...byId.values()];
  }

  /** Une duas listas por ID; em caso de repetição, vence a edição mais recente. */
  function mergeAgenda(account, guest) {
    const time = (item) => Date.parse(item.updatedAt) || 0;
    const byId = new Map(account.map((item) => [item.id, item]));
    for (const item of guest) {
      const current = byId.get(item.id);
      if (!current || time(item) > time(current)) byId.set(item.id, item);
    }
    return [...byId.values()];
  }

  /** Data local no formato AAAA-MM-DD (não UTC). */
  function localISODate(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function addDays(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    return localISODate(new Date(y, m - 1, d + days));
  }

  function agendaStatus(item, today) {
    if (item.done) return 'done';
    if (item.date < today) return 'overdue';
    return item.date === today ? 'today' : 'upcoming';
  }

  /** Ordena por data e hora; compromissos sem hora ficam ao fim do dia. */
  function compareAgenda(a, b) {
    return a.date.localeCompare(b.date)
      || (a.time || '99:99').localeCompare(b.time || '99:99')
      || a.title.localeCompare(b.title, 'pt-BR');
  }

  /**
   * distributed: soma dos valores; obtained: soma das notas lançadas;
   * gradedMax: valor das avaliações que já têm nota e valor (base do aproveitamento).
   */
  function scoreSummary(items) {
    let distributed = 0;
    let obtained = 0;
    let graded = 0;
    let gradedMax = 0;
    for (const item of items) {
      if (item.maxScore !== null) distributed += item.maxScore;
      if (item.score !== null) {
        obtained += item.score;
        graded += 1;
        if (item.maxScore !== null) gradedMax += item.maxScore;
      }
    }
    const round = (n) => Math.round(n * 100) / 100;
    return { distributed: round(distributed), obtained: round(obtained), graded, gradedMax: round(gradedMax) };
  }

  /** Semanas (segunda a domingo) que cobrem o mês; cada dia em AAAA-MM-DD. */
  function monthGrid(year, month) {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = localISODate(new Date(year, month, 1 - offset));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (__, d) => addDays(start, w * 7 + d)));
  }

  root.BIO_CORE = {
    esc, formatMinutes, formatNumber,
    minute, duration, weeklyMinutes,
    normalize, meetings, overlap, conflicts, requirements, totals, mergePlans,
    AGENDA_KINDS, AGENDA_LIMITS, isISODate, parseScore, validateAgendaItem, normalizeAgenda, mergeAgenda,
    localISODate, addDays, agendaStatus, compareAgenda, scoreSummary, monthGrid,
  };
  if (typeof module !== 'undefined') module.exports = root.BIO_CORE;
})(typeof window === 'undefined' ? globalThis : window);
