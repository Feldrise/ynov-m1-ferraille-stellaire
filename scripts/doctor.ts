// Diagnostic du poste (npm run doctor) : Node.js, Docker, ports, conteneurs et connexions.
// Chaque problème est suivi de l'action à faire. Code retour : 0 si tout est prêt, 1 sinon.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Redis } from "ioredis";
import amqp from "amqplib";
import { chargerEnvironnement } from "./environnement.ts";

chargerEnvironnement();
const RACINE = fileURLToPath(new URL("..", import.meta.url));
let problemes = 0;

function ok(message: string) {
  console.log(`  ok   ${message}`);
}
function ko(message: string, action: string) {
  problemes++;
  console.log(`  KO   ${message}\n       -> ${action}`);
}
function avertir(message: string, action: string) {
  console.log(`  !    ${message}\n       -> ${action}`);
}
function commande(args: string[]) {
  try {
    return execFileSync(args[0], args.slice(1), { cwd: RACINE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
  } catch {
    return null;
  }
}

// --- Node.js et dépendances
console.log("Node.js");
const majeure = Number(process.versions.node.split(".")[0]);
if (majeure === 24) ok(`Node.js ${process.version}`);
else ko(`Node.js ${process.version} : le cours demande Node.js 24`, "installez Node.js 24 (guide d'installation, étape 6), puis rouvrez le terminal");
if (existsSync(new URL("../node_modules/pg/package.json", import.meta.url))) ok("dépendances installées (node_modules)");
else ko("dépendances absentes", "lancez npm ci à la racine du dépôt");

// --- Dépôt
console.log("Dépôt");
if (/[ &]/.test(RACINE)) avertir(`le chemin du dépôt contient une espace ou un « & » : ${RACINE}`, "déplacez le dépôt dans un dossier simple : ~/ferraille (sous Windows, dans WSL)");
else if (process.platform === "linux" && RACINE.startsWith("/mnt/") && os.release().toLowerCase().includes("microsoft"))
  avertir("le dépôt est sur le disque Windows, vu depuis WSL : tout sera lent", "clonez-le dans WSL, par exemple dans ~/ferraille");
else ok(`dépôt : ${RACINE}`);
const crlf = ["compose.yaml", "package.json", "legacy/sql/schema.sql"].filter((f) => {
  try {
    return readFileSync(new URL(`../${f}`, import.meta.url), "utf8").includes("\r\n");
  } catch {
    return false;
  }
});
if (crlf.length === 0) ok("fins de ligne LF");
else ko(`fins de ligne Windows (CRLF) dans ${crlf.join(", ")}`, "git config --global core.autocrlf input, puis supprimez le dépôt et clonez-le à nouveau");

// --- Docker
console.log("Docker");
const versionDocker = commande(["docker", "--version"]);
const versionCompose = versionDocker && commande(["docker", "compose", "version", "--short"]);
const moteur = versionCompose && commande(["docker", "info", "--format", "{{.ServerVersion}}"]);
if (!versionDocker) ko("commande docker introuvable", "installez Docker Desktop (Windows, macOS) ou Docker Engine (Linux), puis rouvrez le terminal");
else ok(versionDocker);
if (versionDocker && !versionCompose) ko("Docker Compose absent", "installez le plugin Docker Compose v2 (inclus dans Docker Desktop)");
else if (versionCompose) ok(`Docker Compose ${versionCompose}`);
if (versionCompose && !moteur) ko("le moteur Docker ne répond pas", "démarrez Docker Desktop et attendez qu'il soit prêt (sous Linux : sudo systemctl start docker)");
else if (moteur) ok(`moteur Docker ${moteur} démarré`);
const memoire = os.totalmem() / 1024 ** 3;
if (memoire < 7.5) avertir(`${memoire.toFixed(1)} Go de mémoire vive`, "fermez les applications inutiles pendant la séance ; voir la fiche de dépannage, rubrique mémoire");

// --- Conteneurs et ports
console.log("Conteneurs");
const SERVICES = [
  { service: "postgres", port: 5432, variable: "POSTGRES_PORT", nom: "PostgreSQL" },
  { service: "redis", port: 6379, variable: "REDIS_PORT", nom: "Redis" },
  { service: "rabbitmq", port: 5672, variable: "RABBITMQ_PORT", nom: "RabbitMQ" },
  { service: "rabbitmq", port: 15672, variable: "RABBITMQ_UI_PORT", nom: "RabbitMQ (interface web)" },
];
const etats = new Map<string, string>();
for (const ligne of ((moteur && commande(["docker", "compose", "ps", "--all", "--format", "json"])) || "").split("\n")) {
  if (!ligne.trim()) continue;
  const c = JSON.parse(ligne);
  etats.set(c.Service, c.State === "running" ? c.Health || "running" : c.State);
}

function portLibre(port: number) {
  return new Promise<boolean>((resolve) => {
    const serveur = net.createServer();
    serveur.once("error", (e: NodeJS.ErrnoException) => resolve(e.code !== "EADDRINUSE" && e.code !== "EACCES"));
    serveur.listen({ port, host: "0.0.0.0" }, () => serveur.close(() => resolve(true)));
  });
}

const prets = new Set<string>();
for (const s of SERVICES) {
  const etat = etats.get(s.service);
  if (etat === "healthy") {
    const publie = commande(["docker", "compose", "port", s.service, String(s.port)]);
    ok(`${s.nom} : conteneur prêt, publié sur ${publie}`);
    prets.add(s.service);
    continue;
  }
  if (etat) {
    ko(`${s.nom} : conteneur dans l'état « ${etat} »`, "attendez quelques secondes et relancez npm run doctor ; sinon npm run down puis npm run up");
    continue;
  }
  const port = Number(process.env[s.variable] || s.port);
  if (await portLibre(port)) {
    if (moteur) ko(`${s.nom} : conteneur arrêté (port ${port} libre)`, "lancez npm run up");
  } else {
    ko(
      `${s.nom} : le port ${port} est déjà pris par un autre programme`,
      `arrêtez ce programme, ou choisissez un autre port dans un fichier .env (${s.variable}=${port + 10000}, voir .env.example)`,
    );
  }
}

// --- Connexions, avec les adresses que liront le Legacy et vos services
console.log("Connexions");
if (prets.size === 0) console.log("  (sautées : aucun conteneur prêt)");
const conseilAdresse = (variable: string) =>
  `vérifiez ${variable} : si vous avez changé un port dans .env, changez aussi l'adresse correspondante (voir .env.example)`;
if (prets.has("postgres")) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT to_regclass('annonce') IS NOT NULL AS legacy, current_setting('server_version') AS version");
    ok(`PostgreSQL ${rows[0].version} joint par DATABASE_URL`);
    if (rows[0].legacy) ok("jeu de données du Legacy chargé");
    else ko("le jeu de données du Legacy n'est pas chargé", "lancez npm run reinitialiser");
  } catch (e) {
    ko(`PostgreSQL injoignable par DATABASE_URL (${(e as Error).message})`, conseilAdresse("DATABASE_URL"));
  } finally {
    await client.end().catch(() => {});
  }
}
if (prets.has("redis")) {
  const redis = new Redis(process.env.REDIS_URL ?? "", { lazyConnect: true, connectTimeout: 3000, maxRetriesPerRequest: 0, retryStrategy: () => null });
  redis.on("error", () => {});
  try {
    await redis.connect();
    ok(`Redis joint par REDIS_URL (${await redis.ping()})`);
  } catch (e) {
    ko(`Redis injoignable par REDIS_URL (${(e as Error).message})`, conseilAdresse("REDIS_URL"));
  } finally {
    redis.disconnect();
  }
}
if (prets.has("rabbitmq")) {
  try {
    const connexion = await amqp.connect(process.env.AMQP_URL ?? "", { timeout: 3000 });
    ok("RabbitMQ joint par AMQP_URL");
    await connexion.close();
  } catch (e) {
    ko(`RabbitMQ injoignable par AMQP_URL (${(e as Error).message})`, conseilAdresse("AMQP_URL"));
  }
}

console.log(problemes === 0 ? "\nTout est prêt : lancez le Legacy avec npm run legacy." : `\n${problemes} problème(s) à régler. La fiche de dépannage reprend chaque message.`);
process.exit(problemes === 0 ? 0 : 1);
