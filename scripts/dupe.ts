// La Dupe : deux Joueurs achètent la même Annonce au même instant.
// Usage : npm run dupe                 contre le Legacy (npm run legacy dans un autre terminal) ;
//         npm run dupe -- --bourse [URL] [--inventaire URL]
//                                      contre le Service Bourse (port 3100), puis, si le Service Inventaire répond
//                                      (port 3200), la Dupe de la Séance 5 : une Vente conclue relivrée après une
//                                      revente rend-elle l'Objet à son ancien acheteur ?
// Code retour : 0 si la Dupe a réussi (l'Objet est vendu ou possédé deux fois), 1 si elle a été empêchée, 2 si le
// contrôle est impossible (erreur, Service Inventaire injoignable avec --bourse).
import { chargerEnvironnement } from "./environnement.ts";

chargerEnvironnement();
const argument = (nom: string) => {
  const i = process.argv.indexOf(nom);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : undefined;
};
const BOURSE = process.argv.includes("--bourse");
const URL_BOURSE =
  argument("--bourse") ??
  process.env.DUPE_URL ??
  process.env.CIBLE_URL ??
  (BOURSE ? `http://127.0.0.1:${process.env.BOURSE_PORT ?? 3100}` : `http://127.0.0.1:${process.env.PORT ?? 3000}`);
const URL_INVENTAIRE = argument("--inventaire") ?? `http://127.0.0.1:${process.env.INVENTAIRE_PORT ?? 3200}`;
const ACHETEURS = ["zephyr", "lyra"];
const MOT_DE_PASSE = "ferraille";

async function appeler(methode: string, chemin: string, corps?: unknown, jeton?: string) {
  const reponse = await fetch(URL_BOURSE + chemin, {
    method: methode,
    headers: { ...(corps === undefined ? {} : { "content-type": "application/json" }), ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await reponse.text();
  let json: any = null;
  try {
    json = JSON.parse(texte);
  } catch {
    // corps non JSON
  }
  return { statut: reponse.status, json };
}

async function connecter(pseudo: string) {
  const r = await appeler("POST", "/connexion", { pseudo, motDePasse: MOT_DE_PASSE });
  if (r.statut !== 200) throw new Error(`connexion de ${pseudo} refusée (${r.statut})`);
  return { jeton: r.json.jeton as string, id: r.json.joueur.id as number };
}

async function tenter() {
  const acheteurs = await Promise.all(ACHETEURS.map(connecter));
  const annonces = await appeler("GET", "/annonces");
  const cible = (annonces.json as any[])
    .filter((a) => !ACHETEURS.includes(a.vendeur))
    .sort((a, b) => a.prix - b.prix)[0];
  if (!cible) throw new Error("aucune Annonce à acheter : rechargez les données (npm run reinitialiser)");

  console.log(`Annonce n° ${cible.id} : ${cible.objet.nom} (Objet n° ${cible.objet.id}), ${cible.prix} Crédits, vendue par ${cible.vendeur}`);
  console.log(`${ACHETEURS.join(" et ")} l'achètent au même instant...`);
  const reponses = await Promise.all(
    acheteurs.map((a) => appeler("POST", `/annonces/${cible.id}/achat`, { acheteurId: a.id }, a.jeton)),
  );
  reponses.forEach((r, i) => console.log(`  ${ACHETEURS[i]} : HTTP ${r.statut}${r.json?.message ? ` (${r.json.message})` : ""}`));
  return reponses.filter((r) => r.statut >= 200 && r.statut < 300).length;
}

// --- Contre le Service Bourse (Séances 3 à 5) ---

async function ouvrirUneSession(pseudo: string) {
  const r = await appeler("POST", "/sessions", { pseudo, motDePasse: MOT_DE_PASSE });
  if (r.statut !== 201) throw new Error(`session de ${pseudo} refusée (${r.statut})`);
  return { pseudo, jeton: r.json.jetonDAcces as string };
}

async function acheter(annonceId: string, jeton: string) {
  const r = await appeler("POST", `/annonces/${annonceId}/achat`, undefined, jeton);
  if (r.statut === 429) throw new Error("trop d'achats en dix secondes (429) : attendez dix secondes et relancez");
  return r;
}

// Le propriétaire d'un Objet selon le Service Inventaire ; undefined s'il ne répond pas.
async function proprietaire(objetId: string): Promise<string | undefined> {
  try {
    const r = await fetch(`${URL_INVENTAIRE}/objets/${objetId}`);
    return r.ok ? ((await r.json()) as { proprietaireId: string }).proprietaireId : undefined;
  } catch {
    return undefined;
  }
}

async function attendreLeProprietaire(objetId: string, attendu: string) {
  for (let i = 0; i < 50; i++) {
    if ((await proprietaire(objetId)) === attendu) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`après 10 secondes, l'Inventaire ne donne toujours pas l'Objet ${objetId} à ${attendu} : le Service Inventaire reçoit-il les Ventes conclues ?`);
}

// Ce que ferait le broker qui livre « au moins une fois » : la même Vente conclue, publiée une seconde fois.
async function relivrer(vente: Record<string, unknown>) {
  const amqp = (await import("amqplib")).default;
  const connexion = await amqp.connect(process.env.AMQP_URL ?? "amqp://guest:guest@127.0.0.1:5672");
  const canal = await connexion.createConfirmChannel();
  await canal.assertExchange("ferraille.bourse", "topic", { durable: true });
  canal.publish("ferraille.bourse", "vente.conclue", Buffer.from(JSON.stringify({ type: "VenteConclue", ...vente })), {
    persistent: true,
    messageId: crypto.randomUUID(),
    type: "VenteConclue",
    contentType: "application/json",
  });
  await canal.waitForConfirms();
  await connexion.close();
}

async function dupeContreLeServiceBourse(): Promise<number> {
  const acheteurs = await Promise.all(ACHETEURS.map(ouvrirUneSession));
  const liste = await appeler("GET", "/annonces?parPage=50");
  const cible = ((liste.json?.annonces ?? []) as Array<{ id: string; objetId: string; vendeurId: string; prix: number }>)
    .filter((a) => !ACHETEURS.includes(a.vendeurId))
    .sort((a, b) => a.prix - b.prix)[0];
  if (!cible) throw new Error("aucune Annonce à acheter : relancez le Service Bourse avec --reinitialiser");

  console.log(`Annonce ${cible.id} : Objet ${cible.objetId}, ${cible.prix} Crédits, vendue par ${cible.vendeurId}`);
  console.log(`${ACHETEURS.join(" et ")} l'achètent au même instant...`);
  const reponses = await Promise.all(acheteurs.map((a) => acheter(cible.id, a.jeton)));
  reponses.forEach((r, i) => console.log(`  ${ACHETEURS[i]} : HTTP ${r.statut}${r.json?.detail ? ` (${r.json.detail})` : ""}`));
  const gagnants = reponses.flatMap((r, i) => (r.statut === 201 ? [{ ...acheteurs[i], vente: r.json }] : []));
  if (gagnants.length >= 2) {
    console.log("\nLa Dupe a réussi : le même Objet a été vendu deux fois, et les deux acheteurs ont payé.");
    return 0;
  }
  if (gagnants.length === 0) throw new Error("aucun achat accepté : relancez le Service Bourse avec --reinitialiser");
  console.log("Un seul achat accepté : la Bourse ne vend l'Annonce qu'une fois.");

  // La Dupe de la Séance 5 : elle se joue entre les deux services.
  const [gagnant, perdant] = [gagnants[0], acheteurs.find((a) => a.pseudo !== gagnants[0].pseudo)!];
  if (!(await fetch(URL_INVENTAIRE).then(() => true, () => false))) {
    console.log(`\nService Inventaire injoignable sur ${URL_INVENTAIRE} : contrôle impossible. La Dupe entre les deux services`);
    console.log("(Séance 5) n'est pas jouée : lancez le Service Inventaire, puis relancez le script.");
    return 2;
  }
  console.log(`\nSéance 5 : ${gagnant.pseudo} revend l'Objet à ${perdant.pseudo}, puis le broker relivre la première Vente conclue...`);
  await attendreLeProprietaire(cible.objetId, gagnant.pseudo);
  const revente = await appeler("POST", "/annonces", { objetId: cible.objetId, prix: 100 }, gagnant.jeton);
  if (revente.statut !== 201) throw new Error(`remise en vente refusée (${revente.statut})`);
  const rachat = await acheter(revente.json.id, perdant.jeton);
  if (rachat.statut !== 201) throw new Error(`rachat refusé (${rachat.statut}${rachat.json?.detail ? ` : ${rachat.json.detail}` : ""})`);
  await attendreLeProprietaire(cible.objetId, perdant.pseudo);
  console.log(`  l'Inventaire donne l'Objet à ${perdant.pseudo} ; la première Vente conclue est publiée une seconde fois`);
  await relivrer(gagnant.vente);
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if ((await proprietaire(cible.objetId)) === gagnant.pseudo) {
      console.log(`\nLa Dupe a réussi : ${gagnant.pseudo} a récupéré l'Objet dans l'Inventaire, alors que ${perdant.pseudo} l'a payé sur la Bourse.`);
      return 0;
    }
  }
  console.log(`  l'Objet reste à ${perdant.pseudo} : la Vente conclue relivrée n'a rien changé`);
  console.log("\nLa Dupe a été empêchée : un seul achat accepté, et une Vente conclue relivrée ne s'applique pas deux fois.");
  return 1;
}

try {
  if (BOURSE) process.exit(await dupeContreLeServiceBourse());
  for (let essai = 1; essai <= 3; essai++) {
    const reussis = await tenter();
    if (reussis >= 2) {
      console.log("\nLa Dupe a réussi : le même Objet a été vendu deux fois, et les deux acheteurs ont payé.");
      process.exit(0);
    }
    console.log(`Essai ${essai} : un seul achat accepté.\n`);
  }
  console.log("La Dupe a été empêchée : un seul achat accepté à chaque essai.");
  process.exit(1);
} catch (e) {
  console.error(`Erreur : ${(e as Error).message} (adresse visée : ${URL_BOURSE})`);
  process.exit(2);
}
