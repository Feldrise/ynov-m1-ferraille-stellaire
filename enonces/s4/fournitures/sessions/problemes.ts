import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { z } from "zod";
import { IdentifiantsIncorrects, Introuvable, RefreshTokenRefuse } from "../../application/erreurs.ts";
import {
  AchatDeSaPropreAnnonce,
  AnnonceDejaVendue,
  AnnonceRetiree,
  CreditsInsuffisants,
  ErreurDuDomaine,
  ObjetDejaEnVente,
  ObjetDUnAutreJoueur,
} from "../../domain/erreurs.ts";
import { JetonRefuse } from "./authentification.ts";

// La gestion centralisée des erreurs : toute erreur levée par une route arrive ici, et repart en
// Problem Details (RFC 9457, application/problem+json). Aucune route n'a de try/catch.

const TYPES = "https://bourse.ferraille-stellaire.example/problemes/";

export const Probleme = z
  .object({
    type: z.string().meta({ description: "URI qui identifie le type de problème" }),
    title: z.string().meta({ description: "Résumé du type de problème, le même pour toutes ses occurrences" }),
    status: z.number().int(),
    detail: z.string().optional().meta({ description: "Explication propre à cette occurrence, lisible par le Joueur" }),
    instance: z.string().optional().meta({ description: "La requête qui a provoqué le problème" }),
    trace: z.string().optional().meta({ description: "Identifiant de la requête dans les journaux du Service Bourse" }),
    erreurs: z
      .array(z.object({ champ: z.string(), message: z.string() }))
      .optional()
      .meta({ description: "Pour une requête invalide : chaque champ refusé et pourquoi" }),
  })
  .meta({
    examples: [
      {
        type: `${TYPES}achat-de-sa-propre-annonce`,
        title: "Un Joueur ne peut pas acheter sa propre Annonce",
        status: 422,
        detail: "Un Joueur ne peut pas acheter sa propre Annonce (Annonce a-bobine-zephyr)",
        instance: "/annonces/a-bobine-zephyr/achat",
        trace: "4f0c9a6e-5b1d-4f7a-9c1e-2d8b7a3e6f10",
      },
    ],
  });

export type ProblemeDto = z.infer<typeof Probleme>;

// Les réponses d'erreur d'une route, pour son schéma : le statut et ce qu'il veut dire sur cette route-là.
// Elles entrent ainsi dans le contrat OpenAPI.
export function reponsesDErreur<S extends number>(descriptions: Record<S, string>): Record<S, typeof Probleme> {
  return Object.fromEntries(Object.entries(descriptions).map(([statut, description]) => [statut, Probleme.describe(description as string)])) as Record<
    S,
    typeof Probleme
  >;
}

type Classe = abstract new (...args: never[]) => Error;
type Traduction = { statut: number; type: string; titre: string };

// La table de traduction : une erreur du Domain ou de l'Application, un statut HTTP. Ici, et nulle part ailleurs.
// L'ordre compte : la première classe qui correspond l'emporte, ErreurDuDomaine (toute autre règle) en dernier.
const TABLE: Array<[Classe, Traduction]> = [
  [JetonRefuse, { statut: 401, type: "jeton-refuse", titre: "Authentification requise" }],
  [IdentifiantsIncorrects, { statut: 401, type: "identifiants-incorrects", titre: "Pseudo ou mot de passe incorrect" }],
  [RefreshTokenRefuse, { statut: 401, type: "refresh-token-refuse", titre: "Session à rouvrir" }],
  [Introuvable, { statut: 404, type: "introuvable", titre: "Introuvable" }],
  // Le Joueur n'a pas de droit sur cet Objet : refus d'autorisation.
  [ObjetDUnAutreJoueur, { statut: 403, type: "objet-d-un-autre-joueur", titre: "Cet Objet appartient à un autre Joueur" }],
  // L'état de la ressource empêche la demande : une autre requête est passée avant.
  [ObjetDejaEnVente, { statut: 409, type: "objet-deja-en-vente", titre: "Cet Objet a déjà une Annonce active" }],
  [AnnonceDejaVendue, { statut: 409, type: "annonce-deja-vendue", titre: "Cette Annonce est déjà vendue" }],
  [AnnonceRetiree, { statut: 409, type: "annonce-retiree", titre: "Cette Annonce a été retirée par son vendeur" }],
  // La requête est bien formée, le Joueur a le droit d'acheter, mais une règle du jeu refuse cet achat-là.
  [AchatDeSaPropreAnnonce, { statut: 422, type: "achat-de-sa-propre-annonce", titre: "Un Joueur ne peut pas acheter sa propre Annonce" }],
  [CreditsInsuffisants, { statut: 422, type: "credits-insuffisants", titre: "Crédits insuffisants" }],
  [ErreurDuDomaine, { statut: 422, type: "regle-de-la-bourse", titre: "Une règle de la Bourse aux épaves refuse cette demande" }],
];

const TITRES: Record<number, string> = {
  400: "Requête invalide",
  404: "Route introuvable",
  405: "Méthode non autorisée",
  406: "Format de réponse non disponible",
  413: "Requête trop volumineuse",
  415: "Type de contenu non pris en charge",
};

// Leur explication, en français : le message de Fastify est en anglais et ne dit rien au Joueur.
const DETAILS: Record<string, string> = {
  FST_ERR_CTP_INVALID_JSON_BODY: "Le corps de la requête n'est pas un JSON valide",
  FST_ERR_CTP_EMPTY_JSON_BODY: "Le corps de la requête est vide, alors que son type annonce du JSON",
  FST_ERR_CTP_INVALID_CONTENT_LENGTH: "La taille du corps ne correspond pas à l'en-tête Content-Length",
  FST_ERR_CTP_BODY_TOO_LARGE: "Le corps de la requête dépasse la taille acceptée",
  FST_ERR_CTP_INVALID_MEDIA_TYPE: "Ce type de contenu n'est pas accepté : envoyez du JSON (application/json)",
};

export function traduireEnProbleme(erreur: unknown, request: FastifyRequest): ProblemeDto {
  const contexte = { instance: request.url, trace: String(request.id) };
  if (hasZodFastifySchemaValidationErrors(erreur)) {
    return {
      type: `${TYPES}requete-invalide`,
      title: "Requête invalide",
      status: 400,
      detail: "Un ou plusieurs champs de la requête sont refusés",
      erreurs: erreur.validation.map((v) => ({ champ: `${erreur.validationContext ?? "requete"}${v.instancePath}`, message: v.message ?? "" })),
      ...contexte,
    };
  }
  const traduction = TABLE.find(([classe]) => erreur instanceof classe)?.[1];
  if (traduction) {
    return { type: TYPES + traduction.type, title: traduction.titre, status: traduction.statut, detail: (erreur as Error).message, ...contexte };
  }
  // Les refus de Fastify lui-même (JSON mal formé, type de contenu...) : statut 4xx, explication en français.
  const { statusCode: statut = 500, code = "" } = erreur as Partial<FastifyError>;
  if (statut >= 400 && statut < 500) {
    const titre = TITRES[statut] ?? "Requête refusée";
    return { type: "about:blank", title: titre, status: statut, detail: DETAILS[code] ?? titre, ...contexte };
  }
  // Tout le reste est une erreur interne : rien de son message ni de sa stack ne sort.
  return {
    type: "about:blank",
    title: "Erreur interne",
    status: 500,
    detail: "Le Service Bourse a rencontré une erreur. Elle est journalisée sous l'identifiant indiqué dans trace.",
    ...contexte,
  };
}

// Le gestionnaire d'erreurs de Fastify (app.setErrorHandler).
export function gererLesErreurs(erreur: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const probleme = traduireEnProbleme(erreur, request);
  if (probleme.status >= 500) {
    // La stack part dans les journaux, avec l'identifiant de la requête : jamais dans la réponse.
    request.log.error({ err: erreur, trace: probleme.trace }, "erreur interne");
  }
  if (probleme.status === 401) {
    reply.header("www-authenticate", 'Bearer realm="bourse"');
  }
  return reply.code(probleme.status).type("application/problem+json").send(probleme);
}

// Une route qui n'existe pas : un Problem Details aussi, plutôt que la réponse par défaut de Fastify.
export function routeInconnue(request: FastifyRequest, reply: FastifyReply) {
  return reply
    .code(404)
    .type("application/problem+json")
    .send({ type: "about:blank", title: "Route introuvable", status: 404, detail: `Aucune route ${request.method} ${request.url.split("?")[0]}`, instance: request.url, trace: String(request.id) });
}
