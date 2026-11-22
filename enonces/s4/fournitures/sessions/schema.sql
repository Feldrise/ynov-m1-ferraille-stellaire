-- Tables du Service Bourse, dans son propre schéma PostgreSQL : le Legacy garde les siennes.
-- Rejoué par installerSchema() ; les noms ne sont pas qualifiés, le search_path choisit le schéma.

CREATE TABLE IF NOT EXISTS objet (
  id text PRIMARY KEY,
  nom text NOT NULL,
  proprietaire_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS annonce (
  id text PRIMARY KEY,
  objet_id text NOT NULL REFERENCES objet (id),
  vendeur_id text NOT NULL,
  prix integer NOT NULL CHECK (prix > 0),
  statut text NOT NULL CHECK (statut IN ('active', 'vendue', 'retiree')),
  creee_le timestamptz NOT NULL DEFAULT now()
);

-- Une seule Annonce active par Objet, garantie par la base même sous deux insertions simultanées.
CREATE UNIQUE INDEX IF NOT EXISTS annonce_active_par_objet ON annonce (objet_id) WHERE statut = 'active';

-- Une Annonce ne se vend qu'une fois : au plus une Vente conclue par Annonce.
CREATE TABLE IF NOT EXISTS vente (
  annonce_id text PRIMARY KEY REFERENCES annonce (id),
  objet_id text NOT NULL REFERENCES objet (id),
  vendeur_id text NOT NULL,
  acheteur_id text NOT NULL,
  prix integer NOT NULL,
  taxe integer NOT NULL,
  net_vendeur integer NOT NULL,
  conclue_le timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS porte_monnaie (
  joueur_id text PRIMARY KEY,
  credits integer NOT NULL CHECK (credits >= 0)
);

-- Les sessions (Séance 4) : une famille de refresh tokens par session ouverte. Révoquer la famille ferme la
-- session, refresh tokens à venir compris.
CREATE TABLE IF NOT EXISTS session (
  famille text PRIMARY KEY,
  joueur_id text NOT NULL,
  ouverte_le timestamptz NOT NULL DEFAULT now(),
  revoquee boolean NOT NULL DEFAULT false
);

-- Un refresh token par ligne, connu par son empreinte SHA-256 : la valeur elle-même n'est jamais écrite.
CREATE TABLE IF NOT EXISTS refresh_token (
  empreinte text PRIMARY KEY,
  famille text NOT NULL REFERENCES session (famille),
  expire_le timestamptz NOT NULL,
  utilise boolean NOT NULL DEFAULT false
);
