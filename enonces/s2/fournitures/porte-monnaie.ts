import type { Credits } from "../../domain/credits.ts";
import type { JoueurId } from "../../domain/identifiants.ts";

// Port sortant : le Porte-monnaie des Joueurs. Un Joueur inconnu a 0 Crédit.
export interface PorteMonnaie {
  solde(joueurId: JoueurId): Promise<Credits>;

  // Refuse de débiter plus que le solde, même sous deux appels simultanés (lève CreditsInsuffisants).
  debiter(joueurId: JoueurId, montant: Credits): Promise<void>;

  crediter(joueurId: JoueurId, montant: Credits): Promise<void>;
}
