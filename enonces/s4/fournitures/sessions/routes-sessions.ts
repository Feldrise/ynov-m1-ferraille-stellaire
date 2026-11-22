import type { FastifyReply } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Session } from "../../application/session.ts";
import type { ServiceSessions } from "../composition.ts";
import { reponsesDErreur } from "./problemes.ts";
import { CorpsOuvertureDeSession, SessionDto, versSessionDto } from "./schemas-sessions.ts";

// Le refresh token voyage dans un cookie : httpOnly (le JavaScript de la page ne le lit pas, une faille XSS ne le
// vole pas), Secure (jamais en clair sur le réseau), SameSite=Strict (jamais envoyé depuis un autre site), et
// limité aux routes /sessions (les autres requêtes ne le transportent pas).
export const COOKIE = "refresh_token";
const OPTIONS_DU_COOKIE = { httpOnly: true, secure: true, sameSite: "strict", path: "/sessions" } as const;

function envoyerLaSession(reply: FastifyReply, session: Session, statut: number) {
  reply.setCookie(COOKIE, session.refreshToken, { ...OPTIONS_DU_COOKIE, expires: session.refreshTokenExpireLe });
  return reply.code(statut).send(versSessionDto(session));
}

// Les routes des sessions : ouvrir, renouveler, fermer. Comme les routes des Annonces, elles traduisent et
// appellent un use case ; les refus remontent jusqu'à la gestion centralisée (problemes.ts).
export function routesSessions(sessions: ServiceSessions): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      "/sessions",
      {
        schema: {
          tags: ["Sessions"],
          summary: "Ouvrir une session",
          description:
            "Le Joueur donne son pseudo et son mot de passe. Il reçoit un jeton d'accès de 15 minutes, et un refresh token dans le cookie httpOnly refresh_token, valable 30 jours sur les routes /sessions.",
          body: CorpsOuvertureDeSession,
          response: {
            201: SessionDto.describe("Session ouverte ; l'en-tête Set-Cookie porte le refresh token"),
            ...reponsesDErreur({
              400: "Corps invalide : pseudo ou motDePasse absent",
              401: "Pseudo ou mot de passe incorrect",
            }),
          },
        },
      },
      async (request, reply) => envoyerLaSession(reply, await sessions.ouvrir.executer(request.body), 201),
    );

    app.post(
      "/sessions/renouvellement",
      {
        schema: {
          tags: ["Sessions"],
          summary: "Renouveler la session",
          description:
            "Échange le refresh token du cookie contre un jeton d'accès et un refresh token neufs (rotation) : chaque refresh token ne sert qu'une fois. Un refresh token rejoué révoque toute la session.",
          security: [{ refreshToken: [] }],
          response: {
            200: SessionDto.describe("Session renouvelée ; l'en-tête Set-Cookie porte le nouveau refresh token"),
            ...reponsesDErreur({ 401: "Refresh token absent, inconnu, expiré, déjà utilisé, ou session fermée" }),
          },
        },
      },
      async (request, reply) => envoyerLaSession(reply, await sessions.renouveler.executer({ refreshToken: request.cookies[COOKIE] }), 200),
    );

    app.delete(
      "/sessions/courante",
      {
        schema: {
          tags: ["Sessions"],
          summary: "Fermer la session",
          description:
            "Révoque la session du refresh token du cookie, et efface le cookie. Sans cookie, ou avec un refresh token inconnu, il n'y a rien à fermer : la réponse est la même.",
          security: [{ refreshToken: [] }],
          response: { 204: z.null().describe("Session fermée, cookie effacé ; aucun corps") },
        },
      },
      async (request, reply) => {
        await sessions.fermer.executer({ refreshToken: request.cookies[COOKIE] });
        return reply.clearCookie(COOKIE, OPTIONS_DU_COOKIE).code(204).send(null);
      },
    );
  };
}
