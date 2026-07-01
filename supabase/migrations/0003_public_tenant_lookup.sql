-- Vue publique : branding tenant uniquement (pas de google_drive_folder_id, etc.)
create view public_tenant_branding as
select id, slug, name, logo_url, primary_color
from tenants;

alter view public_tenant_branding set (security_invoker = true);

grant select on public_tenant_branding to anon, authenticated;

-- Retire l'accès public direct à la table tenants (expose toutes les colonnes)
drop policy if exists "Public can view tenant branding" on tenants;
