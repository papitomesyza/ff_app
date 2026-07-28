const TOKEN_KEY = 'financial_flow_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('ffapp:unauthorized'));
    throw new ApiError('unauthorized', 401);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'request failed', res.status);
  return data;
}

export const api = {
  login: (passphrase) => request('/auth/login', { method: 'POST', body: JSON.stringify({ passphrase }) }),
  changePassphrase: (currentPassphrase, newPassphrase) =>
    request('/auth/change-passphrase', { method: 'POST', body: JSON.stringify({ currentPassphrase, newPassphrase }) }),

  getTransactions: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transactions?${qs}`);
  },
  createTransaction: (tx) => request('/transactions', { method: 'POST', body: JSON.stringify(tx) }),
  updateTransaction: (id, tx) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(tx) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  getTargets: () => request('/targets'),
  setTargets: (targets) => request('/targets', { method: 'PUT', body: JSON.stringify(targets) }),

  getCategories: () => request('/categories'),
  addCategory: (category) => request('/categories', { method: 'POST', body: JSON.stringify(category) }),
  updateCategory: (id, category) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(category) }),
  deleteCategory: (id, { force = false } = {}) =>
    request(`/categories/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),

  // scope: 'week' | 'month' | 'year'; date is an optional YYYY-MM-DD anchor —
  // omit it to get the current period (computed server-side, Pristina time).
  getHistoryRange: (scope, date) => {
    const qs = new URLSearchParams({ scope, ...(date ? { date } : {}) }).toString();
    return request(`/history/range?${qs}`);
  },
};

export { ApiError };
