-- Ajouter les colonnes de configuration email et relance sur tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS email_expediteur TEXT,
  ADD COLUMN IF NOT EXISTS relance_delai_jours INTEGER NOT NULL DEFAULT 3;

-- Table magic_links pour les tokens élève
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Les collaborateurs du tenant peuvent lire les magic links de leurs élèves
CREATE POLICY "tenant_members_read_magic_links"
  ON magic_links FOR SELECT
  USING (tenant_id IN (SELECT * FROM get_my_tenant_ids()));

-- Accès public en lecture pour validation du token : via API route avec service role key uniquement
-- Pas de policy publique sur cette table

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_student_id ON magic_links(student_id);
