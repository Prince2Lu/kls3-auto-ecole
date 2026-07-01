-- Statut intermédiaire : tous les documents reçus, en attente validation secrétaire (US17)
-- students.status est un text libre (pas d'enum Postgres) — aucune contrainte à modifier.
COMMENT ON COLUMN students.status IS
  'document_pending | documents_complets | payment_pending | complete | en_attente';
