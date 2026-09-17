import type { Api, Source } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export const TOKEN_KEY = 'es-token';

function token() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const corpo = await res.json().catch(() => ({}));
    throw new Error((corpo as any).message ?? `Falha na requisição (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api: Api = {
  login: (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (input) => req('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  forgotPassword: (email) => req('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (t, password) => req('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: t, password }) }),
  listNorms: (source?: Source | 'todas') => req(`/norms${source && source !== 'todas' ? `?source=${source}` : ''}`),
  getNorm: (id) => req(`/norms/${id}`),
  getPlant: () => req('/plants/me'),
  updatePlant: (patch) => req('/plants/me', { method: 'PUT', body: JSON.stringify(patch) }),
  listAlerts: () => req('/alerts'),
  ask: (question) => req('/copilot/ask', { method: 'POST', body: JSON.stringify({ question }) }),
};
