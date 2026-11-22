import type { Kysely } from "kysely";
import type { Tables } from "../postgres/tables.ts";
import type { MessageAPublier } from "./rabbitmq.ts";

// Le relais de l'outbox : il lit les messages pas encore publiés, les publie, puis note qu'ils le sont.
// Au moins une fois : si le service s'arrête entre la publication et la note, le message repartira au tour
// suivant. C'est au consommateur d'être idempotent.
export class RelaisDeLOutbox {
  readonly #db: Kysely<Tables>;
  readonly #publier: (message: MessageAPublier) => Promise<void>;
  readonly #intervalleEnMs: number;
  #enMarche = false;
  #boucle?: Promise<void>;

  constructor(db: Kysely<Tables>, publier: (message: MessageAPublier) => Promise<void>, intervalleEnMs = 200) {
    this.#db = db;
    this.#publier = publier;
    this.#intervalleEnMs = intervalleEnMs;
  }

  // Un lot, dans l'ordre d'écriture. FOR UPDATE SKIP LOCKED : deux instances du Service Bourse ne prennent pas les
  // mêmes lignes. Une publication qui échoue (RabbitMQ arrêté) annule le lot : il repartira au tour suivant.
  async publierUnLot(taille = 50): Promise<number> {
    return this.#db.transaction().execute(async (trx) => {
      const lignes = await trx
        .selectFrom("outbox")
        .select(["id", "type", "charge"])
        .where("publie_le", "is", null)
        .orderBy("cree_le")
        .limit(taille)
        .forUpdate()
        .skipLocked()
        .execute();
      for (const ligne of lignes) {
        await this.#publier(ligne);
      }
      if (lignes.length > 0) {
        await trx.updateTable("outbox").set({ publie_le: new Date() }).where("id", "in", lignes.map((l) => l.id)).execute();
      }
      return lignes.length;
    });
  }

  demarrer(journal: (texte: string) => void = console.warn): void {
    this.#enMarche = true;
    let enPanne = false;
    this.#boucle = (async () => {
      while (this.#enMarche) {
        try {
          // Un lot plein : on enchaîne ; sinon, on attend un peu.
          const publies = await this.publierUnLot();
          if (enPanne) journal("Relais de l'outbox : publication rétablie");
          enPanne = false;
          if (publies === 50) continue;
        } catch (erreur) {
          if (!enPanne) journal(`Relais de l'outbox : publication impossible, nouvel essai en continu (${(erreur as Error).message})`);
          enPanne = true;
        }
        await new Promise((resolve) => setTimeout(resolve, this.#intervalleEnMs));
      }
    })();
  }

  async arreter(): Promise<void> {
    this.#enMarche = false;
    await this.#boucle;
  }
}
