import type { Annonce } from "../../domain/annonce.ts";
import type { AnnonceId, ObjetId } from "../../domain/identifiants.ts";
import type { Objet } from "../../domain/objet.ts";
import type { VenteConclue } from "../../domain/vente-conclue.ts";

// Ce que demande la liste des Annonces : un prix plafond facultatif, et une page (limite, décalage).
export type CriteresDesAnnonces = { prixMax?: number; limite: number; decalage: number };

// Une page d'Annonces, et le nombre total d'Annonces qui répondent aux critères.
export type PageDAnnonces = { annonces: Annonce[]; total: number };

// Port sortant : ce dont les use cases de la Bourse aux épaves ont besoin pour retrouver et enregistrer
// les Annonces. Il parle le langage du Domain ; aucun type de base de données n'y apparaît.
// Deux adapters l'implémentent (en mémoire, PostgreSQL), et la même suite de tests de contrat les vérifie.
export interface DepotAnnonces {
  nouvelIdentifiant(): AnnonceId;

  // L'Objet tel que la Bourse le voit : son propriétaire et son Annonce active, s'il en a une.
  objet(id: ObjetId): Promise<Objet | undefined>;

  annonce(id: AnnonceId): Promise<Annonce | undefined>;

  // Les Annonces actives, de la moins chère à la plus chère (à prix égal, par identifiant), filtrées et paginées.
  annoncesActives(criteres: CriteresDesAnnonces): Promise<PageDAnnonces>;

  // Garantit, même sous deux appels simultanés, une seule Annonce active par Objet (lève ObjetDejaEnVente).
  enregistrerMiseEnVente(annonce: Annonce): Promise<void>;

  // Garantit, même sous deux appels simultanés, qu'une Annonce ne se vend qu'une fois (lève AnnonceDejaVendue).
  // Marque l'Annonce vendue, cède l'Objet à l'acheteur et garde la Vente conclue.
  enregistrerVente(vente: VenteConclue): Promise<void>;
}
