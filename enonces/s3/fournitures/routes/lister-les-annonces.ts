import type { Annonce } from "../domain/annonce.ts";
import type { DepotAnnonces } from "./ports/depot-annonces.ts";

// Use case « Lister les Annonces » : la vitrine de la Bourse aux épaves, page par page.
// La page se compte à partir de 1 ; le dépôt, lui, parle en limite et décalage.
export class ListerLesAnnonces {
  readonly #annonces: DepotAnnonces;

  constructor(ports: { annonces: DepotAnnonces }) {
    this.#annonces = ports.annonces;
  }

  async executer(requete: { prixMax?: number; page: number; parPage: number }): Promise<{ annonces: Annonce[]; total: number }> {
    return this.#annonces.annoncesActives({
      prixMax: requete.prixMax,
      limite: requete.parPage,
      decalage: (requete.page - 1) * requete.parPage,
    });
  }
}
