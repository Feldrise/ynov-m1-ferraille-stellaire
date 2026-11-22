import fastifyCookie from "@fastify/cookie";
import fastifyEtag from "@fastify/etag";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { Redis } from "ioredis";
import { z } from "zod";
import type { ServiceBourse, ServiceSessions } from "../composition.ts";
import type { JetonsDAcces } from "./authentification.ts";
import { limiterLeDebit } from "./limitation-de-debit.ts";
import { gererLesErreurs, routeInconnue } from "./problemes.ts";
import { routesAnnonces } from "./routes-annonces.ts";
import { routesSessions } from "./routes-sessions.ts";

// Les messages de validation de Zod, en français.
z.config(z.locales.fr());

// L'adapter HTTP du Service Bourse : un adapter entrant parmi d'autres. Il reçoit les use cases déjà
// assemblés (le ServiceBourse de la racine de composition) et ne connaît aucun adapter sortant.
// Le journal : rien (tests), la sortie standard (true), ou un flux qui reçoit chaque ligne (tests du journal).
// Redis : les compteurs de la limitation de débit, rangés sous l'espace donné ; sans Redis (tests), en mémoire.
export async function construireApplication(
  service: ServiceBourse,
  options: {
    jetons: JetonsDAcces;
    sessions: ServiceSessions;
    redis?: Redis;
    espace?: string;
    journal?: boolean | { write(ligne: string): void };
  },
) {
  const journal = typeof options.journal === "object" ? { stream: options.journal } : (options.journal ?? false);
  const app = Fastify({ logger: journal, genReqId: () => crypto.randomUUID() }).withTypeProvider<ZodTypeProvider>();
  // Les schémas Zod valident les entrées et filtrent les sorties.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(gererLesErreurs);
  app.setNotFoundHandler(routeInconnue);

  // Le contrat OpenAPI 3, généré depuis les mêmes schémas (GET /docs/json), et Swagger UI (GET /docs).
  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Service Bourse de Ferraille Stellaire",
        version: "4.0.0",
        description:
          "La Bourse aux épaves : les Joueurs y mettent en vente leurs Objets à prix fixe et y achètent ceux des autres. Les erreurs suivent la RFC 9457 (Problem Details).",
      },
      components: {
        securitySchemes: {
          jetonDAcces: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          refreshToken: { type: "apiKey", in: "cookie", name: "refresh_token" },
        },
      },
    },
    transform: jsonSchemaTransform,
    transformObject: (documents) => ("openapiObject" in documents ? enProblemJson(documents.openapiObject) : documents.swaggerObject),
  });
  await app.register(fastifySwaggerUi, { routePrefix: "/docs" });

  // Le cookie du refresh token, l'ETag des réponses (cache HTTP), la limitation de débit : avant les routes.
  await app.register(fastifyCookie);
  await app.register(fastifyEtag);
  await limiterLeDebit(app, { redis: options.redis, espace: options.espace ?? "bourse" });

  await app.register(routesAnnonces(service, options.jetons));
  await app.register(routesSessions(options.sessions));
  return app;
}

// Dans le contrat, les réponses d'erreur ont le type de contenu qu'elles ont vraiment : application/problem+json.
function enProblemJson<T>(document: T): T {
  const chemins = (document as { paths?: Record<string, Record<string, { responses?: Record<string, { content?: Record<string, unknown> }> }>> }).paths ?? {};
  for (const operation of Object.values(chemins).flatMap((chemin) => Object.values(chemin))) {
    for (const [statut, reponse] of Object.entries(operation.responses ?? {})) {
      if (Number(statut) >= 400 && reponse.content?.["application/json"]) {
        reponse.content = { "application/problem+json": reponse.content["application/json"] };
      }
    }
  }
  return document;
}
