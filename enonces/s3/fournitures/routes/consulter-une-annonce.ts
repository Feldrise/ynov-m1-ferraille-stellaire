import type { Annonce } from "../domain/annonce.ts";
import type { AnnonceId } from "../domain/identifiants.ts";
import { AnnonceIntrouvable } from "./erreurs.ts";
import type { DepotAnnonces } from "./ports/depot-annonces.ts";

// Use case « Consulter une Annonce », quel que soit son statut : une Annonce vendue ou retirée n'est jamais effacée.
export class ConsulterUneAnnonce {
  readonly #annonces: DepotAnnonces;

  constructor(ports: { annonces: DepotAnnonces }) {
    this.#annonces = ports.annonces;
  }

  async executer(requete: { annonceId: AnnonceId }): Promise<Annonce> {
    const annonce = await this.#annonces.annonce(requete.annonceId);
    if (!annonce) {
      throw new AnnonceIntrouvable(requete.annonceId);
    }
    return annonce;
  }
}
