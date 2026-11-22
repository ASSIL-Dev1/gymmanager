/**
 * Schemas de validation = reflet exact des tables/contraintes de 02_create_tables.sql.
 * Ils servent aussi a generer automatiquement la documentation Swagger (src/docs/openapi.js).
 */
const ETAT_MACHINE = ['DISPONIBLE', 'EN_PANNE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'MANQUANTE'];
const STATUT_ABONNEMENT = ['ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE'];
const MODE_PAIEMENT = ['ESPECES', 'CARTE', 'VIREMENT', 'CHEQUE', 'AUTRE'];
const PRIORITE_PANNE = ['FAIBLE', 'MOYENNE', 'HAUTE', 'URGENTE'];
const STATUT_PANNE = ['OUVERTE', 'EN_COURS', 'RESOLUE', 'ANNULEE'];
const STATUT_MAINTENANCE = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];
const STATUT_COURS = ['PROGRAMME', 'EN_COURS', 'TERMINE', 'ANNULE'];
const STATUT_INSCRIPTION = ['CONFIRMEE', 'EN_ATTENTE', 'ANNULEE'];
const TYPE_ACCES = ['LIBRE', 'COURS'];

module.exports = {
  ENUMS: {
    ETAT_MACHINE, STATUT_ABONNEMENT, MODE_PAIEMENT, PRIORITE_PANNE, STATUT_PANNE,
    STATUT_MAINTENANCE, STATUT_COURS, STATUT_INSCRIPTION, TYPE_ACCES,
  },

  login: {
    identifiant: { type: 'string', required: true, max: 100 },
    mot_de_passe: { type: 'string', required: true, max: 200 },
  },

  adherent: {
    nom: { type: 'string', required: true, max: 100 },
    prenom: { type: 'string', required: true, max: 100 },
    telephone: { type: 'string', max: 20, nullable: true },
    email: { type: 'email', max: 150, nullable: true },
    date_naissance: { type: 'date', nullable: true },
    adresse: { type: 'string', max: 255, nullable: true },
    date_inscription: { type: 'date' },
    actif: { type: 'bool' },
  },

  typeAbonnement: {
    libelle: { type: 'string', required: true, max: 100 },
    duree_jours: { type: 'int', required: true, min: 1 },
    prix: { type: 'number', required: true, min: 0 },
    description: { type: 'string', nullable: true },
    actif: { type: 'bool' },
  },

  abonnementCreate: {
    adherent_id: { type: 'int', required: true, min: 1 },
    type_abonnement_id: { type: 'int', required: true, min: 1 },
    date_debut: { type: 'date' }, // defaut : aujourd'hui ; date_fin = date_debut + duree du type
  },
  abonnementUpdate: {
    date_debut: { type: 'date' },
    date_fin: { type: 'date' },
    statut: { type: 'enum', values: STATUT_ABONNEMENT },
  },
  renouvellement: {
    type_abonnement_id: { type: 'int', min: 1 }, // defaut : meme type
  },

  paiement: {
    abonnement_id: { type: 'int', required: true, min: 1 },
    montant: { type: 'number', required: true, gt: 0 },
    mode_paiement: { type: 'enum', required: true, values: MODE_PAIEMENT },
    reference: { type: 'string', max: 100, nullable: true },
    observation: { type: 'string', nullable: true },
    date_paiement: { type: 'datetime' },
  },

  categorie: {
    nom: { type: 'string', required: true, max: 100 },
    description: { type: 'string', nullable: true },
  },

  machine: {
    nom: { type: 'string', required: true, max: 100 },
    reference: { type: 'string', required: true, max: 100 },
    marque: { type: 'string', max: 100, nullable: true },
    modele: { type: 'string', max: 100, nullable: true },
    date_achat: { type: 'date', nullable: true },
    emplacement: { type: 'string', max: 150, nullable: true },
    etat: { type: 'enum', values: ETAT_MACHINE },
    observations: { type: 'string', nullable: true },
    categorie_id: { type: 'int', required: true, min: 1 },
  },
  machineEtat: {
    etat: { type: 'enum', required: true, values: ETAT_MACHINE },
  },

  panne: {
    titre: { type: 'string', required: true, max: 150 },
    description: { type: 'string', required: true },
    priorite: { type: 'enum', values: PRIORITE_PANNE },
    machine_id: { type: 'int', required: true, min: 1 },
    declarant_id: { type: 'int', required: true, min: 1 }, // id de l'employe qui declare
  },
  panneUpdate: {
    titre: { type: 'string', max: 150 },
    description: { type: 'string' },
    priorite: { type: 'enum', values: PRIORITE_PANNE },
    statut: { type: 'enum', values: STATUT_PANNE },
  },

  maintenance: {
    titre: { type: 'string', required: true, max: 150 },
    description: { type: 'string', nullable: true },
    date_planifiee: { type: 'datetime', nullable: true },
    cout: { type: 'number', min: 0 },
    machine_id: { type: 'int', required: true, min: 1 },
    panne_id: { type: 'int', min: 1, nullable: true },
    employe_id: { type: 'int', min: 1, nullable: true },
  },
  maintenanceUpdate: {
    titre: { type: 'string', max: 150 },
    description: { type: 'string', nullable: true },
    date_planifiee: { type: 'datetime', nullable: true },
    date_debut: { type: 'datetime', nullable: true },
    date_fin: { type: 'datetime', nullable: true },
    cout: { type: 'number', min: 0 },
    resultat: { type: 'string', nullable: true },
    employe_id: { type: 'int', min: 1, nullable: true },
  },
  affectation: {
    employe_id: { type: 'int', required: true, min: 1 },
  },
  cloture: {
    resultat: { type: 'string', required: true },
    cout: { type: 'number', min: 0 },
    resoudre_panne: { type: 'bool' }, // defaut true : la panne liee passe a RESOLUE
  },

  employe: {
    nom: { type: 'string', required: true, max: 100 },
    prenom: { type: 'string', required: true, max: 100 },
    telephone: { type: 'string', max: 20, nullable: true },
    email: { type: 'email', max: 150, nullable: true },
    poste: { type: 'string', required: true, max: 100 },
    date_embauche: { type: 'date', nullable: true },
    actif: { type: 'bool' },
  },
  coach: {
    employe_id: { type: 'int', required: true, min: 1 }, // un coach est obligatoirement un employe
    specialite: { type: 'string', required: true, max: 100 },
    certification: { type: 'string', max: 150, nullable: true },
  },
  coachUpdate: {
    specialite: { type: 'string', max: 100 },
    certification: { type: 'string', max: 150, nullable: true },
  },

  cours: {
    nom: { type: 'string', required: true, max: 100 },
    description: { type: 'string', nullable: true },
    date_heure_debut: { type: 'datetime', required: true },
    date_heure_fin: { type: 'datetime', required: true },
    capacite_max: { type: 'int', required: true, min: 1 },
    salle: { type: 'string', max: 100, nullable: true },
    statut: { type: 'enum', values: STATUT_COURS },
    coach_id: { type: 'int', required: true, min: 1 },
  },

  inscription: {
    adherent_id: { type: 'int', required: true, min: 1 },
    cours_id: { type: 'int', required: true, min: 1 },
  },

  entree: {
    adherent_id: { type: 'int', required: true, min: 1 },
    inscription_id: { type: 'int', min: 1 }, // si fourni : presence de type COURS, sinon LIBRE
  },
};
