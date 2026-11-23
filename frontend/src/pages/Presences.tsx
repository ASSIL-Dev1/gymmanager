import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import type { Adherent, Inscription, Presence } from '../lib/types';
import { fmtDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, PageHeader, Select, TableWrap } from '../components/ui';

export default function Presences() {
  const toast = useToast();
  const [enCours, setEnCours] = useState(false);
  const { data, loading, error, reload } = useFetch<Presence[]>('/presences', { en_cours: enCours ? 'true' : undefined, limit: 200 });
  const adherents = useFetch<Adherent[]>('/adherents', { actif: 'true', limit: 500 });
  const [adh, setAdh] = useState('');
  const [insc, setInsc] = useState('');
  const inscriptions = useFetch<Inscription[]>(adh ? '/inscriptions' : null, { adherent_id: adh, statut: 'CONFIRMEE' });
  const [busy, setBusy] = useState(false);

  async function entree() {
    if (!adh || busy) return;
    setBusy(true);
    try {
      await api.post('/presences/entree', { adherent_id: Number(adh), ...(insc ? { inscription_id: Number(insc) } : {}) });
      toast.success('Entrée enregistrée.'); setAdh(''); setInsc(''); reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function sortie(p: Presence) {
    try { await api.post(`/presences/${p.id}/sortie`); toast.success('Sortie enregistrée.'); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <>
      <PageHeader title="Présences" subtitle="Entrées et sorties : un abonnement valide est exigé pour entrer." />
      <Card title="Enregistrer une entrée" className="mb-6">
        <div className="flex flex-wrap items-end gap-3 p-5">
          <div className="w-64"><Select value={adh} onChange={(v) => { setAdh(v); setInsc(''); }} placeholder="Adhérent…" options={(adherents.data ?? []).map((a) => ({ value: a.id, label: `${a.prenom} ${a.nom}` }))} /></div>
          <div className="w-64"><Select value={insc} onChange={setInsc} disabled={!adh} placeholder="Accès libre (sans cours)" options={(inscriptions.data ?? []).map((i) => ({ value: i.id, label: `${i.cours_nom} · ${fmtDateTime(i.date_heure_debut)}` }))} /></div>
          <Button onClick={entree} loading={busy} disabled={!adh}><LogIn className="h-4 w-4" />Entrée</Button>
        </div>
      </Card>
      <Card>
        <div className="border-b border-slate-100 p-4"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={enCours} onChange={(e) => setEnCours(e.target.checked)} />Seulement les adhérents actuellement dans la salle</label></div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucune présence.">
          <TableWrap>
            <thead><tr><th className="th">Adhérent</th><th className="th">Entrée</th><th className="th">Sortie</th><th className="th">Accès</th><th className="th text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((p) => (
                <tr key={p.id}>
                  <td className="td font-medium">{p.adherent_prenom} {p.adherent_nom}</td><td className="td">{fmtDateTime(p.date_heure_entree)}</td>
                  <td className="td">{p.date_heure_sortie ? fmtDateTime(p.date_heure_sortie) : <Badge value="EN_COURS" text="Dans la salle" />}</td>
                  <td className="td"><Badge value={p.type_acces} text={p.cours_nom ? `Cours · ${p.cours_nom}` : 'Libre'} /></td>
                  <td className="td text-right">{!p.date_heure_sortie && <Button small variant="secondary" onClick={() => sortie(p)}><LogOut className="h-3.5 w-3.5" />Sortie</Button>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Async>
      </Card>
    </>
  );
}
