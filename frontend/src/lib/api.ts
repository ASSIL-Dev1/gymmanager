const BASE: string = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'gymmanager_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  details: string[];
  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

type Params = Record<string, string | number | boolean | undefined | null>;

async function request<T>(method: string, path: string, body?: unknown, params?: Params): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ''}`;
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur. Vérifiez que l'API est démarrée.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Session expirée / invalide : retour à la connexion (F03) – sauf sur l'écran de connexion lui-même.
    if (res.status === 401 && path !== '/auth/login') onUnauthorized?.();
    const details = Array.isArray(data?.details) ? data.details.map(String) : [];
    throw new ApiError(res.status, data?.erreur || `Erreur ${res.status}`, details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/** Message lisible pour l'utilisateur (sans détail technique, F24). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.details.length ? `${e.message} : ${e.details.join(' ; ')}` : e.message;
  return 'Une erreur inattendue est survenue.';
}
