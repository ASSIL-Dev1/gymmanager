const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { Where } = require('../utils/sql');
const { assertAdherentCanAccess } = require('../services/abonnements');
const S = require('../schemas');

const SELECT = `
  SELECT i.*, a.nom AS adherent_nom, a.prenom AS adherent_prenom,
         c.nom AS cours_nom, c.date_heure_debut
  FROM inscription_cours i
  JOIN adherent a ON a.id = i.adherent_id
  JOIN cours c ON c.id = i.cours_id`;

// Consulter les inscriptions : ?cours_id= &adherent_id= &statut=
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.cours_id) w.add('i.cours_id = ?', parseId(req.query.cours_id, 'cours_id'));
  if (req.query.adherent_id) w.add('i.adherent_id = ?', parseId(req.query.adherent_id, 'adherent_id'));
  if (req.query.statut) w.add('i.statut = ?', String(req.query.statut).toUpperCase());
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(`${SELECT} ${w.clause()} ORDER BY i.date_inscription DESC LIMIT ${limit} OFFSET ${offset}`, w.values);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE i.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Inscription'));
}));

// Réserver un cours.
// Le verrou sur la ligne du cours (FOR UPDATE) evite de depasser la capacite si deux reservations arrivent en meme temps.
// Cours plein -> inscription EN_ATTENTE (liste d'attente). Pas de doublon (adherent, cours).
router.post('/', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.inscription);
  const result = await withTransaction(async (client) => {
    const { rows: [cours] } = await client.query(
      'SELECT id, statut, capacite_max FROM cours WHERE id = $1 FOR UPDATE', [d.cours_id]
    );
    found(cours, 'Cours');
    if (cours.statut !== 'PROGRAMME') throw new HttpError(409, `Inscription impossible : cours ${cours.statut}`);
    await assertAdherentCanAccess(client, d.adherent_id);

    const { rows: [existing] } = await client.query(
      'SELECT id, statut FROM inscription_cours WHERE adherent_id = $1 AND cours_id = $2', [d.adherent_id, d.cours_id]
    );
    if (existing && existing.statut !== 'ANNULEE') {
      throw new HttpError(409, `Adherent deja inscrit a ce cours (statut ${existing.statut})`);
    }

    const { rows: [{ n }] } = await client.query(
      "SELECT COUNT(*) AS n FROM inscription_cours WHERE cours_id = $1 AND statut = 'CONFIRMEE'", [d.cours_id]
    );
    const statut = n < cours.capacite_max ? 'CONFIRMEE' : 'EN_ATTENTE';

    const { rows: [row] } = existing
      ? await client.query(
          'UPDATE inscription_cours SET statut = $1, date_inscription = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [statut, existing.id]) // reactivation d'une inscription annulee (la paire est UNIQUE)
      : await client.query(
          'INSERT INTO inscription_cours (adherent_id, cours_id, statut) VALUES ($1, $2, $3) RETURNING *',
          [d.adherent_id, d.cours_id, statut]);
    return row;
  });
  res.status(201).json({
    ...result,
    message: result.statut === 'CONFIRMEE' ? 'Inscription confirmee' : "Cours complet : inscrit en liste d'attente",
  });
}));

// Annuler une réservation. Si elle etait CONFIRMEE, le plus ancien EN_ATTENTE est promu CONFIRMEE.
router.post('/:id/annuler', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const result = await withTransaction(async (client) => {
    const { rows: [first] } = await client.query('SELECT cours_id FROM inscription_cours WHERE id = $1', [id]);
    found(first, 'Inscription');
    await client.query('SELECT id FROM cours WHERE id = $1 FOR UPDATE', [first.cours_id]);
    const { rows: [insc] } = await client.query('SELECT * FROM inscription_cours WHERE id = $1', [id]);
    if (insc.statut === 'ANNULEE') throw new HttpError(409, 'Inscription deja annulee');
    const { rows: [annulee] } = await client.query(
      "UPDATE inscription_cours SET statut = 'ANNULEE' WHERE id = $1 RETURNING *", [id]
    );
    let promue = null;
    if (insc.statut === 'CONFIRMEE') {
      const r = await client.query(
        `UPDATE inscription_cours SET statut = 'CONFIRMEE'
         WHERE id = (SELECT id FROM inscription_cours
                     WHERE cours_id = $1 AND statut = 'EN_ATTENTE'
                     ORDER BY date_inscription, id LIMIT 1)
         RETURNING *`, [insc.cours_id]
      );
      promue = r.rows[0] || null;
    }
    return { inscription: annulee, inscription_promue_depuis_liste_attente: promue };
  });
  res.json(result);
}));

module.exports = router;
