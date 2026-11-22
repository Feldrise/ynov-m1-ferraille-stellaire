# Rate limiting et throttling : le bot qui achète en 200 ms

En binôme, 50 minutes : 12 minutes d'apport et de Ticket au tableau, 28 de travail, 10 de mise en commun.

Le Ticket du Game Designer (sur Moodle) : un bot achète toutes les Annonces sous-cotées dans les 200 ms qui suivent leur publication. Aucun Joueur humain n'a le temps de les voir. Le Legacy n'avait aucune limite de débit ; le Service Bourse non plus, depuis ce matin.

Tu limites les achats avec `@fastify/rate-limit` : une **fenêtre fixe** par clé, des compteurs dans **Redis** (partagés par toutes les instances du Service Bourse), et au-delà de la limite une réponse **429** en Problem Details, avec l'en-tête `Retry-After`. Reste la vraie question : **compter par quoi ?** Par adresse IP, ou par Joueur ?

## Étape 1 : les fournitures (2 min)

```bash
F=enonces/s4/fournitures/limitation ; H=service-bourse/src/infrastructure/http
cp $F/limitation-de-debit.ts $F/application.ts $H/
cp $F/main.ts service-bourse/src/
cp $F/limitation-de-debit-test.ts service-bourse/test/infrastructure/http/limitation-de-debit.test.ts
npm run typecheck
```

- `limitation-de-debit.ts` enregistre le plugin (`limiterLeDebit`) : aucune route n'est limitée par défaut (`global: false`), chacune déclare sa limite. Il définit le refus, `TropDeRequetes`, les limites `LIMITES`, et deux façons de compter : `parAdresseIp`, et `parJoueur`, à écrire.
- `application.ts` appelle `limiterLeDebit` avant les routes ; `main.ts` ouvre la connexion à Redis et la lui passe.

`npm test` est rouge sur `limitation-de-debit.test.ts` : aucune route n'est encore limitée.

## Étape 2 : compter par Joueur (4 min)

Dans `limitation-de-debit.ts`, écrivez `parJoueur` : la clé est `joueur:<JoueurId>` quand l'en-tête porte un jeton d'accès valide (`await jetons.joueurAuthentifie(request.headers.authorization)`), sinon celle de `parAdresseIp(request)`. Pourquoi vérifier le jeton, plutôt que lire son `sub` sans vérifier la signature ?

## Étape 3 : limiter l'achat, et le dire en Problem Details (5 min)

1. Dans `routes-annonces.ts`, importez `LIMITES` et `parJoueur` de `./limitation-de-debit.ts`, et donnez sa limite à la route de l'achat, à côté de `schema` :

   ```ts
   config: { rateLimit: { ...LIMITES.achat, keyGenerator: parJoueur(jetons) } },
   ```

   Déclarez la réponse au contrat, dans ses `reponsesDErreur` :

   ```ts
   429: "Plus de trois achats en dix secondes pour ce Joueur ; l'en-tête Retry-After dit quand réessayer",
   ```

2. Dans `problemes.ts`, importez `TropDeRequetes` de `./limitation-de-debit.ts`, et ajoutez sa ligne à `TABLE`, avant `ErreurDuDomaine` : `statut: 429`, `type: "trop-de-requetes"`, `titre: "Trop de requêtes"`.

<!-- parcours : travail -->
```bash
npm test
npm run typecheck
```

Verts : committez.

## Étape 4 : le bot, en vrai (3 min)

Dans un second terminal, relancez le Service Bourse (Ctrl+C, puis) :

<!-- parcours : démarrer -->
```bash
node service-bourse/src/main.ts
```

Dans le premier, lyra ouvre une session, puis achète cinq fois de suite :

```bash
J=$(curl -s -X POST http://127.0.0.1:3100/sessions -H "content-type: application/json" \
  -d '{"pseudo":"lyra","motDePasse":"ferraille"}' | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).jetonDAcces')
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://127.0.0.1:3100/annonces/a-inconnue/achat -H "authorization: Bearer $J"
done ; echo
curl -si -X POST http://127.0.0.1:3100/annonces/a-inconnue/achat -H "authorization: Bearer $J"
```

Lisez les en-têtes de la dernière réponse : `retry-after`, `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`. Arrêtez le Service Bourse, relancez-le, et rejouez : le compteur a-t-il survécu ? Où vit-il ?

## S'il vous reste du temps

Le sujet de la Note 2 vous demandera de protéger aussi l'ouverture de session. Contre quoi, et par quelle clé : IP ou Joueur ?

## Mise en commun (10 min)

Sur le Ticket :

- Trois achats en dix secondes par Joueur : le bot du Ticket est-il arrêté ? Et s'il dispose de vingt comptes ? Et de vingt adresses IP ?
- Fenêtre fixe, fenêtre glissante, seau à jetons : laquelle laisse passer une rafale de six achats à cheval sur deux fenêtres ?
- Refuser (429) ou ralentir (throttling) : que préférez-vous pour un Joueur humain un peu rapide ? Pour un bot ?
- Redis tombe : `skipOnError: true` laisse tout passer. Le bon choix ? Pour l'achat, pour l'ouverture de session ?
- Et si le vrai remède du Ticket était une règle du jeu, et pas une limite de débit ? Laquelle, et dans quelle couche ?
