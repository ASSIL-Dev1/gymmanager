# GymManager – Backend (Node.js + Express + PostgreSQL + Swagger)

## Installation (une seule fois)

1. Installer **Node.js 18+ (LTS)** : https://nodejs.org
2. Créer la base (voir README_BD.md) : exécuter `01_create_database.sql`, puis, **dans `gymmanager_db`**, `02_create_tables.sql` et `03_test_data.sql`.
3. Dans ce dossier :
   ```bash
   npm install
   copy .env.example .env      # Windows   (Mac/Linux : cp .env.example .env)
   ```
4. Ouvrir `.env` et mettre **votre** mot de passe PostgreSQL (`DB_PASSWORD`) et un `JWT_SECRET` long et aléatoire.
5. Créer le compte administrateur (mot de passe haché en bcrypt) :
   ```bash
   npm run create-admin -- admin MotDePasse123
   ```
6. Lancer :
   ```bash
   npm run dev
   ```
   → Swagger : http://localhost:3000/api-docs

## Utiliser Swagger
`POST /auth/login` → copier le `token` → bouton **Authorize** → coller le token → tester les routes.

## Structure
```
src/
  server.js            démarrage (test BD, job d'expiration des abonnements)
  app.js               Express + Swagger + routes
  schemas.js           schémas de validation = contraintes de 02_create_tables.sql (sert aussi à Swagger)
  config/db.js         pool PostgreSQL + transactions
  middlewares/         auth.js (JWT, rôles) · errorHandler.js (erreurs PostgreSQL -> HTTP)
  routes/              une route par module de la conception
  services/            règles métier partagées (abonnements, état des machines)
  docs/openapi.js      documentation Swagger
scripts/create-admin.js
```

## Règles de gestion implémentées
- Mot de passe jamais en clair (`mot_de_passe_hache`, bcrypt). Token JWT 8 h.
- « Supprimer » adhérent / employé / type d'abonnement = **désactivation** (`actif = false`), car les FK sont en `ON DELETE RESTRICT`. Machine, catégorie, cours : suppression réelle, refusée en 409 s'il existe un historique.
- Abonnement : `date_fin = date_debut + duree_jours`, `prix_applique` figé à la création, pas de chevauchement pour un même adhérent, renouvellement = jour suivant la fin. Statut `EXPIRE` mis à jour automatiquement (au démarrage, chaque heure, et à la consultation).
- Paiement : montant > 0, jamais supérieur au reste à payer, abonnement non annulé ; pas de modification/suppression (historique financier).
- Panne : déclarée par un employé existant ; l'état de la machine suit automatiquement (panne → `EN_PANNE`, maintenance en cours → `EN_MAINTENANCE`, tout résolu → `DISPONIBLE`). `HORS_SERVICE` / `MANQUANTE` restent manuels.
- Maintenance : planifier → démarrer → clôturer (résultat, coût, panne liée résolue) ou annuler.
- Cours : coach existant et actif, capacité jamais inférieure aux inscrits confirmés.
- Inscription : pas de doublon, contrôle de capacité **dans une transaction avec verrou**, cours plein → `EN_ATTENTE`, annulation → promotion automatique du premier en attente.
- Présence : entrée refusée sans abonnement valide, sans sortie préalable ; une inscription liée doit être `CONFIRMEE` et appartenir au même adhérent (point 2 du README_BD). `LIBRE` sans inscription, `COURS` avec.

## Points à valider avec l'équipe
1. **Rôles** : la BD n'a que `administrateur` → seul le rôle `ADMIN` peut se connecter. Employé/Coach/Visiteur du diagramme de cas d'utilisation nécessitent une table de comptes (voir README_BD §8.1). Le middleware `requireRole(...)` est déjà prêt.
2. Abonnement valide obligatoire pour entrer / réserver : constante `REQUIRE_VALID_SUBSCRIPTION` dans `src/services/abonnements.js`.
3. Surpaiement refusé, chevauchement d'abonnements refusé (README_BD §8.4 et 8.5).
