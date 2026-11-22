# GymManager – README de la base de données

## 1. Présentation

Ce dossier décrit la base de données du projet **GymManager**, application de gestion d'une salle de sport. La base utilise PostgreSQL et peut être administrée avec DBeaver.

## 2. Environnement

| Paramètre | Valeur |
|---|---|
| SGBD | PostgreSQL |
| Version utilisée | 17.6 |
| Base | `gymmanager_db` |
| Hôte local de référence | `localhost` |
| Port de référence | `5432` |
| Schéma | `public` |

Chaque développeur doit utiliser ses propres identifiants PostgreSQL. Ne partagez jamais un mot de passe personnel dans ce fichier ou dans le dépôt Git.

## 3. Fichiers du dossier

| Fichier | Rôle |
|---|---|
| `01_create_database.sql` | Création de la base, à exécuter depuis une autre base si nécessaire |
| `02_create_tables.sql` | Création des 14 tables, clés, contraintes et index |
| `03_test_data.sql` | Données fictives de test |
| `04_verification.sql` | Requêtes de vérification |
| `Dictionnaire_Donnees.docx` | Description détaillée des tables et colonnes |
| `MCD_GymManager.png` | Diagramme MCD |
| `MLD_GymManager.png` | Diagramme MLD |

Vérifier que les fichiers listés sont effectivement présents dans le dossier transmis.

## 4. Pré-requis

- PostgreSQL 17 ou version compatible.
- DBeaver ou un autre client PostgreSQL.
- Un compte autorisé à créer la base et les tables.
- Les scripts SQL du projet.

## 5. Installation

### Étape 1 – Créer la base (si elle n'existe pas)

Se connecter à une base existante, par exemple `postgres`, puis exécuter :

```sql
CREATE DATABASE gymmanager_db
    WITH ENCODING = 'UTF8'
    TEMPLATE = template0;
```

Ne pas exécuter cette commande dans une transaction. Si `gymmanager_db` existe déjà, ne pas recréer la base.

### Étape 2 – Se connecter à la base

Dans DBeaver, sélectionner `gymmanager_db`, ouvrir un nouvel éditeur SQL associé à cette base et vérifier :

```sql
SELECT current_database(), current_user, version();
```

La base active doit être `gymmanager_db`.

### Étape 3 – Créer les tables

Exécuter `02_create_tables.sql` dans la base `gymmanager_db`.

Les 14 tables prévues sont :

1. `administrateur`
2. `adherent`
3. `type_abonnement`
4. `categorie_machine`
5. `employe`
6. `coach`
7. `abonnement`
8. `machine`
9. `paiement`
10. `panne`
11. `maintenance`
12. `cours`
13. `inscription_cours`
14. `presence`

### Étape 4 – Insérer les données de test

Exécuter `03_test_data.sql` après la création des tables. Ces données sont fictives et servent uniquement aux tests.

### Étape 5 – Vérifier

Exécuter les requêtes de `04_verification.sql`. Pour lister les tables du schéma `public` :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

## 6. Principales règles techniques

- Les clés primaires identifient les enregistrements.
- Les clés étrangères assurent les relations entre les tables.
- `NOT NULL` rend les champs obligatoires.
- `UNIQUE` évite certains doublons.
- `CHECK` contrôle les montants, dates, statuts et capacités définis dans le script.
- Les suppressions de lignes référencées sont généralement refusées (`ON DELETE RESTRICT`) afin de préserver l'historique.
- Les mots de passe ne doivent jamais être stockés en clair. `mot_de_passe_hache` doit contenir uniquement une empreinte sécurisée.

## 7. Répartition fonctionnelle des tables

| Domaine | Tables |
|---|---|
| Comptes | `administrateur` |
| Adhérents | `adherent` |
| Abonnements et paiements | `type_abonnement`, `abonnement`, `paiement` |
| Équipements | `categorie_machine`, `machine` |
| Personnel | `employe`, `coach` |
| Pannes et maintenance | `panne`, `maintenance` |
| Cours et présences | `cours`, `inscription_cours`, `presence` |

## 8. Points à confirmer avant une utilisation complète

1. **Comptes et rôles :** le modèle actuel prévoit une table `administrateur`. Si les employés ou coachs doivent également se connecter, ajouter une gestion commune des comptes et des rôles avant de développer l'authentification.
2. **Présences et inscriptions :** vérifier qu'une inscription liée à une présence appartient au même adhérent. La clé étrangère simple ne garantit pas cette correspondance.
3. **Capacité des cours :** contrôler le nombre d'inscriptions confirmées avant de confirmer une nouvelle inscription, idéalement dans une transaction.
4. **Abonnements :** préciser si plusieurs abonnements d'un même adhérent peuvent se chevaucher.
5. **Paiements :** préciser les règles de paiement partiel, remboursement et rapprochement avec le montant dû.
6. **Historique :** définir les règles d'archivage et de désactivation des adhérents, employés, machines et formules.

Cette base est une version de développement issue du MLD. Les points ci-dessus doivent être validés par l'équipe avant une utilisation complète ou une mise en production.

## 9. Consignes aux développeurs

- Utiliser les noms de tables et colonnes définis dans le schéma.
- Coordonner toute modification du modèle avec la personne responsable de la base.
- Ne pas intégrer de mot de passe personnel dans le code source.
- Utiliser des requêtes paramétrées côté application.
- Respecter les clés étrangères et les contraintes.
- Mettre à jour le MLD, le script SQL et ce README lorsqu'une évolution est approuvée.

## 10. Informations du projet

- Projet : **GymManager**
- Base : `gymmanager_db`
- SGBD : PostgreSQL
- Schéma : `public`

Ce fichier doit être mis à jour à chaque évolution validée de la base.
