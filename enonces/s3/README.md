# Séance 3 : exposer le Service Bourse en API REST

Lundi 18 janvier 2027, 8h15 à 12h15 et 13h15 à 14h15.

| Heure | Bloc | Énoncé |
|---|---|---|
| 9h00 | Atelier routes et validation (60 min) | [Les routes de la Bourse, validées par Zod](01-atelier-routes-et-validation.md) |
| 10h10 | Gestion centralisée des erreurs (40 min) | [Des refus que le Joueur comprend](02-erreurs-centralisees.md) |
| 10h50 | Documentation OpenAPI et atelier Familier n°3 (50 min) | [Un contrat exact](03-openapi-et-familier-3.md) |
| 13h15 | Atelier authentification (25 min) | [L'acheteur, c'est le Joueur du jeton](04-authentification.md) |

La Revue piégée n°2 (8h15), le Ticket du Game Designer (10h10) et le Boss n°2 (13h40) se lisent sur Moodle, à l'heure.

Aujourd'hui, tu travailles **en binôme**, et ce binôme reste le même jusqu'à la Note 3. Un seul dépôt par binôme : celui que vous choisissez à l'étape 0 du premier atelier.

Avant 9h00, conteneurs démarrés : `npm run up`, puis `npm run doctor`.

Les fichiers fournis sont dans [`fournitures/`](fournitures/), un dossier par atelier. Chaque énoncé dit lesquels copier, et où. Les tests fournis se terminent par `-test.ts` pour que `npm test` ne les lance pas ici : la copie leur rend leur nom en `.test.ts`.

Pour lancer le Service Bourse : `node service-bourse/src/main.ts` (port 3100, contrat sur http://127.0.0.1:3100/docs). Pour repartir du jeu de démonstration : `node service-bourse/src/main.ts --reinitialiser`.
