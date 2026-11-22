# Atelier Familier n°1 : le Familier restructure la Bourse

Seul ou en binôme, 15 minutes, puis 5 minutes de restitution.

Tu viens de voir la règle de dépendance et les trois couches. Ton Familier, lui, les connaît depuis toujours : demande-lui de faire le travail, puis autopsie ce qu'il rend avec la même rigueur que le Legacy. Il produira presque toujours un code qui compile et qui a l'air propre. La question est de savoir s'il respecte la règle.

## 1. La demande (3 min)

Dans GitHub Copilot (mode Agent), ou dans l'outil de ton choix, ouvre le dépôt et envoie **exactement** cette demande :

```text
Mets le module Bourse du Legacy (legacy/src/routes/bourse.ts) en Clean Architecture.
Écris le résultat dans un nouveau dossier familier-1/, sans modifier legacy/.
```

N'ajoute aucune précision : on veut voir ce qu'il fait seul. Pendant qu'il travaille, lis la grille ci-dessous. Si ton Familier ne répond pas (quota, réseau), autopsie la sortie de ton voisin.

## 2. L'autopsie (12 min)

Quatre rubriques, dans l'ordre. Tu n'as rien à recopier : note tes réponses d'un mot, on s'en sert à la restitution.

### Fuites entre couches

```bash
grep -rn "^import" familier-1/
```

Chaque ligne donne un fichier, donc sa couche annoncée, et ce qu'il importe (un import écrit sur plusieurs lignes n'affiche que la première : ouvre le fichier). Il y a fuite quand un fichier du Domain ou de l'Application importe Fastify, `pg`, `db.ts`, un module natif de Node.js ou un fichier de l'Infrastructure. Un `import type` compte : il crée la même dépendance dans la tête de celui qui lit. Combien de fuites ?

### Domain anémique

- Les entités ont-elles des méthodes qui protègent une règle, ou ne sont-elles que des champs (une `interface`, un `type`, une classe sans comportement) ?
- Où la Taxe de Bourse est-elle calculée, et à combien d'endroits ?

### Règles restées dans les routes

Dans les routes ou contrôleurs produits, reste-t-il des `if` qui décident d'une règle du jeu, par exemple « on n'achète pas sa propre Annonce » ?

### Est-ce que ça tourne ?

Node.js exécute le TypeScript en effaçant les types, sans le transformer. Chaque ligne affichée par ces deux commandes fait planter `node`, même si un test Vitest passe :

```bash
grep -rnE "constructor\((private|public|protected|readonly) |(^| )enum " familier-1/
grep -rnE "from ['\"]\.\.?/" familier-1/ | grep -vE "\.ts['\"]"
```

La première trouve les propriétés de paramètre et les `enum`, la seconde les imports relatifs sans extension `.ts`.

## 3. Le verdict, à la restitution

Pas de verdict écrit : on le formule ensemble à la restitution, en trois colonnes au tableau, comme une entrée du Journal du Familier que tu tiendras à chaque Note : ce que le Familier a proposé ; gardé, modifié ou rejeté ; pourquoi, au regard de la règle de dépendance.

Supprime ensuite `familier-1/` ou garde-le hors de tes commits : le Service Bourse, tu vas l'écrire toi-même cet après-midi.
