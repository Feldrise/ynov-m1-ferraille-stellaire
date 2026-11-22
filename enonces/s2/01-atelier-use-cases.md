# Atelier use cases : Mettre en vente, Acheter une Annonce

Seul ou en binôme, 65 minutes : 3 minutes de consignes, 55 minutes de code, 7 minutes de mise en commun.

Ce matin, ton Domain sait refuser un prix nul ou l'achat de sa propre Annonce, mais personne ne l'appelle. Tu écris les deux premiers **use cases** du Service Bourse, les **ports** dont ils ont besoin, et les **adapters en mémoire** qui permettent de les tester sans base ni HTTP.

## Les règles du jeu

- Trois dossiers dans `service-bourse/src/` : `domain/` (celui de la référence de fin de Séance 1, installé à l'étape 0), `application/` (use cases et ports), `infrastructure/` (adapters). Les tests vont dans `service-bourse/test/`, en miroir.
- `application/` n'importe que `domain/` et `application/` : ni `kysely`, ni `pg`, ni `fastify`, ni `node:...`, ni `infrastructure/`.
- Les tests des use cases utilisent les adapters en mémoire : aucun `vi.mock`, aucune base, aucun HTTP.
- Comme en Séance 1 : syntaxe effaçable (pas de `constructor(private x)`), imports relatifs en `.ts`, `npm test` et `npm run typecheck` verts à chaque étape.

Le Familier est autorisé. Tu dois pouvoir dire, pour chaque ligne, dans quelle couche elle est et pourquoi.

## Étape 0 : le Domain commun et les fournitures (4 min)

Les ports et les fournitures de la Séance parlent le langage d'un Domain précis : `identifiants.ts`, `vente-conclue.ts`, l'erreur `ObjetDejaEnVente`... Ton Domain de Séance 1 a peut-être d'autres noms. Tu le gardes sous un tag Git, et tu installes à sa place celui de la référence de fin de Séance 1, avec ses tests. Depuis la racine du dépôt, conteneurs démarrés ou non :

```bash
git add service-bourse ; git commit -m "Mon Domain de la Séance 1" ; git tag mon-domain-s1
npm run recuperer -- fin-s1
rm -rf service-bourse/src/domain service-bourse/test/domain
mkdir -p service-bourse/src service-bourse/test
cp -r ~/fin-s1/src/domain service-bourse/src/ && cp -r ~/fin-s1/test/domain service-bourse/test/
npm test && npm run typecheck
```

`git commit` peut répondre « rien à valider » : ton Domain était déjà committé, le tag le garde quand même. Pour comparer plus tard : `git diff mon-domain-s1 -- service-bourse/src/domain`.

Puis les fournitures :

```bash
F=enonces/s2/fournitures
mkdir -p service-bourse/src/application/ports service-bourse/src/infrastructure/memoire service-bourse/test/application
cp $F/application-erreurs.ts service-bourse/src/application/erreurs.ts
cp $F/porte-monnaie.ts $F/horloge.ts service-bourse/src/application/ports/
cp $F/porte-monnaie-en-memoire.ts $F/depot-annonces-en-memoire.ts service-bourse/src/infrastructure/memoire/
cp $F/mettre-en-vente-test.ts service-bourse/test/application/mettre-en-vente.test.ts
cp $F/acheter-une-annonce-test.ts service-bourse/test/application/acheter-une-annonce.test.ts
```

Tu reçois : les erreurs « introuvable » de l'Application, les ports `PorteMonnaie` et `Horloge`, l'adapter en mémoire du Porte-monnaie (complet), un squelette de l'adapter en mémoire du dépôt d'Annonces (lectures écrites, écritures à faire), les tests de Mettre en vente et le début de ceux d'Acheter une Annonce. Ils ne compilent pas encore : les étapes 1 à 4 leur donnent ce qu'il leur manque. Jusque-là, `npm test` est rouge, c'est normal.

## Étape 1 : une Annonce ne se vend qu'une fois (10 min)

Dans le Domain :

- l'Annonce a un **statut** : `export type StatutAnnonce = "active" | "vendue" | "retiree";`, lu par `get statut()` ; `publier` crée une Annonce active ;
- `static reconstituer(props: { id; objetId; vendeurId; prix: Credits; statut: StatutAnnonce }): Annonce` : pour les adapters qui relisent une Annonce enregistrée, avec les mêmes invariants (prix strictement positif) ;
- `acheter` refuse une Annonce vendue (`AnnonceDejaVendue`) ou retirée (`AnnonceRetiree`), puis passe l'Annonce au statut vendue ;
- ajoute dans `erreurs.ts` les trois erreurs que la référence de Séance 1 n'a pas : `AnnonceDejaVendue(annonceId: string)`, `AnnonceRetiree(annonceId: string)` et `CreditsInsuffisants(joueurId: string, manque: number)` (le Porte-monnaie en mémoire utilise la dernière).

Tests attendus : une Annonce est active à sa publication, vendue après l'achat ; **un second achat est refusé** ; une Annonce retirée ne s'achète pas.

## Étape 2 : le port du dépôt d'Annonces et son adapter en mémoire (12 min)

Le port, à recopier dans `src/application/ports/depot-annonces.ts` :

```ts
import type { Annonce } from "../../domain/annonce.ts";
import type { AnnonceId, ObjetId } from "../../domain/identifiants.ts";
import type { Objet } from "../../domain/objet.ts";
import type { VenteConclue } from "../../domain/vente-conclue.ts";

export interface DepotAnnonces {
  nouvelIdentifiant(): AnnonceId;
  // L'Objet tel que la Bourse le voit : son propriétaire et son Annonce active, s'il en a une.
  objet(id: ObjetId): Promise<Objet | undefined>;
  annonce(id: AnnonceId): Promise<Annonce | undefined>;
  // Une seule Annonce active par Objet, même sous deux appels simultanés (lève ObjetDejaEnVente).
  enregistrerMiseEnVente(annonce: Annonce): Promise<void>;
  // Une Annonce ne se vend qu'une fois, même sous deux appels simultanés (lève AnnonceDejaVendue).
  // Marque l'Annonce vendue, cède l'Objet à l'acheteur, garde la Vente conclue.
  enregistrerVente(vente: VenteConclue): Promise<void>;
}
```

Complète `DepotAnnoncesEnMemoire` : `nouvelIdentifiant`, `enregistrerMiseEnVente`, `enregistrerVente`. Il garde des **lignes** (des objets simples), pas tes entités : deux lectures de la même Annonce rendent deux copies distinctes, comme une base. C'est lui qui refuse la seconde écriture.

Pourquoi des copies ? Garde ta réponse pour la mise en commun.

## Étape 3 : Mettre en vente (8 min)

`src/application/mettre-en-vente.ts` :

```ts
export class MettreEnVente {
  constructor(ports: { annonces: DepotAnnonces });
  executer(commande: { objetId: string; vendeurId: string; prix: number }): Promise<Annonce>;
}
```

Il charge l'Objet (`ObjetIntrouvable` s'il n'existe pas), le laisse publier l'Annonce, l'enregistre. Aucune règle du jeu dans le use case.

Les tests sont fournis (`test/application/mettre-en-vente.test.ts`, copié à l'étape 0) : lis-les d'abord, ils disent ce que le use case doit faire, avec `DepotAnnoncesEnMemoire` et un Objet ajouté par `ajouterObjet`. Ils doivent passer sans être modifiés. Remarque ce qu'ils n'importent pas.

## Étape 4 : Acheter une Annonce (21 min)

`src/application/acheter-une-annonce.ts` :

```ts
export class AcheterUneAnnonce {
  constructor(ports: { annonces: DepotAnnonces; porteMonnaie: PorteMonnaie; horloge: Horloge; debutDuCycle: Date });
  executer(commande: { annonceId: string; acheteurId: string }): Promise<VenteConclue>;
}
```

Dans l'ordre : charger l'Annonce (`AnnonceIntrouvable`) ; demander à l'Annonce la Vente conclue, avec la Taxe de Bourse applicable à l'heure de l'horloge ; débiter l'acheteur du prix ; enregistrer la vente ; créditer le vendeur du net. Le use case ne lit jamais `new Date()` : c'est le rôle de l'horloge.

Les tests, dans `test/application/acheter-une-annonce.test.ts` : le début est fourni, avec les adapters en mémoire, une horloge de test (le mardi 15 décembre, Cycle 4 lancé le vendredi 4 à 18h00) et le premier test, la vente à 190 Crédits (l'acheteur paie 190, le vendeur touche 181, l'Objet change de propriétaire). À toi d'écrire les deux `it.todo` :

- **le refus d'un second achat du même Objet** : le second acheteur reçoit `AnnonceDejaVendue` et garde ses Crédits ;
- un acheteur sans assez de Crédits est refusé (`CreditsInsuffisants`), et rien n'est vendu.

## S'il te reste du temps

- Lance deux achats **simultanés** (`Promise.allSettled([acheter("zephyr"), acheter("lyra")])`). Les deux acheteurs ont-ils payé ? Si oui, rends ses Crédits au perdant quand `enregistrerVente` échoue, et explique ce qui arriverait si le service s'arrêtait entre le débit et le remboursement.
- Écris la racine de composition, `src/infrastructure/composition.ts` : une fonction qui construit les deux use cases à partir des adapters.

## Mise en commun (7 min)

Committe (`git add service-bourse && git commit`). Je projette un use case : y a-t-il une seule règle du jeu dedans ? Combien de millisecondes pour les tests ? Pourquoi le dépôt en mémoire rend-il des copies ?
