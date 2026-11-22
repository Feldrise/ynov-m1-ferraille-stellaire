import { beforeEach, describe, expect, it } from "vitest";
import { AcheterUneAnnonce } from "../../src/application/acheter-une-annonce.ts";
import { MettreEnVente } from "../../src/application/mettre-en-vente.ts";
import { AnnonceDejaVendue, CreditsInsuffisants } from "../../src/domain/erreurs.ts";
import { DepotAnnoncesEnMemoire } from "../../src/infrastructure/memoire/depot-annonces-en-memoire.ts";
import { PorteMonnaieEnMemoire } from "../../src/infrastructure/memoire/porte-monnaie-en-memoire.ts";

const DEBUT_DU_CYCLE = new Date("2026-12-04T18:00:00Z"); // un vendredi
const MARDI = new Date("2026-12-15T10:00:00Z"); // Taxe de Bourse standard, 5 %

describe("Acheter une Annonce", () => {
  let annonces: DepotAnnoncesEnMemoire;
  let porteMonnaie: PorteMonnaieEnMemoire;
  let annonceId: string;
  const acheter = (acheteurId: string, maintenant = MARDI) =>
    new AcheterUneAnnonce({ annonces, porteMonnaie, horloge: { maintenant: () => maintenant }, debutDuCycle: DEBUT_DU_CYCLE }).executer({
      annonceId,
      acheteurId,
    });

  beforeEach(async () => {
    annonces = new DepotAnnoncesEnMemoire();
    porteMonnaie = new PorteMonnaieEnMemoire({ kessa: 100, zephyr: 500, lyra: 500 });
    await annonces.ajouterObjet({ id: "o2", nom: "Pile isotopique", proprietaireId: "kessa" });
    annonceId = (await new MettreEnVente({ annonces }).executer({ objetId: "o2", vendeurId: "kessa", prix: 190 })).id;
  });

  it("conclut la vente : l'acheteur paie le prix, le vendeur touche le prix moins la Taxe de Bourse, l'Objet change de main", async () => {
    const vente = await acheter("zephyr");
    expect([vente.prix.montant, vente.taxe.montant, vente.netVendeur.montant]).toEqual([190, 9, 181]);
    expect((await porteMonnaie.solde("zephyr")).montant).toBe(310);
    expect((await porteMonnaie.solde("kessa")).montant).toBe(281);
    expect((await annonces.objet("o2"))?.proprietaireId).toBe("zephyr");
    expect(annonces.ventes()).toHaveLength(1);
  });

  // À toi : le second acheteur reçoit AnnonceDejaVendue, garde ses Crédits, et une seule vente est enregistrée.
  it.todo("refuse un second achat du même Objet, et le second acheteur garde ses Crédits");

  // À toi : un acheteur sans assez de Crédits (rivet n'en a aucun) reçoit CreditsInsuffisants, et rien n'est vendu.
  it.todo("refuse un acheteur sans assez de Crédits, et rien n'est vendu");
});
