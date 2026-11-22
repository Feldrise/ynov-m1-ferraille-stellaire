import { AcheterUneAnnonce } from "../application/acheter-une-annonce.ts";
import { ConsulterUneAnnonce } from "../application/consulter-une-annonce.ts";
import { ListerLesAnnonces } from "../application/lister-les-annonces.ts";
import { MettreEnVente } from "../application/mettre-en-vente.ts";
import type { DepotAnnonces } from "../application/ports/depot-annonces.ts";
import type { Horloge } from "../application/ports/horloge.ts";
import type { PorteMonnaie } from "../application/ports/porte-monnaie.ts";
import { HorlogeSysteme } from "./horloge-systeme.ts";
import { DepotAnnoncesEnMemoire } from "./memoire/depot-annonces-en-memoire.ts";
import { PorteMonnaieEnMemoire } from "./memoire/porte-monnaie-en-memoire.ts";
import { creerBase, installerSchema } from "./postgres/connexion.ts";
import { DepotAnnoncesPostgres } from "./postgres/depot-annonces-postgres.ts";
import { PorteMonnaiePostgres } from "./postgres/porte-monnaie-postgres.ts";

// La racine de composition : le seul endroit qui connaît à la fois les use cases et les adapters, et qui les
// branche. Pas de framework d'injection : des constructeurs, appelés ici.

// Début du Cycle 4 (Ticket du Game Designer de la Séance 1) : la valeur par défaut ; main.ts peut la remplacer
// par la variable DEBUT_DU_CYCLE.
export const DEBUT_DU_CYCLE = new Date("2026-12-04T18:00:00Z");

// Ce que le Service Bourse sait faire : ses use cases. L'adapter HTTP ne connaît que ce type.
export type ServiceBourse = {
  mettreEnVente: MettreEnVente;
  acheterUneAnnonce: AcheterUneAnnonce;
  listerLesAnnonces: ListerLesAnnonces;
  consulterUneAnnonce: ConsulterUneAnnonce;
};

export function composer(adapters: { annonces: DepotAnnonces; porteMonnaie: PorteMonnaie; horloge?: Horloge; debutDuCycle?: Date }): ServiceBourse {
  const horloge = adapters.horloge ?? new HorlogeSysteme();
  const { annonces, porteMonnaie } = adapters;
  return {
    mettreEnVente: new MettreEnVente({ annonces }),
    acheterUneAnnonce: new AcheterUneAnnonce({ annonces, porteMonnaie, horloge, debutDuCycle: adapters.debutDuCycle ?? DEBUT_DU_CYCLE }),
    listerLesAnnonces: new ListerLesAnnonces({ annonces }),
    consulterUneAnnonce: new ConsulterUneAnnonce({ annonces }),
  };
}

export function composerEnMemoire(horloge?: Horloge) {
  const annonces = new DepotAnnoncesEnMemoire();
  const porteMonnaie = new PorteMonnaieEnMemoire();
  return { ...composer({ annonces, porteMonnaie, horloge }), annonces, porteMonnaie };
}

export async function composerAvecPostgres(url: string, schema = "bourse", horloge?: Horloge, debutDuCycle?: Date) {
  await installerSchema(url, schema);
  const db = creerBase(url, schema);
  const annonces = new DepotAnnoncesPostgres(db);
  const porteMonnaie = new PorteMonnaiePostgres(db);
  return { ...composer({ annonces, porteMonnaie, horloge, debutDuCycle }), annonces, porteMonnaie, db, fermer: () => db.destroy() };
}
