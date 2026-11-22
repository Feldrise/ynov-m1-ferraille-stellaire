import { type Kysely, sql } from "kysely";
import type { Comptes } from "../../application/ports/comptes.ts";
import type { JoueurId } from "../../domain/identifiants.ts";
import type { Tables } from "./tables.ts";

// Adapter des comptes : ils sont encore dans le Legacy, table public.joueur, mots de passe hachés par bcrypt
// (pgcrypto). Le Service Bourse ne les copie pas : il demande à la base si le mot de passe correspond.
// Le jour où un service des comptes existera, seul cet adapter changera. Le JoueurId de la Bourse est le pseudo.
export class ComptesDuLegacy implements Comptes {
  readonly #db: Kysely<Tables>;

  constructor(db: Kysely<Tables>) {
    this.#db = db;
  }

  async authentifier(pseudo: string, motDePasse: string): Promise<JoueurId | undefined> {
    const { rows } = await sql<{ pseudo: string }>`
      SELECT pseudo FROM public.joueur WHERE pseudo = ${pseudo} AND mot_de_passe = public.crypt(${motDePasse}, mot_de_passe)
    `.execute(this.#db);
    return rows[0]?.pseudo;
  }
}
