-- Schéma du Legacy de Ferraille Stellaire. Rejoué à chaque `npm run up` et `npm run reinitialiser`.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS assurance_cargaison, contrat_reparation, file_matchmaking, expedition, vente, annonce, objet, joueur, epave, station CASCADE;

CREATE TABLE station (
  id text PRIMARY KEY,
  nom text NOT NULL,
  tarif_reparation integer NOT NULL
);

CREATE TABLE epave (
  id text PRIMARY KEY,
  nom text NOT NULL,
  genre text NOT NULL
);

CREATE TABLE joueur (
  id serial PRIMARY KEY,
  pseudo text NOT NULL UNIQUE,
  mot_de_passe text NOT NULL,
  credits integer NOT NULL DEFAULT 500,
  inscrit_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE objet (
  id serial PRIMARY KEY,
  nom text NOT NULL,
  integrite integer NOT NULL,
  proprietaire_id integer REFERENCES joueur (id),
  epave_id text REFERENCES epave (id),
  trouve_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE annonce (
  id serial PRIMARY KEY,
  objet_id integer NOT NULL REFERENCES objet (id),
  vendeur_id integer NOT NULL REFERENCES joueur (id),
  prix integer NOT NULL,
  statut text NOT NULL DEFAULT 'active',
  creee_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vente (
  id serial PRIMARY KEY,
  annonce_id integer NOT NULL REFERENCES annonce (id),
  objet_id integer NOT NULL REFERENCES objet (id),
  vendeur_id integer NOT NULL REFERENCES joueur (id),
  acheteur_id integer NOT NULL REFERENCES joueur (id),
  prix integer NOT NULL,
  taxe integer NOT NULL,
  conclue_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expedition (
  id serial PRIMARY KEY,
  joueur_id integer NOT NULL REFERENCES joueur (id),
  epave_id text NOT NULL REFERENCES epave (id),
  extrait boolean NOT NULL,
  partie_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE file_matchmaking (
  joueur_id integer PRIMARY KEY REFERENCES joueur (id),
  epave_id text NOT NULL REFERENCES epave (id),
  entre_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contrat_reparation (
  id serial PRIMARY KEY,
  objet_id integer NOT NULL REFERENCES objet (id),
  joueur_id integer NOT NULL REFERENCES joueur (id),
  station_id text NOT NULL REFERENCES station (id),
  cout integer NOT NULL,
  statut text NOT NULL DEFAULT 'en cours',
  ouvert_le timestamptz NOT NULL DEFAULT now(),
  livre_le timestamptz
);

CREATE TABLE assurance_cargaison (
  id serial PRIMARY KEY,
  objet_id integer NOT NULL REFERENCES objet (id),
  joueur_id integer NOT NULL REFERENCES joueur (id),
  valeur_declaree integer NOT NULL,
  prime integer NOT NULL,
  statut text NOT NULL DEFAULT 'active',
  souscrite_le timestamptz NOT NULL DEFAULT now(),
  indemnisee_le timestamptz
);
