# Documentation OpenAPI et atelier Familier n°3 : un contrat exact

En binôme, 50 minutes : 2 minutes de consignes, 42 de travail, 6 de lecture croisée entre binômes.

Le contrat OpenAPI est ce que lira l'équipe du client du jeu, et ce que la recette de la Note 2 confrontera à votre API. Il est **généré** depuis vos schémas Zod : les contraintes y sont exactes par construction. Les mots, eux, ne le sont pas : descriptions et exemples s'écrivent à la main, ou se font écrire par le Familier. Et un exemple faux dans un contrat est pire que pas d'exemple : on le copie.

Aujourd'hui, le Familier écrit ; vous vérifiez chaque phrase **contre l'API qui tourne**.

## Étape 1 : ce que Zod a déjà écrit (3 min)

Service Bourse lancé, ouvrez http://127.0.0.1:3100/docs, puis le contrat brut, http://127.0.0.1:3100/docs/json.

- Trouvez le `prix` de `POST /annonces` : d'où viennent `exclusiveMinimum` et `maximum` ?
- Que manque-t-il pour qu'un développeur du client du jeu s'en serve sans vous appeler ? Cherchez `Default Response`.

## Étape 2 : le test du contrat (2 min)

```bash
cp enonces/s3/fournitures/openapi/contrat-openapi-test.ts service-bourse/test/infrastructure/http/contrat-openapi.test.ts
npm test
```

Lisez ses cinq tests. Il vérifie la **forme** du contrat : chaque route a une description, chaque erreur est déclarée en `application/problem+json`, chaque exemple respecte son propre schéma, et deux exemples rejoués contre l'API donnent ce qu'ils annoncent. Il ne vérifie pas le **sens** d'une phrase : c'est l'étape 4.

## Étape 3 : le Familier écrit (7 min)

Committez d'abord (`git add -A && git commit -m "Avant le Familier"`), pour voir ensuite ce qu'il a changé. Puis, dans votre outil (GitHub Copilot en mode agent, ou un autre), cette demande, telle quelle :

> Dans `service-bourse/src/infrastructure/http/`, complète le contrat OpenAPI des quatre routes de `routes-annonces.ts`, sans changer leur comportement :
> - une `description` par route, qui dit ce qu'elle fait, dans quel ordre elle rend ses résultats, et qui peut l'appeler ;
> - une description (`.meta({ description: "..." })`) sur chaque champ des schémas de `schemas.ts`, et une sur chaque réponse de succès (`.describe("...")`) ;
> - un exemple (`.meta({ examples: [...] })`) sur `CorpsMiseEnVente` et sur chaque schéma de réponse (`AnnonceDto`, `PageDAnnoncesDto`, `VenteConclueDto`), et un exemple (`.meta({ example: "..." })`) sur le paramètre `annonceId` de `ParametresAnnonce` ;
> - les réponses d'erreur de chaque route, avec `...reponsesDErreur({ 404: "description", ... })` de `problemes.ts`, pour ces statuts : `GET /annonces` 400 ; `GET /annonces/:annonceId` 404 ; `POST /annonces` 400, 403, 404, 409 ; `POST /annonces/:annonceId/achat` 400, 404, 409, 422.
>
> Emploie le vocabulaire de `GLOSSARY.md`.

Arrêtez une génération qui dépasse 3 minutes et gardez ce qui est produit. Si votre outil ne répond pas (quota épuisé), levez la main : je publie une sortie de repli, que vous copiez à la place de celle du Familier.

```bash
npm run recuperer -- familier-3
cp ~/familier-3/src/infrastructure/http/*.ts service-bourse/src/infrastructure/http/
```

Dans tous les cas, `npm test` et `npm run typecheck` ; s'ils sont rouges, corrigez le minimum pour qu'ils compilent, sans encore juger le contenu.

## Étape 4 : vous vérifiez (8 min)

Relancez le Service Bourse sur le jeu de démonstration (`node service-bourse/src/main.ts --reinitialiser`). Pour chaque ligne, lisez ce que dit **le contrat généré** (`/docs`), puis faites la requête (bouton *Try it out* de Swagger UI, ou `curl`) et comparez.

| Ce qu'on vérifie | Ce que dit le contrat | Ce que répond l'API | Exact ? |
|---|---|---|---|
| 1. L'exemple du corps de `POST /annonces`, envoyé tel quel | | | |
| 2. L'exemple de réponse de `GET /annonces/{annonceId}` : cette Annonce existe-t-elle, et est-elle ainsi ? | | | |
| 3. L'ordre de `GET /annonces` annoncé par la description | | | |
| 4. La Taxe de Bourse et le net du vendeur dans la description ou l'exemple de l'achat (achetez `a-bobine-zephyr` comme `lyra`) | | | |
| 5. Ce qui provoque le 409 de l'achat (achetez deux fois) | | | |
| 6. Ce qui provoque le 422 de l'achat (`kessa` achète `a-reacteur-rivet`) | | | |

Pour l'achat comme `lyra` : `{"acheteurId":"lyra"}`. Un exemple inventé par le Familier (`o-123`, `annonce-42`) n'existe pas dans le jeu de démonstration : c'est une ligne fausse, qu'il faut remplacer par un identifiant qui existe (voir `jeu-de-demonstration.ts`).

## Étape 5 : corriger (4 min)

Corrigez chaque ligne fausse du tableau dans `schemas.ts` ou `routes-annonces.ts`. `npm test` et `npm run typecheck` : verts. Committez : `git diff HEAD~1` montre ce que le Familier a écrit et ce que vous avez gardé.

Gardez une entrée « décision » pour votre Journal du Familier (modèle dans `docs/modeles/journal-du-familier.md`) : ce qu'il a proposé, ce que vous avez gardé, modifié ou rejeté, et pourquoi. Celle-ci servira en Note 2.

## Lecture croisée (6 min)

Échangez avec le binôme voisin : chacun ouvre le `/docs` de l'autre, sur son poste, choisit **une** phrase ou **un** exemple, et le vérifie en direct contre son API. Vous avez 4 minutes pour trouver une ligne inexacte ; on en met deux en commun.
