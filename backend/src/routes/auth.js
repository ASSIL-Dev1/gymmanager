const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { validate } = require('../utils/validate');
const { authenticate } = require('../middlewares/auth');
const S = require('../schemas');

// Se connecter -> renvoie un token JWT a envoyer ensuite dans "Authorization: Bearer <token>"
router.post('/login', asyncHandler(async (req, res) => {
  const d = validate(req.body, S.login);
  const { rows: [admin] } = await query(
    'SELECT id, identifiant, mot_de_passe_hache FROM administrateur WHERE identifiant = $1',
    [d.identifiant]
  );
  const ok = admin && (await bcrypt.compare(d.mot_de_passe, admin.mot_de_passe_hache));
  if (!ok) throw new HttpError(401, 'Identifiant ou mot de passe incorrect');

  const utilisateur = { id: admin.id, identifiant: admin.identifiant, role: 'ADMIN' };
  const token = jwt.sign(
    { sub: admin.id, identifiant: admin.identifiant, role: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  res.json({ token, type: 'Bearer', utilisateur });
}));

// Se deconnecter : le JWT est sans etat, le client supprime simplement son token.
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Deconnexion reussie : supprimez le token cote client' });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ id: req.user.sub, identifiant: req.user.identifiant, role: req.user.role });
});

module.exports = router;
