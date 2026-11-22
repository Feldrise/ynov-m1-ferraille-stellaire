# Atelier authentification : l'acheteur, c'est le Joueur du jeton

En binôme, 25 minutes : 1 minute de consignes, 21 de travail, 3 de mise en commun.

Ce matin, `vendeurId` et `acheteurId` voyagent dans le corps de la requête, comme dans le Legacy : n'importe qui achète au nom de n'importe qui. Le Service Bourse vérifie maintenant un **jeton d'accès** court (15 minutes, signé HS256 avec un secret de configuration) dans l'adapter HTTP, et le vendeur comme l'acheteur deviennent **le Joueur authentifié**.

Qui émet les jetons ? En Séance 4, l'ouverture de session du Service Bourse. Aujourd'hui, un script de développement : `npm run jeton -- zephyr`, signé avec le `JWT_SECRET` du `.env.example`.

## Étape 1 : les fournitures (2 min)

```bash
F=enonces/s3/fournitures/authentification ; H=service-bourse/test/infrastructure/http
cp $F/authentification.ts $F/application.ts service-bourse/src/infrastructure/http/
cp $F/main.ts service-bourse/src/
cp $F/application-de-test.ts $H/
for t in routes-annonces problemes contrat-openapi authentification; do cp $F/$t-test.ts $H/$t.test.ts; done
```

`authentification.ts` est complet : lisez `joueurAuthentifie` et la liste `algorithms` (on y revient à la mise en commun). `application.ts` et `main.ts` sont déjà branchés : `main.ts` crée les jetons depuis la configuration (`JWT_SECRET`), `construireApplication` les reçoit et les passe aux routes, `routesAnnonces(service, options.jetons)`. Les tests fournis remplacent ceux du matin : ils envoient un jeton (`enTantQue("lyra")`) au lieu d'un `acheteurId`. Rien ne compile encore : `routesAnnonces` n'attend pas de jetons.

## Étape 2 : le Joueur du jeton, pas celui du corps (6 min)

Dans `routes-annonces.ts`, `routesAnnonces(service: ServiceBourse, jetons: JetonsDAcces)` (le type s'importe de `./authentification.ts`). Puis, dans chacune des deux routes `POST`, le Joueur vient du jeton, et plus du corps. Par exemple, pour l'achat :

```ts
const acheteurId = await jetons.joueurAuthentifie(request.headers.authorization);
```

Retirez `vendeurId` de `CorpsMiseEnVente` (de son exemple et de la description du 400), et le corps de l'achat (son `body` et sa réponse 400). Dans le schéma des deux routes `POST`, déclarez le jeton et sa réponse 401 :

```ts
security: [{ jetonDAcces: [] }],
// et dans reponsesDErreur :
401: "Jeton d'accès absent, invalide ou expiré",
```

## Étape 3 : 401, en Problem Details (2 min)

Dans `problemes.ts` : importez `JetonRefuse` de `./authentification.ts`, ajoutez sa ligne **en tête** de `TABLE` (`statut: 401`, `type: "jeton-refuse"`, `titre: "Authentification requise"`), et dans `gererLesErreurs`, avant l'envoi :

```ts
if (probleme.status === 401) {
  reply.header("www-authenticate", 'Bearer realm="bourse"');
}
```

## Étape 4 : vert, et le jeton forgé (2 min)

`npm test` et `npm run typecheck` : verts. Relancez le Service Bourse, puis `npm run forger -- --bourse` : il forge un jeton avec « secret », comme ce matin contre le Legacy. Que répond le Service Bourse ?

## S'il vous reste du temps

Publiez une Annonce au nom de zephyr, avec un vrai jeton :

```bash
J=$(npm run --silent jeton -- zephyr)
curl -s -X POST http://127.0.0.1:3100/annonces -H "authorization: Bearer $J" \
  -H "content-type: application/json" -d '{"objetId":"o-pile-zephyr","prix":190}'
```

Dans Swagger UI, le bouton *Authorize* accepte le même jeton.

## Mise en commun (3 min)

- Pourquoi l'acheteur ne peut-il plus venir du corps, même si le client du jeu « envoie toujours le bon » ?
- Sans `algorithms: ["HS256"]`, qui choisirait l'algorithme de vérification ?
- Le jeton expire au bout de 15 minutes. Et ensuite, le Joueur se reconnecte toutes les 15 minutes ? C'est la Séance 4.
