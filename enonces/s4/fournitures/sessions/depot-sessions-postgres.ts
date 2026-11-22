import type { Kysely } from "kysely";
import type { DepotSessions, RefreshTokenEnregistre, RefreshTokenUtilise } from "../../application/ports/depot-sessions.ts";
import type { Tables } from "./tables.ts";

// Adapter PostgreSQL du dépôt de sessions : une ligne par session (sa famille, révoquée ou non), une ligne par
// refresh token émis, identifié par son empreinte. La valeur du refresh token n'est jamais écrite.
export class DepotSessionsPostgres implements DepotSessions {
  readonly #db: Kysely<Tables>;

  constructor(db: Kysely<Tables>) {
    this.#db = db;
  }

  nouvelleFamille(): string {
    return crypto.randomUUID();
  }

  async enregistrer(jeton: RefreshTokenEnregistre): Promise<void> {
    await this.#db.transaction().execute(async (trx) => {
      await trx.insertInto("session").values({ famille: jeton.famille, joueur_id: jeton.joueurId }).onConflict((oc) => oc.column("famille").doNothing()).execute();
      await trx.insertInto("refresh_token").values({ empreinte: jeton.empreinte, famille: jeton.famille, expire_le: jeton.expireLe }).execute();
    });
  }

  async utiliser(empreinte: string): Promise<RefreshTokenUtilise | undefined> {
    return this.#db.transaction().execute(async (trx) => {
      // Le verrou : FOR UPDATE bloque la ligne. Un second renouvellement simultané attend ici, puis lit « utilisé ».
      const ligne = await trx
        .selectFrom("refresh_token")
        .innerJoin("session", "session.famille", "refresh_token.famille")
        .select(["refresh_token.empreinte", "refresh_token.famille", "refresh_token.expire_le", "refresh_token.utilise", "session.joueur_id", "session.revoquee"])
        .where("refresh_token.empreinte", "=", empreinte)
        .forUpdate()
        .executeTakeFirst();
      if (!ligne) return undefined;
      await trx.updateTable("refresh_token").set({ utilise: true }).where("empreinte", "=", empreinte).execute();
      return {
        empreinte: ligne.empreinte,
        famille: ligne.famille,
        joueurId: ligne.joueur_id,
        expireLe: ligne.expire_le,
        dejaUtilise: ligne.utilise,
        familleRevoquee: ligne.revoquee,
      };
    });
  }

  async revoquer(famille: string): Promise<void> {
    await this.#db.updateTable("session").set({ revoquee: true }).where("famille", "=", famille).execute();
  }
}
