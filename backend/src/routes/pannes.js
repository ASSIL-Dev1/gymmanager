const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { syncMachineEtat } = require('../services/machines');
const S = require('../schemas');

const SELECT = `
  SELECT p.*, m.nom AS machine_nom, m.reference AS machine_reference,
         e.nom AS declarant_nom, e.prenom AS declarant_prenom
  FROM panne p
  JOIN machine m ON m.id = p.machine_id
  JOIN employe e ON e.id = p.declarant_id`;

// Consulter les pannes : ?statut= &priorite= &machine_id=
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.statut) w.add('p.statut = ?', String(req.query.statut).toUpperCase());
  if (req.query.priorite) w.add('p.priorite = ?', String(req.query.priorite).toUpperCase());
  if (req.query.machine_id) w.add('p.machine_id = ?', parseId(req.query.machine_id, 'machine_id'));
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(
    `${SELECT} ${w.clause()} ORDER BY p.date_declaration DESC LIMIT ${limit} OFFSET ${offset}`, w.values
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE p.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Panne'));
}));

// Declarer une panne (par un employe identifie) -> la machine passe EN_PANNE
router.post('/', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.panne);
  const panne = await withTransaction(async (client) => {
    found((await client.query('SELECT id FROM machine WHERE id = $1', [d.machine_id])).rows[0], 'Machine');
    const { rows: [emp] } = await client.query('SELECT id, actif FROM employe WHERE id = $1', [d.declarant_id]);
    found(emp, 'Employe declarant');
    if (!emp.actif) throw new HttpError(409, 'Employe declarant desactive');
    const q = insertQuery('panne', d);
    const { rows: [row] } = await client.query(q.text, q.values);
    await syncMachineEtat(client, d.machine_id);
    return row;
  });
  res.status(201).json(panne);
}));

// Mettre a jour une panne (priorite, statut OUVERTE -> EN_COURS -> RESOLUE...) ; l'etat de la machine suit.
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const d = validate(req.body, S.panneUpdate, { partial: true });
  const raw = [];
  if (d.statut === 'RESOLUE') raw.push('date_resolution = CURRENT_TIMESTAMP');
  if (d.statut === 'OUVERTE' || d.statut === 'EN_COURS') raw.push('date_resolution = NULL');
  const panne = await withTransaction(async (client) => {
    const q = updateQuery('panne', d, id, { raw });
    const { rows: [row] } = await client.query(q.text, q.values);
    found(row, 'Panne');
    await syncMachineEtat(client, row.machine_id);
    return row;
  });
  res.json(panne);
}));

module.exports = router;
