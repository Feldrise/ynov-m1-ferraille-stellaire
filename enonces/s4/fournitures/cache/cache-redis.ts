import type { Redis } from "ioredis";
import type { Cache } from "./cache.ts";

// Le cache dans Redis, partagé par toutes les instances du Service Bourse.
export class CacheRedis implements Cache {
  readonly #redis: Redis;

  constructor(redis: Redis) {
    this.#redis = redis;
  }

  async lire(cle: string): Promise<string | undefined> {
    return (await this.#redis.get(cle)) ?? undefined;
  }

  async ecrire(cle: string, valeur: string, dureeDeVieEnSecondes: number): Promise<void> {
    await this.#redis.set(cle, valeur, "EX", dureeDeVieEnSecondes);
  }

  async incrementer(cle: string): Promise<void> {
    await this.#redis.incr(cle);
  }
}
