import { beforeEach, describe, expect, it } from "vitest";
import { ObjetIntrouvable } from "../../src/application/erreurs.ts";
import { MettreEnVente } from "../../src/application/mettre-en-vente.ts";
import { MontantDeCreditsInvalide, ObjetDejaEnVente, ObjetDUnAutreJoueur, PrixInvalide } from "../../src/domain/erreurs.ts";
import { DepotAnnoncesEnMemoire } from "../../src/infrastructure/memoire/depot-annonces-en-memoire.ts";

// Aucun import de pg, de Kysely ni de Fastify : le use case se teste avec l'adapter en mémoire.
describe("Mettre en vente", () => {
  let annonces: DepotAnnoncesEnMemoire;
  let mettreEnVente: MettreEnVente;

  beforeEach(async () => {
    annonces = new DepotAnnoncesEnMemoire();
    await annonces.ajouterObjet({ id: "o2", nom: "Pile isotopique", proprietaireId: "kessa" });
    mettreEnVente = new MettreEnVente({ annonces });
  });

  it("publie une Annonce active et l'enregistre", async () => {
    const annonce = await mettreEnVente.executer({ objetId: "o2", vendeurId: "kessa", prix: 300 });
    expect(annonce.statut).toBe("active");
    expect((await annonces.annonce(annonce.id))?.prix.montant).toBe(300);
    expect((await annonces.objet("o2"))?.annonceActive).toBe(annonce.id);
  });

  it("refuse un Objet inconnu de la Bourse", async () => {
    await expect(mettreEnVente.executer({ objetId: "o404", vendeurId: "kessa", prix: 300 })).rejects.toThrow(ObjetIntrouvable);
  });

  it("laisse le Domain refuser : autre Joueur, prix nul ou négatif, seconde Annonce active", async () => {
    await expect(mettreEnVente.executer({ objetId: "o2", vendeurId: "zephyr", prix: 300 })).rejects.toThrow(ObjetDUnAutreJoueur);
    await expect(mettreEnVente.executer({ objetId: "o2", vendeurId: "kessa", prix: 0 })).rejects.toThrow(PrixInvalide);
    await expect(mettreEnVente.executer({ objetId: "o2", vendeurId: "kessa", prix: -500 })).rejects.toThrow(MontantDeCreditsInvalide);
    await mettreEnVente.executer({ objetId: "o2", vendeurId: "kessa", prix: 300 });
    await expect(mettreEnVente.executer({ objetId: "o2", vendeurId: "kessa", prix: 250 })).rejects.toThrow(ObjetDejaEnVente);
  });
});
