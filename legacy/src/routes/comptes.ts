import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db.ts";

export default async function routesComptes(app: FastifyInstance) {
  app.post("/inscription", async (request, reply) => {
    const { pseudo, motDePasse } = request.body as any;
    const existe = await db.query("SELECT id FROM joueur WHERE pseudo = $1", [pseudo]);
    if (existe.rows.length > 0) {
      return reply.status(409).send({ erreur: "Pseudo déjà pris" });
    }
    const res = await db.query(
      "INSERT INTO joueur (pseudo, mot_de_passe, credits) VALUES ($1, crypt($2, gen_salt('bf', 6)), 500) RETURNING id, pseudo, credits",
      [pseudo, motDePasse],
    );
    return reply.status(201).send(res.rows[0]);
  });

  app.post("/connexion", async (request, reply) => {
    const { pseudo, motDePasse } = request.body as any;
    const res = await db.query(
      "SELECT id, pseudo, credits FROM joueur WHERE pseudo = $1 AND mot_de_passe = crypt($2, mot_de_passe)",
      [pseudo, motDePasse],
    );
    if (res.rows.length === 0) {
      return reply.status(401).send({ erreur: "Pseudo ou mot de passe incorrect" });
    }
    const joueur = res.rows[0];
    const jeton = app.jwt.sign({ sub: joueur.id, pseudo: joueur.pseudo });
    return { jeton, joueur };
  });

  app.get("/moi", async (request: FastifyRequest) => {
    await request.jwtVerify();
    const id = (request.user as any).sub;
    const res = await db.query("SELECT id, pseudo, credits, inscrit_le FROM joueur WHERE id = $1", [id]);
    return res.rows[0];
  });
}
