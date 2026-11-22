
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  IdCard,
  UserCheck,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  Dumbbell,
  ArrowUpRight,
  ArrowRight,
  CircleDollarSign,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useFetch } from '../lib/hooks';
import type {
  Abonnement,
  Dashboard as Dash,
  Financieres,
} from '../lib/types';

import { fmtDate, fmtMoney, label } from '../lib/format';
import { Async } from '../components/ui';

/* =====================================================
   PREMIUM KPI CARD
===================================================== */

function Kpi({
  title,
  value,
  icon,
  accent,
  to,
  subtitle,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  accent: string;
  to?: string;
  subtitle?: string;
}) {
  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151518] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/40 hover:shadow-xl hover:shadow-red-950/20">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-600/[0.04] blur-2xl transition group-hover:bg-red-600/[0.12]" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">
            {title}
          </p>

          <div className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {value}
          </div>

          {subtitle && (
            <p className="mt-2 text-xs text-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          {icon}
        </div>
      </div>

      {to && (
        <div className="relative mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="text-xs font-medium text-gray-500 transition group-hover:text-red-400">
            Voir les détails
          </span>
          <ArrowUpRight className="h-4 w-4 text-gray-500 transition group-hover:translate-x-1 group-hover:text-red-400" />
        </div>
      )}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

/* =====================================================
   SECTION TITLE
===================================================== */

function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-red-500">
        {icon}
      </div>

      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   DASHBOARD
===================================================== */

export default function Dashboard() {
  // Chargement des statistiques depuis le backend
  const dash = useFetch<Dash>('/statistiques/dashboard');

  const fin = useFetch<Financieres>(
    '/statistiques/financieres'
  );

  const exp = useFetch<Abonnement[]>(
    '/abonnements/expirations',
    { jours: 7 }
  );

  const d = dash.data;

  const count = (status: string) =>
    d?.abonnements.par_statut.find(
      (x) => x.statut === status
    )?.nombre ?? 0;

  const maxMois = Math.max(
    1,
    ...(fin.data?.revenus_par_mois.map(
      (m) => m.total
    ) ?? [0])
  );

  const enPanne =
    d?.machines.par_etat.find(
      (x) => x.etat === 'EN_PANNE'
    )?.nombre ?? 0;

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="-m-4 min-h-screen bg-transparent p-4 text-white sm:-m-6 sm:p-6 lg:p-8">

      {/* HEADER */}
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              GymManager / Administration
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Tableau de bord
            <span className="text-red-500">.</span>
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Bienvenue dans votre espace de gestion. Voici
            l'activité actuelle de votre salle.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#151518] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/10 text-red-500">
            <CalendarClock size={20} />
          </div>

          <div>
            <p className="text-xs text-gray-500">Aujourd'hui</p>
            <p className="text-sm font-semibold capitalize text-white">
              {date}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN DATA */}
      <Async
        loading={dash.loading}
        error={dash.error}
        onRetry={dash.reload}
      >
        {d && (
          <div className="space-y-8">

            {/* KPI SECTION */}
            <section>
              <SectionTitle
                title="Vue d'ensemble"
                subtitle="Les indicateurs clés de votre établissement"
                icon={<Activity size={20} />}
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <Kpi
                  title="Total adhérents"
                  value={d.adherents.total}
                  icon={<Users size={23} />}
                  accent="bg-blue-500/10 text-blue-400"
                  to="/adherents"
                  subtitle="Membres enregistrés"
                />

                <Kpi
                  title="Abonnements actifs"
                  value={count('ACTIF')}
                  icon={<IdCard size={23} />}
                  accent="bg-emerald-500/10 text-emerald-400"
                  to="/abonnements"
                  subtitle="Abonnements en cours"
                />

                <Kpi
                  title="Abonnements expirés"
                  value={count('EXPIRE')}
                  icon={<CalendarClock size={23} />}
                  accent="bg-orange-500/10 text-orange-400"
                  to="/abonnements"
                  subtitle="Abonnements terminés"
                />

                <Kpi
                  title="Total paiements"
                  value={fmtMoney(d.revenus.total)}
                  icon={<CreditCard size={23} />}
                  accent="bg-red-500/10 text-red-400"
                  to="/paiements"
                  subtitle="Revenus enregistrés"
                />

              </div>
            </section>

            {/* SECOND KPI SECTION */}
            <section>
              <SectionTitle
                title="Activité de la salle"
                subtitle="Suivi des opérations quotidiennes"
                icon={<Dumbbell size={20} />}
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <Kpi
                  title="Encaissé ce mois-ci"
                  value={fmtMoney(d.revenus.mois_en_cours)}
                  icon={<Wallet size={23} />}
                  accent="bg-emerald-500/10 text-emerald-400"
                  subtitle="Revenus du mois"
                />

                <Kpi
                  title="Présences actuelles"
                  value={d.presences.dans_la_salle}
                  icon={<UserCheck size={23} />}
                  accent="bg-violet-500/10 text-violet-400"
                  to="/presences"
                  subtitle={`${d.presences.aujourdhui} entrées aujourd'hui`}
                />

                <Kpi
                  title="Pannes non résolues"
                  value={d.machines.pannes_non_resolues}
                  icon={<AlertTriangle size={23} />}
                  accent="bg-red-500/10 text-red-400"
                  to="/pannes"
                  subtitle="Machines nécessitant une intervention"
                />

                <Kpi
                  title="Cours à venir"
                  value={d.cours.a_venir}
                  icon={<CalendarClock size={23} />}
                  accent="bg-sky-500/10 text-sky-400"
                  to="/cours"
                  subtitle="Séances programmées"
                />

              </div>
            </section>

            {/* MAIN CONTENT */}
            <div className="grid gap-6 xl:grid-cols-2">

              {/* EXPIRING MEMBERSHIPS */}
              <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151518]">

                <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                      <AlertTriangle size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-white">
                        Expirations proches
                      </h2>
                      <p className="text-xs text-gray-500">
                        Abonnements sous 7 jours
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-sm font-bold text-orange-400">
                    {d.abonnements.expirent_sous_7_jours}
                  </span>
                </div>

                <Async
                  loading={exp.loading}
                  error={exp.error}
                  empty={!exp.data?.length}
                  emptyText="Aucune expiration proche."
                  onRetry={exp.reload}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-5 py-4 font-medium">
                            Adhérent
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Offre
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Expiration
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {exp.data?.map((a) => (
                          <tr
                            key={a.id}
                            className="border-b border-white/[0.04] transition hover:bg-white/[0.025]"
                          >
                            <td className="px-5 py-4">
                              <Link
                                className="font-medium text-white transition hover:text-red-400"
                                to={`/adherents/${a.adherent_id}`}
                              >
                                {a.adherent_prenom} {a.adherent_nom}
                              </Link>
                            </td>

                            <td className="px-5 py-4 text-gray-400">
                              {a.type_libelle}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-orange-400">
                              {fmtDate(a.date_fin)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Async>
              </section>

              {/* REVENUE CHART */}
              <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151518]">

                <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <TrendingUp size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-white">
                        Évolution des revenus
                      </h2>
                      <p className="text-xs text-gray-500">
                        Performance financière mensuelle
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
                    {fin.data?.annee ?? ''}
                  </span>
                </div>

                <Async
                  loading={fin.loading}
                  error={fin.error}
                  empty={!fin.data?.revenus_par_mois.length}
                  emptyText="Aucun paiement cette année."
                  onRetry={fin.reload}
                >
                  <div className="space-y-5 p-5">

                    {fin.data?.revenus_par_mois.map((m) => (
                      <div key={m.mois}>

                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {m.mois.slice(5)}/{m.mois.slice(0, 4)}
                          </span>

                          <span className="text-sm font-semibold text-white">
                            {fmtMoney(m.total)}
                          </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-700"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, (m.total / maxMois) * 100)
                              )}%`,
                            }}
                          />
                        </div>

                      </div>
                    ))}

                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/[0.07] p-5">

                    <div className="rounded-xl bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <CircleDollarSign size={16} />
                        <span className="text-xs">
                          Reste à encaisser
                        </span>
                      </div>

                      <p className="text-lg font-bold text-white">
                        {fmtMoney(fin.data?.reste_a_encaisser)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <Wrench size={16} />
                        <span className="text-xs">
                          Coût maintenance
                        </span>
                      </div>

                      <p className="text-lg font-bold text-white">
                        {fmtMoney(fin.data?.cout_maintenance)}
                      </p>
                    </div>

                  </div>
                </Async>
              </section>

            </div>

            {/* DISTRIBUTION */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#151518]">

              <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <Activity size={20} />
                  </div>

                  <div>
                    <h2 className="font-semibold text-white">
                      État général de la salle
                    </h2>
                    <p className="text-xs text-gray-500">
                      Répartition des abonnements et des équipements
                    </p>
                  </div>
                </div>

                <span className="hidden text-xs text-gray-500 sm:block">
                  Statistiques en temps réel
                </span>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-2">

                {/* MEMBERSHIP STATUS */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-gray-300">
                    Abonnements par statut
                  </h3>

                  <div className="space-y-3">
                    {d.abonnements.par_statut.map((s) => (
                      <div
                        key={s.statut}
                        className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              s.statut === 'ACTIF'
                                ? 'bg-emerald-400'
                                : s.statut === 'EXPIRE'
                                  ? 'bg-gray-500'
                                  : 'bg-orange-400'
                            }`}
                          />

                          <span className="text-sm text-gray-300">
                            {label(s.statut)}
                          </span>
                        </div>

                        <span className="text-lg font-bold text-white">
                          {s.nombre}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MACHINES STATUS */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-gray-300">
                    État des machines
                  </h3>

                  <div className="space-y-3">
                    {d.machines.par_etat.map((s) => (
                      <div
                        key={s.etat}
                        className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              s.etat === 'EN_PANNE'
                                ? 'bg-red-500'
                                : s.etat === 'DISPONIBLE'
                                  ? 'bg-emerald-400'
                                  : 'bg-orange-400'
                            }`}
                          />

                          <span className="text-sm text-gray-300">
                            {label(s.etat)}
                          </span>
                        </div>

                        <span className="text-lg font-bold text-white">
                          {s.nombre}
                        </span>
                      </div>
                    ))}
                  </div>

                  {enPanne === 0 && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm text-emerald-400">
                      <Activity size={17} />
                      Toutes les machines sont opérationnelles.
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section>
              <SectionTitle
                title="Accès rapide"
                subtitle="Accédez directement aux principales fonctionnalités"
                icon={<ArrowRight size={20} />}
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                {[
                  {
                    title: 'Adhérents',
                    description: 'Gérer les membres',
                    to: '/adherents',
                    icon: <Users size={21} />,
                  },
                  {
                    title: 'Abonnements',
                    description: 'Gérer les formules',
                    to: '/abonnements',
                    icon: <IdCard size={21} />,
                  },
                  {
                    title: 'Paiements',
                    description: 'Suivre les transactions',
                    to: '/paiements',
                    icon: <CreditCard size={21} />,
                  },
                  {
                    title: 'Machines',
                    description: 'Suivre les équipements',
                    to: '/machines',
                    icon: <Dumbbell size={21} />,
                  },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#151518] p-4 transition hover:border-red-500/40 hover:bg-[#1b1719]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition group-hover:bg-red-500 group-hover:text-white">
                        {item.icon}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight
                      size={18}
                      className="text-gray-600 transition group-hover:text-red-400"
                    />
                  </Link>
                ))}

              </div>
            </section>

          </div>
        )}
      </Async>

    </div>
  );
}
