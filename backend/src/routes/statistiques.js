const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { refreshExpired } = require('../services/abonnements');
const { requireRole } = require('../middlewares/auth');

const rows = async (text, values) => (await query(text, values)).rows;
const one = async (text, values) => (await query(text, values)).rows[0];

// Tableau de bord : indicateurs cles
router.get('/dashboard', asyncHandler(async (req, res) => {
  await refreshExpired();
  const [adherents, abonnements, revenus, machines, pannes, cours, presences] = await Promise.all([
    one('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE actif) AS actifs FROM adherent'),
    rows('SELECT statut, COUNT(*) AS nombre FROM abonnement GROUP BY statut'),
    one(`SELECT COALESCE(SUM(montant), 0) AS total,
                COALESCE(SUM(montant) FILTER (WHERE date_trunc('month', date_paiement) = date_trunc('month', CURRENT_TIMESTAMP)), 0) AS mois_en_cours
         FROM paiement`),
    rows('SELECT etat, COUNT(*) AS nombre FROM machine GROUP BY etat'),
    one("SELECT COUNT(*) AS ouvertes FROM panne WHERE statut IN ('OUVERTE', 'EN_COURS')"),
    one("SELECT COUNT(*) AS a_venir FROM cours WHERE statut = 'PROGRAMME' AND date_heure_debut >= CURRENT_TIMESTAMP"),
    one(`SELECT COUNT(*) FILTER (WHERE date_heure_entree::date = CURRENT_DATE) AS aujourdhui,
                COUNT(*) FILTER (WHERE date_heure_sortie IS NULL) AS dans_la_salle
         FROM presence`),
  ]);
  const expirent = await one(
    "SELECT COUNT(*) AS n FROM abonnement WHERE statut = 'ACTIF' AND date_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + 7"
  );
  res.json({
    adherents,
    abonnements: { par_statut: abonnements, expirent_sous_7_jours: expirent.n },
    revenus,
    machines: { par_etat: machines, pannes_non_resolues: pannes.ouvertes },
    cours,
    presences,
  });
}));

// Statistiques financieres : ?annee=2026 (defaut : annee courante) - reservees a l'ADMIN
router.get('/financieres', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const annee = req.query.annee ? parseInt(req.query.annee, 10) : new Date().getFullYear();
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) throw new HttpError(400, 'annee invalide');
  const [parMois, parMode, reste, maintenance] = await Promise.all([
    rows(`SELECT to_char(date_trunc('month', date_paiement), 'YYYY-MM') AS mois, SUM(montant) AS total, COUNT(*) AS nb_paiements
          FROM paiement WHERE EXTRACT(YEAR FROM date_paiement) = $1 GROUP BY 1 ORDER BY 1`, [annee]),
    rows(`SELECT mode_paiement, SUM(montant) AS total, COUNT(*) AS nb_paiements
          FROM paiement WHERE EXTRACT(YEAR FROM date_paiement) = $1 GROUP BY 1 ORDER BY 2 DESC`, [annee]),
    one(`SELECT COALESCE(SUM(a.prix_applique - COALESCE(p.t, 0)), 0) AS total
         FROM abonnement a
         LEFT JOIN (SELECT abonnement_id, SUM(montant) AS t FROM paiement GROUP BY 1) p ON p.abonnement_id = a.id
         WHERE a.statut <> 'ANNULE'`),
    one(`SELECT COALESCE(SUM(cout), 0) AS total FROM maintenance
         WHERE statut = 'TERMINEE' AND EXTRACT(YEAR FROM date_fin) = $1`, [annee]),
  ]);
  const revenu = parMois.reduce((s, r) => s + r.total, 0);
  res.json({
    annee,
    revenus_total: Math.round(revenu * 100) / 100,
    revenus_par_mois: parMois,
    revenus_par_mode_paiement: parMode,
    reste_a_encaisser: reste.total,
    cout_maintenance: maintenance.total,
  });
}));

router.get('/adherents', asyncHandler(async (req, res) => {
  await refreshExpired();
  const [totaux, nouveaux, parType, sansAbo] = await Promise.all([
    one('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE actif) AS actifs, COUNT(*) FILTER (WHERE NOT actif) AS inactifs FROM adherent'),
    rows(`SELECT to_char(date_trunc('month', date_inscription), 'YYYY-MM') AS mois, COUNT(*) AS nouveaux
          FROM adherent WHERE date_inscription >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
          GROUP BY 1 ORDER BY 1`),
    rows(`SELECT t.libelle, COUNT(*) AS abonnements_actifs
          FROM abonnement a JOIN type_abonnement t ON t.id = a.type_abonnement_id
          WHERE a.statut = 'ACTIF' GROUP BY t.libelle ORDER BY 2 DESC`),
    one(`SELECT COUNT(*) AS n FROM adherent ad WHERE ad.actif AND NOT EXISTS
         (SELECT 1 FROM abonnement a WHERE a.adherent_id = ad.id AND a.statut = 'ACTIF')`),
  ]);
  res.json({ ...totaux, nouveaux_par_mois: nouveaux, abonnements_actifs_par_type: parType, actifs_sans_abonnement_valide: sansAbo.n });
}));

router.get('/machines', asyncHandler(async (req, res) => {
  const [parEtat, parCategorie, pannesParStatut, top, cout] = await Promise.all([
    rows('SELECT etat, COUNT(*) AS nombre FROM machine GROUP BY etat ORDER BY etat'),
    rows(`SELECT c.nom AS categorie, COUNT(m.id) AS nombre FROM categorie_machine c
          LEFT JOIN machine m ON m.categorie_id = c.id GROUP BY c.nom ORDER BY c.nom`),
    rows('SELECT statut, COUNT(*) AS nombre FROM panne GROUP BY statut ORDER BY statut'),
    rows(`SELECT m.id, m.nom, m.reference, COUNT(p.id) AS nb_pannes
          FROM machine m JOIN panne p ON p.machine_id = m.id
          GROUP BY m.id ORDER BY nb_pannes DESC, m.nom LIMIT 5`),
    one("SELECT COALESCE(SUM(cout), 0) AS total, COUNT(*) AS nb FROM maintenance WHERE statut = 'TERMINEE'"),
  ]);
  res.json({
    par_etat: parEtat, par_categorie: parCategorie, pannes_par_statut: pannesParStatut,
    machines_les_plus_en_panne: top, maintenances_terminees: cout,
  });
}));

router.get('/cours', asyncHandler(async (req, res) => {
  const [parStatut, remplissage, parCoach] = await Promise.all([
    rows('SELECT statut, COUNT(*) AS nombre FROM cours GROUP BY statut ORDER BY statut'),
    rows(`SELECT c.id, c.nom, c.date_heure_debut, c.capacite_max,
                 COUNT(i.id) FILTER (WHERE i.statut = 'CONFIRMEE') AS inscrits,
                 COUNT(i.id) FILTER (WHERE i.statut = 'EN_ATTENTE') AS en_attente,
                 ROUND(100.0 * COUNT(i.id) FILTER (WHERE i.statut = 'CONFIRMEE') / c.capacite_max, 1) AS taux_remplissage
          FROM cours c LEFT JOIN inscription_cours i ON i.cours_id = c.id
          GROUP BY c.id ORDER BY c.date_heure_debut DESC LIMIT 20`),
    rows(`SELECT e.id, e.nom, e.prenom, COUNT(c.id) AS nb_cours
          FROM coach co JOIN employe e ON e.id = co.employe_id LEFT JOIN cours c ON c.coach_id = co.employe_id
          GROUP BY e.id ORDER BY nb_cours DESC`),
  ]);
  res.json({ par_statut: parStatut, remplissage_derniers_cours: remplissage, cours_par_coach: parCoach });
}));

module.exports = router;
