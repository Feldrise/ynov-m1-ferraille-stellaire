# Atelier Familier n°2 : le cadre qui guide l'agent

Seul ou en binôme, 45 minutes : 3 minutes pour récupérer le dépôt, 36 minutes de travail, 6 minutes de mise en commun.

Tu donnes deux fois la même demande à ton Familier, sur le même code : une fois sur un dépôt **sans cadre**, une fois après lui avoir donné un **glossaire**, deux **ADR** et des **tests d'architecture**. Puis on compare. Le but n'est pas d'obtenir le bon code : c'est de mesurer ce que le cadre change.

## Récupérer le dépôt (3 min)

Le dépôt de l'atelier est le Service Bourse tel qu'on l'a écrit ce matin, sans glossaire, sans ADR, sans `AGENTS.md` et sans tests d'architecture. Il s'installe **hors** de ton dépôt du cours, pour que ton Familier ne voie pas le `GLOSSARY.md` et l'`AGENTS.md` du cours. Depuis la racine de ton dépôt du cours, conteneurs démarrés :

```bash
npm run recuperer -- familier-2
cd ~/familier-2
npm test
code .
```

`npm test` doit être vert. Si tu as changé un port dans le `.env` de ton dépôt du cours, `recuperer` l'a recopié dans `~/familier-2` : les tests parlent aux mêmes conteneurs. Ouvre ton Familier dans la fenêtre de `~/familier-2`, et seulement là.

## Étape 1 : la demande, sans cadre (6 min)

Ouvre une **nouvelle** conversation, en mode agent si ton outil en a un, et envoie exactement :

```text
Ajoute le use case « Retirer une Annonce » : le vendeur retire son Annonce de la Bourse aux épaves.
```

N'ajoute aucune précision et accepte ce qu'il propose. Si la génération dépasse 3 minutes, arrête-la et garde ce qui est écrit. Puis range son résultat sur une branche :

```bash
git switch -c sans-cadre && git add -A && git commit -m "Retirer une Annonce, sans cadre" && git switch main
```

## Étape 2 : le relevé, sans cadre (3 min)

Un script fait les recherches pour toi ; toi, tu lis et tu remplis la colonne « sans cadre », d'un mot par case :

```bash
bash ~/ferraille/enonces/s2/fournitures/relever.sh sans-cadre
```

Chaque partie de sa sortie répond à une ligne de la grille (ton dépôt du cours est dans `~/ferraille`, cloné en Séance 1).

| Question (partie du relevé) | Sans cadre | Avec cadre |
|---|---|---|
| Quel nom a-t-il donné à l'action : retirer, annuler, supprimer, delete... ? (1) | | |
| Où est la règle « seul le vendeur retire son Annonce » : Domain, use case, adapter, nulle part ? (2) | | |
| L'Annonce est-elle effacée, ou passe-t-elle au statut retirée ? (3 et 4) | | |
| Que dit dependency-cruiser ? (5 et 7) | | |

Les autres parties du relevé (Annonce déjà vendue, test sans mock, `npm test` et `typecheck`) se lisent à la mise en commun.

## Étape 3 : le glossaire de la Bourse (6 min)

Deux termes sont déjà écrits, Objet et Vente conclue : copie-les, puis demande à ton Familier de **t'interroger** pour les deux autres au lieu d'écrire à ta place :

```bash
cp ~/ferraille/enonces/s2/fournitures/glossaire-de-depart.md GLOSSARY.md
```

```text
Interroge-moi, une question à la fois, pour compléter GLOSSARY.md, le vocabulaire de la Bourse aux épaves
de ce dépôt, avec deux termes exactement : Annonce (et ses statuts), Retirer une Annonce. Même forme que
les termes déjà écrits : une définition d'une ou deux phrases, et une ligne « _Avoid_: » avec les mots à ne
pas employer à sa place. N'écris le fichier qu'à la fin.
```

Tu réponds avec les mots du glossaire du cours ; tu tranches quand il propose un synonyme. Relis le fichier avant de le garder.

## Étape 4 : deux ADR, dont un à écrire (6 min)

Les ADR vont dans `docs/adr/`. Le second est donné : copie-le et lis-le.

```bash
mkdir -p docs/adr
cp ~/ferraille/enonces/s2/fournitures/adr-0002-une-annonce-n-est-jamais-effacee.md docs/adr/0002-une-annonce-n-est-jamais-effacee.md
```

Le premier, `docs/adr/0001-<la-decision>.md`, c'est toi qui le décides : **la règle de dépendance du Service Bourse** (le Domain ne dépend de rien, l'Application déclare des ports, l'Infrastructure les implémente). Son contexte est donné, reprends-le tel quel : « Le Legacy calculait la Taxe de Bourse dans ses routes, au milieu du SQL : impossible de la tester sans PostgreSQL, et trois endroits à modifier pour le Ticket du premier week-end du Cycle. Le Service Bourse doit se tester sans base ni HTTP, et changer de base sans toucher aux règles. » Même méthode que le glossaire pour la décision et ses conséquences, une question à la fois, avec le modèle `~/ferraille/docs/modeles/adr.md`. Un ADR tient sur un écran. Le Familier rédige ; toi, tu décides et tu relis.

## Étape 5 : l'AGENTS.md et les tests d'architecture (3 min)

À la racine de `~/familier-2`, crée `AGENTS.md` :

```markdown
# Consignes pour les agents

Avant de proposer ou de modifier du code, lis :

- `GLOSSARY.md` : le vocabulaire de la Bourse aux épaves, à employer mot pour mot dans le code et les tests ;
- `docs/adr/` : les décisions prises et leur pourquoi.

Avant de rendre la main : `npm test`, `npm run typecheck` et `npm run arch` doivent passer.
```

Il ne décrit pas l'architecture : il dit où elle est expliquée. Si ton outil lit un autre fichier (`.github/copilot-instructions.md`, `CLAUDE.md`), mets-y la même chose. Puis les tests d'architecture, et le cadre sur `main` :

```bash
cp ~/ferraille/enonces/s2/fournitures/dependency-cruiser.cjs .dependency-cruiser.cjs
npm pkg set scripts.arch="depcruise src --config .dependency-cruiser.cjs"
npm run arch
git add -A && git commit -m "Cadre : glossaire, ADR, AGENTS.md, tests d'architecture"
```

Lis les règles du fichier : ce sont celles de la règle de dépendance, vérifiées à chaque build.

## Étape 6 : la même demande, avec le cadre (12 min)

**Nouvelle** conversation, même phrase, mot pour mot, toujours sans précision. Puis :

```bash
git switch -c avec-cadre && git add -A && git commit -m "Retirer une Annonce, avec cadre" && git switch main
bash ~/ferraille/enonces/s2/fournitures/relever.sh avec-cadre
```

Remplis la colonne « avec cadre ». Garde ta grille : c'est le genre d'observation qu'on met dans un Journal du Familier.

## Mise en commun (6 min)

Deux binômes comparent leurs deux colonnes au tableau. Sur quelles lignes le résultat a-t-il changé ? Qu'est-ce qui a changé grâce au glossaire, grâce aux ADR, grâce aux tests d'architecture ? Ce qui n'a pas changé : qu'aurait-il fallu écrire, et où ?
