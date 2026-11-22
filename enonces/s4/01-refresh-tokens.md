# Atelier refresh tokens : une session qui survit au quart d'heure, pas au vol

En binôme, 60 minutes : 2 minutes de consignes, 52 de travail, 6 de mise en commun.

Depuis la Séance 3, le jeton d'accès expire au bout de 15 minutes, et seul `npm run jeton` en fabrique. Le Service Bourse ouvre maintenant de vraies **sessions** :

- `POST /sessions` : le Joueur donne son pseudo et son mot de passe (ceux du Legacy, `ferraille` pour tous), il reçoit un **jeton d'accès** de 15 minutes dans le corps, et un **refresh token** de 30 jours dans un cookie `httpOnly` ;
- `POST /sessions/renouvellement` : le refresh token du cookie s'échange **une seule fois** contre un jeton d'accès et un refresh token neufs (la **rotation**) ;
- `DELETE /sessions/courante` : la session est fermée.

Un refresh token qui sert deux fois a été copié : c'est le **rejeu**. On ne sait pas qui, du Joueur ou du voleur, s'en sert en second : on révoque toute la **famille** (tous les refresh tokens de cette session), et chacun doit rouvrir une session avec son mot de passe.

Le Familier est autorisé. Vous devez pouvoir dire pourquoi chaque refus est dans cet ordre, et ce que le dépôt garde (et ne garde pas) d'un refresh token.

## Étape 0 : un point de départ commun (3 min)

Comme en Séance 3 : votre Service Bourse reste dans l'historique sous un tag, et vous repartez de la référence de fin de Séance 3. Depuis la racine du dépôt du binôme, conteneurs démarrés :

```bash
git add -A ; git commit -m "Mon Service Bourse de la Séance 3" ; git tag mon-service-s3
npm run recuperer -- fin-s3
rm -rf service-bourse/src service-bourse/test
cp -r ~/fin-s3/src ~/fin-s3/test service-bourse/
```

`npm run recuperer` échoue ? L'archive `fin-s3` est aussi sur Moodle : décompressez-la dans `~/fin-s3`, puis reprenez à la commande `rm -rf`.

## Étape 1 : les fournitures, et ce qu'elles font déjà (7 min)

```bash
F=enonces/s4/fournitures/sessions ; B=service-bourse/src ; T=service-bourse/test
cp $F/comptes.ts $F/depot-sessions.ts $F/fabrique-de-jetons.ts $B/application/ports/
cp $F/session.ts $F/ouvrir-une-session.ts $F/renouveler-la-session.ts $F/fermer-la-session.ts $F/erreurs.ts $B/application/
cp $F/comptes-en-memoire.ts $F/depot-sessions-en-memoire.ts $B/infrastructure/memoire/
cp $F/comptes-du-legacy.ts $F/depot-sessions-postgres.ts $F/schema.sql $F/tables.ts $B/infrastructure/postgres/
cp $F/authentification.ts $F/schemas-sessions.ts $F/routes-sessions.ts $F/problemes.ts $F/application.ts $B/infrastructure/http/
cp $F/composition.ts $F/configuration.ts $B/infrastructure/
cp $F/main.ts $B/
cp $F/contrat-depot-sessions.ts $T/infrastructure/
cp $F/depot-sessions-test.ts $T/infrastructure/depot-sessions.test.ts
cp $F/sessions-test.ts $T/application/sessions.test.ts
cp $F/application-de-test.ts $F/contrat-openapi-test.ts $F/sessions-http-test.ts $T/infrastructure/http/
mv $T/infrastructure/http/contrat-openapi-test.ts $T/infrastructure/http/contrat-openapi.test.ts
mv $T/infrastructure/http/sessions-http-test.ts $T/infrastructure/http/sessions.test.ts
npm run typecheck
```

Tout est branché, sauf deux use cases. Lisez, dans cet ordre, en vous partageant les fichiers :

1. les trois **ports** de `application/ports/` : `Comptes` (les mots de passe restent dans le Legacy), `DepotSessions` (des familles de refresh tokens, connus par leur **empreinte**), `FabriqueDeJetons` (le format des jetons, affaire de l'adapter) ;
2. `ouvrir-une-session.ts` et `session.ts` : le use case modèle, et la fonction qui émet une session ;
3. `routes-sessions.ts` : le cookie et ses options. Quelle option empêche le JavaScript d'une page de lire le refresh token ? Laquelle l'empêche de partir vers un autre site ?

`typecheck` est vert ; `npm test` est rouge sur `application/sessions.test.ts` et `infrastructure/http/sessions.test.ts` : les étapes 2 et 3 les font passer.

## Étape 2 : renouveler et fermer (12 min)

Dans `renouveler-la-session.ts`, écrivez `executer`. Le dépôt rend un refresh token par son empreinte (`sessions.utiliser(jetons.empreinte(refreshToken))`) : c'est ce qu'il **était** juste avant, et le dépôt le marque utilisé du même coup. Refusez, dans cet ordre, par un `RefreshTokenRefuse` qui porte exactement ce message :

| Le refresh token est... | Message |
|---|---|
| absent (`undefined`) | `Refresh token absent : ouvrez une session` |
| inconnu du dépôt | `Refresh token inconnu : ouvrez une session` |
| d'une famille révoquée (`familleRevoquee`) | `Session fermée ou révoquée : ouvrez une nouvelle session` |
| déjà utilisé (`dejaUtilise`) : **révoquez d'abord la famille** | `Refresh token déjà utilisé : la session est révoquée, ouvrez-en une nouvelle` |
| expiré (`expireLe` atteint ou passé selon l'`horloge`) | `Refresh token expiré : ouvrez une nouvelle session` |

Sinon, rendez `emettreLaSession(this.#ports, jeton.joueurId, jeton.famille)` : un refresh token neuf, **dans la même famille**.

Puis `fermer-la-session.ts` : sans refresh token, rien à faire ; sinon, `utiliser` son empreinte, et s'il existe, `revoquer` sa famille. Fermer une session déjà fermée n'est pas une erreur.

## Étape 3 : le rejeu d'un refresh token volé (6 min)

Dans `service-bourse/test/application/sessions.test.ts`, à la place du commentaire « À écrire », écrivez le test du vol, avec `ouvrir()` et `renouveler()` du fichier :

1. le voleur copie le refresh token d'une session ouverte ;
2. le Joueur s'en sert le premier et reçoit le suivant ;
3. le voleur le rejoue : refusé (`rejects.toThrow("Refresh token déjà utilisé")`) ;
4. le refresh token neuf du Joueur est refusé lui aussi : toute la session est tombée.

Si vous avez fini avant les autres : le même vol, quand c'est le voleur qui renouvelle le premier.

<!-- parcours : travail -->
```bash
npm test
npm run typecheck
```

Verts : committez (`git add -A && git commit -m "Sessions : rotation et rejeu"`).

## S'il vous reste du temps

Dans un second terminal, le Service Bourse :

<!-- parcours : démarrer -->
```bash
node service-bourse/src/main.ts
```

Dans le premier, comme le ferait un navigateur, avec un pot à cookies :

```bash
curl -si -c cookies.txt -X POST http://127.0.0.1:3100/sessions \
  -H "content-type: application/json" -d '{"pseudo":"zephyr","motDePasse":"ferraille"}'
cp cookies.txt vole.txt
curl -s -b cookies.txt -c cookies.txt -X POST http://127.0.0.1:3100/sessions/renouvellement
curl -s -b vole.txt -X POST http://127.0.0.1:3100/sessions/renouvellement
curl -s -b cookies.txt -X POST http://127.0.0.1:3100/sessions/renouvellement
```

Lisez l'en-tête `Set-Cookie` de la première réponse. Que répondent les deux dernières requêtes, et pourquoi la dernière, qui est celle du Joueur ? Puis la recette de la Note 2 : les parties 5 et 6 (sessions, refresh token révoqué) doivent passer ; la partie 7 attend l'atelier suivant.

<!-- parcours : attendu 1 -->
```bash
npm run recette
```

## Mise en commun (6 min)

- Pourquoi le dépôt garde-t-il l'empreinte du refresh token, et pas sa valeur ?
- Pourquoi révoquer **toute** la famille au rejeu, et pas seulement le refresh token rejoué ?
- Deux onglets du même Joueur renouvellent au même instant avec le même refresh token : que se passe-t-il ? Est-ce acceptable ?
- Où vit chaque élément : la règle de rotation, le format JWT, le cookie, le mot de passe ?
