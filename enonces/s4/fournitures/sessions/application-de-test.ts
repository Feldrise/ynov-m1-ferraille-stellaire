import type { Horloge } from "../../../src/application/ports/horloge.ts";
import { composerEnMemoire, composerLesSessionsEnMemoire, type ServiceBourse } from "../../../src/infrastructure/composition.ts";
import { JetonsDAcces } from "../../../src/infrastructure/http/authentification.ts";
import { construireApplication } from "../../../src/infrastructure/http/application.ts";
import { amorcerSiVide } from "../../../src/infrastructure/jeu-de-demonstration.ts";

export const SECRET_DE_TEST = "un-secret-de-test-de-trente-deux-caracteres-au-moins";
// Un lundi hors du premier week-end du Cycle : Taxe de Bourse standard, 5 %.
export const LUNDI: Horloge = { maintenant: () => new Date("2027-01-18T09:30:00Z") };
// Les comptes des Joueurs du jeu de démonstration, comme dans le Legacy : tous au mot de passe « ferraille ».
export const MOTS_DE_PASSE = { kessa: "ferraille", lyra: "ferraille", rivet: "ferraille", zephyr: "ferraille" };

// L'adapter HTTP branché sur les adapters en mémoire et le jeu de démonstration : ni base ni réseau,
// les requêtes passent par app.inject. `service` remplace les use cases pour simuler une panne.
export async function applicationDeTest(options: { service?: ServiceBourse; journal?: { write(ligne: string): void }; horloge?: Horloge } = {}) {
  const bourse = composerEnMemoire(LUNDI);
  await amorcerSiVide(bourse);
  const jetons = new JetonsDAcces(SECRET_DE_TEST);
  const sessions = composerLesSessionsEnMemoire(jetons, MOTS_DE_PASSE, options.horloge);
  const app = await construireApplication(options.service ?? bourse, { jetons, sessions, journal: options.journal });
  return {
    app,
    bourse,
    sessions,
    // L'en-tête d'un Joueur authentifié : { authorization: "Bearer <jeton>" }.
    enTantQue: async (joueurId: string) => ({ authorization: `Bearer ${await jetons.emettre(joueurId)}` }),
  };
}
