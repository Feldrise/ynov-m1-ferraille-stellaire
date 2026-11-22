import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { db } from "./db.ts";
import routesComptes from "./routes/comptes.ts";
import routesInventaire from "./routes/inventaire.ts";
import routesBourse from "./routes/bourse.ts";
import routesMatchmaking from "./routes/matchmaking.ts";
import routesClassements from "./routes/classements.ts";
import routesContratsReparation from "./routes/contrats-reparation.ts";
import routesAssurances from "./routes/assurances.ts";

const app = Fastify({ logger: process.env.LEGACY_LOGS === "1" });

app.register(fastifyJwt, { secret: "secret" });

app.setErrorHandler((err: any, request, reply) => {
  reply.status(err.statusCode ?? 500).send({ erreur: err.message, stack: err.stack });
});

app.get("/", async () => ({ jeu: "Ferraille Stellaire", studio: "Lune Rouillée", version: "0.9.3" }));

app.register(routesComptes);
app.register(routesInventaire);
app.register(routesBourse);
app.register(routesMatchmaking);
app.register(routesClassements);
app.register(routesContratsReparation);
app.register(routesAssurances);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "127.0.0.1" });
const adresse = app.server.address();
console.log(`Legacy de Ferraille Stellaire sur http://127.0.0.1:${typeof adresse === "object" && adresse ? adresse.port : port}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await db.end();
    process.exit(0);
  });
}
