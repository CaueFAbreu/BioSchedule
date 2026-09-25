/* Persistência da grade e da agenda: navegador (sem conta) ou Supabase (com login). */
(function (root) {
  'use strict';

  const SUPABASE_SCRIPT = 'vendor/supabase-2.117.2.js';
  // Mantido em sincronia com o connect-src da Content-Security-Policy em index.html.
  const SUPABASE_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;

  // Mensagens genéricas: não revelam se um e-mail está cadastrado.
  const AUTH_ERRORS = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail pelo link enviado antes de entrar.',
    weak_password: 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.',
    same_password: 'A nova senha deve ser diferente da atual.',
    over_email_send_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  };
  const authMessage = (error) => AUTH_ERRORS[error?.code] || 'Não foi possível concluir. Verifique a conexão e tente novamente.';

  /** Chaves secretas ignoram o Row Level Security e jamais podem ir para o navegador. */
  function isSecretKey(key) {
    if (key.startsWith('sb_secret_')) return true;
    try {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).role === 'service_role';
    } catch {
      return false;
    }
  }

  function isConfigured(config) {
    const key = config?.supabaseAnonKey;
    if (!config || !SUPABASE_URL.test(config.supabaseUrl || '') || typeof key !== 'string' || key.length < 20) return false;
    if (isSecretKey(key)) {
      console.error('BioSchedule: config.js contém uma chave secreta do Supabase. Login desativado; troque pela chave pública (anon).');
      return false;
    }
    return true;
  }

  /** localStorage pode lançar exceções (modo privado, bloqueio de cookies); nada aqui propaga erro. */
  function safeStorage(getStorage) {
    const run = (fn, fallback) => {
      try { return fn(getStorage()); } catch { return fallback; }
    };
    return {
      available: () => run((s) => {
        const probe = '__bioschedule_probe__';
        s.setItem(probe, '1');
        s.removeItem(probe);
        return true;
      }, false),
      // JSON corrompido é tratado como ausência de dados, não como falha de armazenamento.
      read: (key) => run((s) => {
        const text = s.getItem(key);
        return text === null ? null : JSON.parse(text);
      }, null),
      write: (key, value) => run((s) => {
        s.setItem(key, JSON.stringify(value));
        return true;
      }, false),
      remove: (key) => run((s) => s.removeItem(key), undefined),
    };
  }

  const toRow = (item, userId) => ({
    id: item.id,
    user_id: userId,
    course_id: item.courseId,
    kind: item.kind,
    title: item.title,
    due_date: item.date,
    due_time: item.time || null,
    max_score: item.maxScore,
    score: item.score,
    notes: item.notes,
    done: item.done,
    updated_at: item.updatedAt,
  });

  const fromRow = (row) => ({
    id: row.id,
    courseId: row.course_id,
    kind: row.kind,
    title: row.title,
    date: row.due_date,
    time: row.due_time || '',
    maxScore: row.max_score,
    score: row.score,
    notes: row.notes || '',
    done: row.done === true,
    updatedAt: row.updated_at,
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => (root.supabase ? resolve(root.supabase) : reject(Error('Supabase indisponível')));
      script.onerror = () => reject(Error('Falha ao carregar ' + src));
      document.head.append(script);
    });
  }

  function createStore(options) {
    const { core, courses, semester, config, keys } = options;
    const local = safeStorage(options.getStorage || (() => root.localStorage));
    const loadSupabase = options.loadSupabase || (() => loadScript(SUPABASE_SCRIPT));
    const location = options.location || root.location;
    const courseIds = new Set(courses.map((c) => c.id));
    const listeners = new Set();

    /**
     * mode: 'local' (navegador) ou 'cloud' (conta carregada).
     * sync: 'saved' | 'unavailable' | 'loading' | 'saving' | 'error'.
     * Com `user` definido e mode 'local', a conta não pôde ser carregada e as mudanças ficam no navegador.
     */
    const status = {
      configured: isConfigured(config),
      mode: 'local',
      user: null,
      sync: local.available() ? 'saved' : 'unavailable',
      recovery: false,
      notice: '',
    };

    let state = readGuest();
    let client = null;
    let entering = null;
    let flushing = false;
    let guestImported = false;
    // Operações pendentes por chave: uma nova operação sobre a mesma chave substitui a anterior.
    const queue = new Map();

    function readGuest() {
      return {
        plan: core.normalize(local.read(keys.plan), courses),
        agenda: core.normalizeAgenda(local.read(keys.agenda), courses),
      };
    }

    const emit = (reason) => listeners.forEach((fn) => fn(reason));
    function setStatus(patch) {
      Object.assign(status, patch);
      emit('status');
    }

    function persistGuest() {
      const ok = local.write(keys.plan, state.plan) && local.write(keys.agenda, state.agenda);
      setStatus({ sync: ok ? 'saved' : 'unavailable' });
    }

    function commit(next, ops) {
      state = next;
      emit('state');
      if (status.mode === 'cloud') {
        for (const [key, op] of ops) queue.set(key, op);
        flush();
      } else {
        persistGuest();
      }
    }

    // ------------------------------------------------------------ Nuvem

    const check = ({ data, error }) => {
      if (error) throw error;
      return data;
    };
    const pushPlan = () => client.from('plans')
      .upsert({ user_id: status.user.id, semester, data: state.plan, updated_at: new Date().toISOString() })
      .then(check);
    const pushItems = (items) => client.from('agenda_items')
      .upsert(items.map((item) => toRow(item, status.user.id)))
      .then(check);
    const dropItem = (id) => client.from('agenda_items').delete().eq('id', id).then(check);

    async function flush() {
      if (flushing || status.mode !== 'cloud' || !queue.size) return;
      flushing = true;
      setStatus({ sync: 'saving' });
      try {
        while (queue.size) {
          const [key, op] = queue.entries().next().value;
          await op();
          if (queue.get(key) === op) queue.delete(key);
        }
        if (guestImported) {
          // Dados do navegador já estão na conta: removidos para não ficarem após o logout.
          local.remove(keys.plan);
          local.remove(keys.agenda);
          guestImported = false;
        }
        setStatus({ sync: 'saved' });
      } catch {
        setStatus({ sync: 'error' });
      } finally {
        flushing = false;
      }
    }

    async function loadAccount(user) {
      setStatus({ user, sync: 'loading', notice: '' });
      try {
        const [planRow, rows] = await Promise.all([
          client.from('plans').select('data').eq('semester', semester).maybeSingle().then(check),
          client.from('agenda_items').select('*').then(check),
        ]);
        if (status.user?.id !== user.id) return;

        const guest = readGuest();
        const accountAgenda = core.normalizeAgenda((rows || []).map(fromRow), courses);
        const agenda = core.mergeAgenda(accountAgenda, guest.agenda);
        const accountById = new Map(accountAgenda.map((item) => [item.id, item]));
        const imported = agenda.filter((item) => accountById.get(item.id) !== item);
        const guestHasPlan = guest.plan.completed.length > 0 || Object.keys(guest.plan.selected).length > 0;

        state = { plan: planRow ? core.mergePlans(planRow.data, guest.plan, courses) : guest.plan, agenda };
        status.mode = 'cloud';
        if (!planRow || guestHasPlan) queue.set('plan', pushPlan);
        if (imported.length) queue.set('import', () => pushItems(imported));
        guestImported = guestHasPlan || guest.agenda.length > 0;
        emit('state');
        if (queue.size) await flush();
        else setStatus({ sync: 'saved' });
      } catch {
        if (status.user?.id === user.id) setStatus({ mode: 'local', sync: 'error' });
      }
    }

    function enterAccount(user) {
      if (!entering || entering.id !== user.id) {
        const promise = loadAccount(user).finally(() => {
          if (entering?.promise === promise) entering = null;
        });
        entering = { id: user.id, promise };
      }
      return entering.promise;
    }

    function leaveAccount() {
      queue.clear();
      guestImported = false;
      entering = null;
      state = readGuest();
      setStatus({ mode: 'local', user: null, recovery: false, sync: local.available() ? 'saved' : 'unavailable' });
      emit('state');
    }

    async function onAuthChange(event, session) {
      if (event === 'PASSWORD_RECOVERY') setStatus({ recovery: true });
      const user = session?.user;
      if (!user) {
        if (status.user) leaveAccount();
        return;
      }
      if (status.user?.id === user.id && (status.mode === 'cloud' || entering)) return;
      await enterAccount({ id: user.id, email: user.email || '' });
    }

    /** Remove da URL os parâmetros de retorno dos links de confirmação e recuperação. */
    function cleanAuthParams() {
      if (!location || !root.history) return;
      const url = new URL(location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const failed = url.searchParams.has('error_description') || hash.has('error_description');
      const params = ['code', 'error', 'error_code', 'error_description', 'type'];
      if (!params.some((p) => url.searchParams.has(p)) && !failed) return;
      params.forEach((p) => url.searchParams.delete(p));
      if (failed) {
        url.hash = '';
        setStatus({ notice: 'O link expirou ou é inválido. Solicite um novo.' });
      }
      root.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    async function init() {
      if (!status.configured) return;
      try {
        const supabase = await loadSupabase();
        client = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
      } catch {
        setStatus({ configured: false });
        return;
      }
      client.auth.onAuthStateChange((event, session) => {
        // Chamar o Supabase dentro deste callback pode travar o cliente; adiado para a próxima volta.
        setTimeout(() => onAuthChange(event, session), 0);
      });
      try {
        await client.auth.getSession();
      } finally {
        cleanAuthParams();
      }
    }

    const redirectTo = () => (location && /^https?:$/.test(location.protocol) ? location.origin + location.pathname : undefined);

    async function authCall(fn) {
      if (!client) return { ok: false, message: 'Login indisponível no momento.' };
      try {
        const { data, error } = await fn();
        return error ? { ok: false, message: authMessage(error) } : { ok: true, data };
      } catch {
        return { ok: false, message: authMessage(null) };
      }
    }

    const auth = {
      signIn: (email, password) => authCall(() => client.auth.signInWithPassword({ email, password })),
      async signUp(email, password) {
        const result = await authCall(() => client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }));
        if (!result.ok) return result;
        return { ok: true, confirm: !result.data?.session };
      },
      requestReset: (email) => authCall(() => client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })),
      async updatePassword(password) {
        const result = await authCall(() => client.auth.updateUser({ password }));
        if (result.ok) setStatus({ recovery: false });
        return result;
      },
      async signOut() {
        if (client) await client.auth.signOut({ scope: 'local' }).catch(() => {});
        leaveAccount();
      },
      /** Apaga permanentemente a conta e todos os dados dela no servidor. */
      async deleteAccount() {
        if (!status.user) return { ok: false, message: 'Entre na conta para excluí-la.' };
        const result = await authCall(() => client.rpc('delete_own_account'));
        if (!result.ok) return result;
        queue.clear();
        await client.auth.signOut({ scope: 'local' }).catch(() => {});
        leaveAccount();
        return { ok: true };
      },
    };

    return {
      init,
      auth,
      get state() { return state; },
      get status() { return status; },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      pending: () => queue.size > 0 || flushing,
      dismissNotice: () => setStatus({ notice: '' }),
      retry() {
        if (status.user && status.mode === 'local') return enterAccount(status.user);
        return flush();
      },
      setPlan(plan) {
        commit({ ...state, plan: core.normalize(plan, courses) }, [['plan', pushPlan]]);
      },
      /** Cria ou atualiza um compromisso. Retorna os erros de validação, se houver. */
      saveItem(input) {
        const { item, errors, valid } = core.validateAgendaItem({ ...input, updatedAt: new Date().toISOString() }, courseIds);
        if (!valid) return { ok: false, errors };
        const agenda = state.agenda.some((x) => x.id === item.id)
          ? state.agenda.map((x) => (x.id === item.id ? item : x))
          : [...state.agenda, item];
        commit({ ...state, agenda }, [['item:' + item.id, () => pushItems([item])]]);
        return { ok: true, item };
      },
      removeItem(id) {
        if (!state.agenda.some((x) => x.id === id)) return;
        commit({ ...state, agenda: state.agenda.filter((x) => x.id !== id) }, [['item:' + id, () => dropItem(id)]]);
      },
    };
  }

  root.BIO_STORE = { createStore, isConfigured, toRow, fromRow };
  if (typeof module !== 'undefined') module.exports = root.BIO_STORE;
})(typeof window === 'undefined' ? globalThis : window);
