import { useRef, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useDebounced, useFetch } from '../lib/hooks';
import { ENUMS, type Categorie, type EtatMachine, type Machine } from '../lib/types';
import { fmtDate, nn } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, ConfirmDialog, Field, FormError, Modal, PageHeader, Select, TableWrap, enumOptions } from '../components/ui';

function MachineModal({ machine, categories, onClose, onSaved }: { machine?: Machine; categories: Categorie[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ nom: machine?.nom ?? '', reference: machine?.reference ?? '', marque: machine?.marque ?? '', modele: machine?.modele ?? '', date_achat: machine?.date_achat ?? '', emplacement: machine?.emplacement ?? '', categorie: machine ? String(machine.categorie_id) : '', etat: machine?.etat ?? 'DISPONIBLE', observations: machine?.observations ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    if (!f.nom.trim() || !f.reference.trim() || !f.categorie) { setErr('Nom, référence et catégorie sont obligatoires.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      const body = { nom: f.nom.trim(), reference: f.reference.trim(), marque: nn(f.marque), modele: nn(f.modele), date_achat: nn(f.date_achat), emplacement: nn(f.emplacement), categorie_id: Number(f.categorie), observations: nn(f.observations), ...(machine ? {} : { etat: f.etat }) };
      if (machine) await api.put(`/machines/${machine.id}`, body); else await api.post('/machines', body);
      toast.success('Machine enregistrée.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); lock.current = false; setBusy(false); }
  }
  return (
    <Modal title={machine ? 'Modifier la machine' : 'Nouvelle machine'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required><input className="input" value={f.nom} onChange={set('nom')} autoFocus /></Field>
          <Field label="Référence" required><input className="input" value={f.reference} onChange={set('reference')} /></Field>
          <Field label="Catégorie" required><Select value={f.categorie} onChange={(v) => setF({ ...f, categorie: v })} placeholder="— Choisir —" options={categories.map((c) => ({ value: c.id, label: c.nom }))} /></Field>
          <Field label="Emplacement"><input className="input" value={f.emplacement} onChange={set('emplacement')} /></Field>
          <Field label="Marque"><input className="input" value={f.marque} onChange={set('marque')} /></Field>
          <Field label="Modèle"><input className="input" value={f.modele} onChange={set('modele')} /></Field>
          <Field label="Date d'achat"><input className="input" type="date" value={f.date_achat} onChange={set('date_achat')} /></Field>
          {!machine && <Field label="État initial"><Select value={f.etat} onChange={(v) => setF({ ...f, etat: v as EtatMachine })} options={enumOptions(ENUMS.etatMachine)} /></Field>}
        </div>
        <Field label="Observations"><textarea className="input" rows={2} value={f.observations} onChange={set('observations')} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer</Button></div>
      </form>
    </Modal>
  );
}

function CategoriesModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Categorie[]>('/categories-machines');
  const [nom, setNom] = useState('');
  async function add() {
    if (!nom.trim()) return;
    try { await api.post('/categories-machines', { nom: nom.trim() }); setNom(''); reload(); onChanged(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  async function remove(c: Categorie) {
    try { await api.del(`/categories-machines/${c.id}`); reload(); onChanged(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  return (
    <Modal title="Catégories de machines" onClose={onClose}>
      <div className="mb-4 flex gap-2"><input className="input" placeholder="Nouvelle catégorie" value={nom} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /><Button onClick={add}>Ajouter</Button></div>
      <Async loading={loading} error={error} onRetry={reload} empty={!data?.length}>
        <ul className="divide-y divide-slate-100">{data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm"><span>{c.nom} <span className="text-slate-400">({c.nb_machines} machine(s))</span></span>
            <button title="Supprimer" onClick={() => remove(c)} className="rounded p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></li>
        ))}</ul>
      </Async>
    </Modal>
  );
}

export default function Machines() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [etat, setEtat] = useState('');
  const [cat, setCat] = useState('');
  const dq = useDebounced(q.trim());
  const cats = useFetch<Categorie[]>('/categories-machines');
  const { data, loading, error, reload } = useFetch<Machine[]>('/machines', { q: dq, etat, categorie_id: cat, limit: 500 });
  const [form, setForm] = useState<{ machine?: Machine } | null>(null);
  const [showCats, setShowCats] = useState(false);
  const [del, setDel] = useState<Machine | null>(null);

  async function changeEtat(m: Machine, v: string) {
    try { await api.put(`/machines/${m.id}/etat`, { etat: v }); toast.success('État mis à jour.'); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  async function remove() {
    if (!del) return;
    try { await api.del(`/machines/${del.id}`); toast.success('Machine supprimée.'); reload(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setDel(null); }
  }

  return (
    <>
      <PageHeader title="Machines" subtitle="Parc d'équipements et état en temps réel."
        actions={<><Button variant="secondary" onClick={() => setShowCats(true)}><Tags className="h-4 w-4" />Catégories</Button><Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Nouvelle machine</Button></>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Nom, référence ou marque…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="w-44"><Select value={etat} onChange={setEtat} placeholder="Tous les états" options={enumOptions(ENUMS.etatMachine)} /></div>
          <div className="w-44"><Select value={cat} onChange={setCat} placeholder="Toutes catégories" options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.nom }))} /></div>
        </div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucune machine.">
          <TableWrap>
            <thead><tr><th className="th">Machine</th><th className="th">Catégorie</th><th className="th">Emplacement</th><th className="th">Achat</th><th className="th">État</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{m.nom}<p className="text-xs font-normal text-slate-500">{m.reference}{m.marque ? ` · ${m.marque}` : ''}</p></td>
                  <td className="td">{m.categorie_nom}</td><td className="td">{m.emplacement ?? '—'}</td><td className="td">{fmtDate(m.date_achat)}</td>
                  <td className="td"><div className="flex items-center gap-2"><Badge value={m.etat} />
                    {(m.etat === 'HORS_SERVICE' || m.etat === 'MANQUANTE' || m.etat === 'DISPONIBLE') && (
                      <select aria-label="Changer l'état" className="rounded border border-slate-200 bg-white py-1 text-xs" value="" onChange={(e) => e.target.value && changeEtat(m, e.target.value)}>
                        <option value="">Changer…</option>{['DISPONIBLE', 'HORS_SERVICE', 'MANQUANTE'].filter((x) => x !== m.etat).map((x) => <option key={x} value={x}>{x.replace('_', ' ').toLowerCase()}</option>)}
                      </select>)}
                  </div></td>
                  <td className="td"><div className="flex justify-end gap-1">
                    <button title="Modifier" onClick={() => setForm({ machine: m })} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                    <button title="Supprimer" onClick={() => setDel(m)} className="rounded p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
      {form && <MachineModal machine={form.machine} categories={cats.data ?? []} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {showCats && <CategoriesModal onClose={() => setShowCats(false)} onChanged={() => { cats.reload(); reload(); }} />}
      {del && <ConfirmDialog danger title="Supprimer cette machine ?" confirmLabel="Supprimer" message={<>Supprimer <strong>{del.nom}</strong> ? Refusé s'il existe un historique de pannes ou de maintenances.</>} onCancel={() => setDel(null)} onConfirm={remove} />}
    </>
  );
}
