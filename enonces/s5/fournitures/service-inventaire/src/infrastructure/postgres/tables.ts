import type { Generated } from "kysely";

// Les tables du Service Inventaire vues par Kysely (schema.sql). Elles restent dans l'Infrastructure.
export interface Tables {
  objet: { id: string; nom: string; proprietaire_id: string };
  vente_traitee: { cle: string; traitee_le: Generated<Date> };
}
