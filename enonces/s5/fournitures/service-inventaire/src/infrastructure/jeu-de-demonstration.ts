import type { JoueurId, ObjetId } from "../domain/identifiants.ts";

// Le jeu de démonstration de l'Inventaire : les huit Objets du jeu de démonstration du Service Bourse, chez les
// mêmes Joueurs. Chargé au démarrage si l'Inventaire est vide.
export const OBJETS: Array<{ id: ObjetId; nom: string; proprietaireId: JoueurId }> = [
  { id: "o-bobine-zephyr", nom: "Bobine de plasma", proprietaireId: "zephyr" },
  { id: "o-pile-zephyr", nom: "Pile isotopique", proprietaireId: "zephyr" },
  { id: "o-module-kessa", nom: "Module de bouclier", proprietaireId: "kessa" },
  { id: "o-carte-kessa", nom: "Carte de navigation", proprietaireId: "kessa" },
  { id: "o-reacteur-rivet", nom: "Réacteur compact", proprietaireId: "rivet" },
  { id: "o-foreuse-rivet", nom: "Foreuse thermique", proprietaireId: "rivet" },
  { id: "o-boite-lyra", nom: "Boîte noire", proprietaireId: "lyra" },
  { id: "o-gyroscope-lyra", nom: "Gyroscope stellaire", proprietaireId: "lyra" },
];

type DepotAmorcable = {
  objet(id: ObjetId): Promise<unknown>;
  ajouterObjet(objet: { id: ObjetId; nom: string; proprietaireId: JoueurId }): Promise<void>;
};

export async function amorcerSiVide(objets: DepotAmorcable): Promise<boolean> {
  if (await objets.objet(OBJETS[0].id)) return false;
  for (const objet of OBJETS) await objets.ajouterObjet(objet);
  return true;
}
