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
  recovery: (p: { email: string; redirect_uri?: string; }) => {
    const redirect_uri = p.redirect_uri || window.location.origin;
    return request('/user/auth/password-recovery', { method: 'POST', body: { ...p, redirect_uri } });
  },
  listSpaces: () => request('/user/spaces', { auth: true }),
  createSpace: (p: { name: string }) => request('/user/spaces', { method: 'POST', auth: true, body: p }),
  createUser: (p: { email: string; username: string; password?: string; confirm_password?: string; redirect_uri?: string; }) => {
    const redirect_uri = p.redirect_uri || window.location.origin;
    return request('/user', { method: 'POST', body: { ...p, redirect_uri } });
  },
  // Faciendum (skeleton)
  fac_listBoards: (spaceId: string) => request(`/user/spaces/${encodeURIComponent(spaceId)}/faciendum/boards`, { auth: true }),
  fac_createBoard: (spaceId: string, p: { name: string }) => request(`/user/spaces/${encodeURIComponent(spaceId)}/faciendum/boards`, { method: 'POST', auth: true, body: p }),
  // Automata (skeleton)
  aut_listKeys: (p: { space_hash: string; space_id: string | number }) => request(`/user/spaces/${encodeURIComponent(p.space_hash)}/automata/keys?space_id=${encodeURIComponent(String(p.space_id))}`, { auth: true }),
  aut_createKey: (p: { space_hash: string; space_id: string | number; provider: string; name: string; api_key: string }) => request(`/user/spaces/${encodeURIComponent(p.space_hash)}/automata/keys?space_id=${encodeURIComponent(String(p.space_id))}`, { method: 'POST', auth: true, body: { provider: p.provider, name: p.name, api_key: p.api_key } }),
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

async function fillSpacesSelect(selectEl: HTMLSelectElement) {
  selectEl.disabled = true;
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione um espaço…';
  selectEl.append(placeholder);
  try {
    const data: any = await api.listSpaces();
    const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
    for (const it of list) {
      const hash = (it?.hash ?? it?.space_hash ?? '');
      const legacyId = (it?.id ?? it?.space_id ?? '');
      const name = (it?.name ?? String(hash || legacyId));
      if (!hash) continue;
      const opt = document.createElement('option');
      opt.value = String(hash);
      opt.textContent = legacyId ? `${name} (${hash})` : `${name} (${hash})`;
      if (legacyId) (opt as any).dataset.id = String(legacyId);
      selectEl.append(opt);
    }
  } catch {
    const errOpt = document.createElement('option');
    errOpt.value = '';
    errOpt.textContent = 'Falha ao carregar espaços (faça login)';
    selectEl.append(errOpt);
  } finally {
    selectEl.disabled = false;
  }
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
    { id: 'faciendum', label: 'Faciendum' },
    { id: 'automata', label: 'Automata' },
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
  const verifyDesc = el('div', 'text-body-secondary', 'Esta função ativa a conta do usuário usando o código de verificação recebido por e‑mail e a senha atual definida no cadastro.');
  const verifyBlock = el('div');
  verifyBlock.append(verifyDesc, verifyForm);
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
  verifyPane.append(section('Verificar (código + senha)', verifyBlock), section('Reenviar Código', resendForm), section('Request', verifyReqOut), section('Response', verifyRespOut));

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
    const redirect_uri = window.location.origin;
    recReqOut.replaceChildren(jsonPre({ url: '/api/user/auth/password-recovery', body: { email, redirect_uri } }));
    try { const resp = await api.recovery({ email, redirect_uri }); recRespOut.replaceChildren(alert('success', 'Se existir, e-mail enviado'), jsonPre(resp)); }
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
  const spDesc = el('div', 'text-body-secondary', 'UsersSpaces são espaços de trabalho do usuário onde as tools (Faciendum, Automata, etc.) operam. Cada espaço tem um identificador e um proprietário. Crie um espaço e, em seguida, utilize-o nas ferramentas.');
  const spWrap = el('div'); spWrap.append(spDesc, spActions);
  spPane.append(section('UsersSpaces', spWrap), section('Request', spReqOut), section('Response', spRespOut));

  // Faciendum Pane (skeleton)
  const facPane = el('div', 'tab-pane fade');
  facPane.id = 'pane-faciendum';
  const facForm = el('form', 'row g-2 align-items-end');
  facForm.innerHTML = `
    <div class="col-md-3"><label class="form-label">UsersSpace</label><select name="space_id" class="form-select" required></select></div>
    <div class="col-md-4"><label class="form-label">Nome do Board</label><input name="board_name" class="form-control"></div>
    <div class="col-md-5 d-flex gap-2"><button class="btn btn-outline-secondary" type="button" id="btn-fac-list">Listar Boards</button><button class="btn btn-primary" type="submit">Criar Board</button></div>
  `;
  const facReqOut = el('div');
  const facRespOut = el('div');
  const facSpaceSel = facForm.querySelector('select[name="space_id"]') as HTMLSelectElement;
  fillSpacesSelect(facSpaceSel);
  facForm.querySelector('#btn-fac-list')!.addEventListener('click', async () => {
    const fd = new FormData(facForm as HTMLFormElement);
    const space_id = String(fd.get('space_id') || '');
    if (!space_id) { facRespOut.replaceChildren(alert('danger', 'Selecione um UsersSpace')); return; }
    facReqOut.replaceChildren(jsonPre({ url: `/api/user/spaces/${space_id}/faciendum/boards`, method: 'GET', auth: true }));
    try { const data = await api.fac_listBoards(space_id); facRespOut.replaceChildren(alert('success', 'Boards listados'), jsonPre(data)); }
    catch (err) { facRespOut.replaceChildren(alert('danger', 'Falha ao listar boards'), jsonPre(err)); }
  });
  facForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(facForm as HTMLFormElement);
    const space_id = String(fd.get('space_id') || '');
    const name = String(fd.get('board_name') || '');
    if (!space_id || !name) { facRespOut.replaceChildren(alert('danger', 'Selecione um UsersSpace e informe o Nome do Board')); return; }
    facReqOut.replaceChildren(jsonPre({ url: `/api/user/spaces/${space_id}/faciendum/boards`, method: 'POST', auth: true, body: { name } }));
    try { const data = await api.fac_createBoard(space_id, { name }); facRespOut.replaceChildren(alert('success', 'Board criado'), jsonPre(data)); }
    catch (err) { facRespOut.replaceChildren(alert('danger', 'Falha ao criar board'), jsonPre(err)); }
  });
  const facDesc = el('div', 'text-body-secondary', 'Faciendum é a ferramenta de Kanban/To‑Do por UsersSpace. Organiza trabalho em Boards (quadros), Tracks (colunas) e Tasks (tarefas) com movimentação entre colunas.');
  facPane.append(section('Faciendum – Boards', (() => { const wrap = el('div'); wrap.append(facDesc, facForm); return wrap; })()), section('Request', facReqOut), section('Response', facRespOut));

  // Automata Pane (skeleton)
  const autPane = el('div', 'tab-pane fade');
  autPane.id = 'pane-automata';
  // Automata – Chats (list/create)
  const autChatsForm = el('form', 'row g-2 align-items-end');
  autChatsForm.innerHTML = `
    <div class="col-md-3"><label class="form-label">UsersSpace</label><select name="space_id" class="form-select" required></select></div>
    <div class="col-md-2"><label class="form-label">Prompt ID</label><input name="prompt_id" type="number" class="form-control" required></div>
    <div class="col-md-5"><label class="form-label">Mensagem</label><input name="message" class="form-control" required></div>
    <div class="col-md-2 d-flex gap-2"><button class="btn btn-outline-secondary" type="button" id="btn-autch-list">Listar Chats</button><button class="btn btn-primary" type="submit">Criar Chat</button></div>
  `;
  const autChatsReqOut = el('div');
  const autChatsRespOut = el('div');
  const autChatsSpaceSel = autChatsForm.querySelector('select[name="space_id"]') as HTMLSelectElement;
  fillSpacesSelect(autChatsSpaceSel);
  // API helpers for chats
  (api as any).aut_listChats = (p: { space_hash: string; space_id: string | number }) => request(`/user/spaces/${encodeURIComponent(p.space_hash)}/automata/chats?space_id=${encodeURIComponent(String(p.space_id))}`, { auth: true });
  (api as any).aut_createChat = (p: { space_hash: string; space_id: string | number; prompt_id: number; message: string }) => request(`/user/spaces/${encodeURIComponent(p.space_hash)}/automata/chats?space_id=${encodeURIComponent(String(p.space_id))}`, { method: 'POST', auth: true, body: { prompt_id: p.prompt_id, message: p.message } });
  autChatsForm.querySelector('#btn-autch-list')!.addEventListener('click', async () => {
    const fd = new FormData(autChatsForm as HTMLFormElement);
    const space_hash = String(fd.get('space_id') || '');
    const space_id = (autChatsSpaceSel.selectedOptions[0] as any)?.dataset?.id || '';
    if (!space_hash || !space_id) { autChatsRespOut.replaceChildren(alert('danger', 'Selecione um UsersSpace válido')); return; }
    autChatsReqOut.replaceChildren(jsonPre({ url: `/api/user/spaces/${space_hash}/automata/chats?space_id=${space_id}`, method: 'GET', auth: true }));
    try { const data = await (api as any).aut_listChats({ space_hash, space_id }); autChatsRespOut.replaceChildren(alert('success', 'Chats listados'), jsonPre(data)); }
    catch (err) { autChatsRespOut.replaceChildren(alert('danger', 'Falha ao listar chats'), jsonPre(err)); }
  });
  autChatsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(autChatsForm as HTMLFormElement);
    const space_hash = String(fd.get('space_id') || '');
    const space_id = (autChatsSpaceSel.selectedOptions[0] as any)?.dataset?.id || '';
    const prompt_id = Number(fd.get('prompt_id') || 0);
    const message = String(fd.get('message') || '').trim();
    if (!space_hash || !space_id || !prompt_id || !message) { autChatsRespOut.replaceChildren(alert('danger', 'Selecione um UsersSpace e informe Prompt ID e Mensagem')); return; }
    autChatsReqOut.replaceChildren(jsonPre({ url: `/api/user/spaces/${space_hash}/automata/chats?space_id=${space_id}`, method: 'POST', auth: true, body: { prompt_id, message } }));
    try { const data = await (api as any).aut_createChat({ space_hash, space_id, prompt_id, message }); autChatsRespOut.replaceChildren(alert('success', 'Chat criado'), jsonPre(data)); }
    catch (err) { autChatsRespOut.replaceChildren(alert('danger', 'Falha ao criar chat'), jsonPre(err)); }
  });
  const autForm = el('form', 'row g-2 align-items-end');
  autForm.innerHTML = `
    <div class="col-md-3"><label class="form-label">UsersSpace</label><select name="space_id" class="form-select" required></select></div>
    <div class="col-md-3"><label class="form-label">Provider</label>
      <select name="provider" class="form-select" required>
        <option value="">Selecione…</option>
        <option value="openai">openai</option>
        <option value="gemini">gemini</option>
        <option value="grok">grok</option>
      </select>
    </div>
    <div class="col-md-3"><label class="form-label">Nome da Key</label><input name="key_name" class="form-control" required></div>
    <div class="col-md-3"><label class="form-label">API Key</label><input name="api_key" class="form-control" required></div>
    <div class="col-12 d-flex gap-2"><button class="btn btn-outline-secondary" type="button" id="btn-aut-list">Listar Keys</button><button class="btn btn-primary" type="submit">Criar Key</button></div>
  `;
  const autReqOut = el('div');
  const autRespOut = el('div');
  const autSpaceSel = autForm.querySelector('select[name="space_id"]') as HTMLSelectElement;
  fillSpacesSelect(autSpaceSel);
  autForm.querySelector('#btn-aut-list')!.addEventListener('click', async () => {
    const fd = new FormData(autForm as HTMLFormElement);
    const space_hash = String(fd.get('space_id') || '');
    const space_id = (autSpaceSel.selectedOptions[0] as any)?.dataset?.id || '';
    if (!space_hash || !space_id) { autRespOut.replaceChildren(alert('danger', 'Selecione um UsersSpace')); return; }
    autReqOut.replaceChildren(jsonPre({ url: `/api/user/spaces/${space_hash}/automata/keys?space_id=${space_id}`, method: 'GET', auth: true }));
    try { const data = await api.aut_listKeys({ space_hash, space_id }); autRespOut.replaceChildren(alert('success', 'Keys listadas'), jsonPre(data)); }
    catch (err) { autRespOut.replaceChildren(alert('danger', 'Falha ao listar keys'), jsonPre(err)); }
  });
  autForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(autForm as HTMLFormElement);
    const space_hash = String((fd.get('space_id') || '').toString().trim());
    const space_id = (autSpaceSel.selectedOptions[0] as any)?.dataset?.id || '';
    const provider = String((fd.get('provider') || '').toString().trim());
    const name = String((fd.get('key_name') || '').toString().trim());
    const api_key = String((fd.get('api_key') || '').toString().trim());
    if (!space_hash || !space_id || !provider || !name || !api_key) { autRespOut.replaceChildren(alert('danger', 'Selecione um UsersSpace e informe Provider, Nome e API Key')); return; }
    if (api_key === '***' || api_key.length < 8) { autRespOut.replaceChildren(alert('danger', 'Informe uma API Key válida (não use ***).')); return; }
    autReqOut.replaceChildren(jsonPre({ url: `/api/user/spaces/${space_hash}/automata/keys?space_id=${space_id}`, method: 'POST', auth: true, body: { provider, name, api_key: '***' } }));
    try { const data = await api.aut_createKey({ space_hash, space_id, provider, name, api_key }); autRespOut.replaceChildren(alert('success', 'Key criada'), jsonPre(data)); }
    catch (err) { autRespOut.replaceChildren(alert('danger', 'Falha ao criar key'), jsonPre(err)); }
  });
  const autDesc = el('div', 'text-body-secondary', 'Automata é o estúdio de agentes por UsersSpace: gerencia chaves de API, prompts reutilizáveis e chats. Requer estar logado e com UsersSpace selecionado.');
  // Ordem: Keys primeiro, depois Chats
  autPane.append(
    section('Automata – Keys', (() => { const wrap = el('div'); wrap.append(autDesc, autForm); return wrap; })()),
    section('Request', autReqOut),
    section('Response', autRespOut),
    section('Automata – Chats', autChatsForm),
    section('Request', autChatsReqOut),
    section('Response', autChatsRespOut)
  );

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

  panes.append(loginPane, signupPane, verifyPane, recPane, spPane, facPane, autPane);
  // Recarrega lista de espaços quando abas são abertas
  document.getElementById('tab-faciendum')?.addEventListener('click', () => fillSpacesSelect(facSpaceSel));
  document.getElementById('tab-automata')?.addEventListener('click', () => { fillSpacesSelect(autSpaceSel); fillSpacesSelect(autChatsSpaceSel); });
  app.append(panes);
  updateLoginStatus();
}

buildUI();
