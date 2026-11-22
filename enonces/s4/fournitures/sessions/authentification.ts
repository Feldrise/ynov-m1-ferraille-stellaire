import { createHash, randomBytes } from "node:crypto";
import { errors, jwtVerify, SignJWT } from "jose";
import type { FabriqueDeJetons } from "../../application/ports/fabrique-de-jetons.ts";
import type { JoueurId } from "../../domain/identifiants.ts";

// Un jeton d'accès absent, mal signé, d'un autre algorithme ou expiré. L'adapter HTTP en fait un 401 (problemes.ts).
export class JetonRefuse extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// Le seul algorithme accepté. Sans cette liste, une bibliothèque JWT accepte tout algorithme que l'en-tête
// du jeton annonce : c'est le jeton qui choisirait comment on le vérifie.
const ALGORITHME = "HS256";

// Les jetons du Service Bourse. Le jeton d'accès : court (15 minutes), signé avec un secret d'au moins
// 32 caractères lu dans la configuration (JWT_SECRET), jamais écrit dans le code. Le refresh token : 32 octets
// tirés au hasard, opaques, dont le dépôt ne garde que l'empreinte SHA-256.
export class JetonsDAcces implements FabriqueDeJetons {
  readonly #cle: Uint8Array;
  readonly #dureeDeVie: number;

  constructor(secret: string, dureeDeVieEnSecondes = 15 * 60) {
    if (secret.length < 32) {
      throw new Error("Le secret des jetons d'accès (JWT_SECRET) doit compter au moins 32 caractères");
    }
    this.#cle = new TextEncoder().encode(secret);
    this.#dureeDeVie = dureeDeVieEnSecondes;
  }

  // Émet un jeton d'accès pour un Joueur, à une date donnée (les tests fabriquent ainsi un jeton expiré).
  async emettre(joueurId: JoueurId, maintenant = new Date()): Promise<string> {
    const emisLe = Math.floor(maintenant.getTime() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: ALGORITHME, typ: "JWT" })
      .setSubject(joueurId)
      .setIssuedAt(emisLe)
      .setExpirationTime(emisLe + this.#dureeDeVie)
      .sign(this.#cle);
  }

  async jetonDAcces(joueurId: JoueurId): Promise<{ jeton: string; expireDans: number }> {
    return { jeton: await this.emettre(joueurId), expireDans: this.#dureeDeVie };
  }

  refreshToken(): string {
    return randomBytes(32).toString("base64url");
  }

  empreinte(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("base64url");
  }

  // Le Joueur authentifié : celui que désigne un jeton valide de l'en-tête Authorization: Bearer <jeton>.
  // Jamais un champ du corps de la requête, que n'importe quel Joueur peut écrire.
  async joueurAuthentifie(autorisation: string | undefined): Promise<JoueurId> {
    const [schema, jeton] = (autorisation ?? "").split(" ");
    if (schema !== "Bearer" || !jeton) {
      throw new JetonRefuse("Jeton d'accès absent : en-tête Authorization: Bearer <jeton> attendu");
    }
    try {
      const { payload } = await jwtVerify(jeton, this.#cle, { algorithms: [ALGORITHME], requiredClaims: ["sub", "exp"] });
      return payload.sub as JoueurId;
    } catch (erreur) {
      throw new JetonRefuse(erreur instanceof errors.JWTExpired ? "Jeton d'accès expiré" : "Jeton d'accès invalide");
    }
  }
}
