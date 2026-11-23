# Exploration guidée du Legacy

Pour qui : ton poste est prêt (`npm run doctor` répond « Tout est prêt ») avant la fin du bloc d'installation. Fais ce que tu peux, dans l'ordre ; tu repartiras de là pendant l'autopsie. Rien de tout cela n'est noté.

Lance le Legacy dans un terminal (`npm run legacy`) et garde-le ouvert. Les autres commandes se tapent dans un second terminal.

## 1. Te connecter comme un Joueur

```bash
curl -s -X POST http://127.0.0.1:3000/connexion -H 'content-type: application/json' \
  -d '{"pseudo":"kessa","motDePasse":"ferraille"}'
```

Garde le jeton qui revient : tu le passeras dans `-H "authorization: Bearer <jeton>"`. Quel est l'identifiant de kessa, et combien a-t-elle de Crédits ?

## 2. Regarder la Bourse aux épaves

```bash
curl -s http://127.0.0.1:3000/annonces | head -c 600
```

Pour la première Annonce : quel Objet est en vente, à quel prix, et combien touchera le vendeur (`prixNetVendeur`) ? Fais le calcul : quel pourcentage prend le jeu ?

## 3. L'inventaire d'un Joueur

`GET /joueurs/1/inventaire` : combien d'Objets possède kessa, et lesquels sont en vente ?

## 4. Ouvrir le code

Ouvre `legacy/src/routes/bourse.ts`. Sans tout lire, trouve la route qui conclut une Vente conclue (`POST /annonces/:id/achat`) et réponds :

- d'où vient l'identifiant de l'acheteur ?
- combien de requêtes SQL la route envoie-t-elle pour un seul achat ?

## 5. Une question à garder pour l'autopsie

Ouvre `legacy/src/db.ts`. Que se passe-t-il au moment où un fichier importe `db` ? Note ta réponse : elle comptera dans dix minutes.
