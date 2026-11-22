import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// L'adresse de RabbitMQ : AMQP_URL si elle est définie, sinon le .env ou le .env.example du dépôt, cherchés en
// remontant les dossiers. Pas de RabbitMQ joignable : les tests échouent, ils ne se sautent pas.
export function adresseDeRabbitMQ(): string {
  for (let dossier = dirname(fileURLToPath(import.meta.url)); dossier !== dirname(dossier); dossier = dirname(dossier)) {
    for (const fichier of [".env", ".env.example"]) {
      if (!process.env.AMQP_URL && existsSync(join(dossier, fichier))) process.loadEnvFile(join(dossier, fichier));
    }
  }
  if (!process.env.AMQP_URL) throw new Error("AMQP_URL introuvable : lance npm run up depuis la racine du dépôt");
  return process.env.AMQP_URL;
}

// Un banc d'essai : la topologie de l'Inventaire sous un préfixe et un échange propres au test, le temps réduit
// par echelleDuTemps, et de quoi publier comme le Service Bourse, attendre, lire la file des échecs, nettoyer.
export async function bancDEssai(options: { attentesEnMs?: number[]; echelleDuTemps?: number } = {}) {
  const amqp = (await import("amqplib")).default;
  const { CLE_VENTE_CONCLUE, fileDAttente, installerLaTopologie, topologie } = await import("../../../src/infrastructure/messagerie/topologie.ts");
  const nom = `test-${crypto.randomUUID().slice(0, 8)}`;
  const t = topologie({ prefixe: nom, echange: `${nom}.bourse`, ...options });
  const connexion = await amqp.connect(adresseDeRabbitMQ());
  const canal = await connexion.createConfirmChannel();
  await installerLaTopologie(canal, t);
  return {
    t,
    canal,
    publier: async (corps: object, messageId: string = crypto.randomUUID()) => {
      canal.publish(t.echange, CLE_VENTE_CONCLUE, Buffer.from(JSON.stringify(corps)), { persistent: true, messageId, type: "VenteConclue" });
      await canal.waitForConfirms();
    },
    echecs: async () => (await canal.checkQueue(t.fileDesEchecs)).messageCount,
    enAttente: async () => (await canal.checkQueue(t.file)).messageCount,
    lireUnEchec: async () => {
      const m = await canal.get(t.fileDesEchecs, { noAck: true });
      return m ? { corps: JSON.parse(m.content.toString()), entetes: m.properties.headers ?? {} } : undefined;
    },
    fermer: async () => {
      for (const file of [t.file, t.fileDesEchecs, ...new Set(t.attentesEnMs.map((a) => fileDAttente(t, a)))]) await canal.deleteQueue(file);
      await canal.deleteExchange(t.echange);
      await connexion.close();
    },
  };
}

// Attend qu'une condition devienne vraie, au plus delaiEnMs.
export async function attendreQue(condition: () => Promise<boolean> | boolean, delaiEnMs = 5_000): Promise<void> {
  const fin = Date.now() + delaiEnMs;
  while (!(await condition())) {
    if (Date.now() > fin) throw new Error("condition jamais remplie");
    await new Promise((r) => setTimeout(r, 20));
  }
}
