# Installer son poste

## Ce que tu as à la fin

Ton ordinateur fait tourner le backend de *Ferraille Stellaire* : le **Legacy** et les trois services dont le cours a besoin, PostgreSQL, Redis et RabbitMQ, lancés par Docker Compose. Le script de diagnostic, `npm run doctor`, répond « Tout est prêt ». GitHub Copilot, l'outil d'IA garanti à tout le monde, répond dans ton éditeur.

Tout se fait pendant ce bloc de la Séance 1 : rien n'est à préparer avant. Il te faut un ordinateur portable sur lequel tu peux installer des logiciels (droits d'administrateur), branché sur secteur, et un compte GitHub (tu le crées sur place si besoin).

Tout se télécharge sur le réseau de l'école, qui tient sans peine une classe entière. Les longues installations tournent pendant que tu fais autre chose ; suis l'ordre des étapes, il est fait pour ça.

### Neuf étapes, neuf repères

| Étape | Durée | Au plus tard à la |
|------------------------------------------------------|--------|---------------|
| 1. Télécharger les installateurs | 3 min | 3e minute |
| 2. Lancer les installations | 5 min | 8e minute |
| 3. Attendre la fin de Docker Desktop | 3 min | 11e minute |
| 4. Redémarrer | 4 min | 15e minute |
| 5. Installer Ubuntu, démarrer Docker, préparer VS Code | 7 min | 22e minute |
| 6. Installer Node.js 24 | 3 min | 25e minute |
| 7. Cloner le dépôt et installer ses dépendances | 4 min | 29e minute |
| 8. Démarrer les services et passer le diagnostic | 4 min | 33e minute |
| 9. Lancer le Legacy et interroger GitHub Copilot | 3 min | 36e minute |
| Marge | 14 min | 50e minute |

Un repère dépassé de plus de 5 minutes ? Lève la main : je passe au poste. Le message exact de chaque erreur est repris dans la fiche **Dépannage**.

Si tout est prêt avant la fin du bloc, fais l'étape 10, la demande du Student Developer Pack, puis commence l'exploration du Legacy : le `README.md` du dépôt donne ses routes et les comptes du jeu de données.

### Ton poste bloque

Ton ordinateur n'a pas redémarré avec Docker installé à la 28e minute (virtualisation désactivée, mise à jour de Windows interminable, disque plein) ? Lève la main. Tu rejoins un poste prêt, en binôme provisoire, pour l'exploration du Legacy et l'autopsie qui suit, et je reprends ton installation avec toi pendant la pause : ton poste est prêt avant la fin de la Séance.

## 1. Télécharger les installateurs 3 min

Télécharge, depuis les sites des éditeurs, dans ton dossier **Téléchargements** :

| Logiciel | Où | Quelle version |
|-------------------|-----------------------------------|------------------------------------------|
| Docker Desktop | **docs.docker.com/desktop** | Windows : « Docker Desktop for Windows - x86_64 » ; macOS : puce Apple ou Intel selon ton Mac |
| VS Code | **code.visualstudio.com** | Windows : « User Installer x64 » ; macOS : « Universal » |

Sous Linux, rien à télécharger ici : tout passe par le gestionnaire de paquets à l'étape 2. WSL et Ubuntu, sous Windows, se téléchargent d'eux-mêmes aux étapes 2 et 5, et les images de PostgreSQL, Redis et RabbitMQ au premier `npm run up`.

## 2. Lancer les installations 5 min

### Windows 10 ou 11

1. Ouvre PowerShell **en administrateur** (clic droit sur le menu Démarrer, « Terminal (administrateur) ») et lance `wsl --install --no-distribution` : la commande télécharge WSL et active les fonctionnalités de Windows dont il a besoin. Laisse-la se terminer (une à deux minutes).
2. Dans **Téléchargements**, double-clique sur `Docker Desktop Installer.exe`, garde l'option **WSL 2** cochée (« Use WSL 2 instead of Hyper-V ») et lance l'installation. Elle dure plusieurs minutes : **ne l'attends pas**.
3. Pendant ce temps, double-clique sur l'installateur de VS Code (`VSCodeUserSetup-x64-….exe`) et garde les options proposées (dont « Ajouter à PATH »). Décoche « Lancer Visual Studio Code » à la fin.

Pendant que Docker Desktop s'installe, passe à l'étape 3.

### macOS

Ouvre `Docker.dmg` et glisse Docker dans Applications ; décompresse VS Code et glisse-le aussi dans Applications. Sous macOS, Git s'installe avec les outils de développement d'Apple : lance `xcode-select --install` dans un terminal si `git --version` ne répond pas.

### Linux

Lance l'installation de Docker Engine et de son **plugin Compose** par le gestionnaire de paquets, en suivant la page de ta distribution (docs.docker.com/engine/install), puis celle de VS Code (code.visualstudio.com). Ajoute-toi au groupe `docker` pour ne pas taper `sudo` à chaque commande : `sudo usermod -aG docker $USER`.

## 3. Attendre la fin de Docker Desktop 3 min

Pendant que Docker Desktop s'installe, connecte-toi sur **github.com** (ou crée ton compte sur **github.com/signup**) et garde l'onglet ouvert : VS Code te demandera ce compte à l'étape 5. La demande du Student Developer Pack attend l'étape 10, une fois ton poste prêt.

## 4. Redémarrer 4 min

### Windows

Quand Docker Desktop a fini, il propose de te déconnecter ou de redémarrer : **redémarre** (« Close and restart »), même s'il ne le demande pas, pour que WSL et Docker Desktop partent ensemble. VS Code doit avoir terminé son installation avant.

### macOS et Linux

Pas de redémarrage sous macOS. Sous Linux, déconnecte-toi puis reconnecte-toi pour que le groupe `docker` soit pris en compte.

## 5. Installer Ubuntu, démarrer Docker, préparer VS Code 6 min

### Windows

1. Ouvre PowerShell (sans les droits d'administrateur cette fois) et installe Ubuntu 24.04 :

```powershell
wsl --install -d Ubuntu-24.04
```

La commande télécharge Ubuntu (environ 400 Mo) puis l'installe. Elle échoue ? Installe plutôt « Ubuntu 24.04 LTS » depuis le Microsoft Store.

2. Pendant qu'Ubuntu s'installe, ouvre **VS Code**. Dans la vue Extensions, installe l'extension **WSL** (éditeur : Microsoft). Ouvre ensuite la vue de discussion (`Ctrl+Alt+I`) et connecte-toi avec ton compte GitHub quand VS Code le propose pour GitHub Copilot ; s'il ne propose rien, installe l'extension **GitHub Copilot**.
3. Retourne dans PowerShell : Ubuntu te demande de créer ton utilisateur Linux, un nom en minuscules et un mot de passe (rien ne s'affiche quand tu le tapes, c'est normal). Note-le : `sudo` te le redemandera.
4. Lance **Docker Desktop** depuis le menu Démarrer, accepte les conditions ; la connexion à un compte Docker n'est pas nécessaire (« Skip »). Attends que l'icône de la baleine reste immobile.
5. Dans Docker Desktop, **Settings > Resources > WSL integration** : active Ubuntu, puis « Apply & restart ».

Ensuite, **travaille dans le terminal Ubuntu** (menu Démarrer, « Ubuntu »), et non dans PowerShell : toutes les commandes de la suite s'y tapent telles quelles.

### macOS et Linux

Lance Docker Desktop (macOS) et attends la baleine immobile dans la barre des menus. Ouvre VS Code et connecte-toi à GitHub Copilot comme ci-dessus (l'extension WSL ne sert que sous Windows).

## 6. Installer Node.js 24 3 min

Dans le terminal Ubuntu sous Windows, ou dans un terminal sous macOS et Linux. Node.js s'installe **dans WSL**, là où tu travailles :

```bash
git --version
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
node --version
```

`git --version` doit répondre ; sinon, `sudo apt update && sudo apt install -y git curl` (sous macOS, voir l'étape 2). Sous macOS, remplace `source ~/.bashrc` par `source ~/.zshrc`. `node --version` doit afficher `v24.` suivi de chiffres. Une autre version ? `nvm use 24`.

Tu ne peux vraiment pas travailler dans WSL ? Préviens-moi : on installe alors Node.js 24 par l'installateur de **nodejs.org**, et je t'aide à adapter les commandes.

## 7. Cloner le dépôt et installer ses dépendances 4 min

Le lien du dépôt est sur Moodle. Clone-le dans un dossier **sans espace ni caractère spécial**, et sous Windows **dans WSL**, jamais sur `C:` ni dans OneDrive :

```bash
cd ~
git clone <lien du dépôt> ferraille
cd ferraille
npm ci
code .
```

`npm ci` installe les dépendances de tout le cours, pas seulement celles du Legacy : tu n'auras plus rien à installer aux Séances suivantes. Il refuse de s'exécuter avec une autre version que Node.js 24 (message `Unsupported engine`) : reviens alors à l'étape 6.

`code .` ouvre le dossier dans VS Code. Sous Windows, VS Code s'ouvre connecté à WSL (« WSL: Ubuntu » en bas à gauche) ; la première fois, il s'installe dans Ubuntu pendant une minute. Sous macOS, si `code` est inconnu, ouvre VS Code, puis la palette de commandes (`Cmd+Maj+P`) et lance « Shell Command: Install 'code' command in PATH ».

## 8. Démarrer les services et passer le diagnostic 4 min

```bash
npm run up
```

La première fois, Docker télécharge les images de PostgreSQL, Redis et RabbitMQ (environ 240 Mo) : compte une minute. La commande rend la main quand les trois services sont prêts et que le jeu de données du Legacy est chargé :

```text
Jeu de données du Legacy chargé : 12 Joueurs, 60 Objets, 26 Annonces actives.
```

`npm run down` arrête et efface les services (les données sont rechargées au prochain `npm run up`). Puis :

```bash
npm run doctor
```

Le script vérifie, dans l'ordre : Node.js 24, les dépendances, le chemin du dépôt, les fins de ligne, Docker et son moteur, les ports 5432, 6379, 5672 et 15672, puis la connexion à PostgreSQL, Redis et RabbitMQ. Chaque ligne commence par `ok` ou `KO` ; sous chaque `KO`, une flèche donne **l'action à faire**. Fais-la, puis relance `npm run doctor` jusqu'à lire :

```text
Tout est prêt : lancez le Legacy avec npm run legacy.
```

Les lignes qui commencent par `!` sont des avertissements : le diagnostic passe quand même, mais lis-les.

## 9. Lancer le Legacy et interroger GitHub Copilot 3 min

```bash
npm run legacy
```

Le terminal affiche `Legacy de Ferraille Stellaire sur http://127.0.0.1:3000` et reste occupé tant que le Legacy tourne (`Ctrl+C` pour l'arrêter). Ouvre **http://127.0.0.1:3000/annonces** dans ton navigateur : la liste des Annonces de la Bourse aux épaves s'affiche. Ouvre un **second terminal** pour la suite.

Dans VS Code, ouvre la vue de discussion de GitHub Copilot et demande-lui : « Que fait la route `POST /annonces/:id/achat` de ce dépôt ? ». Il doit citer `legacy/src/routes/bourse.ts`.

Tu utilises un autre outil (Cursor, Claude Code, un autre éditeur) ? Il est autorisé, agents compris. Installe quand même GitHub Copilot : c'est l'outil commun de la classe, celui sur lequel je m'appuie pour les ateliers du Familier.

## 10. Demander le GitHub Student Developer Pack, une fois ton poste prêt

Cette étape est hors chronomètre : fais-la dès que le diagnostic est vert, pendant l'exploration du Legacy, ou à la pause. Le Pack donne accès gratuitement à GitHub Copilot, mode agent compris. La demande se fait une fois, et GitHub peut mettre de quelques minutes à quelques jours à la valider.

1. Ouvre **education.github.com/pack** et clique sur l'inscription étudiante.
2. Déclare Ynov comme établissement, avec ton adresse électronique de l'école, et joins le justificatif demandé (certificat de scolarité ou carte étudiante, photographiée sur place).
3. Envoie la demande. Tu reçois un courriel quand elle est acceptée.

En attendant la validation, ton compte a **GitHub Copilot Free**, sans aucune démarche : c'est lui qui a répondu à l'étape 9. Son quota mensuel est réduit (2 000 complétions, et une enveloppe limitée pour la discussion et le mode agent) : je ne te garantis pas qu'il tienne une Séance entière. Tu passes sur l'offre du Pack dès que le courriel arrive ; s'il n'est pas arrivé à la prochaine Séance, dis-le-moi.

### Avant de quitter la salle

Pas besoin d'arrêter quoi que ce soit : `npm run up` relance tout à la prochaine Séance. Si tu veux libérer la mémoire de ton ordinateur, `npm run down` et quitte Docker Desktop.
