import { expect, it } from "vitest";
import { composerEnMemoire } from "../../../src/infrastructure/composition.ts";
import { construireApplication } from "../../../src/infrastructure/http/application.ts";

it("GET /objets/:objetId rend l'Objet et son propriétaire ; un Objet inconnu, 404 en Problem Details", async () => {
  const inventaire = composerEnMemoire();
  await inventaire.objets.ajouterObjet({ id: "o-boite", nom: "Boîte noire", proprietaireId: "lyra" });
  const app = await construireApplication(inventaire);
  const trouve = await app.inject({ url: "/objets/o-boite" });
  expect(trouve.statusCode).toBe(200);
  expect(trouve.json()).toEqual({ id: "o-boite", nom: "Boîte noire", proprietaireId: "lyra" });
  const inconnu = await app.inject({ url: "/objets/o-inconnu" });
  expect(inconnu.statusCode).toBe(404);
  expect(inconnu.headers["content-type"]).toContain("application/problem+json");
  expect(inconnu.json()).toMatchObject({ status: 404, title: "Objet introuvable" });
});
