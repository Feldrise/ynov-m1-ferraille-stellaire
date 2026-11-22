# 0002. Une Annonce vendue ou retirée n'est jamais effacée

Statut : accepté

## Contexte
Une Annonce se vend ou se retire. La supprimer de la base effacerait la trace d'une Vente conclue
(qui la référence) et rendrait la Dupe impossible à reconstituer après coup : on ne saurait plus qu'un Objet
a été en vente, ni par qui.

## Décision
Une Annonce a un statut : active, vendue ou retirée (`Annonce.statut`). Retirer une Annonce la fait passer
au statut retirée (`Annonce.retirer`) ; seul son vendeur le peut, et seulement tant qu'elle est active.
L'Objet n'a plus d'Annonce active et peut être remis en vente. Aucun adapter n'exécute de `DELETE` sur les Annonces.

## Options écartées
- `DELETE` de la ligne : plus simple, mais l'historique de la Bourse aux épaves disparaît.
- Une table d'archives : deux endroits à interroger pour le même concept.

## Conséquences
- La liste des Annonces filtre le statut active.
- Un retrait et un achat simultanés : l'adapter n'en laisse passer qu'un (`enregistrerRetrait` refuse une Annonce
  qui n'est plus active).
