import type { VenteConclue } from "../../domain/vente-conclue.ts";

// Le message de la Vente conclue, tel qu'il part sur RabbitMQ : le contrat entre le Service Bourse et ceux qui
// l'écoutent. Écrit à la main, comme les objets de transfert de l'adapter HTTP : l'événement de domaine peut
// changer de forme sans casser le Service Inventaire.
export type MessageVenteConclue = {
  type: "VenteConclue";
  annonceId: string;
  objetId: string;
  vendeurId: string;
  acheteurId: string;
  prix: number;
  taxe: number;
  netVendeur: number;
  concluLe: string;
};

export function versLeMessage(vente: VenteConclue): MessageVenteConclue {
  return {
    type: vente.type,
    annonceId: vente.annonceId,
    objetId: vente.objetId,
    vendeurId: vente.vendeurId,
    acheteurId: vente.acheteurId,
    prix: vente.prix.montant,
    taxe: vente.taxe.montant,
    netVendeur: vente.netVendeur.montant,
    concluLe: vente.concluLe.toISOString(),
  };
}
