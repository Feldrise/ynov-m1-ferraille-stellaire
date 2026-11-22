import type { Comptes } from "../../application/ports/comptes.ts";
import type { JoueurId } from "../../domain/identifiants.ts";

// Adapter en mémoire des comptes, pour les tests : des pseudos et leurs mots de passe, en clair. Jamais ailleurs.
export class ComptesEnMemoire implements Comptes {
  readonly #motsDePasse: Map<string, string>;

  constructor(motsDePasse: Record<string, string> = {}) {
    this.#motsDePasse = new Map(Object.entries(motsDePasse));
  }

  async authentifier(pseudo: string, motDePasse: string): Promise<JoueurId | undefined> {
    return this.#motsDePasse.get(pseudo) === motDePasse ? pseudo : undefined;
  }
}
