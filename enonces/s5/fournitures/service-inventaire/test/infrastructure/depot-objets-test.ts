import { afterAll } from "vitest";
import { DepotObjetsEnMemoire } from "../../src/infrastructure/memoire/depot-objets-en-memoire.ts";
import { DepotObjetsPostgres } from "../../src/infrastructure/postgres/depot-objets-postgres.ts";
import { baseDeTest } from "./base-d-essai.ts";
import { contratDepotObjets } from "./contrat-depot-objets.ts";

// La même suite de contrat, sur les deux adapters du port DepotObjets.
const bases: Array<Awaited<ReturnType<typeof baseDeTest>>> = [];
afterAll(() => Promise.all(bases.map((b) => b.fermer())));

contratDepotObjets("en mémoire", async () => {
  const depot = new DepotObjetsEnMemoire();
  await depot.ajouterObjet({ id: "o-boite", nom: "Boîte noire", proprietaireId: "lyra" });
  return depot;
});

contratDepotObjets("PostgreSQL", async () => {
  const base = await baseDeTest();
  bases.push(base);
  const depot = new DepotObjetsPostgres(base.db);
  await depot.ajouterObjet({ id: "o-boite", nom: "Boîte noire", proprietaireId: "lyra" });
  return depot;
});
