// Recrée les tables du Legacy et recharge son jeu de données (npm run reinitialiser).
import { readFile } from "node:fs/promises";
import pg from "pg";
import { chargerEnvironnement } from "./environnement.ts";

chargerEnvironnement();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
} catch (e) {
  console.error(`Impossible de joindre PostgreSQL (${(e as Error).message}).`);
  console.error("Lancez d'abord les conteneurs (npm run up), puis npm run doctor si l'erreur persiste.");
  process.exit(1);
}
for (const fichier of ["schema.sql", "donnees.sql"]) {
  await client.query(await readFile(new URL(`../legacy/sql/${fichier}`, import.meta.url), "utf8"));
}
const { rows } = await client.query(
  "SELECT (SELECT count(*) FROM joueur) AS joueurs, (SELECT count(*) FROM objet) AS objets, (SELECT count(*) FROM annonce WHERE statut = 'active') AS annonces",
);
await client.end();
console.log(`Jeu de données du Legacy chargé : ${rows[0].joueurs} Joueurs, ${rows[0].objets} Objets, ${rows[0].annonces} Annonces actives.`);
