import { beforeEach, describe, expect, it } from "vitest";
import { IdentifiantsIncorrects, RefreshTokenRefuse } from "../../src/application/erreurs.ts";
import { FermerLaSession } from "../../src/application/fermer-la-session.ts";
import { OuvrirUneSession } from "../../src/application/ouvrir-une-session.ts";
import type { FabriqueDeJetons } from "../../src/application/ports/fabrique-de-jetons.ts";
import type { Horloge } from "../../src/application/ports/horloge.ts";
import { RenouvelerLaSession } from "../../src/application/renouveler-la-session.ts";
import { ComptesEnMemoire } from "../../src/infrastructure/memoire/comptes-en-memoire.ts";
import { DepotSessionsEnMemoire } from "../../src/infrastructure/memoire/depot-sessions-en-memoire.ts";

// Des jetons lisibles : le jeton d'accès nomme le Joueur, les refresh tokens sont numérotés, l'empreinte est
// la valeur retournée. Ni jose ni node:crypto : les use cases ne savent pas comment l'adapter les fabrique.
function fabriqueDeTest(): FabriqueDeJetons {
  let numero = 0;
  return {
    jetonDAcces: async (joueurId) => ({ jeton: `acces-${joueurId}`, expireDans: 900 }),
    refreshToken: () => `refresh-${++numero}`,
    empreinte: (refreshToken) => [...refreshToken].reverse().join(""),
  };
}

describe("Sessions : ouvrir, renouveler, fermer", () => {
  let maintenant: Date;
  let sessions: DepotSessionsEnMemoire;
  let ports: { comptes: ComptesEnMemoire; sessions: DepotSessionsEnMemoire; jetons: FabriqueDeJetons; horloge: Horloge };

  beforeEach(() => {
    maintenant = new Date("2027-01-22T08:30:00Z");
    sessions = new DepotSessionsEnMemoire();
    ports = { comptes: new ComptesEnMemoire({ zephyr: "ferraille" }), sessions, jetons: fabriqueDeTest(), horloge: { maintenant: () => maintenant } };
  });
  const ouvrir = () => new OuvrirUneSession(ports).executer({ pseudo: "zephyr", motDePasse: "ferraille" });
  const renouveler = (refreshToken?: string) => new RenouvelerLaSession(ports).executer({ refreshToken });

  it("ouvre une session : jeton d'accès, refresh token, et seule son empreinte est enregistrée", async () => {
    const session = await ouvrir();
    expect(session).toMatchObject({ jetonDAcces: "acces-zephyr", expireDans: 900, refreshToken: "refresh-1" });
    expect(session.refreshTokenExpireLe).toEqual(new Date("2027-02-21T08:30:00Z"));
    expect(await sessions.utiliser("refresh-1")).toBeUndefined();
    expect(await sessions.utiliser("1-hserfer")).toMatchObject({ joueurId: "zephyr", dejaUtilise: false });
  });

  it("refuse un mot de passe faux et un pseudo inconnu, du même refus", async () => {
    const refus = [
      new OuvrirUneSession(ports).executer({ pseudo: "zephyr", motDePasse: "rouille" }),
      new OuvrirUneSession(ports).executer({ pseudo: "personne", motDePasse: "ferraille" }),
    ];
    for (const r of refus) await expect(r).rejects.toThrow(IdentifiantsIncorrects);
  });

  it("renouvelle : un refresh token s'échange contre un jeton d'accès et un refresh token neufs (rotation)", async () => {
    const { refreshToken } = await ouvrir();
    const suivante = await renouveler(refreshToken);
    expect(suivante).toMatchObject({ jetonDAcces: "acces-zephyr", refreshToken: "refresh-2" });
    expect((await renouveler(suivante.refreshToken)).refreshToken).toBe("refresh-3");
  });

  it("refuse un refresh token absent, inconnu ou expiré", async () => {
    await expect(renouveler(undefined)).rejects.toThrow(RefreshTokenRefuse);
    await expect(renouveler("refresh-404")).rejects.toThrow(RefreshTokenRefuse);
    const { refreshToken } = await ouvrir();
    maintenant = new Date("2027-02-21T08:30:00Z");
    await expect(renouveler(refreshToken)).rejects.toThrow("Refresh token expiré");
  });

  // À écrire (étape 3) : le rejeu d'un refresh token volé.

  it("ferme la session : son refresh token ne renouvelle plus rien ; fermer sans refresh token ne lève rien", async () => {
    const { refreshToken } = await ouvrir();
    await new FermerLaSession(ports).executer({ refreshToken });
    await expect(renouveler(refreshToken)).rejects.toThrow("Session fermée ou révoquée");
    await expect(new FermerLaSession(ports).executer({})).resolves.toBeUndefined();
    await expect(new FermerLaSession(ports).executer({ refreshToken: "refresh-404" })).resolves.toBeUndefined();
  });
});
