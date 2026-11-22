const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

// Public : connexion
router.use('/auth', require('./auth'));

// Tout le reste exige un token JWT valide
router.use(authenticate);
router.use('/adherents', require('./adherents'));
router.use('/types-abonnement', require('./typesAbonnement'));
router.use('/abonnements', require('./abonnements'));
router.use('/paiements', require('./paiements'));
router.use('/categories-machines', require('./categories'));
router.use('/machines', require('./machines'));
router.use('/pannes', require('./pannes'));
router.use('/maintenances', require('./maintenances'));
router.use('/employes', require('./employes'));
router.use('/coachs', require('./coachs'));
router.use('/cours', require('./cours'));
router.use('/inscriptions', require('./inscriptions'));
router.use('/presences', require('./presences'));
router.use('/statistiques', require('./statistiques'));

module.exports = router;
