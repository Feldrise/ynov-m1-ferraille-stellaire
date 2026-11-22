# Dépannage de l'installation

## Comment s'en servir

Repère le message exact dans ton terminal, cherche-le ici (les messages de Docker sont en anglais, je les cite tels quels), applique l'action, puis relance `npm run doctor`. Une action ne marche pas ? Lève la main : on regarde ensemble, et le cas rejoindra cette fiche.

## Les messages de `npm run doctor`

| Message | Action |
|----------------------------------------------|-------------------------------------------------------|
| `Node.js v22... : le cours demande Node.js 24` | `nvm install 24` puis `nvm use 24` ; sous Windows, dans le terminal Ubuntu de WSL. Ferme et rouvre le terminal si `nvm` est introuvable. |
| `ERR_UNKNOWN_FILE_EXTENSION ... Unknown file extension ".ts"` | Ce terminal utilise un Node.js antérieur à 22.18, souvent un Node.js installé hors de nvm : `nvm use 24`, puis `nvm alias default 24` pour que chaque nouveau terminal prenne Node.js 24. |
| `dépendances absentes` | `npm ci` à la racine du dépôt. |
| `le chemin du dépôt contient une espace ou un « & »` | Déplace ou reclone le dépôt dans un dossier simple : `~/ferraille`. |
| `le dépôt est sur le disque Windows, vu depuis WSL` | Clone-le dans WSL (`cd ~ && git clone ... ferraille`) : sur `/mnt/c`, `npm ci` et les tests sont plusieurs fois plus lents. |
| `fins de ligne Windows (CRLF)` | `git config --global core.autocrlf input`, supprime le dépôt, clone-le à nouveau. |
| `commande docker introuvable` | Installe Docker (guide, étapes 2 et 5), puis **ferme et rouvre** le terminal. Sous WSL : Docker Desktop, **Settings > Resources > WSL integration**, active Ubuntu. |
| `Docker Compose absent` | Sous Linux, installe le paquet `docker-compose-plugin`. Docker Desktop l'inclut déjà : mets-le à jour. |
| `le moteur Docker ne répond pas` | Démarre Docker Desktop et attends la baleine immobile. Sous Linux : `sudo systemctl start docker`. |
| `PostgreSQL : le port 5432 est déjà pris par un autre programme` (ou 6379, 5672, 15672) | Voir « Un port est déjà pris » ci-dessous. |
| `conteneur arrêté (port ... libre)` | `npm run up`. |
| `conteneur dans l'état « starting »` ou `« unhealthy »` | Attends 20 secondes et relance `npm run doctor`. Toujours là ? `npm run down` puis `npm run up`. |
| `PostgreSQL injoignable par DATABASE_URL` (ou Redis, RabbitMQ) | Tu as changé un port dans `.env` sans changer l'adresse : voir « Un port est déjà pris ». |
| `le jeu de données du Legacy n'est pas chargé` | `npm run reinitialiser`. |
| `! ... Go de mémoire vive` | Ferme le navigateur superflu et les applications lourdes ; sous Windows, voir « Tout est très lent ». |

## Un port est déjà pris

Un autre programme écoute déjà sur le port : souvent un PostgreSQL installé un jour pour un autre cours, ou un conteneur d'un autre projet.

1. Trouve-le. Conteneur : `docker ps` (colonne PORTS) puis `docker stop <nom>`. Programme : `sudo ss -ltnp | grep 5432` sous Linux et WSL, `netstat -ano | findstr :5432` dans PowerShell (le dernier nombre est le PID, à retrouver dans le Gestionnaire des tâches). Un service PostgreSQL de Windows s'arrête par `Stop-Service postgresql*` (PowerShell administrateur).
2. Tu ne peux pas l'arrêter ? Change de port. Crée à la racine du dépôt un fichier `.env` qui change le port **et** l'adresse qui va avec :

```bash
POSTGRES_PORT=15432
DATABASE_URL=postgres://ferraille:ferraille@127.0.0.1:15432/ferraille
```

De même pour Redis (`REDIS_PORT` et `REDIS_URL`) et RabbitMQ (`RABBITMQ_PORT` et `AMQP_URL`, `RABBITMQ_UI_PORT` pour l'interface web). Le fichier `.env.example` montre toutes les variables. Puis `npm run down`, `npm run up` et `npm run doctor`.

Sous Windows, certaines plages de ports sont réservées par le système, avec le message `ports are not available: ... forbidden by its access permissions`. La commande `netsh interface ipv4 show excludedportrange protocol=tcp` (PowerShell) les liste : choisis un port hors de ces plages.

## Les messages de Docker

| Message | Cause | Action |
|-------------------------------------------|-----------------------|-------------------------------|
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | un port est pris | voir « Un port est déjà pris » |
| `error during connect ... dockerDesktopLinuxEngine: The system cannot find the file specified` | Docker Desktop n'est pas démarré | démarre-le, attends la baleine immobile, relance la commande |
| `Docker Desktop is unable to start`, ou « Docker Desktop is starting » qui ne finit jamais | WSL absent ou trop ancien | PowerShell administrateur : `wsl --update`, puis `wsl --shutdown`, puis relance Docker Desktop |
| `Virtualization support not detected`, `WSL 2 requires virtualization` | virtualisation désactivée dans le BIOS | voir « Virtualisation désactivée » |
| `permission denied while trying to connect to the Docker daemon socket` | Linux : tu n'es pas dans le groupe `docker` | `sudo usermod -aG docker $USER`, ferme ta session et rouvre-la |
| `no matching manifest`, `exec format error` | image incompatible avec ton processeur | préviens-moi (les images du cours existent pour Intel, AMD et puces Apple) |
| `Killed`, `OOMKilled`, conteneur qui redémarre en boucle | mémoire insuffisante | voir « Tout est très lent » |

## Virtualisation désactivée (Windows)

Docker a besoin de la virtualisation du processeur. Vérifie dans le **Gestionnaire des tâches**, onglet **Performance**, **Processeur** : « Virtualisation : Activée ». Si elle est désactivée, redémarre dans le BIOS ou l'UEFI (touche affichée au démarrage, souvent F2, F10 ou Suppr) et active **Intel VT-x** (ou « Intel Virtualization Technology ») ou **AMD-V** (ou « SVM Mode »). Enregistre, redémarre, relance Docker Desktop.

Dans les fonctionnalités de Windows (« Activer ou désactiver des fonctionnalités Windows »), **Plateforme de machine virtuelle** et **Sous-système Windows pour Linux** doivent être cochés.

## Tout est très lent (Windows et WSL)

- Le dépôt doit être **dans WSL** (`~/ferraille`), pas sur `/mnt/c`.
- WSL prend par défaut la moitié de la mémoire de Windows. Sur un ordinateur de 8 Go, limite-la pour laisser respirer le reste : crée le fichier `%UserProfile%\.wslconfig` avec

```ini
[wsl2]
memory=4GB
processors=4
```

puis `wsl --shutdown` dans PowerShell et relance Docker Desktop. Les trois services du cours occupent environ 150 Mo au repos ; c'est `npm ci` et les tests qui demandent de la mémoire.

## Les autres messages

| Message | Action |
|-------------------------------------------|----------------------------------------------------|
| `npm error engine Unsupported engine` ou `EBADENGINE` | Node.js n'est pas en version 24 : `nvm use 24`, puis `npm ci`. |
| `nvm: command not found` | `source ~/.bashrc` (`source ~/.zshrc` sous macOS), ou ferme et rouvre le terminal, après l'installation de nvm. |
| `$'\r': command not found`, `bash\r: No such file or directory` | Fins de ligne Windows : voir la ligne CRLF du premier tableau. |
| `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | Le code utilise une syntaxe TypeScript que Node.js ne sait pas effacer (`enum`, `namespace`, ou paramètre de constructeur déclaré `readonly x` ou `private x`). Écris un champ et affecte-le dans le constructeur. `npm run typecheck` signale ces syntaxes avant l'exécution. |
| `ERR_MODULE_NOT_FOUND` sur un import relatif | Node.js exige l'extension dans les imports : `from "./annonce.ts"`, pas `from "./annonce"`. |
| `EADDRINUSE ... 3000` au lancement du Legacy | Un Legacy tourne déjà dans un autre terminal (`Ctrl+C` dessus), ou change de port : `PORT=3001 npm run legacy`. |
| Dans un dossier récupéré (`~/familier-2`), les tests PostgreSQL échouent sur `ECONNREFUSED` alors que les conteneurs tournent | Le dossier n'a pas ton `.env` : `recuperer` le recopie seulement s'il existait déjà. `cp ~/ferraille/.env ~/familier-2/.env`, puis relance `npm test`. |
| `git pull --no-rebase --no-edit cours main` : `'cours' does not appear to be a git repository` | Le remote `cours` n'a pas été ajouté en Séance 3. Sur le premier poste : `git remote add cours "$(git remote get-url origin)"` ; sur le clone du binôme : `git remote add cours "$(git -C ~/ferraille remote get-url origin)"`. Puis relance. |
| `npm run dupe` : `fetch failed` | Le Legacy ne tourne pas : `npm run legacy` dans un autre terminal. |
| `npm run dupe` : `aucune Annonce à acheter` | Le jeu de données est épuisé : `npm run reinitialiser`. |
| `npm run dupe -- --bourse` : `Service Inventaire injoignable : contrôle impossible` (code 2) | Le script n'a rien conclu : lance le Service Inventaire (`node service-inventaire/src/main.ts`) dans un autre terminal, puis relance-le. |
| GitHub Copilot : « You do not have access to GitHub Copilot » | La demande du Student Developer Pack n'est pas encore validée : active **GitHub Copilot Free** sur github.com/settings/copilot en attendant. |
