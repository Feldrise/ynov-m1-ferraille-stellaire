// Le scénario « lancement de Cycle » : à l'ouverture d'un Cycle, des centaines de Joueurs ouvrent la Bourse aux
// épaves en même temps et font défiler la liste des Annonces. On le rejoue avec autocannon contre le Service Bourse.
// Usage : npm run charge                       (Service Bourse sur le port BOURSE_PORT du .env, 3100 par défaut)
//         npm run charge -- --duree 5 --connexions 20 [URL]
// Une mesure avant le cache, une après : même machine, même commande, rien d'autre de lancé.
// Code retour : 0 si toutes les réponses sont des succès (2xx ou 304), 1 sinon, 2 si le service est injoignable.
import autocannon from "autocannon";
import { chargerEnvironnement } from "./environnement.ts";

chargerEnvironnement();
const argument = (nom: string, defaut: number) => {
  const i = process.argv.indexOf(nom);
  return i > 0 ? Number(process.argv[i + 1]) : defaut;
};
const URL_BOURSE = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.CIBLE_URL ?? `http://127.0.0.1:${process.env.BOURSE_PORT ?? 3100}`;
const DUREE = argument("--duree", 10);
const CONNEXIONS = argument("--connexions", 50);

// Ce que fait un Joueur qui arrive sur la Bourse : la première page, la suivante, les Annonces bon marché.
const PARCOURS = ["/annonces", "/annonces?page=2&parPage=2", "/annonces?prixMax=200", "/annonces?parPage=50"];

try {
  const essai = await fetch(`${URL_BOURSE}/annonces`);
  if (!essai.ok) throw new Error(`GET /annonces répond ${essai.status}`);
} catch (erreur) {
  console.error(`Service Bourse injoignable sur ${URL_BOURSE} (${(erreur as Error).message}) : lancez-le d'abord, node service-bourse/src/main.ts`);
  process.exit(2);
}

console.log(`Lancement de Cycle : ${CONNEXIONS} Joueurs simultanés pendant ${DUREE} s sur ${URL_BOURSE}`);
console.log(`Parcours de chaque Joueur : ${PARCOURS.join(", ")}\n`);
const resultat = await autocannon({ url: URL_BOURSE, connections: CONNEXIONS, duration: DUREE, requests: PARCOURS.map((path) => ({ method: "GET", path })) });

const codes = Object.entries(resultat.statusCodeStats ?? {}).map(([code, { count }]) => `${code} : ${count}`);
const echecs = resultat.errors + resultat.timeouts + resultat.non2xx - (resultat.statusCodeStats?.["304"]?.count ?? 0);
console.log(`Requêtes par seconde : ${Math.round(resultat.requests.average)} en moyenne`);
console.log(`Temps de réponse     : médiane ${resultat.latency.p50} ms, 99 % sous ${resultat.latency.p99} ms, pire ${resultat.latency.max} ms`);
console.log(`Requêtes             : ${resultat.requests.total} (${codes.join(", ") || "aucune réponse"})`);
console.log(`Échecs               : ${echecs} (erreurs réseau ${resultat.errors}, délais dépassés ${resultat.timeouts})`);
process.exit(echecs > 0 || resultat.requests.total === 0 ? 1 : 0);
