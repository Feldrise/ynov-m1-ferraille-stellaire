import { describe, expect, it } from "vitest";
import { applicationDeTest } from "./application-de-test.ts";

// Ticket du Game Designer : « un bot achète toutes les Annonces sous-cotées dans les 200 ms qui suivent leur
// publication ». Trois achats par tranche de dix secondes et par Joueur ; le quatrième reçoit 429.
describe("Limitation de débit des achats, par Joueur", () => {
  it("refuse le quatrième achat en dix secondes : 429 en Problem Details, avec Retry-After et les en-têtes de limite", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const bot = await enTantQue("lyra");
    const statuts: number[] = [];
    for (const annonce of ["a-bobine-zephyr", "a-module-kessa", "a-reacteur-rivet", "a-inconnue"]) {
      statuts.push((await app.inject({ method: "POST", url: `/annonces/${annonce}/achat`, headers: bot })).statusCode);
    }
    expect(statuts.slice(0, 3)).not.toContain(429);
    const refus = await app.inject({ method: "POST", url: "/annonces/a-inconnue/achat", headers: bot });
    expect(refus.statusCode).toBe(429);
    expect(refus.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(refus.json()).toMatchObject({ type: expect.stringMatching(/trop-de-requetes$/), title: "Trop de requêtes", status: 429 });
    expect(refus.json().detail).toMatch(/^Trop de requêtes : réessayez dans \d+ secondes$/);
    expect(Number(refus.headers["retry-after"])).toBeGreaterThan(0);
    expect(refus.headers["x-ratelimit-limit"]).toBe("3");
    expect(refus.headers["x-ratelimit-remaining"]).toBe("0");
  });

  it("compte par Joueur : un autre Joueur, depuis la même adresse IP, achète encore", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const lyra = await enTantQue("lyra");
    for (let i = 0; i < 4; i++) await app.inject({ method: "POST", url: "/annonces/a-inconnue/achat", headers: lyra });
    const kessa = await app.inject({ method: "POST", url: "/annonces/a-boite-lyra/achat", headers: await enTantQue("kessa") });
    expect(kessa.statusCode).toBe(201);
  });

  it("ne limite pas la lecture : la liste des Annonces répond toujours", async () => {
    const { app } = await applicationDeTest();
    for (let i = 0; i < 30; i++) expect((await app.inject({ url: "/annonces" })).statusCode).toBe(200);
  });
});
