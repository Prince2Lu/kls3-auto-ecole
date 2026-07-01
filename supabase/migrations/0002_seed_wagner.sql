-- Seed : Auto-École Wagner (tenant de démo)
-- Collaborateur test : admin@wagner-demo.kls3.dev / WagnerDemo2026!

-- pgcrypto (extensions schema on Supabase hosted)
create extension if not exists pgcrypto with schema extensions;

-- Tenant Wagner
insert into tenants (id, slug, name, primary_color)
values (
  'a1000000-0000-4000-8000-000000000001',
  'wagner',
  'Auto-École Wagner',
  '#4B7BF5'
)
on conflict (id) do nothing;

-- Formules
insert into formulas (id, tenant_id, label)
values
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Permis B classique'),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Conduite accompagnée'),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Permis A2')
on conflict (id) do nothing;

-- Collaborateur test (auth.users)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  'c1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@wagner-demo.kls3.dev',
  extensions.crypt('WagnerDemo2026!', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Jean Wagner"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  'd1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  '{"sub":"c1000000-0000-4000-8000-000000000001","email":"admin@wagner-demo.kls3.dev"}'::jsonb,
  'email',
  'c1000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

-- Lien collaborateur ↔ tenant
insert into tenant_members (id, tenant_id, user_id, role)
values (
  'e1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'owner'
)
on conflict (tenant_id, user_id) do nothing;

-- Élèves de démo
insert into students (id, tenant_id, full_name, date_of_birth, formula_id, status)
values
  (
    'f1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'Marie Dupont',
    '2004-03-15',
    'b1000000-0000-4000-8000-000000000001',
    'complete'
  ),
  (
    'f1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000001',
    'Lucas Martin',
    '2005-07-22',
    'b1000000-0000-4000-8000-000000000001',
    'document_pending'
  ),
  (
    'f1000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000001',
    'Sophie Bernard',
    '2003-11-08',
    'b1000000-0000-4000-8000-000000000002',
    'payment_pending'
  )
on conflict (id) do nothing;

-- Documents associés
insert into documents (id, student_id, type, status, uploaded_at)
values
  ('01000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'cni', 'transferred_to_drive', now()),
  ('01000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'rib', 'transferred_to_drive', now()),
  ('01000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000002', 'cni', 'pending', null),
  ('01000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000003', 'rib', 'uploaded', now())
on conflict (id) do nothing;

-- Extraction OCR en attente de validation (RIB Sophie Bernard)
insert into ocr_extractions (id, document_id, extracted_data, iban_checksum_valid)
values (
  '01100000-0000-4000-8000-000000000001',
  '01000000-0000-4000-8000-000000000004',
  '{"iban":"FR7630006000011234567890189","bic":"AGRIFRPP","titulaire":"Sophie Bernard"}'::jsonb,
  true
)
on conflict (id) do nothing;
