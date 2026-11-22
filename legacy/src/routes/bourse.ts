import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db.ts";

const authentifier = async (request: FastifyRequest) => {
  await request.jwtVerify();
};

export default async function routesBourse(app: FastifyInstance) {
  // Liste des Annonces actives de la Bourse aux épaves, avec ce que touchera le vendeur
  // et le dernier prix auquel un Objet du même nom s'est vendu.
  app.get("/annonces", async () => {
    const annonces = await db.query("SELECT * FROM annonce WHERE statut = 'active' ORDER BY creee_le DESC");
    const resultat = [];
    for (const a of annonces.rows) {
      const objet = (await db.query("SELECT * FROM objet WHERE id = $1", [a.objet_id])).rows[0];
      const vendeur = (await db.query("SELECT pseudo FROM joueur WHERE id = $1", [a.vendeur_id])).rows[0];
      const dernier = await db.query(
        `SELECT v.prix FROM vente v JOIN objet o ON o.id = v.objet_id
          WHERE o.nom = $1 ORDER BY v.conclue_le DESC LIMIT 1`,
        [objet.nom],
      );
      resultat.push({
        id: a.id,
        objet: { id: objet.id, nom: objet.nom, integrite: objet.integrite },
        vendeur: vendeur.pseudo,
        prix: a.prix,
        prixNetVendeur: a.prix - Math.round(a.prix * 0.05),
        dernierPrixConnu: dernier.rows[0]?.prix ?? null,
        creeeLe: a.creee_le,
      });
    }
    return resultat;
  });

  app.get("/annonces/:id", async (request, reply) => {
    const { id } = request.params as any;
    const res = await db.query(
      `SELECT a.*, o.nom, o.integrite, j.pseudo AS vendeur
         FROM annonce a JOIN objet o ON o.id = a.objet_id JOIN joueur j ON j.id = a.vendeur_id
        WHERE a.id = $1`,
      [id],
    );
    if (res.rows.length === 0) return reply.status(404).send({ erreur: "Annonce introuvable" });
    return res.rows[0];
  });

  app.post("/annonces", { preHandler: authentifier }, async (request, reply) => {
    const vendeurId = (request.user as any).sub;
    const { objetId, prix } = request.body as any;
    const objet = (await db.query("SELECT * FROM objet WHERE id = $1", [objetId])).rows[0];
    if (!objet || objet.proprietaire_id !== vendeurId) {
      return reply.status(403).send({ erreur: "Cet Objet ne vous appartient pas" });
    }
    const dejaEnVente = await db.query("SELECT count(*) FROM annonce WHERE objet_id = $1 AND statut = 'active'", [objetId]);
    if (dejaEnVente.rows[0].count !== "0") {
      return reply.status(409).send({ erreur: "Cet Objet est déjà en vente" });
    }
    const res = await db.query(
      "INSERT INTO annonce (objet_id, vendeur_id, prix) VALUES ($1, $2, $3) RETURNING *",
      [objetId, vendeurId, prix],
    );
    return reply.status(201).send(res.rows[0]);
  });

  app.delete("/annonces/:id", { preHandler: authentifier }, async (request, reply) => {
    const { id } = request.params as any;
    const vendeurId = (request.user as any).sub;
    const res = await db.query(
      "UPDATE annonce SET statut = 'retiree' WHERE id = $1 AND vendeur_id = $2 AND statut = 'active' RETURNING *",
      [id, vendeurId],
    );
    if (res.rows.length === 0) return reply.status(404).send({ erreur: "Annonce introuvable" });
    return res.rows[0];
  });

  app.post("/annonces/:id/achat", { preHandler: authentifier }, async (request) => {
    const { id } = request.params as any;
    const { acheteurId } = request.body as any;

    const annonce = (await db.query("SELECT * FROM annonce WHERE id = $1 AND statut = 'active'", [id])).rows[0];
    if (!annonce) {
      throw new Error("Annonce introuvable ou déjà vendue");
    }
    if (annonce.vendeur_id === acheteurId) {
      throw new Error("Impossible d'acheter sa propre annonce");
    }
    const acheteur = (await db.query("SELECT * FROM joueur WHERE id = $1", [acheteurId])).rows[0];
    if (acheteur.credits < annonce.prix) {
      throw new Error("Crédits insuffisants");
    }

    const taxe = Math.floor((annonce.prix * 5) / 100);
    await db.query("UPDATE joueur SET credits = credits - $1 WHERE id = $2", [annonce.prix, acheteurId]);
    await db.query("UPDATE joueur SET credits = credits + $1 WHERE id = $2", [annonce.prix - taxe, annonce.vendeur_id]);
    await db.query("UPDATE objet SET proprietaire_id = $1 WHERE id = $2", [acheteurId, annonce.objet_id]);
    await db.query("UPDATE annonce SET statut = 'vendue' WHERE id = $1", [id]);
    const vente = await db.query(
      `INSERT INTO vente (annonce_id, objet_id, vendeur_id, acheteur_id, prix, taxe)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, annonce.objet_id, annonce.vendeur_id, acheteurId, annonce.prix, taxe],
    );
    return { message: "Vente conclue", vente: vente.rows[0] };
  });
}
