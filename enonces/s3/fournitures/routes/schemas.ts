import { z } from "zod";
import type { Annonce } from "../../domain/annonce.ts";
import type { VenteConclue } from "../../domain/vente-conclue.ts";

// Les objets de transfert de l'API : ce qui entre et ce qui sort, décrit par des schémas Zod.
// Fastify valide les entrées avec eux (400 avant tout use case), filtre les sorties, et @fastify/swagger
// en tire le contrat OpenAPI. Ils vivent dans l'adapter HTTP : le Domain ne les connaît pas.

const identifiant = z.string().min(1).max(64);

// --- Entrées ---

export const ParametresAnnonce = z.object({
  annonceId: identifiant,
});

// À toi (étape 2) : CorpsMiseEnVente, le corps de POST /annonces.
//   objetId : un identifiant ;
//   vendeurId : un identifiant (provisoire : à 13h15, le vendeur deviendra le Joueur authentifié) ;
//   prix : un entier strictement positif, un million de Crédits au plus.

export const RequeteListe = z.object({
  page: z.coerce.number().int().min(1).default(1),
  parPage: z.coerce.number().int().min(1).max(50).default(20),
  prixMax: z.coerce.number().int().positive().optional(),
});

// --- Sorties ---

export const AnnonceDto = z.object({
  id: z.string(),
  objetId: z.string(),
  vendeurId: z.string(),
  prix: z.number().int(),
  statut: z.enum(["active", "vendue", "retiree"]),
});

export const PageDAnnoncesDto = z.object({
  annonces: z.array(AnnonceDto),
  page: z.number().int(),
  parPage: z.number().int(),
  total: z.number().int(),
});

export const VenteConclueDto = z.object({
  annonceId: z.string(),
  objetId: z.string(),
  vendeurId: z.string(),
  acheteurId: z.string(),
  prix: z.number().int(),
  taxe: z.number().int(),
  netVendeur: z.number().int(),
  concluLe: z.iso.datetime(),
});

// --- Correspondance entre le Domain et les objets de transfert ---
// Une fonction par sens, écrite à la main : le contrat de l'API ne change pas quand une entité change de forme.

export function versAnnonceDto(annonce: Annonce): z.infer<typeof AnnonceDto> {
  return { id: annonce.id, objetId: annonce.objetId, vendeurId: annonce.vendeurId, prix: annonce.prix.montant, statut: annonce.statut };
}

// À toi (étape 1) : versVenteConclueDto(vente: VenteConclue): z.infer<typeof VenteConclueDto>.
// Les Crédits deviennent des nombres, la date une chaîne ISO 8601 (toISOString).
export function versVenteConclueDto(vente: VenteConclue): z.infer<typeof VenteConclueDto> {
  throw new Error(`versVenteConclueDto n'est pas encore écrite (Annonce ${vente.annonceId})`);
}
