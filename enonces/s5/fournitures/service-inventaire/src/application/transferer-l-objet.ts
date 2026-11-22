import type { VenteConclue } from "../domain/vente-conclue.ts";
import { ObjetIntrouvable, VenteDejaTraitee } from "./erreurs.ts";
import type { DepotObjets } from "./ports/depot-objets.ts";

export type Resultat = "transfere" | "deja-traitee";

// Use case « Transférer l'Objet » : une Vente conclue arrive, l'Objet passe à l'acheteur. Idempotent : le broker
// livre au moins une fois, et une Vente conclue livrée deux fois ne s'applique qu'une fois.
export class TransfererLObjet {
  readonly #objets: DepotObjets;

  constructor(ports: { objets: DepotObjets }) {
    this.#objets = ports.objets;
  }

  // À écrire (étape 2) :
  //   1. la clé de déduplication est l'Annonce (vente.annonceId) ; si le dépôt dit qu'elle est déjà traitée,
  //      rendre "deja-traitee" sans rien changer ;
  //   2. sinon, charger l'Objet (ObjetIntrouvable s'il n'existe pas), le céder (objet.ceder(vente)), et enregistrer
  //      la cession avec la clé ;
  //   3. si l'enregistrement lève VenteDejaTraitee, une autre livraison du même message est passée entre-temps :
  //      rendre "deja-traitee" ; toute autre erreur remonte. Sinon, rendre "transfere".
  async executer(vente: VenteConclue): Promise<Resultat> {
    throw new Error("Transférer l'Objet : pas encore écrit");
  }
}
