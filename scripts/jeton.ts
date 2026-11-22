// Un jeton d'accès de développement pour le Service Bourse : npm run jeton -- <Joueur>
// Par exemple : npm run jeton -- zephyr (Joueurs du jeu de démonstration : kessa, lyra, rivet, zephyr).
//
// Signé HS256 avec le JWT_SECRET du .env (ou du .env.example), valable 15 minutes, comme ceux que vérifie le
// Service Bourse. À coller dans Swagger UI (bouton Authorize) ou dans curl : -H "authorization: Bearer <jeton>".
// En Séance 4, c'est l'ouverture de session du Service Bourse qui émettra les jetons.
import { SignJWT } from "jose";
import { chargerEnvironnement } from "./environnement.ts";

chargerEnvironnement();
const joueur = process.argv[2];
const secret = process.env.JWT_SECRET ?? "";
if (!joueur) {
  console.error("Indique le Joueur : npm run jeton -- zephyr");
  process.exit(1);
}
if (secret.length < 32) {
  console.error("JWT_SECRET absent ou trop court (32 caractères au moins) : voir .env.example");
  process.exit(1);
}
const maintenant = Math.floor(Date.now() / 1000);
const jeton = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setSubject(joueur)
  .setIssuedAt(maintenant)
  .setExpirationTime(maintenant + 15 * 60)
  .sign(new TextEncoder().encode(secret));
console.log(jeton);
