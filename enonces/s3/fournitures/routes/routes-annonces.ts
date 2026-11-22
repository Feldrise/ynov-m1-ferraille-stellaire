import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { ServiceBourse } from "../composition.ts";
import { AnnonceDto, PageDAnnoncesDto, ParametresAnnonce, RequeteListe, VenteConclueDto, versAnnonceDto, versVenteConclueDto } from "./schemas.ts";

// Les routes de la Bourse aux épaves. Chacune traduit la requête en commande, appelle un use case et traduit
// le résultat en objet de transfert. Aucune règle du jeu ici, aucun try/catch.
export function routesAnnonces(service: ServiceBourse): FastifyPluginAsyncZod {
  return async (app) => {
    // Le modèle : schémas de la requête et de la réponse, use case, correspondance vers l'objet de transfert.
    app.get(
      "/annonces",
      {
        schema: {
          tags: ["Annonces"],
          summary: "Lister les Annonces actives",
          querystring: RequeteListe,
          response: { 200: PageDAnnoncesDto },
        },
      },
      async (request) => {
        const { page, parPage, prixMax } = request.query;
        const { annonces, total } = await service.listerLesAnnonces.executer({ page, parPage, prixMax });
        return { annonces: annonces.map(versAnnonceDto), page, parPage, total };
      },
    );

    // À toi (étape 1) : GET /annonces/:annonceId, « Consulter une Annonce ».
    //   params ParametresAnnonce ; réponse 200 AnnonceDto ; use case service.consulterUneAnnonce.

    // À toi (étape 2) : POST /annonces, « Mettre un Objet en vente ».
    //   corps CorpsMiseEnVente ; réponse 201 AnnonceDto et en-tête Location: /annonces/<id> ;
    //   use case service.mettreEnVente.

    // À toi (étape 3) : POST /annonces/:annonceId/achat, « Acheter une Annonce ».
    //   params ParametresAnnonce ; corps { acheteurId } (provisoire, comme vendeurId) ; réponse 201 VenteConclueDto ;
    //   use case service.acheterUneAnnonce.
    void [AnnonceDto, ParametresAnnonce, VenteConclueDto, versVenteConclueDto];
  };
}
