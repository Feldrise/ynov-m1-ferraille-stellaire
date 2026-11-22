import type { DepotAnnonces } from "../application/ports/depot-annonces.ts";
import type { PorteMonnaie } from "../application/ports/porte-monnaie.ts";
import { Credits } from "../domain/credits.ts";
import type { JoueurId, ObjetId } from "../domain/identifiants.ts";

// Le jeu de démonstration du Service Bourse : quatre Joueurs du Legacy, leurs Crédits, huit Objets et quatre
// Annonces actives aux identifiants lisibles, pour essayer l'API dans Swagger UI. Chargé au démarrage si la
// Bourse est vide ; npm run jeton -- <Joueur> donne un jeton d'accès pour l'un d'eux.

export const CREDITS: Record<JoueurId, number> = { kessa: 300, lyra: 1000, rivet: 800, zephyr: 500 };

export const OBJETS: Array<{ id: ObjetId; nom: string; proprietaireId: JoueurId; prix?: number }> = [
  { id: "o-bobine-zephyr", nom: "Bobine de plasma", proprietaireId: "zephyr", prix: 120 },
  { id: "o-pile-zephyr", nom: "Pile isotopique", proprietaireId: "zephyr" },
  { id: "o-module-kessa", nom: "Module de bouclier", proprietaireId: "kessa", prix: 340 },
  { id: "o-carte-kessa", nom: "Carte de navigation", proprietaireId: "kessa" },
  { id: "o-reacteur-rivet", nom: "Réacteur compact", proprietaireId: "rivet", prix: 650 },
  { id: "o-foreuse-rivet", nom: "Foreuse thermique", proprietaireId: "rivet" },
  { id: "o-boite-lyra", nom: "Boîte noire", proprietaireId: "lyra", prix: 90 },
  { id: "o-gyroscope-lyra", nom: "Gyroscope stellaire", proprietaireId: "lyra" },
];

type DepotAmorcable = DepotAnnonces & { ajouterObjet(objet: { id: ObjetId; nom: string; proprietaireId: JoueurId }): Promise<void> };

export async function amorcerSiVide(adapters: { annonces: DepotAmorcable; porteMonnaie: PorteMonnaie }): Promise<boolean> {
  const { annonces, porteMonnaie } = adapters;
  if (await annonces.objet(OBJETS[0].id)) return false;
  for (const [joueurId, credits] of Object.entries(CREDITS)) {
    await porteMonnaie.crediter(joueurId, Credits.de(credits));
  }
  for (const { prix, ...objet } of OBJETS) {
    await annonces.ajouterObjet(objet);
    if (prix !== undefined) {
      // L'Annonce naît par l'Objet, comme dans le use case, avec un identifiant lisible : a-bobine-zephyr...
      const annonce = (await annonces.objet(objet.id))!.mettreEnVente({ annonceId: objet.id.replace(/^o-/, "a-"), vendeurId: objet.proprietaireId, prix: Credits.de(prix) });
      await annonces.enregistrerMiseEnVente(annonce);
    }
  }
  return true;
}
