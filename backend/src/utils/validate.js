const { HttpError } = require('./http');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/;

function checkValue(value, rule, key) {
  switch (rule.type) {
    case 'string':
    case 'email': {
      if (typeof value !== 'string') return { error: `${key} doit etre une chaine de caracteres` };
      const v = value.trim();
      if (rule.min && v.length < rule.min) return { error: `${key} : ${rule.min} caracteres minimum` };
      if (rule.max && v.length > rule.max) return { error: `${key} : ${rule.max} caracteres maximum` };
      if (rule.type === 'email' && !EMAIL.test(v)) return { error: `${key} : email invalide` };
      return { value: v };
    }
    case 'int': {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (!Number.isInteger(n)) return { error: `${key} doit etre un entier` };
      if (rule.min !== undefined && n < rule.min) return { error: `${key} doit etre >= ${rule.min}` };
      return { value: n };
    }
    case 'number': {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isFinite(n)) return { error: `${key} doit etre un nombre` };
      if (rule.min !== undefined && n < rule.min) return { error: `${key} doit etre >= ${rule.min}` };
      if (rule.gt !== undefined && n <= rule.gt) return { error: `${key} doit etre > ${rule.gt}` };
      return { value: n };
    }
    case 'bool': {
      if (typeof value === 'boolean') return { value };
      if (value === 'true') return { value: true };
      if (value === 'false') return { value: false };
      return { error: `${key} doit etre un booleen (true/false)` };
    }
    case 'date': {
      if (typeof value !== 'string' || !DATE.test(value) || Number.isNaN(Date.parse(value))) {
        return { error: `${key} doit etre une date au format YYYY-MM-DD` };
      }
      return { value };
    }
    case 'datetime': {
      if (typeof value !== 'string' || !DATETIME.test(value) || Number.isNaN(Date.parse(value))) {
        return { error: `${key} doit etre au format YYYY-MM-DDTHH:mm:ss (sans fuseau)` };
      }
      return { value };
    }
    case 'enum': {
      if (!rule.values.includes(value)) return { error: `${key} doit etre l'une des valeurs : ${rule.values.join(', ')}` };
      return { value };
    }
    default:
      return { error: `${key} : type de regle inconnu` };
  }
}

/**
 * Valide le corps d'une requete selon un schema, ne garde QUE les champs du schema.
 * partial=true : les champs obligatoires deviennent facultatifs (modification).
 */
function validate(body, schema, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Le corps de la requete doit etre un objet JSON');
  }
  const errors = [];
  const out = {};
  for (const [key, rule] of Object.entries(schema)) {
    const raw = body[key];
    if (raw === undefined) {
      if (rule.required && !partial) errors.push(`${key} est obligatoire`);
      continue;
    }
    if (raw === null || raw === '') {
      if (rule.nullable) out[key] = null;
      else errors.push(`${key} ne peut pas etre vide`);
      continue;
    }
    const res = checkValue(raw, rule, key);
    if (res.error) errors.push(res.error);
    else out[key] = res.value;
  }
  if (errors.length) throw new HttpError(400, 'Donnees invalides', errors);
  return out;
}

module.exports = { validate };
