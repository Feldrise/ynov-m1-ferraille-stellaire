import type { Kysely } from "kysely";
import type { DepotAnnonces } from "../../application/ports/depot-annonces.ts";
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

  // À toi : dans une transaction, verrouiller la ligne de l'Annonce (forUpdate), refuser si elle n'est plus
  // active (AnnonceDejaVendue), la marquer vendue, céder l'Objet à l'acheteur, insérer la Vente conclue.
  async enregistrerVente(vente: VenteConclue): Promise<void> {
    throw new Error("enregistrerVente : à écrire");
  }
}
