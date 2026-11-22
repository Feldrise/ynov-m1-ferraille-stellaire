import { describe, expect, it } from "vitest";
import { VenteDejaTraitee } from "../../src/application/erreurs.ts";
import type { DepotObjets } from "../../src/application/ports/depot-objets.ts";

// La suite de tests de contrat du port DepotObjets, jouée sur chaque adapter. fabriquer() rend un dépôt neuf,
// qui contient l'Objet o-boite chez lyra.
export function contratDepotObjets(nom: string, fabriquer: () => Promise<DepotObjets>) {
  describe(`contrat DepotObjets : ${nom}`, () => {
    it("rend un Objet avec son propriétaire, rien pour un Objet inconnu", async () => {
      const depot = await fabriquer();
      expect((await depot.objet("o-boite"))?.proprietaireId).toBe("lyra");
      expect(await depot.objet("o-inconnu")).toBeUndefined();
    });

    it("enregistre la cession et la clé ensemble", async () => {
      const depot = await fabriquer();
      const objet = (await depot.objet("o-boite"))!;
      objet.ceder({ annonceId: "a-1", objetId: "o-boite", vendeurId: "lyra", acheteurId: "kessa", concluLe: new Date() });
      expect(await depot.dejaTraitee("a-1")).toBe(false);
      await depot.enregistrerCession(objet, "a-1");
      expect(await depot.dejaTraitee("a-1")).toBe(true);
      expect((await depot.objet("o-boite"))?.proprietaireId).toBe("kessa");
    });

    it("refuse une clé déjà enregistrée, sans rien changer", async () => {
      const depot = await fabriquer();
      const objet = (await depot.objet("o-boite"))!;
      objet.ceder({ annonceId: "a-1", objetId: "o-boite", vendeurId: "lyra", acheteurId: "kessa", concluLe: new Date() });
      await depot.enregistrerCession(objet, "a-1");
      objet.ceder({ annonceId: "a-1", objetId: "o-boite", vendeurId: "kessa", acheteurId: "rivet", concluLe: new Date() });
      await expect(depot.enregistrerCession(objet, "a-1")).rejects.toThrow(VenteDejaTraitee);
      expect((await depot.objet("o-boite"))?.proprietaireId).toBe("kessa");
    });

    it("deux enregistrements simultanés de la même clé : un seul passe", async () => {
      const depot = await fabriquer();
      const [a, b] = [(await depot.objet("o-boite"))!, (await depot.objet("o-boite"))!];
      a.ceder({ annonceId: "a-1", objetId: "o-boite", vendeurId: "lyra", acheteurId: "kessa", concluLe: new Date() });
      b.ceder({ annonceId: "a-1", objetId: "o-boite", vendeurId: "lyra", acheteurId: "kessa", concluLe: new Date() });
      const resultats = await Promise.allSettled([depot.enregistrerCession(a, "a-1"), depot.enregistrerCession(b, "a-1")]);
      expect(resultats.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(resultats.find((r) => r.status === "rejected")).toMatchObject({ reason: expect.any(VenteDejaTraitee) });
    });
  });
}
