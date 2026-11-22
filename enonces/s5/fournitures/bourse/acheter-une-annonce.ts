import type { AnnonceId, JoueurId } from "../domain/identifiants.ts";
import { TaxeDeBourse } from "../domain/taxe-de-bourse.ts";
import type { VenteConclue } from "../domain/vente-conclue.ts";
import { AnnonceIntrouvable } from "./erreurs.ts";
import type { DepotAnnonces } from "./ports/depot-annonces.ts";
import type { Horloge } from "./ports/horloge.ts";
import type { PorteMonnaie } from "./ports/porte-monnaie.ts";

// Use case « Acheter une Annonce » : charger, laisser le Domain décider, débiter, enregistrer, créditer.
export class AcheterUneAnnonce {
  readonly #annonces: DepotAnnonces;
  readonly #porteMonnaie: PorteMonnaie;
  readonly #horloge: Horloge;
  readonly #debutDuCycle: Date;

  constructor(ports: { annonces: DepotAnnonces; porteMonnaie: PorteMonnaie; horloge: Horloge; debutDuCycle: Date }) {
    this.#annonces = ports.annonces;
    this.#porteMonnaie = ports.porteMonnaie;
    this.#horloge = ports.horloge;
    this.#debutDuCycle = ports.debutDuCycle;
  }

  async executer(commande: { annonceId: AnnonceId; acheteurId: JoueurId }): Promise<VenteConclue> {
    const annonce = await this.#annonces.annonce(commande.annonceId);
    if (!annonce) {
      throw new AnnonceIntrouvable(commande.annonceId);
    }
    const maintenant = this.#horloge.maintenant();
    // Le Domain refuse ici un second achat, l'achat de sa propre Annonce, une Annonce retirée.
    const vente = annonce.acheter(commande.acheteurId, TaxeDeBourse.applicableLe(maintenant, this.#debutDuCycle), maintenant);

    await this.#porteMonnaie.debiter(vente.acheteurId, vente.prix);
    try {
      // Le verrou : si une autre requête a vendu l'Annonce entre-temps, l'adapter lève AnnonceDejaVendue.
      await this.#annonces.enregistrerVente(vente);
    } catch (erreur) {
      // On rend à l'acheteur ce qu'on vient de lui prendre. Ce n'est pas atomique : un arrêt du service entre
      // les deux appels perdrait ses Crédits. C'est une double écriture, comme celle de la base et du broker que
      // règle l'outbox ; elle se réglerait de même, débit, vente et crédit dans une seule transaction.
      await this.#porteMonnaie.crediter(vente.acheteurId, vente.prix);
      throw erreur;
    }
    await this.#porteMonnaie.crediter(vente.vendeurId, vente.netVendeur);
    return vente;
  }
}
