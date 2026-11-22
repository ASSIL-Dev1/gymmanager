import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Play, Plus, XCircle } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import type { Employe, Machine, Maintenance, Panne } from '../lib/types';
import { currency, fmtDateTime, fmtMoney, nn, toApiDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, Field, FormError, Modal, PageHeader, Select, TableWrap, enumOptions } from '../components/ui';

function MaintenanceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const machines = useFetch<Machine[]>('/machines', { limit: 500 });
  const employes = useFetch<Employe[]>('/employes', { actif: 'true', limit: 500 });
  const [f, setF] = useState({ titre: '', description: '', machine: '', panne: '', employe: '', date: '', cout: '' });
  const pannes = useFetch<Panne[]>(f.machine ? '/pannes' : null, { machine_id: f.machine });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    if (!f.titre.trim() || !f.machine) { setErr('Titre et machine sont obligatoires.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      await api.post('/maintenances', { titre: f.titre.trim(), description: nn(f.description), machine_id: Number(f.machine), panne_id: f.panne ? Number(f.panne) : null, employe_id: f.employe ? Number(f.employe) : null, date_planifiee: f.date ? toApiDateTime(f.date) : null, ...(f.cout ? { cout: Number(f.cout.replace(',', '.')) } : {}) });
      toast.success('Maintenance planifiée.'); onSaved();
    } catch (x) { setErr(errorMessage(x)); lock.current = false; setBusy(false); }
  }
  return (
    <Modal title="Planifier une maintenance" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <Field label="Titre" required><input className="input" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} autoFocus /></Field>
        <Field label="Machine" required><Select value={f.machine} onChange={(v) => setF({ ...f, machine: v, panne: '' })} placeholder="— Choisir —" options={(machines.data ?? []).map((m) => ({ value: m.id, label: `${m.nom} (${m.reference})` }))} /></Field>
        <Field label="Panne liée"><Select value={f.panne} onChange={(v) => setF({ ...f, panne: v })} disabled={!f.machine} placeholder="Aucune (maintenance préventive)" options={(pannes.data ?? []).filter((p) => p.statut === 'OUVERTE' || p.statut === 'EN_COURS').map((p) => ({ value: p.id, label: p.titre }))} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Technicien"><Select value={f.employe} onChange={(v) => setF({ ...f, employe: v })} placeholder="Non affecté" options={(employes.data ?? []).map((m) => ({ value: m.id, label: `${m.prenom} ${m.nom}` }))} /></Field>
          <Field label="Date planifiée"><input className="input" type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label={`Coût estimé (${currency})`}><input className="input" inputMode="decimal" value={f.cout} onChange={(e) => setF({ ...f, cout: e.target.value })} /></Field>
        <Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Planifier</Button></div>
      </form>
    </Modal>
  );
}

function CloseModal({ m, onClose, onSaved }: { m: Maintenance; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [resultat, setResultat] = useState('');
  const [cout, setCout] = useState(String(m.cout ?? ''));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!resultat.trim()) { setErr('Le résultat est obligatoire.'); return; }
    setBusy(true); setErr(null);
    try { await api.post(`/maintenances/${m.id}/cloturer`, { resultat: resultat.trim(), ...(cout ? { cout: Number(cout.replace(',', '.')) } : {}), resoudre_panne: true }); toast.success('Maintenance clôturée.'); onSaved(); }
    catch (x) { setErr(errorMessage(x)); setBusy(false); }
  }
  return (
    <Modal title={`Clôturer · ${m.titre}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={err} />
        <Field label="Résultat de l'intervention" required><textarea className="input" rows={3} value={resultat} onChange={(e) => setResultat(e.target.value)} autoFocus /></Field>
        <Field label={`Coût final (${currency})`} hint={m.panne_id ? 'La panne liée sera marquée comme résolue.' : undefined}><input className="input" inputMode="decimal" value={cout} onChange={(e) => setCout(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button><Button type="submit" loading={busy}>Clôturer</Button></div>
      </form>
    </Modal>
  );
}

export default function Maintenances() {
  const toast = useToast();
  const [statut, setStatut] = useState('');
  const { data, loading, error, reload } = useFetch<Maintenance[]>('/maintenances', { statut, limit: 300 });
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState<Maintenance | null>(null);
  async function act(m: Maintenance, action: 'demarrer' | 'annuler') {
    try { await api.post(`/maintenances/${m.id}/${action}`); toast.success(action === 'demarrer' ? 'Maintenance démarrée.' : 'Maintenance annulée.'); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }
  return (
    <>
      <PageHeader title="Maintenances" subtitle="Cycle : planifier → démarrer → clôturer (ou annuler)." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Planifier</Button>} />
      <Card>
        <div className="border-b border-slate-100 p-4"><div className="w-48"><Select value={statut} onChange={setStatut} placeholder="Tous les statuts" options={enumOptions(['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'])} /></div></div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucune maintenance.">
          <TableWrap>
            <thead><tr><th className="th">Intervention</th><th className="th">Machine</th><th className="th">Technicien</th><th className="th">Planifiée</th><th className="th">Statut</th><th className="th text-right">Coût</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{m.titre}{m.resultat && <p className="max-w-xs truncate text-xs font-normal text-slate-500">{m.resultat}</p>}</td>
                  <td className="td">{m.machine_nom}</td><td className="td">{m.employe_prenom ? `${m.employe_prenom} ${m.employe_nom}` : '—'}</td>
                  <td className="td">{fmtDateTime(m.date_planifiee)}</td><td className="td"><Badge value={m.statut} /></td><td className="td text-right">{fmtMoney(m.cout)}</td>
                  <td className="td"><div className="flex justify-end gap-1">
                    {m.statut === 'PLANIFIEE' && <button title="Démarrer" onClick={() => act(m, 'demarrer')} className="rounded p-2 text-blue-600 hover:bg-blue-50"><Play className="h-4 w-4" /></button>}
                    {(m.statut === 'PLANIFIEE' || m.statut === 'EN_COURS') && <>
                      <button title="Clôturer" onClick={() => setClosing(m)} className="rounded p-2 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>
                      <button title="Annuler" onClick={() => act(m, 'annuler')} className="rounded p-2 text-red-500 hover:bg-red-50"><XCircle className="h-4 w-4" /></button></>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
      {creating && <MaintenanceModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
      {closing && <CloseModal m={closing} onClose={() => setClosing(null)} onSaved={() => { setClosing(null); reload(); }} />}
    </>
  );
}
