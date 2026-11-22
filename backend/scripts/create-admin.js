// Usage : npm run create-admin -- <identifiant> <mot_de_passe>
// Cree (ou met a jour) un administrateur avec un mot de passe HACHE (bcrypt), jamais en clair.
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

(async () => {
  const [identifiant, motDePasse] = process.argv.slice(2);
  if (!identifiant || !motDePasse || motDePasse.length < 8) {
    console.error('Usage : npm run create-admin -- <identifiant> <mot_de_passe (8 caracteres min)>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(motDePasse, 10);
  const { rows } = await pool.query(
    `INSERT INTO administrateur (identifiant, mot_de_passe_hache) VALUES ($1, $2)
     ON CONFLICT (identifiant) DO UPDATE SET mot_de_passe_hache = EXCLUDED.mot_de_passe_hache
     RETURNING id, identifiant`,
    [identifiant, hash]
  );
  console.log('Administrateur pret :', rows[0]);
  await pool.end();
})().catch((e) => {
  console.error('Erreur :', e.message);
  process.exit(1);
});
