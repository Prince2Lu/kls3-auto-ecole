import { createClient } from "@/lib/supabase/server";
import type { Tenant, TenantBranding } from "@/lib/types/domain";

export async function resolveTenantBySlug(
  slug: string
): Promise<TenantBranding | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_tenant_branding")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data || !data.id || !data.slug || !data.name) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    logo_url: data.logo_url,
    primary_color: data.primary_color,
  };
}

export async function resolveTenantById(id: string): Promise<Tenant | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
