# GymManager

Application web de gestion d’une salle de sport avec un accès administrateur, des dossiers adhérents, des abonnements et des paiements manuels.

## Environnement

- Node.js 24 et npm
- Docker Desktop démarré avec les conteneurs Linux
- Git

React et NestJS tournent sur le poste de développement. Docker Compose démarre PostgreSQL 17 avec un volume persistant.

La base est accessible sur le poste à l’adresse 127.0.0.1, port 55432. Dans le conteneur, PostgreSQL utilise le port 5432.

## Démarrage

Depuis la racine du dépôt, créer la configuration locale dans PowerShell.

~~~powershell
Copy-Item .env.example .env
npm ci
npm run db:up
~~~

Ouvrir deux terminaux dans le dépôt.

~~~powershell
npm run dev:backend
~~~

~~~powershell
npm run dev:frontend
~~~

Ouvrir [GymManager](http://127.0.0.1:5173) et cliquer sur **Vérifier la connexion**.

L’API répond sur [son contrôle de santé](http://127.0.0.1:3000/api/health). Le statut HTTP 200 indique que l’API peut interroger PostgreSQL. Le statut 503 signale une indisponibilité de la base.

Les ports se configurent dans .env. Le mot de passe de l’exemple sert au développement local. Le fichier .env reste local grâce à .gitignore.

## Structure

~~~text
gymmanager/
├── backend/           API NestJS et accès PostgreSQL
├── frontend/          Interface React, TypeScript et Vite
├── .env.example       Configuration locale à copier
├── compose.yaml       Service PostgreSQL et volume de données
├── package.json       Commandes communes et espaces npm
└── package-lock.json  Versions exactes des dépendances
~~~

Le socle contient une page de démarrage et un contrôle de connexion à la base. Les prochains modules à développer sont l’authentification, les adhérents, les abonnements, les paiements et le tableau de bord, selon le cahier des charges validé.

## Vérifications

~~~powershell
npm run typecheck
npm run build
docker compose ps
~~~

## Arrêt de la base

~~~powershell
npm run db:down
~~~

Cette commande conserve le volume PostgreSQL. Les modifications de POSTGRES_USER, POSTGRES_DB et POSTGRES_PASSWORD dans .env doivent rester cohérentes avec les identifiants déjà initialisés dans le volume.

## Collaboration

La branche principale s’appelle main. Pour chaque fonctionnalité, créer une branche, publier son travail et ouvrir une pull request.

~~~powershell
git switch -c feature/authentification
git add .
git commit -m "feat: ajouter la connexion administrateur"
git push -u origin feature/authentification
~~~

Inviter les membres du groupe dans les paramètres du dépôt GitHub. Conserver les décisions de conception et les résultats de test avec la version de code correspondante.
