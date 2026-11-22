# Journal du Familier

## Le Familier est autorisé, son usage se documente

Dans ce cours, l'IA générative s'appelle le **Familier** : un pair utile, rapide, et qui produit parfois avec aplomb un code qui fonctionne mais viole la règle de dépendance. Tu peux t'en servir partout, agents compris, **pendant les trois Notes aussi**. Une seule règle : tu dois pouvoir expliquer et défendre tout ce que tu rends.

Je ne note pas ce que ton Familier sait produire. Je note ton jugement sur ce qu'il propose. Le Journal du Familier le rend visible.

### Les règles

- Le Journal du Familier est une **annexe obligatoire** de chaque Note et vaut **10 points sur 100** dans chaque grille.
- Il compte **3 à 5 entrées « décision »**, pas la liste de tes prompts : avec un agent, cette liste serait illisible.
- Une entrée raconte un moment où le Familier a proposé quelque chose et où tu as **gardé**, **modifié** ou **rejeté** sa proposition, avec la **règle du cours** qui justifie ta décision.
- Les entrées où le Familier avait tort valent le plus : c'est là que ton jugement se voit.
- Il vit dans ton dépôt, un fichier par Note (`docs/journal-du-familier/note-1.md`, `note-2.md`, `note-3.md`), et part avec le tag Git de la Note. En binôme, un seul Journal pour les deux.

## Ce qui fait une bonne entrée

- **Faible** : « Rejeté, parce que ce n'était pas propre. »
- **Solide** : « Rejeté, parce que le use case importait le client `pg` : l'Application dépendait de l'Infrastructure, ce que la règle de dépendance interdit, et le test du use case ne pouvait plus tourner sans base. J'ai ajouté un port et je l'ai fait implémenter par l'adapter PostgreSQL. »

Une bonne entrée cite le code concerné (fichier, fonction), nomme la règle (règle de dépendance, invariant du Domain, validation à la frontière...), et dit comment tu as vérifié ta décision : un test, une commande, une lecture de la documentation.

## Un exemple d'entrée

Sur un sujet qui ne fait l'objet d'aucune Note, pour voir le niveau de détail attendu.

### Entrée 1 : le constructeur de l'Annonce

- **Ce que j'ai demandé** : écrire l'entité Annonce avec son prix en Crédits.
- **Ce que le Familier a proposé** : une classe avec `constructor(readonly id: string, readonly prix: number) {}`.
- **Ma décision** : modifié.
- **Pourquoi** : Node.js 24 exécute le TypeScript en effaçant les types, et refuse cette syntaxe (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`) alors que Vitest l'accepte. Les tests passaient, `npm run legacy` aurait planté. J'ai déclaré les champs et je les affecte dans le constructeur.
- **Comment j'ai vérifié** : `npm run typecheck` signalait l'erreur avant la correction, plus après.

## Le modèle

Copie ce qui suit dans `docs/journal-du-familier/note-N.md` et remplis 3 à 5 entrées.

```markdown
# Journal du Familier

Note : (Note 1, Note 2 ou Note 3)
Auteurs : (prénom nom, et celui du binôme)
Outils utilisés : (GitHub Copilot, autre outil, modèle si tu le connais)

## Entrée 1 : (titre court : ce que la décision concerne)

- Ce que j'ai demandé : (en une phrase, ou le prompt s'il est court)
- Ce que le Familier a proposé : (en une ou deux phrases, avec le fichier ou l'extrait concerné)
- Ma décision : gardé, modifié ou rejeté
- Pourquoi : (la règle du cours, appliquée à ce code précis)
- Comment j'ai vérifié : (test, commande, lecture)

## Entrée 2 : ...
```
