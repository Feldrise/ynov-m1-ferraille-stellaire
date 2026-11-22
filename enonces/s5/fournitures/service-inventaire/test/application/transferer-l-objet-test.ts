import { beforeEach, describe, expect, it } from "vitest";
import { ObjetIntrouvable } from "../../src/application/erreurs.ts";
import { TransfererLObjet } from "../../src/application/transferer-l-objet.ts";
import { DepotObjetsEnMemoire } from "../../src/infrastructure/memoire/depot-objets-en-memoire.ts";

// Une Vente conclue, telle que le Service Bourse la publie.
const vente = (annonceId: string, vendeurId: string, acheteurId: string) => ({ annonceId, objetId: "o-reacteur", vendeurId, acheteurId, concluLe: new Date() });

describe("Transférer l'Objet", () => {
  let objets: DepotObjetsEnMemoire;
  let transferer: TransfererLObjet;
  const proprietaire = async () => (await objets.objet("o-reacteur"))?.proprietaireId;

  beforeEach(async () => {
    objets = new DepotObjetsEnMemoire();
    await objets.ajouterObjet({ id: "o-reacteur", nom: "Réacteur compact", proprietaireId: "rivet" });
    transferer = new TransfererLObjet({ objets });
  });

  it("une Vente conclue fait passer l'Objet à l'acheteur", async () => {
    expect(await transferer.executer(vente("a-1", "rivet", "lyra"))).toBe("transfere");
    expect(await proprietaire()).toBe("lyra");
  });

  it("la même Vente conclue livrée deux fois ne s'applique qu'une fois", async () => {
    await transferer.executer(vente("a-1", "rivet", "lyra"));
    expect(await transferer.executer(vente("a-1", "rivet", "lyra"))).toBe("deja-traitee");
    expect(await proprietaire()).toBe("lyra");
  });

  // La Dupe de la Séance 5 : rivet vend à lyra, lyra revend à zephyr, puis le broker relivre la première Vente
  // conclue (au moins une fois). Sans clé de déduplication, le Réacteur revient chez lyra dans l'Inventaire,
  // alors que la Bourse le donne à zephyr : il est possédé deux fois.
  it("la Dupe : une Vente conclue relivrée après une revente ne rend pas l'Objet à l'ancien acheteur", async () => {
    await transferer.executer(vente("a-1", "rivet", "lyra"));
    await transferer.executer(vente("a-2", "lyra", "zephyr"));
    expect(await transferer.executer(vente("a-1", "rivet", "lyra"))).toBe("deja-traitee");
    expect(await proprietaire()).toBe("zephyr");
  });

  it("deux livraisons simultanées de la même Vente conclue : un seul transfert", async () => {
    const resultats = await Promise.all([transferer.executer(vente("a-1", "rivet", "lyra")), transferer.executer(vente("a-1", "rivet", "lyra"))]);
    expect(resultats.sort()).toEqual(["deja-traitee", "transfere"]);
  });

  it("un Objet inconnu de l'Inventaire : erreur, la clé n'est pas enregistrée", async () => {
    await expect(transferer.executer({ ...vente("a-9", "rivet", "lyra"), objetId: "o-inconnu" })).rejects.toThrow(ObjetIntrouvable);
    expect(await objets.dejaTraitee("a-9")).toBe(false);
  });
});
