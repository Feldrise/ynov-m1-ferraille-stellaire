import { type Kysely, sql } from "kysely";
import type { CriteresDesAnnonces, DepotAnnonces, PageDAnnonces } from "../../application/ports/depot-annonces.ts";
import { Annonce } from "../../domain/annonce.ts";
import { Credits } from "../../domain/credits.ts";
import { AnnonceDejaVendue, ObjetDejaEnVente } from "../../domain/erreurs.ts";
import type { AnnonceId, JoueurId, ObjetId } from "../../domain/identifiants.ts";
import { Objet } from "../../domain/objet.ts";
import type { VenteConclue } from "../../domain/vente-conclue.ts";
import type { Tables } from "./tables.ts";

// Adapter PostgreSQL du dépôt d'Annonces, avec Kysely. Il traduit les lignes en objets du Domain et
// les erreurs de la base en erreurs du Domain : rien de Kysely ni de pg ne sort d'ici.
export class DepotAnnoncesPostgres implements DepotAnnonces {
  readonly #db: Kysely<Tables>;

  constructor(db: Kysely<Tables>) {
    this.#db = db;
  }

  // Hors du port : l'Objet arrive dans la Bourse par une Expédition, que ce dépôt ne connaît pas.
  async ajouterObjet(objet: { id: ObjetId; nom: string; proprietaireId: JoueurId }): Promise<void> {
    await this.#db.insertInto("objet").values({ id: objet.id, nom: objet.nom, proprietaire_id: objet.proprietaireId }).execute();
  }

  nouvelIdentifiant(): AnnonceId {
    return crypto.randomUUID();
  }

  async objet(id: ObjetId): Promise<Objet | undefined> {
    const ligne = await this.#db
      .selectFrom("objet")
      .leftJoin("annonce", (j) => j.onRef("annonce.objet_id", "=", "objet.id").on("annonce.statut", "=", "active"))
      .select(["objet.id", "objet.nom", "objet.proprietaire_id", "annonce.id as annonce_active"])
      .where("objet.id", "=", id)
      .executeTakeFirst();
    return ligne && new Objet({ id: ligne.id, nom: ligne.nom, proprietaireId: ligne.proprietaire_id, annonceActive: ligne.annonce_active });
  }

  async annonce(id: AnnonceId): Promise<Annonce | undefined> {
    const ligne = await this.#db.selectFrom("annonce").selectAll().where("id", "=", id).executeTakeFirst();
    return (
      ligne &&
      Annonce.reconstituer({ id: ligne.id, objetId: ligne.objet_id, vendeurId: ligne.vendeur_id, prix: Credits.de(ligne.prix), statut: ligne.statut })
    );
  }

  async annoncesActives(criteres: CriteresDesAnnonces): Promise<PageDAnnonces> {
    let requete = this.#db.selectFrom("annonce").where("statut", "=", "active");
    if (criteres.prixMax !== undefined) {
      requete = requete.where("prix", "<=", criteres.prixMax);
    }
    const lignes = await requete
      .selectAll()
      // COLLATE "C" : les identifiants comparés octet par octet, comme le fait l'adapter en mémoire.
      .orderBy("prix")
      .orderBy(sql`id COLLATE "C"`)
      .limit(criteres.limite)
      .offset(criteres.decalage)
      .execute();
    // count(*) revient en chaîne avec pg : on le convertit ici, pas dans le use case.
    const { total } = await requete.select((eb) => eb.fn.countAll<string>().as("total")).executeTakeFirstOrThrow();
    return {
      annonces: lignes.map((ligne) =>
        Annonce.reconstituer({ id: ligne.id, objetId: ligne.objet_id, vendeurId: ligne.vendeur_id, prix: Credits.de(ligne.prix), statut: ligne.statut }),
      ),
      total: Number(total),
    };
  }

  async enregistrerMiseEnVente(annonce: Annonce): Promise<void> {
    try {
      await this.#db
        .insertInto("annonce")
        .values({ id: annonce.id, objet_id: annonce.objetId, vendeur_id: annonce.vendeurId, prix: annonce.prix.montant, statut: annonce.statut })
        .execute();
    } catch (erreur) {
      // 23505 : violation d'unicité. L'index annonce_active_par_objet a refusé une seconde Annonce active.
      if ((erreur as { code?: string }).code === "23505") {
        throw new ObjetDejaEnVente(annonce.objetId);
      }
      throw erreur;
    }
  }

  async enregistrerVente(vente: VenteConclue): Promise<void> {
    await this.#db.transaction().execute(async (trx) => {
      // Le verrou : FOR UPDATE bloque la ligne de l'Annonce jusqu'à la fin de la transaction. Une seconde
      // vente simultanée attend ici, puis relit le statut « vendue » et s'arrête.
      const annonce = await trx.selectFrom("annonce").select("statut").where("id", "=", vente.annonceId).forUpdate().executeTakeFirst();
      if (annonce?.statut !== "active") {
        throw new AnnonceDejaVendue(vente.annonceId);
      }
      await trx.updateTable("annonce").set({ statut: "vendue" }).where("id", "=", vente.annonceId).execute();
      await trx.updateTable("objet").set({ proprietaire_id: vente.acheteurId }).where("id", "=", vente.objetId).execute();
      await trx
        .insertInto("vente")
        .values({
          annonce_id: vente.annonceId,
          objet_id: vente.objetId,
          vendeur_id: vente.vendeurId,
          acheteur_id: vente.acheteurId,
          prix: vente.prix.montant,
          taxe: vente.taxe.montant,
          net_vendeur: vente.netVendeur.montant,
          conclue_le: vente.concluLe,
        })
        .execute();
    });
  }
}
