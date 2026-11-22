import { VenteDUnAutreObjet } from "./erreurs.ts";
import type { JoueurId, ObjetId } from "./identifiants.ts";
import type { VenteConclue } from "./vente-conclue.ts";

// Entité : un Objet, tel que l'Inventaire le tient. Un Objet est un exemplaire unique : il appartient à un seul
// Joueur à la fois.
export class Objet {
  readonly id: ObjetId;
  readonly nom: string;
  #proprietaireId: JoueurId;

  constructor(props: { id: ObjetId; nom: string; proprietaireId: JoueurId }) {
    this.id = props.id;
    this.nom = props.nom;
    this.#proprietaireId = props.proprietaireId;
  }

  get proprietaireId(): JoueurId {
    return this.#proprietaireId;
  }

  // Après une Vente conclue, l'Objet passe à l'acheteur. Le Service Bourse a vérifié, avant de conclure, que le
  // vendeur le possédait : l'Inventaire lui fait confiance.
  ceder(vente: VenteConclue): void {
    if (vente.objetId !== this.id) {
      throw new VenteDUnAutreObjet(this.id, vente.objetId);
    }
    this.#proprietaireId = vente.acheteurId;
  }
}
