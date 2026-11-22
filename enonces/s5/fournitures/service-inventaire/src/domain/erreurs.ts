// Les erreurs du Domain de l'Inventaire : chacune nomme une règle qui vient d'être refusée.

export class ErreurDuDomaine extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class VenteDUnAutreObjet extends ErreurDuDomaine {
  constructor(objetId: string, venduId: string) {
    super(`La Vente conclue porte sur l'Objet ${venduId}, pas sur ${objetId}`);
  }
}
