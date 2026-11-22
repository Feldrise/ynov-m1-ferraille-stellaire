import type { JoueurId } from "../../domain/identifiants.ts";

// Port sortant : les comptes des Joueurs. Le Service Bourse ne garde aucun mot de passe : il demande qui est
// le Joueur derrière un pseudo et un mot de passe, et reçoit son identifiant, ou undefined s'ils sont faux.
export interface Comptes {
  authentifier(pseudo: string, motDePasse: string): Promise<JoueurId | undefined>;
}
