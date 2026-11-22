// Les erreurs propres aux use cases : ce qu'on cherche n'existe pas. Ce ne sont pas des règles du jeu,
// donc elles ne vivent pas dans le Domain ; l'adapter HTTP (Séance 3) en fera des 404.
export class Introuvable extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AnnonceIntrouvable extends Introuvable {
  constructor(annonceId: string) {
    super(`Aucune Annonce ${annonceId} sur la Bourse aux épaves`);
  }
}

export class ObjetIntrouvable extends Introuvable {
  constructor(objetId: string) {
    super(`Aucun Objet ${objetId} connu de la Bourse aux épaves`);
  }
}
