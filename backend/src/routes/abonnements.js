const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { updateQuery, Where } = require('../utils/sql');
const { refreshExpired, createAbonnement } = require('../services/abonnements');
const S = require('../schemas');

const SELECT = `
  SELECT a.*, ad.nom AS adherent_nom, ad.prenom AS adherent_prenom,
         t.libelle AS type_libelle,
         p.total AS total_paye, a.prix_applique - p.total AS reste_a_payer
  FROM abonnement a
  JOIN adherent ad ON ad.id = a.adherent_id
  JOIN type_abonnement t ON t.id = a.type_abonnement_id
  LEFT JOIN LATERAL (SELECT COALESCE(SUM(montant), 0) AS total FROM paiement WHERE abonnement_id = a.id) p ON TRUE`;

// Consulter les abonnements : ?adherent_id= &statut= &type_abonnement_id=
router.get('/', asyncHandler(async (req, res) => {
  await refreshExpired();
  const w = new Where();
  if (req.query.adherent_id) w.add('a.adherent_id = ?', parseId(req.query.adherent_id, 'adherent_id'));
  if (req.query.type_abonnement_id) w.add('a.type_abonnement_id = ?', parseId(req.query.type_abonnement_id, 'type_abonnement_id'));
  if (req.query.statut) w.add('a.statut = ?', String(req.query.statut).toUpperCase());
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(
    `${SELECT} ${w.clause()} ORDER BY a.date_debut DESC LIMIT ${limit} OFFSET ${offset}`, w.values
  );
  res.json(rows);
}));

// Suivre les expirations : abonnements ACTIFS qui se terminent dans les N prochains jours (defaut 7)
router.get('/expirations', asyncHandler(async (req, res) => {
  await refreshExpired();
  const jours = Math.min(Math.max(parseInt(req.query.jours, 10) || 7, 0), 365);
  const { rows } = await query(
    `${SELECT}
     WHERE a.statut = 'ACTIF' AND a.date_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int
     ORDER BY a.date_fin`, [jours]
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  await refreshExpired();
  const { rows: [row] } = await query(`${SELECT} WHERE a.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Abonnement'));
}));

// Vérifier la validité
router.get('/:id/validite', asyncHandler(async (req, res) => {
  const { rows: [r] } = await query(
    `SELECT id AS abonnement_id, statut, date_debut, date_fin,
            (statut = 'ACTIF' AND CURRENT_DATE BETWEEN date_debut AND date_fin) AS valide,
            GREATEST(date_fin - CURRENT_DATE, 0) AS jours_restants
     FROM abonnement WHERE id = $1`, [parseId(req.params.id)]
  );
  res.json(found(r, 'Abonnement'));
}));

// Créer un abonnement (date_fin et prix calcules depuis le type d'abonnement)
router.post('/', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.abonnementCreate);
  const abo = await withTransaction((client) => createAbonnement(client, d));
  res.status(201).json(abo);
}));

// Renouveler : nouvel abonnement qui commence le lendemain de la fin de celui-ci (ou aujourd'hui si expire)
router.post('/:id/renouveler', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const d = validate(req.body || {}, S.renouvellement);
  const abo = await withTransaction(async (client) => {
    const { rows: [old] } = await client.query('SELECT * FROM abonnement WHERE id = $1 FOR UPDATE', [id]);
    found(old, 'Abonnement');
    if (old.statut === 'ANNULE') throw new HttpError(409, 'Un abonnement annule ne peut pas etre renouvele');
    const { rows: [s] } = await client.query('SELECT GREATEST($1::date + 1, CURRENT_DATE) AS debut', [old.date_fin]);
    return createAbonnement(client, {
      adherent_id: old.adherent_id,
      type_abonnement_id: d.type_abonnement_id || old.type_abonnement_id,
      date_debut: s.debut,
    });
  });
  res.status(201).json(abo);
}));

// Modifier (dates, statut : SUSPENDU / ANNULE / ACTIF...)
router.put('/:id', asyncHandler(async (req, res) => {
  const q = updateQuery('abonnement', validate(req.body, S.abonnementUpdate, { partial: true }), parseId(req.params.id));
  const { rows: [row] } = await query(q.text, q.values);
  res.json(found(row, 'Abonnement'));
}));

module.exports = router;
