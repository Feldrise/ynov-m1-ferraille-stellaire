import type { VenteConclue } from "../../domain/vente-conclue.ts";
import { lireLaVenteConclue, MessageIllisible } from "./message-vente-conclue.ts";

// Ce que le consommateur fait d'un message, une fois le traitement tenté :
//   acquitter : traité, RabbitMQ peut l'oublier ;
//   reessayer : le traitement a échoué, une nouvelle tentative après l'attente donnée ;
//   abandonner : plus aucune tentative, le message part dans la file des messages en échec, avec la raison.
export type Decision = { action: "acquitter" } | { action: "reessayer"; attenteEnMs: number } | { action: "abandonner"; raison: string };

// tentative : 1 à la première livraison. attentesEnMs : une attente par nouvelle tentative permise.
export async function traiterUnMessage(
  contenu: Buffer,
  tentative: number,
  traiter: (vente: VenteConclue) => Promise<unknown>,
  attentesEnMs: number[],
): Promise<Decision> {
  // À écrire (étape 3) : lire la Vente conclue dans le message (lireLaVenteConclue) et la traiter.
  //   - traitée : acquitter ;
  //   - un message illisible (MessageIllisible) : abandonner tout de suite, avec la raison ; le réessayer ne sert à rien ;
  //   - toute autre erreur : réessayer après attentesEnMs[tentative - 1], tant qu'il reste une attente ;
  //     à la dernière tentative, abandonner, avec la raison (le message de l'erreur).
  throw new Error("Décision du consommateur : pas encore écrite");
}
