
-- =========================================================
-- GYMMANAGER - CREATION DES TABLES
-- PostgreSQL 17
-- Base : gymmanager_db
-- =========================================================

-- 1. ADMINISTRATEUR
CREATE TABLE administrateur (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identifiant VARCHAR(100) NOT NULL UNIQUE,
    mot_de_passe_hache VARCHAR(255) NOT NULL
);

-- 2. ADHERENT
CREATE TABLE adherent (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(150) UNIQUE,
    date_naissance DATE,
    adresse VARCHAR(255),
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. TYPE_ABONNEMENT
CREATE TABLE type_abonnement (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL UNIQUE,
    duree_jours INT NOT NULL CHECK (duree_jours > 0),
    prix NUMERIC(10,2) NOT NULL CHECK (prix >= 0),
    description TEXT,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. CATEGORIE_MACHINE
CREATE TABLE categorie_machine (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 5. EMPLOYE
CREATE TABLE employe (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(150) UNIQUE,
    poste VARCHAR(100) NOT NULL,
    date_embauche DATE,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. COACH
-- Un coach est obligatoirement un employe.
CREATE TABLE coach (
    employe_id BIGINT PRIMARY KEY,
    specialite VARCHAR(100) NOT NULL,
    certification VARCHAR(150),

    CONSTRAINT fk_coach_employe
        FOREIGN KEY (employe_id)
        REFERENCES employe(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 7. ABONNEMENT
CREATE TABLE abonnement (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'ACTIF',
    prix_applique NUMERIC(10,2) NOT NULL
        CHECK (prix_applique >= 0),
    adherent_id BIGINT NOT NULL,
    type_abonnement_id BIGINT NOT NULL,

    CONSTRAINT chk_abonnement_dates
        CHECK (date_fin >= date_debut),

    CONSTRAINT chk_abonnement_statut
        CHECK (statut IN ('ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE')),

    CONSTRAINT fk_abonnement_adherent
        FOREIGN KEY (adherent_id)
        REFERENCES adherent(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_abonnement_type
        FOREIGN KEY (type_abonnement_id)
        REFERENCES type_abonnement(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 8. MACHINE
CREATE TABLE machine (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    reference VARCHAR(100) NOT NULL UNIQUE,
    marque VARCHAR(100),
    modele VARCHAR(100),
    date_achat DATE,
    emplacement VARCHAR(150),
    etat VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
    observations TEXT,
    categorie_id BIGINT NOT NULL,

    CONSTRAINT chk_machine_etat
        CHECK (etat IN (
            'DISPONIBLE',
            'EN_PANNE',
            'EN_MAINTENANCE',
            'HORS_SERVICE',
            'MANQUANTE'
        )),

    CONSTRAINT fk_machine_categorie
        FOREIGN KEY (categorie_id)
        REFERENCES categorie_machine(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 9. PAIEMENT
CREATE TABLE paiement (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    montant NUMERIC(10,2) NOT NULL CHECK (montant > 0),
    date_paiement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mode_paiement VARCHAR(30) NOT NULL,
    reference VARCHAR(100) UNIQUE,
    observation TEXT,
    abonnement_id BIGINT NOT NULL,

    CONSTRAINT chk_paiement_mode
        CHECK (mode_paiement IN (
            'ESPECES',
            'CARTE',
            'VIREMENT',
            'CHEQUE',
            'AUTRE'
        )),

    CONSTRAINT fk_paiement_abonnement
        FOREIGN KEY (abonnement_id)
        REFERENCES abonnement(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 10. PANNE
CREATE TABLE panne (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    date_declaration TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_resolution TIMESTAMP,
    priorite VARCHAR(30) NOT NULL DEFAULT 'MOYENNE',
    statut VARCHAR(30) NOT NULL DEFAULT 'OUVERTE',
    machine_id BIGINT NOT NULL,
    declarant_id BIGINT NOT NULL,

    CONSTRAINT chk_panne_priorite
        CHECK (priorite IN ('FAIBLE', 'MOYENNE', 'HAUTE', 'URGENTE')),

    CONSTRAINT chk_panne_statut
        CHECK (statut IN ('OUVERTE', 'EN_COURS', 'RESOLUE', 'ANNULEE')),

    CONSTRAINT chk_panne_dates
        CHECK (
            date_resolution IS NULL
            OR date_resolution >= date_declaration
        ),

    CONSTRAINT fk_panne_machine
        FOREIGN KEY (machine_id)
        REFERENCES machine(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_panne_declarant
        FOREIGN KEY (declarant_id)
        REFERENCES employe(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 11. MAINTENANCE
CREATE TABLE maintenance (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    description TEXT,
    date_planifiee TIMESTAMP,
    date_debut TIMESTAMP,
    date_fin TIMESTAMP,
    cout NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cout >= 0),
    statut VARCHAR(30) NOT NULL DEFAULT 'PLANIFIEE',
    resultat TEXT,
    machine_id BIGINT NOT NULL,
    panne_id BIGINT,
    employe_id BIGINT,

    CONSTRAINT chk_maintenance_statut
        CHECK (statut IN (
            'PLANIFIEE',
            'EN_COURS',
            'TERMINEE',
            'ANNULEE'
        )),

    CONSTRAINT chk_maintenance_dates
        CHECK (
            date_debut IS NULL
            OR date_fin IS NULL
            OR date_fin >= date_debut
        ),

    CONSTRAINT fk_maintenance_machine
        FOREIGN KEY (machine_id)
        REFERENCES machine(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_maintenance_panne
        FOREIGN KEY (panne_id)
        REFERENCES panne(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_maintenance_employe
        FOREIGN KEY (employe_id)
        REFERENCES employe(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 12. COURS
CREATE TABLE cours (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    date_heure_debut TIMESTAMP NOT NULL,
    date_heure_fin TIMESTAMP NOT NULL,
    capacite_max INT NOT NULL CHECK (capacite_max > 0),
    salle VARCHAR(100),
    statut VARCHAR(30) NOT NULL DEFAULT 'PROGRAMME',
    coach_id BIGINT NOT NULL,

    CONSTRAINT chk_cours_dates
        CHECK (date_heure_fin > date_heure_debut),

    CONSTRAINT chk_cours_statut
        CHECK (statut IN ('PROGRAMME', 'EN_COURS', 'TERMINE', 'ANNULE')),

    CONSTRAINT fk_cours_coach
        FOREIGN KEY (coach_id)
        REFERENCES coach(employe_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 13. INSCRIPTION_COURS
CREATE TABLE inscription_cours (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date_inscription TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(30) NOT NULL DEFAULT 'CONFIRMEE',
    adherent_id BIGINT NOT NULL,
    cours_id BIGINT NOT NULL,

    CONSTRAINT chk_inscription_statut
        CHECK (statut IN ('CONFIRMEE', 'EN_ATTENTE', 'ANNULEE')),

    CONSTRAINT uq_inscription_adherent_cours
        UNIQUE (adherent_id, cours_id),

    CONSTRAINT fk_inscription_adherent
        FOREIGN KEY (adherent_id)
        REFERENCES adherent(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_inscription_cours
        FOREIGN KEY (cours_id)
        REFERENCES cours(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 14. PRESENCE
CREATE TABLE presence (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date_heure_entree TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_heure_sortie TIMESTAMP,
    type_acces VARCHAR(30) NOT NULL,
    adherent_id BIGINT NOT NULL,
    inscription_id BIGINT UNIQUE,

    CONSTRAINT chk_presence_type
        CHECK (type_acces IN ('LIBRE', 'COURS')),

    CONSTRAINT chk_presence_dates
        CHECK (
            date_heure_sortie IS NULL
            OR date_heure_sortie >= date_heure_entree
        ),

    CONSTRAINT fk_presence_adherent
        FOREIGN KEY (adherent_id)
        REFERENCES adherent(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_presence_inscription
        FOREIGN KEY (inscription_id)
        REFERENCES inscription_cours(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- =========================================================
-- INDEX POUR LES RECHERCHES ET LES JOINTURES
-- =========================================================

CREATE INDEX idx_abonnement_adherent
    ON abonnement(adherent_id);

CREATE INDEX idx_abonnement_type
    ON abonnement(type_abonnement_id);

CREATE INDEX idx_paiement_abonnement
    ON paiement(abonnement_id);

CREATE INDEX idx_machine_categorie
    ON machine(categorie_id);

CREATE INDEX idx_panne_machine
    ON panne(machine_id);

CREATE INDEX idx_maintenance_machine
    ON maintenance(machine_id);

CREATE INDEX idx_maintenance_employe
    ON maintenance(employe_id);

CREATE INDEX idx_cours_coach
    ON cours(coach_id);

CREATE INDEX idx_inscription_cours
    ON inscription_cours(cours_id);

CREATE INDEX idx_presence_adherent
    ON presence(adherent_id);
