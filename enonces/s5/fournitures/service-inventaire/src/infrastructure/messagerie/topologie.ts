import type { Channel } from "amqplib";

// La topologie RabbitMQ du Service Inventaire. L'échange est celui où publie le Service Bourse ; les files sont
// à l'Inventaire, qui les déclare. Chaque déclaration est idempotente : la rejouer ne change rien, tant que ses
// arguments ne changent pas (sinon RabbitMQ refuse : supprimer la file d'abord).
export const ECHANGE = "ferraille.bourse";
export const CLE_VENTE_CONCLUE = "vente.conclue";

// Les attentes avant chaque nouvelle tentative : deux nouvelles tentatives, à 2 secondes d'intervalle, soit trois
// tentatives en tout ; ensuite, la file des messages en échec.
export const ATTENTES_EN_MS = [2_000, 2_000];

export type Topologie = {
  echange: string;
  // La file des Ventes conclues de l'Inventaire, liée à l'échange.
  file: string;
  // La file des messages en échec : ce qu'aucune tentative n'a su traiter, gardé pour qu'un humain s'en occupe.
  fileDesEchecs: string;
  attentesEnMs: number[];
};

// Une file d'attente par durée : un message y attend sa durée de vie, puis RabbitMQ le rend à la file des Ventes
// conclues (l'échange des messages morts de la file d'attente est l'échange par défaut, sa clé le nom de la file).
export function fileDAttente(t: Topologie, attenteEnMs: number): string {
  return `${t.file}.attente.${attenteEnMs}ms`;
}

// echelleDuTemps : 1 en production ; les tests la réduisent pour ne pas attendre de vraies secondes.
export function topologie(options: { prefixe?: string; echange?: string; attentesEnMs?: number[]; echelleDuTemps?: number } = {}): Topologie {
  const prefixe = options.prefixe ?? "inventaire";
  const attentesEnMs = (options.attentesEnMs ?? ATTENTES_EN_MS).map((a) => Math.max(1, Math.round(a * (options.echelleDuTemps ?? 1))));
  const file = `${prefixe}.vente-conclue`;
  return {
    echange: options.echange ?? ECHANGE,
    file,
    fileDesEchecs: `${file}.echecs`,
    attentesEnMs,
  };
}

export async function installerLaTopologie(canal: Channel, t: Topologie): Promise<void> {
  await canal.assertExchange(t.echange, "topic", { durable: true });
  await canal.assertQueue(t.file, { durable: true });
  await canal.bindQueue(t.file, t.echange, CLE_VENTE_CONCLUE);
  for (const attente of new Set(t.attentesEnMs)) {
    await canal.assertQueue(fileDAttente(t, attente), {
      durable: true,
      arguments: { "x-message-ttl": attente, "x-dead-letter-exchange": "", "x-dead-letter-routing-key": t.file },
    });
  }
  await canal.assertQueue(t.fileDesEchecs, { durable: true });
}
