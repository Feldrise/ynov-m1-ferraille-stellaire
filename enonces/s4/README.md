# Séance 4 : protéger la Bourse

Vendredi 22 janvier 2027, 8h15 à 12h00 et 13h00 à 15h15. L'après-midi, c'est la Note 2.

| Heure | Bloc | Énoncé |
|---|---|---|
| 9h05 | Atelier refresh tokens (60 min) | [Une session qui survit au quart d'heure, pas au vol](01-refresh-tokens.md) |
| 10h15 | Rate limiting et throttling (50 min) | [Le bot qui achète en 200 ms](02-rate-limiting.md) |
| 11h05 | Cache (55 min) | [Le lancement de Cycle](03-cache.md) |
| 13h00 | Consignes de la Note 2 (10 min) | [`docs/notes/note-2.md`](../../docs/notes/note-2.md) |

La Revue piégée n°3 (8h15), le Ticket du Game Designer (10h15) et le sujet de la Note 2 (13h10) se lisent sur Moodle, à l'heure.

En binôme, comme depuis la Séance 3, dans le dépôt du binôme. En arrivant, conteneurs démarrés (`npm run up`, puis `npm run doctor`), récupérez les énoncés du jour depuis le dépôt du cours, sur le poste qui code ; la commande est la même sur les deux postes, qui ont chacun le remote `cours` depuis la Séance 3 :

<!-- parcours : deux postes -->
```bash
git pull --no-rebase --no-edit cours main
```

`--no-rebase --no-edit` fusionne les énoncés du jour avec vos commits, sans ouvrir d'éditeur : la commande marche que vous ayez commité depuis la dernière Séance ou non.

Les fichiers fournis sont dans [`fournitures/`](fournitures/), un dossier par atelier. Les tests fournis se terminent par `-test.ts` : la copie leur rend leur nom en `.test.ts`.

Deux outils servent toute la Séance :

- `npm run charge` rejoue un **lancement de Cycle** contre le Service Bourse (50 Joueurs simultanés pendant 10 secondes sur la liste des Annonces) ;
- `npm run recette` est la **recette automatisée de la Note 2** : elle interroge votre Service Bourse par HTTP, sans lire son code, et donne un score sur 40. Lancez-la quand vous voulez, ce matin compris : elle vous dit ce qui manque.

Pour lancer le Service Bourse : `node service-bourse/src/main.ts` (port 3100, contrat sur http://127.0.0.1:3100/docs). Avec `--reinitialiser`, il repart du jeu de démonstration.
