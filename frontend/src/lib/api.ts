import { useAuth } from './auth-store';

/**
 * Always same-origin. Next.js route handler proxies /api/v1/* to the Nest API.
 * Do not point this at localhost:4000 — that breaks remote browser access.
 */
const API = '/api/v1';

async function refreshTokens() {
  const { refreshToken, setSession, clear } = useAuth.getState();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clear();
    throw new Error('Session expired');
  }
  const data = await res.json();
  setSession(data.accessToken, data.refreshToken, data.user);
  return data.accessToken as string;
}

export async function api<T = unknown>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = useAuth.getState().accessToken;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401 && retry && useAuth.getState().refreshToken) {
    await refreshTokens();
    return api<T>(path, init, false);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return res as unknown as T;
}

export function downloadUrl(path: string) {
  return `${API}${path}`;
}

export async function downloadAuth(path: string, filename: string) {
  const token = useAuth.getState().accessToken;
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
