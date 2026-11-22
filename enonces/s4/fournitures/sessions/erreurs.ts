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

// Les refus de l'ouverture et du renouvellement de session. Ce ne sont pas des règles du jeu : elles vivent ici,
// et l'adapter HTTP en fait des 401.
export class IdentifiantsIncorrects extends Error {
  constructor() {
    super("Pseudo ou mot de passe incorrect");
    this.name = new.target.name;
  }
}

export class RefreshTokenRefuse extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
