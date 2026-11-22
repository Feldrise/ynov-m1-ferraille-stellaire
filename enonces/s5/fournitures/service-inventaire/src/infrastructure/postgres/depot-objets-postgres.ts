import type { Kysely } from "kysely";
import { VenteDejaTraitee } from "../../application/erreurs.ts";
import type { DepotObjets } from "../../application/ports/depot-objets.ts";
import type { JoueurId, ObjetId } from "../../domain/identifiants.ts";
import { Objet } from "../../domain/objet.ts";
import type { Tables } from "./tables.ts";

// Adapter PostgreSQL du dépôt d'Objets, avec Kysely.
export class DepotObjetsPostgres implements DepotObjets {
  readonly #db: Kysely<Tables>;

  constructor(db: Kysely<Tables>) {
    this.#db = db;
  }

  // Hors du port : l'Objet arrive dans l'Inventaire par une Expédition, que ce dépôt ne connaît pas.
  async ajouterObjet(objet: { id: ObjetId; nom: string; proprietaireId: JoueurId }): Promise<void> {
    await this.#db.insertInto("objet").values({ id: objet.id, nom: objet.nom, proprietaire_id: objet.proprietaireId }).execute();
  }

  async objet(id: ObjetId): Promise<Objet | undefined> {
    const ligne = await this.#db.selectFrom("objet").selectAll().where("id", "=", id).executeTakeFirst();
    return ligne && new Objet({ id: ligne.id, nom: ligne.nom, proprietaireId: ligne.proprietaire_id });
  }

  async dejaTraitee(cle: string): Promise<boolean> {
    return (await this.#db.selectFrom("vente_traitee").select("cle").where("cle", "=", cle).executeTakeFirst()) !== undefined;
  }

  // Une transaction : la clé et le propriétaire s'écrivent ensemble. La clé primaire de vente_traitee refuse
  // une seconde livraison simultanée (23505) : elle attend la première, puis échoue, et tout est annulé.
  async enregistrerCession(objet: Objet, cle: string): Promise<void> {
    try {
      await this.#db.transaction().execute(async (trx) => {
        await trx.insertInto("vente_traitee").values({ cle }).execute();
        await trx.updateTable("objet").set({ proprietaire_id: objet.proprietaireId }).where("id", "=", objet.id).execute();
      });
    } catch (erreur) {
      if ((erreur as { code?: string }).code === "23505") {
        throw new VenteDejaTraitee(cle);
      }
      throw erreur;
    }
  }
}
