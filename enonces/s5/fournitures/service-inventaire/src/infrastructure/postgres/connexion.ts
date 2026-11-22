import { readFile } from "node:fs/promises";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { Tables } from "./tables.ts";

// Un pool de connexions par schéma, comme dans le Service Bourse : rien n'est ouvert au chargement du module.
// C'est la racine de composition qui appelle creerBase, et qui ferme avec destroy().
export function creerBase(url: string, schema = "inventaire"): Kysely<Tables> {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
    throw new Error(`Nom de schéma PostgreSQL invalide : ${schema}`);
  }
  const pool = new pg.Pool({ connectionString: url, max: 5, options: `-c search_path=${schema}` });
  // Une connexion inactive coupée par PostgreSQL (arrêt, redémarrage) : le pool l'écarte et en rouvre une à la
  // demande. Sans ce gestionnaire, l'événement « error » arrêterait Node.js ; la requête suivante, elle, échoue en 500.
  pool.on("error", () => {});
  return new Kysely<Tables>({ dialect: new PostgresDialect({ pool }) });
}

// Crée le schéma et ses tables s'ils n'existent pas.
export async function installerSchema(url: string, schema = "inventaire"): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}; SET search_path TO ${schema};`);
    await client.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
  } finally {
    await client.end();
  }
}

export async function supprimerSchema(url: string, schema: string): Promise<void> {
  const db = creerBase(url, schema);
  await sql`DROP SCHEMA IF EXISTS ${sql.id(schema)} CASCADE`.execute(db);
  await db.destroy();
}
