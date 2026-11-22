import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db.ts";

const TAILLE_EQUIPAGE = 3;

export default async function routesMatchmaking(app: FastifyInstance) {
  // File d'attente des Expéditions : dès que trois Joueurs attendent la même Épave, ils partent ensemble.
  app.post("/matchmaking/file", async (request: FastifyRequest, reply) => {
    await request.jwtVerify();
    const joueurId = (request.user as any).sub;
    const { epaveId } = request.body as any;
    await db.query(
      "INSERT INTO file_matchmaking (joueur_id, epave_id) VALUES ($1, $2) ON CONFLICT (joueur_id) DO UPDATE SET epave_id = $2, entre_le = now()",
      [joueurId, epaveId],
    );
    const attente = await db.query(
      "SELECT joueur_id FROM file_matchmaking WHERE epave_id = $1 ORDER BY entre_le LIMIT $2",
      [epaveId, TAILLE_EQUIPAGE],
    );
    if (attente.rows.length < TAILLE_EQUIPAGE) {
      return reply.status(202).send({ statut: "en attente", joueursEnAttente: attente.rows.length });
    }
    const ids = attente.rows.map((r) => r.joueur_id);
    await db.query("DELETE FROM file_matchmaking WHERE joueur_id = ANY($1)", [ids]);
    for (const id of ids) {
      await db.query("INSERT INTO expedition (joueur_id, epave_id, extrait) VALUES ($1, $2, $3)", [id, epaveId, Math.random() < 0.6]);
    }
    return { statut: "départ", epave: epaveId, joueurs: ids };
  });

  app.get("/matchmaking/file", async () => {
    const res = await db.query(
      `SELECT e.nom AS epave, count(*) AS en_attente
         FROM file_matchmaking f JOIN epave e ON e.id = f.epave_id
        GROUP BY e.nom ORDER BY e.nom`,
    );
    return res.rows;
  });

  app.delete("/matchmaking/file", async (request: FastifyRequest) => {
    await request.jwtVerify();
    await db.query("DELETE FROM file_matchmaking WHERE joueur_id = $1", [(request.user as any).sub]);
    return { statut: "sorti de la file" };
  });
}
