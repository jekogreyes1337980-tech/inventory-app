const BASE = '/api/data';
const RESET_URL = '/api/reset';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export const api = {
  async get(key) {
    return request(`${BASE}/${key}`);
  },

  async set(key, value) {
    return request(`${BASE}/${key}`, {
      method: 'POST',
      body: JSON.stringify(value),
    });
  },

  async verify(username) {
    return request('/api/verify', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async reset() {
    return request(RESET_URL, { method: 'POST' });
  },

  async login(username, password) {
    return request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async register(username, password, role) {
    return request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  },

  async acquireLock(username, socketId) {
    return request('/api/lock', {
      method: 'POST',
      body: JSON.stringify({ username, socketId }),
    });
  },

  async renewLock(username, socketId) {
    return request('/api/lock/renew', {
      method: 'POST',
      body: JSON.stringify({ username, socketId }),
    });
  },

  async releaseLock(username) {
    return request('/api/lock/release', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async lockStatus() {
    return request('/api/lock/status');
  },
};
