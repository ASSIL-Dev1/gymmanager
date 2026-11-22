const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, parseId, found } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM machine m WHERE m.categorie_id = c.id) AS nb_machines
     FROM categorie_machine c ORDER BY c.nom`
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query('SELECT * FROM categorie_machine WHERE id = $1', [parseId(req.params.id)]);
  res.json(found(row, 'Categorie'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const q = insertQuery('categorie_machine', validate(req.body, S.categorie));
  const { rows: [row] } = await query(q.text, q.values);
  res.status(201).json(row);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const q = updateQuery('categorie_machine', validate(req.body, S.categorie, { partial: true }), parseId(req.params.id));
  const { rows: [row] } = await query(q.text, q.values);
  res.json(found(row, 'Categorie'));
}));

// Refuse (409) si des machines utilisent encore la categorie (ON DELETE RESTRICT).
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM categorie_machine WHERE id = $1', [parseId(req.params.id)]);
  if (!rowCount) return res.status(404).json({ erreur: 'Categorie introuvable' });
  res.json({ message: 'Categorie supprimee' });
}));

module.exports = router;
