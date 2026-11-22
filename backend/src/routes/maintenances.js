const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { asyncHandler, HttpError, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { syncMachineEtat } = require('../services/machines');
const S = require('../schemas');

const SELECT = `
  SELECT mt.*, m.nom AS machine_nom, m.reference AS machine_reference,
         e.nom AS employe_nom, e.prenom AS employe_prenom
  FROM maintenance mt
  JOIN machine m ON m.id = mt.machine_id
  LEFT JOIN employe e ON e.id = mt.employe_id`;

async function assertEmployeActif(client, employeId) {
  if (employeId == null) return;
  const { rows: [emp] } = await client.query('SELECT id, actif FROM employe WHERE id = $1', [employeId]);
  found(emp, 'Employe');
  if (!emp.actif) throw new HttpError(409, 'Employe desactive');
}

async function lockMaintenance(client, id) {
  const { rows: [m] } = await client.query('SELECT * FROM maintenance WHERE id = $1 FOR UPDATE', [id]);
  return found(m, 'Maintenance');
}

// Consulter / historique de maintenance : ?statut= &machine_id= &employe_id=
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.statut) w.add('mt.statut = ?', String(req.query.statut).toUpperCase());
  if (req.query.machine_id) w.add('mt.machine_id = ?', parseId(req.query.machine_id, 'machine_id'));
  if (req.query.employe_id) w.add('mt.employe_id = ?', parseId(req.query.employe_id, 'employe_id'));
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(
    `${SELECT} ${w.clause()} ORDER BY COALESCE(mt.date_planifiee, mt.date_debut) DESC LIMIT ${limit} OFFSET ${offset}`, w.values
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE mt.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Maintenance'));
}));

// Planifier une maintenance (preventive, ou corrective si panne_id fourni), employe optionnel
router.post('/', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.maintenance);
  const row = await withTransaction(async (client) => {
    found((await client.query('SELECT id FROM machine WHERE id = $1', [d.machine_id])).rows[0], 'Machine');
    if (d.panne_id) {
      const { rows: [p] } = await client.query('SELECT machine_id FROM panne WHERE id = $1', [d.panne_id]);
      found(p, 'Panne');
      if (p.machine_id !== d.machine_id) throw new HttpError(409, "La panne n'appartient pas a cette machine");
    }
    await assertEmployeActif(client, d.employe_id);
    const q = insertQuery('maintenance', d);
    return (await client.query(q.text, q.values)).rows[0];
  });
  res.status(201).json(row);
}));

// Enregistrer une intervention (cout, resultat, description, dates...) sans changer le statut
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const d = validate(req.body, S.maintenanceUpdate, { partial: true });
  const row = await withTransaction(async (client) => {
    await lockMaintenance(client, id);
    await assertEmployeActif(client, d.employe_id);
    const q = updateQuery('maintenance', d, id);
    return (await client.query(q.text, q.values)).rows[0];
  });
  res.json(row);
}));

// Affecter un employe
router.put('/:id/affecter', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const d = validate(req.body, S.affectation);
  const row = await withTransaction(async (client) => {
    const m = await lockMaintenance(client, id);
    if (['TERMINEE', 'ANNULEE'].includes(m.statut)) throw new HttpError(409, `Maintenance deja ${m.statut}`);
    await assertEmployeActif(client, d.employe_id);
    return (await client.query('UPDATE maintenance SET employe_id = $1 WHERE id = $2 RETURNING *', [d.employe_id, id])).rows[0];
  });
  res.json(row);
}));

// Demarrer l'intervention : PLANIFIEE -> EN_COURS, machine EN_MAINTENANCE, panne liee EN_COURS
router.post('/:id/demarrer', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const row = await withTransaction(async (client) => {
    const m = await lockMaintenance(client, id);
    if (m.statut !== 'PLANIFIEE') throw new HttpError(409, `Impossible de demarrer : statut actuel ${m.statut}`);
    const { rows: [upd] } = await client.query(
      "UPDATE maintenance SET statut = 'EN_COURS', date_debut = COALESCE(date_debut, CURRENT_TIMESTAMP) WHERE id = $1 RETURNING *", [id]
    );
    if (m.panne_id) {
      await client.query("UPDATE panne SET statut = 'EN_COURS', date_resolution = NULL WHERE id = $1 AND statut = 'OUVERTE'", [m.panne_id]);
    }
    await syncMachineEtat(client, m.machine_id);
    return upd;
  });
  res.json(row);
}));

// Clôturer : TERMINEE + resultat (+cout), panne liee RESOLUE (sauf resoudre_panne=false), machine rendue DISPONIBLE
router.post('/:id/cloturer', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const d = validate(req.body, S.cloture);
  const row = await withTransaction(async (client) => {
    const m = await lockMaintenance(client, id);
    if (!['PLANIFIEE', 'EN_COURS'].includes(m.statut)) throw new HttpError(409, `Maintenance deja ${m.statut}`);
    const { rows: [upd] } = await client.query(
      `UPDATE maintenance SET statut = 'TERMINEE', resultat = $1, cout = COALESCE($2, cout),
              date_debut = COALESCE(date_debut, CURRENT_TIMESTAMP), date_fin = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [d.resultat, d.cout === undefined ? null : d.cout, id]
    );
    if (m.panne_id && d.resoudre_panne !== false) {
      await client.query(
        "UPDATE panne SET statut = 'RESOLUE', date_resolution = CURRENT_TIMESTAMP WHERE id = $1 AND statut IN ('OUVERTE', 'EN_COURS')", [m.panne_id]
      );
    }
    await syncMachineEtat(client, m.machine_id);
    return upd;
  });
  res.json(row);
}));

router.post('/:id/annuler', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const row = await withTransaction(async (client) => {
    const m = await lockMaintenance(client, id);
    if (['TERMINEE', 'ANNULEE'].includes(m.statut)) throw new HttpError(409, `Maintenance deja ${m.statut}`);
    const { rows: [upd] } = await client.query("UPDATE maintenance SET statut = 'ANNULEE' WHERE id = $1 RETURNING *", [id]);
    await syncMachineEtat(client, m.machine_id);
    return upd;
  });
  res.json(row);
}));

module.exports = router;
