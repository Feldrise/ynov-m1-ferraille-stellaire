import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// L'adresse de RabbitMQ : AMQP_URL si elle est définie, sinon le .env ou le .env.example du dépôt, cherchés en
// remontant les dossiers. Pas de RabbitMQ joignable : les tests échouent, ils ne se sautent pas.
export function adresseDeRabbitMQ(): string {
  for (let dossier = dirname(fileURLToPath(import.meta.url)); dossier !== dirname(dossier); dossier = dirname(dossier)) {
    for (const fichier of [".env", ".env.example"]) {
      if (!process.env.AMQP_URL && existsSync(join(dossier, fichier))) process.loadEnvFile(join(dossier, fichier));
    }
  }
  if (!process.env.AMQP_URL) throw new Error("AMQP_URL introuvable : lance npm run up depuis la racine du dépôt");
  return process.env.AMQP_URL;
}
