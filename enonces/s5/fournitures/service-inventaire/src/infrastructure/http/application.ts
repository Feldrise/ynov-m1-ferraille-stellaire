import Fastify, { type FastifyError } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ObjetIntrouvable } from "../../application/erreurs.ts";
import type { ServiceInventaire } from "../composition.ts";

// L'adapter HTTP du Service Inventaire : une seule route, en lecture, pour savoir qui possède un Objet. Les
// erreurs sortent en Problem Details (RFC 9457), comme celles du Service Bourse.
export async function construireApplication(service: ServiceInventaire) {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler((erreur: FastifyError, _request, reply) => {
    const [statut, titre] = erreur instanceof ObjetIntrouvable ? [404, "Objet introuvable"] : erreur.validation ? [400, "Requête invalide"] : [500, "Erreur interne"];
    return reply
      .code(statut)
      .type("application/problem+json")
      .send({ type: "about:blank", title: titre, status: statut, detail: statut === 500 ? undefined : erreur.message });
  });

  app.get(
    "/objets/:objetId",
    { schema: { params: z.object({ objetId: z.string().min(1) }), response: { 200: z.object({ id: z.string(), nom: z.string(), proprietaireId: z.string() }) } } },
    async (request) => {
      const objet = await service.consulterUnObjet.executer({ objetId: request.params.objetId });
      return { id: objet.id, nom: objet.nom, proprietaireId: objet.proprietaireId };
    },
  );
  return app;
}
