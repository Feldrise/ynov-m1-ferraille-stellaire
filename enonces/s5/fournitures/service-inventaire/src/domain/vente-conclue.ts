import type { AnnonceId, JoueurId, ObjetId } from "./identifiants.ts";

// Ce que l'Inventaire retient d'une Vente conclue, l'événement publié par le Service Bourse : qui a cédé quel
// Objet à qui. Le prix et la Taxe de Bourse ne le regardent pas.
export type VenteConclue = Readonly<{
  annonceId: AnnonceId;
  objetId: ObjetId;
  vendeurId: JoueurId;
  acheteurId: JoueurId;
  concluLe: Date;
}>;
