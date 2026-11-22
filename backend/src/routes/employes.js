const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

const SELECT = `
  SELECT e.*, (c.employe_id IS NOT NULL) AS est_coach, c.specialite, c.certification
  FROM employe e LEFT JOIN coach c ON c.employe_id = e.id`;

// Consulter le personnel : ?q= &poste= &actif=
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.q) w.add('(e.nom ILIKE ? OR e.prenom ILIKE ? OR e.email ILIKE ?)', `%${req.query.q}%`);
  if (req.query.poste) w.add('e.poste ILIKE ?', `%${req.query.poste}%`);
  if (req.query.actif !== undefined) w.add('e.actif = ?', req.query.actif === 'true');
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(`${SELECT} ${w.clause()} ORDER BY e.nom, e.prenom LIMIT ${limit} OFFSET ${offset}`, w.values);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE e.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Employe'));
}));

router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const q = insertQuery('employe', validate(req.body, S.employe));
  const { rows: [row] } = await query(q.text, q.values);
  res.status(201).json(row);
}));

router.put('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const q = updateQuery('employe', validate(req.body, S.employe, { partial: true }), parseId(req.params.id));
  const { rows: [row] } = await query(q.text, q.values);
  res.json(found(row, 'Employe'));
}));

// "Supprimer" = desactiver (l'employe reste reference par pannes, maintenances, cours...)
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rows: [row] } = await query('UPDATE employe SET actif = FALSE WHERE id = $1 RETURNING *', [parseId(req.params.id)]);
  res.json({ message: 'Employe desactive (historique conserve)', employe: found(row, 'Employe') });
}));

module.exports = router;
