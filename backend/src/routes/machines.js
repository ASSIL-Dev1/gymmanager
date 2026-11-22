const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

const SELECT = `
  SELECT m.*, c.nom AS categorie_nom
  FROM machine m JOIN categorie_machine c ON c.id = m.categorie_id`;

// Consulter les machines : ?q= &etat= &categorie_id=
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.q) w.add('(m.nom ILIKE ? OR m.reference ILIKE ? OR m.marque ILIKE ?)', `%${req.query.q}%`);
  if (req.query.etat) w.add('m.etat = ?', String(req.query.etat).toUpperCase());
  if (req.query.categorie_id) w.add('m.categorie_id = ?', parseId(req.query.categorie_id, 'categorie_id'));
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(
    `${SELECT} ${w.clause()} ORDER BY m.nom LIMIT ${limit} OFFSET ${offset}`, w.values
  );
  res.json(rows);
}));

// Suivre l'état des machines : nombre de machines par état
router.get('/etats', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT etat, COUNT(*) AS nombre FROM machine GROUP BY etat ORDER BY etat');
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE m.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Machine'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const q = insertQuery('machine', validate(req.body, S.machine));
  const { rows: [row] } = await query(q.text, q.values);
  res.status(201).json(row);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const q = updateQuery('machine', validate(req.body, S.machine, { partial: true }), parseId(req.params.id));
  const { rows: [row] } = await query(q.text, q.values);
  res.json(found(row, 'Machine'));
}));

// Changer l'etat manuellement (ex. HORS_SERVICE, MANQUANTE)
router.put('/:id/etat', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.machineEtat);
  const { rows: [row] } = await query('UPDATE machine SET etat = $1 WHERE id = $2 RETURNING *', [d.etat, parseId(req.params.id)]);
  res.json(found(row, 'Machine'));
}));

// Pannes et maintenances d'une machine (historique)
router.get('/:id/pannes', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  found((await query('SELECT id FROM machine WHERE id = $1', [id])).rows[0], 'Machine');
  const { rows } = await query('SELECT * FROM panne WHERE machine_id = $1 ORDER BY date_declaration DESC', [id]);
  res.json(rows);
}));

router.get('/:id/maintenances', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  found((await query('SELECT id FROM machine WHERE id = $1', [id])).rows[0], 'Machine');
  const { rows } = await query(
    `SELECT mt.*, e.nom AS employe_nom, e.prenom AS employe_prenom
     FROM maintenance mt LEFT JOIN employe e ON e.id = mt.employe_id
     WHERE mt.machine_id = $1 ORDER BY COALESCE(mt.date_debut, mt.date_planifiee) DESC`, [id]
  );
  res.json(rows);
}));

// Suppression : refusee (409) si la machine a des pannes/maintenances. Utiliser alors etat = HORS_SERVICE.
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM machine WHERE id = $1', [parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Machine introuvable');
  res.json({ message: 'Machine supprimee' });
}));

module.exports = router;
