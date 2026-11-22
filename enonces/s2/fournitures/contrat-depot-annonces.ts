import { describe, expect, it } from "vitest";
import type { DepotAnnonces } from "../../src/application/ports/depot-annonces.ts";
import { Credits } from "../../src/domain/credits.ts";
import { AnnonceDejaVendue, ObjetDejaEnVente } from "../../src/domain/erreurs.ts";
import { TaxeDeBourse } from "../../src/domain/taxe-de-bourse.ts";

export type DepotAnnoncesDeTest = DepotAnnonces & {
  ajouterObjet(objet: { id: string; nom: string; proprietaireId: string }): Promise<void>;
};

// La suite de tests de contrat du port DepotAnnonces : ce que tout adapter doit garantir.
// Elle est jouée telle quelle sur l'adapter en mémoire et sur l'adapter PostgreSQL.
// `nouveauDepot` rend un dépôt vide, avec un Objet o2 (Pile isotopique) à kessa.
export function testsDeContratDuDepotAnnonces(nom: string, nouveauDepot: () => Promise<DepotAnnoncesDeTest>) {
  const publier = async (depot: DepotAnnoncesDeTest, prix = 190) => {
    const objet = await depot.objet("o2");
    const annonce = objet!.mettreEnVente({ annonceId: depot.nouvelIdentifiant(), vendeurId: "kessa", prix: Credits.de(prix) });
    await depot.enregistrerMiseEnVente(annonce);
    return annonce;
  };

  describe(`Contrat du dépôt d'Annonces : ${nom}`, () => {
    it("rend un Objet sans Annonce active, et undefined pour un Objet ou une Annonce inconnus", async () => {
      const depot = await nouveauDepot();
      const objet = await depot.objet("o2");
      expect([objet?.nom, objet?.proprietaireId, objet?.annonceActive]).toEqual(["Pile isotopique", "kessa", null]);
      expect(await depot.objet("o404")).toBeUndefined();
      expect(await depot.annonce("a404")).toBeUndefined();
    });

    it("donne des identifiants tous différents", async () => {
      const depot = await nouveauDepot();
      expect(new Set([depot.nouvelIdentifiant(), depot.nouvelIdentifiant(), depot.nouvelIdentifiant()]).size).toBe(3);
    });

    it("relit une Annonce enregistrée, et l'Objet sait qu'il est en vente", async () => {
      const depot = await nouveauDepot();
      const annonce = await publier(depot);
      const relue = await depot.annonce(annonce.id);
      expect([relue?.objetId, relue?.vendeurId, relue?.prix.montant, relue?.statut]).toEqual(["o2", "kessa", 190, "active"]);
      expect((await depot.objet("o2"))?.annonceActive).toBe(annonce.id);
    });

    it("refuse une seconde Annonce active pour le même Objet, même publiée par deux copies simultanées", async () => {
      const depot = await nouveauDepot();
      const [copie1, copie2] = [await depot.objet("o2"), await depot.objet("o2")];
      const a1 = copie1!.mettreEnVente({ annonceId: depot.nouvelIdentifiant(), vendeurId: "kessa", prix: Credits.de(190) });
      const a2 = copie2!.mettreEnVente({ annonceId: depot.nouvelIdentifiant(), vendeurId: "kessa", prix: Credits.de(250) });
      const resultats = await Promise.allSettled([depot.enregistrerMiseEnVente(a1), depot.enregistrerMiseEnVente(a2)]);
      expect(resultats.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(resultats.find((r) => r.status === "rejected")?.reason).toBeInstanceOf(ObjetDejaEnVente);
    });

    it("enregistre une Vente conclue : Annonce vendue, Objet cédé à l'acheteur, plus d'Annonce active", async () => {
      const depot = await nouveauDepot();
      const annonce = await publier(depot);
      await depot.enregistrerVente(annonce.acheter("zephyr", TaxeDeBourse.standard(), new Date()));
      expect((await depot.annonce(annonce.id))?.statut).toBe("vendue");
      const objet = await depot.objet("o2");
      expect([objet?.proprietaireId, objet?.annonceActive]).toEqual(["zephyr", null]);
    });

    it("la Dupe : deux copies de la même Annonce achetées au même instant, une seule vente est enregistrée", async () => {
      const depot = await nouveauDepot();
      const annonce = await publier(depot);
      // Chaque requête charge sa copie : le Domain les laisse passer toutes les deux, le dépôt doit trancher.
      const [copie1, copie2] = [await depot.annonce(annonce.id), await depot.annonce(annonce.id)];
      const ventes = [
        copie1!.acheter("zephyr", TaxeDeBourse.standard(), new Date()),
        copie2!.acheter("lyra", TaxeDeBourse.standard(), new Date()),
      ];
      const resultats = await Promise.allSettled(ventes.map((v) => depot.enregistrerVente(v)));
      expect(resultats.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(resultats.find((r) => r.status === "rejected")?.reason).toBeInstanceOf(AnnonceDejaVendue);
      const proprietaire = (await depot.objet("o2"))?.proprietaireId;
      const gagnant = ventes[resultats.findIndex((r) => r.status === "fulfilled")].acheteurId;
      expect(proprietaire).toBe(gagnant);
    });

    it("refuse de vendre une Annonce déjà vendue, même plus tard", async () => {
      const depot = await nouveauDepot();
      const annonce = await publier(depot);
      const copie = await depot.annonce(annonce.id);
      await depot.enregistrerVente(annonce.acheter("zephyr", TaxeDeBourse.standard(), new Date()));
      await expect(depot.enregistrerVente(copie!.acheter("lyra", TaxeDeBourse.standard(), new Date()))).rejects.toThrow(AnnonceDejaVendue);
    });
  });
}
