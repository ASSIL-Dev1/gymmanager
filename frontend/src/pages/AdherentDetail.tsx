import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, IdCard, Pencil } from 'lucide-react';
import { useFetch } from '../lib/hooks';
import type { Abonnement, Historique } from '../lib/types';
import { fmtDate, fmtDateTime, fmtMoney } from '../lib/format';
import { ActifBadge, Async, Badge, Button, Card, Empty, PageHeader, TableWrap } from '../components/ui';
import { AdherentFormModal } from './Adherents';
import { AbonnementCreateModal, AbonnementEditModal, AbonnementsTable, RenewDialog } from './Abonnements';
import { PaiementFormModal, PaiementsTable } from './Paiements';

/** Fiche adhérent (F05) : informations, abonnements, paiements, cours et présences de CET adhérent uniquement. */
export default function AdherentDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<Historique>(`/adherents/${id}/historique`);
  const [modal, setModal] = useState<'edit' | 'abo' | 'pay' | null>(null);
  const [editAbo, setEditAbo] = useState<Abonnement | null>(null);
  const [renewAbo, setRenewAbo] = useState<Abonnement | null>(null);
  const close = () => { setModal(null); setEditAbo(null); setRenewAbo(null); reload(); };
  const a = data?.adherent;

  // L'historique renvoie des abonnements sans nom d'adhérent : on le complète pour réutiliser le même tableau.
  const abos = (data?.abonnements ?? []).map((x) => ({ ...x, adherent_nom: a?.nom, adherent_prenom: a?.prenom }));
  // Sur la fiche, le type est déjà dans type_libelle ; reste à payer calculé à partir des paiements de l'adhérent.
  const withTotals = abos.map((x) => {
    const paye = (data?.paiements ?? []).filter((p) => p.abonnement_id === x.id).reduce((s, p) => s + p.montant, 0);
    return { ...x, total_paye: paye, reste_a_payer: Math.round((x.prix_applique - paye) * 100) / 100 };
  });

  return (
    <>
      <Link to="/adherents" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Retour à la liste</Link>
      <Async loading={loading} error={error} onRetry={reload}>
        {a && data && (
          <div className="space-y-6">
            <PageHeader title={`${a.prenom} ${a.nom}`} subtitle={`Adhérent n°${a.id} · inscrit le ${fmtDate(a.date_inscription)}`}
              actions={<>
                <Button variant="secondary" onClick={() => setModal('edit')}><Pencil className="h-4 w-4" />Modifier</Button>
                <Button variant="secondary" onClick={() => setModal('abo')} disabled={!a.actif}><IdCard className="h-4 w-4" />Abonnement</Button>
                <Button onClick={() => setModal('pay')} disabled={!a.actif}><CreditCard className="h-4 w-4" />Paiement</Button>
              </>} />

            <Card title="Informations">
              <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[['Téléphone', a.telephone], ['Courriel', a.email], ['Date de naissance', a.date_naissance ? fmtDate(a.date_naissance) : null], ['Adresse', a.adresse]].map(([k, v]) => (
                  <div key={k as string}><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>
                ))}
                <div><dt className="text-slate-500">Statut</dt><dd><ActifBadge actif={a.actif} /></dd></div>
              </dl>
            </Card>

            <Card title="Abonnements">
              {withTotals.length ? <AbonnementsTable rows={withTotals} hideAdherent onEdit={setEditAbo} onRenew={setRenewAbo} /> : <Empty text="Aucun abonnement." />}
            </Card>
            <Card title="Historique des paiements">
              {data.paiements.length ? <PaiementsTable rows={data.paiements} hideAdherent /> : <Empty text="Aucun paiement." />}
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Cours">
                {data.inscriptions.length ? (
                  <TableWrap><tbody className="divide-y divide-slate-100">
                    {data.inscriptions.map((i) => <tr key={i.id}><td className="td">{i.cours_nom}</td><td className="td">{fmtDateTime(i.date_heure_debut)}</td><td className="td"><Badge value={i.statut} /></td></tr>)}
                  </tbody></TableWrap>
                ) : <Empty text="Aucune inscription à un cours." />}
              </Card>
              <Card title="Dernières présences">
                {data.presences.length ? (
                  <TableWrap><tbody className="divide-y divide-slate-100">
                    {data.presences.slice(0, 10).map((p) => <tr key={p.id}><td className="td">{fmtDateTime(p.date_heure_entree)}</td><td className="td">{p.date_heure_sortie ? fmtDateTime(p.date_heure_sortie) : 'Toujours présent'}</td><td className="td"><Badge value={p.type_acces} /></td></tr>)}
                  </tbody></TableWrap>
                ) : <Empty text="Aucune présence." />}
              </Card>
            </div>
            <p className="text-xs text-slate-400">Montants affichés en {fmtMoney(0).split(' ')[1]}.</p>
          </div>
        )}
      </Async>
      {modal === 'edit' && a && <AdherentFormModal adherent={a} onClose={() => setModal(null)} onSaved={close} />}
      {modal === 'abo' && <AbonnementCreateModal adherentId={Number(id)} onClose={() => setModal(null)} onSaved={close} />}
      {modal === 'pay' && <PaiementFormModal adherentId={Number(id)} onClose={() => setModal(null)} onSaved={close} />}
      {editAbo && <AbonnementEditModal abo={editAbo} onClose={() => setEditAbo(null)} onSaved={close} />}
      {renewAbo && <RenewDialog abo={renewAbo} onClose={() => setRenewAbo(null)} onDone={close} />}
    </>
  );
}
