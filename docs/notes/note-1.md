# Note 1 : consignes et grille

## Le principe

Je te donne un module du Legacy que tu n'as jamais ouvert en Séance, et une extraction de ce module en couches **présentée comme produite par le Familier**. Elle compile et ses tests passent. Elle contient pourtant des défauts typiques de ce qu'un agent produit quand rien ne le cadre.

Un agent extrait un module en quelques minutes : je ne note donc pas l'extraction, je note **ton jugement** sur elle. En partie A tu la critiques, en partie B tu la corriges.

### Les règles

- **Individuelle.** Toute communication entre étudiants est interdite pendant l'épreuve.
- **Documents et Familier autorisés**, agents compris. Une seule règle : tu dois pouvoir expliquer et défendre tout ce que tu rends.
- **Durée** : 1 h 30, de 14h30 à 16h00. Le sujet s'ouvre sur Moodle à 14h30.
- **Rendu** : ton dépôt Git, avec le tag `note-1` posé avant 16h00, et son lien sur Moodle.

## Le déroulé

| Repère | Ce que tu fais |
|---------------|------------------------------------------|
| 14h25, pendant les consignes | dépôt GitHub privé créé, vide, et compte formateur invité (« Le rendu », point 1) |
| 14h30, 3 min | `npm run recuperer -- note-1` depuis ton dépôt du cours, tests verts, premier `git push` réussi |
| 14h33, 23 min | **Partie A** : la critique, dans le tableau de `docs/critique.md` |
| 14h56, 61 min | **Partie B** : la correction, le use case ajouté, un ADR, le Journal du Familier |
| 15h57, 3 min | tag `note-1`, `git push --tags`, lien sur Moodle |

Les repères t'aident à répartir ton temps ; seul le tag de 16h00 compte.

## La grille

| Partie | Critère | Points |
|----------------|------------------------------------------|--------|
| A, critique (40) | **Défauts trouvés** : chaque défaut de l'extraction, avec le fichier et la ligne. Les quatre types annoncés valent le plus : Domain anémique, port qui expose un type de base de données, règle métier dans le contrôleur, test qui mocke tout | 25 |
| | **Justification** : pour chaque défaut, la règle du cours qu'il enfreint et ce qu'il coûte | 15 |
| B, correction (60) | **Règle de dépendance respectée et tests d'architecture verts** : dependency-cruiser installé (`npm run arch`), aucune violation, aucun type de base de données et aucun code HTTP dans l'Application | 15 |
| | **Domain riche** : les règles du module dans les entités et value objects, testées sans base ni HTTP | 10 |
| | **Use case ajouté avec un test sans infrastructure** : le use case demandé par le sujet, dans l'Application, et son test avec un adapter en mémoire, sans mock | 15 |
| | **ADR** : un ADR sur une décision de ta correction (modèle `docs/modeles/adr.md`) | 10 |
| | **Journal du Familier** : 3 à 5 entrées « décision » (modèle `docs/modeles/journal-du-familier.md`) | 10 |
| | **Total** | **100** |

Un défaut cité sans justification rapporte ses points de la ligne « défauts trouvés », pas ceux de la ligne « justification ». Si `npm test` ou `npm run typecheck` échoue au tag, je lis quand même ton code, mais les trois critères de code de la partie B (règle de dépendance, Domain riche, use case ajouté) plafonnent à la moitié de leurs points. Une correction qui fait passer les tests en les affaiblissant (`expect` retiré, test sauté) ne rapporte rien sur le critère concerné.

## Le rendu

Dès le début, pour que le rendu de 16h00 ne te réserve pas de surprise :

1. pendant les consignes, à 14h25 : sur github.com, crée un dépôt **privé** nommé `note-1-<ton-pseudo-github>`, vide, et invite le compte formateur indiqué sur Moodle ;
2. à 14h30, une fois le dossier récupéré, dans `~/note-1` : `git remote add origin <url du dépôt>` puis `git push -u origin main`. Si le push demande des identifiants, lance-le depuis le terminal de VS Code, qui utilise ta connexion GitHub.

À la fin :

```bash
git add -A && git commit -m "Note 1"
git tag note-1
git push && git push --tags
```

Puis colle le lien du dépôt sur Moodle. Si le push échoue à la fin malgré tout : `git bundle create ~/note-1.bundle --all`, et dépose ce fichier sur Moodle avant 16h00 (`explorer.exe ~` l'ouvre dans l'Explorateur sous Windows).

Seuls comptent le tag `note-1` et ce qu'il désigne : un commit poussé après 16h00 n'est pas lu.
