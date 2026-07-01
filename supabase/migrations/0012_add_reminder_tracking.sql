-- US7/US13 : traçabilité relances automatiques

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

UPDATE reminders r
SET tenant_id = s.tenant_id
FROM students s
WHERE r.student_id = s.id
  AND r.tenant_id IS NULL;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS idx_reminders_student_sent_at
  ON reminders(student_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_tenant_sent_at
  ON reminders(tenant_id, sent_at DESC);
