import { useRef, useState, type FormEvent } from 'react';
import { Award, Pencil, Plus, Power } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import type { Employe } from '../lib/types';
import { fmtDate, nn } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { ActifBadge, Async, Badge, Button, Card, Field, FormError, Modal, PageHeader, TableWrap } from '../components/ui';

function EmployeModal({ employe, onClose, onSaved }: { employe?: Employe; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ nom: employe?.nom ?? '', prenom: employe?.prenom ?? '', poste: employe?.poste ?? '', telephone: employe?.telephone ?? '', email: employe?.email ?? '', date_embauche: employe?.date_embauche ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    if (!f.nom.trim() || !f.prenom.trim() || !f.poste.trim()) { setErr('Nom, prénom et poste sont obligatoires.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      const body = { nom: f.nom.trim(), prenom: f.prenom.trim(), poste: f.poste.trim(), telephone: nn(f.telephone), email: nn(f.email), date_embauche: nn(f.date_embauche) };
      if (employe) await api.put(`/employes/${employe.id}`, body); else await api.post('/employes', body);
      toast.success('Employé enregistré.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); lock.current = false; setBusy(false); }
  }
  return (
    <Modal title={employe ? "Modifier l'employé" : 'Nouvel employé'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required><input className="input" value={f.nom} onChange={set('nom')} autoFocus /></Field>
          <Field label="Prénom" required><input className="input" value={f.prenom} onChange={set('prenom')} /></Field>
          <Field label="Poste" required><input className="input" value={f.poste} onChange={set('poste')} /></Field>
          <Field label="Date d'embauche"><input className="input" type="date" value={f.date_embauche} onChange={set('date_embauche')} /></Field>
          <Field label="Téléphone"><input className="input" value={f.telephone} onChange={set('telephone')} /></Field>
          <Field label="Courriel"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer</Button></div>
      </form>
    </Modal>
  );
}

function CoachModal({ employe, onClose, onSaved }: { employe: Employe; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [specialite, setSpecialite] = useState(employe.specialite ?? '');
  const [certification, setCertification] = useState(employe.certification ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!specialite.trim()) { setErr('La spécialité est obligatoire.'); return; }
    setBusy(true); setErr(null);
    try {
      if (employe.est_coach) await api.put(`/coachs/${employe.id}`, { specialite: specialite.trim(), certification: nn(certification) });
      else await api.post('/coachs', { employe_id: employe.id, specialite: specialite.trim(), certification: nn(certification) });
      toast.success('Profil coach enregistré.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); setBusy(false); }
  }
  return (
    <Modal title={`Profil coach · ${employe.prenom} ${employe.nom}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <Field label="Spécialité" required><input className="input" value={specialite} onChange={(e) => setSpecialite(e.target.value)} autoFocus /></Field>
        <Field label="Certification"><input className="input" value={certification} onChange={(e) => setCertification(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer</Button></div>
      </form>
    </Modal>
  );
}

export default function Personnel() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Employe[]>('/employes', { limit: 500 });
  const [form, setForm] = useState<{ employe?: Employe } | null>(null);
  const [coach, setCoach] = useState<Employe | null>(null);
  async function toggle(e: Employe) {
    try { if (e.actif) await api.del(`/employes/${e.id}`); else await api.put(`/employes/${e.id}`, { actif: true }); toast.success(e.actif ? 'Employé désactivé.' : 'Employé réactivé.'); reload(); }
    catch (x) { toast.error(errorMessage(x)); }
  }
  return (
    <>
      <PageHeader title="Personnel & coachs" subtitle="Un coach est obligatoirement un employé." actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Nouvel employé</Button>} />
      <Card>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucun employé.">
          <TableWrap>
            <thead><tr><th className="th">Employé</th><th className="th">Poste</th><th className="th">Contact</th><th className="th">Embauche</th><th className="th">Statut</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{e.prenom} {e.nom} {e.est_coach && <Badge value="COURS" text={`Coach · ${e.specialite}`} />}</td>
                  <td className="td">{e.poste}</td><td className="td">{e.telephone ?? '—'}<p className="text-xs text-slate-500">{e.email}</p></td><td className="td">{fmtDate(e.date_embauche)}</td><td className="td"><ActifBadge actif={e.actif} /></td>
                  <td className="td"><div className="flex justify-end gap-1">
                    <button title="Profil coach" onClick={() => setCoach(e)} className="rounded p-2 text-violet-600 hover:bg-violet-50"><Award className="h-4 w-4" /></button>
                    <button title="Modifier" onClick={() => setForm({ employe: e })} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                    <button title={e.actif ? 'Désactiver' : 'Réactiver'} onClick={() => toggle(e)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Power className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
      {form && <EmployeModal employe={form.employe} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {coach && <CoachModal employe={coach} onClose={() => setCoach(null)} onSaved={() => { setCoach(null); reload(); }} />}
    </>
  );
}
