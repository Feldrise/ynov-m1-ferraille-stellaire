import amqp, { type ChannelModel, type ConfirmChannel } from "amqplib";

// L'échange où le Service Bourse publie ses événements, et la clé de routage de la Vente conclue. Le Service
// Bourse ne connaît aucune file : qui veut les Ventes conclues lie sa propre file à cet échange.
export const ECHANGE = "ferraille.bourse";
export const CLE_VENTE_CONCLUE = "vente.conclue";

export type MessageAPublier = { id: string; type: string; charge: unknown };

// La publication sur RabbitMQ, avec confirmation : publier() ne rend la main qu'une fois le message gardé par
// le broker dans au moins une file, et lève une erreur sinon. La confirmation seule ne suffit pas : un échange
// sans file liée (l'Inventaire n'a encore jamais démarré) jette le message et le confirme quand même. Avec
// mandatory, le broker rend (basic.return) le message qu'aucune file ne reçoit, avant de le confirmer : c'est
// un échec, et la ligne de l'outbox reste à publier. La connexion s'ouvre à la première publication ; perdue
// (RabbitMQ redémarre), elle se rouvre à la suivante.
export class PublicationRabbitMQ {
  readonly #url: string;
  readonly #echange: string;
  #connexion?: Promise<{ connexion: ChannelModel; canal: ConfirmChannel; rendus: Set<string> }>;

  constructor(url: string, echange = ECHANGE) {
    this.#url = url;
    this.#echange = echange;
  }

  async publier(message: MessageAPublier): Promise<void> {
    const { canal, rendus } = await this.#ouvrir();
    try {
      canal.publish(this.#echange, CLE_VENTE_CONCLUE, Buffer.from(JSON.stringify(message.charge)), {
        mandatory: true,
        persistent: true,
        messageId: message.id,
        type: message.type,
        contentType: "application/json",
      });
      await canal.waitForConfirms();
    } catch (erreur) {
      await this.fermer();
      throw erreur;
    }
    if (rendus.delete(message.id)) {
      throw new Error(`aucune file ne reçoit ${CLE_VENTE_CONCLUE} sur l'échange ${this.#echange} : message ${message.id} rendu par RabbitMQ`);
    }
  }

  async fermer(): Promise<void> {
    const ouverte = this.#connexion;
    this.#connexion = undefined;
    await ouverte?.then(({ connexion }) => connexion.close()).catch(() => {});
  }

  #ouvrir() {
    this.#connexion ??= (async () => {
      const connexion = await amqp.connect(this.#url);
      // Une connexion perdue émet « error » puis « close » : on l'oublie, la prochaine publication en rouvre une.
      connexion.on("error", () => {});
      connexion.on("close", () => (this.#connexion = undefined));
      const canal = await connexion.createConfirmChannel();
      await canal.assertExchange(this.#echange, "topic", { durable: true });
      // Les messages rendus, notés par identifiant : RabbitMQ rend avant de confirmer.
      const rendus = new Set<string>();
      canal.on("return", (rendu) => rendus.add(rendu.properties.messageId));
      return { connexion, canal, rendus };
    })();
    this.#connexion.catch(() => (this.#connexion = undefined));
    return this.#connexion;
  }
}
