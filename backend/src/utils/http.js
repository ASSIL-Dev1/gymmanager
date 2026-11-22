class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Permet d'utiliser async/await dans les routes Express 4. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function parseId(value, name = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${name} invalide`);
  return n;
}

/** Leve une 404 si la ligne n'existe pas, sinon la renvoie. */
function found(row, label) {
  if (!row) throw new HttpError(404, `${label} introuvable`);
  return row;
}

function pagination(q) {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
  return { limit, offset };
}

/** Valide un parametre de requete de type date (YYYY-MM-DD), renvoie null si absent. */
function dateParam(value, name) {
  if (value === undefined || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `${name} doit etre au format YYYY-MM-DD`);
  }
  return value;
}

module.exports = { HttpError, asyncHandler, parseId, found, pagination, dateParam };
