import { useRef, useState, type FormEvent } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import type { TypeAbonnement } from '../lib/types';
import { currency, fmtMoney, nn } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { ActifBadge, Async, Button, Card, Field, FormError, Modal, PageHeader, TableWrap } from '../components/ui';

function TypeModal({ type, onClose, onSaved }: { type?: TypeAbonnement; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ libelle: type?.libelle ?? '', duree_jours: String(type?.duree_jours ?? 30), prix: String(type?.prix ?? ''), description: type?.description ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const d = Number(f.duree_jours), p = Number(f.prix.replace(',', '.'));
    if (!f.libelle.trim() || !Number.isInteger(d) || d < 1 || !Number.isFinite(p) || p < 0 || f.prix.trim() === '') { setErr('Libellé, durée (≥ 1 jour entier) et prix (≥ 0) sont obligatoires.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      const body = { libelle: f.libelle.trim(), duree_jours: d, prix: p, description: nn(f.description) };
      if (type) await api.put(`/types-abonnement/${type.id}`, body); else await api.post('/types-abonnement', body);
      toast.success('Type enregistré.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); lock.current = false; setBusy(false); }
  }
  return (
    <Modal title={type ? "Modifier le type d'abonnement" : "Nouveau type d'abonnement"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <Field label="Libellé" required><input className="input" value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} autoFocus /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Durée (jours)" required><input className="input" type="number" min={1} value={f.duree_jours} onChange={(e) => setF({ ...f, duree_jours: e.target.value })} /></Field>
          <Field label={`Prix (${currency})`} required hint="Un changement de prix n'affecte pas les abonnements existants."><input className="input" inputMode="decimal" value={f.prix} onChange={(e) => setF({ ...f, prix: e.target.value })} /></Field>
        </div>
        <Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer</Button></div>
      </form>
    </Modal>
  );
}

export default function TypesAbonnement() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<TypeAbonnement[]>('/types-abonnement');
  const [modal, setModal] = useState<{ type?: TypeAbonnement } | null>(null);
  async function toggle(t: TypeAbonnement) {
    try {
      if (t.actif) await api.del(`/types-abonnement/${t.id}`); else await api.put(`/types-abonnement/${t.id}`, { actif: true });
      toast.success(t.actif ? 'Type désactivé.' : 'Type réactivé.'); reload();
    } catch (e) { toast.error(errorMessage(e)); }
  }
  return (
    <>
      <PageHeader title="Types d'abonnement" subtitle="Offres proposées : durée et prix appliqués aux nouveaux abonnements." actions={<Button onClick={() => setModal({})}><Plus className="h-4 w-4" />Nouveau type</Button>} />
      <Card>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length}>
          <TableWrap>
            <thead><tr><th className="th">Libellé</th><th className="th">Durée</th><th className="th">Prix</th><th className="th">Statut</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((t) => (
                <tr key={t.id}>
                  <td className="td font-medium">{t.libelle}<p className="text-xs font-normal text-slate-500">{t.description}</p></td>
                  <td className="td">{t.duree_jours} jours</td><td className="td">{fmtMoney(t.prix)}</td><td className="td"><ActifBadge actif={t.actif} /></td>
                  <td className="td"><div className="flex justify-end gap-1">
                    <button title="Modifier" onClick={() => setModal({ type: t })} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                    <button title={t.actif ? 'Désactiver' : 'Réactiver'} onClick={() => toggle(t)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Power className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
      {modal && <TypeModal type={modal.type} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
    </>
  );
}
