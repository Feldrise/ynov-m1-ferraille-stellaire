import { describe, expect, it } from "vitest";
import { Credits } from "../../src/domain/credits.ts";
import { CacheEnMemoire } from "../../src/infrastructure/cache/cache.ts";
import { DepotAnnoncesAvecCache } from "../../src/infrastructure/cache/depot-annonces-avec-cache.ts";
import { DepotAnnoncesEnMemoire } from "../../src/infrastructure/memoire/depot-annonces-en-memoire.ts";
import { testsDeContratDuDepotAnnonces } from "./contrat-depot-annonces.ts";

const PILE_ISOTOPIQUE = { id: "o2", nom: "Pile isotopique", proprietaireId: "kessa" };

// Le dépôt avec cache tient le contrat du port DepotAnnonces, comme les deux autres : une liste servie par le
// cache après une vente, ou sans l'Annonce qu'on vient de publier, ferait échouer ces tests.
testsDeContratDuDepotAnnonces("avec cache", async () => {
  const source = new DepotAnnoncesEnMemoire();
  await source.ajouterObjet(PILE_ISOTOPIQUE);
  return Object.assign(new DepotAnnoncesAvecCache(source, new CacheEnMemoire()), { ajouterObjet: (o: typeof PILE_ISOTOPIQUE) => source.ajouterObjet(o) });
});

describe("Le cache de la liste des Annonces (cache-aside)", () => {
  async function depotCompte() {
    const source = new DepotAnnoncesEnMemoire();
    await source.ajouterObjet(PILE_ISOTOPIQUE);
    await source.ajouterObjet({ id: "o3", nom: "Boîte noire", proprietaireId: "lyra" });
    let lectures = 0;
    const lire = source.annoncesActives.bind(source);
    source.annoncesActives = (criteres) => {
      lectures += 1;
      return lire(criteres);
    };
    const depot = new DepotAnnoncesAvecCache(source, new CacheEnMemoire());
    const publier = async (objetId: string, vendeurId: string, prix: number) =>
      depot.enregistrerMiseEnVente((await depot.objet(objetId))!.mettreEnVente({ annonceId: depot.nouvelIdentifiant(), vendeurId, prix: Credits.de(prix) }));
    return { depot, publier, lectures: () => lectures };
  }
  const criteres = { limite: 20, decalage: 0 };

  it("la seconde lecture de la même page vient du cache, une autre page va à la source", async () => {
    const { depot, publier, lectures } = await depotCompte();
    await publier("o2", "kessa", 190);
    const premiere = await depot.annoncesActives(criteres);
    const seconde = await depot.annoncesActives(criteres);
    expect(lectures()).toBe(1);
    expect(seconde.annonces.map((a) => [a.id, a.prix.montant, a.statut])).toEqual(premiere.annonces.map((a) => [a.id, a.prix.montant, a.statut]));
    await depot.annoncesActives({ ...criteres, prixMax: 100 });
    expect(lectures()).toBe(2);
  });

  it("une mise en vente invalide les pages gardées : la lecture suivante va à la source", async () => {
    const { depot, publier, lectures } = await depotCompte();
    await publier("o2", "kessa", 190);
    await depot.annoncesActives(criteres);
    await publier("o3", "lyra", 90);
    expect((await depot.annoncesActives(criteres)).total).toBe(2);
    expect(lectures()).toBe(2);
  });
});
