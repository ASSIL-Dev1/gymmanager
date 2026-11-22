const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, parseId, found } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.actif !== undefined) w.add('actif = ?', req.query.actif === 'true');
  const { rows } = await query(`SELECT * FROM type_abonnement ${w.clause()} ORDER BY duree_jours`, w.values);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query('SELECT * FROM type_abonnement WHERE id = $1', [parseId(req.params.id)]);
  res.json(found(row, "Type d'abonnement"));
}));

router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const q = insertQuery('type_abonnement', validate(req.body, S.typeAbonnement));
  const { rows: [row] } = await query(q.text, q.values);
  res.status(201).json(row);
}));

// Modifier le prix n'affecte pas les abonnements existants (prix_applique est fige a la creation).
router.put('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const q = updateQuery('type_abonnement', validate(req.body, S.typeAbonnement, { partial: true }), parseId(req.params.id));
  const { rows: [row] } = await query(q.text, q.values);
  res.json(found(row, "Type d'abonnement"));
}));

// Retrait de l'offre = desactivation (les abonnements existants gardent leur type).
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(
    'UPDATE type_abonnement SET actif = FALSE WHERE id = $1 RETURNING *', [parseId(req.params.id)]
  );
  res.json({ message: "Type d'abonnement desactive", type: found(row, "Type d'abonnement") });
}));

module.exports = router;
