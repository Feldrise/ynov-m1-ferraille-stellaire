import { AcheterUneAnnonce } from "../application/acheter-une-annonce.ts";
import { ConsulterUneAnnonce } from "../application/consulter-une-annonce.ts";
import { FermerLaSession } from "../application/fermer-la-session.ts";
import { ListerLesAnnonces } from "../application/lister-les-annonces.ts";
import { MettreEnVente } from "../application/mettre-en-vente.ts";
import { OuvrirUneSession } from "../application/ouvrir-une-session.ts";
import type { Comptes } from "../application/ports/comptes.ts";
import type { DepotAnnonces } from "../application/ports/depot-annonces.ts";
import type { DepotSessions } from "../application/ports/depot-sessions.ts";
import type { FabriqueDeJetons } from "../application/ports/fabrique-de-jetons.ts";
import type { Horloge } from "../application/ports/horloge.ts";
import type { PorteMonnaie } from "../application/ports/porte-monnaie.ts";
import { RenouvelerLaSession } from "../application/renouveler-la-session.ts";
import type { Cache } from "./cache/cache.ts";
import { DepotAnnoncesAvecCache } from "./cache/depot-annonces-avec-cache.ts";
import { HorlogeSysteme } from "./horloge-systeme.ts";
import { ComptesEnMemoire } from "./memoire/comptes-en-memoire.ts";
import { DepotAnnoncesEnMemoire } from "./memoire/depot-annonces-en-memoire.ts";
import { DepotSessionsEnMemoire } from "./memoire/depot-sessions-en-memoire.ts";
import { PorteMonnaieEnMemoire } from "./memoire/porte-monnaie-en-memoire.ts";
import { ComptesDuLegacy } from "./postgres/comptes-du-legacy.ts";
import { creerBase, installerSchema } from "./postgres/connexion.ts";
import { DepotAnnoncesPostgres } from "./postgres/depot-annonces-postgres.ts";
import { DepotSessionsPostgres } from "./postgres/depot-sessions-postgres.ts";
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

// Les use cases des sessions (Séance 4), assemblés à part : ils ont leurs propres ports.
export type ServiceSessions = {
  ouvrir: OuvrirUneSession;
  renouveler: RenouvelerLaSession;
  fermer: FermerLaSession;
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

export function composerLesSessions(adapters: { comptes: Comptes; sessions: DepotSessions; jetons: FabriqueDeJetons; horloge?: Horloge }): ServiceSessions {
  const ports = { ...adapters, horloge: adapters.horloge ?? new HorlogeSysteme() };
  return { ouvrir: new OuvrirUneSession(ports), renouveler: new RenouvelerLaSession(ports), fermer: new FermerLaSession(ports) };
}

export function composerEnMemoire(horloge?: Horloge) {
  const annonces = new DepotAnnoncesEnMemoire();
  const porteMonnaie = new PorteMonnaieEnMemoire();
  return { ...composer({ annonces, porteMonnaie, horloge }), annonces, porteMonnaie };
}

// Les sessions en mémoire : les Joueurs donnés, avec leurs mots de passe ; jetons, ceux de l'adapter HTTP.
export function composerLesSessionsEnMemoire(jetons: FabriqueDeJetons, motsDePasse: Record<string, string>, horloge?: Horloge) {
  const sessions = new DepotSessionsEnMemoire();
  return { ...composerLesSessions({ comptes: new ComptesEnMemoire(motsDePasse), sessions, jetons, horloge }), depot: sessions };
}

// Avec un cache (Redis en production), la liste des Annonces passe par lui : le dépôt PostgreSQL est enveloppé
// par le dépôt avec cache, et les use cases reçoivent l'enveloppe sans le savoir.
export async function composerAvecPostgres(url: string, schema = "bourse", horloge?: Horloge, debutDuCycle?: Date, cache?: Cache) {
  await installerSchema(url, schema);
  const db = creerBase(url, schema);
  const annonces = new DepotAnnoncesPostgres(db);
  const porteMonnaie = new PorteMonnaiePostgres(db);
  let depot: DepotAnnonces = annonces;
  if (cache) {
    const avecCache = new DepotAnnoncesAvecCache(annonces, cache, schema);
    await avecCache.invalider();
    depot = avecCache;
  }
  return { ...composer({ annonces: depot, porteMonnaie, horloge, debutDuCycle }), annonces, porteMonnaie, db, fermer: () => db.destroy() };
}

// Les sessions sur PostgreSQL : les refresh tokens dans le schéma du Service Bourse, les comptes dans le Legacy.
export function composerLesSessionsAvecPostgres(db: ReturnType<typeof creerBase>, jetons: FabriqueDeJetons) {
  return composerLesSessions({ comptes: new ComptesDuLegacy(db), sessions: new DepotSessionsPostgres(db), jetons });
}
