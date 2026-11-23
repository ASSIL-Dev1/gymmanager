import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api';
import type { Utilisateur } from '../lib/types';

interface AuthState {
  user: Utilisateur | null;
  loading: boolean;
  login: (identifiant: string, mot_de_passe: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tokenStore.get());

  const clear = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  // Au chargement : si un token existe, on le fait vérifier par le serveur (F03).
  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (!tokenStore.get()) return;
    api.get<Utilisateur>('/auth/me').then(setUser).catch(clear).finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (identifiant: string, mot_de_passe: string) => {
    const r = await api.post<{ token: string; utilisateur: Utilisateur }>('/auth/login', { identifiant, mot_de_passe });
    tokenStore.set(r.token);
    setUser(r.utilisateur);
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => undefined);
    clear();
  }, [clear]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
