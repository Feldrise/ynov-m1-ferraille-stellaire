// Port sortant : l'heure qu'il est. Le use case ne lit jamais l'horloge du système lui-même :
// un test fixe l'instant, par exemple pour se placer pendant le premier week-end du Cycle.
export interface Horloge {
  maintenant(): Date;
}
