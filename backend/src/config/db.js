require('dotenv').config();
const { Pool, types } = require('pg');

// Par defaut pg renvoie BIGINT/NUMERIC en texte et DATE en objet Date (decalage de fuseau).
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT  -> number
types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number
types.setTypeParser(1082, (v) => v); // DATE      -> 'YYYY-MM-DD'
types.setTypeParser(1114, (v) => v.replace(' ', 'T')); // TIMESTAMP -> 'YYYY-MM-DDTHH:mm:ss'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'gymmanager_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const query = (text, values) => pool.query(text, values);

/** Execute fn(client) dans une transaction (COMMIT si OK, ROLLBACK si erreur). */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
