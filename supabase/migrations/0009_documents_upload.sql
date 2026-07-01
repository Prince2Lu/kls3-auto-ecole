-- EPIC 2 : upload documents élève (Storage + colonnes documents)

-- Colonne tenant_id (dénormalisation pour RLS directe)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

UPDATE documents d
SET tenant_id = s.tenant_id
FROM students s
WHERE d.student_id = s.id
  AND d.tenant_id IS NULL;

ALTER TABLE documents
  ALTER COLUMN tenant_id SET NOT NULL;

-- Colonnes Storage / métadonnées fichier
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes INTEGER;

-- uploaded_at existe déjà (0001) ; garantir le type si besoin
ALTER TABLE documents
  ALTER COLUMN uploaded_at TYPE TIMESTAMPTZ USING uploaded_at;

-- Un seul document actif par (student_id, type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_student_type
  ON documents(student_id, type);

-- RLS : remplacer les policies via students par policy directe tenant_id
DROP POLICY IF EXISTS "Members can view own tenant documents" ON documents;
DROP POLICY IF EXISTS "Members can manage own tenant documents" ON documents;
DROP POLICY IF EXISTS "collaborateurs_tenant_documents" ON documents;

CREATE POLICY "collaborateurs_tenant_documents" ON documents
  FOR ALL
  USING (tenant_id IN (SELECT * FROM get_my_tenant_ids()));

-- Bucket Storage privé pour les pièces élèves
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents-eleves',
  'documents-eleves',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[];

-- Magic link de démo pour Lucas Martin (tests locaux)
INSERT INTO magic_links (tenant_id, student_id, token, expires_at)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000002',
  'demo-lucas-wagner-local-dev-only',
  now() + INTERVAL '30 days'
)
ON CONFLICT (token) DO NOTHING;
