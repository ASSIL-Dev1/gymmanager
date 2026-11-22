/**
 * Documentation OpenAPI 3 (Swagger UI sur /api-docs).
 * Les corps de requete sont generes automatiquement depuis src/schemas.js :
 * la doc reste donc toujours alignee sur la validation reelle.
 */
const S = require('../schemas');

function toJsonSchema(schema, partial = false) {
  const properties = {};
  const required = [];
  for (const [key, r] of Object.entries(schema)) {
    let p;
    switch (r.type) {
      case 'string': p = { type: 'string', maxLength: r.max }; break;
      case 'email': p = { type: 'string', format: 'email', maxLength: r.max }; break;
      case 'int': p = { type: 'integer', minimum: r.min }; break;
      case 'number': p = { type: 'number', minimum: r.min, exclusiveMinimum: r.gt }; break;
      case 'bool': p = { type: 'boolean' }; break;
      case 'date': p = { type: 'string', format: 'date', example: '2026-01-31' }; break;
      case 'datetime': p = { type: 'string', example: '2026-01-31T18:00:00' }; break;
      case 'enum': p = { type: 'string', enum: r.values }; break;
      default: p = {};
    }
    if (r.nullable) p.nullable = true;
    properties[key] = p;
    if (r.required && !partial) required.push(key);
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}) };
}

const paths = {};

/**
 * route('get', '/adherents/:id', 'Adherents', 'Resume', { body: S.adherent, partial: true,
 *        query: ['q', 'actif:boolean'], list: true, secured: false, status: 201 })
 */
function route(method, path, tag, summary, opts = {}) {
  const { body, partial, query = [], list = false, secured = true, status = 200, noBody } = opts;
  const parameters = [];
  for (const m of path.match(/:(\w+)/g) || []) {
    parameters.push({ name: m.slice(1), in: 'path', required: true, schema: { type: 'integer' } });
  }
  for (const q of query) {
    if (typeof q === 'string') {
      const [name, type = 'string'] = q.split(':');
      parameters.push({ name, in: 'query', schema: { type } });
    } else {
      parameters.push({ in: 'query', ...q });
    }
  }
  if (list) {
    parameters.push({ name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } });
    parameters.push({ name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } });
  }
  const swaggerPath = path.replace(/:(\w+)/g, '{$1}');
  paths[swaggerPath] = paths[swaggerPath] || {};
  paths[swaggerPath][method] = {
    tags: [tag],
    summary,
    parameters,
    ...(body && !noBody
      ? { requestBody: { required: true, content: { 'application/json': { schema: toJsonSchema(body, partial) } } } }
      : {}),
    security: secured ? [{ bearerAuth: [] }] : [],
    responses: {
      [status]: { description: 'Succes' },
      400: { description: 'Donnees invalides' },
      ...(secured ? { 401: { description: 'Non authentifie' }, 403: { description: 'Droits insuffisants' } } : {}),
      404: { description: 'Ressource introuvable' },
      409: { description: 'Conflit avec une regle de gestion / contrainte de la base' },
    },
  };
}

const CRUD_PARTIAL = { partial: true };

// ---------- Authentification ----------
route('post', '/auth/login', 'Authentification', 'Se connecter (renvoie un token JWT)', { body: S.login, secured: false });
route('post', '/auth/logout', 'Authentification', 'Se deconnecter');
route('get', '/auth/me', 'Authentification', "Utilisateur connecte et son role (verifier les droits d'acces)");

// ---------- Adherents ----------
route('get', '/adherents', 'Adherents', 'Rechercher / lister les adherents', { query: ['q', 'actif:boolean'], list: true });
route('post', '/adherents', 'Adherents', 'Ajouter un adherent', { body: S.adherent, status: 201 });
route('get', '/adherents/:id', 'Adherents', 'Consulter un adherent');
route('put', '/adherents/:id', 'Adherents', 'Modifier un adherent', { body: S.adherent, ...CRUD_PARTIAL });
route('delete', '/adherents/:id', 'Adherents', 'Supprimer = desactiver un adherent (historique conserve)');
route('get', '/adherents/:id/historique', 'Adherents', "Consulter l'historique d'un adherent (abonnements, paiements, cours, presences)");

// ---------- Abonnements ----------
route('get', '/types-abonnement', "Types d'abonnement", "Lister les types d'abonnement", { query: ['actif:boolean'] });
route('post', '/types-abonnement', "Types d'abonnement", "Creer un type d'abonnement (ADMIN)", { body: S.typeAbonnement, status: 201 });
route('get', '/types-abonnement/:id', "Types d'abonnement", "Consulter un type d'abonnement");
route('put', '/types-abonnement/:id', "Types d'abonnement", "Modifier un type d'abonnement (ADMIN)", { body: S.typeAbonnement, ...CRUD_PARTIAL });
route('delete', '/types-abonnement/:id', "Types d'abonnement", "Desactiver un type d'abonnement (ADMIN)");

route('get', '/abonnements', 'Abonnements', 'Consulter les abonnements', { query: ['adherent_id:integer', 'type_abonnement_id:integer', 'statut'], list: true });
route('post', '/abonnements', 'Abonnements', "Creer un abonnement (date_fin et prix calcules depuis le type)", { body: S.abonnementCreate, status: 201 });
route('get', '/abonnements/expirations', 'Abonnements', 'Suivre les expirations (abonnements actifs se terminant bientot)', { query: ['jours:integer'] });
route('get', '/abonnements/:id', 'Abonnements', 'Consulter un abonnement (avec total paye et reste a payer)');
route('put', '/abonnements/:id', 'Abonnements', 'Modifier un abonnement (dates, statut)', { body: S.abonnementUpdate, ...CRUD_PARTIAL });
route('get', '/abonnements/:id/validite', 'Abonnements', "Verifier la validite d'un abonnement");
route('post', '/abonnements/:id/renouveler', 'Abonnements', 'Renouveler un abonnement', { body: S.renouvellement, status: 201 });

// ---------- Paiements ----------
route('get', '/paiements', 'Paiements', "Consulter les paiements / historique financier", {
  query: ['abonnement_id:integer', 'adherent_id:integer', 'mode_paiement', 'du', 'au'], list: true });
route('post', '/paiements', 'Paiements', 'Enregistrer un paiement', { body: S.paiement, status: 201 });
route('get', '/paiements/revenus', 'Paiements', 'Calculer les revenus', {
  query: ['du', 'au', { name: 'groupe', schema: { type: 'string', enum: ['jour', 'mois', 'mode'] } }] });
route('get', '/paiements/:id', 'Paiements', 'Consulter un paiement');

// ---------- Machines ----------
route('get', '/categories-machines', 'Machines', 'Lister les categories de machines');
route('post', '/categories-machines', 'Machines', 'Creer une categorie', { body: S.categorie, status: 201 });
route('get', '/categories-machines/:id', 'Machines', 'Consulter une categorie');
route('put', '/categories-machines/:id', 'Machines', 'Modifier une categorie', { body: S.categorie, ...CRUD_PARTIAL });
route('delete', '/categories-machines/:id', 'Machines', 'Supprimer une categorie (ADMIN, refuse si utilisee)');

route('get', '/machines', 'Machines', 'Consulter les machines', { query: ['q', 'etat', 'categorie_id:integer'], list: true });
route('post', '/machines', 'Machines', 'Ajouter une machine', { body: S.machine, status: 201 });
route('get', '/machines/etats', 'Machines', "Suivre l'etat des machines (nombre par etat)");
route('get', '/machines/:id', 'Machines', 'Consulter une machine');
route('put', '/machines/:id', 'Machines', 'Modifier une machine', { body: S.machine, ...CRUD_PARTIAL });
route('delete', '/machines/:id', 'Machines', 'Supprimer une machine (ADMIN, refuse si historique)');
route('put', '/machines/:id/etat', 'Machines', "Changer l'etat d'une machine", { body: S.machineEtat });
route('get', '/machines/:id/pannes', 'Machines', "Historique des pannes d'une machine");
route('get', '/machines/:id/maintenances', 'Machines', "Historique de maintenance d'une machine");

// ---------- Pannes & maintenance ----------
route('get', '/pannes', 'Pannes', 'Consulter les pannes', { query: ['statut', 'priorite', 'machine_id:integer'], list: true });
route('post', '/pannes', 'Pannes', 'Declarer une panne (la machine passe EN_PANNE)', { body: S.panne, status: 201 });
route('get', '/pannes/:id', 'Pannes', 'Consulter une panne');
route('put', '/pannes/:id', 'Pannes', 'Mettre a jour une panne (statut, priorite...)', { body: S.panneUpdate, ...CRUD_PARTIAL });

route('get', '/maintenances', 'Maintenance', "Consulter l'historique de maintenance", { query: ['statut', 'machine_id:integer', 'employe_id:integer'], list: true });
route('post', '/maintenances', 'Maintenance', 'Planifier une maintenance', { body: S.maintenance, status: 201 });
route('get', '/maintenances/:id', 'Maintenance', 'Consulter une maintenance');
route('put', '/maintenances/:id', 'Maintenance', 'Enregistrer une intervention (cout, resultat, dates...)', { body: S.maintenanceUpdate, ...CRUD_PARTIAL });
route('put', '/maintenances/:id/affecter', 'Maintenance', 'Affecter un employe', { body: S.affectation });
route('post', '/maintenances/:id/demarrer', 'Maintenance', "Demarrer l'intervention (machine EN_MAINTENANCE)");
route('post', '/maintenances/:id/cloturer', 'Maintenance', 'Cloturer la maintenance (panne resolue, machine DISPONIBLE)', { body: S.cloture });
route('post', '/maintenances/:id/annuler', 'Maintenance', 'Annuler une maintenance');

// ---------- Personnel ----------
route('get', '/employes', 'Personnel', 'Consulter le personnel', { query: ['q', 'poste', 'actif:boolean'], list: true });
route('post', '/employes', 'Personnel', 'Ajouter un employe (ADMIN)', { body: S.employe, status: 201 });
route('get', '/employes/:id', 'Personnel', 'Consulter un employe');
route('put', '/employes/:id', 'Personnel', 'Modifier un employe (ADMIN)', { body: S.employe, ...CRUD_PARTIAL });
route('delete', '/employes/:id', 'Personnel', 'Supprimer = desactiver un employe (ADMIN)');
route('get', '/coachs', 'Personnel', 'Lister les coachs');
route('post', '/coachs', 'Personnel', "Faire d'un employe un coach (ADMIN)", { body: S.coach, status: 201 });
route('get', '/coachs/:id', 'Personnel', 'Consulter un coach (id = employe_id)');
route('put', '/coachs/:id', 'Personnel', 'Modifier specialite / certification (ADMIN)', { body: S.coachUpdate, ...CRUD_PARTIAL });
route('delete', '/coachs/:id', 'Personnel', 'Retirer le statut de coach (ADMIN)');

// ---------- Cours ----------
route('get', '/cours', 'Cours', 'Consulter les cours', { query: ['coach_id:integer', 'statut', 'du', 'au'], list: true });
route('post', '/cours', 'Cours', 'Creer un cours', { body: S.cours, status: 201 });
route('get', '/cours/planning', 'Cours', 'Consulter le planning (cours a venir)', { query: ['coach_id:integer', 'du', 'au'] });
route('get', '/cours/:id', 'Cours', 'Consulter un cours (inscrits, places restantes)');
route('put', '/cours/:id', 'Cours', 'Modifier un cours / gerer la capacite', { body: S.cours, ...CRUD_PARTIAL });
route('delete', '/cours/:id', 'Cours', 'Supprimer un cours (ADMIN, refuse s\'il a des inscriptions)');
route('get', '/cours/:id/inscriptions', 'Cours', "Inscriptions d'un cours");

route('get', '/inscriptions', 'Inscriptions', 'Consulter les inscriptions', { query: ['cours_id:integer', 'adherent_id:integer', 'statut'], list: true });
route('post', '/inscriptions', 'Inscriptions', "Reserver un cours (liste d'attente si complet)", { body: S.inscription, status: 201 });
route('get', '/inscriptions/:id', 'Inscriptions', 'Consulter une inscription');
route('post', '/inscriptions/:id/annuler', 'Inscriptions', 'Annuler une reservation');

// ---------- Presences ----------
route('get', '/presences', 'Presences', "Consulter les presences / historique des visites", {
  query: ['adherent_id:integer', 'type_acces', 'en_cours:boolean', 'du', 'au'], list: true });
route('post', '/presences/entree', 'Presences', 'Enregistrer une entree', { body: S.entree, status: 201 });
route('get', '/presences/:id', 'Presences', 'Consulter une presence');
route('post', '/presences/:id/sortie', 'Presences', 'Enregistrer une sortie');

// ---------- Statistiques ----------
route('get', '/statistiques/dashboard', 'Statistiques', 'Tableau de bord');
route('get', '/statistiques/financieres', 'Statistiques', 'Statistiques financieres (ADMIN)', { query: ['annee:integer'] });
route('get', '/statistiques/adherents', 'Statistiques', 'Statistiques des adherents');
route('get', '/statistiques/machines', 'Statistiques', 'Statistiques des machines');
route('get', '/statistiques/cours', 'Statistiques', 'Statistiques des cours');

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'GymManager API',
    version: '1.0.0',
    description:
      "API REST de gestion d'une salle de sport.\n\n" +
      '**Utilisation :** executez `POST /auth/login`, copiez le `token`, cliquez sur **Authorize** (en haut a droite) ' +
      'et collez-le (sans le mot "Bearer").',
  },
  servers: [{ url: '/api' }],
  tags: [
    'Authentification', 'Adherents', "Types d'abonnement", 'Abonnements', 'Paiements', 'Machines', 'Pannes',
    'Maintenance', 'Personnel', 'Cours', 'Inscriptions', 'Presences', 'Statistiques',
  ].map((name) => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  paths,
};
