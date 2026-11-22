// Récupère un dossier de travail distribué pendant une Séance (atelier, Note) : npm run recuperer -- <nom>
// Par exemple : npm run recuperer -- familier-2
//
// Le dossier est publié à l'heure prévue, en version du dépôt GitHub du cours (<nom>.tar.gz, aussi sur Moodle).
// Il est installé à côté de ce dépôt, dans ton dossier personnel (~/<nom>), avec son propre dépôt Git : un agent qui l'ouvre ne
// voit que lui. Ses dépendances sont celles de ce dépôt (lien node_modules) : rien à installer. Un dossier qui se
// rend ou se relance ailleurs (note-1, familier-2, revue-piegee-3) déclare aussi les siennes, avec son
// package-lock.json : sur un autre poste, npm ci les installe. S'il a un .env.example et que ce dépôt a un .env
// (un port changé), ce .env est recopié : il parle aux mêmes conteneurs.
// Code retour : 0 si le dossier est prêt, 1 sinon.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const nom = process.argv[2];
// Variables réservées aux contrôles du formateur : une archive locale et un dossier de destination.
const SOURCE = process.env.RECUPERER_SOURCE;
const DESTINATION = resolve(process.env.RECUPERER_DOSSIER ?? os.homedir());

function arreter(message: string): never {
  console.error(`  KO   ${message}`);
  process.exit(1);
}

// L'adresse du dépôt du cours : le remote « cours » s'il existe (un clone du dépôt d'un binôme), sinon « origin ».
function adresseDuDepot(): string {
  let origine = "";
  for (const remote of ["cours", "origin"]) {
    try {
      origine = execFileSync("git", ["remote", "get-url", remote], { cwd: RACINE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      break;
    } catch {
      // remote absent : on essaie le suivant
    }
  }
  if (!origine) arreter("ce dossier n'est pas un clone du dépôt du cours (ni remote « cours » ni remote « origin »)");
  const m = origine.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m) arreter(`le dépôt d'origine n'est pas sur GitHub : ${origine}`);
  return `https://github.com/${m[1]}/${m[2]}`;
}

if (!nom || !/^[a-z0-9-]+$/.test(nom)) arreter("indique le dossier à récupérer, par exemple : npm run recuperer -- familier-2");
const cible = join(DESTINATION, nom);
if (existsSync(cible)) arreter(`${cible} existe déjà : renomme-le ou supprime-le avant de recommencer`);

const temporaire = mkdtempSync(join(os.tmpdir(), "recuperer-"));
const archive = join(temporaire, `${nom}.tar.gz`);
try {
  if (SOURCE) {
    copyFileSync(join(SOURCE, `${nom}.tar.gz`), archive);
  } else {
    const url = `${adresseDuDepot()}/releases/download/${nom}/${nom}.tar.gz`;
    const reponse = await fetch(url);
    if (reponse.status === 404) arreter(`${nom} n'est pas encore publié (${url}) : attends le signal, puis relance la commande`);
    if (!reponse.ok) arreter(`téléchargement refusé (HTTP ${reponse.status}) : ${url}`);
    writeFileSync(archive, Buffer.from(await reponse.arrayBuffer()));
  }
  execFileSync("tar", ["-xzf", archive, "-C", DESTINATION]);
} catch (e) {
  arreter(`impossible de récupérer ${nom} : ${(e as Error).message}`);
} finally {
  rmSync(temporaire, { recursive: true, force: true });
}

symlinkSync(join(RACINE, "node_modules"), join(cible, "node_modules"), "dir");
if (existsSync(join(cible, ".env.example")) && existsSync(join(RACINE, ".env"))) {
  copyFileSync(join(RACINE, ".env"), join(cible, ".env"));
  console.log(`  ok   ton .env recopié dans ${cible} : mêmes adresses que ce dépôt`);
}
const git = (...args: string[]) => execFileSync("git", args, { cwd: cible, stdio: "ignore" });
try {
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", `Départ : ${nom}`);
} catch {
  console.log(`  !    dépôt Git non initialisé dans ${cible} : lance « git config --global user.name ... » et « user.email », puis git init`);
}
console.log(`  ok   ${nom} est prêt dans ${cible}`);
console.log(`       cd ${cible} && code .`);
