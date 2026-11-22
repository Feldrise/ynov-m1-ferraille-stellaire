import type { ConfirmChannel, ConsumeMessage } from "amqplib";
import type { VenteConclue } from "../../domain/vente-conclue.ts";
import { traiterUnMessage } from "./decision.ts";
import { fileDAttente, type Topologie } from "./topologie.ts";

// L'adapter entrant de la messagerie : il reçoit les Ventes conclues de RabbitMQ et appelle le use case, comme
// l'adapter HTTP reçoit des requêtes. L'acquittement vient APRÈS le traitement : si le service tombe en plein
// traitement, RabbitMQ relivrera le message. Le canal est en mode confirmation : un message republié pour une
// nouvelle tentative, ou rangé dans la file des échecs, est gardé par le broker avant qu'on acquitte l'original.
export async function consommerLesVentesConclues(
  canal: ConfirmChannel,
  t: Topologie,
  traiter: (vente: VenteConclue) => Promise<unknown>,
  journal: (texte: string) => void = console.warn,
): Promise<void> {
  // Au plus dix messages en cours de traitement à la fois.
  await canal.prefetch(10);
  await canal.consume(t.file, async (message) => {
    if (!message) return;
    const tentative = Number(message.properties.headers?.["x-tentative"] ?? 1);
    const decision = await traiterUnMessage(message.content, tentative, traiter, t.attentesEnMs);
    if (decision.action === "reessayer") {
      republier(canal, fileDAttente(t, decision.attenteEnMs), message, { "x-tentative": tentative + 1 });
      await canal.waitForConfirms();
    } else if (decision.action === "abandonner") {
      journal(`Vente conclue en échec après ${tentative} tentative(s) : ${decision.raison}`);
      republier(canal, t.fileDesEchecs, message, { "x-tentative": tentative, "x-raison": decision.raison });
      await canal.waitForConfirms();
    }
    canal.ack(message);
  });
}

function republier(canal: ConfirmChannel, file: string, message: ConsumeMessage, entetes: Record<string, unknown>): void {
  canal.sendToQueue(file, message.content, {
    persistent: true,
    messageId: message.properties.messageId,
    type: message.properties.type,
    contentType: message.properties.contentType,
    headers: { ...message.properties.headers, ...entetes },
  });
}
