import { describe, expect, it } from "vitest";
import { traiterUnMessage } from "../../../src/infrastructure/messagerie/decision.ts";

// La décision du consommateur, sans RabbitMQ : acquitter, réessayer après une attente, ou abandonner.
const ATTENTES = [2_000, 2_000];
const message = (corps: object | string) => Buffer.from(typeof corps === "string" ? corps : JSON.stringify(corps));
const VENTE = { type: "VenteConclue", annonceId: "a-1", objetId: "o-1", vendeurId: "rivet", acheteurId: "lyra", prix: 650, taxe: 32, netVendeur: 618, concluLe: "2027-02-08T09:00:00.000Z" };
const reussit = async () => "transfere";
const echoue = async () => {
  throw new Error("base de l'Inventaire injoignable");
};

describe("traiterUnMessage", () => {
  it("traité : acquitter, et le use case a reçu la Vente conclue lue dans le message", async () => {
    const recues: unknown[] = [];
    expect(await traiterUnMessage(message(VENTE), 1, async (v) => recues.push(v), ATTENTES)).toEqual({ action: "acquitter" });
    expect(recues).toEqual([{ annonceId: "a-1", objetId: "o-1", vendeurId: "rivet", acheteurId: "lyra", concluLe: new Date("2027-02-08T09:00:00.000Z") }]);
  });

  it("échec à la première et à la deuxième tentative : réessayer, après l'attente prévue", async () => {
    expect(await traiterUnMessage(message(VENTE), 1, echoue, [1_000, 5_000])).toEqual({ action: "reessayer", attenteEnMs: 1_000 });
    expect(await traiterUnMessage(message(VENTE), 2, echoue, [1_000, 5_000])).toEqual({ action: "reessayer", attenteEnMs: 5_000 });
  });

  it("échec à la dernière tentative : abandonner, avec la raison", async () => {
    expect(await traiterUnMessage(message(VENTE), 3, echoue, ATTENTES)).toEqual({ action: "abandonner", raison: "base de l'Inventaire injoignable" });
  });

  it("un message illisible : abandonner tout de suite, sans appeler le use case", async () => {
    let appels = 0;
    const compter = async () => appels++;
    expect(await traiterUnMessage(message("pas du json"), 1, compter, ATTENTES)).toMatchObject({ action: "abandonner" });
    expect(await traiterUnMessage(message({ ...VENTE, objetId: "" }), 1, compter, ATTENTES)).toMatchObject({ action: "abandonner" });
    expect(appels).toBe(0);
  });

  it("réussite à la troisième tentative : acquitter", async () => {
    expect(await traiterUnMessage(message(VENTE), 3, reussit, ATTENTES)).toEqual({ action: "acquitter" });
  });
});
