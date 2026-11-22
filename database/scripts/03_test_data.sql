
-- =========================================================
-- GYMMANAGER - DONNEES DE TEST
-- =========================================================

-- Types d'abonnement
INSERT INTO type_abonnement (libelle, duree_jours, prix, description)
VALUES
('Mensuel', 30, 200.00, 'Abonnement valable un mois'),
('Trimestriel', 90, 500.00, 'Abonnement valable trois mois'),
('Annuel', 365, 1800.00, 'Abonnement valable un an');

-- Adherents
INSERT INTO adherent (nom, prenom, telephone, email, adresse)
VALUES
('Alami', 'Sara', '0611111111', 'sara@example.com', 'Kenitra'),
('Bennani', 'Youssef', '0622222222', 'youssef@example.com', 'Rabat'),
('Idrissi', 'Salma', '0633333333', 'salma@example.com', 'Kenitra');

-- Employes
INSERT INTO employe (nom, prenom, telephone, email, poste)
VALUES
('Karimi', 'Omar', '0644444444', 'omar@example.com', 'Coach'),
('Amrani', 'Nadia', '0655555555', 'nadia@example.com', 'Technicien'),
('Tazi', 'Hamza', '0666666666', 'hamza@example.com', 'Receptionniste');

-- Coach
INSERT INTO coach (employe_id, specialite, certification)
SELECT id, 'Musculation', 'Certification fitness'
FROM employe
WHERE email = 'omar@example.com';

-- Categories de machines
INSERT INTO categorie_machine (nom, description)
VALUES
('Cardio', 'Equipements cardiovasculaires'),
('Musculation', 'Equipements de musculation'),
('Accessoires', 'Petits equipements sportifs');

-- Machines
INSERT INTO machine
(nom, reference, marque, modele, emplacement, etat, categorie_id)
VALUES
(
    'Tapis de course',
    'MCH-001',
    'Technogym',
    'Run 1000',
    'Zone cardio',
    'DISPONIBLE',
    (SELECT id FROM categorie_machine WHERE nom = 'Cardio')
),
(
    'Velo elliptique',
    'MCH-002',
    'Life Fitness',
    'E3',
    'Zone cardio',
    'DISPONIBLE',
    (SELECT id FROM categorie_machine WHERE nom = 'Cardio')
),
(
    'Presse a jambes',
    'MCH-003',
    'Technogym',
    'Leg Press',
    'Zone musculation',
    'DISPONIBLE',
    (SELECT id FROM categorie_machine WHERE nom = 'Musculation')
);

-- Abonnements
INSERT INTO abonnement
(date_debut, date_fin, statut, prix_applique, adherent_id, type_abonnement_id)
VALUES
(
    CURRENT_DATE,
    CURRENT_DATE + 30,
    'ACTIF',
    200.00,
    (SELECT id FROM adherent WHERE email = 'sara@example.com'),
    (SELECT id FROM type_abonnement WHERE libelle = 'Mensuel')
),
(
    CURRENT_DATE - 60,
    CURRENT_DATE - 1,
    'EXPIRE',
    500.00,
    (SELECT id FROM adherent WHERE email = 'youssef@example.com'),
    (SELECT id FROM type_abonnement WHERE libelle = 'Trimestriel')
);

-- Paiements
INSERT INTO paiement
(montant, mode_paiement, reference, observation, abonnement_id)
VALUES
(
    200.00,
    'ESPECES',
    'PAY-001',
    'Paiement mensuel',
    (
        SELECT a.id
        FROM abonnement a
        JOIN adherent ad ON ad.id = a.adherent_id
        WHERE ad.email = 'sara@example.com'
    )
),
(
    500.00,
    'CARTE',
    'PAY-002',
    'Paiement trimestriel',
    (
        SELECT a.id
        FROM abonnement a
        JOIN adherent ad ON ad.id = a.adherent_id
        WHERE ad.email = 'youssef@example.com'
    )
);

-- Panne
INSERT INTO panne
(titre, description, priorite, statut, machine_id, declarant_id)
VALUES
(
    'Probleme tapis de course',
    'La machine necessite une verification technique.',
    'MOYENNE',
    'OUVERTE',
    (SELECT id FROM machine WHERE reference = 'MCH-001'),
    (SELECT id FROM employe WHERE email = 'nadia@example.com')
);

-- Maintenance
INSERT INTO maintenance
(titre, description, date_planifiee, statut, cout, machine_id, panne_id, employe_id)
VALUES
(
    'Verification du tapis',
    'Intervention de controle technique.',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    'PLANIFIEE',
    100.00,
    (SELECT id FROM machine WHERE reference = 'MCH-001'),
    (SELECT id FROM panne WHERE titre = 'Probleme tapis de course'),
    (SELECT id FROM employe WHERE email = 'nadia@example.com')
);

-- Cours
INSERT INTO cours
(nom, description, date_heure_debut, date_heure_fin, capacite_max, salle, coach_id)
VALUES
(
    'Fitness collectif',
    'Seance collective de fitness.',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '1 day 1 hour',
    15,
    'Salle A',
    (SELECT employe_id FROM coach
     JOIN employe ON employe.id = coach.employe_id
     WHERE employe.email = 'omar@example.com')
);

-- Inscription
INSERT INTO inscription_cours
(adherent_id, cours_id)
VALUES
(
    (SELECT id FROM adherent WHERE email = 'sara@example.com'),
    (SELECT id FROM cours WHERE nom = 'Fitness collectif')
);

-- Presence liee a l'inscription
INSERT INTO presence
(type_acces, adherent_id, inscription_id)
VALUES
(
    'COURS',
    (SELECT id FROM adherent WHERE email = 'sara@example.com'),
    (SELECT id FROM inscription_cours
     WHERE adherent_id = (SELECT id FROM adherent WHERE email = 'sara@example.com')
       AND cours_id = (SELECT id FROM cours WHERE nom = 'Fitness collectif'))
);
