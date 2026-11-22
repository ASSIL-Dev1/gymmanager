
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { label } from '../lib/format';

/* ---------- Bouton ---------- */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-500/50',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  small?: boolean;
}

export function Button({
  variant = 'primary',
  loading,
  small,
  className = '',
  children,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed ${
        small ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Champs de formulaire ---------- */

export function Field({
  label: text,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {text}
        {required && <span className="text-red-500"> *</span>}
      </span>

      {children}

      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}

      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ---------- Modale & confirmation ---------- */

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        } rounded-xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-5">
        <div className="text-sm text-slate-600">{message}</div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Annuler
          </Button>

          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Mise en page ---------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Card({
  title,
  children,
  className = '',
  actions,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {actions}
        </div>
      )}

      {children}
    </section>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        {children}
      </table>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function Empty({ text = 'Aucun résultat.' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
      <Inbox className="h-8 w-8" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="m-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>

      {onRetry && (
        <Button small variant="secondary" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

/* Affiche spinner / erreur / vide / contenu selon l'état d'une requête. */

export function Async({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) return <Spinner />;

  if (error) {
    return <ErrorBox message={error} onRetry={onRetry} />;
  }

  if (empty) return <Empty text={emptyText} />;

  return <>{children}</>;
}

/* ---------- Badges de statut ---------- */

const tone: Record<string, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-700',
  DISPONIBLE: 'bg-emerald-100 text-emerald-700',
  CONFIRMEE: 'bg-emerald-100 text-emerald-700',
  TERMINEE: 'bg-emerald-100 text-emerald-700',
  RESOLUE: 'bg-emerald-100 text-emerald-700',
  TERMINE: 'bg-emerald-100 text-emerald-700',

  EXPIRE: 'bg-slate-200 text-slate-600',
  ANNULE: 'bg-slate-200 text-slate-600',
  ANNULEE: 'bg-slate-200 text-slate-600',
  HORS_SERVICE: 'bg-slate-200 text-slate-600',

  SUSPENDU: 'bg-amber-100 text-amber-700',
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  MOYENNE: 'bg-amber-100 text-amber-700',

  PLANIFIEE: 'bg-sky-100 text-sky-700',
  PROGRAMME: 'bg-sky-100 text-sky-700',

  EN_COURS: 'bg-blue-100 text-blue-700',
  EN_MAINTENANCE: 'bg-blue-100 text-blue-700',
  FAIBLE: 'bg-sky-100 text-sky-700',

  EN_PANNE: 'bg-red-100 text-red-700',
  OUVERTE: 'bg-red-100 text-red-700',
  URGENTE: 'bg-red-100 text-red-700',
  HAUTE: 'bg-orange-100 text-orange-700',
  MANQUANTE: 'bg-red-100 text-red-700',

  LIBRE: 'bg-slate-100 text-slate-600',
  COURS: 'bg-violet-100 text-violet-700',
};

export function Badge({
  value,
  text,
}: {
  value: string;
  text?: string;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        tone[value] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {text ?? label(value)}
    </span>
  );
}

export function ActifBadge({ actif }: { actif: boolean }) {
  return (
    <Badge
      value={actif ? 'ACTIF' : 'ANNULE'}
      text={actif ? 'Actif' : 'Désactivé'}
    />
  );
}

/* ---------- Select ---------- */

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  ...rest
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      {...rest}
      className={`input ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder !== undefined && (
        <option value="">{placeholder}</option>
      )}

      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export const enumOptions = (vals: string[]) =>
  vals.map((v) => ({
    value: v,
    label: label(v),
  }));
