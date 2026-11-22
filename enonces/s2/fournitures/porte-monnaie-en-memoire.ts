import type { PorteMonnaie } from "../../application/ports/porte-monnaie.ts";
import { Credits } from "../../domain/credits.ts";
import { CreditsInsuffisants } from "../../domain/erreurs.ts";
import type { JoueurId } from "../../domain/identifiants.ts";

// Adapter en mémoire du Porte-monnaie : un dictionnaire Joueur -> Crédits.
export class PorteMonnaieEnMemoire implements PorteMonnaie {
  readonly #soldes = new Map<JoueurId, Credits>();

  constructor(soldesDeDepart: Record<JoueurId, number> = {}) {
    for (const [joueurId, montant] of Object.entries(soldesDeDepart)) {
      this.#soldes.set(joueurId, Credits.de(montant));
    }
  }

  async solde(joueurId: JoueurId): Promise<Credits> {
    return this.#soldes.get(joueurId) ?? Credits.zero();
  }

  // Sans await entre la lecture et l'écriture : deux débits simultanés ne lisent pas le même solde.
  async debiter(joueurId: JoueurId, montant: Credits): Promise<void> {
    const solde = this.#soldes.get(joueurId) ?? Credits.zero();
    if (solde.montant < montant.montant) {
      throw new CreditsInsuffisants(joueurId, montant.montant - solde.montant);
    }
    this.#soldes.set(joueurId, solde.moins(montant));
  }

  async crediter(joueurId: JoueurId, montant: Credits): Promise<void> {
    this.#soldes.set(joueurId, (this.#soldes.get(joueurId) ?? Credits.zero()).plus(montant));
  }
}
