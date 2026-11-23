# Clean Archi & API REST micro (M1 Expert Développement Full Stack, Ynov)

Vocabulaire du cours (28 h sur 5 journées) : sa structure pédagogique et l'univers jeu vidéo qui lui sert de support.

## Structure du cours

**Séance**:
Une des cinq journées du planning (S1 à S5), qui forment l'unité de découpage de la progression pédagogique.
_Avoid_: Cours, session, journée

**Fil rouge**:
Le jeu vidéo multijoueur fictif dont les étudiants construisent et assainissent le backend, support de toutes les démonstrations et de tous les exercices guidés.
_Avoid_: Projet, cas d'étude, TP

**Legacy**:
Le monolithe backend du fil rouge, volontairement mal conçu, remis aux étudiants comme point de départ et assaini au fil du cours. Ses défauts viennent de l'absence de frontières, pas de ce qu'il tourne dans un seul processus.
_Avoid_: Starter, projet de base, template

**Note 1**:
Évaluation sommative individuelle de fin de S2, notée sur 100 avec une grille d'évaluation, qui porte sur le découpage en couches et les ports et adapters.
_Avoid_: Partiel, contrôle, examen

**Note 2**:
Évaluation sommative en binôme de fin de S4, notée sur 100 avec une grille d'évaluation, qui porte sur une API sécurisée, validée et documentée.
_Avoid_: Projet intermédiaire, rendu

**Note 3**:
Évaluation sommative en binôme de S5, notée sur 100 avec une grille d'évaluation, qui porte sur le microservice complet (asynchrone, cache, limitation de débit) et sur l'absorption d'un événement imprévu.
_Avoid_: Projet final, soutenance

**Évaluation formative**:
Toute vérification des acquis en séance qui ne compte pas dans la moyenne.
_Avoid_: Note, contrôle continu

**Revue piégée**:
Rituel de début de séance où les étudiants relisent une pull request du fil rouge contenant des erreurs volontaires (fuite entre couches, faille de sécurité) et doivent les retrouver.
_Avoid_: Bug Hunt, code review

**Ticket du Game Designer**:
Demande métier qui tombe pendant un atelier et oblige à faire évoluer le code.
_Avoid_: User story, changement de specs

**Boss**:
Exercice de synthèse chronométré en fin de séance, en évaluation formative.
_Avoid_: Quiz, contrôle

**Incident de Cycle**:
Le moment de la Note 3 où chaque binôme tire au sort un incident de production (dupe, raid de bots, afflux de trafic, panne du service Inventaire, nouvelle monnaie) qu'il doit absorber en adaptant son architecture.
_Avoid_: Patch Day, twist, imprévu

**Inspection**:
Défense orale d'une note de binôme, menée à la table du binôme pendant que la classe continue de travailler : le formateur désigne un fichier et le membre qui répond.
_Avoid_: Soutenance, démo, oral

**Familier**:
Nom donné dans le cours à l'IA générative, présentée comme un relecteur utile mais faillible dont il faut challenger les propositions.
_Avoid_: ChatGPT, assistant, Copilot (pour désigner l’IA en général ; « GitHub Copilot » reste le nom de l’outil)

**Journal du Familier**:
Annexe obligatoire de chaque note, où l'étudiant consigne ses prompts, ce qu'il a retenu ou rejeté des réponses, et pourquoi.
_Avoid_: Déclaration IA, annexe IA

## Univers du fil rouge

**Ferraille Stellaire**:
Le jeu fictif du fil rouge : un jeu d'extraction multijoueur où l'on fouille des épaves orbitales, édité par le studio Lune Rouillée.
_Avoid_: Le jeu, le projet

**Épave**:
Vaisseau ou structure abandonnée en orbite que les Joueurs fouillent pendant une Expédition ; chaque Objet garde la trace de l'Épave dont il provient.
_Avoid_: Donjon, map, niveau

**Station**:
Base orbitale habitée où les Joueurs reviennent entre deux Expéditions ; chaque Station fixe son tarif de réparation, en Crédits par point d'Intégrité.
_Avoid_: Hub, avant-poste

**Expédition**:
Une partie de Ferraille Stellaire : une incursion dans une épave dont le joueur ne conserve le butin que s'il s'en extrait vivant.
_Avoid_: Raid, run, match

**Joueur**:
La personne humaine titulaire d'un compte ; le jeu n'a pas de notion de personnage distincte du compte.
_Avoid_: Utilisateur, user, personnage

**Objet**:
Un exemplaire unique de butin, identifiable individuellement, que possède un Joueur.
_Avoid_: Item, loot, ressource

**Intégrité**:
L'état d'un Objet, de 0 (en miettes) à 100 (intact) ; un Objet abîmé retrouve 100 par un Contrat de réparation.
_Avoid_: Durabilité, points de vie, usure

**Dupe**:
La fraude par laquelle un même Objet est vendu ou possédé deux fois.
_Avoid_: Duplication, bug de duplication

**Bourse aux épaves**:
Le marché entre joueurs où l'on revend et achète le butin rapporté des Expéditions.
_Avoid_: Hôtel des ventes, marketplace, shop

**Annonce**:
La mise en vente d'un Objet sur la Bourse aux épaves, à prix fixe ; il n'existe pas d'enchères. Une Annonce est active, puis vendue par une Vente conclue ou retirée par son vendeur ; elle ne se vend qu'une fois, et une Annonce vendue ou retirée n'est jamais effacée.
_Avoid_: Offre, listing, enchère

**Crédits**:
La monnaie du jeu, dans laquelle s'expriment les prix des Annonces.
_Avoid_: Argent, gold, pièces

**Éclats**:
La monnaie premium de Ferraille Stellaire, achetée en argent réel à la boutique du studio et convertible en Crédits, jamais l'inverse ; elle ne passe pas par la Bourse aux épaves.
_Avoid_: Gemmes, jetons premium

**Prix plafond**:
Le prix au-dessus duquel la Bourse aux épaves refuse de publier une Annonce, quand le studio en fixe un. À distinguer du prix maximum, simple filtre de la liste des Annonces.
_Avoid_: Prix max, limite de prix

**Taxe de Bourse**:
Le pourcentage du prix prélevé par le jeu sur chaque Vente conclue.
_Avoid_: Commission, frais

**Vente conclue**:
L'achat d'une Annonce par un Joueur, qui transfère l'Objet à l'acheteur et les Crédits, taxe déduite, au vendeur.
_Avoid_: Transaction, achat, commande

**Historique des ventes**:
Les Ventes conclues d'un Joueur, comme vendeur ou comme acheteur, de la plus récente à la plus ancienne ; seul le Joueur lui-même le consulte.
_Avoid_: Historique des transactions, historique d'achats

**Contrat de réparation**:
Module du Legacy : un Joueur confie un de ses Objets abîmés à une Station, qui le lui livre à 100 d'Intégrité contre un coût en Crédits payé à l'ouverture. Un contrat est en cours, puis livré ou annulé.
_Avoid_: Réparation

**Assurance de cargaison**:
Module du Legacy, absent des séances jusqu'au Boss n°1, qui en est le sujet : avant une Expédition, un Joueur assure un de ses Objets pour une valeur déclarée contre une prime en Crédits, et touche une indemnité s'il ne s'en extrait pas.
_Avoid_: Insurance, protection de cargaison, module du Boss

**Porte-monnaie**:
Les Crédits que possède un Joueur, tels que la Bourse aux épaves les débite à l'achat et les crédite au vendeur après une Vente conclue.
_Avoid_: Wallet, portefeuille

**Cycle**:
Une saison de Ferraille Stellaire, au début de laquelle la progression de tous les joueurs est remise à zéro.
_Avoid_: Saison, wipe

**Lancement de Cycle**:
Les premières heures d'un Cycle, où tous les Joueurs reviennent en même temps sur la Bourse aux épaves : le pic de trafic que rejoue le scénario de charge du cours.
_Avoid_: Rush, day one

**Service Bourse**:
Le microservice extrait du Legacy qui porte les règles de la Bourse aux épaves.
_Avoid_: API marché, backend Bourse

**Service Inventaire**:
Le microservice qui tient ce que possède chaque joueur et réagit aux ventes conclues sur la Bourse aux épaves.
_Avoid_: Service objets, stock

## Architecture

**Monolithe modulaire**:
Un seul processus et un seul déploiement, découpé à l'intérieur en modules aux frontières tenues par la règle de dépendance et les ports ; le choix par défaut, avant tout second service.
_Avoid_: Modulith

**Monolithe distribué**:
Des services qui ne peuvent changer, se déployer ou tomber en panne qu'ensemble (tables partagées, appels synchrones en chaîne, Domain partagé) : les coûts des microservices sans leurs bénéfices.
_Avoid_: Distributed monolith

## Noms propres de l'univers

Noms employés par le jeu de données du Legacy et par tous les supports ; un nouveau nom s'ajoute ici avant d'être employé.

- **Stations** : Port-Ferraille (la station principale, où siège la Bourse aux épaves), Halte Lagrange, Station Kessler.
- **Épaves** : le cargo *Mnémosyne*, la station-usine *Basalte-7*, le croiseur *Albatros*, le vaisseau-hôpital *Vieille Ourse*.
- **Objets** (noms des exemplaires) : Bobine de plasma, Module de bouclier, Carte de navigation, Réacteur compact, Combinaison de sortie, Foreuse thermique, Boîte noire, Pile isotopique, Antenne quantique, Gyroscope stellaire.
