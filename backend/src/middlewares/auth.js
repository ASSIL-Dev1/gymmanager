const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/http');

/** "Verifier les droits d'acces" : exige un token JWT valide (header Authorization: Bearer <token>). */
function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Authentification requise (header Authorization: Bearer <token>)'));
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    return next(new HttpError(401, 'Token invalide ou expire, reconnectez-vous'));
  }
}

/** Controle des droits selon le role : requireRole('ADMIN'). */
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role)
    ? next()
    : next(new HttpError(403, 'Acces refuse : droits insuffisants'));

module.exports = { authenticate, requireRole };
