import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Button, Field, FormError } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [identifiant, setIdentifiant] = useState('');
  const [mdp, setMdp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from || '/'} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!identifiant.trim() || !mdp) { setError('Renseignez votre identifiant et votre mot de passe.'); return; }
    setBusy(true); setError(null);
    try {
      await login(identifiant.trim(), mdp);
    } catch (err) {
      // Message générique (F01) : on ne révèle pas si c'est l'identifiant ou le mot de passe qui est faux.
      setError(err instanceof ApiError && err.status === 0 ? err.message : 'Identifiant ou mot de passe incorrect.');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
      <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white"><Dumbbell /></div>
          <h1 className="text-2xl font-bold">GymManager</h1>
          <p className="text-sm text-slate-500">Espace administrateur</p>
        </div>
        <FormError message={error} />
        <Field label="Identifiant" required>
          <input className="input" autoFocus autoComplete="username" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} />
        </Field>
        <Field label="Mot de passe" required>
          <input className="input" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
        </Field>
        <Button type="submit" loading={busy} className="w-full">Se connecter</Button>
      </form>
    </div>
  );
}
