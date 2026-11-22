import pg from "pg";

// Configuration : .env s'il existe, sinon les valeurs par défaut de .env.example.
for (const fichier of ["../../.env", "../../.env.example"]) {
  try {
    process.loadEnvFile(new URL(fichier, import.meta.url));
  } catch {
    // fichier absent
  }
}

// Une seule connexion pour tout le serveur, ouverte dès le chargement du module.
export const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
