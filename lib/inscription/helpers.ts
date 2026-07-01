export function buildDossierUrl(tenantSlug: string, token: string) {
  const encodedToken = encodeURIComponent(token);

  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3000";
    return `http://${tenantSlug}.localhost:${port}/dossier?token=${encodedToken}`;
  }

  const domain = process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "kls3-dev.com";
  return `https://${tenantSlug}.${domain}/dossier?token=${encodedToken}`;
}

export async function resolveFormulaLabel(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  formulaId: string,
  tenantId: string
) {
  const { data } = await supabase
    .from("formulas")
    .select("label")
    .eq("id", formulaId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data?.label ?? "Non précisée";
}

export { resolveTenantBySlug } from "@/lib/tenant/resolve";
