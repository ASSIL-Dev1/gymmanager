# GymManager – Frontend

React 18 + TypeScript + Vite + Tailwind CSS (stack définie dans le cahier des charges, §8).
Consomme l'API du dossier `gymmanager-backend` (Express + PostgreSQL, JWT).

## Installation
```bash
# 1. Backend et base démarrés (voir leurs README) : API sur http://localhost:3000
# 2. Frontend
cd gymmanager-frontend
npm install
cp .env.example .env      # Windows : copy .env.example .env
npm run dev               # http://localhost:5173
```
Connexion : le compte créé avec `npm run create-admin -- admin MotDePasse123` côté backend.

En développement, Vite redirige `/api` vers `http://localhost:3000` (proxy, aucun souci CORS).
Si votre API tourne ailleurs : `VITE_BACKEND_URL=http://hote:port npm run dev`.
Pour un déploiement : `npm run build` puis servir `dist/` ; renseigner `VITE_API_URL` avec l'URL publique de l'API.

## Pages et exigences du cahier des charges
| Page | Route | Exigences |
|---|---|---|
| Connexion | `/connexion` | F01 (message d'échec générique), F03 |
| Tableau de bord | `/` | F18–F22 (4 indicateurs : adhérents, abonnements actifs, expirés, total paiements – rechargés à chaque ouverture), F23 |
| Adhérents (liste, recherche, formulaire) | `/adherents` | F04, F06, F07, F08, RG01 |
| Fiche adhérent | `/adherents/:id` | F05 (abonnements, paiements, cours, présences de cet adhérent) |
| Abonnements | `/abonnements` | F09–F13, RG02, RG03 |
| Paiements | `/paiements` | F14–F17, RG04, RG08 (anti double clic) |
| Modules complémentaires du backend | `/offres` `/cours` `/presences` `/machines` `/pannes` `/maintenances` `/personnel` | non exigés par le cahier des charges V1.2, mais exposés par l'API |

- Déconnexion : bouton en bas du menu. Une réponse 401 (token expiré) ramène automatiquement à la connexion.
- Erreurs : messages clairs (F24), champs saisis conservés, aucun détail technique affiché.
- Dates affichées en JJ/MM/AAAA ; devise unique configurable via `VITE_CURRENCY` (MAD par défaut).

## Écarts entre le cahier des charges et le backend livré (à valider avec l'équipe)
Le frontend suit le backend réel lorsque les deux divergent :
1. **Suppression d'un adhérent (F07/RG06)** : le backend *désactive* (`actif=false`) au lieu de supprimer, et ne refuse jamais selon les paiements. Le bouton est donc libellé « Désactiver » avec confirmation.
2. **Abonnement (F10)** : le backend calcule `date_fin = date_début + durée du type` et exige un *type d'abonnement* (le cahier ne prévoit que deux dates). Le formulaire de création choisit un type + une date de début et affiche la fin prévue ; la modification permet de changer début, fin et statut.
3. **Paiement (F15/F16)** : le backend exige un *mode de paiement*, accepte une référence / observation, et refuse un paiement supérieur au reste à payer. Le formulaire les intègre.
4. **Suppression/modification de paiements** : aucune, conformément au cahier.
5. **Rôles** : seul le compte `ADMIN` existe (voir README backend, « Points à valider »).
6. **F25 (filtre de période du tableau de bord, facultatif)** : non implémenté ; la page Paiements filtre par période.
