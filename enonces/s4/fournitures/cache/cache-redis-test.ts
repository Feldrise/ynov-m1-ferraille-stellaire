import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "ioredis";
import { afterAll, describe, expect, it } from "vitest";
import { CacheRedis } from "../../src/infrastructure/cache/cache-redis.ts";

// REDIS_URL : celle de l'environnement, sinon du .env ou du .env.example du dépôt, comme DATABASE_URL.
for (let dossier = dirname(fileURLToPath(import.meta.url)); dossier !== dirname(dossier); dossier = dirname(dossier)) {
  for (const fichier of [".env", ".env.example"]) {
    if (!process.env.REDIS_URL && existsSync(join(dossier, fichier))) process.loadEnvFile(join(dossier, fichier));
  }
}
const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });
// Un Redis arrêté : personne n'écoute sur ce port, et aucune commande n'attend la reconnexion.
const redisArrete = new Redis("redis://127.0.0.1:1", { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0 });
redisArrete.on("error", () => {});
afterAll(() => {
  redis.disconnect();
  redisArrete.disconnect();
});

describe("Le cache dans Redis", () => {
  const prefixe = `test-cache-${crypto.randomUUID()}`;

  it("garde une valeur pour sa durée de vie, et incrémente un compteur", async () => {
    const cache = new CacheRedis(redis);
    await cache.ecrire(`${prefixe}:page`, "contenu", 30);
    expect(await cache.lire(`${prefixe}:page`)).toBe("contenu");
    expect(await redis.ttl(`${prefixe}:page`)).toBeGreaterThan(25);
    await cache.incrementer(`${prefixe}:version`);
    await cache.incrementer(`${prefixe}:version`);
    expect(await cache.lire(`${prefixe}:version`)).toBe("2");
    await redis.del(`${prefixe}:page`, `${prefixe}:version`);
  });

  it("Redis arrêté : la lecture rend « absent »", async () => {
    const cache = new CacheRedis(redisArrete);
    await expect(cache.lire("cle")).resolves.toBeUndefined();
  });
});
