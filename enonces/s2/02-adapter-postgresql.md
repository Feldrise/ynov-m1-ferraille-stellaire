# Adapter PostgreSQL : le même port, un autre adapter

Seul ou en binôme, 40 minutes : 2 minutes de consignes, 32 minutes de code, 6 minutes de mise en commun.

Ce matin, tes use cases tournaient sur des `Map`. Tu termines maintenant l'adapter **PostgreSQL** du dépôt d'Annonces, avec Kysely, et tu prouves qu'il se comporte comme l'adapter en mémoire : **la même suite de tests de contrat** passe sur les deux. Ce qu'il te reste à écrire est ce qui ferme la porte à la Dupe, en base.

## Les règles du jeu

- Kysely, `pg` et le SQL restent dans `src/infrastructure/postgres/`. Rien n'en sort : l'adapter rend des `Annonce` et des `Objet`, et traduit les erreurs de la base en erreurs du Domain.
- Les tables du Service Bourse vivent dans leur propre schéma PostgreSQL : celles du Legacy ne bougent pas. Chaque fichier de test crée un schéma neuf et le supprime à la fin.
- Les conteneurs doivent tourner (`npm run up` à la racine). Sans base, les tests PostgreSQL échouent : ils ne se sautent pas en silence.

## Étape 1 : les fournitures (4 min)

```bash
F=enonces/s2/fournitures
mkdir -p service-bourse/src/infrastructure/postgres service-bourse/test/infrastructure
cp $F/schema.sql $F/tables.ts $F/connexion.ts $F/depot-annonces-postgres.ts service-bourse/src/infrastructure/postgres/
cp $F/base-de-test.ts $F/contrat-depot-annonces.ts service-bourse/test/infrastructure/
cp $F/depot-annonces-test.ts service-bourse/test/infrastructure/depot-annonces.test.ts
```

Lis `schema.sql` (l'index `annonce_active_par_objet`, la clé de `vente`), `contrat-depot-annonces.ts` (la suite de tests de contrat, écrite une fois, contre le port) et `depot-annonces.test.ts` (qui la joue sur tes deux adapters).

## Étape 2 : constater le rouge (2 min)

```bash
npm test -- depot-annonces
```

La suite passe sur ton adapter en mémoire (sinon, corrige-le d'abord : c'est la suite qui fait foi). Sur PostgreSQL, les lectures et la mise en vente passent, les ventes échouent : `enregistrerVente` est « à écrire ».

## Étape 3 : lire la mise en vente (4 min)

`enregistrerMiseEnVente` est écrite dans `depot-annonces-postgres.ts`. Lis-la : un `insertInto` Kysely, puis le `catch`. Si deux mises en vente du même Objet arrivent en même temps, l'index unique `annonce_active_par_objet` refuse la seconde avec le code PostgreSQL `23505`, et l'adapter le traduit en `ObjetDejaEnVente`, une erreur du Domain. Pourquoi ne pas laisser remonter l'erreur de `pg` telle quelle ? Garde ta réponse pour la mise en commun.

## Étape 4 : enregistrerVente et son verrou (22 min)

Dans une transaction :

1. relis le statut de l'Annonce **en verrouillant sa ligne** ;
2. si elle n'est plus active, lève `AnnonceDejaVendue` ;
3. passe-la au statut vendue, cède l'Objet à l'acheteur, insère la Vente conclue.

Ce qu'il te faut de Kysely (les noms de tables et de colonnes sont dans `tables.ts`) :

```ts
await this.#db.transaction().execute(async (trx) => {
  // dans la transaction, chaque requête passe par trx, jamais par this.#db
});
trx.selectFrom("annonce").select("statut").where("id", "=", id).forUpdate().executeTakeFirst(); // SELECT ... FOR UPDATE
trx.updateTable("objet").set({ proprietaire_id: acheteurId }).where("id", "=", id).execute();
trx.insertInto("vente").values({ annonce_id: ..., prix: vente.prix.montant, ... }).execute();
```

`FOR UPDATE` garde la ligne verrouillée jusqu'à la fin de la transaction : une seconde transaction qui veut la lire de la même façon attend son tour.

Le test « la Dupe : deux copies de la même Annonce achetées au même instant » doit passer : les deux copies ont passé l'invariant du Domain, c'est ta transaction qui tranche. Puis toute la suite : `npm test`.

## S'il te reste du temps

- Branche ta racine de composition sur PostgreSQL : `creerBase(url)` et `installerSchema(url)` sont dans `connexion.ts`.
- Écris l'adapter PostgreSQL du Porte-monnaie, avec un seul `UPDATE ... WHERE credits >= montant` pour le débit, et sa suite de tests de contrat.
- Relance `npm run dupe` contre le Legacy : il réussit toujours. Pourquoi ? Qu'est-ce qui l'arrêtera ?

## Mise en commun (6 min)

Committe. Je retire `.forUpdate()` devant vous et je relance la suite : que se passe-t-il, et pourquoi ? Puis je projette deux adapters du même port, côte à côte, et la racine de composition qui les branche : combien de lignes a-t-il fallu changer dans les use cases pour passer de l'un à l'autre ? Prépare une phrase : où vit la règle « une Annonce ne se vend qu'une fois » dans le Domain, où elle vit dans l'adapter PostgreSQL, et pourquoi il faut les deux.
