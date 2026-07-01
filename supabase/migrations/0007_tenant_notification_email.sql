alter table tenants add column notification_email text;

alter table students add column email text;

-- Lecture publique des formules (inscription sans session)
create policy "Public can view formulas for inscription" on formulas
  for select using (true);

-- Mise à jour des paramètres tenant par les membres
create policy "Members can update own tenant settings" on tenants
  for update using (id in (select get_my_tenant_ids()))
  with check (id in (select get_my_tenant_ids()));

-- Email de notification : lecture server-side sans exposer toute la table tenants
create or replace function get_tenant_notification_email(p_tenant_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select notification_email from tenants where id = p_tenant_id
$$;

grant execute on function get_tenant_notification_email(uuid) to anon, authenticated;
