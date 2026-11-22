import type { Horloge } from "../../../src/application/ports/horloge.ts";
import { composerEnMemoire, type ServiceBourse } from "../../../src/infrastructure/composition.ts";
import { construireApplication } from "../../../src/infrastructure/http/application.ts";
import { amorcerSiVide } from "../../../src/infrastructure/jeu-de-demonstration.ts";

// Un lundi hors du premier week-end du Cycle : Taxe de Bourse standard, 5 %.
export const LUNDI: Horloge = { maintenant: () => new Date("2027-01-18T09:30:00Z") };

// L'adapter HTTP branché sur les adapters en mémoire et le jeu de démonstration : ni base ni réseau,
// les requêtes passent par app.inject. `service` remplace les use cases pour simuler une panne.
export async function applicationDeTest(options: { service?: ServiceBourse; journal?: { write(ligne: string): void } } = {}) {
  const bourse = composerEnMemoire(LUNDI);
  await amorcerSiVide(bourse);
  const app = await construireApplication(options.service ?? bourse, { journal: options.journal });
  return { app, bourse };
}
