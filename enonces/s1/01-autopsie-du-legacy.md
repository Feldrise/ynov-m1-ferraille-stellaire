# Fiche d'autopsie du Legacy

En binôme, 35 minutes, puis 10 minutes de restitution collective.

Le Legacy fonctionne : les Joueurs achètent, vendent, partent en Expédition. Pourtant le studio n'ose plus y toucher. Ton travail de médecin légiste : trouver pourquoi, preuves à l'appui. Chaque défaut que tu relèves sera noté au tableau, et le cours entier servira à les soigner.

Copie cette fiche dans un fichier `autopsie.md` à la racine de ton dépôt et remplis-la au fil de l'eau.

Crée aussi `journal-s1.md` à la racine de ton dépôt : tu le tiendras toute la journée. Deux sortes d'entrées :

```markdown
## Avant de coder : <la question posée>

<ta réponse, en une phrase, écrite avant d'ouvrir le Familier>

## Familier : <le bloc, par exemple Autopsie>

- Proposé : <ce que le Familier a proposé ou affirmé>
- Gardé, modifié ou rejeté : <ta décision>
- Pourquoi : <ce que tu as vérifié, et comment>
```

Le Familier est autorisé, comme partout. À la restitution, je désigne qui répond dans chaque binôme, écran fermé : chacun doit pouvoir défendre toute la fiche, pas seulement ses parties.

## Partagez-vous le travail

Le chronomètre est court : **A** fait les parties 1 et 2, **B** les parties 3 et 4, en même temps. Gardez les 8 dernières minutes pour la partie 5, ensemble.

| Partie | Qui | Repère |
|---|---|---|
| 1. Cartographier la Bourse aux épaves | A | 14 min |
| 2. Les trois endroits de la Taxe de Bourse | A | 13 min |
| 3. Tenter un test unitaire de la taxe | B | 12 min |
| 4. Reproduire la Dupe | B | 15 min |
| 5. Le bilan du binôme | A et B | 8 min |

## 1. Cartographier la Bourse aux épaves (A)

Le code de la Bourse aux épaves est dans `legacy/src/routes/bourse.ts`. Remplis une ligne par route :

| Route | Ce qu'elle fait pour le Joueur | Requêtes SQL (nombre) | Règles métier qu'elle applique |
|---|---|---|---|
| `GET /annonces` | | | |
| `GET /annonces/:id` | | | |
| `POST /annonces` | | | |
| `DELETE /annonces/:id` | | | |
| `POST /annonces/:id/achat` | | | |

Puis réponds en une phrase chacune :

- Où se trouve le code qui parle à la base, et où se trouvent les règles du jeu ?
- Le dossier `legacy/src/` contient-il autre chose que des routes, le serveur et la connexion ?

## 2. Les trois endroits de la Taxe de Bourse (A)

La Taxe de Bourse vaut 5 %. Elle est calculée à **trois** endroits du Legacy, et pas toujours écrite de la même façon. Indice : cherche `0.05` et `5 / 100`, et ne te limite pas au fichier de la Bourse.

| Fichier et ligne | Ce que le calcul sert à produire | Arrondi employé |
|---|---|---|
| | | |
| | | |
| | | |

Pour une Annonce à **190 Crédits** : combien de taxe la liste des Annonces annonce-t-elle au vendeur, et combien la vente lui prélève-t-elle vraiment ? Qui a raison ?

## 3. Tenter un test unitaire de la taxe (B)

Un test unitaire vérifie une règle sans base de données ni réseau, en quelques millisecondes. Essaie d'en écrire un pour la règle « sur 190 Crédits, la taxe prélevée vaut 9 Crédits ».

Crée `autopsie/taxe.test.ts` :

```ts
import { expect, it } from "vitest";
import "../legacy/src/routes/bourse.ts"; // charge le module de la Bourse, comme le fait le serveur

it("prélève 9 Crédits de Taxe de Bourse sur une Annonce à 190 Crédits", () => {
  // À toi : comment appeler le calcul de la taxe ?
});
```

Lance-le **comme si la base n'existait pas** (c'est la situation d'un test unitaire, ou de la CI) :

```bash
DATABASE_URL=postgres://ferraille:ferraille@127.0.0.1:1/ferraille npx vitest run autopsie
```

Note :

- le message d'erreur exact, et la ligne du Legacy qui le provoque ;
- ce qu'il faudrait mettre en place pour tester cette seule règle de 5 % malgré tout (liste-le, ne le fais pas).

Tu as 12 minutes : si tu n'y arrives pas, c'est le résultat attendu. Note pourquoi. Après la restitution, supprime le dossier `autopsie/` : ce test n'a pas vocation à rester.

## 4. Reproduire la Dupe (B)

Le Legacy tourne dans un terminal (`npm run legacy`). Dans un second, relève d'abord les Crédits de zephyr et de lyra : la commande connecte chacun des deux, puis appelle `GET /moi` avec son jeton.

```bash
for joueur in zephyr lyra; do
  jeton=$(curl -s -X POST http://127.0.0.1:3000/connexion -H 'content-type: application/json' \
    -d "{\"pseudo\":\"$joueur\",\"motDePasse\":\"ferraille\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).jeton')
  curl -s http://127.0.0.1:3000/moi -H "authorization: Bearer $jeton"; echo
done
```

Le script de la Dupe connecte zephyr et lyra, qui achètent la même Annonce au même instant. **Avant de le lancer**, écris dans la fiche ta prédiction, en une phrase : que répondra le Legacy à chacun des deux, et combien de fois l'Objet sera-t-il vendu ?

```bash
npm run dupe
```

- Que répond le Legacy à chacun des deux ? Ta prédiction était-elle juste ? Sinon, qu'avais-tu manqué ?
- Relance la première commande : combien de Crédits ont quitté les poches des acheteurs, et combien de fois l'Objet a-t-il été vendu ?
- Relis `POST /annonces/:id/achat` : entre quelle requête et quelle requête les deux achats se croisent-ils ?
- Pour un Joueur de Ferraille Stellaire, comment s'appelle ce qui vient de se passer ? (Le mot est dans `GLOSSARY.md`.)

Recharge les données après (`npm run reinitialiser`) : la Dupe a laissé la base dans un état faux.

## 5. Le bilan du binôme (A et B)

Parmi tous les défauts que vous avez relevés, y compris ceux que vous avez croisés sans les chercher, choisissez les **trois plus graves** et classez-les, du plus grave au moins grave. Pour chacun, une conséquence concrète pour le studio ou pour un Joueur : c'est elle qui justifie le rang.

| Rang | Défaut | Où | Conséquence |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

Votre Familier vous a servi ? Une entrée « Familier » dans `journal-s1.md`, et s'il s'est trompé, sur quoi : une ligne du Legacy, un nombre, un arrondi.

Gardez votre fiche : pendant la restitution, chaque binôme apporte un défaut que les autres n'ont pas encore cité, et je peux vous demander de défendre votre classement.
