// Ce dont le dépôt avec cache a besoin pour garder des valeurs : des chaînes, rangées sous une clé, pour une
// durée de vie. Redis l'implémente (cache-redis.ts), un dictionnaire aussi (ci-dessous, pour les tests).
export interface Cache {
  lire(cle: string): Promise<string | undefined>;

  ecrire(cle: string, valeur: string, dureeDeVieEnSecondes: number): Promise<void>;

  // Ajoute 1 au compteur rangé sous cette clé (0 s'il n'existe pas).
  incrementer(cle: string): Promise<void>;
}

// Le cache en mémoire, pour les tests : un dictionnaire, durées de vie comprises.
export class CacheEnMemoire implements Cache {
  readonly #valeurs = new Map<string, { valeur: string; jusquA: number }>();

  async lire(cle: string): Promise<string | undefined> {
    const entree = this.#valeurs.get(cle);
    return entree && entree.jusquA > Date.now() ? entree.valeur : undefined;
  }

  async ecrire(cle: string, valeur: string, dureeDeVieEnSecondes: number): Promise<void> {
    this.#valeurs.set(cle, { valeur, jusquA: Date.now() + dureeDeVieEnSecondes * 1000 });
  }

  async incrementer(cle: string): Promise<void> {
    const actuel = Number((await this.lire(cle)) ?? 0);
    this.#valeurs.set(cle, { valeur: String(actuel + 1), jusquA: Number.POSITIVE_INFINITY });
  }
}
