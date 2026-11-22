import type { ObjetId } from "../domain/identifiants.ts";
import type { Objet } from "../domain/objet.ts";
import { ObjetIntrouvable } from "./erreurs.ts";
import type { DepotObjets } from "./ports/depot-objets.ts";

// Use case « Consulter un Objet » : qui le possède, selon l'Inventaire.
export class ConsulterUnObjet {
  readonly #objets: DepotObjets;

  constructor(ports: { objets: DepotObjets }) {
    this.#objets = ports.objets;
  }

  async executer(commande: { objetId: ObjetId }): Promise<Objet> {
    const objet = await this.#objets.objet(commande.objetId);
    if (!objet) {
      throw new ObjetIntrouvable(commande.objetId);
    }
    return objet;
  }
}
