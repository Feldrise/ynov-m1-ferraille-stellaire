import { describe, expect, it } from "vitest";
import type { DepotSessions } from "../../src/application/ports/depot-sessions.ts";

// La suite de tests de contrat du port DepotSessions, jouée sur l'adapter en mémoire et sur l'adapter PostgreSQL.
export function testsDeContratDuDepotSessions(nom: string, nouveauDepot: () => Promise<DepotSessions>) {
  const expireLe = new Date("2027-02-21T08:30:00.000Z");

  describe(`Contrat du dépôt de sessions : ${nom}`, () => {
    it("rend un refresh token enregistré, une fois inutilisé, puis utilisé ; undefined s'il est inconnu", async () => {
      const depot = await nouveauDepot();
      const famille = depot.nouvelleFamille();
      await depot.enregistrer({ empreinte: "e1", famille, joueurId: "zephyr", expireLe });
      expect(await depot.utiliser("e1")).toEqual({ empreinte: "e1", famille, joueurId: "zephyr", expireLe, dejaUtilise: false, familleRevoquee: false });
      expect(await depot.utiliser("e1")).toMatchObject({ dejaUtilise: true });
      expect(await depot.utiliser("e404")).toBeUndefined();
    });

    it("révoque toute une famille, refresh tokens enregistrés après la révocation compris, et elle seule", async () => {
      const depot = await nouveauDepot();
      const [f1, f2] = [depot.nouvelleFamille(), depot.nouvelleFamille()];
      expect(f1).not.toBe(f2);
      await depot.enregistrer({ empreinte: "e1", famille: f1, joueurId: "zephyr", expireLe });
      await depot.enregistrer({ empreinte: "e2", famille: f2, joueurId: "zephyr", expireLe });
      await depot.revoquer(f1);
      await depot.enregistrer({ empreinte: "e3", famille: f1, joueurId: "zephyr", expireLe });
      expect(await depot.utiliser("e1")).toMatchObject({ familleRevoquee: true });
      expect(await depot.utiliser("e3")).toMatchObject({ familleRevoquee: true });
      expect(await depot.utiliser("e2")).toMatchObject({ familleRevoquee: false });
    });

    it("sous deux utilisations simultanées, un seul appel voit le refresh token inutilisé", async () => {
      const depot = await nouveauDepot();
      await depot.enregistrer({ empreinte: "e1", famille: depot.nouvelleFamille(), joueurId: "zephyr", expireLe });
      const [a, b] = await Promise.all([depot.utiliser("e1"), depot.utiliser("e1")]);
      expect([a?.dejaUtilise, b?.dejaUtilise].sort()).toEqual([false, true]);
    });
  });
}
