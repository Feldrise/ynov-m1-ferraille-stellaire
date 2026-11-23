# Atelier Domain : un Domain qui protège ses règles

Seul ou en binôme, 70 minutes : 60 minutes de code, coupées après l'étape 2 par un point d'étape de 3 minutes (vers 13h55), et 7 minutes de mise en commun à la fin.

Ce matin, la Taxe de Bourse était impossible à tester et la règle « on n'achète pas sa propre Annonce » vivait au milieu de requêtes SQL. Tu les sors du Legacy pour en faire le **Domain** du Service Bourse : du TypeScript pur, testé en quelques millisecondes, sans base ni HTTP.

## Les règles du jeu

- Ton code va dans `service-bourse/src/domain/`, tes tests dans `service-bourse/test/domain/`.
- Le Domain n'importe **rien** d'autre que des fichiers du Domain : ni Fastify, ni `pg`, ni `node:...`, ni `legacy/`. Les tests importent le Domain et `vitest`, rien d'autre.
- Le vocabulaire est celui de `GLOSSARY.md`, mot pour mot : `Annonce`, `Objet`, `Credits`, `TaxeDeBourse`, `VenteConclue`.
- Node.js exécute ton code en effaçant les types : pas de `constructor(private x)` ni de `constructor(readonly x)`, pas d'`enum`, et des imports relatifs qui finissent par `.ts`. `npm run typecheck` le vérifie.
- `npm test` lance tes tests ; garde-les verts à chaque étape.
- Les identifiants (Joueur, Objet, Annonce) sont des `string` : le Domain ne sait pas qu'une base les numérote.

Le Familier est autorisé, comme partout. Une seule règle : tu dois pouvoir expliquer chaque ligne, et en particulier **pourquoi chaque règle est à l'endroit où tu l'as mise**.

## Étape 1 : Crédits (13 min)

Un value object : une somme de Crédits, toujours un entier positif ou nul. Il est immuable et se compare par sa valeur.

```ts
export class Credits {
  readonly montant: number;
  static de(montant: number): Credits; // refuse un montant négatif ou non entier
  plus(autre: Credits): Credits;
  moins(autre: Credits): Credits; // refuse un résultat négatif
  egale(autre: Credits): boolean;
}
```

Tests attendus : un montant négatif est refusé ; un montant non entier est refusé ; deux Crédits de même montant sont égaux.

Pourquoi un constructeur privé et une fabrique `Credits.de` ? Prépare ta réponse.

## Étape 2 : Taxe de Bourse (12 min)

Un value object : le pourcentage prélevé sur chaque Vente conclue, 5 %. Tranche le désaccord du Legacy : on garde l'arrondi **de l'achat**, au Crédit inférieur, parce que c'est celui qui prélève vraiment.

```ts
export class TaxeDeBourse {
  readonly taux: number; // en pour cent
  static standard(): TaxeDeBourse; // 5 %
  prelevementSur(prix: Credits): Credits; // arrondi au Crédit inférieur
}
```

Tests attendus : sur 1000 Crédits, 50 ; sur 190 Crédits, 9 (le Legacy en annonce 10 dans la liste).

## Point d'étape (vers 13h55, 3 min)

Je demande à deux binômes où ils ont mis la validation du montant, et pourquoi. Je désigne qui répond, écran fermé.

## Étape 3 : Annonce et Vente conclue (18 min)

**Avant de coder**, dans `journal-s1.md` : où vas-tu mettre la règle « un Joueur ne peut pas acheter sa propre Annonce », et pourquoi là ? Une phrase.

`VenteConclue` est un **événement de domaine** : un `type` en lecture seule qui dit ce qui s'est passé (Annonce, Objet, vendeur, acheteur, prix, taxe, net vendeur, date).

`Annonce` est une **entité** : elle a une identité et elle protège ses règles.

```ts
export class Annonce {
  readonly id: string;
  readonly objetId: string;
  readonly vendeurId: string;
  readonly prix: Credits;
  static publier(props: { id: string; objetId: string; vendeurId: string; prix: Credits }): Annonce;
  netVendeur(taxe: TaxeDeBourse): Credits; // ce que touchera le vendeur
  acheter(acheteurId: string, taxe: TaxeDeBourse, le: Date): VenteConclue;
}
```

Invariants à porter :

- **le prix est strictement positif** : une Annonce à 0 Crédit est refusée (et à -500, `Credits.de` refuse déjà) ;
- **un Joueur ne peut pas acheter sa propre Annonce**.

Tests attendus : les deux refus ; une Vente conclue à 190 Crédits porte une taxe de 9 et un net vendeur de 181 ; `netVendeur` annonce exactement ce que `acheter` versera.

La taxe est passée en paramètre de `acheter` au lieu d'être choisie par l'Annonce : garde cette question en tête, elle reviendra.

## Étape 4 : Objet (17 min)

**Avant de coder**, dans `journal-s1.md` : la règle « un Objet n'a qu'une seule Annonce active à la fois » va dans `Objet`, pas dans `Annonce`. Pourquoi ? Quelle entité peut savoir qu'une Annonce active existe déjà ? Une phrase.

`Objet` est une entité : un exemplaire unique de butin, qui appartient à un Joueur.

```ts
export class Objet {
  readonly id: string;
  readonly nom: string;
  constructor(props: { id: string; nom: string; proprietaireId: string; annonceActive?: string | null });
  get proprietaireId(): string;
  get annonceActive(): string | null;
  mettreEnVente(props: { annonceId: string; vendeurId: string; prix: Credits }): Annonce;
}
```

Invariants à porter :

- **seul le propriétaire met son Objet en vente** ;
- **un Objet n'a qu'une seule Annonce active à la fois**.

Tests attendus : la mise en vente par le propriétaire rend une Annonce ; un autre Joueur est refusé ; une seconde mise en vente du même Objet est refusée.

## S'il te reste du temps

- `retirerDeLaVente()` : l'Objet peut de nouveau être mis en vente ensuite.
- `ceder(vente: VenteConclue)` : après la vente, l'Objet change de propriétaire et n'est plus en vente ; l'ancien propriétaire ne peut plus le mettre en vente.
- Relance `npm run dupe` contre le Legacy. Ton Domain empêche-t-il la Dupe ? Pourquoi pas encore ? Note ta réponse : on en repart en Séance 2.

## Mise en commun (7 min)

Ton Familier t'a servi ? Une entrée « Familier » dans `journal-s1.md`. Committe ton travail (`git add service-bourse journal-s1.md && git commit`). Je projette un Domain, et son auteur explique, écran fermé, pourquoi chaque invariant est là où il est ; on lit ensemble ses tests : est-ce qu'ils démarrent une base ? Combien de millisecondes ? Combien d'endroits calculent la Taxe de Bourse ?
