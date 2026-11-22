import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Probleme } from "../../../src/infrastructure/http/problemes.ts";
import * as schemas from "../../../src/infrastructure/http/schemas.ts";
import { applicationDeTest } from "./application-de-test.ts";

// Le contrat OpenAPI, généré depuis les schémas Zod : complet dans sa forme, et ses exemples vérifiés contre
// l'API elle-même. Ce test vérifie la forme ; le sens d'une description reste à relire par un humain.
// Il est fourni : il doit passer sans être modifié.

type Operation = {
  summary?: string;
  description?: string;
  tags?: string[];
  responses: Record<string, { description: string; content?: Record<string, { example?: unknown }> }>;
};

async function contrat() {
  const { app } = await applicationDeTest();
  const reponse = await app.inject({ url: "/docs/json" });
  const document = reponse.json();
  const operations: Array<[string, Operation]> = Object.entries(document.paths as Record<string, Record<string, Operation>>).flatMap(
    ([chemin, methodes]) => Object.entries(methodes).map(([methode, operation]) => [`${methode.toUpperCase()} ${chemin}`, operation] as [string, Operation]),
  );
  return { app, document, operations };
}

describe("Le contrat OpenAPI", () => {
  it("est servi en OpenAPI 3.1 sur /docs/json, et Swagger UI sur /docs", async () => {
    const { app, document, operations } = await contrat();
    expect(document.openapi).toBe("3.1.0");
    expect(operations.map(([nom]) => nom)).toEqual(
      expect.arrayContaining(["GET /annonces", "GET /annonces/{annonceId}", "POST /annonces", "POST /annonces/{annonceId}/achat"]),
    );
    expect((await app.inject({ url: "/docs/" })).statusCode).toBe(200);
  });

  it("documente chaque opération : résumé, description, tag, et chaque réponse a sa description", async () => {
    const { operations } = await contrat();
    for (const [nom, operation] of operations) {
      expect([operation.summary, operation.description, operation.tags?.length], nom).not.toContain(undefined);
      for (const [statut, reponse] of Object.entries(operation.responses)) {
        expect(reponse.description, `${nom} ${statut}`).not.toBe("Default Response");
      }
    }
  });

  it("déclare les erreurs en application/problem+json", async () => {
    const { operations } = await contrat();
    for (const [nom, operation] of operations) {
      for (const [statut, reponse] of Object.entries(operation.responses).filter(([s]) => Number(s) >= 400)) {
        expect(Object.keys(reponse.content ?? {}), `${nom} ${statut}`).toEqual(["application/problem+json"]);
      }
    }
  });

  it("a des exemples conformes à leurs propres schémas, sur chaque corps de requête et chaque réponse", () => {
    const avecExemples = (schema: z.ZodType) => (schema.meta()?.examples ?? []) as unknown[];
    for (const [nom, schema] of [...Object.entries(schemas), ["Probleme", Probleme] as const]) {
      if (!(schema instanceof z.ZodType)) continue;
      if (nom.startsWith("Corps") || nom.endsWith("Dto") || nom === "Probleme") {
        expect(avecExemples(schema).length, `${nom} sans exemple`).toBeGreaterThan(0);
      }
      for (const exemple of avecExemples(schema)) expect(schema.safeParse(exemple).success, `exemple de ${nom}`).toBe(true);
    }
  });

  it("a des exemples vrais : rejoués contre l'API, ils donnent ce que le contrat annonce", async () => {
    const { app, document } = await contrat();
    const consulter = document.paths["/annonces/{annonceId}"].get;
    const parametre = consulter.parameters.find((p: { name: string }) => p.name === "annonceId").schema.example;
    const lue = await app.inject({ url: `/annonces/${parametre}` });
    expect(lue.json()).toEqual(consulter.responses["200"].content["application/json"].example);

    const publier = document.paths["/annonces"].post;
    const corps = publier.requestBody.content["application/json"].example;
    const publiee = await app.inject({ method: "POST", url: "/annonces", payload: corps });
    expect(publiee.statusCode).toBe(201);
    expect(schemas.AnnonceDto.safeParse(publiee.json()).success).toBe(true);
  });
});
