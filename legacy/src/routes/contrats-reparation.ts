import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db.ts";

export default async function routesContratsReparation(app: FastifyInstance) {
  app.get("/stations", async () => {
    const res = await db.query("SELECT id, nom, tarif_reparation FROM station ORDER BY nom");
    return res.rows;
  });

  app.get("/contrats-reparation", async (request: FastifyRequest) => {
    await request.jwtVerify();
    const res = await db.query(
      `SELECT c.*, o.nom AS objet, s.nom AS station
         FROM contrat_reparation c JOIN objet o ON o.id = c.objet_id JOIN station s ON s.id = c.station_id
        WHERE c.joueur_id = $1 ORDER BY c.ouvert_le DESC`,
      [(request.user as any).sub],
    );
    return res.rows;
  });

  // Ouvrir un Contrat de réparation : le coût est débité tout de suite.
  app.post("/contrats-reparation", async (request: FastifyRequest, reply) => {
    await request.jwtVerify();
    const joueurId = (request.user as any).sub;
    const { objetId, stationId } = request.body as any;

    const objet = (await db.query("SELECT * FROM objet WHERE id = $1", [objetId])).rows[0];
    if (!objet || objet.proprietaire_id !== joueurId) {
      return reply.status(403).send({ erreur: "Cet Objet ne vous appartient pas" });
    }
    if (objet.integrite >= 100) {
      return reply.status(400).send({ erreur: "Cet Objet est intact" });
    }
    const enCours = await db.query("SELECT id FROM contrat_reparation WHERE objet_id = $1 AND statut = 'en cours'", [objetId]);
    if (enCours.rows.length > 0) {
      return reply.status(409).send({ erreur: "Une réparation est déjà en cours sur cet Objet" });
    }
    const enVente = await db.query("SELECT id FROM annonce WHERE objet_id = $1 AND statut = 'active'", [objetId]);
    if (enVente.rows.length > 0) {
      return reply.status(409).send({ erreur: "Retirez d'abord l'Annonce de cet Objet" });
    }
    const station = (await db.query("SELECT * FROM station WHERE id = $1", [stationId])).rows[0];

    // Chaque point d'Intégrité manquant se paie au tarif de la Station ;
    // sous 25 d'Intégrité, les pièces sont introuvables et le coût est majoré de moitié.
    let cout = (100 - objet.integrite) * station.tarif_reparation;
    if (objet.integrite < 25) {
      cout = Math.ceil(cout * 1.5);
    }

    const joueur = (await db.query("SELECT credits FROM joueur WHERE id = $1", [joueurId])).rows[0];
    if (joueur.credits < cout) {
      return reply.status(402).send({ erreur: `Il faut ${cout} Crédits pour cette réparation` });
    }
    await db.query("UPDATE joueur SET credits = credits - $1 WHERE id = $2", [cout, joueurId]);
    const contrat = await db.query(
      "INSERT INTO contrat_reparation (objet_id, joueur_id, station_id, cout) VALUES ($1, $2, $3, $4) RETURNING *",
      [objetId, joueurId, stationId, cout],
    );
    return reply.status(201).send(contrat.rows[0]);
  });

  app.post("/contrats-reparation/:id/livraison", async (request: FastifyRequest, reply) => {
    await request.jwtVerify();
    const { id } = request.params as any;
    const contrat = (await db.query("SELECT * FROM contrat_reparation WHERE id = $1", [id])).rows[0];
    if (!contrat || contrat.joueur_id !== (request.user as any).sub) {
      return reply.status(404).send({ erreur: "Contrat introuvable" });
    }
    if (contrat.statut !== "en cours") {
      return reply.status(409).send({ erreur: `Ce contrat est déjà ${contrat.statut}` });
    }
    await db.query("UPDATE objet SET integrite = 100 WHERE id = $1", [contrat.objet_id]);
    const res = await db.query(
      "UPDATE contrat_reparation SET statut = 'livré', livre_le = now() WHERE id = $1 RETURNING *",
      [id],
    );
    return res.rows[0];
  });

  // Annuler un contrat en cours : la Station rend la moitié du coût.
  app.post("/contrats-reparation/:id/annulation", async (request: FastifyRequest, reply) => {
    await request.jwtVerify();
    const { id } = request.params as any;
    const contrat = (await db.query("SELECT * FROM contrat_reparation WHERE id = $1", [id])).rows[0];
    if (!contrat || contrat.joueur_id !== (request.user as any).sub) {
      return reply.status(404).send({ erreur: "Contrat introuvable" });
    }
    if (contrat.statut !== "en cours") {
      return reply.status(409).send({ erreur: `Ce contrat est déjà ${contrat.statut}` });
    }
    const rembourse = Math.floor(contrat.cout / 2);
    await db.query("UPDATE joueur SET credits = credits + $1 WHERE id = $2", [rembourse, contrat.joueur_id]);
    const res = await db.query("UPDATE contrat_reparation SET statut = 'annulé' WHERE id = $1 RETURNING *", [id]);
    return { ...res.rows[0], rembourse };
  });
}
