import type { DepotAnnonces } from "../../application/ports/depot-annonces.ts";
import { Annonce, type StatutAnnonce } from "../../domain/annonce.ts";
import { Credits } from "../../domain/credits.ts";
import { AnnonceDejaVendue, ObjetDejaEnVente } from "../../domain/erreurs.ts";
import type { AnnonceId, JoueurId, ObjetId } from "../../domain/identifiants.ts";
import { Objet } from "../../domain/objet.ts";
import type { VenteConclue } from "../../domain/vente-conclue.ts";

type LigneObjet = { id: ObjetId; nom: string; proprietaireId: JoueurId };
type LigneAnnonce = { id: AnnonceId; objetId: ObjetId; vendeurId: JoueurId; prix: number; statut: StatutAnnonce };

// Adapter en mémoire du dépôt d'Annonces : des tableaux, pour les tests des use cases.
// Il garde des copies, comme une base : deux lectures rendent deux Annonces distinctes, et c'est
// lui qui refuse la seconde écriture, exactement comme l'adapter PostgreSQL.
export class DepotAnnoncesEnMemoire implements DepotAnnonces {
  readonly #objets = new Map<ObjetId, LigneObjet>();
  readonly #annonces = new Map<AnnonceId, LigneAnnonce>();
  readonly #ventes: VenteConclue[] = [];
  #compteur = 0; // pour nouvelIdentifiant

  // Hors du port : l'Objet arrive dans la Bourse par une Expédition, que ce dépôt ne connaît pas.
  async ajouterObjet(objet: { id: ObjetId; nom: string; proprietaireId: JoueurId }): Promise<void> {
    this.#objets.set(objet.id, { ...objet });
  }

  // À toi : un identifiant différent à chaque appel (« annonce-1 », « annonce-2 »...).
  nouvelIdentifiant(): AnnonceId {
    throw new Error("nouvelIdentifiant : à écrire");
  }

  async objet(id: ObjetId): Promise<Objet | undefined> {
    const ligne = this.#objets.get(id);
    if (!ligne) return undefined;
    const active = [...this.#annonces.values()].find((a) => a.objetId === id && a.statut === "active");
    return new Objet({ ...ligne, annonceActive: active?.id ?? null });
  }

  async annonce(id: AnnonceId): Promise<Annonce | undefined> {
    const ligne = this.#annonces.get(id);
    return ligne && Annonce.reconstituer({ ...ligne, prix: Credits.de(ligne.prix) });
  }

  // À toi : refuser une seconde Annonce active pour le même Objet (ObjetDejaEnVente), puis garder une ligne.
  async enregistrerMiseEnVente(annonce: Annonce): Promise<void> {
    throw new Error("enregistrerMiseEnVente : à écrire");
  }

  // À toi : refuser si l'Annonce enregistrée n'est plus active (AnnonceDejaVendue), la marquer vendue,
  // céder l'Objet à l'acheteur, garder la Vente conclue dans #ventes.
  async enregistrerVente(vente: VenteConclue): Promise<void> {
    throw new Error("enregistrerVente : à écrire");
  }

  // Hors du port, pour les tests : les Ventes conclues enregistrées.
  ventes(): readonly VenteConclue[] {
    return [...this.#ventes];
  }
}
