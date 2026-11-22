-- Tables du Service Inventaire, dans son propre schéma PostgreSQL. Rejoué par installerSchema().

-- Un Objet appartient à un seul Joueur.
CREATE TABLE IF NOT EXISTS objet (
  id text PRIMARY KEY,
  nom text NOT NULL,
  proprietaire_id text NOT NULL
);

-- Les Ventes conclues déjà appliquées, par clé de déduplication (l'Annonce). La clé primaire refuse la seconde.
CREATE TABLE IF NOT EXISTS vente_traitee (
  cle text PRIMARY KEY,
  traitee_le timestamptz NOT NULL DEFAULT now()
);
