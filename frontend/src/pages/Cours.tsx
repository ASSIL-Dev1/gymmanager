import { useRef, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { ENUMS, type Adherent, type Coach, type Cours, type Inscription } from '../lib/types';
import { fmtDateTime, nn, toApiDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, ConfirmDialog, Empty, Field, FormError, Modal, PageHeader, Select, TableWrap, enumOptions } from '../components/ui';

const toLocal = (v?: string) => (v ? v.slice(0, 16) : '');

function CoursModal({ cours, onClose, onSaved }: { cours?: Cours; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const coachs = useFetch<Coach[]>('/coachs');
  const [f, setF] = useState({
    nom: cours?.nom ?? '', description: cours?.description ?? '', debut: toLocal(cours?.date_heure_debut), fin: toLocal(cours?.date_heure_fin),
    capacite: String(cours?.capacite_max ?? 15), salle: cours?.salle ?? '', coach: cours ? String(cours.coach_id) : '', statut: cours?.statut ?? 'PROGRAMME',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const cap = Number(f.capacite);
    if (!f.nom.trim() || !f.debut || !f.fin || !f.coach) { setErr('Nom, début, fin et coach sont obligatoires.'); return; }
    if (f.fin <= f.debut) { setErr('La fin doit être postérieure au début.'); return; }
    if (!Number.isInteger(cap) || cap < 1) { setErr('La capacité doit être un entier ≥ 1.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      const body = { nom: f.nom.trim(), description: nn(f.description), date_heure_debut: toApiDateTime(f.debut), date_heure_fin: toApiDateTime(f.fin), capacite_max: cap, salle: nn(f.salle), coach_id: Number(f.coach), statut: f.statut };
      if (cours) await api.put(`/cours/${cours.id}`, body); else await api.post('/cours', body);
      toast.success('Cours enregistré.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); lock.current = false; setBusy(false); }
  }
  return (
    <Modal title={cours ? 'Modifier le cours' : 'Nouveau cours'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required><input className="input" value={f.nom} onChange={set('nom')} autoFocus /></Field>
          <Field label="Coach" required><Select value={f.coach} onChange={(v) => setF({ ...f, coach: v })} placeholder="— Choisir —" options={(coachs.data ?? []).map((c) => ({ value: c.employe_id, label: `${c.prenom} ${c.nom} (${c.specialite})` }))} /></Field>
          <Field label="Début" required><input className="input" type="datetime-local" value={f.debut} onChange={set('debut')} /></Field>
          <Field label="Fin" required><input className="input" type="datetime-local" value={f.fin} onChange={set('fin')} /></Field>
          <Field label="Capacité max" required><input className="input" type="number" min={1} value={f.capacite} onChange={set('capacite')} /></Field>
          <Field label="Salle"><input className="input" value={f.salle} onChange={set('salle')} /></Field>
        </div>
        {cours && <Field label="Statut"><Select value={f.statut} onChange={(v) => setF({ ...f, statut: v as typeof f.statut })} options={enumOptions(ENUMS.statutCours)} /></Field>}
        <Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer</Button></div>
      </form>
    </Modal>
  );
}

function InscriptionsModal({ cours, onClose, onChanged }: { cours: Cours; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const insc = useFetch<Inscription[]>(`/cours/${cours.id}/inscriptions`);
  const adherents = useFetch<Adherent[]>('/adherents', { actif: 'true', limit: 500 });
  const [adh, setAdh] = useState('');
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!adh || busy) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/inscriptions', { adherent_id: Number(adh), cours_id: cours.id });
      toast.success(r.message); setAdh(''); insc.reload(); onChanged();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function cancel(i: Inscription) {
    try { await api.post(`/inscriptions/${i.id}/annuler`); toast.success('Inscription annulée.'); insc.reload(); onChanged(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  return (
    <Modal title={`Inscriptions · ${cours.nom}`} onClose={onClose} wide>
      <p className="mb-4 text-sm text-slate-500">{fmtDateTime(cours.date_heure_debut)} · {cours.nb_inscrits}/{cours.capacite_max} places confirmées. Si le cours est plein, l'inscription passe en liste d'attente.</p>
      {cours.statut === 'PROGRAMME' && (
        <div className="mb-4 flex gap-2">
          <div className="flex-1"><Select value={adh} onChange={setAdh} placeholder="Ajouter un adhérent…" options={(adherents.data ?? []).map((a) => ({ value: a.id, label: `${a.prenom} ${a.nom}` }))} /></div>
          <Button onClick={add} loading={busy} disabled={!adh}>Inscrire</Button>
        </div>
      )}
      <Async loading={insc.loading} error={insc.error} onRetry={insc.reload} empty={!insc.data?.length} emptyText="Aucune inscription.">
        <TableWrap><tbody className="divide-y divide-slate-100">
          {insc.data?.map((i) => (
            <tr key={i.id}><td className="td font-medium">{i.adherent_prenom} {i.adherent_nom}</td><td className="td"><Badge value={i.statut} /></td>
              <td className="td text-right">{i.statut !== 'ANNULEE' && <Button small variant="ghost" onClick={() => cancel(i)}>Annuler</Button>}</td></tr>
          ))}
        </tbody></TableWrap>
      </Async>
    </Modal>
  );
}

export default function CoursPage() {
  const toast = useToast();
  const [statut, setStatut] = useState('');
  const { data, loading, error, reload } = useFetch<Cours[]>('/cours', { statut, limit: 200 });
  const [form, setForm] = useState<{ cours?: Cours } | null>(null);
  const [insc, setInsc] = useState<Cours | null>(null);
  const [del, setDel] = useState<Cours | null>(null);
  async function remove() {
    if (!del) return;
    try { await api.del(`/cours/${del.id}`); toast.success('Cours supprimé.'); setDel(null); reload(); }
    catch (e) { toast.error(errorMessage(e)); setDel(null); }
  }
  return (
    <>
      <PageHeader title="Cours collectifs" subtitle="Planning, capacités et inscriptions." actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Nouveau cours</Button>} />
      <Card>
        <div className="border-b border-slate-100 p-4"><div className="w-48"><Select value={statut} onChange={setStatut} placeholder="Tous les statuts" options={enumOptions(ENUMS.statutCours)} /></div></div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucun cours.">
          <TableWrap>
            <thead><tr><th className="th">Cours</th><th className="th">Date</th><th className="th">Coach</th><th className="th">Salle</th><th className="th">Places</th><th className="th">Statut</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{c.nom}</td><td className="td">{fmtDateTime(c.date_heure_debut)}</td><td className="td">{c.coach_prenom} {c.coach_nom}</td><td className="td">{c.salle ?? '—'}</td>
                  <td className="td">{c.nb_inscrits}/{c.capacite_max}</td><td className="td"><Badge value={c.statut} /></td>
                  <td className="td"><div className="flex justify-end gap-1">
                    <button title="Inscriptions" onClick={() => setInsc(c)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Users className="h-4 w-4" /></button>
                    <button title="Modifier" onClick={() => setForm({ cours: c })} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                    <button title="Supprimer" onClick={() => setDel(c)} className="rounded p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
      {form && <CoursModal cours={form.cours} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {insc && <InscriptionsModal cours={insc} onClose={() => setInsc(null)} onChanged={reload} />}
      {del && <ConfirmDialog danger title="Supprimer ce cours ?" confirmLabel="Supprimer" message={<>Supprimer <strong>{del.nom}</strong> ? Refusé s'il existe un historique (inscriptions).</>} onCancel={() => setDel(null)} onConfirm={remove} />}
      {!data && !loading && !error && <Empty />}
    </>
  );
}
