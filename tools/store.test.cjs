const { test } = require('node:test');
const assert = require('node:assert/strict');
const { courses } = require('../data.js');
const core = require('../core.js');
const { createStore, isConfigured } = require('../store.js');

const keys = { plan: 'plan', agenda: 'agenda' };
const config = { supabaseUrl: 'https://abcdefghijklmnop.supabase.co', supabaseAnonKey: 'sb_publishable_' + 'x'.repeat(30) };
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const item = (over = {}) => ({
  id: '3f1b6c2e-8a4d-4b7e-9c1a-2d5e6f7a8b9c', courseId: 'FAMAT31011', kind: 'prova', title: 'Prova 1',
  date: '2026-10-05', time: '', maxScore: '25', score: '', notes: '', done: false, ...over,
});

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

/** Supabase mínimo em memória: tabelas por usuário, respostas { data, error } e eventos de auth. */
function fakeSupabase({ fail = false } = {}) {
  const db = { plans: [], agenda_items: [] };
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'aluno@ufu.br' };
  let listener = () => {};
  const control = { db, user, fail };
  const respond = (data) => Promise.resolve(control.fail ? { data: null, error: { message: 'offline' } } : { data, error: null });

  function from(table) {
    const filters = [];
    const rows = () => db[table].filter((r) => filters.every(([k, v]) => r[k] === v));
    const builder = {
      select: () => builder,
      eq: (k, v) => { filters.push([k, v]); return builder; },
      maybeSingle: () => respond(rows()[0] || null),
      then: (ok, ko) => respond(rows()).then(ok, ko),
      upsert(payload) {
        if (control.fail) return respond(null);
        for (const row of [].concat(payload)) {
          const keyOf = (r) => (table === 'plans' ? r.user_id + r.semester : r.id);
          db[table] = db[table].filter((r) => keyOf(r) !== keyOf(row)).concat({ ...row });
        }
        return respond(null);
      },
      delete: () => ({
        eq: (k, v) => {
          if (!control.fail) db[table] = db[table].filter((r) => r[k] !== v);
          return respond(null);
        },
      }),
    };
    return builder;
  }

  const client = {
    from,
    auth: {
      onAuthStateChange: (fn) => { listener = fn; },
      getSession: async () => ({ data: { session: null } }),
      async signInWithPassword({ password }) {
        if (password !== 'correta123') return { data: null, error: { code: 'invalid_credentials' } };
        listener('SIGNED_IN', { user });
        return { data: { session: { user } }, error: null };
      },
      async signOut() { listener('SIGNED_OUT', null); return { error: null }; },
    },
  };
  control.lib = { createClient: () => client };
  return control;
}

function setup({ storage = memoryStorage(), supabase = null } = {}) {
  const store = createStore({
    core, courses, semester: '2026.2', keys,
    config: supabase ? config : {},
    getStorage: () => storage,
    loadSupabase: async () => supabase.lib,
  });
  return { store, storage };
}

test('sem configuração, grade e agenda ficam no navegador', () => {
  const { store, storage } = setup();
  assert.equal(store.status.configured, false);
  store.setPlan({ selected: { FAMAT31011: '2' }, completed: [] });
  assert.equal(store.saveItem(item()).ok, true);
  assert.deepEqual(JSON.parse(storage.data.get('plan')).selected, { FAMAT31011: '2' });
  assert.equal(JSON.parse(storage.data.get('agenda'))[0].maxScore, 25);
  assert.equal(store.status.sync, 'saved');
});

test('JSON corrompido não é confundido com armazenamento indisponível', () => {
  const { store } = setup({ storage: memoryStorage({ plan: '{quebrado', agenda: 'x' }) });
  assert.equal(store.status.sync, 'saved');
  assert.deepEqual(store.state.plan, { selected: {}, completed: [] });
});

test('armazenamento bloqueado é informado', () => {
  const blocked = { getItem() { throw Error('bloqueado'); }, setItem() { throw Error('bloqueado'); }, removeItem() {} };
  const { store } = setup({ storage: blocked });
  assert.equal(store.status.sync, 'unavailable');
  store.setPlan({ selected: { FAMAT31011: '2' }, completed: [] });
  assert.equal(store.status.sync, 'unavailable');
});

test('compromisso inválido não é salvo e devolve os erros', () => {
  const { store } = setup();
  const r = store.saveItem(item({ title: '', date: 'amanhã' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.title && r.errors.date);
  assert.equal(store.state.agenda.length, 0);
});

test('chaves inválidas ou secretas desativam o login', () => {
  const jwt = (payload) => `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`;
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(isConfigured(config), true);
    assert.equal(isConfigured({ ...config, supabaseUrl: 'https://evil.example.com' }), false);
    assert.equal(isConfigured({ ...config, supabaseAnonKey: 'sb_secret_' + 'x'.repeat(30) }), false);
    assert.equal(isConfigured({ ...config, supabaseAnonKey: jwt({ role: 'service_role', pad: 'x'.repeat(20) }) }), false);
    assert.equal(isConfigured({ ...config, supabaseAnonKey: jwt({ role: 'anon', pad: 'x'.repeat(20) }) }), true);
  } finally {
    console.error = original;
  }
});

test('login leva os dados do navegador para a conta e limpa a cópia local', async () => {
  const supabase = fakeSupabase();
  supabase.db.plans.push({ user_id: supabase.user.id, semester: '2026.2', data: { selected: { FEELT31107: 'A1' }, completed: [] } });
  supabase.db.agenda_items.push({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: supabase.user.id, course_id: 'FEELT31107', kind: 'trabalho', title: 'Da conta', due_date: '2026-10-01', due_time: '10:00:00', max_score: 10, score: null, notes: '', done: false, updated_at: '2026-09-20T00:00:00+00:00' });
  const { store, storage } = setup({ supabase });
  store.setPlan({ selected: { FAMAT31011: '2' }, completed: ['FEELT31106'] });
  store.saveItem(item());
  await store.init();

  assert.equal((await store.auth.signIn('aluno@ufu.br', 'errada')).message, 'E-mail ou senha incorretos.');
  assert.equal((await store.auth.signIn('aluno@ufu.br', 'correta123')).ok, true);
  await tick();

  assert.equal(store.status.mode, 'cloud');
  assert.equal(store.status.sync, 'saved');
  assert.deepEqual(store.state.plan.selected, { FEELT31107: 'A1', FAMAT31011: '2' });
  assert.equal(store.state.agenda.length, 2);
  assert.equal(supabase.db.agenda_items.length, 2);
  assert.deepEqual(supabase.db.plans[0].data.completed, ['FEELT31106']);
  assert.ok(supabase.db.agenda_items.every((r) => r.user_id === supabase.user.id));
  assert.equal(storage.data.has('plan'), false);
  assert.equal(storage.data.has('agenda'), false);

  store.removeItem(item().id);
  await tick();
  assert.equal(supabase.db.agenda_items.length, 1);

  await store.auth.signOut();
  assert.equal(store.status.user, null);
  assert.equal(store.status.mode, 'local');
  assert.deepEqual(store.state, { plan: { selected: {}, completed: [] }, agenda: [] });
});

test('falha de rede mantém a alteração pendente até nova tentativa', async () => {
  const supabase = fakeSupabase();
  const { store } = setup({ supabase });
  await store.init();
  await store.auth.signIn('aluno@ufu.br', 'correta123');
  await tick();
  assert.equal(store.status.mode, 'cloud');

  supabase.fail = true;
  store.saveItem(item());
  await tick();
  assert.equal(store.status.sync, 'error');
  assert.equal(store.pending(), true);

  supabase.fail = false;
  await store.retry();
  assert.equal(store.status.sync, 'saved');
  assert.equal(store.pending(), false);
  assert.equal(supabase.db.agenda_items[0].max_score, 25);
});

test('se a conta não carrega, as mudanças continuam salvas no navegador', async () => {
  const supabase = fakeSupabase({ fail: true });
  const { store, storage } = setup({ supabase });
  await store.init();
  await store.auth.signIn('aluno@ufu.br', 'correta123');
  await tick();
  assert.equal(store.status.mode, 'local');
  assert.equal(store.status.user.email, 'aluno@ufu.br');
  assert.equal(store.status.sync, 'error');

  store.setPlan({ selected: { FAMAT31011: '2' }, completed: [] });
  assert.ok(storage.data.has('plan'));

  supabase.fail = false;
  await store.retry();
  assert.equal(store.status.mode, 'cloud');
  assert.deepEqual(supabase.db.plans[0].data.selected, { FAMAT31011: '2' });
  assert.equal(storage.data.has('plan'), false);
});
