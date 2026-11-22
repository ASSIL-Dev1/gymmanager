require('dotenv').config();
const { pool } = require('./config/db');
const { refreshExpired } = require('./services/abonnements');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manquant : copiez .env.example en .env et renseignez-le.');
  process.exit(1);
}

const app = require('./app');
const PORT = Number(process.env.PORT) || 3000;

(async () => {
  try {
    const { rows: [info] } = await pool.query('SELECT current_database() AS db, current_user AS utilisateur');
    console.log(`Connecte a PostgreSQL : base "${info.db}", utilisateur "${info.utilisateur}"`);
    console.log(`${await refreshExpired()} abonnement(s) passe(s) a EXPIRE`);
  } catch (err) {
    console.error('Connexion PostgreSQL impossible :', err.message);
    console.error('Verifiez .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) et que PostgreSQL est demarre.');
    process.exit(1);
  }

  // Mise a jour des abonnements expires toutes les heures
  setInterval(() => refreshExpired().catch((e) => console.error('refreshExpired :', e.message)), 60 * 60 * 1000).unref();

  app.listen(PORT, () => {
    console.log(`API GymManager : http://localhost:${PORT}/api`);
    console.log(`Swagger        : http://localhost:${PORT}/api-docs`);
  });
})();
