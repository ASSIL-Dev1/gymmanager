const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, HttpError, parseId, found } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

// Un coach = un employe + (specialite, certification). La cle du coach est employe_id.
const SELECT = `
  SELECT c.employe_id AS id, c.employe_id, c.specialite, c.certification,
         e.nom, e.prenom, e.telephone, e.email, e.poste, e.actif
  FROM coach c JOIN employe e ON e.id = c.employe_id`;

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY e.nom, e.prenom`);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE c.employe_id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Coach'));
}));

// Faire d'un employe existant un coach
router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const d = validate(req.body, S.coach);
  found((await query('SELECT id FROM employe WHERE id = $1', [d.employe_id])).rows[0], 'Employe');
  const q = insertQuery('coach', d);
  try {
    await query(q.text, q.values);
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Cet employe est deja coach');
    throw e;
  }
  const { rows: [row] } = await query(`${SELECT} WHERE c.employe_id = $1`, [d.employe_id]);
  res.status(201).json(row);
}));

router.put('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const q = updateQuery('coach', validate(req.body, S.coachUpdate, { partial: true }), id, { idColumn: 'employe_id' });
  found((await query(q.text, q.values)).rows[0], 'Coach');
  const { rows: [row] } = await query(`${SELECT} WHERE c.employe_id = $1`, [id]);
  res.json(row);
}));

// Retire le statut de coach (refuse si le coach a des cours : 409). L'employe, lui, est conserve.
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM coach WHERE employe_id = $1', [parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Coach introuvable');
  res.json({ message: 'Statut de coach retire (employe conserve)' });
}));

module.exports = router;
