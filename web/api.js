(() => {
  const STORAGE_KEY = 'users_front_config_v1';
  const TOKENS_KEY = 'users_front_tokens_v1';

  function loadConfig() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }
  function loadTokens() {
    try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}'); } catch { return {}; }
  }
  function saveTokens(t) { localStorage.setItem(TOKENS_KEY, JSON.stringify(t || {})); }
  function clearTokens() { localStorage.removeItem(TOKENS_KEY); }

  function getBaseURL() {
    const cfg = loadConfig();
    return cfg.baseURL || 'http://localhost:8080';
  }

  async function request(path, options = {}) {
    const base = getBaseURL();
    const url = path.startsWith('http') ? path : base.replace(/\/$/, '') + path;
    const tokens = loadTokens();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.auth && tokens.access_token) headers['Authorization'] = `Bearer ${tokens.access_token}`;

    const res = await fetch(url, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });
    let data = null;
    try { data = await res.json(); } catch { data = await res.text(); }
    if (!res.ok) {
      throw { status: res.status, data };
    }
    return data;
  }

  // API functions
  async function apiLogin({ username, password }) {
    return request('/user/auth/token', { method: 'POST', body: { username, password } });
  }
  async function apiRefresh(refresh_token) {
    return request('/user/auth/token/refresh', { method: 'POST', body: { refresh_token } });
  }
  async function apiVerify({ code, password }) {
    return request('/user/auth/verify', { method: 'POST', body: { code, password } });
  }
  function apiVerifyLinkURL({ login, code }) {
    const base = getBaseURL().replace(/\/$/, '');
    const p = new URL(base + '/user/auth/verify-link');
    p.searchParams.set('login', login);
    p.searchParams.set('code', code);
    return p.toString();
  }
  async function apiResendVerificationCode({ login }) {
    return request('/user/auth/verification-code', { method: 'POST', body: { login } });
  }
  async function apiPasswordRecovery({ email }) {
    return request('/user/auth/password-recovery', { method: 'POST', body: { email } });
  }
  async function apiListSpaces() {
    return request('/user/spaces', { method: 'GET', auth: true });
  }
  async function apiCreateSpace({ name }) {
    return request('/user/spaces', { method: 'POST', auth: true, body: { name } });
  }

  window.UsersFront = {
    loadConfig, saveConfig, getBaseURL,
    loadTokens, saveTokens, clearTokens,
    apiLogin, apiRefresh, apiVerify, apiVerifyLinkURL,
    apiResendVerificationCode, apiPasswordRecovery,
    apiListSpaces, apiCreateSpace,
  };
})();

