import { sql } from "kysely";
import { afterAll, describe, expect, it } from "vitest";
import { DepotSessionsEnMemoire } from "../../src/infrastructure/memoire/depot-sessions-en-memoire.ts";
import { ComptesDuLegacy } from "../../src/infrastructure/postgres/comptes-du-legacy.ts";
import { DepotSessionsPostgres } from "../../src/infrastructure/postgres/depot-sessions-postgres.ts";
import { baseDeTest } from "./base-de-test.ts";
import { testsDeContratDuDepotSessions } from "./contrat-depot-sessions.ts";

testsDeContratDuDepotSessions("en mémoire", async () => new DepotSessionsEnMemoire());

const base = await baseDeTest();
afterAll(base.fermer);

testsDeContratDuDepotSessions("PostgreSQL", async () => {
  await base.db.deleteFrom("refresh_token").execute();
  await base.db.deleteFrom("session").execute();
  return new DepotSessionsPostgres(base.db);
});

describe("Les comptes du Legacy (table public.joueur, jeu de données de npm run up)", () => {
  it("reconnaît zephyr avec « ferraille », et refuse un mot de passe faux ou un pseudo inconnu", async () => {
    const comptes = new ComptesDuLegacy(base.db);
    expect(await comptes.authentifier("zephyr", "ferraille")).toBe("zephyr");
    expect(await comptes.authentifier("zephyr", "rouille")).toBeUndefined();
    expect(await comptes.authentifier("personne", "ferraille")).toBeUndefined();
    // Une injection SQL ne passe pas : les valeurs voyagent en paramètres.
    expect(await comptes.authentifier("zephyr' --", "x")).toBeUndefined();
  });

  it("ne garde que l'empreinte du refresh token : la table n'a aucune colonne pour sa valeur", async () => {
    const { rows } = await sql<{ column_name: string }>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'refresh_token' AND table_schema = current_schema()
    `.execute(base.db);
    expect(rows.map((r) => r.column_name).sort()).toEqual(["empreinte", "expire_le", "famille", "utilise"]);
  });
});
