const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination, dateParam } = require('../utils/http');
const { validate } = require('../utils/validate');
const { Where } = require('../utils/sql');
const { assertAdherentCanAccess } = require('../services/abonnements');
const S = require('../schemas');

const SELECT = `
  SELECT p.*, a.nom AS adherent_nom, a.prenom AS adherent_prenom, c.nom AS cours_nom
  FROM presence p
  JOIN adherent a ON a.id = p.adherent_id
  LEFT JOIN inscription_cours i ON i.id = p.inscription_id
  LEFT JOIN cours c ON c.id = i.cours_id`;

// Consulter les présences / historique des visites :
// ?adherent_id= &du= &au= &en_cours=true (adherents actuellement dans la salle) &type_acces=LIBRE|COURS
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.adherent_id) w.add('p.adherent_id = ?', parseId(req.query.adherent_id, 'adherent_id'));
  if (req.query.type_acces) w.add('p.type_acces = ?', String(req.query.type_acces).toUpperCase());
  if (req.query.en_cours === 'true') w.raw('p.date_heure_sortie IS NULL');
  const du = dateParam(req.query.du, 'du');
  const au = dateParam(req.query.au, 'au');
  if (du) w.add('p.date_heure_entree::date >= ?::date', du);
  if (au) w.add('p.date_heure_entree::date <= ?::date', au);
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(`${SELECT} ${w.clause()} ORDER BY p.date_heure_entree DESC LIMIT ${limit} OFFSET ${offset}`, w.values);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE p.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Presence'));
}));

// Enregistrer une entrée. Avec inscription_id -> acces COURS (l'inscription doit etre CONFIRMEE et appartenir
// au meme adherent, point signale dans le README de la BD), sinon acces LIBRE.
router.post('/entree', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.entree);
  const row = await withTransaction(async (client) => {
    await assertAdherentCanAccess(client, d.adherent_id); // verrouille aussi la ligne adherent

    const open = await client.query(
      'SELECT id FROM presence WHERE adherent_id = $1 AND date_heure_sortie IS NULL LIMIT 1', [d.adherent_id]
    );
    if (open.rowCount) throw new HttpError(409, `Entree deja enregistree sans sortie (presence #${open.rows[0].id})`);

    if (d.inscription_id) {
      const { rows: [insc] } = await client.query('SELECT * FROM inscription_cours WHERE id = $1', [d.inscription_id]);
      found(insc, 'Inscription');
      if (insc.adherent_id !== d.adherent_id) throw new HttpError(409, "Cette inscription n'appartient pas a cet adherent");
      if (insc.statut !== 'CONFIRMEE') throw new HttpError(409, `Inscription non confirmee (${insc.statut})`);
    }

    try {
      const { rows: [p] } = await client.query(
        'INSERT INTO presence (type_acces, adherent_id, inscription_id) VALUES ($1, $2, $3) RETURNING *',
        [d.inscription_id ? 'COURS' : 'LIBRE', d.adherent_id, d.inscription_id || null]
      );
      return p;
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'Une presence est deja liee a cette inscription');
      throw e;
    }
  });
  res.status(201).json(row);
}));

// Enregistrer une sortie
router.post('/:id/sortie', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { rows: [row] } = await query(
    'UPDATE presence SET date_heure_sortie = CURRENT_TIMESTAMP WHERE id = $1 AND date_heure_sortie IS NULL RETURNING *', [id]
  );
  if (row) return res.json(row);
  found((await query('SELECT id FROM presence WHERE id = $1', [id])).rows[0], 'Presence');
  throw new HttpError(409, 'Sortie deja enregistree pour cette presence');
}));

module.exports = router;
