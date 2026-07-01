-- Table tenants (une ligne par auto-école cliente)
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- ex: "wagner" → wagner.kls3-dev.com
  name text not null,                      -- ex: "Auto-École Wagner"
  logo_url text,
  primary_color text default '#4B7BF5',
  google_drive_folder_id text,             -- dossier Drive racine du client
  created_at timestamptz default now()
);

-- Table formules proposées par tenant
create table formulas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  label text not null,                     -- ex: "Permis B classique"
  created_at timestamptz default now()
);

-- Table collaborateurs (gérant/secrétaire) liés à un tenant
create table tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member',              -- 'owner' | 'member'
  created_at timestamptz default now(),
  unique(tenant_id, user_id)
);

-- Table élèves
create table students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  full_name text not null,
  date_of_birth date,
  formula_id uuid references formulas(id),
  status text default 'document_pending',  -- 'document_pending' | 'payment_pending' | 'complete'
  magic_link_token text unique,
  magic_link_sent_at timestamptz,
  last_activity_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Table pièces justificatives
create table documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  type text not null,                      -- 'cni' | 'photo' | 'asr' | 'rib'
  status text default 'pending',           -- 'pending' | 'uploaded' | 'transferred_to_drive'
  drive_file_id text,                      -- ID du fichier une fois transféré vers le Drive client
  uploaded_at timestamptz
);

-- Table données extraites par OCR (RIB, CNI) en attente de validation humaine
create table ocr_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  extracted_data jsonb not null,           -- { iban, bic, titulaire, ... }
  iban_checksum_valid boolean,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz default now()
);

-- Table relances automatiques
create table reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  sent_at timestamptz default now(),
  reminder_number int default 1
);

-- Row Level Security : activer sur toutes les tables
alter table tenants enable row level security;
alter table formulas enable row level security;
alter table tenant_members enable row level security;
alter table students enable row level security;
alter table documents enable row level security;
alter table ocr_extractions enable row level security;
alter table reminders enable row level security;

-- ============================================================
-- Policies RLS — un collaborateur ne voit que les données de son tenant
-- ============================================================

-- tenants
create policy "Members can view own tenant" on tenants
  for select using (
    id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

-- tenant_members (un membre voit les autres membres de son propre tenant)
create policy "Members can view own tenant members" on tenant_members
  for select using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

-- formulas (tenant_id direct sur la table)
create policy "Members can view own tenant formulas" on formulas
  for select using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

create policy "Members can manage own tenant formulas" on formulas
  for all using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

-- students (tenant_id direct sur la table)
create policy "Members can view own tenant data" on students
  for select using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

create policy "Members can manage own tenant students" on students
  for all using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

-- documents (filtrage par tenant_id via la relation à students)
create policy "Members can view own tenant documents" on documents
  for select using (
    student_id in (
      select id from students where tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can manage own tenant documents" on documents
  for all using (
    student_id in (
      select id from students where tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

-- ocr_extractions (filtrage par tenant_id via documents → students)
create policy "Members can view own tenant ocr extractions" on ocr_extractions
  for select using (
    document_id in (
      select d.id from documents d
      join students s on s.id = d.student_id
      where s.tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can manage own tenant ocr extractions" on ocr_extractions
  for all using (
    document_id in (
      select d.id from documents d
      join students s on s.id = d.student_id
      where s.tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

-- reminders (filtrage par tenant_id via la relation à students)
create policy "Members can view own tenant reminders" on reminders
  for select using (
    student_id in (
      select id from students where tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can manage own tenant reminders" on reminders
  for all using (
    student_id in (
      select id from students where tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Public access — résolution tenant et inscription élève
-- ============================================================

create policy "Public can view tenant branding" on tenants
  for select using (true);

create policy "Public can register student for existing tenant" on students
  for insert with check (
    tenant_id in (select id from tenants)
  );

create policy "Public can view student by magic link token" on students
  for select using (magic_link_token is not null);
