# Atelier asynchrone : la Vente conclue traverse la station

En binôme, 70 minutes : 3 minutes de consignes, 60 de travail, 7 de mise en commun. Ce que vous ne finissez pas, vous le finissez entre 10h20 et 11h00 : c'est la première partie de la Note 3.

Aujourd'hui, la Bourse aux épaves et l'Inventaire se séparent. Le **Service Bourse** vend ; le **Service Inventaire** tient ce que possède chaque Joueur. Entre les deux, la **Vente conclue** voyage par RabbitMQ :

1. le Service Bourse l'écrit dans son **outbox**, dans la même transaction que la vente ; un **relais** la publie ensuite sur l'échange `ferraille.bourse`, clé de routage `vente.conclue` ;
2. le Service Inventaire la reçoit dans sa file `inventaire.vente-conclue`, transfère l'Objet, puis **acquitte** ;
3. RabbitMQ livre **au moins une fois** : une Vente conclue déjà appliquée ne s'applique pas deux fois (**clé de déduplication**) ; un traitement qui échoue est **réessayé** (`inventaire.vente-conclue.attente.2000ms`), puis rangé dans la **file des messages en échec** (`inventaire.vente-conclue.echecs`).

Le Familier est autorisé. Vous devez pouvoir dire, pour chaque étape, ce qui se passe si le service tombe juste avant, et juste après.

## Étape 0 : un point de départ commun (3 min)

Votre Service Bourse de la Note 2 reste sous le tag `note-2`. Vous repartez de la référence de fin de Séance 4. Depuis la racine du dépôt du binôme, conteneurs démarrés :

```bash
git add -A ; git commit -m "Avant la Séance 5" --allow-empty
npm run recuperer -- fin-s4
rm -rf service-bourse/src service-bourse/test
cp -r ~/fin-s4/src ~/fin-s4/test service-bourse/
```

`npm run recuperer` échoue ? L'archive `fin-s4` est aussi sur Moodle : décompressez-la dans `~/fin-s4`, puis reprenez à la commande `rm -rf`.

## Étape 1 : l'outbox du Service Bourse (10 min)

```bash
F=enonces/s5/fournitures/bourse ; B=service-bourse ; I=service-bourse/src/infrastructure
mkdir -p $I/messagerie $B/test/infrastructure/messagerie
cp $F/schema.sql $F/tables.ts $I/postgres/
cp $F/message-vente-conclue.ts $F/rabbitmq.ts $F/relais-de-l-outbox.ts $I/messagerie/
cp $F/configuration.ts $I/
cp $F/acheter-une-annonce.ts $B/src/application/
cp $F/main.ts $B/src/
cp $F/dependency-cruiser.cjs $B/.dependency-cruiser.cjs
cp $F/outbox-test.ts $B/test/infrastructure/outbox.test.ts
cp $F/rabbitmq-d-essai.ts $B/test/infrastructure/messagerie/
cp $F/publication-rabbitmq-test.ts $B/test/infrastructure/messagerie/publication-rabbitmq.test.ts
npm run typecheck
```

Ce qui est fourni :

- `schema.sql` gagne la table `outbox` : un message par ligne, et `publie_le` vide tant qu'il n'est pas publié ;
- `messagerie/message-vente-conclue.ts` : le message, tel qu'il part sur RabbitMQ, écrit à la main comme un objet de transfert ;
- `messagerie/relais-de-l-outbox.ts` : la boucle qui lit l'outbox (`FOR UPDATE SKIP LOCKED`), publie avec confirmation et `mandatory` (`rabbitmq.ts` : un message qu'aucune file ne reçoit est un échec), puis note `publie_le` ; `main.ts` la démarre ;
- `acheter-une-annonce.ts` ne change que par un commentaire : lisez-le.

À vous : dans `service-bourse/src/infrastructure/postgres/depot-annonces-postgres.ts`, `enregistrerVente` écrit aussi le message dans l'outbox, **dans la même transaction** (`trx`), avec un identifiant neuf (`crypto.randomUUID()`), le type `vente.type`, et la charge `JSON.stringify(versLeMessage(vente))` (`import { versLeMessage } from "../messagerie/message-vente-conclue.ts";`).

<!-- parcours : travail -->
```bash
npm test
npm run typecheck
(cd service-bourse && npx depcruise src --config .dependency-cruiser.cjs)
```

Verts : committez.

## Étape 2 : le Service Inventaire (16 min)

Un service neuf, structuré comme le Service Bourse : Domain, Application, Infrastructure, et ses propres tests d'architecture.

```bash
cp -r enonces/s5/fournitures/service-inventaire .
mv service-inventaire/dependency-cruiser.cjs service-inventaire/.dependency-cruiser.cjs
for f in $(find service-inventaire -name '*-test.ts'); do mv "$f" "${f%-test.ts}.test.ts"; done
npm run typecheck
```

Lisez, en vous partageant les fichiers (6 minutes) :

1. `src/domain/objet.ts` et `src/domain/vente-conclue.ts` : ce que l'Inventaire sait d'un Objet, et ce qu'il retient d'une Vente conclue ;
2. `src/application/ports/depot-objets.ts` : le port, et sa promesse sur la clé de déduplication ; `src/infrastructure/postgres/depot-objets-postgres.ts` la tient avec une transaction et une clé primaire ;
3. `src/infrastructure/messagerie/` : `message-vente-conclue.ts` valide le message à la frontière, avec Zod ; `consommateur.ts` appelle le use case, puis acquitte ; `topologie.ts` déclare les files.

À vous : dans `src/application/transferer-l-objet.ts`, écrivez `executer`, en suivant le commentaire. Le test « la Dupe », dans `test/application/transferer-l-objet.test.ts`, raconte ce que la clé de déduplication empêche : lisez-le avant d'écrire.

<!-- parcours : travail -->
```bash
npx vitest run service-inventaire/test/application service-inventaire/test/infrastructure/depot-objets.test.ts
npm run typecheck
(cd service-inventaire && npx depcruise src --config .dependency-cruiser.cjs)
```

`decision.test.ts` et `consommateur.test.ts` restent rouges : c'est l'étape 3.

## Étape 3 : acquitter, réessayer, abandonner (8 min)

Le consommateur (`consommateur.ts`, fourni) demande à `traiterUnMessage`, dans `src/infrastructure/messagerie/decision.ts`, quoi faire de chaque message, puis il le fait : acquitter, republier dans la file d'attente, ou ranger dans la file des messages en échec. Il acquitte toujours **après**.

À vous : écrivez `traiterUnMessage`, en suivant le commentaire. `decision.test.ts` le teste sans RabbitMQ ; `consommateur.test.ts`, contre RabbitMQ, avec des attentes de 20 millisecondes.

<!-- parcours : travail -->
```bash
npm test
npm run typecheck
```

Verts : committez.

## Étape 4 : la Dupe, une dernière fois (6 min)

Dans un deuxième terminal, le Service Bourse, sur le jeu de démonstration neuf :

<!-- parcours : démarrer -->
```bash
node service-bourse/src/main.ts --reinitialiser
```

Dans un troisième, le Service Inventaire :

<!-- parcours : démarrer -->
```bash
node service-inventaire/src/main.ts --reinitialiser
```

Puis, dans le vôtre, le script de la Dupe, contre les deux services cette fois. Il rejoue la course à l'achat de la Séance 1, puis la Dupe de la Séance 5 : le gagnant revend l'Objet, et la première Vente conclue est publiée une seconde fois. Il finit en échec (code 1) si la Dupe a été empêchée, et en code 2 s'il n'a pas pu conclure (« Service Inventaire injoignable : contrôle impossible ») :

<!-- parcours : attendu 1 -->
```bash
npm run dupe -- --bourse
```

```bash
curl -s http://127.0.0.1:3200/objets/o-module-kessa
```

Ouvrez http://127.0.0.1:15672 (`guest`, `guest`), onglet « Queues » : combien de messages dans `inventaire.vente-conclue.echecs` ?

## S'il vous reste du temps

Arrêtez le Service Inventaire (Ctrl+C), achetez une Annonce (`npm run dupe -- --bourse` en achète une, puis s'arrête en code 2 : l'Inventaire est injoignable), regardez la file `inventaire.vente-conclue` dans l'interface de RabbitMQ, puis relancez le Service Inventaire (sans `--reinitialiser`). Où était la Vente conclue pendant ce temps ? Et si l'Inventaire n'avait jamais démarré, sans file liée à l'échange : où serait-elle ? Cherchez `mandatory` dans `rabbitmq.ts`.

## Mise en commun (7 min)

- Le Service Bourse tombe juste après avoir publié un message, avant de noter `publie_le`. Que se passe-t-il au redémarrage ? Qui doit s'en accommoder ?
- Pourquoi la clé de déduplication est-elle l'Annonce, et pas l'identifiant du message ?
- Le consommateur de la Revue piégée de ce matin acquittait d'abord. Quelle ligne de `consommateur.ts` règle cela, et que coûte-t-elle ?
- Le commentaire d'`acheter-une-annonce.ts` : quelle double écriture reste dans le Service Bourse ?
