-- US2bis : représentant légal d'un élève mineur — profil léger, un seul
-- par élève. Ses pièces (CNI, justificatif de domicile) restent dans la
-- table documents existante, rattachées à student_id comme tout le reste
-- (types dédiés cni_representant/domicile_representant — décision actée
-- le 13 juillet 2026, cf. session technique dédiée).

CREATE TABLE representants_legaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul représentant par élève (décision actée)
CREATE UNIQUE INDEX idx_representants_legaux_student_id
  ON representants_legaux(student_id);

ALTER TABLE representants_legaux ENABLE ROW LEVEL SECURITY;

-- Même pattern que documents/ocr_extractions (0009/0013) : policy directe
-- tenant_id, pas de sous-requête via students.
CREATE POLICY "collaborateurs_tenant_representants_legaux"
  ON representants_legaux FOR ALL
  USING (tenant_id IN (SELECT * FROM get_my_tenant_ids()));

-- Pas de policy publique : l'écriture depuis /dossier passe par le Server
-- Action avec createAdminClient() (service role, bypasse RLS), même
-- pattern que uploadDocument existant.
