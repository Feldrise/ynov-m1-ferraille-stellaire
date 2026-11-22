import amqp from "amqplib";
import { afterAll, expect, it } from "vitest";
import { CLE_VENTE_CONCLUE, PublicationRabbitMQ } from "../../../src/infrastructure/messagerie/rabbitmq.ts";
import { adresseDeRabbitMQ } from "./rabbitmq-d-essai.ts";

// La publication contre un vrai RabbitMQ, sur un échange propre au test : le message arrive dans une file liée
// à la clé de routage de la Vente conclue, persistant, avec son identifiant ; sans file liée, il est refusé.
const url = adresseDeRabbitMQ();
const echange = `test.bourse.${crypto.randomUUID()}`;
const publication = new PublicationRabbitMQ(url, echange);
const connexion = await amqp.connect(url);
const canal = await connexion.createChannel();
afterAll(async () => {
  await publication.fermer();
  await canal.deleteExchange(echange);
  await connexion.close();
});

it("aucune file liée à l'échange (l'Inventaire n'a jamais démarré) : publier lève une erreur, le message n'est pas perdu en silence", async () => {
  await expect(publication.publier({ id: "m-1", type: "VenteConclue", charge: { annonceId: "a-1" } })).rejects.toThrow("aucune file");
});

it("publie la Vente conclue, confirmée par le broker, sous la clé vente.conclue", async () => {
  const { queue } = await canal.assertQueue("", { exclusive: true });
  await canal.bindQueue(queue, echange, CLE_VENTE_CONCLUE);
  await publication.publier({ id: "m-2", type: "VenteConclue", charge: { annonceId: "a-2" } });
  const message = await canal.get(queue, { noAck: true });
  expect(message && JSON.parse(message.content.toString())).toEqual({ annonceId: "a-2" });
  expect(message && message.properties).toMatchObject({ messageId: "m-2", type: "VenteConclue", deliveryMode: 2 });
});

it("RabbitMQ injoignable : publier lève une erreur, rien n'est perdu en silence", async () => {
  const injoignable = new PublicationRabbitMQ("amqp://guest:guest@127.0.0.1:1", echange);
  await expect(injoignable.publier({ id: "m-3", type: "VenteConclue", charge: {} })).rejects.toThrow();
});
