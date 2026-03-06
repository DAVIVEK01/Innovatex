// ============================================================
//  CampusEats — api.js
//  Centralised API client for all frontend pages.
//  Every fetch call goes through here.
// ============================================================

const API_BASE = '/api';

/* ── Token storage ── */
const Auth = {
  getToken()         { return localStorage.getItem('ce_jwt'); },
  setToken(t)        { localStorage.setItem('ce_jwt', t); },
  clearToken()       { localStorage.removeItem('ce_jwt'); },
  getUser()          { try { return JSON.parse(localStorage.getItem('ce_user')); } catch { return null; } },
  setUser(u)         { localStorage.setItem('ce_user', JSON.stringify(u)); },
  clearUser()        { localStorage.removeItem('ce_user'); },
  clear()            { this.clearToken(); this.clearUser(); },
  isLoggedIn()       { return !!this.getToken() && !!this.getUser(); },
  isStaff()          { return this.getUser()?.type === 'canteen'; },
  isStudent()        { return this.getUser()?.type === 'student'; },
};

/* ── Cart (still in localStorage — it's device-local, that's fine) ── */
const Cart = {
  _key: 'ce_cart',
  get()           { try { return JSON.parse(localStorage.getItem(this._key)) || {}; } catch { return {}; } },
  set(c)          { localStorage.setItem(this._key, JSON.stringify(c)); },
  clear()         { localStorage.setItem(this._key, '{}'); },
  add(id, delta=1){ const c=this.get(); c[id]=(c[id]||0)+delta; if(c[id]<=0) delete c[id]; this.set(c); return c; },
  remove(id)      { const c=this.get(); delete c[id]; this.set(c); return c; },
  count()         { return Object.values(this.get()).reduce((s,q)=>s+q,0); },

  getItemsArray(menu) {
    return Object.entries(this.get()).map(([id, qty]) => {
      const item = menu.find(m => m.id == id);
      return item ? { ...item, qty } : null;
    }).filter(Boolean);
  },

  subtotal(menu)  { return this.getItemsArray(menu).reduce((s,it)=>s+(it.price*it.qty),0); },
  tax(menu)       { return Math.round(this.subtotal(menu) * (window.CE_CONFIG?.taxRate || 0.05) * 100) / 100; },
  total(menu)     { return this.subtotal(menu) + this.tax(menu); },

  maxPrepTime(menu) {
    const items = this.getItemsArray(menu);
    return items.length ? Math.max(...items.map(it=>it.prep_time)) : 0;
  },
};

/* ── Raw fetch helper ── */
async function apiFetch(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(Auth.getToken() ? { Authorization: 'Bearer ' + Auth.getToken() } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/* ── API Methods ── */
const API = {
  // Auth
  login(roll, password)      { return apiFetch('POST', '/auth/login', { roll, password }); },
  register(roll, name, email, password) { return apiFetch('POST', '/auth/register', { roll, name, email, password }); },
  me()                       { return apiFetch('GET', '/auth/me'); },

  // Menu
  getMenu()                  { return apiFetch('GET', '/menu'); },
  getSettings()              { return apiFetch('GET', '/menu/settings'); },
  toggleItem(id)             { return apiFetch('PATCH', `/menu/${id}/toggle`); },
  updateItem(id, data)       { return apiFetch('PATCH', `/menu/${id}`, data); },
  updateSettings(data)       { return apiFetch('PATCH', '/menu/settings', data); },

  // Orders
  placeOrder(items, payMethod, instructions) { return apiFetch('POST', '/orders', { items, payMethod, instructions }); },
  getMyOrders()              { return apiFetch('GET', '/orders/my'); },
  getOrder(token)            { return apiFetch('GET', `/orders/${token}`); },
  getActiveOrders()          { return apiFetch('GET', '/orders'); },
  getTodaysOrders()          { return apiFetch('GET', '/orders/today'); },
  getQueue()                 { return apiFetch('GET', '/orders/queue'); },
  setOrderStatus(token, status) { return apiFetch('PATCH', `/orders/${token}/status`, { status }); },
};

/* ── Socket.io real-time client ── */
let _socket = null;

function connectSocket(handlers = {}) {
  const token = Auth.getToken();
  if (!token || _socket?.connected) return;

  // Socket.io is loaded from CDN in each HTML page
  _socket = io({ auth: { token } });

  _socket.on('connect',         ()    => console.log('[Socket] Connected'));
  _socket.on('disconnect',      ()    => console.log('[Socket] Disconnected'));
  _socket.on('connect_error',   (err) => console.warn('[Socket] Error:', err.message));
  _socket.on('order:new',       (d)   => handlers.onOrderNew?.(d.order));
  _socket.on('order:updated',   (d)   => handlers.onOrderUpdated?.(d.order));
  _socket.on('menu:updated',    (d)   => handlers.onMenuUpdated?.(d.item));
  _socket.on('settings:updated',(d)   => handlers.onSettingsUpdated?.(d));

  return _socket;
}

function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}

/* ── Auth guards for page load ── */
function pageRequireStudent() {
  if (!Auth.isLoggedIn() || !Auth.isStudent()) {
    window.location.href = '/index.html';
    return null;
  }
  return Auth.getUser();
}

function pageRequireStaff() {
  if (!Auth.isLoggedIn() || !Auth.isStaff()) {
    window.location.href = '/index.html';
    return null;
  }
  return Auth.getUser();
}

/* ── Config (loaded from settings API) ── */
window.CE_CONFIG = {
  taxRate: 0.05,
  pickupCounter: 'Counter 2, Ground Floor',
  collegeName: 'Your College',
  canteenName: 'CampusEats',
};

async function loadConfig() {
  try {
    const { settings } = await API.getSettings();
    window.CE_CONFIG = {
      taxRate:       parseFloat(settings.tax_rate) || 0.05,
      pickupCounter: settings.pickup_counter || 'Counter 2, Ground Floor',
      collegeName:   settings.college_name   || 'Your College',
      canteenName:   settings.canteen_name   || 'CampusEats',
      canteenOpen:   settings.canteen_open   !== 'false',
      todaysSpecial: settings.todays_special || '',
    };
  } catch (e) { /* use defaults */ }
}
