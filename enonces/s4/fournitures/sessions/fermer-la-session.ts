import type { DepotSessions } from "./ports/depot-sessions.ts";
import type { FabriqueDeJetons } from "./ports/fabrique-de-jetons.ts";

// Use case « Fermer la session » : le Joueur se déconnecte, et toute la famille de son refresh token est
// révoquée. Sans refresh token, ou avec un refresh token inconnu, il n'y a rien à fermer : ce n'est pas une erreur.
export class FermerLaSession {
  readonly #sessions: DepotSessions;
  readonly #jetons: FabriqueDeJetons;

  constructor(ports: { sessions: DepotSessions; jetons: FabriqueDeJetons }) {
    this.#sessions = ports.sessions;
    this.#jetons = ports.jetons;
  }

  // À écrire (étape 2) : retrouver le refresh token par son empreinte, et révoquer sa famille.
  async executer(commande: { refreshToken?: string }): Promise<void> {
    throw new Error("Fermeture de session pas encore écrite");
  }
}
