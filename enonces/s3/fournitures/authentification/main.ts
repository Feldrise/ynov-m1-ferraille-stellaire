import { composerAvecPostgres } from "./infrastructure/composition.ts";
import { lireLaConfiguration } from "./infrastructure/configuration.ts";
import { JetonsDAcces } from "./infrastructure/http/authentification.ts";
import { construireApplication } from "./infrastructure/http/application.ts";
import { amorcerSiVide } from "./infrastructure/jeu-de-demonstration.ts";
import { supprimerSchema } from "./infrastructure/postgres/connexion.ts";

// Le point d'entrée du Service Bourse : node service-bourse/src/main.ts (conteneurs démarrés par npm run up).
// Il lit la configuration, assemble use cases et adapters, et démarre l'adapter HTTP sur le port 3100.
// Avec --reinitialiser, il efface d'abord son schéma PostgreSQL : le jeu de démonstration est rechargé.
const configuration = lireLaConfiguration();
if (process.argv.includes("--reinitialiser")) {
  await supprimerSchema(configuration.baseDeDonnees, configuration.schema);
}
const bourse = await composerAvecPostgres(configuration.baseDeDonnees, configuration.schema, undefined, configuration.debutDuCycle);
if (await amorcerSiVide(bourse)) {
  console.log(`Jeu de démonstration chargé dans le schéma ${configuration.schema}`);
}
const app = await construireApplication(bourse, { jetons: new JetonsDAcces(configuration.secretDesJetons), journal: true });
await app.listen({ port: configuration.port, host: "127.0.0.1" });
const adresse = app.server.address();
const port = typeof adresse === "object" && adresse ? adresse.port : configuration.port;
console.log(`Service Bourse sur http://127.0.0.1:${port} ; contrat OpenAPI et Swagger UI sur http://127.0.0.1:${port}/docs`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await bourse.fermer();
    process.exit(0);
  });
}
