import type { FastifyInstance } from "fastify";
import { db } from "../db.ts";

export default async function routesInventaire(app: FastifyInstance) {
  app.get("/joueurs/:id/inventaire", async (request) => {
    const { id } = request.params as any;
    const res = await db.query(
      `SELECT o.id, o.nom, o.integrite, e.nom AS epave, o.trouve_le,
              EXISTS (SELECT 1 FROM annonce a WHERE a.objet_id = o.id AND a.statut = 'active') AS en_vente
         FROM objet o LEFT JOIN epave e ON e.id = o.epave_id
        WHERE o.proprietaire_id = $1
        ORDER BY o.trouve_le DESC`,
      [id],
    );
    return res.rows;
  });

  app.get("/objets/:id", async (request, reply) => {
    const { id } = request.params as any;
    const res = await db.query(
      `SELECT o.*, e.nom AS epave, j.pseudo AS proprietaire
         FROM objet o LEFT JOIN epave e ON e.id = o.epave_id LEFT JOIN joueur j ON j.id = o.proprietaire_id
        WHERE o.id = $1`,
      [id],
    );
    if (res.rows.length === 0) return reply.status(404).send({ erreur: "Objet introuvable" });
    return res.rows[0];
  });
}
