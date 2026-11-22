
-- ============================================================
-- GYMMANAGER
-- SCRIPT DE VERIFICATION DE LA BASE DE DONNEES
-- SGBD : PostgreSQL 17
-- Base de donnees : gymmanager_db
-- ============================================================


-- ============================================================
-- VERIFICATION 1 : ADHERENTS ET ABONNEMENTS
-- Objectif :
-- Verifier que chaque abonnement est correctement associe
-- a un adherent et a un type d'abonnement.
-- Afficher les informations des adherents et leurs abonnements.
-- ============================================================

SELECT
    ad.nom,
    ad.prenom,
    ta.libelle AS type_abonnement,
    ab.date_debut,
    ab.date_fin,
    ab.statut
FROM adherent ad
JOIN abonnement ab ON ab.adherent_id = ad.id
JOIN type_abonnement ta ON ta.id = ab.type_abonnement_id;


-- ============================================================
-- VERIFICATION 2 : PAIEMENTS
-- Objectif :
-- Verifier que les paiements sont correctement associes
-- aux abonnements et aux adherents correspondants.
-- Afficher le montant, le mode et la date du paiement.
-- ============================================================

SELECT
    p.id,
    ad.nom,
    ad.prenom,
    p.montant,
    p.mode_paiement,
    p.date_paiement
FROM paiement p
JOIN abonnement ab ON ab.id = p.abonnement_id
JOIN adherent ad ON ad.id = ab.adherent_id;


-- ============================================================
-- VERIFICATION 3 : MACHINES ET CATEGORIES
-- Objectif :
-- Verifier que chaque machine appartient a une categorie.
-- Afficher le nom, la reference, l'etat et la categorie
-- de chaque machine.
-- ============================================================

SELECT
    m.nom AS machine,
    m.reference,
    m.etat,
    c.nom AS categorie
FROM machine m
JOIN categorie_machine c ON c.id = m.categorie_id;


-- ============================================================
-- VERIFICATION 4 : PANNES ET MAINTENANCES
-- Objectif :
-- Verifier les relations entre les pannes, les machines,
-- les maintenances et les employes affectes.
-- LEFT JOIN permet egalement d'afficher les pannes
-- qui ne possedent pas encore de maintenance.
-- ============================================================

SELECT
    p.titre AS panne,
    m.nom AS machine,
    e.nom AS employe,
    mt.statut AS statut_maintenance
FROM panne p
JOIN machine m ON m.id = p.machine_id
LEFT JOIN maintenance mt ON mt.panne_id = p.id
LEFT JOIN employe e ON e.id = mt.employe_id;


-- ============================================================
-- VERIFICATION 5 : COURS, COACHS ET INSCRIPTIONS
-- Objectif :
-- Verifier les relations entre les cours, les coachs,
-- les employes et les adherents inscrits.
-- Afficher le cours, le coach, l'adherent et le statut
-- de son inscription.
-- ============================================================

SELECT
    c.nom AS cours,
    e.nom AS coach,
    a.nom AS adherent,
    i.statut AS statut_inscription
FROM inscription_cours i
JOIN cours c ON c.id = i.cours_id
JOIN coach co ON co.employe_id = c.coach_id
JOIN employe e ON e.id = co.employe_id
JOIN adherent a ON a.id = i.adherent_id;


-- ============================================================
-- VERIFICATION 6 : PRESENCES DES ADHERENTS
-- Objectif :
-- Verifier que les presences sont correctement associees
-- aux adherents.
-- Afficher le type d'acces ainsi que les dates d'entree
-- et de sortie.
-- ============================================================

SELECT
    p.id,
    a.nom,
    a.prenom,
    p.type_acces,
    p.date_heure_entree,
    p.date_heure_sortie
FROM presence p
JOIN adherent a ON a.id = p.adherent_id;


-- ============================================================
-- VERIFICATION 7 : CLES ETRANGERES (FOREIGN KEYS)
-- Objectif :
-- Lister toutes les cles etrangeres de la base.
-- Verifier les relations entre les tables et identifier
-- les colonnes qui referencent d'autres tables.
-- ============================================================

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS table_referencee,
    ccu.column_name AS colonne_referencee
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_schema = 'public'
ORDER BY tc.table_name;


-- ============================================================
-- VERIFICATION 8 : CONTRAINTES DES TABLES
-- Objectif :
-- Afficher les contraintes definies sur les tables.
-- Verifier la presence des :
-- PRIMARY KEY : cles primaires.
-- FOREIGN KEY : cles etrangeres.
-- UNIQUE      : valeurs uniques.
-- CHECK       : conditions de validation des donnees.
-- ============================================================

SELECT
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_type;


-- ============================================================
-- VERIFICATION 9 : NOMBRE D'ENREGISTREMENTS PAR TABLE
-- Objectif :
-- Compter les enregistrements presents dans chacune
-- des 14 tables de GymManager.
-- Permet de verifier que les donnees de test ont ete
-- correctement inserees.
-- ============================================================

SELECT 'administrateur' AS table_name, COUNT(*) AS nombre_enregistrements FROM administrateur
UNION ALL
SELECT 'adherent', COUNT(*) FROM adherent
UNION ALL
SELECT 'type_abonnement', COUNT(*) FROM type_abonnement
UNION ALL
SELECT 'abonnement', COUNT(*) FROM abonnement
UNION ALL
SELECT 'paiement', COUNT(*) FROM paiement
UNION ALL
SELECT 'categorie_machine', COUNT(*) FROM categorie_machine
UNION ALL
SELECT 'machine', COUNT(*) FROM machine
UNION ALL
SELECT 'employe', COUNT(*) FROM employe
UNION ALL
SELECT 'coach', COUNT(*) FROM coach
UNION ALL
SELECT 'panne', COUNT(*) FROM panne
UNION ALL
SELECT 'maintenance', COUNT(*) FROM maintenance
UNION ALL
SELECT 'cours', COUNT(*) FROM cours
UNION ALL
SELECT 'inscription_cours', COUNT(*) FROM inscription_cours
UNION ALL
SELECT 'presence', COUNT(*) FROM presence
ORDER BY table_name;



