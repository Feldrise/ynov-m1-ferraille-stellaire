import type { JoueurId } from "../../domain/identifiants.ts";

// Port sortant : fabrique les jetons d'une session. Leur format (JWT signé, chaîne aléatoire, empreinte SHA-256)
// est l'affaire de l'adapter ; les use cases ne connaissent ni jose ni node:crypto.
export interface FabriqueDeJetons {
  // Le jeton d'accès, court, que l'adapter HTTP vérifie à chaque requête ; expireDans en secondes.
  jetonDAcces(joueurId: JoueurId): Promise<{ jeton: string; expireDans: number }>;

  // Un refresh token neuf : une chaîne aléatoire et opaque, qui ne contient rien.
  refreshToken(): string;

  // Ce que le dépôt garde à la place du refresh token : son empreinte. Une base volée ne rouvre aucune session.
  empreinte(refreshToken: string): string;
}
