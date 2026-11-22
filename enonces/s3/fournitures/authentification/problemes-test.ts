import { describe, expect, it } from "vitest";
import { applicationDeTest } from "./application-de-test.ts";

// La gestion centralisée des erreurs : chaque refus est un Problem Details (RFC 9457), et rien ne fuit.

describe("Les erreurs en Problem Details", () => {
  it("Ticket du Game Designer : acheter sa propre Annonce dit pourquoi, au lieu d'une erreur interne", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces/a-bobine-zephyr/achat", headers: await enTantQue("zephyr") });
    expect(reponse.statusCode).toBe(422);
    expect(reponse.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(reponse.json()).toMatchObject({
      type: "https://bourse.ferraille-stellaire.example/problemes/achat-de-sa-propre-annonce",
      title: "Un Joueur ne peut pas acheter sa propre Annonce",
      status: 422,
      detail: "Un Joueur ne peut pas acheter sa propre Annonce (Annonce a-bobine-zephyr)",
      instance: "/annonces/a-bobine-zephyr/achat",
    });
  });

  it("une requête invalide liste chaque champ refusé, en français", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces", headers: await enTantQue("zephyr"), payload: { prix: -500 } });
    expect(reponse.statusCode).toBe(400);
    const probleme = reponse.json();
    expect(probleme).toMatchObject({ type: "https://bourse.ferraille-stellaire.example/problemes/requete-invalide", status: 400 });
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
    expect(journal).toContain("connexion refusée à postgres");
    expect(journal).toMatch(/"stack":"Error: connexion refusée/);
  });

  it("une route inconnue, un JSON mal formé, un type de contenu refusé sont aussi des Problem Details, en français", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const inconnue = await app.inject({ url: "/hotel" });
    expect([inconnue.statusCode, inconnue.headers["content-type"]]).toEqual([404, "application/problem+json; charset=utf-8"]);
    const malForme = await app.inject({
      method: "POST",
      url: "/annonces",
      headers: { ...(await enTantQue("zephyr")), "content-type": "application/json" },
      payload: "{ prix: 190",
    });
    expect(malForme.statusCode).toBe(400);
    expect(malForme.json()).toMatchObject({ title: "Requête invalide", status: 400, detail: "Le corps de la requête n'est pas un JSON valide" });
    const xml = await app.inject({ method: "POST", url: "/annonces", headers: { "content-type": "application/xml" }, payload: "<prix>190</prix>" });
    expect(xml.json()).toMatchObject({ title: "Type de contenu non pris en charge", status: 415, detail: expect.stringContaining("application/json") });
  });
});
