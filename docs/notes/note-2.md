# Note 2 : consignes et grille

## Le principe

Vous livrez le Service Bourse construit depuis la Séance 1, tel qu'il est à 15h00 : l'adapter HTTP de la Séance 3, les sessions, la limitation de débit et le cache de ce matin, et ce que le sujet ajoute. Je le note de trois façons :

- **la recette automatisée** (`npm run recette`) l'interroge par HTTP, comme le client du jeu, sans lire une ligne de votre code. Elle est dans votre dépôt depuis ce matin : lancez-la autant que vous voulez, comme une CI ;
- **je lis votre code**, vos deux ADR et votre Journal du Familier ;
- **je vous inspecte** : 5 minutes à votre table, pendant la dernière heure.

### Les règles

- **En binôme**, le binôme de la Séance 3. Un seul dépôt, le dépôt privé du binôme.
- **Documents et Familier autorisés**, agents compris. Une seule règle : chacun de vous doit pouvoir expliquer et défendre tout ce que vous rendez.
- **Durée** : 1 h 50, de 13h10 à 15h00. Le sujet s'ouvre sur Moodle à 13h10.
- **Rendu** : le tag `note-2` posé et poussé avant 15h00 sur le dépôt privé du binôme, et son lien sur Moodle.

## La recette

`npm run recette` attend votre Service Bourse sur le port 3100, lancé avec `--reinitialiser` (la recette achète des Annonces : relancez-le avant chaque passage). Elle compte huit parties de 5 points, chacune au prorata de ses vérifications réussies, par demi-point :

1. le contrat OpenAPI est publié et décrit toute l'API ;
2. la Bourse répond avec les bons codes de statut ;
3. chaque erreur est un Problem Details (RFC 9457), sans fuite ;
4. un jeton d'accès absent, forgé, expiré ou mal signé est refusé (401) ;
5. ouverture et renouvellement de session, avec rotation du refresh token ;
6. un refresh token rejoué, révoqué ou absent est refusé (401) ;
7. la limitation de débit répond 429, en Problem Details, avec `Retry-After` ;
8. chaque réponse reçue est conforme au contrat OpenAPI.

Après 15h00, je la lance moi-même contre le Service Bourse d'un clone neuf de votre tag, avec la recette de mon dépôt et non celle du vôtre : c'est ce score-là qui compte, et modifier `recette/` n'y change rien.

## La grille

| Critère | Ce que je regarde | Points |
|------------------------------|------------------------------------------------------|--------|
| **Recette automatisée** | le score de `npm run recette` sur votre tag : codes de statut, erreurs normalisées, jeton expiré ou révoqué, réponse 429, conformité au contrat OpenAPI | 40 |
| **Adapter HTTP** | validation des entrées à la frontière (Zod), distincte des invariants du Domain ; erreurs traduites à un seul endroit, en Problem Details ; contrat OpenAPI exact (réponses d'erreur, 429, 304) | 15 |
| **JWT et refresh tokens** | algorithme imposé, secret de configuration ; rotation, détection du rejeu par familles, révocation ; empreinte et non valeur en base ; cookie httpOnly, Secure, SameSite ; le test du rejeu d'un refresh token volé | 15 |
| **Cache et rate limiting** | cache-aside derrière le port, invalidé à la mise en vente et à la vente, qui ne casse pas la Bourse quand Redis tombe ; limites et clés de limitation justifiées (achat, ouverture de session) ; `Cache-Control` et ETag | 10 |
| **Deux ADR** | stockage et rotation des refresh tokens (5) ; stratégie de cache (5) ; modèle `docs/modeles/adr.md` | 10 |
| **Journal du Familier** | 3 à 5 entrées « décision » ; modèle `docs/modeles/journal-du-familier.md` | 10 |
| | **Total** | **100** |

Un code qui ne passe plus `npm test` ou `npm run typecheck` au tag est lu quand même, mais les trois critères de lecture (adapter HTTP, JWT et refresh tokens, cache et rate limiting) plafonnent alors à la moitié de leurs points. Un test affaibli pour passer (`expect` retiré, test sauté) ne rapporte rien sur son critère.

## L'Inspection

De 14h00 à 14h30 (14h55 au plus tard pour une Inspection reportée), je passe à votre table, 5 minutes, pendant que la classe continue. L'ordre de passage est tiré au sort à 13h10 et affiché au tableau. Je désigne un fichier de votre dépôt, puis le membre du binôme qui répond, par exemple :

- « Que se passe-t-il si ce refresh token est rejoué ? »
- « Pourquoi cette limite compte-t-elle par Joueur, et celle-ci par adresse IP ? »
- « Redis tombe maintenant : que voit le Joueur ? »

L'autre membre ne souffle pas. Une réponse fausse ou absente retire jusqu'à la moitié des points du critère concerné, aux deux membres. L'Inspection porte sur votre compréhension, pas sur votre avancement : être inspecté tôt ne coûte rien.

## Le rendu

Avant 15h00, depuis le poste du binôme dont le remote `binome` désigne le dépôt privé (sur le clone de l'autre membre, c'est `origin`), et après avoir invité le compte formateur indiqué sur Moodle si ce n'est pas déjà fait :

<!-- parcours : ignorer, le dépôt rejoué n'a pas de remote binome -->
```bash
git add -A && git commit -m "Note 2"
git tag note-2
git push binome main --tags
```

Puis l'un de vous colle le lien du dépôt sur Moodle. Si le push échoue malgré tout : `git bundle create ~/note-2.bundle --all`, et déposez ce fichier sur Moodle avant 15h00.

Seuls comptent le tag `note-2` et ce qu'il désigne : un commit poussé après 15h00 n'est pas lu.
