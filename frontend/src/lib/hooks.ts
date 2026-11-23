import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

type Params = Record<string, string | number | boolean | undefined | null>;

/** Charge une ressource GET et expose { data, loading, error, reload }. */
export function useFetch<T>(path: string | null, params?: Params) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([path, params]);
  const seq = useRef(0);

  const load = useCallback(() => {
    if (path === null) { setData(null); setLoading(false); return; }
    const n = ++seq.current;
    setLoading(true);
    api.get<T>(path, params)
      .then((d) => { if (n === seq.current) { setData(d); setError(null); } })
      .catch((e) => { if (n === seq.current) setError(errorMessage(e)); })
      .finally(() => { if (n === seq.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

/** Valeur "retardée" (recherche en direct sans appeler l'API à chaque frappe). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
