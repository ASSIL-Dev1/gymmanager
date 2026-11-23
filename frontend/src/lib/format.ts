const CURRENCY: string = import.meta.env.VITE_CURRENCY || 'MAD';

/** Date affichée JJ/MM/AAAA (RG02). Accepte 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss' sans décalage de fuseau. */
export function fmtDate(v?: string | null): string {
  if (!v) return '—';
  const [y, m, d] = v.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
export function fmtDateTime(v?: string | null): string {
  if (!v) return '—';
  return `${fmtDate(v)} ${v.slice(11, 16)}`;
}
export function fmtMoney(n?: number | null): string {
  const x = Number(n ?? 0);
  return `${x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY}`;
}
export const currency = CURRENCY;

/** Date du jour au format YYYY-MM-DD (heure locale). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Valeur d'un input datetime-local pour l'instant présent. */
export function nowLocal(): string {
  return `${today()}T${new Date().toTimeString().slice(0, 5)}`;
}
export const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
export const fullName = (p?: string | null, n?: string | null) => `${p ?? ''} ${n ?? ''}`.trim();

/** Ajoute n jours à une date 'YYYY-MM-DD' (calcul en UTC : pas de décalage d'heure d'été). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** Chaîne vide -> null (le backend refuse les chaînes vides sur les champs facultatifs). */
export const nn = (s: string): string | null => (s.trim() === '' ? null : s.trim());
/** Convertit une valeur de datetime-local ('YYYY-MM-DDTHH:mm') en valeur acceptée par l'API. */
export const toApiDateTime = (s: string): string => (s.length === 16 ? `${s}:00` : s);
