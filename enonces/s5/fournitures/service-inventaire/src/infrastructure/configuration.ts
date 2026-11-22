import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// La configuration du Service Inventaire, lue dans l'environnement. Une variable absente est cherchée dans le
// .env puis le .env.example du dépôt du cours, en remontant les dossiers.
export type Configuration = {
  baseDeDonnees: string;
  schema: string;
  port: number;
  amqp: string;
};

export function lireLaConfiguration(): Configuration {
  for (let dossier = dirname(fileURLToPath(import.meta.url)); dossier !== dirname(dossier); dossier = dirname(dossier)) {
    for (const fichier of [".env", ".env.example"]) {
      if (existsSync(join(dossier, fichier))) process.loadEnvFile(join(dossier, fichier));
    }
  }
  const exiger = (nom: string) => {
    const valeur = process.env[nom];
    if (!valeur) throw new Error(`Variable d'environnement ${nom} absente : voir le .env.example du dépôt`);
    return valeur;
  };
  return {
    baseDeDonnees: exiger("DATABASE_URL"),
    schema: process.env.INVENTAIRE_SCHEMA ?? "inventaire",
    port: Number(process.env.INVENTAIRE_PORT ?? 3200),
    amqp: exiger("AMQP_URL"),
  };
}
