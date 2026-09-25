/* Interface de conta: entrar, criar conta, recuperar e redefinir senha. */
(function (root) {
  'use strict';

  const MODES = {
    signin: { title: 'Entrar', submit: 'Entrar', email: true, password: true, autocomplete: 'current-password',
      intro: 'Com uma conta, sua grade e sua agenda ficam salvas e sincronizadas entre dispositivos.' },
    signup: { title: 'Criar conta', submit: 'Criar conta', email: true, password: true, autocomplete: 'new-password',
      intro: 'A senha precisa de pelo menos 8 caracteres, com letras e números. O que já estiver neste navegador será levado para a conta.' },
    reset: { title: 'Recuperar senha', submit: 'Enviar link', email: true, password: false,
      intro: 'Enviaremos um link para você criar uma nova senha.' },
    recovery: { title: 'Nova senha', submit: 'Salvar senha', email: false, password: true, autocomplete: 'new-password',
      intro: 'Escolha uma nova senha com pelo menos 8 caracteres, com letras e números.' },
  };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Mesma regra configurada no Supabase (Password requirements: letters and digits).
  const STRONG_PASSWORD = (value) => value.length >= 8 && /\p{L}/u.test(value) && /\d/.test(value);

  function create({ store, $ }) {
    const dialog = $('auth-dialog');
    const form = $('auth-form');
    const message = $('auth-message');
    let mode = 'signin';
    let busy = false;

    function setMode(next, text = '') {
      mode = next;
      const m = MODES[mode];
      $('auth-title').textContent = m.title;
      $('auth-intro').textContent = m.intro;
      $('auth-submit').textContent = m.submit;
      form.querySelector('[data-for="email"]').hidden = !m.email;
      form.querySelector('[data-for="password"]').hidden = !m.password;
      form.elements.password.autocomplete = m.autocomplete || 'off';
      form.elements.password.value = '';
      form.querySelectorAll('[data-mode]').forEach((b) => { b.hidden = b.dataset.mode === mode || mode === 'recovery'; });
      message.textContent = text;
      message.classList.remove('error');
    }

    function open(next = 'signin', text = '') {
      setMode(next, text);
      if (!dialog.open) dialog.showModal();
      form.elements[MODES[next].email ? 'email' : 'password'].focus();
    }

    function show(text, isError) {
      message.textContent = text;
      message.classList.toggle('error', isError);
    }

    form.addEventListener('click', (event) => {
      const switcher = event.target.closest('[data-mode]');
      if (switcher) setMode(switcher.dataset.mode);
      if (event.target.closest('[data-close]')) dialog.close();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const m = MODES[mode];
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      if (m.email && !EMAIL.test(email)) return show('Informe um e-mail válido.', true);
      if (m.password && password.length < 8) return show('A senha precisa ter pelo menos 8 caracteres.', true);
      if ((mode === 'signup' || mode === 'recovery') && !STRONG_PASSWORD(password)) {
        return show('A senha precisa ter letras e números.', true);
      }

      busy = true;
      $('auth-submit').disabled = true;
      show('Aguarde…', false);
      try {
        if (mode === 'signin') {
          const r = await store.auth.signIn(email, password);
          if (!r.ok) return show(r.message, true);
          dialog.close();
        } else if (mode === 'signup') {
          const r = await store.auth.signUp(email, password);
          if (!r.ok) return show(r.message, true);
          if (r.confirm) setMode('signin', 'Se o e-mail puder ser cadastrado, você receberá um link de confirmação. Depois de confirmar, entre aqui.');
          else dialog.close();
        } else if (mode === 'reset') {
          const r = await store.auth.requestReset(email);
          if (!r.ok) return show(r.message, true);
          setMode('signin', 'Se houver uma conta com este e-mail, você receberá o link em instantes.');
        } else if (mode === 'recovery') {
          const r = await store.auth.updatePassword(password);
          if (!r.ok) return show(r.message, true);
          dialog.close();
        }
      } finally {
        busy = false;
        $('auth-submit').disabled = false;
        form.elements.password.value = '';
      }
    });

    $('auth-button').addEventListener('click', async () => {
      if (!store.status.user) return open('signin');
      if (store.pending() && !root.confirm('Há alterações ainda não sincronizadas. Sair mesmo assim? Elas serão perdidas.')) return;
      await store.auth.signOut();
    });

    /** Reflete o estado da conta no cabeçalho e abre os diálogos pedidos pelo fluxo de e-mail. */
    function render() {
      const { configured, user, recovery, notice } = store.status;
      $('auth-button').hidden = !configured;
      $('auth-button').textContent = user ? 'Sair' : 'Entrar';
      $('account-email').hidden = !user;
      $('account-email').textContent = user?.email || '';
      if (recovery && mode !== 'recovery') open('recovery');
      if (notice) {
        store.dismissNotice();
        open('reset', notice);
      }
    }

    return { render, open };
  }

  root.BIO_AUTH_UI = { create };
})(window);
