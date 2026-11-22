# Ferraille Stellaire : le backend

*Ferraille Stellaire*, du studio Lune Rouillée, est un jeu d'extraction multijoueur : chaque Joueur part en Expédition dans une Épave orbitale et ne garde son butin que s'il s'en extrait vivant. Les Objets rapportés se revendent entre Joueurs sur la **Bourse aux épaves**, en Crédits, moins la Taxe de Bourse.

Ce dépôt contient le **Legacy**, le backend actuel du jeu. Il fonctionne, et il a des défauts : à toi de les trouver. Au fil du cours, tu en extrais le **Service Bourse**, puis le **Service Inventaire**. Le vocabulaire du jeu et du cours est dans [`GLOSSARY.md`](GLOSSARY.md).

## Démarrer

L'installation complète (Docker, Node.js 24, GitHub Copilot) est dans [`docs/installation.md`](docs/installation.md), et chaque message d'erreur dans [`docs/depannage.md`](docs/depannage.md). Une fois le poste prêt :

```bash
npm ci            # dépendances de tout le cours (une seule fois)
npm run up        # PostgreSQL, Redis et RabbitMQ, puis le jeu de données du Legacy
npm run doctor    # diagnostic du poste : chaque problème avec son action
npm run legacy    # le Legacy sur http://127.0.0.1:3000
```

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm run up` | démarre les trois services (Docker Compose) et charge le jeu de données |
| `npm run down` | arrête et efface les services et leurs données |
| `npm run reinitialiser` | recharge le jeu de données sans redémarrer les services |
| `npm run doctor` | vérifie Node.js, Docker, les ports et les connexions |
| `npm run legacy` | lance le Legacy (`Ctrl+C` pour l'arrêter) ; `PORT=3001 npm run legacy` pour un autre port |
| `npm run dupe` | reproduit la Dupe contre le Legacy lancé ; `npm run dupe -- --bourse` la tente contre le Service Bourse et le Service Inventaire lancés (Séance 5) |
| `npm run jeton -- <Joueur>` | un jeton d'accès de développement pour le Service Bourse (Séance 3), valable 15 minutes |
| `npm run forger` | forge un jeton pour le Legacy avec son secret ; `-- --bourse` le tente contre le Service Bourse |
| `npm run charge` | rejoue un lancement de Cycle contre le Service Bourse lancé (Séance 4) : requêtes par seconde, temps de réponse |
| `npm run recette` | la recette automatisée de la Note 2, contre le Service Bourse lancé avec `--reinitialiser` : un score sur 40 |
| `npm run recuperer -- <nom>` | installe dans `~/<nom>` un dossier distribué pendant une Séance (atelier, Note), quand je te le dis |
| `npm run typecheck` | vérifie les types TypeScript et la syntaxe exécutable par Node.js |
| `npm test` | lance les tests (Vitest) |

Les services écoutent sur `127.0.0.1` : PostgreSQL sur le port 5432 (base, utilisateur et mot de passe `ferraille`), Redis sur 6379, RabbitMQ sur 5672, avec son interface web sur http://127.0.0.1:15672 (`guest` / `guest`). Un port déjà pris se change dans un fichier `.env` (voir `.env.example`).

## Le Legacy

```text
legacy/
  src/serveur.ts          démarrage du serveur Fastify
  src/db.ts               connexion à PostgreSQL
  src/routes/             comptes, inventaire, Bourse aux épaves, matchmaking, classements, Contrats de réparation,
                          Assurances de cargaison
  sql/schema.sql          les tables
  sql/donnees.sql         le jeu de données : 12 Joueurs, 60 Objets, Annonces, Ventes conclues, Expéditions
scripts/                  diagnostic, rechargement des données, script de la Dupe, récupération d'un dossier distribué
```

Les Joueurs du jeu de données ont tous le mot de passe `ferraille` : `kessa`, `bricolo`, `vortex`, `nadir`, `orbitale`, `zephyr`, `grappin`, `lyra`, `mistral`, `sonde-9`, `rivet`, `comete`.

| Route | Rôle |
|---|---|
| `POST /inscription`, `POST /connexion`, `GET /moi` | comptes ; la connexion rend un jeton à passer dans `Authorization: Bearer <jeton>` |
| `GET /joueurs/:id/inventaire`, `GET /objets/:id` | inventaire |
| `GET /annonces`, `GET /annonces/:id`, `POST /annonces`, `DELETE /annonces/:id`, `POST /annonces/:id/achat` | Bourse aux épaves |
| `POST /matchmaking/file`, `GET /matchmaking/file`, `DELETE /matchmaking/file` | matchmaking des Expéditions |
| `GET /classements/extractions`, `GET /classements/bourse` | classements |
| `GET /stations`, `GET /contrats-reparation`, `POST /contrats-reparation`, `POST /contrats-reparation/:id/livraison`, `POST /contrats-reparation/:id/annulation` | Contrats de réparation |
| `GET /assurances`, `POST /assurances`, `POST /assurances/:id/sinistre` | Assurances de cargaison |

Par exemple :

```bash
curl -s -X POST http://127.0.0.1:3000/connexion -H 'content-type: application/json' \
  -d '{"pseudo":"kessa","motDePasse":"ferraille"}'
```

## Les énoncés

Les énoncés d'atelier de chaque Séance sont dans [`enonces/`](enonces/) : [Séance 1](enonces/s1/README.md), [Séance 2](enonces/s2/README.md), [Séance 3](enonces/s3/README.md), [Séance 4](enonces/s4/README.md), [Séance 5](enonces/s5/README.md). Les consignes et la grille de chaque Note sont dans [`docs/notes/`](docs/notes/). Ton code du Service Bourse va dans `service-bourse/`, à la racine du dépôt, et celui du Service Inventaire, à partir de la Séance 5, dans `service-inventaire/`.

## Le Familier

L'IA est autorisée partout dans ce cours, agents compris, Notes comprises : c'est le **Familier**. Une seule règle : tu dois pouvoir expliquer et défendre tout ce que tu rends. Chaque Note comporte un Journal du Familier ([`docs/modeles/journal-du-familier.md`](docs/modeles/journal-du-familier.md)) et des ADR ([`docs/modeles/adr.md`](docs/modeles/adr.md)).

L'[`AGENTS.md`](AGENTS.md) de ce dépôt reste court : il renvoie l'agent vers le glossaire et les décisions de [`docs/adr/`](docs/adr/). C'est en les écrivant que tu lui transmets l'architecture.
