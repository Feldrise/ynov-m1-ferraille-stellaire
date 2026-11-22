# Gestion centralisée des erreurs : des refus que le Joueur comprend

En binôme, 40 minutes : le Ticket du Game Designer et les consignes (3 min), 31 minutes de travail, 6 de mise en commun.

Ce matin, une règle du jeu refusée remonte jusqu'à Fastify, qui répond 500. Pour le client du jeu, 500 veut dire « Internal error » : le Joueur ne sait ni ce qu'il a fait, ni s'il doit réessayer. Le Game Designer vient de l'apprendre par les Joueurs (Ticket sur Moodle).

Tu centralises la traduction des erreurs : **un seul endroit** décide qu'une erreur du Domain devient tel code de statut, et chaque refus part au format **Problem Details** (RFC 9457, `application/problem+json`). Aucune route n'a de `try/catch`.

```json
{
  "type": "https://bourse.ferraille-stellaire.example/problemes/annonce-deja-vendue",
  "title": "Cette Annonce est déjà vendue",
  "status": 409,
  "detail": "L'Annonce a-bobine-zephyr est déjà vendue : une Annonce ne se vend qu'une fois",
  "instance": "/annonces/a-bobine-zephyr/achat",
  "trace": "4f0c9a6e-5b1d-4f7a-9c1e-2d8b7a3e6f10"
}
```

`type`, `title`, `status`, `detail` et `instance` sont ceux de la RFC ; `trace` (l'identifiant de la requête dans nos journaux) et `erreurs` (le détail d'une requête invalide) sont nos membres d'extension.

## Étape 1 : reproduire le Ticket (3 min)

Service Bourse lancé (`node service-bourse/src/main.ts`) :

```bash
curl -si -X POST http://127.0.0.1:3100/annonces/a-bobine-zephyr/achat \
  -H "content-type: application/json" -d '{"acheteurId":"zephyr"}'
```

zephyr achète sa propre Annonce. Notez le statut et le corps. Que voit le Joueur ? Que lit un attaquant dans le message ?

## Étape 2 : les fournitures et le branchement (2 min)

```bash
F=enonces/s3/fournitures/erreurs ; B=service-bourse
cp $F/problemes.ts $B/src/infrastructure/http/
cp $F/problemes-test.ts $B/test/infrastructure/http/problemes.test.ts
```

`problemes.ts` contient le schéma `Probleme`, la traduction des erreurs de validation de Zod (400, avec la liste des champs refusés), des refus de Fastify lui-même (JSON mal formé...), des erreurs internes (500, sans message), et le début de la **table de traduction**. Dans `application.ts`, branchez-le, à la place du commentaire qui l'annonce :

```ts
app.setErrorHandler(gererLesErreurs);
app.setNotFoundHandler(routeInconnue);
```

(avec l'import depuis `./problemes.ts`). `npm test` : `problemes.test.ts` est rouge, c'est la suite.

## Étape 3 : la table de traduction (6 min)

D'abord sur papier, en binôme : pour chaque erreur, quel statut, et pourquoi en une phrase ?

| Erreur | 403, 409 ou 422 ? | Pourquoi |
|---|---|---|
| `ObjetDejaEnVente` | | |
| `AnnonceDejaVendue` | | |
| `AnnonceRetiree` | | |
| `AchatDeSaPropreAnnonce` | | |
| `CreditsInsuffisants` | | |
| toute autre `ErreurDuDomaine` | | |

Pour trancher : **403**, le Joueur n'a pas de droit sur cette ressource ; **409**, l'état de la ressource empêche la demande (quelqu'un est passé avant) ; **422**, la requête est bien formée et le Joueur a le droit d'agir, mais une règle du jeu refuse cette demande-là.

Puis complétez `TABLE` dans `problemes.ts`, sur le modèle des deux premières lignes, avec ces `type` et `title` :

| Erreur | `type` (après `.../problemes/`) | `title` |
|---|---|---|
| `ObjetDejaEnVente` | `objet-deja-en-vente` | Cet Objet a déjà une Annonce active |
| `AnnonceDejaVendue` | `annonce-deja-vendue` | Cette Annonce est déjà vendue |
| `AnnonceRetiree` | `annonce-retiree` | Cette Annonce a été retirée par son vendeur |
| `AchatDeSaPropreAnnonce` | `achat-de-sa-propre-annonce` | Un Joueur ne peut pas acheter sa propre Annonce |
| `CreditsInsuffisants` | `credits-insuffisants` | Crédits insuffisants |
| `ErreurDuDomaine` | `regle-de-la-bourse` | Une règle de la Bourse aux épaves refuse cette demande |

L'ordre compte : la première classe qui correspond l'emporte, donc `ErreurDuDomaine`, la classe mère, en dernier.

## Étape 4 : journaliser sans fuite (2 min)

Une erreur 500 ne dit rien au Joueur, mais l'équipe doit pouvoir la retrouver. Dans `gererLesErreurs`, à la place du commentaire : si le statut est 500 ou plus, `request.log.error({ err: erreur, trace: probleme.trace }, "erreur interne")`. La stack part dans les journaux du serveur, sous le même identifiant que la `trace` du Joueur ; elle ne part jamais dans la réponse.

## Étape 5 : vert, et le Ticket fermé (5 min)

`npm test` et `npm run typecheck` : verts. Les tests fournis ont **ma** réponse pour la table : si vous n'êtes pas d'accord avec l'un de mes statuts, gardez le vôtre dans le tableau papier, avec sa phrase, pour la mise en commun.

Relancez le Service Bourse et le `curl` de l'étape 1 : statut, type de contenu, corps. Le Ticket est-il fermé ?

Puis une vraie erreur interne : arrêtez PostgreSQL, demandez les Annonces, et regardez le terminal du serveur.

```bash
docker compose stop postgres
curl -s http://127.0.0.1:3100/annonces
docker compose start postgres
```

La réponse : un 500 et sa `trace`, rien d'autre. Le terminal du serveur : la stack, sous la même `trace`.

## S'il vous reste du temps

Envoyez `{"objetId":"o-pile-zephyr","vendeurId":"zephyr","prix":-500}` à `POST /annonces`, puis le même corps avec une accolade en moins. Comparez les deux Problem Details : qui a refusé chacun ?

## Mise en commun (6 min)

Vos statuts au tableau, surtout là où vous n'êtes pas d'accord avec les tests. Puis : qu'est-ce qui part dans la réponse, qu'est-ce qui part dans les journaux, et pourquoi ? Le Domain sait-il qu'il existe un code 422 ?
