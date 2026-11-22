const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination, dateParam } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

const SELECT = `
  SELECT c.*, e.nom AS coach_nom, e.prenom AS coach_prenom,
         n.inscrits AS nb_inscrits, c.capacite_max - n.inscrits AS places_restantes
  FROM cours c
  JOIN coach co ON co.employe_id = c.coach_id
  JOIN employe e ON e.id = co.employe_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS inscrits FROM inscription_cours i
    WHERE i.cours_id = c.id AND i.statut = 'CONFIRMEE') n ON TRUE`;

function filters(req) {
  const w = new Where();
  if (req.query.coach_id) w.add('c.coach_id = ?', parseId(req.query.coach_id, 'coach_id'));
  if (req.query.statut) w.add('c.statut = ?', String(req.query.statut).toUpperCase());
  const du = dateParam(req.query.du, 'du');
  const au = dateParam(req.query.au, 'au');
  if (du) w.add('c.date_heure_debut::date >= ?::date', du);
  if (au) w.add('c.date_heure_debut::date <= ?::date', au);
  return w;
}

// Consulter les cours : ?coach_id= &statut= &du= &au=
router.get('/', asyncHandler(async (req, res) => {
  const w = filters(req);
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(`${SELECT} ${w.clause()} ORDER BY c.date_heure_debut DESC LIMIT ${limit} OFFSET ${offset}`, w.values);
  res.json(rows);
}));

// Consulter le planning : cours a venir (non annules), ordre chronologique ; ?du= &au= &coach_id=
router.get('/planning', asyncHandler(async (req, res) => {
  const w = filters(req);
  if (!req.query.du) w.raw('c.date_heure_debut::date >= CURRENT_DATE');
  w.raw("c.statut <> 'ANNULE'");
  const { rows } = await query(`${SELECT} ${w.clause()} ORDER BY c.date_heure_debut ASC LIMIT 500`, w.values);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE c.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Cours'));
}));

// Inscriptions d'un cours
router.get('/:id/inscriptions', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  found((await query('SELECT id FROM cours WHERE id = $1', [id])).rows[0], 'Cours');
  const { rows } = await query(
    `SELECT i.*, a.nom AS adherent_nom, a.prenom AS adherent_prenom
     FROM inscription_cours i JOIN adherent a ON a.id = i.adherent_id
     WHERE i.cours_id = $1 ORDER BY i.date_inscription`, [id]
  );
  res.json(rows);
}));

async function assertCoachActif(client, coachId) {
  const { rows: [c] } = await client.query(
    'SELECT e.actif FROM coach co JOIN employe e ON e.id = co.employe_id WHERE co.employe_id = $1', [coachId]
  );
  found(c, 'Coach');
  if (!c.actif) throw new HttpError(409, 'Ce coach est desactive');
}

// Créer un cours (le coach responsable doit exister dans la table coach)
router.post('/', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.cours);
  if (Date.parse(d.date_heure_fin) <= Date.parse(d.date_heure_debut)) throw new HttpError(400, 'date_heure_fin doit etre apres date_heure_debut');
  const row = await withTransaction(async (client) => {
    await assertCoachActif(client, d.coach_id);
    const q = insertQuery('cours', d);
    return (await client.query(q.text, q.values)).rows[0];
  });
  res.status(201).json(row);
}));

// Modifier un cours / gérer la capacité (jamais en dessous du nombre d'inscrits confirmes)
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const d = validate(req.body, S.cours, { partial: true });
  const row = await withTransaction(async (client) => {
    found((await client.query('SELECT id FROM cours WHERE id = $1 FOR UPDATE', [id])).rows[0], 'Cours');
    if (d.capacite_max !== undefined) {
      const { rows: [{ n }] } = await client.query(
        "SELECT COUNT(*) AS n FROM inscription_cours WHERE cours_id = $1 AND statut = 'CONFIRMEE'", [id]
      );
      if (d.capacite_max < n) throw new HttpError(409, `Capacite inferieure au nombre d'inscrits confirmes (${n})`);
    }
    if (d.coach_id !== undefined) await assertCoachActif(client, d.coach_id);
    const q = updateQuery('cours', d, id);
    return (await client.query(q.text, q.values)).rows[0];
  });
  res.json(row);
}));

// Supprimer : refuse (409) s'il existe des inscriptions -> annuler le cours (statut ANNULE) a la place.
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM cours WHERE id = $1', [parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Cours introuvable');
  res.json({ message: 'Cours supprime' });
}));

module.exports = router;
