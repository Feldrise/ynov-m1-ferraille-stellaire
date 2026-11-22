import { ConsulterUnObjet } from "../application/consulter-un-objet.ts";
import type { DepotObjets } from "../application/ports/depot-objets.ts";
import { TransfererLObjet } from "../application/transferer-l-objet.ts";
import { DepotObjetsEnMemoire } from "./memoire/depot-objets-en-memoire.ts";
import { creerBase, installerSchema } from "./postgres/connexion.ts";
import { DepotObjetsPostgres } from "./postgres/depot-objets-postgres.ts";

// La racine de composition du Service Inventaire : le seul endroit qui connaît les use cases et les adapters.

// Ce que le Service Inventaire sait faire. Ses deux adapters entrants, la messagerie et HTTP, ne connaissent que ce type.
export type ServiceInventaire = {
  transfererLObjet: TransfererLObjet;
  consulterUnObjet: ConsulterUnObjet;
};

export function composer(adapters: { objets: DepotObjets }): ServiceInventaire {
  return { transfererLObjet: new TransfererLObjet(adapters), consulterUnObjet: new ConsulterUnObjet(adapters) };
}

export function composerEnMemoire() {
  const objets = new DepotObjetsEnMemoire();
  return { ...composer({ objets }), objets };
}

export async function composerAvecPostgres(url: string, schema = "inventaire") {
  await installerSchema(url, schema);
  const db = creerBase(url, schema);
  const objets = new DepotObjetsPostgres(db);
  return { ...composer({ objets }), objets, db, fermer: () => db.destroy() };
}
