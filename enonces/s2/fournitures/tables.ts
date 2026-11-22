import type { Generated } from "kysely";

// Les tables du Service Bourse vues par Kysely, écrites à la main (schema.sql). Elles restent dans
// l'Infrastructure : le Domain et l'Application n'en voient rien.
export interface Tables {
  objet: { id: string; nom: string; proprietaire_id: string };
  annonce: {
    id: string;
    objet_id: string;
    vendeur_id: string;
    prix: number;
    statut: "active" | "vendue" | "retiree";
    creee_le: Generated<Date>;
  };
  vente: {
    annonce_id: string;
    objet_id: string;
    vendeur_id: string;
    acheteur_id: string;
    prix: number;
    taxe: number;
    net_vendeur: number;
    conclue_le: Date;
  };
  porte_monnaie: { joueur_id: string; credits: number };
}
