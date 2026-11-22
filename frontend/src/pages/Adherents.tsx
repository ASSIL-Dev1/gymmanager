import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, UserX } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useDebounced, useFetch } from '../lib/hooks';
import type { Adherent } from '../lib/types';
import { fmtDate, nn } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { ActifBadge, Async, Badge, Button, Card, ConfirmDialog, Field, FormError, Modal, PageHeader, TableWrap } from '../components/ui';

const PHONE = /^[0-9 +\-()]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Formulaire d'ajout / modification d'un adhérent (F04, F06, RG01). */
export function AdherentFormModal({ adherent, onClose, onSaved }: { adherent?: Adherent; onClose: () => void; onSaved: (a: Adherent) => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    nom: adherent?.nom ?? '', prenom: adherent?.prenom ?? '', telephone: adherent?.telephone ?? '',
    email: adherent?.email ?? '', date_naissance: adherent?.date_naissance ?? '', adresse: adherent?.adresse ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  function validate() {
    const e: Record<string, string> = {};
    const nom = f.nom.trim(), prenom = f.prenom.trim(), tel = f.telephone.trim();
    if (!nom || nom.length > 80) e.nom = 'Le nom est obligatoire (1 à 80 caractères).';
    if (!prenom || prenom.length > 80) e.prenom = 'Le prénom est obligatoire (1 à 80 caractères).';
    if (!PHONE.test(tel)) e.telephone = 'Téléphone obligatoire : 6 à 20 caractères (chiffres, espaces, +, -, parenthèses).';
    if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = 'Format de courriel invalide.';
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (lock.current) return;
    const e = validate();
    setErrors(e); setServerError(null);
    if (Object.keys(e).length) return;
    lock.current = true; setBusy(true);
    const body = {
      nom: f.nom.trim(), prenom: f.prenom.trim(), telephone: f.telephone.trim(),
      email: nn(f.email), date_naissance: nn(f.date_naissance), adresse: nn(f.adresse),
    };
    try {
      const saved = adherent ? await api.put<Adherent>(`/adherents/${adherent.id}`, body) : await api.post<Adherent>('/adherents', body);
      toast.success(adherent ? 'Fiche adhérent mise à jour.' : 'Adhérent créé.');
      onSaved(saved);
    } catch (err) { setServerError(errorMessage(err)); lock.current = false; setBusy(false); }
  }

  return (
    <Modal title={adherent ? "Modifier l'adhérent" : 'Nouvel adhérent'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={serverError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required error={errors.nom}><input className={`input ${errors.nom ? 'input-error' : ''}`} value={f.nom} onChange={set('nom')} autoFocus /></Field>
          <Field label="Prénom" required error={errors.prenom}><input className={`input ${errors.prenom ? 'input-error' : ''}`} value={f.prenom} onChange={set('prenom')} /></Field>
        </div>
        <Field label="Téléphone" required error={errors.telephone}><input className={`input ${errors.telephone ? 'input-error' : ''}`} value={f.telephone} onChange={set('telephone')} inputMode="tel" /></Field>
        <Field label="Courriel" error={errors.email}><input className={`input ${errors.email ? 'input-error' : ''}`} type="email" value={f.email} onChange={set('email')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de naissance"><input className="input" type="date" value={f.date_naissance} max={new Date().toISOString().slice(0, 10)} onChange={set('date_naissance')} /></Field>
          <Field label="Adresse"><input className="input" value={f.adresse} onChange={set('adresse')} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button type="submit" loading={busy}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Adherents() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const dq = useDebounced(q.trim());
  const { data, loading, error, reload } = useFetch<Adherent[]>('/adherents', { q: dq, actif: showInactive ? undefined : 'true', limit: 500 });
  const [form, setForm] = useState<{ adherent?: Adherent } | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Adherent | null>(null);
  const [busy, setBusy] = useState(false);

  async function deactivate() {
    if (!toDeactivate) return;
    setBusy(true);
    try {
      await api.del(`/adherents/${toDeactivate.id}`);
      toast.success('Adhérent désactivé (historique conservé).');
      setToDeactivate(null); reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Adhérents" subtitle="Recherchez, consultez et gérez les fiches adhérents."
        actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Ajouter</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-4">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Rechercher par nom, prénom ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Recherche" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Afficher les désactivés
          </label>
          {q && <Button variant="ghost" small onClick={() => setQ('')}>Effacer le filtre</Button>}
        </div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText={dq ? `Aucun adhérent ne correspond à « ${dq} ».` : 'Aucun adhérent enregistré.'}>
          <TableWrap>
            <thead><tr><th className="th">Adhérent</th><th className="th">Téléphone</th><th className="th">Courriel</th><th className="th">Inscrit le</th><th className="th">Abonnement</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{a.prenom} {a.nom} {!a.actif && <ActifBadge actif={false} />}</td>
                  <td className="td">{a.telephone ?? '—'}</td><td className="td">{a.email ?? '—'}</td><td className="td">{fmtDate(a.date_inscription)}</td>
                  <td className="td"><Badge value={a.abonnement_valide ? 'ACTIF' : 'EXPIRE'} text={a.abonnement_valide ? 'Valide' : 'Aucun valide'} /></td>
                  <td className="td"><div className="flex justify-end gap-1">
                    <Link to={`/adherents/${a.id}`} title="Consulter" className="rounded p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></Link>
                    <button title="Modifier" onClick={() => setForm({ adherent: a })} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                    {a.actif && <button title="Désactiver" onClick={() => setToDeactivate(a)} className="rounded p-2 text-red-500 hover:bg-red-50"><UserX className="h-4 w-4" /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>

      {form && <AdherentFormModal adherent={form.adherent} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {toDeactivate && (
        <ConfirmDialog danger busy={busy} title="Désactiver cet adhérent ?" confirmLabel="Désactiver" onCancel={() => setToDeactivate(null)} onConfirm={deactivate}
          message={<>Voulez-vous désactiver <strong>{toDeactivate.prenom} {toDeactivate.nom}</strong> ? Pour préserver l'historique financier, la fiche, ses abonnements et ses paiements sont conservés ; l'adhérent ne pourra plus s'inscrire ni entrer.</>} />
      )}
    </>
  );
}
