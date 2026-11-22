import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { ENUMS, type Abonnement, type Adherent, type TypeAbonnement } from '../lib/types';
import { addDays, fmtDate, fmtMoney, today } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, ConfirmDialog, Field, FormError, Modal, PageHeader, Select, TableWrap, enumOptions } from '../components/ui';

/** Création d'un abonnement (F09, F10). La date de fin est calculée par le serveur : début + durée du type. */
export function AbonnementCreateModal({ adherentId, onClose, onSaved }: { adherentId?: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const adherents = useFetch<Adherent[]>(adherentId ? null : '/adherents', { actif: 'true', limit: 500 });
  const types = useFetch<TypeAbonnement[]>('/types-abonnement', { actif: 'true' });
  const [adh, setAdh] = useState(adherentId ? String(adherentId) : '');
  const [typeId, setTypeId] = useState('');
  const [debut, setDebut] = useState(today());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const type = types.data?.find((t) => String(t.id) === typeId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const er: Record<string, string> = {};
    if (!adh) er.adh = 'Sélectionnez un adhérent.';
    if (!typeId) er.type = "Sélectionnez un type d'abonnement.";
    if (!debut) er.debut = 'La date de début est obligatoire.';
    else if (debut > today()) er.debut = "La date de début ne peut pas dépasser aujourd'hui.";
    setErrors(er); setServerError(null);
    if (Object.keys(er).length) return;
    lock.current = true; setBusy(true);
    try {
      await api.post('/abonnements', { adherent_id: Number(adh), type_abonnement_id: Number(typeId), date_debut: debut });
      toast.success('Abonnement créé.'); onSaved();
    } catch (err) { setServerError(errorMessage(err)); lock.current = false; setBusy(false); }
  }

  return (
    <Modal title="Nouvel abonnement" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={serverError} />
        {!adherentId && (
          <Field label="Adhérent" required error={errors.adh}>
            <Select value={adh} onChange={setAdh} placeholder="— Choisir —" options={(adherents.data ?? []).map((a) => ({ value: a.id, label: `${a.prenom} ${a.nom}${a.telephone ? ` · ${a.telephone}` : ''}` }))} />
          </Field>
        )}
        <Field label="Type d'abonnement" required error={errors.type}>
          <Select value={typeId} onChange={setTypeId} placeholder="— Choisir —" options={(types.data ?? []).map((t) => ({ value: t.id, label: `${t.libelle} · ${t.duree_jours} j · ${fmtMoney(t.prix)}` }))} />
        </Field>
        <Field label="Date de début" required error={errors.debut} hint="Au plus tard aujourd'hui. Un chevauchement avec un autre abonnement du même adhérent est refusé.">
          <input className="input" type="date" max={today()} value={debut} onChange={(e) => setDebut(e.target.value)} />
        </Field>
        {type && debut && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
            Fin prévue le <strong>{fmtDate(addDays(debut, type.duree_jours))}</strong> · Prix appliqué : <strong>{fmtMoney(type.prix)}</strong>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button type="submit" loading={busy}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Modification des dates / du statut d'un abonnement (F13, RG05). */
export function AbonnementEditModal({ abo, onClose, onSaved }: { abo: Abonnement; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [debut, setDebut] = useState(abo.date_debut);
  const [fin, setFin] = useState(abo.date_fin);
  const [statut, setStatut] = useState<string>(abo.statut);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const er: Record<string, string> = {};
    if (!debut) er.debut = 'Date de début obligatoire.';
    if (!fin) er.fin = 'Date de fin obligatoire.';
    if (debut && fin && debut > fin) er.fin = 'La fin doit être postérieure ou égale au début.';
    if (debut > today()) er.debut = "Le début ne peut pas dépasser aujourd'hui.";
    setErrors(er); setServerError(null);
    if (Object.keys(er).length) return;
    lock.current = true; setBusy(true);
    try {
      await api.put(`/abonnements/${abo.id}`, { date_debut: debut, date_fin: fin, statut });
      toast.success('Abonnement mis à jour.'); onSaved();
    } catch (err) { setServerError(errorMessage(err)); lock.current = false; setBusy(false); }
  }

  return (
    <Modal title={`Modifier l'abonnement #${abo.id}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={serverError} />
        <p className="text-sm text-slate-600">{abo.adherent_prenom} {abo.adherent_nom} · {abo.type_libelle}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Début" required error={errors.debut}><input className="input" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></Field>
          <Field label="Fin" required error={errors.fin}><input className="input" type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
        </div>
        <Field label="Statut" hint="Les statuts ACTIF / EXPIRÉ sont recalculés automatiquement à la date de fin ; utilisez Suspendu ou Annulé pour une action manuelle.">
          <Select value={statut} onChange={setStatut} options={enumOptions(ENUMS.statutAbonnement)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button type="submit" loading={busy}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

export function AbonnementsTable({ rows, onEdit, onRenew, hideAdherent }: { rows: Abonnement[]; onEdit: (a: Abonnement) => void; onRenew: (a: Abonnement) => void; hideAdherent?: boolean }) {
  return (
    <TableWrap>
      <thead><tr>{!hideAdherent && <th className="th">Adhérent</th>}<th className="th">Type</th><th className="th">Début</th><th className="th">Fin</th><th className="th">Statut</th><th className="th text-right">Prix</th><th className="th text-right">Payé</th><th className="th text-right">Reste</th><th className="th text-right">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            {!hideAdherent && <td className="td font-medium"><Link className="text-brand-600 hover:underline" to={`/adherents/${a.adherent_id}`}>{a.adherent_prenom} {a.adherent_nom}</Link></td>}
            <td className="td">{a.type_libelle}</td><td className="td">{fmtDate(a.date_debut)}</td><td className="td">{fmtDate(a.date_fin)}</td>
            <td className="td"><Badge value={a.statut} /></td>
            <td className="td text-right">{fmtMoney(a.prix_applique)}</td><td className="td text-right">{fmtMoney(a.total_paye)}</td>
            <td className={`td text-right ${(a.reste_a_payer ?? 0) > 0 ? 'font-semibold text-amber-600' : ''}`}>{fmtMoney(a.reste_a_payer)}</td>
            <td className="td"><div className="flex justify-end gap-1">
              <button title="Modifier" onClick={() => onEdit(a)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
              {a.statut !== 'ANNULE' && <button title="Renouveler" onClick={() => onRenew(a)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-4 w-4" /></button>}
            </div></td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/** Confirmation + appel de renouvellement. */
export function RenewDialog({ abo, onClose, onDone }: { abo: Abonnement; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await api.post(`/abonnements/${abo.id}/renouveler`, {}); toast.success('Abonnement renouvelé.'); onDone(); }
    catch (e) { toast.error(errorMessage(e)); setBusy(false); }
  }
  return <ConfirmDialog busy={busy} title="Renouveler l'abonnement ?" confirmLabel="Renouveler" onCancel={onClose} onConfirm={go}
    message={<>Un nouvel abonnement <strong>{abo.type_libelle}</strong> sera créé pour {abo.adherent_prenom} {abo.adherent_nom}, à partir du lendemain de la fin actuelle ({fmtDate(abo.date_fin)}) ou d'aujourd'hui s'il est expiré.</>} />;
}

export default function Abonnements() {
  const [statut, setStatut] = useState('');
  const [typeId, setTypeId] = useState('');
  const types = useFetch<TypeAbonnement[]>('/types-abonnement');
  const { data, loading, error, reload } = useFetch<Abonnement[]>('/abonnements', { statut, type_abonnement_id: typeId, limit: 500 });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Abonnement | null>(null);
  const [renewing, setRenewing] = useState<Abonnement | null>(null);
  const done = () => { setCreating(false); setEditing(null); setRenewing(null); reload(); };

  return (
    <>
      <PageHeader title="Abonnements" subtitle="Statuts calculés à la date du jour : actif jusqu'à la date de fin incluse."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nouvel abonnement</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="w-48"><Select value={statut} onChange={setStatut} placeholder="Tous les statuts" options={enumOptions(ENUMS.statutAbonnement)} /></div>
          <div className="w-56"><Select value={typeId} onChange={setTypeId} placeholder="Tous les types" options={(types.data ?? []).map((t) => ({ value: t.id, label: t.libelle }))} /></div>
        </div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucun abonnement.">
          {data && <AbonnementsTable rows={data} onEdit={setEditing} onRenew={setRenewing} />}
        </Async>
      </Card>
      {creating && <AbonnementCreateModal onClose={() => setCreating(false)} onSaved={done} />}
      {editing && <AbonnementEditModal abo={editing} onClose={() => setEditing(null)} onSaved={done} />}
      {renewing && <RenewDialog abo={renewing} onClose={() => setRenewing(null)} onDone={done} />}
    </>
  );
}
