const { pool } = require('../config/db');
const { HttpError } = require('../utils/http');

/** Regle : un adherent doit avoir un abonnement valide pour entrer / reserver un cours.
 *  Mettre a false si l'equipe decide de ne pas l'imposer. */
const REQUIRE_VALID_SUBSCRIPTION = true;

/** Passe a EXPIRE les abonnements ACTIF dont la date de fin est depassee. */
async function refreshExpired(client = pool) {
  const r = await client.query(
    "UPDATE abonnement SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_DATE"
  );
  return r.rowCount;
}

async function hasValidSubscription(client, adherentId) {
  const r = await client.query(
    `SELECT 1 FROM abonnement
     WHERE adherent_id = $1 AND statut = 'ACTIF'
       AND CURRENT_DATE BETWEEN date_debut AND date_fin
     LIMIT 1`,
    [adherentId]
  );
  return r.rowCount > 0;
}

async function assertAdherentCanAccess(client, adherentId) {
  const { rows: [ad] } = await client.query(
    'SELECT id, actif FROM adherent WHERE id = $1 FOR UPDATE', [adherentId]
  );
  if (!ad) throw new HttpError(404, 'Adherent introuvable');
  if (!ad.actif) throw new HttpError(409, 'Adherent desactive');
  if (REQUIRE_VALID_SUBSCRIPTION && !(await hasValidSubscription(client, adherentId))) {
    throw new HttpError(409, "Aucun abonnement valide pour cet adherent");
  }
}

/**
 * Cree un abonnement : date_fin = date_debut + duree_jours du type, prix_applique = prix du type.
 * Refuse le chevauchement avec un autre abonnement ACTIF/SUSPENDU du meme adherent.
 * A appeler dans une transaction.
 */
async function createAbonnement(client, { adherent_id, type_abonnement_id, date_debut }) {
  const { rows: [ad] } = await client.query(
    'SELECT id, actif FROM adherent WHERE id = $1 FOR UPDATE', [adherent_id]
  ); // verrou : evite deux creations simultanees qui se chevauchent
  if (!ad) throw new HttpError(404, 'Adherent introuvable');
  if (!ad.actif) throw new HttpError(409, 'Adherent desactive');

  const { rows: [type] } = await client.query(
    'SELECT id, duree_jours, prix, actif FROM type_abonnement WHERE id = $1', [type_abonnement_id]
  );
  if (!type) throw new HttpError(404, "Type d'abonnement introuvable");
  if (!type.actif) throw new HttpError(409, "Ce type d'abonnement n'est plus propose");

  const { rows: [d] } = await client.query(
    `SELECT COALESCE($1::date, CURRENT_DATE) AS debut,
            COALESCE($1::date, CURRENT_DATE) + $2::int AS fin`,
    [date_debut || null, type.duree_jours]
  );

  const overlap = await client.query(
    `SELECT id FROM abonnement
     WHERE adherent_id = $1 AND statut IN ('ACTIF', 'SUSPENDU')
       AND date_debut <= $3::date AND date_fin >= $2::date
     LIMIT 1`,
    [adherent_id, d.debut, d.fin]
  );
  if (overlap.rowCount) {
    throw new HttpError(409, `Chevauchement avec l'abonnement #${overlap.rows[0].id} de cet adherent (utilisez /renouveler)`);
  }

  const { rows: [abo] } = await client.query(
    `INSERT INTO abonnement (date_debut, date_fin, statut, prix_applique, adherent_id, type_abonnement_id)
     VALUES ($1::date, $2::date, CASE WHEN $2::date < CURRENT_DATE THEN 'EXPIRE' ELSE 'ACTIF' END, $3, $4, $5)
     RETURNING *`,
    [d.debut, d.fin, type.prix, adherent_id, type_abonnement_id]
  );
  return abo;
}

module.exports = {
  REQUIRE_VALID_SUBSCRIPTION, refreshExpired, hasValidSubscription,
  assertAdherentCanAccess, createAbonnement,
};
