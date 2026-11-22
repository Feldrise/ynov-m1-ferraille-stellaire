# Séance 5 : deux services, une queue, un Incident de Cycle

Lundi 8 février 2027, 8h00 à 12h00 et 13h00 à 15h00. De 10h20 à 14h50, c'est la Note 3.

| Heure | Bloc | Énoncé |
|---|---|---|
| 8h50 | Atelier asynchrone (70 min) | [La Vente conclue traverse la station](01-atelier-asynchrone.md) |
| 10h10 | Consignes de la Note 3 (10 min) | [`docs/notes/note-3.md`](../../docs/notes/note-3.md) |

La Revue piégée n°4 (8h00) se lit sur Moodle. Votre fiche d'Incident de Cycle vous est remise au tirage, à 11h00.

En binôme, dans le dépôt du binôme. En arrivant, conteneurs démarrés (`npm run up`, puis `npm run doctor`), récupérez les énoncés du jour depuis le dépôt du cours, sur le poste qui code ; la commande est la même sur les deux postes, qui ont chacun le remote `cours` depuis la Séance 3 :

<!-- parcours : deux postes -->
```bash
git pull --no-rebase --no-edit cours main
```

`--no-rebase --no-edit` fusionne les énoncés du jour avec vos commits, sans ouvrir d'éditeur : la commande marche que vous ayez commité depuis la dernière Séance ou non.

Les fichiers fournis sont dans [`fournitures/`](fournitures/) : `bourse/` pour le Service Bourse, `service-inventaire/` pour le nouveau service, tout entier. Comme en Séance 4, les tests fournis se terminent par `-test.ts` : la copie leur rend leur nom en `.test.ts`.

Trois terminaux servent toute la journée : le Service Bourse (`node service-bourse/src/main.ts`, port 3100), le Service Inventaire (`node service-inventaire/src/main.ts`, port 3200), et le vôtre. RabbitMQ a une interface d'administration : http://127.0.0.1:15672, `guest` et `guest`.
