import type { FastifyInstance } from "fastify";
import { db } from "../db.ts";

export default async function routesClassements(app: FastifyInstance) {
  app.get("/classements/extractions", async () => {
    const res = await db.query(
      `SELECT j.pseudo, count(*) FILTER (WHERE x.extrait) AS extractions, count(*) AS expeditions
         FROM expedition x JOIN joueur j ON j.id = x.joueur_id
        GROUP BY j.pseudo ORDER BY extractions DESC, expeditions ASC LIMIT 10`,
    );
    return res.rows;
  });

  // Les meilleurs revendeurs : ce que la Bourse aux épaves leur a rapporté, taxe déduite.
  app.get("/classements/bourse", async () => {
    const res = await db.query(
      `SELECT j.pseudo, count(*) AS ventes, sum(v.prix - v.prix * 5 / 100) AS gains
         FROM vente v JOIN joueur j ON j.id = v.vendeur_id
        GROUP BY j.pseudo ORDER BY gains DESC LIMIT 10`,
    );
    return res.rows;
  });
}
