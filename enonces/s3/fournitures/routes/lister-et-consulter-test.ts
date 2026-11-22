import { beforeEach, describe, expect, it } from "vitest";
import { ConsulterUneAnnonce } from "../../src/application/consulter-une-annonce.ts";
import { AnnonceIntrouvable } from "../../src/application/erreurs.ts";
import { ListerLesAnnonces } from "../../src/application/lister-les-annonces.ts";
import { MettreEnVente } from "../../src/application/mettre-en-vente.ts";
import { DepotAnnoncesEnMemoire } from "../../src/infrastructure/memoire/depot-annonces-en-memoire.ts";

describe("Lister les Annonces, consulter une Annonce", () => {
  let annonces: DepotAnnoncesEnMemoire;

  beforeEach(async () => {
    annonces = new DepotAnnoncesEnMemoire();
    for (const [id, prix] of [["o1", 300], ["o2", 120], ["o3", 190]] as const) {
      await annonces.ajouterObjet({ id, nom: "Pile isotopique", proprietaireId: "kessa" });
      await new MettreEnVente({ annonces }).executer({ objetId: id, vendeurId: "kessa", prix });
    }
  });

  it("traduit une page (à partir de 1) en limite et décalage", async () => {
    const lister = new ListerLesAnnonces({ annonces });
    const page2 = await lister.executer({ page: 2, parPage: 2 });
    expect([page2.total, page2.annonces.map((a) => a.prix.montant)]).toEqual([3, [300]]);
    expect((await lister.executer({ page: 1, parPage: 20, prixMax: 190 })).total).toBe(2);
  });

  it("consulte une Annonce, et refuse une Annonce inconnue", async () => {
    const consulter = new ConsulterUneAnnonce({ annonces });
    const [premiere] = (await new ListerLesAnnonces({ annonces }).executer({ page: 1, parPage: 1 })).annonces;
    expect((await consulter.executer({ annonceId: premiere.id })).prix.montant).toBe(120);
    await expect(consulter.executer({ annonceId: "a404" })).rejects.toThrow(AnnonceIntrouvable);
  });
});
