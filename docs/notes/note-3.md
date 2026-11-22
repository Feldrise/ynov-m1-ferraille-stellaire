# Note 3 : consignes et grille

## Le principe

Vous livrez les Services Bourse et Inventaire reliés par RabbitMQ, tels que l'atelier de ce matin les a laissés, puis votre réponse à un **Incident de Cycle** : un incident de production, tiré au sort, que votre architecture doit absorber. Je note de trois façons :

- **je lis votre code**, vos tests, votre ADR de l'Incident et votre Journal du Familier ;
- **je lance vos tests**, ceux de l'Incident compris, sur un clone neuf de votre tag ;
- **je vous inspecte** : environ 10 minutes à votre table, entre 13h00 et 14h30, sur votre raisonnement face à l'Incident.

### Les règles

- **En binôme**, le binôme de la Note 2. Un seul dépôt, le dépôt privé du binôme.
- **Documents et Familier autorisés**, agents compris. Une seule règle : chacun de vous doit pouvoir expliquer et défendre tout ce que vous rendez.
- **Durée** : 3 h 30, de 10h20 à 14h50, hors pause déjeuner (12h00 à 13h00).
- **Rendu** : le tag `note-3` posé et poussé avant 14h50 sur le dépôt privé du binôme, et son lien sur Moodle.

## Le déroulé

| Heure | Ce qui se passe |
|---------------|------------------------------------------------------------|
| 10h20 à 11h00 | vous finissez la chaîne asynchrone de l'atelier : outbox, Service Inventaire, idempotence, nouvelles tentatives ; `npm test` vert, `npm run dupe -- --bourse` en échec (code 1 ; un code 2 dit qu'un service est injoignable) |
| 11h00 | tirage au sort : chaque binôme tire son Incident de Cycle et son numéro de passage aux Inspections ; je vous remets la fiche, sur papier et sur Moodle |
| 11h00 à 14h50 | votre réponse à l'Incident : diagnostic, couches touchées, code, test, ADR |
| 13h00 à 14h30 | les Inspections, dans l'ordre tiré, environ 10 minutes chacune |
| 14h50 | tag `note-3` et push |

Les cinq Incidents possibles : une Dupe signalée, un raid de bots, un trafic multiplié par dix au lancement de Cycle, une panne du Service Inventaire pendant dix minutes, l'arrivée d'une monnaie premium. Ils sont de difficulté comparable : chacun touche une ou deux couches. Chaque fiche dit ce qui s'est passé, ce que vous rendez, et par où commencer.

## Ce que vous rendez

1. **La chaîne asynchrone** : `service-bourse/` et `service-inventaire/`, `npm test` et `npm run typecheck` verts, les tests d'architecture des deux services verts.
2. **La réponse à l'Incident dans le code**, à la couche où elle doit vivre, et **son test** dans `test/incident/` du service touché : il rejoue l'Incident, il échouerait sur votre code de 11h00, il passe sur celui de 14h50.
3. **L'ADR de l'Incident**, dans `docs/adr/`, numéroté à la suite : le signalement, votre diagnostic, la décision, ce que vous avez écarté, ce que cela coûte. Modèle : `docs/modeles/adr.md`.
4. **Le Journal du Familier**, dans `docs/journal-du-familier/note-3.md` : 3 à 5 entrées « décision », de vous deux, sur l'atelier comme sur l'Incident. Modèle : `docs/modeles/journal-du-familier.md`.

## La grille

| Critère | Ce que je regarde | Points |
|------------------------------|------------------------------------------------------|--------|
| **Chaîne asynchrone** | la Vente conclue écrite dans l'outbox dans la transaction de la vente, puis publiée par le relais (8) ; le consommateur qui acquitte après le traitement, sur la topologie RabbitMQ de l'Inventaire (6) ; le Service Inventaire en couches, tests d'architecture verts (6) ; l'idempotence par clé de déduplication, dans la même transaction que la cession (5) ; les nouvelles tentatives et la file des messages en échec (5) | 30 |
| **Réponse à l'Incident dans le code** | chaque exigence de la fiche, tenue (12) ; à la bonne couche, sans toucher ce qui n'a pas à l'être, tests d'architecture verts (8) | 20 |
| **ADR de l'Incident** | titre qui énonce la décision (2) ; contexte : le signalement et la cause trouvée dans le code (4) ; décision précise, ce qui est fait et où (3) ; au moins une option écartée, avec sa raison (3) ; conséquences, coût compris (3) | 15 |
| **Raisonnement exposé en Inspection** | le diagnostic (7) ; la couche touchée, et pourquoi celle-là (6) ; le plan : ce que vous avez fait, ce qui reste, ce que vous feriez ensuite (7) | 20 |
| **Tests** | le test de l'Incident rejoue ce que dit la fiche, et vérifie le résultat attendu (3) ; `npm test` vert au tag (2) | 5 |
| **Journal du Familier** | 3 à 5 entrées « décision » (3) ; au moins une proposition modifiée ou rejetée au nom d'une règle du cours (4) ; une vérification par entrée, test, commande ou lecture (3) | 10 |
| | **Total** | **100** |

Un code qui ne passe plus `npm test` ou `npm run typecheck` au tag est lu quand même, mais les critères « chaîne asynchrone » et « réponse à l'Incident » plafonnent alors à la moitié de leurs points. Un test affaibli pour passer (`expect` retiré, test sauté) ne rapporte rien sur son critère.

## L'Inspection

Entre 13h00 et 14h30, dans l'ordre tiré à 11h00, je passe à votre table, environ 10 minutes, pendant que la classe continue. Je désigne un fichier de votre dépôt, puis le membre qui répond ; l'autre ne souffle pas. Par exemple :

- « Racontez l'Incident en une phrase : qu'est-ce qui a cassé, et où dans le code ? »
- « Pourquoi votre réponse vit-elle dans cette couche, et pas dans celle d'à côté ? »
- « Il vous reste une heure : que faites-vous ensuite ? »

Une ou deux questions portent aussi sur la chaîne asynchrone (« Le Service Inventaire tombe juste avant d'acquitter : que se passe-t-il ? »). Une réponse fausse ou absente sur la chaîne retire jusqu'à la moitié des points de ce critère, aux deux membres.

L'Inspection porte sur votre **raisonnement face à l'Incident**, pas sur votre avancement : un binôme inspecté à 13h00, qui n'a encore rien codé, est noté sur son diagnostic, sa couche et son plan, et n'est pas pénalisé.

## Le rendu

Avant 14h50, depuis le poste du binôme dont le remote `binome` désigne le dépôt privé (sur le clone de l'autre membre, c'est `origin`) :

<!-- parcours : ignorer, le dépôt rejoué n'a pas de remote binome -->
```bash
git add -A && git commit -m "Note 3"
git tag note-3
git push binome main --tags
```

Puis l'un de vous colle le lien du dépôt sur Moodle. Si le push échoue malgré tout : `git bundle create ~/note-3.bundle --all`, et déposez ce fichier sur Moodle avant 14h50.

Seuls comptent le tag `note-3` et ce qu'il désigne : un commit poussé après 14h50 n'est pas lu.
