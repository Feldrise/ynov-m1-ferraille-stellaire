import type { JoueurId } from "../domain/identifiants.ts";
import type { DepotSessions } from "./ports/depot-sessions.ts";
import type { FabriqueDeJetons } from "./ports/fabrique-de-jetons.ts";
import type { Horloge } from "./ports/horloge.ts";

// Ce que reçoit le Joueur à l'ouverture et à chaque renouvellement de sa session : un jeton d'accès court,
// et un refresh token à usage unique, qui sert à obtenir le suivant.
export type Session = { jetonDAcces: string; expireDans: number; refreshToken: string; refreshTokenExpireLe: Date };

// Un refresh token vit 30 jours : au-delà sans renouvellement, le Joueur se reconnecte.
export const DUREE_DE_VIE_DU_REFRESH_TOKEN_EN_JOURS = 30;

// Émet un jeton d'accès et un refresh token neuf dans la famille de la session, et enregistre l'empreinte du
// refresh token, jamais sa valeur. Partagé par l'ouverture et le renouvellement.
export async function emettreLaSession(
  ports: { sessions: DepotSessions; jetons: FabriqueDeJetons; horloge: Horloge },
  joueurId: JoueurId,
  famille: string,
): Promise<Session> {
  const refreshToken = ports.jetons.refreshToken();
  const expireLe = new Date(ports.horloge.maintenant().getTime() + DUREE_DE_VIE_DU_REFRESH_TOKEN_EN_JOURS * 24 * 3600 * 1000);
  await ports.sessions.enregistrer({ empreinte: ports.jetons.empreinte(refreshToken), famille, joueurId, expireLe });
  const acces = await ports.jetons.jetonDAcces(joueurId);
  return { jetonDAcces: acces.jeton, expireDans: acces.expireDans, refreshToken, refreshTokenExpireLe: expireLe };
}
