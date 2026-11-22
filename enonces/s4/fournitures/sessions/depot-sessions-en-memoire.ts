import type { DepotSessions, RefreshTokenEnregistre, RefreshTokenUtilise } from "../../application/ports/depot-sessions.ts";

// Adapter en mémoire du dépôt de sessions, pour les tests des use cases : les refresh tokens par empreinte,
// et l'ensemble des familles révoquées.
export class DepotSessionsEnMemoire implements DepotSessions {
  readonly #jetons = new Map<string, RefreshTokenEnregistre & { utilise: boolean }>();
  readonly #revoquees = new Set<string>();
  #compteur = 0;

  nouvelleFamille(): string {
    this.#compteur += 1;
    return `famille-${this.#compteur}`;
  }

  async enregistrer(jeton: RefreshTokenEnregistre): Promise<void> {
    this.#jetons.set(jeton.empreinte, { ...jeton, utilise: false });
  }

  // Sans await entre la lecture et l'écriture : deux appels simultanés ne voient pas tous deux le jeton inutilisé.
  async utiliser(empreinte: string): Promise<RefreshTokenUtilise | undefined> {
    const ligne = this.#jetons.get(empreinte);
    if (!ligne) return undefined;
    const { utilise, ...jeton } = ligne;
    ligne.utilise = true;
    return { ...jeton, dejaUtilise: utilise, familleRevoquee: this.#revoquees.has(jeton.famille) };
  }

  async revoquer(famille: string): Promise<void> {
    this.#revoquees.add(famille);
  }
}
