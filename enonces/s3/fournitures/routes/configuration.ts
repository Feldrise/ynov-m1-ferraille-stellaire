import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// La configuration du Service Bourse, lue dans l'environnement : rien de secret n'est écrit dans le code.
// Une variable absente est cherchée dans le .env puis le .env.example du dépôt du cours, en remontant les dossiers.
export type Configuration = {
  baseDeDonnees: string;
  schema: string;
  port: number;
  secretDesJetons: string;
  debutDuCycle?: Date;
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
    schema: process.env.BOURSE_SCHEMA ?? "bourse",
    port: Number(process.env.BOURSE_PORT ?? 3100),
    secretDesJetons: exiger("JWT_SECRET"),
    debutDuCycle: process.env.DEBUT_DU_CYCLE ? new Date(process.env.DEBUT_DU_CYCLE) : undefined,
  };
}
