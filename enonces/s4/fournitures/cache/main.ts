import { Redis } from "ioredis";
import { CacheRedis } from "./infrastructure/cache/cache-redis.ts";
import { composerAvecPostgres, composerLesSessionsAvecPostgres } from "./infrastructure/composition.ts";
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
// Redis : le cache de la liste des Annonces et les compteurs de la limitation de débit. Sans file d'attente
// hors ligne : Redis arrêté, une commande échoue tout de suite, et le service continue sans cache ni limite.
const redis = new Redis(configuration.redis, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 1000 });
redis.on("error", () => {});
await redis.connect().catch(() => console.warn(`Redis injoignable sur ${configuration.redis} : ni cache ni limitation de débit`));

const jetons = new JetonsDAcces(configuration.secretDesJetons);
const bourse = await composerAvecPostgres(configuration.baseDeDonnees, configuration.schema, undefined, configuration.debutDuCycle, new CacheRedis(redis));
const sessions = composerLesSessionsAvecPostgres(bourse.db, jetons);
if (await amorcerSiVide(bourse)) {
  console.log(`Jeu de démonstration chargé dans le schéma ${configuration.schema}`);
}
const app = await construireApplication(bourse, { jetons, sessions, redis, espace: configuration.schema, journal: true });
await app.listen({ port: configuration.port, host: "127.0.0.1" });
const adresse = app.server.address();
const port = typeof adresse === "object" && adresse ? adresse.port : configuration.port;
console.log(`Service Bourse sur http://127.0.0.1:${port} ; contrat OpenAPI et Swagger UI sur http://127.0.0.1:${port}/docs`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await bourse.fermer();
    redis.disconnect();
    process.exit(0);
  });
}
