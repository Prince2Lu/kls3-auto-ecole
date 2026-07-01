-- US17 : traçabilité validation dossier par la secrétaire

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_students_validated_by ON students(validated_by);

-- Affichage du nom du collaborateur validateur (lecture auth.users, security definer)
CREATE OR REPLACE FUNCTION get_auth_user_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1)
  )::text
  FROM auth.users u
  WHERE u.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION get_auth_user_display_name(uuid) TO authenticated;
