import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Credits } from "../../src/domain/credits.ts";
import { AnnonceDejaVendue } from "../../src/domain/erreurs.ts";
import { composer } from "../../src/infrastructure/composition.ts";
import type { MessageAPublier } from "../../src/infrastructure/messagerie/rabbitmq.ts";
import { RelaisDeLOutbox } from "../../src/infrastructure/messagerie/relais-de-l-outbox.ts";
import { DepotAnnoncesPostgres } from "../../src/infrastructure/postgres/depot-annonces-postgres.ts";
import { PorteMonnaiePostgres } from "../../src/infrastructure/postgres/porte-monnaie-postgres.ts";
import { baseDeTest } from "./base-de-test.ts";

// L'outbox : la Vente conclue et son message s'écrivent dans la même transaction, puis le relais publie.
let base: Awaited<ReturnType<typeof baseDeTest>>;
beforeAll(async () => {
  base = await baseDeTest();
});
afterAll(() => base.fermer());

async function uneAnnonceEnVente(objetId: string) {
  const annonces = new DepotAnnoncesPostgres(base.db);
  const porteMonnaie = new PorteMonnaiePostgres(base.db);
  const bourse = composer({ annonces, porteMonnaie, horloge: { maintenant: () => new Date("2026-12-15T10:00:00Z") } });
  await annonces.ajouterObjet({ id: objetId, nom: "Antenne quantique", proprietaireId: "kessa" });
  for (const joueur of ["zephyr", "lyra"]) await porteMonnaie.crediter(joueur, Credits.de(500));
  const annonce = await bourse.mettreEnVente.executer({ objetId, vendeurId: "kessa", prix: 120 });
  return { bourse, annonce };
}

const messagesDe = (annonceId: string) =>
  base.db.selectFrom("outbox").selectAll().where((eb) => eb.ref("charge", "->>").key("annonceId" as never), "=", annonceId).execute();

describe("l'outbox du Service Bourse", () => {
  beforeEach(() => base.db.deleteFrom("outbox").execute());

  it("une Vente conclue écrit son message dans l'outbox, à publier", async () => {
    const { bourse, annonce } = await uneAnnonceEnVente("o-outbox-1");
    await bourse.acheterUneAnnonce.executer({ annonceId: annonce.id, acheteurId: "zephyr" });
    const messages = await messagesDe(annonce.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: "VenteConclue", publie_le: null });
    expect(messages[0].charge).toEqual({
      type: "VenteConclue",
      annonceId: annonce.id,
      objetId: "o-outbox-1",
      vendeurId: "kessa",
      acheteurId: "zephyr",
      prix: 120,
      taxe: 6,
      netVendeur: 114,
      concluLe: "2026-12-15T10:00:00.000Z",
    });
  });

  it("deux achats simultanés : une seule Vente conclue, un seul message ; le perdant n'en laisse aucun", async () => {
    const { bourse, annonce } = await uneAnnonceEnVente("o-outbox-2");
    const resultats = await Promise.allSettled(
      ["zephyr", "lyra"].map((acheteurId) => bourse.acheterUneAnnonce.executer({ annonceId: annonce.id, acheteurId })),
    );
    expect(resultats.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason)).toEqual([expect.any(AnnonceDejaVendue)]);
    expect(await messagesDe(annonce.id)).toHaveLength(1);
  });
});

describe("le relais de l'outbox", () => {
  beforeEach(() => base.db.deleteFrom("outbox").execute());

  // Deux Ventes conclues, de deux Objets neufs : objetIds rend leurs identifiants, dans l'ordre des ventes.
  async function deuxVentes() {
    const objetIds = [crypto.randomUUID(), crypto.randomUUID()];
    for (const objetId of objetIds) {
      const { bourse, annonce } = await uneAnnonceEnVente(objetId);
      await bourse.acheterUneAnnonce.executer({ annonceId: annonce.id, acheteurId: "zephyr" });
    }
    return objetIds;
  }
  const aPublier = async () => (await base.db.selectFrom("outbox").select("id").where("publie_le", "is", null).execute()).length;

  it("publie chaque message dans l'ordre d'écriture, avec son identifiant, puis note qu'il est publié", async () => {
    const objetIds = await deuxVentes();
    const publies: MessageAPublier[] = [];
    const relais = new RelaisDeLOutbox(base.db, async (m) => void publies.push(m));
    expect(await relais.publierUnLot()).toBe(2);
    expect(publies.map((m) => (m.charge as { objetId: string }).objetId)).toEqual(objetIds);
    expect(publies.every((m) => m.type === "VenteConclue" && typeof m.id === "string")).toBe(true);
    expect(await aPublier()).toBe(0);
    expect(await relais.publierUnLot()).toBe(0);
  });

  it("RabbitMQ refuse la publication : rien n'est noté publié, le lot repartira", async () => {
    await deuxVentes();
    const relais = new RelaisDeLOutbox(base.db, async () => {
      throw new Error("RabbitMQ injoignable");
    });
    await expect(relais.publierUnLot()).rejects.toThrow("RabbitMQ injoignable");
    expect(await aPublier()).toBe(2);
  });

  it("deux relais en même temps (deux instances du service) : chaque message n'est pris que par l'un des deux", async () => {
    await deuxVentes();
    const publies: string[] = [];
    const lent = async (m: MessageAPublier) => {
      publies.push(m.id);
      await new Promise((r) => setTimeout(r, 50));
    };
    await Promise.all([new RelaisDeLOutbox(base.db, lent).publierUnLot(1), new RelaisDeLOutbox(base.db, lent).publierUnLot(1)]);
    expect(new Set(publies).size).toBe(2);
    expect(await aPublier()).toBe(0);
  });
});
