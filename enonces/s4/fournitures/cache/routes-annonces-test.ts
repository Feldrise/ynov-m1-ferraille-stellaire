import { describe, expect, it } from "vitest";
import { applicationDeTest } from "./application-de-test.ts";

// L'adapter HTTP de bout en bout, sans base : jeu de démonstration en mémoire, requêtes par app.inject.
// zephyr vend a-bobine-zephyr (120 Crédits) et possède o-pile-zephyr ; kessa a 300 Crédits, lyra 1000.

describe("GET /annonces", () => {
  it("liste les Annonces actives de la moins chère à la plus chère, page par page", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ url: "/annonces?parPage=2" });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toMatchObject({ page: 1, parPage: 2, total: 4 });
    expect(reponse.json().annonces.map((a: { id: string }) => a.id)).toEqual(["a-boite-lyra", "a-bobine-zephyr"]);
    const page2 = await app.inject({ url: "/annonces?parPage=2&page=2" });
    expect(page2.json().annonces.map((a: { prix: number }) => a.prix)).toEqual([340, 650]);
  });

  it("filtre par prix plafond", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ url: "/annonces?prixMax=120" });
    expect(reponse.json()).toMatchObject({ total: 2, page: 1, parPage: 20 });
  });

  it("refuse une pagination invalide avant tout use case (400)", async () => {
    const { app } = await applicationDeTest();
    for (const requete of ["parPage=51", "page=0", "prixMax=-5", "parPage=dix"]) {
      expect((await app.inject({ url: `/annonces?${requete}` })).statusCode, requete).toBe(400);
    }
  });
});

describe("GET /annonces/:annonceId", () => {
  it("rend l'Annonce sous sa forme de l'API, pas celle de l'entité", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ url: "/annonces/a-bobine-zephyr" });
    expect(reponse.json()).toEqual({ id: "a-bobine-zephyr", objetId: "o-bobine-zephyr", vendeurId: "zephyr", prix: 120, statut: "active" });
  });

  it("répond 404 pour une Annonce inconnue", async () => {
    const { app } = await applicationDeTest();
    expect((await app.inject({ url: "/annonces/a-inconnue" })).statusCode).toBe(404);
  });
});

describe("POST /annonces", () => {
  it("publie l'Annonce du Joueur authentifié (201 et Location)", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces", headers: await enTantQue("zephyr"), payload: { objetId: "o-pile-zephyr", prix: 190 } });
    expect(reponse.statusCode).toBe(201);
    expect(reponse.json()).toMatchObject({ objetId: "o-pile-zephyr", vendeurId: "zephyr", prix: 190, statut: "active" });
    expect(reponse.headers.location).toBe(`/annonces/${reponse.json().id}`);
  });

  it("valide le corps à la frontière : un prix négatif, nul ou décimal n'atteint pas le Domain (400)", async () => {
    const { app, enTantQue } = await applicationDeTest();
    for (const prix of [-500, 0, 1.5, "190"]) {
      const reponse = await app.inject({ method: "POST", url: "/annonces", headers: await enTantQue("zephyr"), payload: { objetId: "o-pile-zephyr", prix } });
      expect(reponse.statusCode, String(prix)).toBe(400);
      expect(reponse.json().erreurs.map((e: { champ: string }) => e.champ)).toEqual(["body/prix"]);
    }
  });

  it("laisse au Domain les règles du jeu : Objet d'un autre Joueur (403), déjà en vente (409), inconnu (404)", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const vendre = async (objetId: string) =>
      (await app.inject({ method: "POST", url: "/annonces", headers: await enTantQue("zephyr"), payload: { objetId, prix: 100 } })).statusCode;
    expect(await vendre("o-carte-kessa")).toBe(403);
    expect(await vendre("o-bobine-zephyr")).toBe(409);
    expect(await vendre("o-inconnu")).toBe(404);
  });
});

describe("POST /annonces/:annonceId/achat", () => {
  it("conclut la vente au nom du Joueur authentifié (201)", async () => {
    const { app, enTantQue, bourse } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/annonces/a-bobine-zephyr/achat", headers: await enTantQue("lyra") });
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

  it("refuse un second achat (409), un acheteur sans assez de Crédits (422), une Annonce inconnue (404)", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const acheter = async (annonceId: string, joueurId: string) =>
      (await app.inject({ method: "POST", url: `/annonces/${annonceId}/achat`, headers: await enTantQue(joueurId) })).statusCode;
    expect(await acheter("a-reacteur-rivet", "kessa")).toBe(422);
    expect(await acheter("a-bobine-zephyr", "lyra")).toBe(201);
    expect(await acheter("a-bobine-zephyr", "rivet")).toBe(409);
    expect(await acheter("a-inconnue", "rivet")).toBe(404);
  });
});

describe("Le cache HTTP de la liste des Annonces", () => {
  it("donne un ETag et Cache-Control ; renvoyer l'ETag donne 304 sans corps tant que la page ne change pas", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const premiere = await app.inject({ url: "/annonces" });
    expect(premiere.headers["cache-control"]).toBe("public, max-age=5");
    const etag = premiere.headers.etag as string;
    expect(etag).toMatch(/^"/);
    const inchangee = await app.inject({ url: "/annonces", headers: { "if-none-match": etag } });
    expect([inchangee.statusCode, inchangee.body]).toEqual([304, ""]);
    await app.inject({ method: "POST", url: "/annonces/a-boite-lyra/achat", headers: await enTantQue("kessa") });
    expect((await app.inject({ url: "/annonces", headers: { "if-none-match": etag } })).statusCode).toBe(200);
  });
});
