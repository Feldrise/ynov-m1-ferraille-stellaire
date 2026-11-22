import { describe, expect, it } from "vitest";
import { VenteDUnAutreObjet } from "../../src/domain/erreurs.ts";
import { Objet } from "../../src/domain/objet.ts";

const vente = (objetId: string, vendeurId: string, acheteurId: string) => ({ annonceId: "a-1", objetId, vendeurId, acheteurId, concluLe: new Date() });

describe("Objet, dans l'Inventaire", () => {
  it("passe à l'acheteur après une Vente conclue", () => {
    const objet = new Objet({ id: "o-1", nom: "Bobine de plasma", proprietaireId: "zephyr" });
    objet.ceder(vente("o-1", "zephyr", "lyra"));
    expect(objet.proprietaireId).toBe("lyra");
  });

  it("refuse la Vente conclue d'un autre Objet", () => {
    const objet = new Objet({ id: "o-1", nom: "Bobine de plasma", proprietaireId: "zephyr" });
    expect(() => objet.ceder(vente("o-2", "zephyr", "lyra"))).toThrow(VenteDUnAutreObjet);
    expect(objet.proprietaireId).toBe("zephyr");
  });
});
