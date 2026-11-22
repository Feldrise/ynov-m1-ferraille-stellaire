import { afterAll } from "vitest";
import { DepotAnnoncesEnMemoire } from "../../src/infrastructure/memoire/depot-annonces-en-memoire.ts";
import { DepotAnnoncesPostgres } from "../../src/infrastructure/postgres/depot-annonces-postgres.ts";
import { baseDeTest } from "./base-de-test.ts";
import { testsDeContratDuDepotAnnonces } from "./contrat-depot-annonces.ts";

const PILE_ISOTOPIQUE = { id: "o2", nom: "Pile isotopique", proprietaireId: "kessa" };

testsDeContratDuDepotAnnonces("en mémoire", async () => {
  const depot = new DepotAnnoncesEnMemoire();
  await depot.ajouterObjet(PILE_ISOTOPIQUE);
  return depot;
});

const base = await baseDeTest();
afterAll(base.fermer);

testsDeContratDuDepotAnnonces("PostgreSQL", async () => {
  await base.db.deleteFrom("vente").execute();
  await base.db.deleteFrom("annonce").execute();
  await base.db.deleteFrom("objet").execute();
  const depot = new DepotAnnoncesPostgres(base.db);
  await depot.ajouterObjet(PILE_ISOTOPIQUE);
  return depot;
});
