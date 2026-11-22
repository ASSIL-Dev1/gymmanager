const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination, dateParam } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, Where } = require('../utils/sql');
const S = require('../schemas');

const SELECT = `
  SELECT p.*, a.adherent_id, ad.nom AS adherent_nom, ad.prenom AS adherent_prenom,
         t.libelle AS type_abonnement
  FROM paiement p
  JOIN abonnement a ON a.id = p.abonnement_id
  JOIN adherent ad ON ad.id = a.adherent_id
  JOIN type_abonnement t ON t.id = a.type_abonnement_id`;

// Consulter les paiements / historique financier :
// ?abonnement_id= &adherent_id= &mode_paiement= &du=YYYY-MM-DD &au=YYYY-MM-DD
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.abonnement_id) w.add('p.abonnement_id = ?', parseId(req.query.abonnement_id, 'abonnement_id'));
  if (req.query.adherent_id) w.add('a.adherent_id = ?', parseId(req.query.adherent_id, 'adherent_id'));
  if (req.query.mode_paiement) w.add('p.mode_paiement = ?', String(req.query.mode_paiement).toUpperCase());
  const du = dateParam(req.query.du, 'du');
  const au = dateParam(req.query.au, 'au');
  if (du) w.add('p.date_paiement::date >= ?::date', du);
  if (au) w.add('p.date_paiement::date <= ?::date', au);
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(
    `${SELECT} ${w.clause()} ORDER BY p.date_paiement DESC LIMIT ${limit} OFFSET ${offset}`, w.values
  );
  res.json(rows);
}));

// Calculer les revenus : ?du= &au= &groupe=jour|mois|mode (sans groupe : total seul)
router.get('/revenus', asyncHandler(async (req, res) => {
  const w = new Where();
  const du = dateParam(req.query.du, 'du');
  const au = dateParam(req.query.au, 'au');
  if (du) w.add('date_paiement::date >= ?::date', du);
  if (au) w.add('date_paiement::date <= ?::date', au);
  const { rows: [total] } = await query(
    `SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*) AS nb_paiements FROM paiement ${w.clause()}`, w.values
  );
  const groupes = {
    jour: "to_char(date_paiement, 'YYYY-MM-DD')",
    mois: "to_char(date_paiement, 'YYYY-MM')",
    mode: 'mode_paiement',
  };
  let detail = [];
  if (req.query.groupe) {
    const expr = groupes[req.query.groupe];
    if (!expr) throw new HttpError(400, 'groupe doit etre : jour, mois ou mode');
    ({ rows: detail } = await query(
      `SELECT ${expr} AS periode, SUM(montant) AS total, COUNT(*) AS nb_paiements
       FROM paiement ${w.clause()} GROUP BY 1 ORDER BY 1`, w.values
    ));
  }
  res.json({ du, au, ...total, detail });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE p.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Paiement'));
}));

// Enregistrer un paiement. Pas de modification/suppression : l'historique financier reste intact.
router.post('/', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.paiement);
  const paiement = await withTransaction(async (client) => {
    const { rows: [abo] } = await client.query(
      'SELECT id, statut, prix_applique FROM abonnement WHERE id = $1 FOR UPDATE', [d.abonnement_id]
    );
    found(abo, 'Abonnement');
    if (abo.statut === 'ANNULE') throw new HttpError(409, 'Abonnement annule : paiement impossible');
    const { rows: [{ total }] } = await client.query(
      'SELECT COALESCE(SUM(montant), 0) AS total FROM paiement WHERE abonnement_id = $1', [abo.id]
    );
    const reste = Math.round((abo.prix_applique - total) * 100) / 100;
    if (d.montant > reste) {
      throw new HttpError(409, `Montant superieur au reste a payer (${reste})`);
    }
    const q = insertQuery('paiement', d);
    const { rows: [row] } = await client.query(q.text, q.values);
    return { ...row, reste_a_payer: Math.round((reste - d.montant) * 100) / 100 };
  });
  res.status(201).json(paiement);
}));

module.exports = router;
