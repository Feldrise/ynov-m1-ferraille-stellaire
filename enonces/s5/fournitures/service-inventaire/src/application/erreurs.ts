// Les erreurs propres aux use cases de l'Inventaire. Ce ne sont pas des règles du jeu.

export class ObjetIntrouvable extends Error {
  constructor(objetId: string) {
    super(`Aucun Objet ${objetId} dans l'Inventaire`);
    this.name = new.target.name;
  }
}

// Levée par le dépôt quand la clé de déduplication est déjà enregistrée : une autre livraison du même message
// est passée entre la vérification et l'écriture.
export class VenteDejaTraitee extends Error {
  constructor(cle: string) {
    super(`La Vente conclue ${cle} a déjà été traitée`);
    this.name = new.target.name;
  }
}
