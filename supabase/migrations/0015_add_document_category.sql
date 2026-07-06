-- US24/US18 : catégorisation des documents — pièces réglementaires ANTS
-- (à transmettre au client via le transfert Drive, US18) vs pièce de
-- facturation KLS3 (le RIB, qui n'apparaît dans aucune liste réglementaire
-- ANTS et suit un chemin distinct dans le transfert Drive : deux
-- sous-dossiers séparés, "ANTS" et "Facturation" — décision actée le
-- 6 juillet 2026).
--
-- Colonne en base (pas dérivée en code) : une donnée structurante qui
-- conditionne le transfert Drive et potentiellement l'export CSV mérite
-- d'être requêtable directement en SQL, sans dépendre du code applicatif.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill des lignes existantes selon le type de document. Mapping fixe,
-- pas de saisie manuelle possible : un type donné a toujours la même
-- catégorie (ex. le RIB n'est jamais une pièce ANTS, quel que soit le
-- tenant ou le contexte).
UPDATE documents
SET category = CASE
  WHEN type = 'rib' THEN 'facturation_kls3'
  ELSE 'ants'
END
WHERE category IS NULL;

ALTER TABLE documents
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN category SET DEFAULT 'ants';

ALTER TABLE documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('ants', 'facturation_kls3'));
