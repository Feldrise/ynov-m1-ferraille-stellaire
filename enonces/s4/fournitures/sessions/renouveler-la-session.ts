import { RefreshTokenRefuse } from "./erreurs.ts";
import type { DepotSessions } from "./ports/depot-sessions.ts";
import type { FabriqueDeJetons } from "./ports/fabrique-de-jetons.ts";
import type { Horloge } from "./ports/horloge.ts";
import { emettreLaSession, type Session } from "./session.ts";

// Use case « Renouveler la session » : un refresh token valide s'échange, une seule fois, contre un jeton
// d'accès et un refresh token neuf de la même famille (rotation).
export class RenouvelerLaSession {
  readonly #ports: { sessions: DepotSessions; jetons: FabriqueDeJetons; horloge: Horloge };

  constructor(ports: { sessions: DepotSessions; jetons: FabriqueDeJetons; horloge: Horloge }) {
    this.#ports = ports;
  }

  // À écrire (étape 2) : refuser (RefreshTokenRefuse) un refresh token absent, inconnu, d'une famille révoquée,
  // déjà utilisé (le rejeu : révoquer d'abord toute la famille), ou expiré ; sinon, emettreLaSession.
  async executer(commande: { refreshToken?: string }): Promise<Session> {
    throw new RefreshTokenRefuse("Renouvellement pas encore écrit");
  }
}
