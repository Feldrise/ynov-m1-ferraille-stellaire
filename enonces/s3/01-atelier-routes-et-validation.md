# Atelier routes et validation : les routes de la Bourse, validées par Zod

En binôme, 60 minutes : 5 minutes pour former les binômes, 3 de consignes, 45 de code, 7 de mise en commun.

Depuis la Séance 2, le Service Bourse sait mettre en vente et acheter, mais seuls les tests l'appellent. Tu lui donnes un **adapter HTTP** : un adapter entrant, qui traduit une requête en commande, appelle un use case, et traduit le résultat en réponse. Fastify reçoit les requêtes ; **Zod** décrit ce qui entre et ce qui sort.

## Les règles du jeu

- L'adapter HTTP vit dans `service-bourse/src/infrastructure/http/`. Il appelle les use cases du `ServiceBourse` (la racine de composition), jamais un adapter sortant : les tests d'architecture le vérifient (étape 4).
- Aucune règle du jeu dans une route : une route traduit, le Domain décide.
- Ce que l'API renvoie est un **objet de transfert** décrit par un schéma Zod, jamais une entité telle quelle.
- Comme toujours : syntaxe effaçable, imports relatifs en `.ts`, `npm test` et `npm run typecheck` verts à la fin de chaque étape.

Le Familier est autorisé. Vous devez pouvoir dire, pour chaque ligne, si elle valide la **forme** d'une requête ou une **règle** du jeu.

## Former le binôme (5 min)

Deux par deux, je tranche s'il le faut ; un trinôme si nous sommes impairs. Vous resterez ensemble jusqu'à la Note 3.

Un seul poste code à la fois : l'autre lit l'énoncé et les tests, et relit chaque ligne. Changez de clavier à chaque étape. Le dépôt du binôme est le dépôt du cours du poste qui code en premier. À la pause de 10h00, créez sur github.com un dépôt **privé** et vide, invitez l'autre, et poussez-y par un second remote. `origin` ne change pas : c'est là que `npm run recuperer` cherche les dossiers du cours. Donnez-lui aussi le nom `cours`, comme sur l'autre poste : les énoncés des Séances 4 et 5 se récupèrent alors par la même commande sur les deux postes.

```bash
git remote add binome <url du dépôt privé> ; git push -u binome main
git remote add cours "$(git remote get-url origin)"
```

L'autre le clone à côté de son dépôt du cours, puis lui donne l'adresse du cours sous le nom `cours` :

```bash
git clone <url du dépôt privé> ~/ferraille-binome && cd ~/ferraille-binome && npm ci
git remote add cours "$(git -C ~/ferraille remote get-url origin)"
cp ~/ferraille/.env .env
```

Le `.env` n'est pas dans Git : sa copie garde les ports du dépôt du cours de ce poste.

## Étape 0 : un point de départ commun (4 min)

Les fournitures parlent le langage de la référence de fin de Séance 2 : vous l'installez à la place de votre `service-bourse/`, qui reste dans l'historique sous un tag. Depuis la racine du dépôt, conteneurs démarrés :

```bash
git add -A ; git commit -m "Mon Service Bourse de la Séance 2" ; git tag mon-service-s2
npm run recuperer -- fin-s2
rm -rf service-bourse/src service-bourse/test
cp -r ~/fin-s2/src ~/fin-s2/test service-bourse/
```

`npm run recuperer` échoue (réseau, GitHub) ? L'archive `fin-s2` est aussi sur Moodle : décompressez-la dans `~/fin-s2`, puis reprenez à la commande `rm -rf`.

Puis les fournitures :

```bash
F=enonces/s3/fournitures/routes ; B=service-bourse
mkdir -p $B/src/infrastructure/http $B/test/infrastructure/http
cp $F/depot-annonces.ts $B/src/application/ports/
cp $F/lister-les-annonces.ts $F/consulter-une-annonce.ts $B/src/application/
cp $F/depot-annonces-en-memoire.ts $B/src/infrastructure/memoire/
cp $F/depot-annonces-postgres.ts $B/src/infrastructure/postgres/
cp $F/composition.ts $F/configuration.ts $F/jeu-de-demonstration.ts $B/src/infrastructure/
cp $F/application.ts $F/schemas.ts $F/routes-annonces.ts $B/src/infrastructure/http/
cp $F/main.ts $B/src/
cp $F/contrat-depot-annonces.ts $B/test/infrastructure/
cp $F/lister-et-consulter-test.ts $B/test/application/lister-et-consulter.test.ts
cp $F/application-de-test.ts $B/test/infrastructure/http/
cp $F/routes-annonces-test.ts $B/test/infrastructure/http/routes-annonces.test.ts
cp $F/dependency-cruiser.cjs $B/.dependency-cruiser.cjs
npm run typecheck && npm test
```

Ce que vous recevez :

- **la lecture des Annonces**, toute faite : le port `DepotAnnonces` gagne `annoncesActives` (filtre et pagination), ses deux adapters l'implémentent, la suite de contrat le vérifie ; deux use cases, « Lister les Annonces » et « Consulter une Annonce » ;
- **la racine de composition**, qui assemble les quatre use cases dans un `ServiceBourse` ;
- **le démarrage** : `main.ts` lit la configuration (`.env`), branche PostgreSQL, charge un jeu de démonstration (quatre Joueurs, huit Objets, quatre Annonces aux identifiants lisibles, comme `a-bobine-zephyr`) et démarre Fastify sur le port 3100 ;
- **l'adapter HTTP à compléter** : `application.ts` (Fastify, les compilateurs de Zod, Swagger), `schemas.ts` (les objets de transfert, en partie écrits), `routes-annonces.ts` (une route modèle, `GET /annonces`) ;
- **les tests de l'adapter**, dans `routes-annonces.test.ts` : ils passent par `app.inject`, sans réseau ni base, sur les adapters en mémoire. Ils doivent passer sans être modifiés.

`typecheck` est vert, `npm test` est rouge sur `routes-annonces.test.ts` : c'est normal, les étapes 1 à 3 lui donnent ses routes.

## Étape 1 : consulter une Annonce (5 min)

Lisez la route modèle, `GET /annonces` : le schéma de la requête (`querystring`), celui de la réponse (`response: { 200: ... }`), l'appel du use case, la correspondance vers l'objet de transfert (`versAnnonceDto`).

1. Dans `schemas.ts`, écrivez `versVenteConclueDto` : les Crédits deviennent des nombres (`vente.prix.montant`), la date une chaîne ISO 8601 (`toISOString()`).
2. Dans `routes-annonces.ts`, écrivez `GET /annonces/:annonceId` sur le modèle de la première : `params: ParametresAnnonce`, réponse `200: AnnonceDto`, use case `service.consulterUneAnnonce`.

## Étape 2 : mettre un Objet en vente (6 min)

1. Dans `schemas.ts`, écrivez `CorpsMiseEnVente` : `objetId` et `vendeurId` sont des `identifiant`, `prix` un entier strictement positif d'un million de Crédits au plus (`z.number().int().positive().max(1_000_000)`). Le `vendeurId` dans le corps est **provisoire** : à 13h15, le vendeur deviendra le Joueur authentifié.
2. Écrivez `POST /annonces` : `body: CorpsMiseEnVente`, réponse `201: AnnonceDto`, use case `service.mettreEnVente`. Une création répond **201** et dit où trouver la ressource créée :

```ts
return reply.code(201).header("location", `/annonces/${annonce.id}`).send(versAnnonceDto(annonce));
```

## Étape 3 : acheter une Annonce (4 min)

`POST /annonces/:annonceId/achat` : `params: ParametresAnnonce`, un corps `{ acheteurId }` (provisoire lui aussi, `z.object({ acheteurId: z.string().min(1) })`, avec `import { z } from "zod";` en tête de `routes-annonces.ts`), réponse `201: VenteConclueDto`, use case `service.acheterUneAnnonce`.

`npm test` et `npm run typecheck` : verts.

## Étape 4 : en vrai (6 min)

Les tests d'architecture, avec les règles de la Séance 2 et une de plus (`http-sans-adapters-sortants`) : `(cd service-bourse && npx depcruise src --config .dependency-cruiser.cjs)`. Puis, dans un second terminal, le Service Bourse : `node service-bourse/src/main.ts`. Dans le premier :

```bash
curl -s "http://127.0.0.1:3100/annonces?parPage=2"
curl -s -X POST http://127.0.0.1:3100/annonces -H "content-type: application/json" \
  -d '{"objetId":"o-pile-zephyr","vendeurId":"zephyr","prix":-500}'
curl -s -X POST http://127.0.0.1:3100/annonces -H "content-type: application/json" \
  -d '{"objetId":"o-carte-kessa","vendeurId":"zephyr","prix":50}'
```

Notez, pour la mise en commun : qui a refusé le prix de -500 Crédits (Zod ou le Domain) ? Qui a refusé de vendre la Carte de navigation de kessa ? Avec quel code de statut ? Ouvrez aussi http://127.0.0.1:3100/docs : ce contrat, personne ne l'a écrit à la main.

## S'il vous reste du temps

- `GET /annonces?prixMax=100` : trouvez dans le code qui applique le filtre.
- Achetez deux fois l'Annonce `a-boite-lyra` avec `curl` (pas `a-bobine-zephyr` : l'atelier suivant en a besoin, encore en vente). Que répond la seconde requête ? Est-ce le bon code de statut ?

## Mise en commun (7 min)

Committez (`git add -A && git commit`). Puis : que valide Zod, que refuse le Domain, et pourquoi ne pas tout faire au même endroit ? Que perdrait-on à renvoyer l'entité `Annonce` telle quelle ? Avec Joi, ou avec Pydantic dans un service Python, où vivrait `CorpsMiseEnVente` ? Et cette réponse 500 à l'étape 4 ?
