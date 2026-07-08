-- US18 : OAuth Google Drive par tenant + arborescence de dossiers par
-- élève (un dossier élève contenant deux sous-dossiers "ANTS" et
-- "Facturation" — décision actée le 6 juillet 2026, cohérente avec la
-- catégorisation documents.category posée en migration 0015).

-- Tokens OAuth Drive, un jeu par tenant. Le refresh token est chiffré
-- côté application (AES-256-GCM, voir lib/drive/crypto.ts) avant
-- stockage — jamais en clair, c'est une donnée qui donne accès complet
-- au Drive du client. Le champ contient le texte chiffré encodé, pas le
-- token lui-même.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS drive_refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS drive_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drive_connected_by UUID REFERENCES auth.users(id);

-- Dossier Drive racine du tenant existe déjà (google_drive_folder_id,
-- migration 0001) — c'est le dossier choisi par le client à la connexion
-- OAuth, ou créé automatiquement à la racine de son Drive si non précisé.

-- Un dossier par élève, avec ses deux sous-dossiers ANTS/Facturation.
-- Trois IDs Drive distincts : le dossier élève lui-même (parent des deux
-- autres) et les deux sous-dossiers, pour éviter de les re-résoudre par
-- nom à chaque transfert (recherche par nom dans Drive est fragile et
-- coûteuse en appels API).
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS drive_student_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_ants_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_facturation_folder_id TEXT;

-- Trace des transferts individuels (id fichier Drive par document) pour
-- audit et pour éviter un re-transfert accidentel si la validation est
-- retentée après un échec partiel.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_transferred_at TIMESTAMPTZ;

-- Note : documents.drive_file_id existait déjà dans le schéma 0001
-- d'origine (jamais exploité en pratique) ; ADD COLUMN IF NOT EXISTS est
-- donc un no-op si déjà présent, sans risque de doublon de colonne.
