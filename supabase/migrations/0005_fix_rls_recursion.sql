-- Fonction security definer : contourne la RLS pour lister les tenant_id
-- du membre courant, sans déclencher de récursion sur tenant_members.
create or replace function get_my_tenant_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from tenant_members where user_id = auth.uid()
$$;

grant execute on function get_my_tenant_ids() to authenticated;

-- Réécriture de toutes les policies qui dépendaient du pattern récursif

-- tenant_members
drop policy if exists "Members can view own tenant members" on tenant_members;
create policy "Members can view own tenant members" on tenant_members
  for select using (
    tenant_id in (select get_my_tenant_ids())
  );

-- tenants
drop policy if exists "Members can view own tenant" on tenants;
create policy "Members can view own tenant" on tenants
  for select using (
    id in (select get_my_tenant_ids())
  );

-- formulas
drop policy if exists "Members can view own tenant formulas" on formulas;
create policy "Members can view own tenant formulas" on formulas
  for select using (
    tenant_id in (select get_my_tenant_ids())
  );

drop policy if exists "Members can manage own tenant formulas" on formulas;
create policy "Members can manage own tenant formulas" on formulas
  for all using (
    tenant_id in (select get_my_tenant_ids())
  );

-- students
drop policy if exists "Members can view own tenant data" on students;
create policy "Members can view own tenant data" on students
  for select using (
    tenant_id in (select get_my_tenant_ids())
  );

drop policy if exists "Members can manage own tenant students" on students;
create policy "Members can manage own tenant students" on students
  for all using (
    tenant_id in (select get_my_tenant_ids())
  );

-- documents (filtrage via students)
drop policy if exists "Members can view own tenant documents" on documents;
create policy "Members can view own tenant documents" on documents
  for select using (
    student_id in (
      select id from students where tenant_id in (select get_my_tenant_ids())
    )
  );

drop policy if exists "Members can manage own tenant documents" on documents;
create policy "Members can manage own tenant documents" on documents
  for all using (
    student_id in (
      select id from students where tenant_id in (select get_my_tenant_ids())
    )
  );

-- ocr_extractions (filtrage via documents → students)
drop policy if exists "Members can view own tenant ocr extractions" on ocr_extractions;
create policy "Members can view own tenant ocr extractions" on ocr_extractions
  for select using (
    document_id in (
      select d.id from documents d
      join students s on s.id = d.student_id
      where s.tenant_id in (select get_my_tenant_ids())
    )
  );

drop policy if exists "Members can manage own tenant ocr extractions" on ocr_extractions;
create policy "Members can manage own tenant ocr extractions" on ocr_extractions
  for all using (
    document_id in (
      select d.id from documents d
      join students s on s.id = d.student_id
      where s.tenant_id in (select get_my_tenant_ids())
    )
  );

-- reminders (filtrage via students)
drop policy if exists "Members can view own tenant reminders" on reminders;
create policy "Members can view own tenant reminders" on reminders
  for select using (
    student_id in (
      select id from students where tenant_id in (select get_my_tenant_ids())
    )
  );

drop policy if exists "Members can manage own tenant reminders" on reminders;
create policy "Members can manage own tenant reminders" on reminders
  for all using (
    student_id in (
      select id from students where tenant_id in (select get_my_tenant_ids())
    )
  );
