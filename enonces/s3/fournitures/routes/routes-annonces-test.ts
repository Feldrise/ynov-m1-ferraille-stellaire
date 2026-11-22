import { describe, expect, it } from "vitest";
import { applicationDeTest } from "./application-de-test.ts";

// L'adapter HTTP de bout en bout, sans base : jeu de démonstration en mémoire, requêtes par app.inject.
// zephyr vend a-bobine-zephyr (120 Crédits) et possède o-pile-zephyr ; lyra a 1000 Crédits.
// Ces tests sont fournis : ils doivent passer sans être modifiés.

describe("GET /annonces", () => {
  it("liste les Annonces actives de la moins chère à la plus chère, page par page", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ url: "/annonces?parPage=2" });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toMatchObject({ page: 1, parPage: 2, total: 4 });
    expect(reponse.json().annonces.map((a: { id: string }) => a.id)).toEqual(["a-boite-lyra", "a-bobine-zephyr"]);
  });

  it("refuse une pagination invalide avant tout use case (400)", async () => {
    const { app } = await applicationDeTest();
    for (const requete of ["parPage=51", "page=0", "prixMax=-5", "parPage=dix"]) {
      expect((await app.inject({ url: `/annonces?${requete}` })).statusCode, requete).toBe(400);
    }
  });
});

describe("GET /annonces/:annonceId (étape 1)", () => {
  it("rend l'Annonce sous sa forme de l'API, pas celle de l'entité", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ url: "/annonces/a-bobine-zephyr" });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toEqual({ id: "a-bobine-zephyr", objetId: "o-bobine-zephyr", vendeurId: "zephyr", prix: 120, statut: "active" });
  });
});

describe("POST /annonces (étape 2)", () => {
  it("publie l'Annonce (201 et Location)", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces", payload: { objetId: "o-pile-zephyr", vendeurId: "zephyr", prix: 190 } });
    expect(reponse.statusCode).toBe(201);
    expect(reponse.json()).toMatchObject({ objetId: "o-pile-zephyr", vendeurId: "zephyr", prix: 190, statut: "active" });
    expect(reponse.headers.location).toBe(`/annonces/${reponse.json().id}`);
  });

  it("valide le corps à la frontière : un prix négatif, nul, décimal ou en texte n'atteint pas le Domain (400)", async () => {
    const { app } = await applicationDeTest();
    for (const prix of [-500, 0, 1.5, "190"]) {
      const reponse = await app.inject({ method: "POST", url: "/annonces", payload: { objetId: "o-pile-zephyr", vendeurId: "zephyr", prix } });
      expect(reponse.statusCode, String(prix)).toBe(400);
    }
  });
});

describe("POST /annonces/:annonceId/achat (étape 3)", () => {
  it("conclut la vente (201)", async () => {
    const { app, bourse } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces/a-bobine-zephyr/achat", payload: { acheteurId: "lyra" } });
    expect(reponse.statusCode).toBe(201);
    expect(reponse.json()).toEqual({
      annonceId: "a-bobine-zephyr",
      objetId: "o-bobine-zephyr",
      vendeurId: "zephyr",
      acheteurId: "lyra",
      prix: 120,
      taxe: 6,
      netVendeur: 114,
      concluLe: "2027-01-18T09:30:00.000Z",
    });
    expect((await bourse.porteMonnaie.solde("lyra")).montant).toBe(880);
  });
});
