import type { CriteresDesAnnonces, DepotAnnonces, PageDAnnonces } from "../../application/ports/depot-annonces.ts";
import { Annonce, type StatutAnnonce } from "../../domain/annonce.ts";
import { Credits } from "../../domain/credits.ts";
import type { AnnonceId, ObjetId } from "../../domain/identifiants.ts";
import type { Objet } from "../../domain/objet.ts";
import type { VenteConclue } from "../../domain/vente-conclue.ts";
import type { Cache } from "./cache.ts";

// La durée de vie d'une page en cache : la borne de ce qu'une invalidation perdue peut coûter.
export const DUREE_DE_VIE_EN_SECONDES = 30;

type AnnonceEnCache = { id: AnnonceId; objetId: ObjetId; vendeurId: string; prix: number; statut: StatutAnnonce };

// Le cache de la liste des Annonces, en cache-aside, derrière le port DepotAnnonces : il enveloppe un autre
// dépôt (PostgreSQL), et la racine de composition le branche à sa place. Les use cases n'en savent rien.
// Invalidation par version : chaque mise en vente ou vente change la version, et les pages de l'ancienne version
// ne sont plus jamais lues (elles expirent seules).
export class DepotAnnoncesAvecCache implements DepotAnnonces {
  readonly #source: DepotAnnonces;
  readonly #cache: Cache;
  readonly #prefixe: string;

  constructor(source: DepotAnnonces, cache: Cache, prefixe = "bourse") {
    this.#source = source;
    this.#cache = cache;
    this.#prefixe = `${prefixe}:annonces`;
  }

  // Cache-aside : lire le cache ; s'il n'a rien, lire la source, et garder ce qu'elle a rendu.
  // À écrire (étape 3) : la clé de la page (le préfixe, la version, prixMax, limite et décalage), puis le cache,
  // sinon la source, dont la page est gardée DUREE_DE_VIE_EN_SECONDES. versLeCache et depuisLeCache sont en bas.
  async annoncesActives(criteres: CriteresDesAnnonces): Promise<PageDAnnonces> {
    return this.#source.annoncesActives(criteres);
  }

  // À écrire (étape 4) : une mise en vente ou une vente change la liste. Que faut-il faire, et quand ?
  async enregistrerMiseEnVente(annonce: Annonce): Promise<void> {
    await this.#source.enregistrerMiseEnVente(annonce);
  }

  async enregistrerVente(vente: VenteConclue): Promise<void> {
    await this.#source.enregistrerVente(vente);
  }

  // Hors du port : la racine de composition l'appelle aussi au démarrage, car Redis survit à un redémarrage du
  // service, et la base a pu changer entre-temps (--reinitialiser).
  async invalider(): Promise<void> {
    await this.#cache.incrementer(`${this.#prefixe}:version`);
  }

  // Le reste passe tel quel : une Annonce ou un Objet se lit toujours à la source, à jour.
  nouvelIdentifiant(): AnnonceId {
    return this.#source.nouvelIdentifiant();
  }

  objet(id: ObjetId): Promise<Objet | undefined> {
    return this.#source.objet(id);
  }

  annonce(id: AnnonceId): Promise<Annonce | undefined> {
    return this.#source.annonce(id);
  }
}

// Une page d'Annonces en JSON, et retour : les entités se reconstituent, avec leurs règles.
function versLeCache(page: PageDAnnonces): string {
  const annonces: AnnonceEnCache[] = page.annonces.map((a) => ({ id: a.id, objetId: a.objetId, vendeurId: a.vendeurId, prix: a.prix.montant, statut: a.statut }));
  return JSON.stringify({ annonces, total: page.total });
}

function depuisLeCache(json: string): PageDAnnonces {
  const { annonces, total } = JSON.parse(json) as { annonces: AnnonceEnCache[]; total: number };
  return { annonces: annonces.map((a) => Annonce.reconstituer({ ...a, prix: Credits.de(a.prix) })), total };
}
