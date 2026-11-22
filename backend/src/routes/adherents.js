const router = require('express').Router();
const { query } = require('../config/db');
const { asyncHandler, parseId, found, pagination } = require('../utils/http');
const { validate } = require('../utils/validate');
const { insertQuery, updateQuery, Where } = require('../utils/sql');
const { requireRole } = require('../middlewares/auth');
const S = require('../schemas');

const SELECT = `
  SELECT a.*,
    EXISTS (SELECT 1 FROM abonnement s
            WHERE s.adherent_id = a.id AND s.statut = 'ACTIF'
              AND CURRENT_DATE BETWEEN s.date_debut AND s.date_fin) AS abonnement_valide
  FROM adherent a`;

// Rechercher / lister les adherents : ?q=texte&actif=true
router.get('/', asyncHandler(async (req, res) => {
  const w = new Where();
  if (req.query.q) {
    w.add('(a.nom ILIKE ? OR a.prenom ILIKE ? OR a.email ILIKE ? OR a.telephone ILIKE ?)', `%${req.query.q}%`);
  }
  if (req.query.actif !== undefined) w.add('a.actif = ?', req.query.actif === 'true');
  const { limit, offset } = pagination(req.query);
  const { rows } = await query(
    `${SELECT} ${w.clause()} ORDER BY a.nom, a.prenom LIMIT ${limit} OFFSET ${offset}`, w.values
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`${SELECT} WHERE a.id = $1`, [parseId(req.params.id)]);
  res.json(found(row, 'Adherent'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const q = insertQuery('adherent', validate(req.body, S.adherent));
  const { rows: [row] } = await query(q.text, q.values);
  res.status(201).json(row);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const q = updateQuery('adherent', validate(req.body, S.adherent, { partial: true }), id);
  const { rows: [row] } = await query(q.text, q.values);
  res.json(found(row, 'Adherent'));
}));

// "Supprimer" = desactiver : l'historique (abonnements, paiements, presences) est conserve.
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(
    'UPDATE adherent SET actif = FALSE WHERE id = $1 RETURNING *', [parseId(req.params.id)]
  );
  res.json({ message: 'Adherent desactive (historique conserve)', adherent: found(row, 'Adherent') });
}));

// Historique complet d'un adherent
router.get('/:id/historique', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { rows: [adherent] } = await query('SELECT * FROM adherent WHERE id = $1', [id]);
  found(adherent, 'Adherent');
  const [abonnements, paiements, inscriptions, presences] = await Promise.all([
    query(`SELECT a.*, t.libelle AS type_libelle FROM abonnement a
           JOIN type_abonnement t ON t.id = a.type_abonnement_id
           WHERE a.adherent_id = $1 ORDER BY a.date_debut DESC`, [id]),
    query(`SELECT p.* FROM paiement p JOIN abonnement a ON a.id = p.abonnement_id
           WHERE a.adherent_id = $1 ORDER BY p.date_paiement DESC`, [id]),
    query(`SELECT i.*, c.nom AS cours_nom, c.date_heure_debut FROM inscription_cours i
           JOIN cours c ON c.id = i.cours_id
           WHERE i.adherent_id = $1 ORDER BY c.date_heure_debut DESC`, [id]),
    query('SELECT * FROM presence WHERE adherent_id = $1 ORDER BY date_heure_entree DESC LIMIT 100', [id]),
  ]);
  res.json({
    adherent,
    abonnements: abonnements.rows,
    paiements: paiements.rows,
    inscriptions: inscriptions.rows,
    presences: presences.rows,
  });
}));

module.exports = router;
