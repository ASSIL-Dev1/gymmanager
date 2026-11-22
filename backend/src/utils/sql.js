const { HttpError } = require('./http');

/**
 * Les noms de colonnes viennent TOUJOURS des schemas de validation (liste blanche),
 * jamais directement du client : pas de risque d'injection SQL. Les valeurs passent en $1, $2...
 */
function insertQuery(table, data) {
  const cols = Object.keys(data);
  if (!cols.length) throw new HttpError(400, 'Aucune donnee fournie');
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  return {
    text: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values: cols.map((c) => data[c]),
  };
}

/** raw : fragments SQL fixes ajoutes au SET, ex. 'date_resolution = CURRENT_TIMESTAMP' */
function updateQuery(table, data, id, { raw = [], idColumn = 'id' } = {}) {
  const cols = Object.keys(data);
  if (!cols.length && !raw.length) throw new HttpError(400, 'Aucune donnee a modifier');
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).concat(raw);
  return {
    text: `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idColumn} = $${cols.length + 1} RETURNING *`,
    values: [...cols.map((c) => data[c]), id],
  };
}

/** Constructeur de clause WHERE : w.add('col = ?', valeur) ; '?' est remplace par $n. */
class Where {
  constructor() {
    this.conditions = [];
    this.values = [];
  }
  add(sql, value) {
    this.values.push(value);
    this.conditions.push(sql.replace(/\?/g, `$${this.values.length}`));
    return this;
  }
  raw(sql) {
    this.conditions.push(sql);
    return this;
  }
  clause() {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }
}

module.exports = { insertQuery, updateQuery, Where };
