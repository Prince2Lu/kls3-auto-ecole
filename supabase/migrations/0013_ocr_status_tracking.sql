-- US15/US16 : suivi de statut OCR
--
-- ocr_extractions n'avait pas bougé depuis 0001_init.sql : pas de tenant_id
-- dénormalisé (contrairement à documents/reminders depuis 0009/0012), et
-- surtout aucune colonne de statut permettant de distinguer les 4 états
-- requis par US16 :
--   pending                 -> en attente de confirmation secrétaire (1 clic)
--   failed_student_action   -> échec OCR, élève invité à retéléverser (US8)
--   failed_secretary_entry  -> échec après plusieurs tentatives, saisie
--                              manuelle secrétaire en dernier recours (US16)
--   validated                -> confirmé (par OCR+checksum ou saisie manuelle)

ALTER TABLE ocr_extractions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS entry_method TEXT NOT NULL DEFAULT 'ocr',
  -- Symétrique à iban_checksum_valid, pour la CNI (checksum MRZ ICAO 9303
  -- quand la zone MRZ est lisible ; NULL si repli texte libre sans MRZ).
  ADD COLUMN IF NOT EXISTS mrz_checksum_valid BOOLEAN;

-- Backfill tenant_id et document_type depuis documents (même pattern que 0009)
UPDATE ocr_extractions oe
SET tenant_id = d.tenant_id,
    document_type = d.type
FROM documents d
WHERE oe.document_id = d.id
  AND oe.tenant_id IS NULL;

-- Backfill status pour les lignes seedées/existantes déjà validées
UPDATE ocr_extractions
SET status = 'validated'
WHERE validated_at IS NOT NULL
  AND status = 'pending';

ALTER TABLE ocr_extractions
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN document_type SET NOT NULL;

ALTER TABLE ocr_extractions
  ADD CONSTRAINT ocr_extractions_status_check
    CHECK (status IN ('pending', 'failed_student_action', 'failed_secretary_entry', 'validated')),
  ADD CONSTRAINT ocr_extractions_entry_method_check
    CHECK (entry_method IN ('ocr', 'manual'));

-- Une seule extraction active par document : un re-upload met à jour la même
-- ligne (upsert onConflict document_id) plutôt que d'en empiler de nouvelles.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ocr_extractions_document_id
  ON ocr_extractions(document_id);

CREATE INDEX IF NOT EXISTS idx_ocr_extractions_tenant_status
  ON ocr_extractions(tenant_id, status);

-- RLS : remplacer les policies à triple jointure (document_id -> documents ->
-- students) par une policy directe tenant_id, cohérent avec 0009/0012.
DROP POLICY IF EXISTS "Members can view own tenant ocr extractions" ON ocr_extractions;
DROP POLICY IF EXISTS "Members can manage own tenant ocr extractions" ON ocr_extractions;

CREATE POLICY "collaborateurs_tenant_ocr_extractions" ON ocr_extractions
  FOR ALL
  USING (tenant_id IN (SELECT * FROM get_my_tenant_ids()));
