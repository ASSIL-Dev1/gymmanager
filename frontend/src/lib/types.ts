export type StatutAbonnement = 'ACTIF' | 'EXPIRE' | 'SUSPENDU' | 'ANNULE';
export type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'CHEQUE' | 'AUTRE';
export type EtatMachine = 'DISPONIBLE' | 'EN_PANNE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'MANQUANTE';
export type PrioritePanne = 'FAIBLE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
export type StatutPanne = 'OUVERTE' | 'EN_COURS' | 'RESOLUE' | 'ANNULEE';
export type StatutMaintenance = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
export type StatutCours = 'PROGRAMME' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
export type StatutInscription = 'CONFIRMEE' | 'EN_ATTENTE' | 'ANNULEE';

export const ENUMS = {
  statutAbonnement: ['ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE'] as StatutAbonnement[],
  modePaiement: ['ESPECES', 'CARTE', 'VIREMENT', 'CHEQUE', 'AUTRE'] as ModePaiement[],
  etatMachine: ['DISPONIBLE', 'EN_PANNE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'MANQUANTE'] as EtatMachine[],
  prioritePanne: ['FAIBLE', 'MOYENNE', 'HAUTE', 'URGENTE'] as PrioritePanne[],
  statutPanne: ['OUVERTE', 'EN_COURS', 'RESOLUE', 'ANNULEE'] as StatutPanne[],
  statutCours: ['PROGRAMME', 'EN_COURS', 'TERMINE', 'ANNULE'] as StatutCours[],
};

export interface Utilisateur { id: number; identifiant: string; role: string }

export interface Adherent {
  id: number; nom: string; prenom: string; telephone: string | null; email: string | null;
  date_naissance: string | null; adresse: string | null; date_inscription: string; actif: boolean;
  abonnement_valide?: boolean;
}
export interface TypeAbonnement {
  id: number; libelle: string; duree_jours: number; prix: number; description: string | null; actif: boolean;
}
export interface Abonnement {
  id: number; date_debut: string; date_fin: string; statut: StatutAbonnement; prix_applique: number;
  adherent_id: number; type_abonnement_id: number;
  adherent_nom?: string; adherent_prenom?: string; type_libelle?: string;
  total_paye?: number; reste_a_payer?: number;
}
export interface Paiement {
  id: number; abonnement_id: number; montant: number; mode_paiement: ModePaiement; reference: string | null;
  observation: string | null; date_paiement: string;
  adherent_id?: number; adherent_nom?: string; adherent_prenom?: string; type_abonnement?: string;
}
export interface Categorie { id: number; nom: string; description: string | null; nb_machines?: number }
export interface Machine {
  id: number; nom: string; reference: string; marque: string | null; modele: string | null;
  date_achat: string | null; emplacement: string | null; etat: EtatMachine; observations: string | null;
  categorie_id: number; categorie_nom?: string;
}
export interface Panne {
  id: number; titre: string; description: string; priorite: PrioritePanne; statut: StatutPanne;
  date_declaration: string; date_resolution: string | null; machine_id: number; declarant_id: number;
  machine_nom?: string; machine_reference?: string; declarant_nom?: string; declarant_prenom?: string;
}
export interface Maintenance {
  id: number; titre: string; description: string | null; statut: StatutMaintenance;
  date_planifiee: string | null; date_debut: string | null; date_fin: string | null;
  cout: number; resultat: string | null; machine_id: number; panne_id: number | null; employe_id: number | null;
  machine_nom?: string; machine_reference?: string; employe_nom?: string; employe_prenom?: string;
}
export interface Employe {
  id: number; nom: string; prenom: string; telephone: string | null; email: string | null; poste: string;
  date_embauche: string | null; actif: boolean; est_coach?: boolean; specialite?: string | null; certification?: string | null;
}
export interface Coach { id: number; employe_id: number; specialite: string; certification: string | null; nom?: string; prenom?: string }
export interface Cours {
  id: number; nom: string; description: string | null; date_heure_debut: string; date_heure_fin: string;
  capacite_max: number; salle: string | null; statut: StatutCours; coach_id: number;
  coach_nom?: string; coach_prenom?: string; nb_inscrits?: number; places_restantes?: number;
}
export interface Inscription {
  id: number; adherent_id: number; cours_id: number; statut: StatutInscription; date_inscription: string;
  adherent_nom?: string; adherent_prenom?: string; cours_nom?: string; date_heure_debut?: string;
}
export interface Presence {
  id: number; adherent_id: number; type_acces: 'LIBRE' | 'COURS'; date_heure_entree: string;
  date_heure_sortie: string | null; inscription_id: number | null;
  adherent_nom?: string; adherent_prenom?: string; cours_nom?: string | null;
}
export interface Historique {
  adherent: Adherent; abonnements: Abonnement[]; paiements: Paiement[];
  inscriptions: Inscription[]; presences: Presence[];
}
export interface Dashboard {
  adherents: { total: number; actifs: number };
  abonnements: { par_statut: { statut: StatutAbonnement; nombre: number }[]; expirent_sous_7_jours: number };
  revenus: { total: number; mois_en_cours: number };
  machines: { par_etat: { etat: EtatMachine; nombre: number }[]; pannes_non_resolues: number };
  cours: { a_venir: number };
  presences: { aujourdhui: number; dans_la_salle: number };
}
export interface Financieres {
  annee: number; revenus_total: number; reste_a_encaisser: number; cout_maintenance: number;
  revenus_par_mois: { mois: string; total: number; nb_paiements: number }[];
  revenus_par_mode_paiement: { mode_paiement: ModePaiement; total: number; nb_paiements: number }[];
}
