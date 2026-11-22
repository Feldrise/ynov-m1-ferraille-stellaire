import type { JoueurId } from "../../domain/identifiants.ts";

// Un refresh token enregistré : son empreinte (jamais sa valeur), la famille de la session qu'il prolonge, le
// Joueur, et sa date d'expiration. Tous les refresh tokens d'une même session forment une famille.
export type RefreshTokenEnregistre = { empreinte: string; famille: string; joueurId: JoueurId; expireLe: Date };

// Ce qu'était un refresh token au moment où on l'a utilisé.
export type RefreshTokenUtilise = RefreshTokenEnregistre & { dejaUtilise: boolean; familleRevoquee: boolean };

// Port sortant : les sessions ouvertes, sous forme de familles de refresh tokens.
// Deux adapters l'implémentent (en mémoire, PostgreSQL), et la même suite de tests de contrat les vérifie.
export interface DepotSessions {
  // L'identifiant d'une nouvelle famille, à l'ouverture d'une session.
  nouvelleFamille(): string;

  enregistrer(jeton: RefreshTokenEnregistre): Promise<void>;

  // Marque le refresh token utilisé et rend ce qu'il était juste avant ; undefined s'il est inconnu.
  // Garantit, même sous deux appels simultanés, qu'un seul appel le voit inutilisé.
  utiliser(empreinte: string): Promise<RefreshTokenUtilise | undefined>;

  // Révoque toute la famille : aucun de ses refresh tokens, passé ou à venir, ne sera plus accepté.
  revoquer(famille: string): Promise<void>;
}
