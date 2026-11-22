import { IdentifiantsIncorrects } from "./erreurs.ts";
import type { Comptes } from "./ports/comptes.ts";
import type { DepotSessions } from "./ports/depot-sessions.ts";
import type { FabriqueDeJetons } from "./ports/fabrique-de-jetons.ts";
import type { Horloge } from "./ports/horloge.ts";
import { emettreLaSession, type Session } from "./session.ts";

// Use case « Ouvrir une session » : le Joueur prouve qui il est, et reçoit le premier refresh token d'une
// nouvelle famille.
export class OuvrirUneSession {
  readonly #comptes: Comptes;
  readonly #ports: { sessions: DepotSessions; jetons: FabriqueDeJetons; horloge: Horloge };

  constructor(ports: { comptes: Comptes; sessions: DepotSessions; jetons: FabriqueDeJetons; horloge: Horloge }) {
    this.#comptes = ports.comptes;
    this.#ports = ports;
  }

  async executer(commande: { pseudo: string; motDePasse: string }): Promise<Session> {
    const joueurId = await this.#comptes.authentifier(commande.pseudo, commande.motDePasse);
    if (!joueurId) {
      // Même refus pour un pseudo inconnu et un mauvais mot de passe : on ne dit pas lequel des deux est faux.
      throw new IdentifiantsIncorrects();
    }
    return emettreLaSession(this.#ports, joueurId, this.#ports.sessions.nouvelleFamille());
  }
}
