import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { ENUMS, type Abonnement, type Adherent, type Paiement } from '../lib/types';
import { currency, fmtDateTime, fmtMoney, label, nn, nowLocal, toApiDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Async, Badge, Button, Card, Field, FormError, Modal, PageHeader, Select, TableWrap, enumOptions } from '../components/ui';

/** Tri imposé par F17 : date décroissante, puis identifiant décroissant. */
export const sortPaiements = (rows: Paiement[]) =>
  [...rows].sort((a, b) => (a.date_paiement < b.date_paiement ? 1 : a.date_paiement > b.date_paiement ? -1 : b.id - a.id));

/** Saisie manuelle d'un paiement (F14 à F16, RG04). Aucun paiement bancaire en ligne. */
export function PaiementFormModal({ adherentId, abonnementId, onClose, onSaved }: { adherentId?: number; abonnementId?: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const adherents = useFetch<Adherent[]>(adherentId ? null : '/adherents', { actif: 'true', limit: 500 });
  const [adh, setAdh] = useState(adherentId ? String(adherentId) : '');
  const abos = useFetch<Abonnement[]>(adh ? '/abonnements' : null, { adherent_id: adh, limit: 100 });
  const [abo, setAbo] = useState(abonnementId ? String(abonnementId) : '');
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('ESPECES');
  const [date, setDate] = useState(nowLocal());
  const [reference, setReference] = useState('');
  const [observation, setObservation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false); // F14 : un double clic ne crée qu'une seule opération

  const payables = (abos.data ?? []).filter((a) => a.statut !== 'ANNULE');
  const selected = payables.find((a) => String(a.id) === abo);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const er: Record<string, string> = {};
    const m = Number(montant.replace(',', '.'));
    if (!adh) er.adh = 'Sélectionnez un adhérent.';
    if (!abo) er.abo = 'Un abonnement est obligatoire.';
    if (!montant.trim() || !Number.isFinite(m) || m <= 0) er.montant = 'Le montant doit être strictement positif.';
    else if (!/^\d+([.,]\d{1,2})?$/.test(montant.trim())) er.montant = 'Au plus deux décimales.';
    else if (selected && m > (selected.reste_a_payer ?? Infinity)) er.montant = `Supérieur au reste à payer (${fmtMoney(selected.reste_a_payer)}).`;
    if (!date) er.date = 'Date de paiement invalide.';
    else if (date > nowLocal()) er.date = 'La date de paiement ne peut pas être dans le futur.';
    setErrors(er); setServerError(null);
    if (Object.keys(er).length) return;
    lock.current = true; setBusy(true);
    try {
      await api.post('/paiements', {
        abonnement_id: Number(abo), montant: Math.round(m * 100) / 100, mode_paiement: mode,
        date_paiement: toApiDateTime(date), reference: nn(reference), observation: nn(observation),
      });
      toast.success('Paiement enregistré.'); onSaved();
    } catch (err) { setServerError(errorMessage(err)); lock.current = false; setBusy(false); }
  }

  return (
    <Modal title="Nouveau paiement" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={serverError} />
        {!adherentId && (
          <Field label="Adhérent" required error={errors.adh}>
            <Select value={adh} onChange={(v) => { setAdh(v); setAbo(''); }} placeholder="— Choisir —" options={(adherents.data ?? []).map((a) => ({ value: a.id, label: `${a.prenom} ${a.nom}` }))} />
          </Field>
        )}
        <Field label="Abonnement" required error={errors.abo}>
          <Select value={abo} onChange={setAbo} disabled={!adh} placeholder={adh ? '— Choisir —' : "Choisissez d'abord un adhérent"}
            options={payables.map((a) => ({ value: a.id, label: `#${a.id} · ${a.type_libelle} · reste ${fmtMoney(a.reste_a_payer)}` }))} />
        </Field>
        {selected && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">Prix {fmtMoney(selected.prix_applique)} · déjà payé {fmtMoney(selected.total_paye)} · <strong>reste {fmtMoney(selected.reste_a_payer)}</strong></p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Montant (${currency})`} required error={errors.montant}><input className={`input ${errors.montant ? 'input-error' : ''}`} inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Mode de paiement" required><Select value={mode} onChange={setMode} options={enumOptions(ENUMS.modePaiement)} /></Field>
        </div>
        <Field label="Date et heure du paiement" required error={errors.date}><input className="input" type="datetime-local" max={nowLocal()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Référence"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          <Field label="Observation"><input className="input" value={observation} onChange={(e) => setObservation(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button type="submit" loading={busy}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

export function PaiementsTable({ rows, hideAdherent }: { rows: Paiement[]; hideAdherent?: boolean }) {
  return (
    <TableWrap>
      <thead><tr><th className="th">Date</th>{!hideAdherent && <th className="th">Adhérent</th>}<th className="th">Abonnement</th><th className="th">Mode</th><th className="th">Référence</th><th className="th text-right">Montant</th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {sortPaiements(rows).map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="td">{fmtDateTime(p.date_paiement)}</td>
            {!hideAdherent && <td className="td font-medium"><Link className="text-brand-600 hover:underline" to={`/adherents/${p.adherent_id}`}>{p.adherent_prenom} {p.adherent_nom}</Link></td>}
            <td className="td">#{p.abonnement_id}{p.type_abonnement ? ` · ${p.type_abonnement}` : ''}</td>
            <td className="td"><Badge value="LIBRE" text={label(p.mode_paiement)} /></td><td className="td">{p.reference ?? '—'}</td>
            <td className="td text-right font-semibold">{fmtMoney(p.montant)}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

export default function Paiements() {
  const [mode, setMode] = useState('');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [adh, setAdh] = useState('');
  const adherents = useFetch<Adherent[]>('/adherents', { limit: 500 });
  const { data, loading, error, reload } = useFetch<Paiement[]>('/paiements', { mode_paiement: mode, du, au, adherent_id: adh, limit: 500 });
  const [creating, setCreating] = useState(false);
  const total = Math.round((data ?? []).reduce((s, p) => s + p.montant, 0) * 100) / 100;

  return (
    <>
      <PageHeader title="Paiements" subtitle="Historique des paiements saisis manuellement. Les paiements ne sont ni modifiables ni supprimables."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nouveau paiement</Button>} />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="w-56"><Select value={adh} onChange={setAdh} placeholder="Tous les adhérents" options={(adherents.data ?? []).map((a) => ({ value: a.id, label: `${a.prenom} ${a.nom}` }))} /></div>
          <div className="w-44"><Select value={mode} onChange={setMode} placeholder="Tous les modes" options={enumOptions(ENUMS.modePaiement)} /></div>
          <Field label="Du"><input className="input" type="date" value={du} onChange={(e) => setDu(e.target.value)} /></Field>
          <Field label="Au"><input className="input" type="date" value={au} onChange={(e) => setAu(e.target.value)} /></Field>
          <p className="ml-auto text-sm text-slate-500">Total affiché : <strong className="text-slate-900">{fmtMoney(total)}</strong></p>
        </div>
        <Async loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyText="Aucun paiement.">
          {data && <PaiementsTable rows={data} />}
        </Async>
      </Card>
      {creating && <PaiementFormModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </>
  );
}
