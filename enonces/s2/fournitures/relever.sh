#!/usr/bin/env bash
# Atelier Familier n°2 : relève ce que le Familier a produit dans le dernier commit d'une branche de ~/familier-2.
#   cd ~/familier-2 && bash ~/ferraille/enonces/s2/fournitures/relever.sh sans-cadre
# Chaque partie répond à une ligne de la grille de l'énoncé : lis-la, puis remplis la colonne.
set -u
branche="${1:?indique la branche : sans-cadre ou avec-cadre}"
regles="$(cd "$(dirname "$0")" && pwd)/dependency-cruiser.cjs"
if [ -n "$(git status --porcelain)" ]; then
  echo "Committe d'abord ton travail : git status doit être vide."
  exit 1
fi

# Les lignes ajoutées par le commit dans src/ (ou dans les dossiers indiqués) qui correspondent au motif, avec leur fichier.
ajouts() {
  local motif="$1"
  shift
  git show "$branche" --format= -U0 -- "${@:-src}" |
    MOTIF="$motif" awk '/^\+\+\+ /{ fichier = substr($0, 7) } /^\+[^+]/ && $0 ~ ENVIRON["MOTIF"] { print "  " fichier " : " substr($0, 2) }'
}

echo "== 1. Les fichiers touchés, et le nom donné à l'action"
git show "$branche" --stat --format= | sed 's/^/ /'
ajouts '(class|function|interface) [A-Za-z]+|^\+  (async )?[a-z][A-Za-z]*\('
echo "== 2. Le vendeur : où est-il comparé ?"
ajouts 'vendeurId'
echo "== 3. Effacement (DELETE, deleteFrom, .delete) ?"
ajouts 'DELETE|deleteFrom|\.delete\(' | grep . || echo "  aucun"
echo "== 4. Le statut : qui le lit, qui le change ?"
ajouts 'statut|retiree|vendue'
echo "== 5. Les imports ajoutés dans src/application/"
ajouts '^\+import' src/application | grep . || echo "  aucun"
echo "== 6. Mocks dans les tests"
ajouts 'vi\.(fn|mock|spyOn)' test | grep . || echo "  aucun"

echo "== 7. Tests, types et architecture sur $branche"
git switch -q "$branche" || exit 1
npx vitest run > /dev/null 2>&1 && echo "  npm test : vert" || echo "  npm test : ROUGE"
npx tsc --noEmit > /dev/null 2>&1 && echo "  npm run typecheck : vert" || echo "  npm run typecheck : ROUGE"
npx depcruise src --config "$regles" 2>&1 | grep -vE '^\s*$' | sed 's/^/  /'
git switch -q -
