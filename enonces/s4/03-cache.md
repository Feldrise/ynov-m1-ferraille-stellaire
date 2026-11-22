# Cache : le lancement de Cycle

En binôme, 55 minutes : 8 minutes d'apport au tableau, 42 de travail (les deux mesures comprises), 5 de mise en commun.

Au lancement d'un Cycle, tous les Joueurs reviennent en même temps et ouvrent la Bourse aux épaves. Le Legacy recalculait la liste des Annonces à chaque appel ; le Service Bourse aussi : deux requêtes SQL par page, à chaque Joueur. On **mesure** d'abord, on met le cache ensuite, on **mesure** à nouveau.

Deux caches, à deux endroits :

- le **cache applicatif**, en **cache-aside** dans Redis : on lit le cache ; s'il n'a rien, on lit PostgreSQL et on garde la page 30 secondes. Une mise en vente ou une vente **invalide** les pages gardées. Il se branche **derrière le port** `DepotAnnonces` : un dépôt qui en enveloppe un autre, et que la racine de composition branche à sa place. Les use cases n'en savent rien ;
- le **cache HTTP** : `Cache-Control` dit au client (ou à un proxy) combien de temps garder la page, et l'**ETag** lui permet de la redemander pour rien : `If-None-Match` répond 304, sans corps, si elle n'a pas changé.

## Étape 1 : mesurer avant (3 min)

Dans un second terminal, relancez le Service Bourse :

<!-- parcours : démarrer -->
```bash
node service-bourse/src/main.ts
```

Dans le premier, rien d'autre de lancé sur le poste :

```bash
npm run charge
```

Notez les requêtes par seconde et les temps de réponse (médiane, 99 %). Vous les comparerez à l'étape 7.

## Étape 2 : les fournitures (2 min)

```bash
F=enonces/s4/fournitures/cache ; B=service-bourse ; I=service-bourse/src/infrastructure
mkdir -p $I/cache
cp $F/cache.ts $F/cache-redis.ts $F/depot-annonces-avec-cache.ts $I/cache/
cp $F/composition.ts $I/
cp $F/application.ts $I/http/
cp $F/main.ts $B/src/
cp $F/dependency-cruiser.cjs $B/.dependency-cruiser.cjs
cp $F/contrat-depot-annonces.ts $B/test/infrastructure/
cp $F/depot-annonces-avec-cache-test.ts $B/test/infrastructure/depot-annonces-avec-cache.test.ts
cp $F/cache-redis-test.ts $B/test/infrastructure/cache-redis.test.ts
cp $F/routes-annonces-test.ts $B/test/infrastructure/http/routes-annonces.test.ts
npm run typecheck
```

- `cache/cache.ts` : l'interface `Cache` (lire, écrire pour une durée de vie, incrémenter un compteur) et sa version en mémoire, pour les tests ; `cache/cache-redis.ts` : la même dans Redis.
- `cache/depot-annonces-avec-cache.ts`, à compléter : le dépôt qui enveloppe le dépôt PostgreSQL. Tout passe déjà à la source.
- `composition.ts` l'insère devant le dépôt PostgreSQL quand on lui donne un cache, et l'invalide au démarrage (Redis survit à un redémarrage du service) ; `main.ts` lui donne le cache Redis ; `application.ts` enregistre `@fastify/etag`.
- La règle d'architecture `http-sans-adapters-sortants` couvre maintenant `cache/` ; la suite de contrat de `DepotAnnonces` gagne un test, que vos deux adapters passaient déjà, et elle se joue aussi sur le dépôt avec cache.

`npm test` est rouge sur `depot-annonces-avec-cache.test.ts`, `routes-annonces.test.ts` et `cache-redis.test.ts`.

## Étape 3 : cache-aside (6 min)

Dans `depot-annonces-avec-cache.ts`, écrivez `annoncesActives` :

1. la version courante des pages : `` await this.#cache.lire(`${this.#prefixe}:version`) ``, ou `"0"` ;
2. la clé de la page : le préfixe, `v` et la version, puis `criteres.prixMax ?? "tous"`, `criteres.limite` et `criteres.decalage`, séparés par `:` ;
3. si le cache a la page, rendez `depuisLeCache(...)` ; sinon, lisez la source, gardez `versLeCache(page)` pendant `DUREE_DE_VIE_EN_SECONDES`, et rendez la page.

## Étape 4 : invalider (2 min)

Une mise en vente ou une vente change la liste. Dans `enregistrerMiseEnVente` et `enregistrerVente`, appelez `this.invalider()`, qui change la version : les pages de l'ancienne version ne seront plus jamais lues, elles expireront seules. Avant ou après l'écriture à la source ? Pensez à une lecture qui arrive entre les deux. Sans invalidation, le test de contrat « la liste suit les écritures » échoue.

## Étape 5 : le cache HTTP (2 min)

Dans `routes-annonces.ts`, la route `GET /annonces` reçoit `reply` (`async (request, reply) =>`) et pose, avant de répondre :

```ts
reply.header("cache-control", "public, max-age=5");
```

Le contrat doit dire la vérité : déclarez la réponse 304 dans le `response` de la route, et complétez sa `description` (gardable 5 secondes, ETag, 304) :

```ts
304: z.null().describe("La page n'a pas changé depuis l'ETag envoyé dans If-None-Match ; aucun corps"),
```

(`import { z } from "zod";` en tête du fichier.)

## Étape 6 : Redis qui tombe (3 min)

Un cache accélère, il ne décide de rien : Redis arrêté, la liste doit encore venir, de PostgreSQL. On commence par la lecture : dans `cache/cache-redis.ts`, `lire` met son appel à Redis dans un `try/catch` et rend `undefined`, « absent », quand Redis ne répond pas. Le test « Redis arrêté : la lecture rend « absent » », dans `cache-redis.test.ts`, le vérifie avec un client qui ne joint personne et n'attend rien. Laissez `ecrire` et `incrementer` tels quels : le sujet de la Note 2 y revient.

<!-- parcours : travail -->
```bash
npm test
npm run typecheck
(cd service-bourse && npx depcruise src --config .dependency-cruiser.cjs)
```

Verts : committez.

## Étape 7 : mesurer après (3 min)

Relancez le Service Bourse dans le second terminal (Ctrl+C, puis) :

<!-- parcours : démarrer -->
```bash
node service-bourse/src/main.ts
```

Puis, dans le premier, la même mesure, et le cache HTTP vu de l'extérieur :

```bash
npm run charge
curl -si "http://127.0.0.1:3100/annonces?parPage=2"
```

Copiez l'ETag de la réponse, et redemandez la page avec `-H 'if-none-match: "<l ETag>"'` : quel statut, quel corps ?

## S'il vous reste du temps

Arrêtez Redis (`docker compose stop redis`), puis `curl -s http://127.0.0.1:3100/annonces`. Que répond le Service Bourse ? Pourquoi, alors que la lecture tolère la panne ? Redémarrez Redis (`docker compose start redis`).

## Mise en commun (5 min)

- Vos deux mesures, au tableau : qu'a gagné le cache ? Sur quoi exactement : la base, le réseau, le calcul ?
- Une vente pendant que la page est en cache : combien de temps un Joueur peut-il voir une Annonce déjà vendue, avec le cache applicatif ? Avec `max-age=5` ? Que se passe-t-il s'il clique sur « Acheter » ?
- Pourquoi ce cache vit-il derrière le port `DepotAnnonces`, et pas dans le use case « Lister les Annonces » ? Qu'est-ce qui changerait si c'était une règle du jeu ?
