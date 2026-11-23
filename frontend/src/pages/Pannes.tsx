import { useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { ENUMS, type Employe, type Machine, type Panne } from '../lib/types';
import { fmtDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, Field, FormError, Modal, PageHeader, Select, TableWrap, enumOptions } from '../components/ui';

function PanneModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const machines = useFetch<Machine[]>('/machines', { limit: 500 });
  const employes = useFetch<Employe[]>('/employes', { actif: 'true', limit: 500 });
  const [f, setF] = useState({ titre: '', description: '', priorite: 'MOYENNE', machine: '', declarant: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    if (!f.titre.trim() || !f.description.trim() || !f.machine || !f.declarant) { setErr('Titre, description, machine et déclarant sont obligatoires.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      await api.post('/pannes', { titre: f.titre.trim(), description: f.description.trim(), priorite: f.priorite, machine_id: Number(f.machine), declarant_id: Number(f.declarant) });
      toast.success('Panne déclarée.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); lock.current = false; setBusy(false); }
  }
  return (
    <Modal title="Déclarer une panne" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <Field label="Machine" required><Select value={f.machine} onChange={(v) => setF({ ...f, machine: v })} placeholder="— Choisir —" options={(machines.data ?? []).map((m) => ({ value: m.id, label: `${m.nom} (${m.reference})` }))} /></Field>
        <Field label="Déclarée par" required><Select value={f.declarant} onChange={(v) => setF({ ...f, declarant: v })} placeholder="— Employé —" options={(employes.data ?? []).map((m) => ({ value: m.id, label: `${m.prenom} ${m.nom}` }))} /></Field>
        <Field label="Titre" required><input className="input" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} /></Field>
        <Field label="Description" required><textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Priorité"><Select value={f.priorite} onChange={(v) => setF({ ...f, priorite: v })} options={enumOptions(ENUMS.prioritePanne)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Déclarer</Button></div>
      </form>
    </Modal>
  );
}

export default function Pannes() {
  const toast = useToast();
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const { data, loading, error, reload } = useFetch<Panne[]>('/pannes', { statut, priorite, limit: 300 });
  const [creating, setCreating] = useState(false);
  async function setStatus(p: Panne, s: string) {
    try { await api.put(`/pannes/${p.id}`, { statut: s }); toast.success('Statut mis à jour.'); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  return (
    <>
      <PageHeader title="Pannes" subtitle="L'état de la machine suit automatiquement le statut de la panne." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Déclarer une panne</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="w-44"><Select value={statut} onChange={setStatut} placeholder="Tous les statuts" options={enumOptions(ENUMS.statutPanne)} /></div>
          <div className="w-44"><Select value={priorite} onChange={setPriorite} placeholder="Toutes priorités" options={enumOptions(ENUMS.prioritePanne)} /></div>
        </div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucune panne.">
          <TableWrap>
            <thead><tr><th className="th">Panne</th><th className="th">Machine</th><th className="th">Déclarée</th><th className="th">Priorité</th><th className="th">Statut</th><th className="th text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{p.titre}<p className="max-w-xs truncate text-xs font-normal text-slate-500">{p.description}</p></td>
                  <td className="td">{p.machine_nom}</td><td className="td">{fmtDateTime(p.date_declaration)}<p className="text-xs text-slate-500">{p.declarant_prenom} {p.declarant_nom}</p></td>
                  <td className="td"><Badge value={p.priorite} /></td><td className="td"><Badge value={p.statut} /></td>
                  <td className="td text-right">{(p.statut === 'OUVERTE' || p.statut === 'EN_COURS') && <div className="flex justify-end gap-1">
                    <Button small variant="secondary" onClick={() => setStatus(p, 'RESOLUE')}>Résolue</Button><Button small variant="ghost" onClick={() => setStatus(p, 'ANNULEE')}>Annuler</Button></div>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
      {creating && <PanneModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </>
  );
}
