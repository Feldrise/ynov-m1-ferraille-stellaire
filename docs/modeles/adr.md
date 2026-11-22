# Écrire un ADR

## À quoi sert un ADR

Un **ADR** (Architecture Decision Record) est la trace écrite d'une décision d'architecture : le contexte, ce qui a été décidé, ce qui a été écarté, et ce que la décision entraîne. Il se lit en deux minutes et reste valable tant que la décision tient.

Dans ce cours, les ADR et le glossaire du domaine transmettent l'architecture, aux humains comme aux agents : l'`AGENTS.md` de ton dépôt ne décrit pas l'architecture, il renvoie vers `GLOSSARY.md` et `docs/adr/`. Chaque Note en demande : **1 en Note 1**, **2 en Note 2**, **1 sur l'Incident de Cycle en Note 3**.

### Les règles

- Un fichier par décision, dans `docs/adr/`, numéroté dans l'ordre : `0001-titre-de-la-decision.md`, `0002-...`.
- Le titre énonce **la décision**, pas la question : « Le jeu de données est rechargé à chaque démarrage », pas « Faut-il recharger les données ? ».
- Court : une demi-page suffit. Un ADR qui ne tient pas sur un écran mélange plusieurs décisions.
- Une décision remplacée ne s'efface pas : on écrit un nouvel ADR et on note dans l'ancien « Remplacé par 000N ».
- Le vocabulaire est celui de `GLOSSARY.md`, mot pour mot.

## Ce qui fait un bon ADR

- **Faible** : « On utilise un port parce que c'est la Clean Architecture. »
- **Solide** : le contexte dit quelle contrainte pèse (« les tests des use cases doivent tourner sans base »), la décision dit ce qui est fait et où, les options écartées disent pourquoi elles ont perdu, les conséquences disent ce que la décision coûte.

## Un exemple

Une décision réelle du dépôt du cours, qui ne fait l'objet d'aucune Note.

```markdown
# 0001. Le jeu de données du Legacy est rechargé à chaque démarrage

Statut : accepté

## Contexte
Les scripts de démonstration (la Dupe notamment) modifient les données : après un essai,
un même Objet est vendu deux fois et deux Joueurs ont payé. Il faut pouvoir rejouer un essai
dans le même état de départ, en Séance, sans manipuler la base à la main.

## Décision
`npm run up` recrée les tables et recharge `legacy/sql/donnees.sql` ;
`npm run reinitialiser` fait de même sans redémarrer les services.

## Options écartées
- Un volume Docker persistant : les essais s'accumulent et chaque poste diverge.
- Des scripts qui annulent leurs propres effets : fragile, et un script interrompu laisse la base sale.

## Conséquences
- Toute donnée saisie à la main disparaît au prochain démarrage.
- Le jeu de données est la seule source : un Objet ajouté pour un exercice s'ajoute dans ce fichier.
```

## Le modèle

Copie ce qui suit dans `docs/adr/000N-titre-de-la-decision.md`.

```markdown
# 000N. (La décision, en une phrase)

Statut : proposé, accepté, ou remplacé par 000M

## Contexte
(La situation et la contrainte qui oblige à décider. Cite le code ou le Ticket concerné.)

## Décision
(Ce qui est décidé, et où cela se voit dans le code.)

## Options écartées
- (Option) : (pourquoi elle a perdu)

## Conséquences
- (Ce que la décision rend facile, ce qu'elle coûte, ce qu'il faudra surveiller)
```
