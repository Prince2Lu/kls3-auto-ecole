-- security_invoker = true exige que l'appelant passe la RLS sur tenants (membres
-- uniquement) → la vue est vide pour anon. security_invoker = false : la vue
-- s'exécute avec les droits du propriétaire, expose uniquement les colonnes
-- branding ; la table tenants reste protégée (anon n'a pas GRANT SELECT dessus).
alter view public_tenant_branding set (security_invoker = false);

revoke all on tenants from anon;
