type Tokens = { access_token?: string; refresh_token?: string; [k: string]: any };

const TOKENS_KEY = 'users_spa_tokens_v1';

function loadTokens(): Tokens { try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}'); } catch { return {}; } }
function saveTokens(t: Tokens) { localStorage.setItem(TOKENS_KEY, JSON.stringify(t || {})); }
function clearTokens() { localStorage.removeItem(TOKENS_KEY); }

function decodeJwtPayload(token?: string): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch { return null; }
}

const apiBase = '/api'; // SPA chama o proxy serverless; o proxy usa END_POINT_API

async function request(path: string, opts: RequestInit & { auth?: boolean; body?: any } = {}) {
  const url = path.startsWith('http') ? path : apiBase.replace(/\/$/, '') + path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  const tokens = loadTokens();
  if ((opts as any).auth && tokens.access_token) headers['Authorization'] = `Bearer ${tokens.access_token}`;
  const res = await fetch(url, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await res.text().catch(() => '');
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep text as-is */ }
  if (!res.ok) throw { status: res.status, url, data };
  return data;
}

// API wrappers
const api = {
  login: (p: { username: string; password: string; }) => request('/user/auth/token', { method: 'POST', body: p }),
  refresh: (refresh_token: string) => request('/user/auth/token/refresh', { method: 'POST', body: { refresh_token } }),
  verify: (p: { code: string; password: string; }) => request('/user/auth/verify', { method: 'POST', body: p }),
  verifyLink: (p: { login: string; code: string; }) => `${apiBase}/user/auth/verify-link?login=${encodeURIComponent(p.login)}&code=${encodeURIComponent(p.code)}`,
  confirmVerifyLink: (p: { login: string; code: string; }) => request(`/user/auth/verify-link?login=${encodeURIComponent(p.login)}&code=${encodeURIComponent(p.code)}`, { method: 'GET' }),
  resendCode: (p: { login: string; }) => request('/user/auth/verification-code', { method: 'POST', body: p }),
  recovery: (p: { email: string; }) => request('/user/auth/password-recovery', { method: 'POST', body: p }),
  listSpaces: () => request('/user/spaces', { auth: true }),
  createSpace: (p: { name: string }) => request('/user/spaces', { method: 'POST', auth: true, body: p }),
  createUser: (p: { email: string; username: string; password?: string; confirm_password?: string; redirect_uri?: string; }) => {
    const redirect_uri = p.redirect_uri || window.location.origin;
    return request('/user', { method: 'POST', body: { ...p, redirect_uri } });
  },
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function section(title: string, content: HTMLElement) {
  const card = el('div', 'card mb-3');
  const body = el('div', 'card-body');
  const h = el('h5', 'card-title', title);
  body.append(h, content);
  card.append(body);
  return card;
}

function alert(kind: 'success' | 'danger', text: string) {
  const a = el('div', `alert alert-${kind} py-2 mb-2`, text);
  return a;
}

function jsonPre(obj: unknown) {
  const pre = el('pre', 'bg-body-tertiary p-2 rounded border');
  pre.textContent = (() => { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } })();
  return pre;
}

function buildUI() {
  const app = document.getElementById('app')!;
  app.innerHTML = '';

  const tabs = el('ul', 'nav nav-tabs');
  const panes = el('div', 'tab-content pt-3');
  const tabDefs = [
    { id: 'login', label: 'Login' },
    { id: 'signup', label: 'Criar Usuário' },
    { id: 'verify', label: 'Verificar' },
    { id: 'recovery', label: 'Recuperar Senha' },
    { id: 'spaces', label: 'UsersSpaces' },
  ];

  function makeTab(id: string, label: string, active?: boolean) {
    const li = el('li', 'nav-item');
    const a = el('a', 'nav-link' + (active ? ' active' : ''), label) as HTMLAnchorElement;
    a.id = `tab-${id}`;
    a.href = '#';
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      panes.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active', 'show'));
      tabs.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      (document.getElementById(`pane-${id}`)!).classList.add('active', 'show');
      a.classList.add('active');
    });
    li.append(a);
    return li;
  }

  tabDefs.forEach((t, i) => tabs.append(makeTab(t.id, t.label, i === 0)));
  app.append(tabs);

  // Login Pane
  const loginPane = el('div', 'tab-pane fade show active');
  loginPane.id = 'pane-login';
  const loginStatus = el('div', 'mb-2');
  function updateLoginStatus() {
    const t = loadTokens();
    if (t && t.access_token) {
      const claims = decodeJwtPayload(t.access_token) || ({} as any);
      const who = (claims.username || claims.preferred_username || claims.sub || claims.email || 'desconhecido');
      loginStatus.replaceChildren(alert('success', `Logado como ${who}`));
    } else {
      loginStatus.replaceChildren(alert('danger', 'Não logado'));
    }
  }
  const loginForm = el('form', 'row g-2');
  loginForm.innerHTML = `
    <div class="col-md-4"><label class="form-label">Username</label><input name="username" class="form-control" required></div>
    <div class="col-md-4"><label class="form-label">Password</label><input name="password" type="password" class="form-control" required></div>
    <div class="col-12"><button class="btn btn-primary" type="submit">Entrar</button> <button id="btn-refresh" class="btn btn-secondary" type="button">Refresh Token</button> <button id="btn-logout" class="btn btn-outline-danger" type="button">Sair</button></div>
  `;
  const loginReqOut = el('div');
  const loginRespOut = el('div');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm as HTMLFormElement);
    const username = String(fd.get('username'));
    const password = String(fd.get('password'));
    loginReqOut.replaceChildren(jsonPre({ url: '/api/user/auth/token', body: { username, password: '***' } }));
    try { const resp = await api.login({ username, password }); saveTokens(resp); updateLoginStatus(); loginRespOut.replaceChildren(alert('success', 'Login ok'), jsonPre(resp)); }
    catch (err) { loginRespOut.replaceChildren(alert('danger', 'Falha no login'), jsonPre(err)); }
  });
  loginForm.querySelector('#btn-refresh')!.addEventListener('click', async () => {
    const t = loadTokens(); if (!t.refresh_token) { loginRespOut.replaceChildren(alert('danger', 'Sem refresh_token')); return; }
    loginReqOut.replaceChildren(jsonPre({ url: '/api/user/auth/token/refresh', body: { refresh_token: '***' } }));
    try { const resp = await api.refresh(t.refresh_token); saveTokens(resp); updateLoginStatus(); loginRespOut.replaceChildren(alert('success', 'Refresh ok'), jsonPre(resp)); }
    catch (err) { loginRespOut.replaceChildren(alert('danger', 'Falha no refresh'), jsonPre(err)); }
  });
  loginForm.querySelector('#btn-logout')!.addEventListener('click', () => { clearTokens(); updateLoginStatus(); loginRespOut.replaceChildren(alert('success', 'Sessão encerrada')); });
  loginPane.append(section('Login', el('div', '', '')), loginStatus, loginForm, section('Request', loginReqOut), section('Response', loginRespOut));

  // Signup Pane
  const signupPane = el('div', 'tab-pane fade');
  signupPane.id = 'pane-signup';
  const signupForm = el('form', 'row g-2');
  signupForm.innerHTML = `
    <div class="col-md-4"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required></div>
    <div class="col-md-4"><label class="form-label">Username</label><input name="username" class="form-control" required></div>
    <div class="col-md-4"><label class="form-label">Senha</label><input name="password" type="password" class="form-control" required></div>
    <div class="col-md-4"><label class="form-label">Confirmar Senha</label><input name="confirm_password" type="password" class="form-control" required></div>
    <div class="col-12"><button class="btn btn-primary" type="submit">Criar Conta</button></div>
  `;
  const signupReqOut = el('div');
  const signupRespOut = el('div');
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(signupForm as HTMLFormElement);
    const email = String(fd.get('email') || '');
    const username = String(fd.get('username') || '');
    const password = String(fd.get('password') || '');
    const confirm_password = String(fd.get('confirm_password') || '');
    if (!password || !confirm_password) { signupRespOut.replaceChildren(alert('danger', 'Senha e confirmação são obrigatórias')); return; }
    if (password !== confirm_password) { signupRespOut.replaceChildren(alert('danger', 'As senhas não coincidem')); return; }
    const redirect_uri = window.location.origin;
    const payload: any = { email, username, password, confirm_password, redirect_uri };
    signupReqOut.replaceChildren(jsonPre({ url: '/api/user', origin: window.location.origin, payload: { ...payload, password: '***', confirm_password: '***' } }));
    signupRespOut.replaceChildren(alert('success', 'Enviando...'));
    try { const resp = await api.createUser(payload); signupRespOut.replaceChildren(alert('success', 'Usuário criado'), jsonPre(resp)); }
    catch (err) { signupRespOut.replaceChildren(alert('danger', 'Falha ao criar usuário'), jsonPre(err)); }
  });
  signupPane.append(section('Criar Usuário (signup)', signupForm), section('Request', signupReqOut), section('Response', signupRespOut));

  // Verify Pane
  const verifyPane = el('div', 'tab-pane fade');
  verifyPane.id = 'pane-verify';
  const verifyForm = el('form', 'row g-2');
  verifyForm.innerHTML = `
    <div class="col-md-4"><label class="form-label">Código</label><input name="code" class="form-control" required></div>
    <div class="col-md-4"><label class="form-label">Senha atual</label><input name="password" type="password" class="form-control" required></div>
    <div class="col-12"><button class="btn btn-primary" type="submit">Verificar</button></div>
  `;
  const verifyReqOut = el('div');
  const verifyRespOut = el('div');
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(verifyForm as HTMLFormElement);
    const code = String(fd.get('code'));
    const password = String(fd.get('password'));
    verifyReqOut.replaceChildren(jsonPre({ url: '/api/user/auth/verify', body: { code: '***', password: '***' } }));
    verifyRespOut.replaceChildren(alert('success', 'Enviando...'));
    try { const resp = await api.verify({ code, password }); verifyRespOut.replaceChildren(alert('success', 'Conta verificada'), jsonPre(resp)); }
    catch (err) { verifyRespOut.replaceChildren(alert('danger', 'Falha na verificação'), jsonPre(err)); }
  });
  // Verificação via link agora é feita em página separada em public/user/auth/verify-link

  const resendForm = el('form', 'row g-2');
  resendForm.innerHTML = `
    <div class="col-md-4"><label class="form-label">Login</label><input name="login" class="form-control" required></div>
    <div class="col-12"><button class="btn btn-outline-primary" type="submit">Reenviar Código</button></div>
  `;
  resendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(resendForm as HTMLFormElement);
    const login = String(fd.get('login'));
    verifyReqOut.replaceChildren(jsonPre({ url: '/api/user/auth/verification-code', body: { login } }));
    try { const resp = await api.resendCode({ login }); verifyRespOut.replaceChildren(alert('success', 'Código reenviado'), jsonPre(resp)); }
    catch (err) { verifyRespOut.replaceChildren(alert('danger', 'Falha ao reenviar'), jsonPre(err)); }
  });
  verifyPane.append(section('Verificar (código + senha)', verifyForm), section('Reenviar Código', resendForm), section('Request', verifyReqOut), section('Response', verifyRespOut));

  // Recovery Pane
  const recPane = el('div', 'tab-pane fade');
  recPane.id = 'pane-recovery';
  const recForm = el('form', 'row g-2');
  recForm.innerHTML = `
    <div class="col-md-5"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required></div>
    <div class="col-12"><button class="btn btn-primary" type="submit">Enviar</button></div>
  `;
  const recReqOut = el('div');
  const recRespOut = el('div');
  recForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(recForm as HTMLFormElement);
    const email = String(fd.get('email'));
    recReqOut.replaceChildren(jsonPre({ url: '/api/user/auth/password-recovery', body: { email } }));
    try { const resp = await api.recovery({ email }); recRespOut.replaceChildren(alert('success', 'Se existir, e-mail enviado'), jsonPre(resp)); }
    catch (err) { recRespOut.replaceChildren(alert('danger', 'Falha ao recuperar'), jsonPre(err)); }
  });
  recPane.append(section('Recuperar Senha', recForm), section('Request', recReqOut), section('Response', recRespOut));

  // Spaces Pane
  const spPane = el('div', 'tab-pane fade');
  spPane.id = 'pane-spaces';
  const spActions = el('div', 'd-flex gap-2');
  const btnList = el('button', 'btn btn-outline-secondary', 'Listar Espaços') as HTMLButtonElement;
  btnList.addEventListener('click', async () => {
    spReqOut.replaceChildren(jsonPre({ url: '/api/user/spaces', method: 'GET', auth: true }));
    try { const data = await api.listSpaces(); spRespOut.replaceChildren(alert('success', 'Espaços listados'), jsonPre(data)); }
    catch (err) { spRespOut.replaceChildren(alert('danger', 'Falha ao listar'), jsonPre(err)); }
  });
  const formCreate = el('form', 'd-flex gap-2 align-items-end');
  formCreate.innerHTML = `
    <div><label class="form-label">Nome</label><input name="name" class="form-control" required></div>
    <div><button class="btn btn-primary" type="submit">Criar</button></div>
  `;
  const spReqOut = el('div');
  const spRespOut = el('div');
  formCreate.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formCreate as HTMLFormElement);
    const name = String(fd.get('name'));
    spReqOut.replaceChildren(jsonPre({ url: '/api/user/spaces', method: 'POST', auth: true, body: { name } }));
    try { const data = await api.createSpace({ name }); spRespOut.replaceChildren(alert('success', 'Espaço criado'), jsonPre(data)); }
    catch (err) { spRespOut.replaceChildren(alert('danger', 'Falha ao criar (requer tools_role=admin)'), jsonPre(err)); }
  });
  spActions.append(btnList, formCreate);
  spPane.append(section('UsersSpaces', spActions), section('Request', spReqOut), section('Response', spRespOut));

  // Diagnostics Pane (hidden within Login section footer)
  const diag = el('div', 'mt-3 d-flex gap-2');
  const btnPing = el('button', 'btn btn-outline-secondary btn-sm', 'Ping /healthz') as HTMLButtonElement;
  btnPing.addEventListener('click', async () => {
    try { const d = await request('/healthz'); loginRespOut.replaceChildren(alert('success', 'Health OK'), jsonPre(d)); }
    catch (err) { loginRespOut.replaceChildren(alert('danger', 'Health FAIL'), jsonPre(err)); }
  });
  const btnWhoami = el('button', 'btn btn-outline-secondary btn-sm', 'Whoami') as HTMLButtonElement;
  btnWhoami.addEventListener('click', async () => {
    try { const d = await request('/user/whoami', { auth: true } as any); loginRespOut.replaceChildren(alert('success', 'Whoami'), jsonPre(d)); }
    catch (err) { loginRespOut.replaceChildren(alert('danger', 'Whoami FAIL'), jsonPre(err)); }
  });
  diag.append(btnPing, btnWhoami);
  loginPane.append(diag);

  panes.append(loginPane, signupPane, verifyPane, recPane, spPane);
  app.append(panes);
  updateLoginStatus();
}

buildUI();
