import amqp from "amqplib";
import { composerAvecPostgres } from "./infrastructure/composition.ts";
import { lireLaConfiguration } from "./infrastructure/configuration.ts";
import { construireApplication } from "./infrastructure/http/application.ts";
import { amorcerSiVide } from "./infrastructure/jeu-de-demonstration.ts";
import { consommerLesVentesConclues } from "./infrastructure/messagerie/consommateur.ts";
import { installerLaTopologie, topologie } from "./infrastructure/messagerie/topologie.ts";
import { supprimerSchema } from "./infrastructure/postgres/connexion.ts";

// Le point d'entrée du Service Inventaire : node service-inventaire/src/main.ts (conteneurs démarrés).
// Il consomme les Ventes conclues publiées par le Service Bourse, et répond sur le port 3200 à GET /objets/:objetId.
// Avec --reinitialiser, il efface d'abord son schéma PostgreSQL : le jeu de démonstration est rechargé.
const configuration = lireLaConfiguration();
if (process.argv.includes("--reinitialiser")) {
  await supprimerSchema(configuration.baseDeDonnees, configuration.schema);
}
const inventaire = await composerAvecPostgres(configuration.baseDeDonnees, configuration.schema);
if (await amorcerSiVide(inventaire.objets)) {
  console.log(`Jeu de démonstration chargé dans le schéma ${configuration.schema}`);
}

const connexion = await amqp.connect(configuration.amqp);
// RabbitMQ perdu : le service s'arrête, plutôt que de répondre sans plus rien consommer. Les messages, eux,
// attendent dans la file ; relancé, il reprend où il en était.
connexion.on("close", () => {
  console.error("Connexion à RabbitMQ perdue : le Service Inventaire s'arrête");
  process.exit(1);
});
const canal = await connexion.createConfirmChannel();
const t = topologie();
await installerLaTopologie(canal, t);
await consommerLesVentesConclues(canal, t, (vente) => inventaire.transfererLObjet.executer(vente));

const app = await construireApplication(inventaire);
await app.listen({ port: configuration.port, host: "127.0.0.1" });
const adresse = app.server.address();
const port = typeof adresse === "object" && adresse ? adresse.port : configuration.port;
console.log(`Service Inventaire sur http://127.0.0.1:${port} ; il consomme la file ${t.file}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    connexion.removeAllListeners("close");
    await connexion.close().catch(() => {});
    await app.close();
    await inventaire.fermer();
    process.exit(0);
  });
}
