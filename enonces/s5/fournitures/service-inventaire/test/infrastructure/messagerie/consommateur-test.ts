import { afterEach, describe, expect, it } from "vitest";
import type { VenteConclue } from "../../../src/domain/vente-conclue.ts";
import { consommerLesVentesConclues } from "../../../src/infrastructure/messagerie/consommateur.ts";
import { attendreQue, bancDEssai } from "./rabbitmq-d-essai.ts";

// Le consommateur contre un vrai RabbitMQ. Les attentes sont réduites d'un facteur 100 : 2 secondes en
// production, 20 millisecondes ici.
const vente = (annonceId: string) => ({ type: "VenteConclue", annonceId, objetId: "o-1", vendeurId: "rivet", acheteurId: "lyra", prix: 650, taxe: 32, netVendeur: 618, concluLe: "2027-02-08T09:00:00.000Z" });
let banc: Awaited<ReturnType<typeof bancDEssai>>;
afterEach(() => banc.fermer());

describe("le consommateur des Ventes conclues", () => {
  it("traite chaque message, puis l'acquitte : la file se vide", async () => {
    banc = await bancDEssai({ echelleDuTemps: 0.01 });
    const recues: string[] = [];
    await consommerLesVentesConclues(banc.canal, banc.t, async (v: VenteConclue) => recues.push(v.annonceId), () => {});
    for (const id of ["a-1", "a-2", "a-3"]) await banc.publier(vente(id));
    await attendreQue(() => recues.length === 3);
    await attendreQue(async () => (await banc.enAttente()) === 0);
    expect(recues.sort()).toEqual(["a-1", "a-2", "a-3"]);
  });

  it("échoue deux fois, réussit à la troisième tentative : traité, rien dans la file des échecs", async () => {
    banc = await bancDEssai({ echelleDuTemps: 0.01 });
    let tentatives = 0;
    await consommerLesVentesConclues(banc.canal, banc.t, async () => {
      if (++tentatives < 3) throw new Error("base de l'Inventaire injoignable");
    }, () => {});
    await banc.publier(vente("a-1"));
    await attendreQue(() => tentatives === 3);
    await new Promise((r) => setTimeout(r, 100));
    expect(tentatives).toBe(3);
    expect(await banc.echecs()).toBe(0);
  });

  it("échoue à chaque tentative : trois tentatives, puis la file des messages en échec, avec la raison", async () => {
    banc = await bancDEssai({ echelleDuTemps: 0.01 });
    let tentatives = 0;
    await consommerLesVentesConclues(banc.canal, banc.t, async () => {
      tentatives++;
      throw new Error("base de l'Inventaire injoignable");
    }, () => {});
    await banc.publier(vente("a-1"));
    await attendreQue(async () => (await banc.echecs()) === 1);
    expect(tentatives).toBe(3);
    const echec = await banc.lireUnEchec();
    expect(echec?.corps).toMatchObject({ annonceId: "a-1" });
    expect(echec?.entetes).toMatchObject({ "x-tentative": 3, "x-raison": "base de l'Inventaire injoignable" });
  });

  it("un message illisible part tout de suite dans la file des échecs", async () => {
    banc = await bancDEssai({ echelleDuTemps: 0.01 });
    let appels = 0;
    await consommerLesVentesConclues(banc.canal, banc.t, async () => void appels++, () => {});
    await banc.publier({ type: "VenteConclue", annonceId: "a-1" });
    await attendreQue(async () => (await banc.echecs()) === 1);
    expect(appels).toBe(0);
  });
});
