import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { creerBase, installerSchema, supprimerSchema } from "../../src/infrastructure/postgres/connexion.ts";

// L'adresse de PostgreSQL : DATABASE_URL si elle est définie, sinon le .env ou le .env.example du dépôt,
// cherchés en remontant les dossiers. Pas de base joignable : les tests échouent, ils ne se sautent pas.
function adresseDeLaBase(): string {
  for (let dossier = dirname(fileURLToPath(import.meta.url)); dossier !== dirname(dossier); dossier = dirname(dossier)) {
    for (const fichier of [".env", ".env.example"]) {
      if (!process.env.DATABASE_URL && existsSync(join(dossier, fichier))) process.loadEnvFile(join(dossier, fichier));
    }
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL introuvable : lance npm run up depuis la racine du dépôt");
  return process.env.DATABASE_URL;
}

// Une base de test : un schéma PostgreSQL neuf par fichier de test, supprimé à la fin.
export async function baseDeTest() {
  const url = adresseDeLaBase();
  const schema = `bourse_test_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  await installerSchema(url, schema);
  const db = creerBase(url, schema);
  return {
    db,
    fermer: async () => {
      await db.destroy();
      await supprimerSchema(url, schema);
    },
  };
}
