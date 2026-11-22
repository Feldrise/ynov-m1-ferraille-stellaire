import { VenteDejaTraitee } from "../../application/erreurs.ts";
import type { DepotObjets } from "../../application/ports/depot-objets.ts";
import type { JoueurId, ObjetId } from "../../domain/identifiants.ts";
import { Objet } from "../../domain/objet.ts";

type LigneObjet = { id: ObjetId; nom: string; proprietaireId: JoueurId };

// Adapter en mémoire du dépôt d'Objets, pour les tests des use cases. Il garde des copies, comme une base, et
// refuse une clé de déduplication déjà vue, comme l'adapter PostgreSQL.
export class DepotObjetsEnMemoire implements DepotObjets {
  readonly #objets = new Map<ObjetId, LigneObjet>();
  readonly #cles = new Set<string>();

  // Hors du port : l'Objet arrive dans l'Inventaire par une Expédition, que ce dépôt ne connaît pas.
  async ajouterObjet(objet: LigneObjet): Promise<void> {
    this.#objets.set(objet.id, { ...objet });
  }

  async objet(id: ObjetId): Promise<Objet | undefined> {
    const ligne = this.#objets.get(id);
    return ligne && new Objet(ligne);
  }

  async dejaTraitee(cle: string): Promise<boolean> {
    return this.#cles.has(cle);
  }

  async enregistrerCession(objet: Objet, cle: string): Promise<void> {
    if (this.#cles.has(cle)) {
      throw new VenteDejaTraitee(cle);
    }
    this.#cles.add(cle);
    this.#objets.set(objet.id, { id: objet.id, nom: objet.nom, proprietaireId: objet.proprietaireId });
  }
}
