(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setAlert(kind, msg) {
    const c = $('#alerts');
    if (!msg) { c.innerHTML = ''; return; }
    const cls = kind === 'err' ? 'alert err' : 'alert ok';
    c.innerHTML = `<div class="${cls}">${msg}</div>`;
  }

  function showView(name) {
    $$('.view').forEach(el => el.classList.add('hidden'));
    $(`#view-${name}`).classList.remove('hidden');
  }

  function initBase() {
    const input = $('#apiBaseInput');
    input.value = UsersFront.getBaseURL();
    $('#saveBaseBtn').addEventListener('click', () => {
      UsersFront.saveConfig({ baseURL: input.value.trim() });
      setAlert('ok', `Base URL salva: ${UsersFront.getBaseURL()}`);
    });
  }

  function initNav() {
    $$('nav button[data-view]').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });
    $('#logoutBtn').addEventListener('click', () => {
      UsersFront.clearTokens();
      setAlert('ok', 'Sessão encerrada.');
      showView('login');
    });
  }

  function pretty(obj) {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }

  function initLogin() {
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const body = { username: fd.get('username'), password: fd.get('password') };
      try {
        const data = await UsersFront.apiLogin(body);
        UsersFront.saveTokens(data);
        $('#loginResult').textContent = pretty(data);
        setAlert('ok', 'Login realizado. Tokens salvos.');
      } catch (err) {
        $('#loginResult').textContent = pretty(err);
        setAlert('err', 'Falha no login. Veja detalhes abaixo.');
      }
    });

    $('#refreshBtn').addEventListener('click', async () => {
      const tokens = UsersFront.loadTokens();
      if (!tokens.refresh_token) { setAlert('err', 'Sem refresh_token salvo.'); return; }
      try {
        const data = await UsersFront.apiRefresh(tokens.refresh_token);
        UsersFront.saveTokens(data);
        $('#loginResult').textContent = pretty(data);
        setAlert('ok', 'Refresh bem-sucedido.');
      } catch (err) {
        $('#loginResult').textContent = pretty(err);
        setAlert('err', 'Falha no refresh.');
      }
    });
  }

  function initVerify() {
    $('#verifyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      try {
        const data = await UsersFront.apiVerify({ code: fd.get('code'), password: fd.get('password') });
        $('#verifyResult').textContent = pretty(data);
        setAlert('ok', 'Conta verificada (código + senha).');
      } catch (err) {
        $('#verifyResult').textContent = pretty(err);
        setAlert('err', 'Falha na verificação.');
      }
    });

    $('#verifyLinkForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const href = UsersFront.apiVerifyLinkURL({ login: fd.get('login'), code: fd.get('code') });
      window.open(href, '_blank');
    });

    $('#resendCodeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      try {
        const data = await UsersFront.apiResendVerificationCode({ login: fd.get('login') });
        $('#verifyResult').textContent = pretty(data);
        setAlert('ok', 'Código reenviado (se aplicável).');
      } catch (err) {
        $('#verifyResult').textContent = pretty(err);
        setAlert('err', 'Falha ao reenviar código.');
      }
    });
  }

  function initRecovery() {
    $('#recoveryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      try {
        const data = await UsersFront.apiPasswordRecovery({ email: fd.get('email') });
        $('#recoveryResult').textContent = pretty(data);
        setAlert('ok', 'Se o e-mail existir, instruções foram enviadas.');
      } catch (err) {
        $('#recoveryResult').textContent = pretty(err);
        setAlert('err', 'Falha ao solicitar recuperação.');
      }
    });
  }

  function initSpaces() {
    $('#listSpacesBtn').addEventListener('click', async () => {
      try {
        const data = await UsersFront.apiListSpaces();
        $('#spacesResult').textContent = pretty(data);
        setAlert('ok', 'Espaços listados.');
      } catch (err) {
        $('#spacesResult').textContent = pretty(err);
        setAlert('err', 'Falha ao listar espaços.');
      }
    });

    $('#createSpaceForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      try {
        const data = await UsersFront.apiCreateSpace({ name: fd.get('name') });
        $('#spacesResult').textContent = pretty(data);
        setAlert('ok', 'Espaço criado.');
      } catch (err) {
        $('#spacesResult').textContent = pretty(err);
        setAlert('err', 'Falha ao criar espaço (requer tools_role=admin).');
      }
    });
  }

  function boot() {
    initBase();
    initNav();
    initLogin();
    initVerify();
    initRecovery();
    initSpaces();
    // default view
    showView('login');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();

