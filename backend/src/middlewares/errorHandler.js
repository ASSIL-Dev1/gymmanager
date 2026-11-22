const { HttpError } = require('../utils/http');

function notFoundHandler(req, res, next) {
  next(new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));
}

// Traduit les erreurs PostgreSQL (contraintes du schema) en reponses HTTP claires.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erreur: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'JSON invalide dans le corps de la requete' });
  }
  switch (err.code) {
    case '23505': // UNIQUE
      return res.status(409).json({ erreur: 'Doublon : cette valeur existe deja', details: err.detail });
    case '23503': // FOREIGN KEY
      if (err.detail && err.detail.includes('is still referenced')) {
        return res.status(409).json({
          erreur: 'Suppression impossible : cet enregistrement est reference par d\'autres donnees (historique conserve). Desactivez-le plutot.',
          details: err.detail,
        });
      }
      return res.status(409).json({ erreur: 'Reference inexistante (cle etrangere invalide)', details: err.detail });
    case '23514': // CHECK
      return res.status(400).json({ erreur: 'Contrainte de coherence non respectee', details: err.constraint });
    case '23502': // NOT NULL
      return res.status(400).json({ erreur: `Champ obligatoire manquant : ${err.column}` });
    case '22P02':
    case '22007':
    case '22008':
      return res.status(400).json({ erreur: 'Format de donnee invalide' });
    default:
      console.error(err);
      return res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
}

module.exports = { notFoundHandler, errorHandler };
