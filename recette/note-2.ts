// La recette automatisée de la Note 2 : elle interroge votre Service Bourse par HTTP, comme le ferait le client du
// jeu, sans lire une ligne de son code (boîte noire). C'est elle qui note le critère « recette » de la grille, sur 40.
//
// Usage, depuis la racine du dépôt, conteneurs démarrés (npm run up) :
//   1. node service-bourse/src/main.ts --reinitialiser     (dans un terminal : le jeu de démonstration, neuf)
//   2. npm run recette                                     (dans un autre ; ou npm run recette -- http://127.0.0.1:3100)
// Relancez le Service Bourse avec --reinitialiser avant chaque passage : la recette achète des Annonces.
//
// Huit parties de 5 points. Une partie rapporte ses points au prorata de ses vérifications réussies, par demi-point.
// Code retour : 0 si tout passe, 1 sinon, 2 si la recette ne peut pas commencer (service injoignable, Annonces déjà
// vendues par un passage précédent).
import { Ajv2020 } from "ajv/dist/2020.js";
import { SignJWT } from "jose";
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { chargerEnvironnement } from "../scripts/environnement.ts";

chargerEnvironnement();
const URL_BOURSE = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.CIBLE_URL ?? `http://127.0.0.1:${process.env.BOURSE_PORT ?? 3100}`;
const SECRET = process.env.JWT_SECRET ?? "";
const MOT_DE_PASSE = "ferraille";

// --- Appels HTTP, tous gardés pour la partie 8 (conformité au contrat) ---

type Reponse = { methode: string; chemin: string; statut: number; type: string; corps: any; texte: string; entetes: Headers; cookies: string[] };
const journal: Reponse[] = [];

async function appeler(methode: string, chemin: string, options: { corps?: unknown; brut?: string; jeton?: string; cookie?: string } = {}): Promise<Reponse> {
  const entetes: Record<string, string> = {};
  if (options.corps !== undefined || options.brut !== undefined) entetes["content-type"] = "application/json";
  if (options.jeton) entetes.authorization = `Bearer ${options.jeton}`;
  if (options.cookie) entetes.cookie = `refresh_token=${options.cookie}`;
  const reponse = await fetch(URL_BOURSE + chemin, { method: methode, headers: entetes, body: options.brut ?? (options.corps === undefined ? undefined : JSON.stringify(options.corps)) });
  const texte = await reponse.text();
  let corps: any = undefined;
  try {
    corps = texte ? JSON.parse(texte) : undefined;
  } catch {
    // corps non JSON
  }
  const r = { methode, chemin, statut: reponse.status, type: reponse.headers.get("content-type") ?? "", corps, texte, entetes: reponse.headers, cookies: reponse.headers.getSetCookie() };
  journal.push(r);
  return r;
}

// Le refresh token du cookie refresh_token, et ses attributs.
function refreshToken(r: Reponse): { valeur: string; attributs: string } | undefined {
  const cookie = r.cookies.find((c) => c.startsWith("refresh_token="));
  if (!cookie) return undefined;
  const [paire, ...attributs] = cookie.split(";");
  return { valeur: paire.slice("refresh_token=".length), attributs: attributs.join(";").toLowerCase() };
}

async function ouvrir(pseudo: string, motDePasse = MOT_DE_PASSE) {
  return appeler("POST", "/sessions", { corps: { pseudo, motDePasse } });
}

async function jetonDe(pseudo: string): Promise<string> {
  return (await ouvrir(pseudo)).corps?.jetonDAcces ?? "jeton-absent";
}

// --- Jetons fabriqués comme le ferait un attaquant ---

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const dansUneHeure = () => Math.floor(Date.now() / 1000) + 3600;
function signeALaMain(entete: object, charge: object, secret: string, algorithme: string) {
  const signature = createHmac(algorithme, secret).update(`${b64(entete)}.${b64(charge)}`).digest("base64url");
  return `${b64(entete)}.${b64(charge)}.${signature}`;
}

// --- Parties et vérifications ---

type Verification = { libelle: string; ok: boolean; detail?: string };
const parties: Array<{ titre: string; verifications: Verification[] }> = [];
let partie: Verification[] = [];
function commencer(titre: string) {
  partie = [];
  parties.push({ titre, verifications: partie });
  console.log(`\n${parties.length}. ${titre}`);
}
function verifier(libelle: string, ok: boolean, detail = "") {
  partie.push({ libelle, ok, detail });
  console.log(`   ${ok ? "ok    " : "ÉCHEC "} ${libelle}${ok || !detail ? "" : `\n          ${detail}`}`);
}
const vu = (r: Reponse) => `${r.methode} ${r.chemin} a répondu ${r.statut}${r.corps?.detail ? ` (${r.corps.detail})` : r.statut >= 500 ? ` ${r.texte.slice(0, 120)}` : ""}`;
const statut = (libelle: string, r: Reponse, attendu: number) => verifier(libelle, r.statut === attendu, `attendu ${attendu} ; ${vu(r)}`);

// --- Avant de commencer ---

try {
  await fetch(`${URL_BOURSE}/annonces`);
} catch {
  console.error(`Service Bourse injoignable sur ${URL_BOURSE} : lancez-le d'abord (node service-bourse/src/main.ts --reinitialiser).`);
  process.exit(2);
}
if (SECRET.length < 32) {
  console.error("JWT_SECRET absent ou trop court : la recette lit le même .env que votre Service Bourse.");
  process.exit(2);
}
const depart = await appeler("GET", "/annonces/a-bobine-zephyr");
if (depart.statut === 200 && depart.corps?.statut !== "active") {
  console.error("L'Annonce a-bobine-zephyr n'est plus active : un passage précédent l'a achetée. Relancez le Service Bourse avec --reinitialiser.");
  process.exit(2);
}
// Un passage précédent de moins de dix secondes laisse des achats comptés dans la fenêtre de la limitation de débit
// (trois par Joueur et par tranche de dix secondes) : on attend qu'elle se termine.
const TRACE = join(os.tmpdir(), `recette-note-2-${new URL(URL_BOURSE).port || "80"}.txt`);
let precedent = 0;
try {
  precedent = Number(readFileSync(TRACE, "utf8"));
} catch {
  // premier passage
}
if (Date.now() - precedent < 11_000) {
  console.log("Un passage précédent vient de finir : j'attends que la fenêtre des achats se termine.");
  await new Promise((r) => setTimeout(r, 11_000 - (Date.now() - precedent)));
}
// Il a pu aussi épuiser la limite d'ouverture de session de cette adresse IP : on attend qu'elle revienne.
const sonde = await ouvrir("zephyr");
if (sonde.statut === 429) {
  const attente = Number(sonde.entetes.get("retry-after") ?? 60);
  console.log(`La limite d'ouverture de session d'un passage précédent court encore : j'attends ${attente} s.`);
  await new Promise((r) => setTimeout(r, attente * 1000 + 500));
}
journal.length = 0;
console.log(`Recette de la Note 2 contre ${URL_BOURSE}`);

// 1. Le contrat OpenAPI
commencer("Le contrat OpenAPI est publié et décrit toute l'API");
const docs = await appeler("GET", "/docs/json");
const contrat = docs.corps ?? {};
const OPERATIONS = [
  ["get", "/annonces"],
  ["get", "/annonces/{annonceId}"],
  ["post", "/annonces"],
  ["post", "/annonces/{annonceId}/achat"],
  ["post", "/sessions"],
  ["post", "/sessions/renouvellement"],
  ["delete", "/sessions/courante"],
] as const;
statut("GET /docs/json sert le contrat", docs, 200);
verifier("c'est un document OpenAPI 3", String(contrat.openapi ?? "").startsWith("3."), `champ openapi : ${contrat.openapi}`);
const absentes = OPERATIONS.filter(([m, c]) => !contrat.paths?.[c]?.[m]).map(([m, c]) => `${m.toUpperCase()} ${c}`);
verifier("il décrit les sept opérations de la Bourse et des sessions", absentes.length === 0, `absentes : ${absentes.join(", ")}`);
const securisees = (["/annonces", "/annonces/{annonceId}/achat"] as const).every((c) => contrat.paths?.[c]?.post?.security?.length);
verifier("la mise en vente et l'achat y déclarent le jeton d'accès", securisees, "security absent de POST /annonces ou de l'achat");
const limitees = ["/sessions", "/annonces/{annonceId}/achat"].every((c) => contrat.paths?.[c]?.post?.responses?.["429"]);
verifier("l'ouverture de session et l'achat y déclarent leur réponse 429", limitees, "réponse 429 absente du contrat");

// Les jetons des Joueurs du jeu de démonstration, par l'ouverture de session.
const [zephyr, lyra, kessa] = [await jetonDe("zephyr"), await jetonDe("lyra"), await jetonDe("kessa")];

// 2. Les codes de statut
commencer("La Bourse répond avec les bons codes de statut");
const liste = await appeler("GET", "/annonces?parPage=2");
verifier("GET /annonces?parPage=2 : 200, une page de 2 Annonces actives", liste.statut === 200 && liste.corps?.annonces?.length === 2, vu(liste));
statut("GET /annonces/a-inconnue : 404", await appeler("GET", "/annonces/a-inconnue"), 404);
statut("GET /annonces?parPage=500 : 400", await appeler("GET", "/annonces?parPage=500"), 400);
const publiee = await appeler("POST", "/annonces", { jeton: zephyr, corps: { objetId: "o-pile-zephyr", prix: 190 } });
verifier("POST /annonces : 201 et l'en-tête Location", publiee.statut === 201 && publiee.entetes.get("location") === `/annonces/${publiee.corps?.id}`, vu(publiee));
statut("POST /annonces au prix de -500 Crédits : 400", await appeler("POST", "/annonces", { jeton: zephyr, corps: { objetId: "o-pile-zephyr", prix: -500 } }), 400);
statut("POST /annonces pour l'Objet d'un autre Joueur : 403", await appeler("POST", "/annonces", { jeton: zephyr, corps: { objetId: "o-carte-kessa", prix: 50 } }), 403);
statut("POST /annonces pour un Objet déjà en vente : 409", await appeler("POST", "/annonces", { jeton: zephyr, corps: { objetId: "o-pile-zephyr", prix: 200 } }), 409);
statut("achat de sa propre Annonce : 422", await appeler("POST", "/annonces/a-bobine-zephyr/achat", { jeton: zephyr }), 422);
const vente = await appeler("POST", "/annonces/a-bobine-zephyr/achat", { jeton: lyra });
verifier("achat d'une Annonce : 201, lyra est l'acheteur", vente.statut === 201 && vente.corps?.acheteurId === "lyra", vu(vente));
statut("second achat de la même Annonce : 409", await appeler("POST", "/annonces/a-bobine-zephyr/achat", { jeton: kessa }), 409);
statut("achat sans assez de Crédits : 422", await appeler("POST", "/annonces/a-reacteur-rivet/achat", { jeton: kessa }), 422);

// 3. Les erreurs normalisées
commencer("Chaque erreur est un Problem Details (RFC 9457), sans fuite");
statut("une route inconnue : 404", await appeler("GET", "/vaisseaux"), 404);
statut("un corps qui n'est pas du JSON : 400", await appeler("POST", "/annonces", { jeton: zephyr, brut: '{"objetId": "o-pile-zephyr", prix: 190' }), 400);
const erreurs = journal.filter((r) => r.statut >= 400);
const sansProbleme = erreurs.filter((r) => !r.type.startsWith("application/problem+json"));
verifier(`les ${erreurs.length} erreurs reçues jusqu'ici sont en application/problem+json`, erreurs.length > 0 && sansProbleme.length === 0, sansProbleme.map(vu).slice(0, 3).join(" ; "));
const malFormees = erreurs.filter((r) => typeof r.corps?.type !== "string" || typeof r.corps?.title !== "string" || r.corps?.status !== r.statut);
verifier("chacune porte type, title et le même status que la réponse HTTP", erreurs.length > 0 && malFormees.length === 0, malFormees.map(vu).slice(0, 3).join(" ; "));
const fuites = erreurs.filter((r) => /"stack"|\bat .+\.ts:\d+|node_modules|\/src\//.test(r.texte));
verifier("aucune ne laisse fuir une stack trace ou un chemin de fichier", fuites.length === 0, fuites.map(vu).slice(0, 3).join(" ; "));
const invalide = journal.find((r) => r.chemin === "/annonces" && r.methode === "POST" && r.statut === 400 && Array.isArray(r.corps?.erreurs));
verifier("un 400 de validation détaille les champs refusés (erreurs)", Boolean(invalide?.corps?.erreurs?.length), "aucun 400 de POST /annonces avec un tableau erreurs");

// 4. Le jeton d'accès
commencer("Un jeton d'accès absent, forgé, expiré ou mal signé est refusé (401)");
const mettreEnVente = (jeton?: string) => appeler("POST", "/annonces", { jeton, corps: { objetId: "o-gyroscope-lyra", prix: 75 } });
const sansJeton = await mettreEnVente();
verifier("sans jeton : 401 et l'en-tête WWW-Authenticate: Bearer", sansJeton.statut === 401 && /^Bearer/i.test(sansJeton.entetes.get("www-authenticate") ?? ""), vu(sansJeton));
statut("jeton forgé avec « secret », comme contre le Legacy : 401", await mettreEnVente(signeALaMain({ alg: "HS256", typ: "JWT" }, { sub: "lyra", exp: dansUneHeure() }, "secret", "sha256")), 401);
const expire = await new SignJWT({}).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject("lyra").setIssuedAt(Math.floor(Date.now() / 1000) - 1000).setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode(SECRET));
statut("jeton expiré, pourtant signé avec le bon secret : 401", await mettreEnVente(expire), 401);
statut("jeton non signé (alg: none) : 401", await mettreEnVente(`${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "lyra", exp: dansUneHeure() })}.`), 401);
statut("jeton HS384, signé avec le bon secret, d'un algorithme non accepté : 401", await mettreEnVente(signeALaMain({ alg: "HS384", typ: "JWT" }, { sub: "lyra", exp: dansUneHeure() }, SECRET, "sha384")), 401);

// 5. Les sessions
commencer("Ouverture et renouvellement de session, avec rotation du refresh token");
statut("mot de passe faux : 401", await ouvrir("rivet", "rouille"), 401);
const session = await ouvrir("rivet");
const cookie = refreshToken(session);
verifier("ouverture : 201, un jeton d'accès et sa durée de vie", session.statut === 201 && typeof session.corps?.jetonDAcces === "string" && Number.isInteger(session.corps?.expireDans), vu(session));
verifier(
  "le refresh token est dans le cookie refresh_token, HttpOnly, Secure, SameSite=Strict",
  Boolean(cookie) && ["httponly", "secure", "samesite=strict"].every((a) => cookie!.attributs.includes(a)),
  `Set-Cookie : ${session.cookies.join(" | ") || "absent"}`,
);
verifier("le refresh token n'apparaît pas dans le corps de la réponse", Boolean(cookie) && !session.texte.includes(cookie!.valeur), "le corps contient le refresh token : le JavaScript de la page peut le lire");
const avecLeJeton = await appeler("POST", "/annonces", { jeton: session.corps?.jetonDAcces, corps: { objetId: "o-foreuse-rivet", prix: 410 } });
statut("le jeton d'accès obtenu ouvre la mise en vente : 201", avecLeJeton, 201);
const renouvellement = await appeler("POST", "/sessions/renouvellement", { cookie: cookie?.valeur });
const suivant = refreshToken(renouvellement);
verifier("renouvellement : 200, un nouveau jeton d'accès", renouvellement.statut === 200 && typeof renouvellement.corps?.jetonDAcces === "string", vu(renouvellement));
verifier("et un nouveau refresh token, différent du premier (rotation)", Boolean(suivant) && suivant!.valeur !== cookie?.valeur, "même refresh token, ou aucun");

// 6. Le refresh token révoqué
commencer("Un refresh token rejoué, révoqué ou absent est refusé (401)");
const rejeu = await appeler("POST", "/sessions/renouvellement", { cookie: cookie?.valeur });
statut("rejeu du premier refresh token, déjà utilisé : 401", rejeu, 401);
statut("après le rejeu, le refresh token neuf est refusé aussi : toute la session est révoquée", await appeler("POST", "/sessions/renouvellement", { cookie: suivant?.valeur }), 401);
const autre = refreshToken(await ouvrir("lyra"));
statut("fermeture de session : 204", await appeler("DELETE", "/sessions/courante", { cookie: autre?.valeur }), 204);
statut("après la fermeture, son refresh token est refusé : 401", await appeler("POST", "/sessions/renouvellement", { cookie: autre?.valeur }), 401);
statut("renouvellement sans cookie : 401", await appeler("POST", "/sessions/renouvellement"), 401);

// 7. Les 429
commencer("La limitation de débit répond 429, en Problem Details, avec Retry-After");
const bot = await jetonDe("rivet");
const achats: Reponse[] = [];
for (let i = 0; i < 4; i++) achats.push(await appeler("POST", "/annonces/a-inexistante/achat", { jeton: bot }));
const refusAchat = achats[3];
verifier("trois achats en dix secondes passent jusqu'au use case (404 ici)", achats.slice(0, 3).every((r) => r.statut === 404), achats.map((r) => r.statut).join(", "));
verifier("le quatrième : 429, Problem Details, et Retry-After", refusAchat.statut === 429 && refusAchat.type.startsWith("application/problem+json") && refusAchat.entetes.has("retry-after"), vu(refusAchat));
const autreJoueur = await appeler("POST", "/annonces/a-inexistante/achat", { jeton: zephyr });
verifier("la limite des achats compte par Joueur : un autre Joueur achète encore (404 ici)", autreJoueur.statut === 404, vu(autreJoueur));
const tentatives: Reponse[] = [];
for (let i = 0; i < 12 && tentatives.at(-1)?.statut !== 429; i++) tentatives.push(await ouvrir("zephyr", `essai-${i}`));
const refusSession = tentatives.at(-1)!;
verifier("au plus dix tentatives d'ouverture de session par minute : la suivante reçoit 429", refusSession.statut === 429, `${tentatives.length} tentatives sans 429`);
verifier("ce 429 est un Problem Details avec Retry-After", refusSession.type.startsWith("application/problem+json") && refusSession.entetes.has("retry-after"), vu(refusSession));

// 8. La conformité au contrat
commencer("Chaque réponse reçue est conforme au contrat OpenAPI");
const ajv = new Ajv2020({ strict: false, allErrors: false, validateFormats: false });
const chemins = Object.keys(contrat.paths ?? {}).map((c) => ({ c, motif: new RegExp(`^${c.replace(/\{[^}]+\}/g, "[^/]+")}$`) }));
const nonConformes: string[] = [];
let examinees = 0;
for (const r of journal.filter((r) => !r.chemin.startsWith("/docs") && r.chemin !== "/vaisseaux")) {
  examinees += 1;
  const chemin = chemins.find((c) => c.motif.test(r.chemin.split("?")[0]))?.c;
  const operation = chemin && contrat.paths[chemin][r.methode.toLowerCase()];
  const reponse = operation?.responses?.[String(r.statut)];
  if (!reponse) {
    nonConformes.push(`${r.methode} ${r.chemin} : statut ${r.statut} absent du contrat`);
    continue;
  }
  if (r.statut === 204 || r.statut === 304) continue;
  const type = r.type.split(";")[0];
  const schema = reponse.content?.[type]?.schema;
  if (!schema) {
    nonConformes.push(`${r.methode} ${r.chemin} ${r.statut} : type ${type || "absent"} absent du contrat`);
    continue;
  }
  const valider = ajv.compile({ ...schema, components: contrat.components });
  if (!valider(r.corps)) nonConformes.push(`${r.methode} ${r.chemin} ${r.statut} : ${ajv.errorsText(valider.errors)}`);
}
verifier(`les ${examinees} réponses reçues ont un statut déclaré dans le contrat, pour leur opération`, examinees > 0 && !nonConformes.some((n) => n.includes("absent du contrat")), nonConformes.filter((n) => n.includes("absent")).slice(0, 4).join("\n          "));
verifier("leurs corps respectent les schémas du contrat", examinees > 0 && nonConformes.length === 0, nonConformes.filter((n) => !n.includes("absent")).slice(0, 4).join("\n          "));

// --- Bilan ---

let total = 0;
console.log("\nBilan");
for (const [i, p] of parties.entries()) {
  const reussies = p.verifications.filter((v) => v.ok).length;
  const points = Math.floor((10 * reussies) / p.verifications.length) / 2;
  total += points;
  console.log(`   ${String(points).padStart(3)} / 5   ${i + 1}. ${p.titre} (${reussies}/${p.verifications.length})`);
}
console.log(`\nRecette : ${total} / 40`);
writeFileSync(TRACE, String(Date.now()));
process.exit(total === 40 ? 0 : 1);
