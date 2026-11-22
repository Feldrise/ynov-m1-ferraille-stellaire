import { describe, expect, it } from "vitest";
import { applicationDeTest } from "./application-de-test.ts";

// La gestion centralisée des erreurs : chaque refus est un Problem Details (RFC 9457), et rien ne fuit.
// Ces tests sont fournis : ils doivent passer sans être modifiés.

const TYPES = "https://bourse.ferraille-stellaire.example/problemes/";

describe("Les erreurs en Problem Details", () => {
  it("Ticket du Game Designer : acheter sa propre Annonce dit pourquoi, au lieu d'une erreur interne", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces/a-bobine-zephyr/achat", payload: { acheteurId: "zephyr" } });
    expect(reponse.statusCode).toBe(422);
    expect(reponse.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(reponse.json()).toMatchObject({
      type: `${TYPES}achat-de-sa-propre-annonce`,
      title: "Un Joueur ne peut pas acheter sa propre Annonce",
      status: 422,
      detail: "Un Joueur ne peut pas acheter sa propre Annonce (Annonce a-bobine-zephyr)",
      instance: "/annonces/a-bobine-zephyr/achat",
    });
  });

  it("chaque erreur du Domain et de l'Application a son statut", async () => {
    const { app } = await applicationDeTest();
    const vendre = async (objetId: string) =>
      (await app.inject({ method: "POST", url: "/annonces", payload: { objetId, vendeurId: "zephyr", prix: 100 } })).statusCode;
    const acheter = async (annonceId: string, acheteurId: string) =>
      (await app.inject({ method: "POST", url: `/annonces/${annonceId}/achat`, payload: { acheteurId } })).statusCode;
    expect(await vendre("o-carte-kessa")).toBe(403);
    expect(await vendre("o-bobine-zephyr")).toBe(409);
    expect(await vendre("o-inconnu")).toBe(404);
    expect(await acheter("a-reacteur-rivet", "kessa")).toBe(422);
    expect(await acheter("a-bobine-zephyr", "lyra")).toBe(201);
    expect(await acheter("a-bobine-zephyr", "rivet")).toBe(409);
    expect(await acheter("a-inconnue", "rivet")).toBe(404);
    expect((await app.inject({ url: "/annonces/a-inconnue" })).statusCode).toBe(404);
  });

  it("une requête invalide liste chaque champ refusé, en français", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces", payload: { vendeurId: "zephyr", prix: -500 } });
    expect(reponse.statusCode).toBe(400);
    const probleme = reponse.json();
    expect(probleme).toMatchObject({ type: `${TYPES}requete-invalide`, status: 400 });
    expect(probleme.erreurs.map((e: { champ: string }) => e.champ).sort()).toEqual(["body/objetId", "body/prix"]);
    expect(probleme.erreurs.find((e: { champ: string }) => e.champ === "body/prix").message).toMatch(/trop petit/i);
  });

  it("une erreur interne ne renvoie ni message ni stack, mais les journalise sous la trace donnée au Joueur", async () => {
    const lignes: string[] = [];
    const { app, bourse } = await applicationDeTest({ journal: { write: (ligne) => lignes.push(ligne) } });
    // Une panne de l'adapter PostgreSQL, simulée : le dépôt lève une erreur technique bavarde.
    bourse.annonces.annoncesActives = async () => {
      throw new Error("connexion refusée à postgres://ferraille:ferraille@10.0.0.7:5432");
    };
    const reponse = await app.inject({ url: "/annonces" });
    expect(reponse.statusCode).toBe(500);
    expect(reponse.body).not.toMatch(/postgres|ferraille:|\.ts|at /);
    const { trace, title } = reponse.json();
    expect(title).toBe("Erreur interne");
    const journal = lignes.join("");
    expect(journal).toContain(trace);
    expect(journal).toMatch(/"stack":"Error: connexion refusée/);
  });

  it("une route inconnue, un JSON mal formé, un type de contenu refusé sont aussi des Problem Details, en français", async () => {
    const { app } = await applicationDeTest();
    const inconnue = await app.inject({ url: "/hotel" });
    expect([inconnue.statusCode, inconnue.headers["content-type"]]).toEqual([404, "application/problem+json; charset=utf-8"]);
    const malForme = await app.inject({ method: "POST", url: "/annonces", headers: { "content-type": "application/json" }, payload: "{ prix: 190" });
    expect(malForme.statusCode).toBe(400);
    expect(malForme.json()).toMatchObject({ title: "Requête invalide", status: 400, detail: "Le corps de la requête n'est pas un JSON valide" });
    const xml = await app.inject({ method: "POST", url: "/annonces", headers: { "content-type": "application/xml" }, payload: "<prix>190</prix>" });
    expect(xml.json()).toMatchObject({ title: "Type de contenu non pris en charge", status: 415, detail: expect.stringContaining("application/json") });
  });
});
