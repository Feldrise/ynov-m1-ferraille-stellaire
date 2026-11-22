import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
import type { JetonsDAcces } from "./authentification.ts";

// La limitation de débit du Service Bourse, avec @fastify/rate-limit : une fenêtre fixe par clé, des compteurs
// dans Redis, partagés par toutes les instances du service. Au-delà de la limite : 429 et Retry-After.

// Le refus, traduit en Problem Details par la gestion centralisée (problemes.ts).
export class TropDeRequetes extends Error {
  constructor(attente: string) {
    // attente : « 10 seconds », « 1 minute » ; l'en-tête Retry-After donne la même durée en secondes.
    super(`Trop de requêtes : réessayez dans ${attente.replace("second", "seconde")}`);
    this.name = new.target.name;
  }
}

// Les limites, route par route. Seules les routes qui s'abusent sont limitées : la liste des Annonces, elle,
// est protégée par le cache, et un lancement de Cycle est un trafic légitime.
export const LIMITES = {
  // Ticket du Game Designer : le bot qui achète tout dans les 200 ms. Par Joueur : il change d'adresse IP, pas
  // de compte. Trois achats en dix secondes, c'est plus qu'un humain qui lit l'Annonce avant de payer.
  achat: { max: 3, timeWindow: 10_000 },
  // L'ouverture de session : la force brute sur un mot de passe. Par adresse IP : le pseudo visé, lui, change.
  ouvertureDeSession: { max: 10, timeWindow: 60_000 },
};

export async function limiterLeDebit(app: FastifyInstance, options: { redis?: Redis; espace: string }) {
  await app.register(fastifyRateLimit, {
    // Aucune limite par défaut : chaque route limitée le déclare (config.rateLimit).
    global: false,
    // Sans Redis (les tests), les compteurs restent en mémoire, propres à cette instance.
    redis: options.redis,
    nameSpace: `${options.espace}:limite:`,
    // Redis en panne : on laisse passer plutôt que de refuser tout le monde. Un choix à défendre dans un ADR.
    skipOnError: true,
    errorResponseBuilder: (_request, contexte) => new TropDeRequetes(contexte.after),
  });
}

// La clé par adresse IP.
export function parAdresseIp(request: FastifyRequest): string {
  return `ip:${request.ip}`;
}

// La clé par Joueur : le Joueur d'un jeton d'accès valide. À écrire (étape 2) : sans jeton valide, la requête
// compte sur l'adresse IP. Vérifiez le jeton : un sub non signé ne doit pas vider le quota d'un autre Joueur.
export function parJoueur(jetons: JetonsDAcces) {
  return async (request: FastifyRequest): Promise<string> => {
    return parAdresseIp(request);
  };
}
