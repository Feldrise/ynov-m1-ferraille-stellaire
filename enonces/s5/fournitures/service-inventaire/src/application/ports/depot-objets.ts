import type { ObjetId } from "../../domain/identifiants.ts";
import type { Objet } from "../../domain/objet.ts";

// Port sortant : ce dont les use cases de l'Inventaire ont besoin pour retrouver et enregistrer les Objets, et
// pour se souvenir des Ventes conclues déjà traitées. Deux adapters (en mémoire, PostgreSQL), une même suite de
// tests de contrat.
export interface DepotObjets {
  objet(id: ObjetId): Promise<Objet | undefined>;

  // La Vente conclue de cette clé de déduplication a-t-elle déjà été appliquée ?
  dejaTraitee(cle: string): Promise<boolean>;

  // Enregistre le nouveau propriétaire et la clé de déduplication, ensemble : les deux ou aucun. Garantit, même
  // sous deux appels simultanés, qu'une clé ne s'applique qu'une fois (lève VenteDejaTraitee).
  enregistrerCession(objet: Objet, cle: string): Promise<void>;
}
