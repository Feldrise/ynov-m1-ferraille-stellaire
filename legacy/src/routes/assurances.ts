import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db.ts";

export default async function routesAssurances(app: FastifyInstance) {
  app.get("/assurances", async (request: FastifyRequest) => {
    await request.jwtVerify();
    const res = await db.query(
      `SELECT a.*, o.nom AS objet
         FROM assurance_cargaison a JOIN objet o ON o.id = a.objet_id
        WHERE a.joueur_id = $1 ORDER BY a.souscrite_le DESC`,
      [(request.user as any).sub],
    );
    return res.rows;
  });

  // Assurer un Objet avant de partir en Expédition : la prime est débitée tout de suite.
  app.post("/assurances", async (request: FastifyRequest, reply) => {
    await request.jwtVerify();
    const joueurId = (request.user as any).sub;
    const { objetId, valeurDeclaree } = request.body as any;

    const objet = (await db.query("SELECT * FROM objet WHERE id = $1", [objetId])).rows[0];
    if (!objet || objet.proprietaire_id !== joueurId) {
      return reply.status(403).send({ erreur: "Cet Objet ne vous appartient pas" });
    }
    if (objet.integrite < 20) {
      return reply.status(400).send({ erreur: "Cet Objet est trop abîmé pour être assuré" });
    }
    if (valeurDeclaree < 1 || valeurDeclaree > 2000) {
      return reply.status(400).send({ erreur: "La valeur déclarée va de 1 à 2000 Crédits" });
    }
    const dejaAssure = await db.query(
      "SELECT id FROM assurance_cargaison WHERE objet_id = $1 AND statut = 'active'",
      [objetId],
    );
    if (dejaAssure.rows.length > 0) {
      return reply.status(409).send({ erreur: "Cet Objet est déjà assuré" });
    }

    // La prime : 8 % de la valeur déclarée, arrondie au Crédit supérieur.
    const prime = Math.ceil((valeurDeclaree * 8) / 100);
    const joueur = (await db.query("SELECT credits FROM joueur WHERE id = $1", [joueurId])).rows[0];
    if (joueur.credits < prime) {
      return reply.status(402).send({ erreur: `Il faut ${prime} Crédits pour cette assurance` });
    }
    await db.query("UPDATE joueur SET credits = credits - $1 WHERE id = $2", [prime, joueurId]);
    const assurance = await db.query(
      "INSERT INTO assurance_cargaison (objet_id, joueur_id, valeur_declaree, prime) VALUES ($1, $2, $3, $4) RETURNING *",
      [objetId, joueurId, valeurDeclaree, prime],
    );
    return reply.status(201).send(assurance.rows[0]);
  });

  // Déclarer un sinistre : le Joueur ne s'est pas extrait de son Expédition, l'assurance verse la valeur déclarée.
  app.post("/assurances/:id/sinistre", async (request: FastifyRequest, reply) => {
    await request.jwtVerify();
    const joueurId = (request.user as any).sub;
    const { id } = request.params as any;
    const { expeditionId } = request.body as any;

    const assurance = (await db.query("SELECT * FROM assurance_cargaison WHERE id = $1", [id])).rows[0];
    if (!assurance || assurance.joueur_id !== joueurId) {
      return reply.status(404).send({ erreur: "Assurance introuvable" });
    }
    if (assurance.statut !== "active") {
      return reply.status(409).send({ erreur: "Cette assurance a déjà été indemnisée" });
    }
    const expedition = (await db.query("SELECT * FROM expedition WHERE id = $1", [expeditionId])).rows[0];
    if (!expedition || expedition.joueur_id !== joueurId) {
      return reply.status(404).send({ erreur: "Expédition introuvable" });
    }
    if (expedition.extrait) {
      return reply.status(400).send({ erreur: "Vous vous êtes extrait de cette Expédition : aucun sinistre" });
    }
    if (expedition.partie_le < assurance.souscrite_le) {
      return reply.status(400).send({ erreur: "Cette Expédition est antérieure à l'assurance" });
    }

    await db.query("UPDATE joueur SET credits = credits + $1 WHERE id = $2", [assurance.valeur_declaree, joueurId]);
    const res = await db.query(
      "UPDATE assurance_cargaison SET statut = 'indemnisée', indemnisee_le = now() WHERE id = $1 RETURNING *",
      [id],
    );
    return { ...res.rows[0], indemnite: assurance.valeur_declaree };
  });
}
